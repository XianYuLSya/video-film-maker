"""配乐：读 film.json 里的编排，铺满全片或按段换曲，说话时自动压低。

输出 vo/music_<键>.wav（48k 立体声，曲子本身归一到 level 响度，之后由 mix.py 再整体平衡）。

两种写法（都在 film.json 的 music 里）：
1. 最简：只写 "default": "cat" —— 整首铺满全片，首尾淡入淡出。
2. 分段："segments": [{"from": "ch:cold", "track": "cat", "bar": 16, "sync": "c3.title",
                      "to": "ch:real", "loop": [16, 40]}, ...]
   from / to 写 "ch:章节"、"line:句子"、"sting:片头"、"bubble:气泡"、"sec:12.5" 或直接写秒数；
   bar 是从第几小节开始放；sync 写 "句子.标记"，让那个标记正好落在 bar 小节上；
   loop 是 [起小节, 止小节]，到止小节就跳回起小节继续放。
   segments 也可以写成 {"zh": [...], "short": [...]}，两版各用各的编排。

找不到章节/句子/标记时，报清楚是第几段、缺什么、现有的是什么，不再 KeyError。
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np

from vo import common as K

_LOADED = {}


# ───────── 配置 ─────────
def _music_cfg(cfg: dict, key: str) -> dict:
    """取这一版的配乐配置：segments 可以整片共用一份数组，也可以写成 {"zh": [...], "short": [...]}。"""
    mus = dict(cfg['music'])
    seg = mus.get('segments')
    if isinstance(seg, dict):
        own = seg.get(key)
        if own is None:
            K.die(f'film.json 的 music.segments 里没有 {key} 这一版',
                  'segments 既可以写成一个数组（两版共用），也可以写成 {"zh": [...], "short": [...]}。')
        mus['segments'] = own
    dflt = mus.get('default')
    if isinstance(dflt, dict):
        if key not in dflt:
            K.die(f'film.json 的 music.default 里没有 {key} 这一版')
        mus['default'] = dflt[key]
    return mus


# ───────── 参数解析 ─────────
def _resolve(tm: dict, ref, what: str) -> float:
    """把 "ch:cold" / "line:c3" / "sting:intro" / "bubble:q1" / "sec:12.5" / 12.5 解成秒数。"""
    items = tm.get('items', [])
    chapters = {c['id']: c for c in tm.get('chapters', [])}
    if isinstance(ref, (int, float)):
        return float(ref)
    if not isinstance(ref, str):
        K.die(f'配乐{what}写成了 {ref!r}，看不懂', '写 "ch:章节id"、"line:句子id"、"sec:秒数" 或直接写秒数。')
    kind, _, name = ref.partition(':')
    if not name:
        kind, name = 'sec', ref
    if kind == 'ch':
        if name not in chapters:
            K.die(f'配乐{what}写的是章节「{name}」，但稿子里没有这一章',
                  f'现有章节：{"、".join(chapters) or "（没有，先跑 voice）"}')
        return float(chapters[name]['start'])
    if kind in ('line', 'bubble', 'sting'):
        hit = [x for x in items if x.get('kind') == kind and x.get('id') == name]
        if not hit:
            names = [f'{x["id"]}({x["kind"]})' for x in items]
            label = {'line': '句子', 'bubble': '气泡', 'sting': '片头片尾'}[kind]
            K.die(f'配乐{what}写的是{label}「{name}」，但时间表里没有它',
                  f'现有：{"、".join(names[:12])}{" …" if len(names) > 12 else ""}')
        return float(hit[0]['start'])
    if kind == 'sec':
        try:
            return float(name)
        except ValueError:
            K.die(f'配乐{what}写的是「{ref}」，不是秒数也不是认识的引用')
    if kind == 'beat':
        # 按拍排时间的片子：beat:64 = 拍子网格的第 64 拍（网格来自 film.json 的 music.grid，voice 时写进时间表）
        grid = tm.get('grid')
        if not grid:
            K.die(f'配乐{what}写的是「{ref}」，但时间表里没有拍子网格',
                  '在 film.json 的 music 里写 "grid": {"track": "曲名"}，再跑一次 .\\film.cmd voice。')
        try:
            return float(grid['origin']) + float(name) * float(grid['beat'])
        except ValueError:
            K.die(f'配乐{what}写的是「{ref}」，beat: 后面要跟拍号（数字）')
    K.die(f'配乐{what}的前缀「{kind}」不认识', '只有 ch: / line: / bubble: / sting: / sec: / beat: 六种。')


def _cue_time(tm: dict, ref, what: str) -> float:
    """把 "c3.title" 这种「句子.标记」解成该标记的秒数。"""
    if not isinstance(ref, str) or '.' not in ref:
        K.die(f'配乐{what}的 sync 要写成「句子id.标记名」，现在是 {ref!r}')
    sid, _, cue = ref.partition('.')
    hit = next((x for x in tm.get('items', []) if x.get('kind') == 'line' and x.get('id') == sid), None)
    if hit is None:
        K.die(f'配乐{what}的 sync 指向句子「{sid}」，但时间表里没有这一句',
              '现有句子：' + '、'.join(x['id'] for x in tm.get('items', []) if x.get('kind') == 'line'))
    if cue not in (hit.get('cues') or {}):
        K.die(f'配乐{what}的 sync 要找句子「{sid}」里的标记「{cue}」，但这一句没有这个标记',
              f'这一句的标记：{"、".join(hit.get("cues") or {}) or "（没有）"}')
    return float(hit['cues'][cue])


def _track(cfg: dict, name: str):
    """曲目键 → (文件路径, 一拍秒数 或 None, 第一拍秒数)。没测过拍子的返回 None。"""
    return K.track_info(cfg, name)


def _sections(mus: dict, tm: dict) -> list[dict]:
    total = float(tm['total'])
    segs = [s for s in (mus.get('segments') or []) if s]
    if not segs:
        if not mus.get('default'):
            K.die('film.json 的 music 里既没有 segments 也没有 default，不知道该放哪首')
        return [{'from': 0.0, 'to': total, 'track': mus['default'], 'bar': 0, 'sync': None, 'loop': None}]
    out = []
    for i, s in enumerate(segs):
        if 'track' not in s:
            K.die(f'配乐第 {i + 1} 段没写 track（放哪首曲子）')
        t0 = _resolve(tm, s.get('from', 'sec:0'), f'第 {i + 1} 段的起点')
        t1 = _resolve(tm, s['to'], f'配乐第 {i + 1} 段的终点') if s.get('to') else None
        if t1 is None:
            nxt = segs[i + 1] if i + 1 < len(segs) else None
            t1 = _resolve(tm, nxt.get('from', 'sec:0'), f'第 {i + 2} 段的起点') if nxt else total
        if t1 <= t0:
            K.die(f'配乐第 {i + 1} 段的结束时间（{t1:.2f}s）不比开始（{t0:.2f}s）晚',
                  '检查这一段和下一段的 from 有没有写反。')
        out.append({'from': t0, 'to': t1, 'track': s['track'], 'bar': int(s.get('bar') or 0),
                    'sync': s.get('sync'), 'loop': s.get('loop')})
    return out


# ───────── 音频工具 ─────────
def _load(file) -> np.ndarray:
    if file in _LOADED:
        return _LOADED[file]
    r = K.run([K.which('ffmpeg'), '-v', 'error', '-i', str(file), '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-'],
              quiet=True)
    x = np.frombuffer(r.stdout, np.float32).reshape(-1, 2).astype(np.float64)
    _LOADED[file] = x
    return x


def _lufs(x: np.ndarray) -> float:
    # 音频必须从 stdin 喂进去（只写 -i - 不给数据，ffmpeg 立刻读到 EOF，量出来当静音处理）
    r = K.run_stdin([K.which('ffmpeg'), '-v', 'info', '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-i', '-',
                     '-af', 'ebur128', '-f', 'null', '-'], x.astype(np.float32).tobytes(), quiet=True)
    text = r.out
    tail = text[text.rfind('Integrated loudness'):] if 'Integrated loudness' in text else text
    m = re.search(r'I:\s*(-?\d+(?:\.\d+)?)\s*LUFS', tail)
    if not m:
        K.die('量不出曲子响度（ffmpeg ebur128 没给结果）', f'ffmpeg 输出：{K.tail(text, 5)}')
    return float(m.group(1))


class _Track:
    """一首曲子：音频、一小节多少秒、第一拍在哪。没测过拍子的 beat 是 None。"""

    def __init__(self, path, beat, phase, level):
        self.x = _load(path)
        self.beat = beat
        self.phase = phase
        self.bar = (beat * 4) if beat else None
        g = 10 ** ((level - _lufs(self.x)) / 20)
        self.x = self.x * g

    def bar_t(self, bar: float) -> float:
        return self.phase + bar * self.bar

    def total_bars(self) -> int:
        return max(1, int((len(self.x) / K.SR - self.phase) / self.bar))


def _play(tr: _Track, bar0: float, loop, dur: float) -> np.ndarray:
    """从第 bar0 小节放 dur 秒；到 loop[1] 小节跳回 loop[0]，接缝交叉淡化 40ms。"""
    out = np.zeros((int(dur * K.SR) + 1, 2))
    pos = 0
    xf = int(0.04 * K.SR)
    if tr.bar is None:
        # 没测过拍长：整首从头放，放完再从头，不做小节对齐
        while pos < len(out):
            piece = tr.x.copy()
            take = min(len(piece), len(out) - pos)
            if take <= 0:
                break
            piece = piece[:take]
            if pos > 0 and take > 2 * xf:
                piece[:xf] *= np.linspace(0, 1, xf)[:, None] ** 0.5
                out[pos - xf:pos] *= np.linspace(1, 0, xf)[:, None] ** 0.5
                pos -= xf
            out[pos:pos + len(piece)] += piece
            pos += len(piece)
        return out[: int(dur * K.SR)]
    a_bar, b_bar = (loop if loop else (0, tr.total_bars()))
    cur = tr.bar_t(bar0)
    while pos < len(out):
        stop = tr.bar_t(b_bar)
        if cur >= stop - 0.01:
            cur = tr.bar_t(a_bar)
            continue
        a, z = int(cur * K.SR), int(stop * K.SR)
        if a < 0:  # bar0 太靠前（sync 要求正好落在某个标记上时会出现），头部补静音
            piece = tr.x[0:min(z + xf, len(tr.x))].copy()
            pad = np.zeros((-a, 2))
            piece = np.vstack([pad, piece])[-(len(piece) + len(pad)):]
            a = 0
        else:
            piece = tr.x[a:min(z + xf, len(tr.x))].copy()
        take = min(len(piece), len(out) - pos)
        piece = piece[:take]
        if pos > 0 and take > 2 * xf:
            piece[:xf] *= np.linspace(0, 1, xf)[:, None] ** 0.5
            out[pos - xf:pos] *= np.linspace(1, 0, xf)[:, None] ** 0.5
            pos -= xf
        out[pos:pos + len(piece)] += piece
        pos += len(piece)
        cur = stop
    return out[: int(dur * K.SR)]


def _duck(mus: dict, tm: dict, n: int) -> np.ndarray:
    """压低包络：说话压得最多，气泡轻一点，片头片尾让开；openUp 里列的段落放开。"""
    duck = mus.get('duck') or {}
    speak = float(duck.get('speak', -15.0))
    gap = float(duck.get('gap', -8.0))
    bub = float(duck.get('bubble', -6.0))
    stg = float(duck.get('sting', -12.0))
    open_lv = float(duck.get('open', -3.0))
    hop = 0.01
    nf = int(float(tm['total']) / hop) + 2
    tt = np.arange(nf) * hop
    target = np.full(nf, gap)
    for x in tm.get('items', []):
        kind = x.get('kind')
        if kind == 'line':
            a, b, lv = float(x['start']) - 0.12, float(x['end']) + 0.25, speak
        elif kind == 'bubble':
            a, b, lv = float(x['start']), float(x['end']), bub
        elif kind == 'sting':
            a, b, lv = float(x['start']), float(x['end']), stg
        else:
            continue
        target[(tt >= a) & (tt < b)] = lv
    # 放开：film.json 里列出的引用（"bubble:q2"、"sting:credits"、"line:c3"）用 open 电平
    for ref in mus.get('openUp') or []:
        kind, _, name = str(ref).partition(':')
        hit = [x for x in tm.get('items', []) if x.get('kind') == kind and x.get('id') == name]
        if not hit:
            K.warn(f'music.openUp 里的「{ref}」在时间表里找不到，忽略')
            continue
        for x in hit:
            m = (tt >= float(x['start']) - 0.1) & (tt < float(x['end']) + 0.1)
            target[m] = np.maximum(target[m], open_lv)
    g = np.empty(nf)
    g[0] = target[0]
    for i in range(1, nf):
        tau = 0.12 if target[i] < g[i - 1] else 0.5
        g[i] = g[i - 1] + (target[i] - g[i - 1]) * (1 - np.exp(-hop / tau))
    return g


def run(cfg: dict, key: str) -> dict:
    key = K.check_key(key, cfg)
    tm = K.load_timing(key)
    mus = _music_cfg(cfg, key)
    level = float(mus.get('level', -16.0))
    secs = _sections(mus, tm)
    total = float(tm['total'])
    n = int((total + 0.5) * K.SR)
    music = np.zeros((n, 2))
    cache = {}
    for i, s in enumerate(secs):
        name = s['track']
        if name not in cache:
            path, beat, phase = _track(cfg, name)
            cache[name] = _Track(path, beat, phase, level)
        tr = cache[name]
        bar0 = float(s['bar'])
        if tr.bar is None:
            if s['bar'] or s['sync']:
                K.warn(f'配乐第 {i + 1} 段用的「{name}」没测过拍长，忽略小节对齐（整首从头放）')
        else:
            if s['sync']:
                tc = _cue_time(tm, s['sync'], f'第 {i + 1} 段的 sync')
                bar0 = bar0 - (tc - s['from']) / tr.bar
            if s['loop']:
                if len(s['loop']) != 2:
                    K.die(f'配乐第 {i + 1} 段的 loop 要写成 [起小节, 止小节]')
                if float(s['loop'][1]) <= float(s['loop'][0]):
                    K.die(f'配乐第 {i + 1} 段的 loop 止小节（{s["loop"][1]}）不比起小节（{s["loop"][0]}）大')
        dur = s['to'] - s['from']
        seg = _play(tr, bar0, s['loop'], dur)
        a = int(s['from'] * K.SR)
        fi = int((mus.get('fadeIn', 0.4) if i == 0 else 0.2) * K.SR)
        fo = int((mus.get('fadeOut', 1.6) if i == len(secs) - 1 else 0.5) * K.SR)
        if fi and len(seg) > fi:
            seg[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi))[:, None]
        if fo and len(seg) > fo:
            seg[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))[:, None]
        m = min(len(seg), n - a)
        if m > 0:
            music[a:a + m] += seg[:m]

    g = _duck(mus, tm, n)
    gain = 10 ** (np.interp(np.arange(n) / K.SR, np.arange(len(g)) * 0.01, g) / 20)
    music *= gain[:, None]

    out = K.music_wav(cfg, key)
    out.parent.mkdir(parents=True, exist_ok=True)
    K.run_stdin([K.which('ffmpeg'), '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-i', '-',
                 '-c:a', 'pcm_f32le', str(out)], music.astype(np.float32).tobytes())
    peak = 20 * np.log10(np.abs(music).max() + 1e-12)
    K.log(f'配乐 {key}：{n / K.SR:.2f}s，{len(secs)} 段，峰值 {peak:.2f} dBFS')
    for i, s in enumerate(secs):
        extra = ''
        if s['bar']:
            extra += f'，第 {s["bar"]} 小节起'
        if s['sync']:
            extra += f'，{s["sync"]} 落在这一小节'
        K.log(f'  第 {i + 1} 段 {K.fmt_sec(s["from"])} → {K.fmt_sec(s["to"])}  {s["track"]}{extra}')
    return {'peak': peak, 'total': total, 'sections': secs, 'out': str(out)}


if __name__ == '__main__':
    import sys
    K.setup_stdout()
    cfg = K.load()
    run(cfg, sys.argv[1] if len(sys.argv) > 1 else 'zh')
