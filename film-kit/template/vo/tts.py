"""配音 + 全片时间表（把口播稿变成 voice_<键>.wav 和 timing_<键>.json）。

单独跑：.\\film.cmd voice zh      （等价 film-kit\\.venv\\Scripts\\python.exe vo\\tts.py zh）
读：film/src/script.json（zh）或 film/src/script_short.json（short）
出：film/public/vo/voice_<键>.wav      整条人声，48k 单声道
    film/src/timing_<键>.json          每句起止、每个 {标记} 的时刻、字幕条、章节边界

念法、语速、句间留白、字幕宽度上限、要不要通用片头片尾，全部来自 film.json；
这里不写死任何作品名、路径或念法表。

按「念出来的文本」哈希缓存（build/tts_cache/），改稿只重合成变了的句子；
同一句只加 {标记} 不会重新合成，时间也不会变。
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import sys

import numpy as np

import edge_tts

from vo import common as K


def _chunks(text: str, lim: float, seps: str) -> list[tuple[int, int]]:
    """字幕切条：先按标点切，再把短的合起来；单条太长再在中间附近拆。返回字符区间。"""
    pieces, a = [], 0
    for i, c in enumerate(text):
        if c in seps:
            pieces.append((a, i + 1))
            a = i + 1
    if a < len(text):
        pieces.append((a, len(text)))

    def vis(a: int, b: int) -> float:
        s = text[a:b].strip()
        return sum(0.55 if ord(ch) < 128 else 1 for ch in s)

    merged = []
    for p in pieces:
        if merged and vis(merged[-1][0], p[1]) <= lim and text[merged[-1][1] - 1] not in '。！？':
            merged[-1] = (merged[-1][0], p[1])
        else:
            merged.append(p)
    out = []
    for a, b in merged:
        while vis(a, b) > lim * 1.2:
            mid = a + (b - a) // 2
            # 不要在英文单词中间断：候选位置两侧不能同时是 ASCII（空格除外）
            cands = [k for k in range(a + 3, b - 3) if not (text[k - 1].isascii() and text[k].isascii() and text[k - 1] != ' ')]
            cut = min(cands, key=lambda k: abs(k - mid)) if cands else mid
            if cut <= a:
                cut = a + int(lim)
            out.append((a, cut))
            a = cut
        out.append((a, b))
    return out


def _sub_text(s: str) -> str:
    """字幕上不显示句末标点，逗号顿号换成空格（念的口播稿有、字幕不要挤）。"""
    s = s.strip().rstrip('，。：；、,;:')
    return s.replace('，', ' ').replace('：', ' ').replace('；', ' ').replace('、', ' ')


async def _speak(text, voice, rate, mp3, meta):
    """一句一段调 edge-tts；网络抖动重试 5 次，仍失败就把原因抛上去。"""
    for attempt in range(5):
        try:
            words, data = [], bytearray()
            com = edge_tts.Communicate(text, voice, rate=rate, boundary='WordBoundary',
                                       connect_timeout=15, receive_timeout=60)
            async for ch in com.stream():
                if ch['type'] == 'audio':
                    data += ch['data']
                elif ch['type'] == 'WordBoundary':
                    words.append({'w': ch['text'], 's': ch['offset'] / 1e7, 'e': (ch['offset'] + ch['duration']) / 1e7})
            if not data:
                raise RuntimeError('没有拿到音频')
            mp3.parent.mkdir(parents=True, exist_ok=True)
            mp3.write_bytes(bytes(data))
            meta.write_text(json.dumps({'text': text, 'voice': voice, 'rate': rate, 'words': words},
                                       ensure_ascii=False), encoding='utf-8')
            return
        except Exception as ex:
            if attempt == 4:
                raise K.KitError(f'配音失败（已重试 5 次）：{mp3.name} —— {ex}',
                                 'edge-tts 要联网；检查网络/代理后重跑 .\\film.cmd voice，已合成的句子会走缓存。')
            K.log(f'第 {attempt + 1} 次失败，2 秒后重试：{mp3.name}（{ex}）')
            await asyncio.sleep(2 + attempt * 3)


def _decode(path) -> np.ndarray:
    r = K.run([K.which('ffmpeg'), '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(K.SR), '-'],
              quiet=True)
    return np.frombuffer(r.stdout, np.float32)


def _voiced(x: np.ndarray) -> tuple[int, int]:
    """去掉首尾静音：返回（起点样本, 终点样本）。"""
    h = K.SR // 200
    n = len(x) // h
    if not n:
        return 0, len(x)
    env = 20 * np.log10(np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
    on = np.where(env > -48)[0]
    if not len(on):
        return 0, len(x)
    a = max(0, on[0] * h - int(0.02 * K.SR))
    b = min(len(x), (on[-1] + 1) * h + int(0.06 * K.SR))
    return a, b


def _locate(text: str, words) -> list[int]:
    """每个词在正文里的字符位置（按顺序找，找不到就跟着上一个）。"""
    pos, out = 0, []
    low = text.lower()
    for w in words:
        k = low.find(w['w'].lower(), pos)
        if k < 0:  # 念法换过的词，正文里找不到，位置不往前推
            out.append(pos)
            continue
        out.append(k)
        pos = k + len(w['w'])
    return out


# 通用片头片尾的两个固定 id（public/intro.mp4、outro.mp4 在稿子里就是这两条 sting）。
# film.json 的 stings: false 只关这两个；片子自己起名的垫片（{"sting": "open", "dur": 12}）
# 是画面的一部分，照常进时间表。
GENERIC_STINGS = ('intro', 'outro')


def _plan(cfg: dict, key: str, script: dict) -> list[dict]:
    """把稿子展开成拍摄清单：kind 为 line / bubble / sting。

    stings 为 false 时只剔掉通用片头片尾（id 是 intro / outro 的垫片）；其余垫片照常排，
    因为它们是无口播段落的占位，剔掉整条片子就短了。"""
    items, dropped = [], []
    for it in script.get('items', []):
        if 'sting' in it and not cfg.get('stings', True) and it.get('sting') in GENERIC_STINGS:
            dropped.append(str(it['sting']))
            continue
        if 'sting' in it and 'beats' in it:
            # 按拍排时间的片子：垫片写「占几拍」，秒数由 film.json 的 music.grid 那首曲子的拍长算
            grid = K.beat_grid(cfg)
            if not grid:
                K.die(f'垫片「{it["sting"]}」写了 beats（占几拍），但 film.json 没写 music.grid（用哪首曲子的拍子）',
                      '在 film.json 的 music 里加 "grid": {"track": "曲名", "from": "sec:0"}，曲名要在 music.tracks 里有 beat。')
            it = dict(it)
            it['dur'] = float(it['beats']) * grid[1]
        if 'sting' in it or 'bubble' in it:
            if 'dur' not in it:
                K.die(f'稿子里「{it.get("sting") or it.get("bubble")}」这一项没写 dur（占多少秒）'
                      + ('或 beats（占几拍）' if 'sting' in it else ''))
        if 'id' not in it and 'sting' not in it and 'bubble' not in it:
            K.die(f'稿子里有一项既没有 id 也不是气泡/片头：{it}')
        items.append(it)
    missing = K.sting_files_missing(items)
    if missing:
        K.die(f'稿子里有通用片头/片尾，但 film\\public 里没有 {"、".join(missing)}', K.sting_hint())
    if dropped:
        others = [str(it['sting']) for it in items if 'sting' in it]
        K.log(f'stings: false —— 去掉通用片头片尾：{"、".join(dropped)}'
              + (f'；自己起名的垫片照常排：{"、".join(others)}' if others else ''))
    return items


def run(cfg: dict, key: str) -> dict:
    key = K.check_key(key, cfg)
    script = K.load_script(key)
    pace = K.profile(cfg, key, 'pacing')
    voice_cfg = K.profile(cfg, key, 'voice')
    voice = voice_cfg.get('voice') or 'zh-CN-XiaoyiNeural'
    rate = voice_cfg.get('rate') or '+0%'
    sub_lim = float(K.scalar_for(cfg, key, 'submax') or 17)
    chapters = {c['id']: c for c in script.get('chapters', [])}
    if not chapters:
        K.die(f'{K.script_path(key)} 里没有 chapters（章节表）')
    cache = K.tts_cache(cfg)
    cache.mkdir(parents=True, exist_ok=True)

    jobs, resynth, cached = [], [], 0
    plan = _plan(cfg, key, script)
    for it in plan:
        if 'id' not in it or 'zh' not in it:
            continue
        text, marks = K.strip_marks(it['zh'])
        said = K.say_text(cfg, text)
        h = hashlib.sha1(f'{voice}|{rate}|{said}'.encode('utf-8')).hexdigest()[:12]
        it['_text'], it['_said'], it['_marks'] = text, said, marks
        it['_mp3'] = cache / f'{key}_{it["id"]}_{h}.mp3'
        it['_meta'] = cache / f'{key}_{it["id"]}_{h}.json'
        if it['_mp3'].exists() and it['_meta'].exists():
            cached += 1
        else:
            jobs.append(it)
    K.log(f'{len(plan)} 项，缓存命中 {cached}，要新合成 {len(jobs)}')

    sem = asyncio.Semaphore(4)

    async def one(it):
        async with sem:
            await _speak(it['_said'], voice, rate, it['_mp3'], it['_meta'])
            resynth.append(it['id'])

    if jobs:
        asyncio.run(_gather(one, jobs))

    # ───── 排时间线 ─────
    t = 0.0
    prev_ch = None
    timeline, pieces, bounds = [], [], {}
    for it in plan:
        ch = it.get('ch')
        if ch not in chapters:
            K.die(f'句子「{it.get("id") or it.get("bubble") or it.get("sting")}」的章节是「{ch}」，'
                  f'但稿子的 chapters 里没有它（现有：{"、".join(chapters)}）')
        if ch != prev_ch:
            if prev_ch is not None:
                t += float(pace.get('chapterGap', 0.75))
            bounds[ch] = t
            if prev_ch is not None and ch != 'end':
                t += float(pace.get('leadBubble', 1.0)) if 'bubble' in it else float(pace.get('leadLine', 0.55))
        prev_ch = ch
        t += float(it.get('padBefore', 0))

        if 'sting' in it:
            timeline.append({'kind': 'sting', 'id': it['sting'], 'ch': ch,
                             'start': round(t, 3), 'end': round(t + it['dur'], 3)})
            t += float(it['dur'])
            continue
        if 'bubble' in it:
            timeline.append({'kind': 'bubble', 'id': it['bubble'], 'ch': ch, 'pose': it.get('pose', 'think'),
                             'text': it['zh'], 'start': round(t, 3), 'end': round(t + it['dur'], 3)})
            t += float(it['dur']) + float(pace.get('bubbleGap', 0.15))
            continue

        x = _decode(it['_mp3'])
        meta = K.read_json(it['_meta'], '配音元数据')
        a, b = _voiced(x)
        seg = x[a:b]
        off = a / K.SR
        start = t
        words = [{'w': w['w'], 's': round(start + w['s'] - off, 3), 'e': round(start + w['e'] - off, 3)}
                 for w in meta.get('words', [])]
        text = it['_text']
        wpos = _locate(text, meta.get('words', []))
        cues = {}
        for name, cp in it['_marks'].items():
            k = next((i for i, p in enumerate(wpos) if p + len(meta['words'][i]['w']) > cp), len(words) - 1)
            cues[name] = words[k]['s'] if words else start
        subs = []
        for ca, cb in _chunks(text, sub_lim, '，。：；！？、'):
            idx = [i for i, p in enumerate(wpos) if ca <= p < cb]
            if not idx:
                continue
            subs.append({'s': words[idx[0]]['s'], 'e': words[idx[-1]]['e'], 't': _sub_text(text[ca:cb])})
        for k in range(len(subs) - 1):  # 字幕首尾相接，不闪
            if subs[k + 1]['s'] - subs[k]['e'] < 0.5:
                subs[k]['e'] = subs[k + 1]['s']
        end = start + len(seg) / K.SR
        timeline.append({'kind': 'line', 'id': it['id'], 'ch': ch, 'start': round(start, 3), 'end': round(end, 3),
                         'text': text, 'cues': {k2: round(v, 3) for k2, v in cues.items()}, 'subs': subs,
                         'words': words})
        pieces.append((start, seg))
        t = end + float(pace.get('gap', 0.34)) + float(it.get('padAfter', 0))
    total = t + float(pace.get('tail', 0.5))

    y = np.zeros(int(total * K.SR) + 1, np.float32)
    for s, seg in pieces:
        i = int(round(s * K.SR))
        y[i:i + len(seg)] += seg[: len(y) - i]
    wav = K.voice_wav(cfg, key)
    wav.parent.mkdir(parents=True, exist_ok=True)
    K.run_stdin([K.which('ffmpeg'), '-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', str(K.SR), '-i', '-',
                 '-c:a', 'pcm_s16le', str(wav)], y.tobytes())

    out_chapters = []
    for c in script['chapters']:
        its = [x for x in timeline if x['ch'] == c['id']]
        if its:
            out_chapters.append({'id': c['id'], 'title': c.get('zh', ''), 'start': round(bounds[c['id']], 3),
                                 'first': its[0]['start'], 'end': its[-1]['end']})
    timing = {'key': key, 'lang': 'zh', 'voice': voice, 'rate': rate, 'total': round(total, 3),
              'chapters': out_chapters, 'items': timeline}
    grid = K.beat_grid(cfg)
    if grid:
        # 拍子网格写进时间表：画面（cine/beat.ts）和配乐（vo/music.py）从这里取同一份
        timing['grid'] = {'track': grid[0], 'beat': grid[1], 'origin': round(_grid_origin(timing, grid[2]), 6)}
    K.write_json(K.timing_path(key), timing)

    lines = [x for x in timeline if x['kind'] == 'line']
    speech = sum(x['end'] - x['start'] for x in lines)
    stats = {'key': key, 'lines': len(lines), 'speech': speech, 'total': total,
             'chapters': out_chapters, 'resynth': sorted(resynth, key=_sortkey), 'cached': cached}
    return stats


def _grid_origin(timing: dict, ref) -> float:
    """拍子网格的第 0 拍在成片第几秒：sec:秒数 / sting:垫片名 / line:句子 / ch:章节。"""
    if isinstance(ref, (int, float)):
        return float(ref)
    kind, _, name = str(ref).partition(':')
    if not name:
        kind, name = 'sec', kind
    if kind == 'sec':
        try:
            return float(name)
        except ValueError:
            K.die(f'music.grid 的 from 写的是「{ref}」，不是秒数')
    if kind == 'ch':
        hit = [c for c in timing['chapters'] if c['id'] == name]
    else:
        hit = [x for x in timing['items'] if x['kind'] == kind and x['id'] == name]
    if not hit:
        K.die(f'music.grid 的 from 写的是「{ref}」，但时间表里没有它', '写 sec:秒数、sting:垫片名、line:句子id 或 ch:章节id。')
    return float(hit[0]['start'])


def _sortkey(x):
    return x


async def _gather(fn, items):
    return await asyncio.gather(*(fn(it) for it in items))


def report(stats: dict):
    K.log(f'{stats["key"]}：{stats["lines"]} 句，说话 {stats["speech"]:.1f}s，'
          f'全片 {stats["total"]:.1f}s（{K.fmt_sec(stats["total"])}，{stats["total"] / 60:.2f} 分）')
    for c in stats['chapters']:
        K.log(f'  {c["id"]:<10} {K.fmt_sec(c["start"])} → {K.fmt_sec(c["end"])}'
              f'{"  " + c["title"] if c.get("title") else ""}')
    if stats['resynth']:
        K.log(f'重新合成了 {len(stats["resynth"])} 句：{"、".join(stats["resynth"])}')
    else:
        K.log('配音全部命中缓存，时间没变')


if __name__ == '__main__':
    K.setup_stdout()
    cfg = K.load()
    report(run(cfg, sys.argv[1] if len(sys.argv) > 1 else 'zh'))
