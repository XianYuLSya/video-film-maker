"""片场驱动：一条命令开新片，几条固定命令跑完全程。

    .\\film.cmd all zh        配音 → 体检稿子 → 渲染 → 混音 → 合成 → 成片体检
    .\\film.cmd status        看现在做到哪了、下一步该跑什么

子命令一览（都有中文说明，.\\film.cmd <子命令> --help 也能看）：
    lint    体检稿子（不渲染）
    voice   配音 + 时间表
    stills  抽指定秒数的静帧
    review  按稿子自动选时间点抽帧 + 写 index.md（审片用）
    probe   自动排版体检（量版面，不出图）
    render  分段渲染无声画面（断了能续跑）
    audio   配乐 → 音效清单 → 音效轨 → 混音
    mux     合成到成品目录（顺带写 SRT）
    check   成片体检
    art     把 art\\raw 里的原图处理成片中素材
    clip    切一段审看片段（画面或纯音频）
    status  各步产物状态
    all     voice → lint → render → audio → mux → check

所有路径都从本文件所在目录（作品根）算，跟当前目录无关。
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import sys
import time
from pathlib import Path

WORK = Path(__file__).resolve().parent
if str(WORK) not in sys.path:
    sys.path.insert(0, str(WORK))

from vo import common as K          # noqa: E402
from vo import tts, music, sfx, mix, srt, check as check_mod, art as art_mod  # noqa: E402


# ───────── 小工具 ─────────
def _step(i: int, n: int, title: str):
    K.head(f'[{i}/{n}] {title}')


def _fmt_time(path: Path) -> str:
    if not path.exists():
        return '—'
    return time.strftime('%m-%d %H:%M', time.localtime(path.stat().st_mtime))


def _size(path: Path) -> str:
    if not path.exists():
        return ''
    n = path.stat().st_size
    return f'{n / 1e6:.1f}MB'


def _keys(cfg, with_script_only=True):
    """这部片子要处理哪几版：film.json 的 versions 里开了的（默认 zh + short）。
    with_script_only 时再筛掉还没写稿子的那版（短版常常后补）。"""
    keys = K.versions(cfg)
    if with_script_only:
        keys = [k for k in keys if K.script_path(k).exists()]
    return keys


# ───────── lint ─────────
TOKEN = re.compile(r'[A-Za-z][A-Za-z0-9.+#_\-]*|\d[\d.,]*')
CALL = re.compile(r"\b([CSE])\s*\(\s*'([^']+)'\s*(?:,\s*'([^']+)'\s*)?\)")
CHAP = re.compile(r"\bchapter\s*\(\s*'([^']+)'\s*\)")
IMPORT = re.compile(r"""(?:from\s*|import\s*\(\s*|import\s+)['"](\.[^'"]*)['"]""")
TSC_ERR = re.compile(r'^(?P<file>[^(]+)\((?P<line>\d+),(?P<col>\d+)\):\s*error\s+(?P<code>TS\d+):\s*(?P<msg>.+)$')


def _typecheck() -> list[str]:
    """跑一遍 tsc（只查不产出），错误折成「文件:行 说明」。
    放进 lint 的原因：缺必填属性这类错以前要等抽帧才暴露。"""
    tsc = K.find_in_node_modules('typescript/bin/tsc')
    if tsc is None:
        return ['类型检查 找不到 TypeScript（片场 film-kit\\node_modules 里应该有 typescript）']
    r = K.run([K.node(), str(tsc), '--noEmit', '-p', '.'], cwd=K.FILM, quiet=True, check=False)
    out = []
    for line in r.out.splitlines():
        m = TSC_ERR.match(line.strip())
        if m:
            out.append(f'类型检查 {m.group("file")}:{m.group("line")}  {m.group("msg")}')
    if r.returncode != 0 and not out:
        out.append('类型检查失败（tsc 退出码非 0，但没解析出文件）' + K.tail(r.out, 3))
    return out


def _strip_comments(text: str) -> str:
    """去掉 /* */ 块注释和 // 行注释：注释里写的示例 E('句') 不算真引用。
    只做够用的判断——引号里的 // 不当注释（否则画面里的网址会被切掉）。"""
    out, i, n = [], 0, len(text)
    while i < n:
        if text.startswith('/*', i):
            j = text.find('*/', i + 2)
            i = n if j < 0 else j + 2
            continue
        if text.startswith('//', i):
            j = text.find('\n', i)
            i = n if j < 0 else j
            continue
        ch = text[i]
        if ch in '\'"`':
            j = i + 1
            while j < n and text[j] != ch:
                j += 2 if text[j] == '\\' else 1
            out.append(text[i:j + 1])
            i = j + 1
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def _scene_files():
    """scenes\\index.ts 登记到了哪些场景文件。

    从 index.ts 出发递归跟 ./ 开头的相对 import（只在 scenes\\ 目录里跟；往上跳 ../lib 这种不跟，
    那些由 tsc 全量查）。index.ts import 了就算登记 —— SCENES 数组里漏写只是不播，这里不管。
    返回（够得着的文件集合, scenes\\ 里够不着的 .tsx 列表）；没有 index.ts 时返回空集（表示不限制）。
    """
    sdir = K.FILM / 'src' / 'scenes'
    entry = sdir / 'index.ts'
    if not sdir.is_dir() or not entry.exists():
        return set(), []
    seen = set()
    todo = [entry]
    while todo:
        cur = todo.pop()
        if cur in seen:
            continue
        seen.add(cur)
        try:
            txt = _strip_comments(cur.read_text(encoding='utf-8', errors='replace'))
        except OSError:
            continue
        for m in IMPORT.finditer(txt):
            base = Path(os.path.normpath(cur.parent / m.group(1)))
            if base.suffix in ('.ts', '.tsx'):
                cands = [base]
            else:
                cands = [base.with_suffix('.tsx'), base.with_suffix('.ts'),
                         base / 'index.tsx', base / 'index.ts']
            nxt = next((c for c in cands if c.is_file()), None)
            if nxt is None:
                continue
            try:
                nxt.relative_to(sdir)
            except ValueError:
                continue  # 出了 scenes\\ 就不跟
            todo.append(nxt)
    unregistered = [p for p in sorted(sdir.glob('*.tsx')) if p not in seen]
    return seen, unregistered


def _scan_scenes():
    """扫场景源码里的 C('句','标记') / S('句') / E('句') / chapter('章') 引用（注释不算）。
    放在 src/short/ 下的按短版稿子算，其余按正片稿子算。

    scenes\\ 下的 .tsx 只查「登记过的」：从 scenes\\index.ts 的 import 出发递归跟 ./ 相对 import，
    跟不到的文件（还没换掉的示范场景）不算 —— 它们不会进片子，报了也只是噪声。
    返回（各版引用表, scenes\\ 里没登记的文件相对路径）。
    """
    reachable, unregistered = _scene_files()
    out = {}
    for p in sorted((K.FILM / 'src').rglob('*.tsx')):
        rel = p.relative_to(K.FILM / 'src').as_posix()
        if rel.startswith('blocks/') or rel.startswith('ui/') or rel.startswith('kit/'):
            continue
        if rel.startswith('scenes/') and reachable and p not in reachable:
            continue
        key = 'short' if rel.startswith('short/') else 'zh'
        txt = _strip_comments(p.read_text(encoding='utf-8', errors='replace'))
        for m in CALL.finditer(txt):
            kind, sid, cue = m.group(1), m.group(2), m.group(3)
            d = out.setdefault(key, {'C': [], 'S': [], 'E': [], 'chapter': [], 'files': set()})
            d['files'].add(rel)
            if kind == 'C':
                d['C'].append((sid, cue, rel))
            else:
                d[kind].append((sid, rel))
        for m in CHAP.finditer(txt):
            d = out.setdefault(key, {'C': [], 'S': [], 'E': [], 'chapter': [], 'files': set()})
            d['files'].add(rel)
            d['chapter'].append((m.group(1), rel))
    return out, unregistered


def _bom_files(cfg, keys) -> list[Path]:
    """这次体检涉及的 JSON 里，哪些带 UTF-8 BOM。

    PowerShell 的 Set-Content -Encoding UTF8 会写 BOM。片场读 JSON 一律 utf-8-sig，能吃；
    Remotion 打包时 import 的 timing JSON 和 tsc 读带 BOM 的 JSON 也都实测没问题
    （webpack 打出的模块里 BOM 被剥掉，tsc 自己会跳 BOM）。所以这里只提醒、不算错——
    真想干净就重存成无 BOM；timing_*.json 重跑一次 voice 就会按无 BOM 重写。
    """
    out = []
    for p in [WORK / 'film.json', *(K.script_path(k) for k in keys), *(K.timing_path(k) for k in keys)]:
        if p.exists() and K.has_bom(p):
            out.append(p)
    return out


def cmd_lint(cfg, keys=None):
    keys = keys or _keys(cfg)
    if not keys:
        K.die(f'没找到口播稿：{K.script_path("zh")}', '先写 film/src/script.json。')
    scenes, unregistered = _scan_scenes()
    errors, warns, notes = [], [], []
    bom = _bom_files(cfg, keys)
    if bom:
        notes.append('这些文件带 UTF-8 BOM：' + '、'.join(p.name for p in bom)
                     + '（片场、Remotion 打包、tsc 实测都能读，不用急着改；'
                       '想干净就存成无 BOM，timing_*.json 重跑 .\\film.cmd voice 就会按无 BOM 重写）')
    if unregistered:
        warns.append('这些场景文件没有登记，不会进片子：'
                     + '、'.join(f'scenes\\{p.name}' for p in unregistered)
                     + '（在 scenes\\index.ts 里 import 并加进 SCENES 才算登记；不用的示范场景'
                       '建议移到工程根的 _示范场景\\，别删）')

    for key in keys:
        sp = K.script_path(key)
        script = K.load_script(key)
        K.head(f'体检稿子 {key}（{sp.name}）')
        chapters = [c['id'] for c in script.get('chapters', [])]
        items = script.get('items', [])
        if cfg.get('stings', True):
            miss = K.sting_files_missing(items)
            if miss:
                errors.append(f'稿子 {key} 用了通用片头/片尾，但 film\\public 里没有 {"、".join(miss)}。{K.sting_hint()}')
        ids = []
        lines = {}
        for it in items:
            if 'id' in it:
                ids.append(it['id'])
                lines[it['id']] = it
            for fld in ('bubble', 'sting'):
                if fld in it:
                    ids.append(it[fld])
        dup = sorted({x for x in ids if ids.count(x) > 1})
        if dup:
            errors.append(f'{key}：句子/气泡 id 重复：{"、".join(dup)}')
        if not chapters:
            errors.append(f'{key}：没有 chapters（章节表）')
        # 每句：章节存在、标记不重复、别太长
        used_marks = {}
        for it in items:
            sid = it.get('id') or it.get('bubble') or it.get('sting') or '?'
            ch = it.get('ch')
            if ch not in chapters:
                errors.append(f'{key}：句子「{sid}」的章节「{ch}」不在 chapters 里（现有：{"、".join(chapters)}）')
            if 'zh' not in it:
                if 'bubble' not in it and 'sting' not in it:
                    errors.append(f'{key}：句子「{sid}」没有 zh 文字')
                continue
            text, marks = K.strip_marks(it['zh'])
            if len(marks) != len(set(marks)):
                errors.append(f'{key}：句子「{sid}」里标记重名（同一句同一标记只能出现一次）')
            n = K.zh_len(it['zh'])
            if n > 60:
                warns.append(f'{key}：句子「{sid}」去掉标记还有 {n:.0f} 个字，一口气念不完、也不好对点（建议拆句）')
            used_marks[sid] = set(marks)
        # 英文词/数字/符号串：哪些在念法表里、哪些没有
        pairs = K.say_pairs(cfg)
        froms = [a for a, _ in pairs]
        covered, uncovered = set(), set()
        for it in items:
            if 'zh' not in it:
                continue
            body, _ = K.strip_marks(it['zh'])
            for tok in TOKEN.findall(body):
                if any(tok in f for f in froms):
                    covered.add(tok)
                else:
                    uncovered.add(tok)
        notes.append(f'{key}：已在念法表里的英文/数字：{"、".join(sorted(covered)) or "（没有）"}')
        if uncovered:
            warns.append(f'{key}：这些英文/数字/符号串不在念法表（film.json 的 say）里，念法要人工确认：'
                         f'{"、".join(sorted(uncovered))}')
        # 场景引用
        sc = scenes.get(key)
        if sc:
            for sid, cue, rel in sc['C']:
                if sid not in lines:
                    errors.append(f'{key}：{rel} 引用了不存在的句子 C(\'{sid}\',\'{cue}\')')
                elif cue not in used_marks.get(sid, set()):
                    errors.append(f'{key}：{rel} 引用了 C(\'{sid}\',\'{cue}\')，但句子「{sid}」里没有标记 {{{cue}}}')
            for kind in ('S', 'E'):
                for sid, rel in sc[kind]:
                    if sid not in lines:
                        errors.append(f'{key}：{rel} 引用了不存在的句子 {kind}(\'{sid}\')')
            for cid, rel in sc['chapter']:
                if cid not in chapters:
                    errors.append(f'{key}：{rel} 引用了不存在的章节 chapter(\'{cid}\')（现有：{"、".join(chapters)}）')
            # 稿子里有、但没有场景用到的标记
            used = set()
            for sid, cue, _ in sc['C']:
                used.add((sid, cue))
            for sid, marks in used_marks.items():
                for m in marks:
                    if (sid, m) not in used:
                        warns.append(f'{key}：句子「{sid}」的标记 {{{m}}} 没有任何场景用到')
        else:
            warns.append(f'{key}：src/scenes 里没有找到对该稿子的引用（场景还没接上？）')
        # 章节时长
        tp = K.timing_path(key)
        if tp.exists():
            tm = K.load_timing(key)
            K.log('章节时长（来自时间表）：')
            for c in tm['chapters']:
                K.log(f'  {c["id"]:<10} {K.fmt_sec(c["start"])} → {K.fmt_sec(c["end"])}'
                      f'（{(c["end"] - c["start"]):.1f}s）')
            K.log(f'  全片 {tm["total"]:.1f}s')
        else:
            est = {}
            for it in items:
                if 'zh' in it and it.get('ch') in chapters:
                    est[it['ch']] = est.get(it['ch'], 0.0) + K.zh_len(it['zh']) / 4.8 + 0.5
            K.log('章节时长（估算，还没有时间表，按每秒 4.8 字）：')
            for c in chapters:
                K.log(f'  {c:<10} 约 {est.get(c, 0):.1f}s')

    K.head('类型检查（tsc --noEmit）')
    K.log('第一次跑要十几秒，出错会在这里一次性列出来')
    tsc_errors = _typecheck()
    if tsc_errors:
        errors.extend(tsc_errors)
    else:
        K.log('没有类型错误')

    if not any((K.FILM / 'public' / 'sfx').glob('*.mp3')):
        warns.append('film\\public\\sfx 里没有音效：audio 那一步会停下。音效不随片场分发，照'
                     f'{K.ASSETS_DOC}放进片场 local\\sfx\\，再跑 tools\\new_film.py --fill "{K.WORK}"')

    K.head('体检结果')
    seen = set()
    for e in errors:
        if e in seen:  # 同一处引用在场景里出现两次（画面上一次、音效里一次）只报一遍
            continue
        seen.add(e)
        print(f'  ✗ {e}', flush=True)
    for w in warns:
        if w in seen:
            continue
        seen.add(w)
        print(f'  ! {w}', flush=True)
    for n in notes:
        K.log(n)
    print('', flush=True)
    if errors:
        K.log(f'{len(errors)} 个错误、{len(warns)} 个提醒 —— 先把错误改掉再往下跑')
        raise K.KitError(f'稿子体检没通过：{len(errors)} 个错误',
                         '按上面的 ✗ 逐条改稿子（film/src/script.json）或场景，再跑一次 .\\film.cmd lint')
    K.log(f'没有错误，{len(warns)} 个提醒')
    return {'errors': 0, 'warns': len(warns)}


# ───────── voice ─────────
def cmd_voice(cfg, key):
    K.head(f'配音 + 时间表 {key}')
    stats = tts.run(cfg, key)
    K.head('配音结果')
    tts.report(stats)
    return stats


# ───────── 抽帧 ─────────
def _node_script(name: str) -> Path:
    p = K.FILM / 'scripts' / name
    if not p.exists():
        K.die(f'缺少脚本 {p}', '新片要从片场模板拷 scripts/ 整个目录。')
    return p


STILLS_BATCH = 50   # 一次 node 进程最多渲多少张；超过就自动分批（给「一次抽 150 张」这种大图量用）


def _stills(cfg, comp, out_dir: Path, plan: list[dict], batch=None):
    """调 scripts/stills.mjs：一次打包，按 plan 里的秒数逐张出图。

    张数超过 batch（默认 STILLS_BATCH）就自动分批，每批起一个 node 进程。为什么要分：
    一次传几十上百张时，中间只要有一张渲失败（浏览器崩、内存紧、React 渲染超时），
    老写法会把整批剩下的全丢掉、只剩一句「退出码 1」；分批之后一批崩了只影响那几十张，
    前面出好的图都留着，缺的几张在最后一起列出来、退出码非 0。
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    batch = int(STILLS_BATCH if batch is None else batch)
    src = [x for x in plan if x]
    parts = ([src] if batch <= 0 or len(src) <= batch
             else [src[i:i + batch] for i in range(0, len(src), batch)])
    env = {'FILM_BROWSER': K.browser_exe(cfg)}
    t0 = time.time()
    done = 0
    for i, part in enumerate(parts, 1):
        plan_path = K.build_dir(cfg) / f'stills_plan_{comp}_{i}.json'
        K.write_json(plan_path, part)
        if len(parts) > 1:
            K.log(f'第 {i}/{len(parts)} 批：{len(part)} 张（第 {done + 1}–{done + len(part)} 张，共 {len(src)} 张）')
        _run_node([K.node(), str(_node_script('stills.mjs')), '--comp', comp, '--out', str(out_dir),
                   '--plan', str(plan_path)], f'抽帧（{comp}）', cwd=K.FILM, env=env)
        done += len(part)
    if len(src) > 1:
        K.log(f'{len(src)} 张出图共 {time.time() - t0:.1f}s')
    # 出图数对不上就是真失败。老写法这里什么都不查，少几张没人知道 —— 必须报出来，退出码非 0。
    missing = [x for x in src if not (out_dir / str(x.get('name') or '')).exists()]
    if missing:
        K.die(f'{len(src)} 张里只出了 {len(src) - len(missing)} 张，缺 {len(missing)} 张',
              '缺的前几张：' + '、'.join(str(x.get('name') or x.get('sec')) for x in missing[:6])
              + f'。node 的报错原文在上面；单张重抽：.\\film.cmd stills {comp} <秒数>')
    return {'count': len(src), 'dir': str(out_dir)}


def cmd_stills(cfg, comp, secs, batch=None):
    stamp = time.strftime('%Y%m%d-%H%M%S')
    out_dir = K.review_dir(cfg) / 'stills' / f'{comp}_{stamp}'
    plan = [{'sec': float(s), 'name': f'{comp}_{float(s):07.2f}.png'} for s in secs]
    K.head(f'抽 {len(plan)} 张静帧 → {out_dir}')
    _stills(cfg, comp, out_dir, plan, batch)
    for p in sorted(out_dir.glob('*.png')):
        K.log(str(p))


# ───────── review / probe 共用的时间点 ─────────
GENERIC_STINGS = ('intro', 'outro')   # 通用片头片尾：抽一张就够
PAD_EVERY = 1.0                       # 自己起名的垫片（无口播段落）里每隔多少秒取一张
PAD_MARGIN = 0.3                      # 垫片首尾各留多少秒（避开淡入淡出的头尾）
MERGE_GAP = 0.4                       # 自动点之间不足这么多秒的合并


def _is_pad(it: dict) -> bool:
    """自己起名的垫片：kind 是 sting、id 又不是通用片头片尾（intro / outro）。

    品牌动画、片头这类「前面十几秒全是垫片、最后才一句口播」的片子就靠它占时间（见 README
    「无口播为主的片子」）。通用片头片尾是视频素材，抽一张看一眼就够，不当垫片处理。
    """
    return it.get('kind') == 'sting' and it.get('id') not in GENERIC_STINGS


def _pad_times(it: dict, every: float = PAD_EVERY, margin: float = PAD_MARGIN) -> list[float]:
    """垫片区间内均匀取点：默认每 1.0 秒一张、首尾各留 0.3 秒；区间短于 2 秒的取中点。

    12 秒的垫片 → 0.3, 1.3, … 11.3 共 12 个点；1.2 秒的 → 正中一个点。
    """
    a, b = float(it['start']), float(it['end'])
    dur = b - a
    if dur < 2.0:   # 太短，均匀取没意义，取中点
        return [round(a + dur / 2, 2)]
    out, t = [], a + margin
    while t <= b - margin + 1e-6:
        out.append(round(t, 2))
        t += every
    return out


def _explicit_times(tm: dict, at=(), every=None, t_from=None, t_to=None) -> list[float]:
    """--at / --every 明确指定的秒数：不参与「相邻 0.4 秒合并」，也不受 --only 影响。"""
    total = float(tm['total'])
    out = []
    for x in at or ():
        t = round(float(x), 3)
        if t < 0 or t >= total - 0.03:
            K.warn(f'--at {x:g}s 超出片子范围（全片 {total:.2f}s），这张不抽')
            continue
        out.append(t)
    if every:
        out += _grid_times(tm, float(every), t_from, t_to)
    return out


def _grid_times(tm: dict, every: float, t_from=None, t_to=None) -> list[float]:
    """--every：全片（或 --from/--to 限定的范围）按固定间隔取点，给连续看运动用。"""
    total = float(tm['total'])
    if every <= 0:
        K.die(f'--every 要写正数秒数（现在写的是 {every}）', '例如 --every 0.15 是每 0.15 秒一张。')
    a = max(0.0, float(t_from) if t_from is not None else 0.0)
    b = min(total - 0.03, float(t_to) if t_to is not None else total - 0.03)
    if b <= a:
        K.die(f'--from {a:g} / --to {b:g} 之间是空的（全片 {total:.2f}s）',
              '把 --to 写大一点，或者干脆不写 --from / --to（默认全片）。')
    n = int(math.floor((b - a) / every + 1e-9))
    return [round(a + i * every, 3) for i in range(n + 1)]


def _finish_times(auto: list[float], extra: list[float], total: float) -> list[float]:
    """自动点按老规矩（相邻不足 0.4 秒的合并）收一遍，再把明确指定的点加进去。

    明确指定的点只在和自动点撞得极近（0.05 秒以内，等于同一帧）时才丢，
    不然 --every 0.15 会被 0.4 秒的合并规则吃掉。
    """
    total = float(total)
    merged = []
    for t in sorted(t for t in auto if 0 <= t < total - 0.03):
        if merged and t - merged[-1] < MERGE_GAP:
            continue
        merged.append(round(t, 2))
    for t in sorted(extra):
        if not (0 <= t < total - 0.03):
            continue
        if any(abs(t - m) < 0.05 for m in merged):
            continue
        merged.append(round(t, 3))
    return sorted(merged)


def _extra_note(at=(), every=None, t_from=None, t_to=None) -> str:
    """index.md / probe.md 抬头用：这次另外指定了哪些点。"""
    bits = []
    if at:
        bits.append('--at ' + '、'.join(f'{float(x):g}s' for x in at))
    if every:
        span = f'{float(t_from or 0):g}–{float(t_to):g}s' if t_to is not None else '全片'
        bits.append(f'--every {float(every):g}s（{span}）')
    return '；'.join(bits)


def _review_times(tm: dict, only=None) -> list[float]:
    """每句每个标记后 0.6s、每句结束前 0.15s、每章开始后 0.5s、每个气泡出现后 0.8s、
    每个自己起名的垫片里每 1.0s 一张（见 _pad_times）；相邻不足 0.4s 的合并。"""
    shots = []
    for it in tm.get('items', []):
        if it['kind'] == 'bubble':
            shots.append(float(it['start']) + 0.8)
            continue
        if it['kind'] == 'sting':
            if _is_pad(it):
                # 自己起名的垫片：整段没有口播，按「每 1 秒一张」在里面均匀取点，
                # 不然品牌动画那种前面十几秒全是垫片的片子一个点都取不到
                if not (only and it.get('ch') not in only):
                    shots += _pad_times(it)
            else:
                shots.append(float(it['start']) + 0.5)  # 片头片尾也要抽一张，不然审片看不到这两段
            continue
        if it['kind'] != 'line':
            continue
        if only and it.get('ch') not in only:
            continue
        for t in (it.get('cues') or {}).values():
            shots.append(float(t) + 0.6)
        shots.append(float(it['end']) - 0.15)
    for c in tm.get('chapters', []):
        if only and c['id'] not in only:
            continue
        shots.append(float(c['start']) + 0.5)
    return _finish_times(shots, [], tm['total'])


def _shot_meta(tm: dict, t: float) -> dict:
    """这一刻：在哪一章、哪一句（或气泡/片头片尾/空档）、刚念到哪个标记、字幕显示什么、整句原文。"""
    items = tm.get('items', [])
    ch = None
    for c in tm.get('chapters', []):
        if c['start'] <= t + 0.001:
            ch = c
    ch_id = ch['id'] if ch else ''

    # 气泡、片头片尾：这几秒没有说话，写清是什么时段，不要拿上一句糊上来
    for it in items:
        if it['kind'] in ('bubble', 'sting') and it['start'] - 0.1 <= t <= it['end'] + 0.35:
            if it['kind'] == 'bubble':
                label = f'（气泡 {it["id"]}）'
                body = it.get('text', '') or ''
            else:
                # intro / outro 是通用片头片尾；别的名字是片子自己起的垫片（品牌动画里占时间用的）
                name = {'intro': '片头', 'outro': '片尾'}.get(it['id'])
                if name:
                    label = f'（{name}）'
                else:
                    # 自己起名的垫片写相对位置（+3.0s 就是垫片开始后 3 秒），方便对着分镜看
                    label = f'（垫片 {it["id"]} +{max(0.0, t - float(it["start"])):.1f}s）'
                body = ''
            return {'chapter': ch_id, 'line': label, 'cue': '', 'sub': '', 'text': body, 'tag': it['id']}

    line = None
    for it in items:
        if it['kind'] == 'line' and it['start'] - 0.01 <= t <= it['end'] + 0.2:
            line = it
    if line is not None:
        cue = ''
        best = [(tt, name) for name, tt in (line.get('cues') or {}).items() if tt <= t + 0.001]
        if best:
            cue = max(best)[1]
        sub = ''
        for s in line.get('subs', []):
            if s['s'] - 0.05 <= t <= s['e'] + 0.06:
                sub = s['t']
        if not sub:
            near = min(line.get('subs', []), key=lambda s: abs(s['s'] - t)) if line.get('subs') else None
            sub = near['t'] if near else ''
        return {'chapter': ch_id, 'line': line['id'], 'cue': cue, 'sub': sub,
                'text': line.get('text', ''), 'tag': line['id']}

    # 空档：章刚一开头还没开口，或者句与句之间
    nxt = next((it for it in items if it['kind'] == 'line' and it['start'] > t), None)
    is_start = ch is not None and (t - float(ch['start'])) <= 1.5
    label = '（章节开始）' if is_start else '（句间留白）'
    text = ''
    if nxt is not None and (is_start or nxt.get('ch') == ch_id):
        text = '下一句：' + (nxt.get('text') or '')
    return {'chapter': ch_id, 'line': label, 'cue': '', 'sub': '', 'text': text,
            'tag': f'{ch_id or "gap"}-{"start" if is_start else "gap"}'}


def _probe_times(tm: dict, only=None) -> list[float]:
    """排版体检的时间点：每个标记后 0.9s、每句结束前 0.15s、每个气泡出现后 1.0s、
    每个自己起名的垫片里每 1.0s 一张（跟 review 一样，不然垫片段量不到版面）。
    故意不取「章节开始后 0.5 秒」这类点 —— 那正是换章过场的动画中间，量版面必然误报；
    过场要不要好看由 review 抽帧给人看。通用片头片尾（intro / outro）也不量：那是视频素材，
    没有场景正文可检。
    """
    shots = []
    for it in tm.get('items', []):
        if it['kind'] == 'bubble':
            shots.append(float(it['start']) + 1.0)
            continue
        if it['kind'] == 'sting':
            if _is_pad(it) and not (only and it.get('ch') not in only):
                shots += _pad_times(it)
            continue
        if it['kind'] != 'line':
            continue
        if only and it.get('ch') not in only:
            continue
        for t in (it.get('cues') or {}).values():
            shots.append(float(t) + 0.9)
        shots.append(float(it['end']) - 0.15)
    return _finish_times(shots, [], tm['total'])


def _round_dir(cfg, rnd, key) -> Path:
    """审片轮次目录带版本后缀：review\\<轮次>_zh\\、review\\<轮次>_short\\，
    这样正片和短版同一轮不会互相覆盖 index.md。"""
    rnd = rnd or time.strftime('%Y%m%d-%H%M%S')
    if not rnd.endswith(f'_{key}'):
        rnd = f'{rnd}_{key}'
    return K.review_dir(cfg) / rnd


def _run_node(args, what: str, cwd=None, env=None, retries: int = 1, tail_lines: int = 30) -> None:
    """跑 node 脚本。node 偶发异常退出（3221226505 这种）自动重试一次：机器紧的时候会撞上。

    失败时把 node 自己的报错原文整段打出来。以前只留了第一行「命令失败（退出码 1…）」，
    真正的错在后面几十行（栈、哪一帧、哪个模块），看起来就像「退出码 1、没有任何报错」。
    """
    for attempt in range(retries + 1):
        try:
            r = K.run(args, cwd=cwd, env=env, tail_lines=tail_lines)
            # 画面代码的提醒（「[镜头包] …」「[积木] …」：参数越界、文字放不下）是 node 脚本从浏览器收回来的，
            # 成功时 node 的输出不整段打，但这几行必须让人看见
            seen = set()
            for ln in (getattr(r, 'out', '') or '').splitlines():
                ln = ln.strip().lstrip('! ').strip()
                if ln.startswith(('[镜头包]', '[积木]')) and ln not in seen:
                    seen.add(ln)
                    K.warn(ln)
            return
        except K.KitError as ex:
            lines = [ln for ln in ex.msg.splitlines() if ln.strip()]
            head = lines[0] if lines else ''
            # 逐张成功的那几十行「ok 12.5 → …」是噪声，报错时只留真正的错
            detail = [ln for ln in lines[1:] if not ln.lstrip().startswith('ok ')]
            if attempt >= retries:
                body = '\n'.join([head] + detail[-tail_lines:])
                raise K.KitError(f'{what}失败（已重试 {retries} 次）：\n{body}',
                                 '上面是 node 的原话（栈、哪一帧、哪个模块）。node 偶发崩溃重跑一般就过；'
                                 '连续出现再查内存和并发（film.json 的 render.concurrency）。'
                                 '张数很多时可以分批：.\\film.cmd stills <合成名> --batch 20 <秒数…>')
            K.warn(f'{what} 失败，重试一次：{head}')


def cmd_review(cfg, key, rnd=None, only=None, at=(), every=None, t_from=None, t_to=None, batch=None):
    key = K.check_key(key)
    tm = K.load_timing(key)
    comp = K.scalar_for(cfg, key, 'comps')
    out_dir = _round_dir(cfg, rnd, key)
    rnd = out_dir.name
    auto = _review_times(tm, only)
    extra = _explicit_times(tm, at, every, t_from, t_to)
    times = _finish_times(auto, extra, tm['total'])
    if not times:
        K.die('没有选出任何时间点', '检查 --only 写的章节 id 对不对。')
    pads = sum(1 for it in tm.get('items', []) if _is_pad(it))
    K.head(f'审片抽帧 {key}：{len(times)} 个时间点（其中另外指定 {len(extra)} 个）→ {out_dir}')
    if pads:
        K.log(f'稿子里有 {pads} 个自己起名的垫片（无口播段落），每个里面每 {PAD_EVERY:g}s 取一张')
    plan = []
    metas = []
    for t in times:
        m = _shot_meta(tm, t)
        name = f'{t:07.2f}_{m["tag"] or "shot"}.png'
        plan.append({'sec': t, 'name': name})
        metas.append((t, name, m))
    _stills(cfg, comp, out_dir, plan, batch)

    lines = [f'# 审片清单 · {key}（{rnd}）', '',
             f'- 合成名：`{comp}`，共 {len(plan)} 张，来自 {K.timing_path(key).name}',
             '- 时间点规则：每个标记后 0.6s、每句结束前 0.15s、每章开始后 0.5s、每个气泡后 0.8s、'
             f'每个自己起名的垫片里每 {PAD_EVERY:g}s 一张（首尾各留 {PAD_MARGIN:g}s，短于 2s 的取中点），'
             f'相邻不足 {MERGE_GAP:g}s 的合并']
    note = _extra_note(at, every, t_from, t_to)
    if note:
        lines.append(f'- 另外指定：{note}（这些点不参与合并）')
    lines += ['', '| 图片 | 秒数 | 章节 | 句 | 这一刻的标记 | 当时的字幕 | 整句原文 |', '|---|---|---|---|---|---|---|']
    esc = lambda s: str(s).replace('|', '\\|')  # noqa: E731
    for t, name, m in metas:
        lines.append(f'| {name} | {t:.2f}s | {m["chapter"]} | {m["line"] or "—"} | '
                     f'{m["cue"] or "—"} | {esc(m["sub"])} | {esc(m["text"])} |')
    idx = out_dir / 'index.md'
    idx.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    K.log(f'清单：{idx}')
    return {'round': rnd, 'count': len(plan), 'dir': str(out_dir), 'index': str(idx)}


# ───────── probe ─────────
# 字幕条的固定区域（字幕条当前没显示时，「窗口压字幕条」按这个算）：
#   正片：kit\overlay.tsx 里字幕条 bottom:30，正片画布 1080 高，字幕内容占最下面一条 → y ≥ 940；
#   短版：short\Short.tsx 里字幕 top:1510、字号 52 × 行高 1.3 加内边距 → 1510 到 1630。
SUB_ZONE = {'zh': (940, None), 'short': (1510, 1630)}


def cmd_probe(cfg, key, rnd=None, only=None, at=(), every=None, t_from=None, t_to=None):
    key = K.check_key(key)
    tm = K.load_timing(key)
    comp = K.scalar_for(cfg, key, 'comps')
    out_dir = _round_dir(cfg, rnd, key)
    rnd = out_dir.name
    exp = K.profile(cfg, key, 'expect')
    auto = _probe_times(tm, only)
    extra = _explicit_times(tm, at, every, t_from, t_to)
    times = _finish_times(auto, extra, tm['total'])
    if not times:
        K.die('没有选出任何时间点', '检查 --only 写的章节 id 对不对。')
    plan_path = K.build_dir(cfg) / f'probe_plan_{key}.json'
    out_json = K.build_dir(cfg) / f'probe_{key}.json'
    tmp = K.build_dir(cfg) / 'probe_tmp'
    K.write_json(plan_path, [{'sec': t} for t in times])
    K.head(f'排版体检 {key}：{len(times)} 个时间点（其中另外指定 {len(extra)} 个）→ {out_dir}/probe.md')
    env = {'FILM_BROWSER': K.browser_exe(cfg)}
    cmd = [K.node(), str(_node_script('probe.mjs')), '--comp', comp, '--plan', str(plan_path),
           '--out', str(out_json), '--tmp', str(tmp), '--width', str(exp['width']),
           '--height', str(exp['height'])]
    sub_top, sub_bottom = SUB_ZONE.get(key, (None, None))
    if sub_top is not None:
        cmd += ['--sub-top', str(sub_top)]
        if sub_bottom is not None:
            cmd += ['--sub-bottom', str(sub_bottom)]
    _run_node(cmd, f'排版体检（{comp}）', cwd=K.FILM, env=env)
    data = K.read_json(out_json, '排版体检结果')
    if data.get('failed'):
        K.warn(f'{data["failed"]} 个时间点没量到（node 超时/崩了），这次结果可能不全，建议重跑一次')
    issues = data.get('issues', [])
    # 同一段文字（或同一个模拟窗口）在多个时间点报同一个问题 → 合并成一条，写起止秒数。
    # 有 key 的（窗口压字幕条）按窗口身份合并，隔多远都算一条；没 key 的按 1.2 秒以内的连续时间点合并
    # （同一句话在不同章节各出现一次，不该并成一条）。
    merged = []
    for it in issues:
        hit = next((m for m in merged if m['kind'] == it['kind'] and m['text'] == it['text']
                    and m.get('key') == it.get('key')
                    and (bool(it.get('key')) or it['sec'] - m['sec1'] <= 1.2)), None)
        if hit:
            hit['sec1'] = it['sec']
            hit['count'] += 1
        else:
            merged.append({**it, 'sec0': it['sec'], 'sec1': it['sec'], 'count': 1})
    errs = [m for m in merged if m['level'] == 'error']
    warns = [m for m in merged if m['level'] == 'warn']
    out_dir.mkdir(parents=True, exist_ok=True)
    md = out_dir / 'probe.md'
    L = [f'# 排版体检 · {key}（{rnd}）', '',
         f'- 画布：{exp["width"]}×{exp["height"]}',
         '- 时间点规则：每个标记后 0.9s、每句结束前 0.15s、每个气泡后 1.0s、'
         f'每个自己起名的垫片里每 {PAD_EVERY:g}s 一张（首尾各留 {PAD_MARGIN:g}s），'
         f'相邻不足 {MERGE_GAP:g}s 的合并；不取换章过场中间的点']
    note = _extra_note(at, every, t_from, t_to)
    if note:
        L.append(f'- 另外指定：{note}（这些点不参与合并）')
    L += [f'- {len(times)} 个时间点，{len(merged)} 个问题（错误 {len(errs)}、提醒 {len(warns)}）', '']
    if not merged:
        L.append('N 个时间点，0 个问题。'.replace('N', str(len(times))))
    else:
        by_sec = {}
        for m in merged:
            by_sec.setdefault(round(m['sec0'], 1), []).append(m)
        for sec in sorted(by_sec):
            meta = _shot_meta(tm, sec)
            L += [f'## {sec:.2f}s · {meta["chapter"]} · {meta["line"] or "—"} · 标记 {meta["cue"] or "—"}',
                  '', '| 类型 | 问题 | 文字（前 20 字） | 矩形 | 秒数 |', '|---|---|---|---|---|']
            for m in by_sec[sec]:
                span = f'{m["sec0"]:.2f}' if m['sec0'] == m['sec1'] else f'{m["sec0"]:.2f}–{m["sec1"]:.2f}'
                r = m.get('rect') or {}
                level = '错误' if m['level'] == 'error' else '提醒'
                text = str(m['text'])[:20].replace('|', '\\|')
                label = f' {m["label"]}' if m.get('label') else ''
                L.append(f'| {level} | {m["kind"]} | {text} | '
                         f'{r.get("x", 0):.0f},{r.get("y", 0):.0f} {r.get("w", 0):.0f}×{r.get("h", 0):.0f}{label}'
                         f' | {span} |')
            L.append('')
    md.write_text('\n'.join(L) + '\n', encoding='utf-8')
    K.log(f'排版体检表：{md}')
    if errs:
        for m in errs[:10]:
            print(f'  ✗ {m["kind"]} @ {m["sec0"]:.2f}s：{m["text"][:24]}', flush=True)
    for m in warns:  # 窗口压字幕条这类提醒要写清是哪个窗口、压在哪，不然没法改
        if m['kind'] != '窗口压字幕条':
            continue
        r = m.get('rect') or {}
        z = m.get('zone') or {}
        print(f'  ! 提醒：模拟窗口压到字幕区（{m.get("label") or "窗口"} '
              f'x={r.get("x", 0):.0f} y={r.get("y", 0):.0f} {r.get("w", 0):.0f}×{r.get("h", 0):.0f}，'
              f'字幕区 y {z.get("y", 0):.0f}–{z.get("y", 0) + z.get("h", 0):.0f}）@ {m["sec0"]:.2f}s', flush=True)
    K.log(f'结论：{len(errs)} 个错误、{len(warns)} 个提醒')
    return {'ok': not errs, 'errors': len(errs), 'warns': len(warns), 'md': str(md)}


# ───────── render ─────────
def _render_part(cfg, key, comp, s: int, e: int, target: Path, conc: int) -> bool:
    r = cfg['render']
    log = K.build_dir(cfg) / 'logs' / f'render_{key}_{s:05d}.log'
    browser = K.browser_exe(cfg)
    cmd = [K.node(), str(K.remotion_cli()), 'render', 'src/index.ts', comp, str(target),
           f'--frames={s}-{e}', '--codec=h264', f'--crf={r["crf"]}', f'--concurrency={conc}',
           '--muted', f'--timeout={r["timeout"]}', f'--gl={r["gl"]}']
    if browser:
        cmd.append(f'--browser-executable={browser}')
    K.log(f'第 {s}-{e} 帧，并发 {conc}')
    try:
        K.run(cmd, cwd=K.FILM, log_path=log)
        return target.exists()
    except K.KitError as ex:
        K.warn(f'这一段的渲染失败：{ex.msg.splitlines()[0]}')
        if target.exists():
            target.unlink()
        return False


def cmd_render(cfg, key, t_from=None, t_to=None, fresh=False):
    key = K.check_key(key)
    tm = K.load_timing(key)
    comp = K.scalar_for(cfg, key, 'comps')
    fps = float(K.profile(cfg, key, 'expect').get('fps') or 60)
    total = int(math.ceil(float(tm['total']) * fps))
    chunk = int(cfg['render']['chunk'])
    conc = int(cfg['render']['concurrency'])
    retry_conc = int(cfg['render']['retryConcurrency'])
    cdir = K.build_dir(cfg) / f'chunks_{key}'
    cdir.mkdir(parents=True, exist_ok=True)
    final = K.silent_mp4(cfg, key)

    # 分段是按「时间表 + 分段参数」渲的；这两样一变，旧分段的帧位置就全错位了，
    # 不能因为文件在就跳过。做法：把签名存下来，签名对不上就把旧分段整体挪进 stale_<时间>/（不删）。
    import hashlib
    sig = hashlib.sha1(K.timing_path(key).read_bytes() + f'|{total}|{chunk}|{comp}'.encode('utf-8')).hexdigest()
    sig_path = cdir / 'signature.txt'
    old_sig = sig_path.read_text(encoding='utf-8').strip() if sig_path.exists() else ''
    if old_sig and old_sig != sig:
        stamp = time.strftime('%Y%m%d-%H%M%S')
        stale = cdir / f'stale_{stamp}'
        stale.mkdir(parents=True, exist_ok=True)
        moved = 0
        for p in list(cdir.glob('part_*.mp4')) + list(cdir.glob('part_*.bad.mp4')):
            p.rename(stale / p.name)
            moved += 1
        K.warn(f'时间表或分段参数变了，旧分段作废：{moved} 个已挪到 {stale}')
        if final.exists():
            final.rename(final.with_name(f'{final.stem}_旧_{stamp}{final.suffix}'))
    sig_path.write_text(sig, encoding='utf-8')

    # 分段只按「时间表 + 分段参数」判断新旧，**看不出画面代码改没改**：改了场景再跑 render，已渲好的段会被跳过，
    # 成片里还是旧画面。所以这里做两件事：--fresh 整片重渲；跳过某一段时如果画面代码比它新，明说出来。
    if fresh:
        n_old = 0
        for p in list(cdir.glob('part_*.mp4')):
            p.unlink()
            n_old += 1
        if final.exists():
            final.unlink()
        K.log(f'--fresh：删掉已有的 {n_old} 段，整片重渲')
    src_files = [p for p in (K.FILM / 'src').rglob('*') if p.is_file() and p.suffix in ('.ts', '.tsx', '.json')]
    newest_src = max(src_files, key=lambda p: p.stat().st_mtime) if src_files else None
    outdated = []

    ranges = [(s, min(total - 1, s + chunk - 1)) for s in range(0, total, chunk)]
    if t_from is not None or t_to is not None:
        f0 = int(math.floor((t_from or 0) * fps))
        f1 = int(math.ceil((t_to if t_to is not None else float(tm['total'])) * fps))
        targets = [(s, e) for s, e in ranges if not (e < f0 or s >= f1)]
        if not targets:
            K.die(f'给定的秒数范围（{t_from}–{t_to}）不落在任何一段里',
                  f'全片 {total} 帧，每段 {chunk} 帧。')
        K.log(f'只重渲覆盖 [{t_from or 0}s, {t_to if t_to is not None else tm["total"]}s] 的 {len(targets)} 段')
        for s, e in targets:
            p = cdir / f'part_{s:05d}.mp4'
            if p.exists():
                K.log(f'删掉要重渲的 {p.name}')
                p.unlink()
        if final.exists():
            K.log('删掉旧的拼接结果（会重新拼）')
            final.unlink()
        ranges = targets

    K.head(f'渲染 {key}（{comp}）：{total} 帧，每段 {chunk} 帧，并发 {conc} → {final}')
    made, skipped, failed = [], [], []
    t_start = time.time()
    for i, (s, e) in enumerate(ranges, 1):
        part = cdir / f'part_{s:05d}.mp4'
        want = e - s + 1
        if part.exists():
            got = K.frame_count(part)
            if got == want:
                K.log(f'[{i}/{len(ranges)}] {part.name} 已经渲好（{got} 帧），跳过')
                skipped.append(part)
                if newest_src is not None and part.stat().st_mtime < newest_src.stat().st_mtime - 1:
                    outdated.append((part.name, s, e))
                continue
            K.warn(f'{part.name} 帧数不对（要 {want}，实际 {got}），删掉重渲')
            part.unlink()
        K.log(f'[{i}/{len(ranges)}] {part.name}')
        tmp = cdir / f'part_{s:05d}.tmp.mp4'   # 先写 .tmp.mp4，成了再改名，中断不会留下半截成品
        ok = _render_part(cfg, key, comp, s, e, tmp, conc)
        if not ok:
            K.warn(f'并发降到 {retry_conc} 再试一次')
            ok = _render_part(cfg, key, comp, s, e, tmp, retry_conc)
        if not ok:
            failed.append(s)
            K.die(f'第 {s}-{e} 帧渲染失败（已用并发 {conc} 和 {retry_conc} 各试一次）',
                  f'重跑 .\\film.cmd render {key} 会跳过已渲好的段、只补这一段；'
                  f'日志在 {K.build_dir(cfg) / "logs"}')
        got = K.frame_count(tmp)
        if got != want:
            K.warn(f'{tmp.name} 帧数不对（要 {want}，实际 {got}），保留下来重渲')
            bad = tmp.with_suffix('.bad.mp4')
            if bad.exists():
                bad.unlink()
            tmp.rename(bad)
            K.die(f'第 {s}-{e} 帧渲出来帧数不对', f'看日志 {K.build_dir(cfg) / "logs"}，然后重跑 render。')
        tmp.rename(part)
        made.append(part)
    K.log(f'渲染耗时 {(time.time() - t_start) / 60:.1f} 分钟（新渲 {len(made)} 段，跳过 {len(skipped)} 段）')
    if outdated:
        K.warn(f'跳过的 {len(outdated)} 段是在画面代码最后一次改动（{newest_src.relative_to(K.FILM)}）之前渲的，里面可能是旧画面：'
               + '、'.join(n for n, _, _ in outdated))
        K.warn(f'改过的镜头落在哪几段就重渲哪几段：.\\film.cmd render {key} --from <秒> --to <秒>；'
               f'拿不准就整片重渲：.\\film.cmd render {key} --fresh')

    # 拼接前逐段核帧数；还没渲的段不报错，只提示（只重渲一段时不可能拼全片）
    parts, missing = [], []
    for s, e in [(s, min(total - 1, s + chunk - 1)) for s in range(0, total, chunk)]:
        p = cdir / f'part_{s:05d}.mp4'
        want = e - s + 1
        if not p.exists():
            missing.append(p.name)
            continue
        got = K.frame_count(p)
        if got != want:
            K.die(f'{p.name} 帧数不对（要 {want}，实际 {got}）',
                  f'把这一段删掉再跑 .\\film.cmd render {key} --from {s / fps:.1f} --to {e / fps:.1f}')
        parts.append(p)
    if missing:
        K.head('还差几段没渲')
        K.log(f'缺：{"、".join(missing)}')
        K.log(f'补全后再拼接：.\\film.cmd render {key}（会跳过已渲好的段）')
        return {'out': '', 'frames': total, 'missing': missing}
    lst = cdir / 'list.txt'
    lst.write_text(''.join(f"file '{p.as_posix()}'\n" for p in parts), encoding='utf-8')
    K.head('无损拼接')
    K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst),
           '-c', 'copy', str(final)], quiet=False)
    got = K.frame_count(final)
    if got != total:
        K.warn(f'拼接结果 {got} 帧，时间表是 {total} 帧（差 {got - total}），检查分段')
    K.log(f'无声画面：{final}  {_size(final)}  {got} 帧')
    return {'out': str(final), 'frames': total}


# ───────── audio ─────────
def cmd_audio(cfg, key):
    key = K.check_key(key)
    comp = K.scalar_for(cfg, key, 'sfxComps')
    total = 4
    _step(1, total, f'配乐 {key}')
    music.run(cfg, key)
    _step(2, total, f'导出音效清单 {key}')
    env = {'FILM_BROWSER': K.browser_exe(cfg)}
    _run_node([K.node(), str(_node_script('sfxlist.mjs')), '--comp', comp,
               '--out', str(K.sfx_events(cfg, key))], f'导出音效清单（{comp}）', cwd=K.FILM, env=env)
    _step(3, total, f'音效轨 {key}')
    sfx.run(cfg, key)
    _step(4, total, f'混音 {key}')
    st = mix.run(cfg, key)
    K.head('音频结果')
    K.log(f'整体响度 {st["lufs"]} LUFS（目标 -14.0），真峰值 {st["peak"]} dBFS（不高于 -1.5）')
    return st


# ───────── mux ─────────
def cmd_mux(cfg, key):
    key = K.check_key(key)
    video_src = K.silent_mp4(cfg, key)
    audio = K.mix_wav(cfg, key)
    if not video_src.exists():
        K.die(f'没有无声画面：{video_src}', f'先跑 .\\film.cmd render {key}')
    if not audio.exists():
        K.die(f'没有混音：{audio}', f'先跑 .\\film.cmd audio {key}')
    outdir = K.out_dir(cfg)
    outdir.mkdir(parents=True, exist_ok=True)
    name = str(K.scalar_for(cfg, key, 'videos'))
    if not name or name == 'None':
        K.die('film.json 的 videos 里没写这个键（' + key + '）的成片文件名')
    out = outdir / name
    if out.exists():
        stamp = time.strftime('%Y%m%d-%H%M%S')
        backup = out.with_name(f'{out.stem}_备份{stamp}{out.suffix}')
        K.log(f'目标文件已存在，先改名备份：{backup.name}')
        out.rename(backup)
    K.head(f'合成 {key} → {out}')
    K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-i', str(video_src), '-i', str(audio),
           '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k',
           '-ar', '48000', '-movflags', '+faststart', '-shortest', str(out)])
    info = K.video_info(out)
    K.log(f'成片：{out.name}  {info["duration"]:.2f}s  {info["width"]}×{info["height"]}  '
          f'{info["fps"]:g}fps  {_size(out)}')
    bare = mix.nomusic_wav(cfg, key)
    if (cfg.get('audio') or {}).get('alsoNoMusic') and bare.exists():
        # 无配乐版：画面一样，声音只有人声和音效（film.json 的 audio.alsoNoMusic）
        out2 = out.with_name(f'{out.stem}_无配乐{out.suffix}')
        if out2.exists():
            out2.rename(out2.with_name(f'{out2.stem}_备份{time.strftime("%Y%m%d-%H%M%S")}{out2.suffix}'))
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-i', str(video_src), '-i', str(bare),
               '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k',
               '-ar', '48000', '-movflags', '+faststart', '-shortest', str(out2)])
        K.log(f'无配乐版：{out2.name}  {_size(out2)}')
    srt_name = str(K.scalar_for(cfg, key, 'srts')) or f'字幕_{key}.srt'
    srt.write(cfg, key, outdir / srt_name)
    return {'video': str(out), 'srt': str(outdir / srt_name)}


# ───────── clip ─────────
def cmd_clip(cfg, key, t0, t1, audio_only=False):
    key = K.check_key(key)
    if t1 <= t0:
        K.die('止秒数要比起秒数大')
    outdir = K.review_dir(cfg) / 'clips'
    outdir.mkdir(parents=True, exist_ok=True)
    final = K.out_dir(cfg) / str(K.scalar_for(cfg, key, 'videos'))
    src = final
    if not src.exists():
        silent, audio = K.silent_mp4(cfg, key), K.mix_wav(cfg, key)
        if not (silent.exists() and audio.exists()):
            K.die(f'既没有成片，也没有可现合的无声画面+混音：{final}', f'先跑 .\\film.cmd all {key}')
        tmp = K.build_dir(cfg) / f'clip_src_{key}.mp4'
        K.log('没有成片，先用无声画面加混音现合一个来切')
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-i', str(silent), '-i', str(audio),
               '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
               '-shortest', str(tmp)])
        src = tmp
    tag = f'{key}_{t0:07.2f}-{t1:07.2f}'
    out = outdir / (f'{tag}.mp3' if audio_only else f'{tag}.mp4')
    K.head(f'切审看片段 → {out}')
    if audio_only:
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-ss', str(t0), '-to', str(t1), '-i', str(src),
               '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', str(out)])
    else:
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-ss', str(t0), '-to', str(t1), '-i', str(src),
               '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '192k',
               '-movflags', '+faststart', str(out)])
    info = K.video_info(out) if not audio_only else {}
    dur = '' if audio_only else f'  {info.get("duration", 0):.2f}s'
    K.log(f'片段：{out}  {_size(out)}{dur}')
    return {'out': str(out)}


# ───────── status ─────────
def cmd_status(cfg, keys=None):
    keys = keys or _keys(cfg)
    if not keys:
        K.log('还没有口播稿（film/src/script.json）')
        return {}
    K.head(f'片场状态 · {cfg["name"]}')
    K.log(f'成品目录：{K.out_dir(cfg)}')
    off = [k for k in ('zh', 'short') if k not in K.versions(cfg)]
    if off:
        K.log(f'film.json 的 versions 里没有 {"、".join(off)}：这几版不处理、也不打印')

    def w(s):
        return sum(2 if ord(ch) > 127 else 1 for ch in s)

    def pad(s, n):
        s = str(s)
        return s + ' ' * max(0, n - w(s))

    def older(a, b, tol=2.0):
        """a 比 b 旧（留 2 秒容差：同一轮里先写人声、后写时间表，不该算过期）"""
        return a is not None and b is not None and a < b - tol

    todo = []
    for key in keys:
        rows = [
            ('稿子', K.script_path(key)),
            ('时间表', K.timing_path(key)),
            ('人声', K.voice_wav(cfg, key)),
            ('配乐', K.music_wav(cfg, key)),
            ('音效清单', K.sfx_events(cfg, key)),
            ('音效轨', K.sfx_wav(cfg, key)),
            ('混音', K.mix_wav(cfg, key)),
            ('无声画面', K.silent_mp4(cfg, key)),
            ('成片', K.out_dir(cfg) / str(K.scalar_for(cfg, key, 'videos'))),
            ('字幕', K.out_dir(cfg) / str(K.scalar_for(cfg, key, 'srts'))),
        ]
        labels = [r[0] for r in rows]
        lw = max(w(x) for x in labels) + 2
        print(f'\n  【{key}】', flush=True)
        for label, p in rows:
            mark = '有' if p.exists() else '缺'
            print(f'  {pad(label, lw)} {mark}  {_fmt_time(p):<12} {_size(p):>8}  {p.name}', flush=True)
        m = {label: (p.stat().st_mtime if p.exists() else None) for label, p in rows}
        script_t = m['稿子']
        if script_t is None:
            todo.append(f'{key}：先写稿子 {K.script_path(key).name}')
            continue
        if m['时间表'] is None:
            todo.append(f'{key}：稿子有了，先配音 → .\\film.cmd voice {key}')
            continue
        if older(m['时间表'], script_t):
            todo.append(f'{key}：稿子比时间表新（配音过期）→ .\\film.cmd voice {key}')
        if m['人声'] is None or older(m['人声'], m['时间表']):
            todo.append(f'{key}：人声比时间表旧 → .\\film.cmd voice {key}')
        if m['无声画面'] is None:
            todo.append(f'{key}：还没渲染 → .\\film.cmd render {key}')
        elif older(m['无声画面'], m['时间表']):
            todo.append(f'{key}：时间表比无声画面新（画面过期）→ .\\film.cmd render {key}')
        audio_old = [lbl for lbl in ('配乐', '音效清单', '音效轨', '混音') if m[lbl] is None or older(m[lbl], m['时间表'])]
        if audio_old:
            todo.append(f'{key}：{"、".join(audio_old)} 缺或过期 → .\\film.cmd audio {key}')
        if m['成片'] is None:
            todo.append(f'{key}：还没合成 → .\\film.cmd mux {key}')
        else:
            newest = max([m[k] for k in ('无声画面', '混音') if m[k]] or [0])
            if older(m['成片'], newest):
                todo.append(f'{key}：画面或混音比成片新 → .\\film.cmd mux {key}，然后 check {key}')
            elif m['字幕'] is None or older(m['字幕'], m['时间表']):
                todo.append(f'{key}：字幕缺或过期 → .\\film.cmd mux {key}')
    K.head('下一步')
    if todo:
        for t in todo:
            print(f'  · {t}', flush=True)
    else:
        print('  · 全部产物都是最新的，可以跑 .\\film.cmd check zh 复检一下再发布', flush=True)
    return {'todo': todo}


# ───────── all ─────────
def cmd_all(cfg, key):
    key = K.check_key(key)
    t0 = time.time()
    steps = [
        ('配音', lambda: cmd_voice(cfg, key)),
        ('体检稿子', lambda: cmd_lint(cfg, [key])),
        ('渲染', lambda: cmd_render(cfg, key)),
        ('混音', lambda: cmd_audio(cfg, key)),
        ('合成', lambda: cmd_mux(cfg, key)),
        ('成片体检', lambda: check_mod.report(cfg, key)),
    ]
    for i, (title, fn) in enumerate(steps, 1):
        _step(i, len(steps), title)
        res = fn()
        if title == '成片体检' and not res.get('ok'):
            raise K.KitError('成片体检没通过', '看上面的表和 review\\check_' + key + '.md')
    K.head('全流程完成')
    K.log(f'总共 {(time.time() - t0) / 60:.1f} 分钟')
    K.log(f'成品：{K.out_dir(cfg) / str(K.scalar_for(cfg, key, "videos"))}')


# ───────── 命令行 ─────────
def build_parser():
    p = argparse.ArgumentParser(prog='film', description='片场驱动：一条命令开新片，几条固定命令跑完全程。')
    sub = p.add_subparsers(dest='cmd')
    sub.add_parser('lint', help='体检稿子（不渲染）')
    for name, helptext in (('voice', '配音 + 时间表'), ('audio', '配乐→音效→混音'), ('mux', '合成到成品目录'),
                           ('check', '成片体检'), ('all', '全流程')):
        sp = sub.add_parser(name, help=helptext)
        sp.add_argument('key', nargs='?', default='zh', help='zh（正片，默认）或 short（竖屏短版）')
    sp = sub.add_parser('stills', help='抽指定秒数的静帧')
    sp.add_argument('comp', help='合成名，例如 FilmZh')
    sp.add_argument('secs', nargs='+', type=float, help='秒数，可写多个（一次传上百个也行，会自动分批）')
    sp.add_argument('--batch', type=int, default=None, metavar='张数',
                    help=f'每批渲多少张，默认 {STILLS_BATCH}；写 0 表示不分批')
    for name, helptext in (('review', '按稿子自动选时间点抽帧 + 写 index.md'), ('probe', '自动排版体检')):
        sp = sub.add_parser(name, help=helptext)
        sp.add_argument('key', nargs='?', default='zh')
        sp.add_argument('--round', dest='rnd', default='', help='轮次目录名，默认按时间')
        sp.add_argument('--only', default='', help='只做这些章节，逗号分隔')
        sp.add_argument('--at', action='append', default=[], metavar='秒数',
                        help='另外再抽这些秒数；可写多个 --at，也可以 --at 3,8,12.5')
        sp.add_argument('--every', type=float, default=None, metavar='秒数',
                        help='按固定间隔取点（看运动用），例如 --every 0.15')
        sp.add_argument('--from', dest='t_from', type=float, default=None,
                        help='配合 --every：从这个秒数开始（不写就从 0）')
        sp.add_argument('--to', dest='t_to', type=float, default=None,
                        help='配合 --every：到这个秒数为止（不写就到片尾）')
        if name == 'review':
            sp.add_argument('--batch', type=int, default=None, metavar='张数',
                            help=f'每批渲多少张，默认 {STILLS_BATCH}；写 0 表示不分批')
    sp = sub.add_parser('render', help='分段渲染无声画面')
    sp.add_argument('key', nargs='?', default='zh')
    sp.add_argument('--from', dest='t_from', type=float, default=None, help='只重渲从这个秒数开始的段')
    sp.add_argument('--to', dest='t_to', type=float, default=None, help='只重渲到这个秒数为止的段')
    sp.add_argument('--fresh', action='store_true', help='删掉已渲好的段，整片重渲（改了画面代码之后用）')
    sp = sub.add_parser('art', help='把 art\\raw 的原图处理成片中素材')
    sp.add_argument('names', nargs='*', help='只处理这些（文件名不带扩展名）；不写就处理所有比产物新的')
    sp = sub.add_parser('clip', help='切一段审看片段')
    sp.add_argument('key', nargs='?', default='zh')
    sp.add_argument('t0', type=float, help='起秒数')
    sp.add_argument('t1', type=float, help='止秒数')
    sp.add_argument('--audio-only', action='store_true', help='只要音频（mp3），给审听用')
    sub.add_parser('status', help='各步产物状态')
    return p


def _parse_at(raw) -> list[float]:
    """--at 的秒数：可以写多个 --at 3 --at 8，也可以 --at 3,8,12.5（中英文逗号、空格都认）。"""
    out = []
    for chunk in raw or []:
        for piece in re.split(r'[,，\s]+', str(chunk)):
            piece = piece.strip()
            if not piece:
                continue
            try:
                out.append(float(piece))
            except ValueError:
                K.die(f'--at 里有个值看不懂：{piece}', '写秒数，例如 --at 3 --at 8,12.5。')
    return out


def main(argv=None):
    K.setup_stdout()
    args = build_parser().parse_args(argv)
    if not args.cmd:
        build_parser().print_help()
        return 0
    cfg = K.load()
    only = {x.strip() for x in args.only.split(',') if x.strip()} if getattr(args, 'only', '') else None
    try:
        # film.json 的 versions 没开的版本，任何命令都在这里拦下来：
        # 「.\film.cmd xxx short」直接说「这部片子的 film.json 没有开短版」，不会白跑一半。
        if getattr(args, 'key', None):
            K.check_key(args.key, cfg)
        if args.cmd == 'lint':
            cmd_lint(cfg)
        elif args.cmd == 'voice':
            cmd_voice(cfg, args.key)
        elif args.cmd == 'stills':
            cmd_stills(cfg, args.comp, args.secs, args.batch)
        elif args.cmd == 'review':
            cmd_review(cfg, args.key, args.rnd or None, only, _parse_at(args.at),
                       args.every, args.t_from, args.t_to, args.batch)
        elif args.cmd == 'probe':
            cmd_probe(cfg, args.key, args.rnd or None, only, _parse_at(args.at),
                      args.every, args.t_from, args.t_to)
        elif args.cmd == 'render':
            cmd_render(cfg, args.key, args.t_from, args.t_to, getattr(args, 'fresh', False))
        elif args.cmd == 'audio':
            cmd_audio(cfg, args.key)
        elif args.cmd == 'mux':
            cmd_mux(cfg, args.key)
        elif args.cmd == 'check':
            check_mod.report(cfg, args.key)
        elif args.cmd == 'art':
            art_mod.run(cfg, args.names)
        elif args.cmd == 'clip':
            cmd_clip(cfg, args.key, args.t0, args.t1, args.audio_only)
        elif args.cmd == 'status':
            cmd_status(cfg)
        elif args.cmd == 'all':
            cmd_all(cfg, args.key)
        else:
            build_parser().print_help()
            return 1
    except K.KitError as ex:
        print('', flush=True)
        print(f'✗ {ex.msg}', flush=True)
        if ex.hint:
            print(f'  怎么办：{ex.hint}', flush=True)
        return 2
    except KeyboardInterrupt:
        print('\n✗ 被中断（Ctrl+C）。已经做完的步骤不会白做，重跑同一条命令会接着来。', flush=True)
        return 130
    return 0


if __name__ == '__main__':
    sys.exit(main())
