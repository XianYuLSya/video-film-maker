"""成片体检：解码、规格、时长对时间表、响度、真峰值、字幕条数与宽度。

结果打成一张「项目｜期望｜实际｜是否通过」的表，同时写 review/check_<键>.md。
凡是「错」的都进表格最后一行汇总，退出码由 film.py 决定（有错就非 0）。
"""
from __future__ import annotations

import re
from pathlib import Path

from vo import common as K


def _row(rows, name, expect, actual, ok, note=''):
    rows.append({'name': name, 'expect': expect, 'actual': actual, 'ok': ok, 'note': note})


def _vis_width(text: str) -> float:
    """一条字幕的显示宽度：汉字 1，英文字母/数字 0.55。"""
    return sum(0.55 if ord(ch) < 128 else 1 for ch in text)


def _parse_srt(path: Path):
    """读出 SRT 的每条（起, 止, 文本）。"""
    raw = path.read_text(encoding='utf-8-sig', errors='replace')
    blocks = re.split(r'\r?\n\r?\n', raw.strip())
    out = []
    for b in blocks:
        lines = [x for x in b.splitlines() if x.strip()]
        if len(lines) < 2:
            continue
        m = re.match(r'(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)', lines[1])
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        a = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
        b2 = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
        out.append((a, b2, ' '.join(lines[2:])))
    return out


def run(cfg: dict, key: str) -> dict:
    key = K.check_key(key, cfg)
    exp = K.profile(cfg, key, 'expect')
    tm = K.load_timing(key)
    total = float(tm['total'])
    want_lufs = float(cfg['audio']['lufs'])
    tol = float(cfg['audio']['lufsTol'])
    want_peak = float(cfg['audio']['truePeak'])
    sub_max = float(K.scalar_for(cfg, key, 'submax') or 17)

    video = K.out_dir(cfg) / str(K.scalar_for(cfg, key, 'videos'))
    srt = K.out_dir(cfg) / str(K.scalar_for(cfg, key, 'srts'))
    rows: list[dict] = []

    _row(rows, '成片文件', str(video.name), '存在' if video.exists() else '不存在', video.exists())
    if video.exists():
        info = K.video_info(video)
        errs = K.decode_errors(video)
        _row(rows, '完整解码', '无错误', '无错误' if not errs else errs.splitlines()[0][:60], not errs,
             note='' if not errs else errs)
        _row(rows, '分辨率', f'{exp["width"]}×{exp["height"]}', f'{info["width"]}×{info["height"]}',
             info['width'] == exp['width'] and info['height'] == exp['height'])
        _row(rows, '帧率', f'{exp["fps"]:g} fps', f'{info["fps"]:g} fps', abs(info['fps'] - exp['fps']) < 0.01)
        _row(rows, '视频编码', 'h264', str(info['vcodec']), info['vcodec'] == 'h264')
        _row(rows, '音频编码', 'aac / 48000 Hz / 2 声道',
             f'{info["acodec"]} / {info["sample_rate"]} Hz / {info["channels"]} 声道',
             info['acodec'] == 'aac' and str(info['sample_rate']) == '48000' and info['channels'] == 2)
        diff = info['duration'] - total
        _row(rows, '片长 vs 时间表', f'{total:.2f}s ± 0.10', f'{info["duration"]:.2f}s（差 {diff:+.2f}s）',
             abs(diff) <= 0.1)
        st = K.audio_stats(video)
        _row(rows, '整体响度', f'{want_lufs:.1f} ± {tol:.1f} LUFS',
             '量不出' if st['lufs'] is None else f'{st["lufs"]:.1f} LUFS',
             st['lufs'] is not None and abs(st['lufs'] - want_lufs) <= tol)
        _row(rows, '真峰值', f'≤ {want_peak:.1f} dBTP',
             '量不出' if st['peak'] is None else f'{st["peak"]:.1f} dBFS',
             st['peak'] is not None and st['peak'] <= want_peak + 0.05)
        # 音轨不能是静音：合成时选错音轨（渲染出的画面自带一条静音轨）成片就是哑的，光看响度那一行容易漏
        streams = K.ffprobe_json(video, 'stream=index,codec_type').get('streams', [])
        n_audio = sum(1 for s in streams if s.get('codec_type') == 'audio')
        r = K.run([K.which('ffmpeg'), '-v', 'info', '-i', str(video), '-map', '0:a:0', '-af', 'volumedetect',
                   '-f', 'null', '-'], quiet=True)
        m = re.search(r'mean_volume:\s*(-?[\d.]+|-inf)\s*dB', r.out)
        mean = None if not m or m.group(1) == '-inf' else float(m.group(1))
        _row(rows, '音轨不是静音', '只有 1 条音轨，平均音量 > -50 dB',
             f'{n_audio} 条音轨，平均 ' + ('静音' if mean is None else f'{mean:.1f} dB'),
             n_audio == 1 and mean is not None and mean > -50)
    else:
        K.warn(f'没有成片，下面几项跳过：{video}')

    _row(rows, '字幕文件', str(srt.name), '存在' if srt.exists() else '不存在', srt.exists())
    if srt.exists():
        cues = _parse_srt(srt)
        want_n = sum(len(it.get('subs', [])) for it in tm['items'] if it['kind'] == 'line')
        _row(rows, '字幕条数', str(want_n), str(len(cues)), len(cues) == want_n)
        last = max((b for _, b, _ in cues), default=0.0)
        _row(rows, '末条字幕结束', f'≤ 片长 {total:.2f}s', f'{last:.2f}s', last <= total + 0.05)
        over = [(i + 1, _vis_width(t), t) for i, (_, _, t) in enumerate(cues) if _vis_width(t) > sub_max]
        _row(rows, '单条字幕宽度', f'≤ {sub_max:g}',
             '全部合规' if not over else f'{len(over)} 条超了（第 {"、".join(str(x[0]) for x in over[:5])} 条）',
             not over, note='\n'.join(f'  第 {i} 条 {w:.1f}：{t}' for i, w, t in over[:10]))
        bad_order = [i + 1 for i in range(len(cues) - 1) if cues[i][1] > cues[i + 1][0] + 0.001]
        _row(rows, '字幕时间顺序', '不重叠、不倒序', '正常' if not bad_order else f'第 {bad_order[:5]} 条有问题',
             not bad_order)

    ok = all(r['ok'] for r in rows)
    return {'rows': rows, 'ok': ok, 'video': str(video), 'srt': str(srt)}


def table(rows) -> str:
    """项目｜期望｜实际｜是否通过，中文字符按两格宽对齐。"""
    def w(s):
        return sum(2 if ord(ch) > 127 else 1 for ch in s)

    def pad(s, n):
        return s + ' ' * max(0, n - w(s))

    head = ['项目', '期望', '实际', '是否通过']
    data = [[r['name'], r['expect'], r['actual'], '通过' if r['ok'] else '不通过'] for r in rows]
    widths = [max(w(str(x[i])) for x in [head] + data) for i in range(4)]
    out = ['│ ' + ' │ '.join(pad(str(head[i]), widths[i]) for i in range(4)) + ' │',
           '├' + '┼'.join('─' * (widths[i] + 2) for i in range(4)) + '┤']
    for d in data:
        out.append('│ ' + ' │ '.join(pad(str(d[i]), widths[i]) for i in range(4)) + ' │')
    notes = [r for r in rows if r.get('note')]
    if notes:
        out.append('')
        for r in notes:
            out.append(f'{r["name"]} 细节：')
            out.append(r['note'])
    return '\n'.join(out)


def report(cfg: dict, key: str) -> dict:
    res = run(cfg, key)
    K.head(f'成片体检 {key}')
    print(table(res['rows']), flush=True)
    bad = [r['name'] for r in res['rows'] if not r['ok']]
    md = Path(K.review_dir(cfg)) / f'check_{key}.md'
    md.parent.mkdir(parents=True, exist_ok=True)
    verdict = '全部通过' if res['ok'] else '不通过：' + '、'.join(bad)
    lines = [f'# 成片体检 · {key}', '',
             f'- 成片：`{res["video"]}`', f'- 字幕：`{res["srt"]}`',
             f'- 结论：{verdict}', '',
             '| 项目 | 期望 | 实际 | 是否通过 |', '|---|---|---|---|']
    for r in res['rows']:
        lines.append(f'| {r["name"]} | {r["expect"]} | {r["actual"]} | {"通过" if r["ok"] else "**不通过**"} |')
    for r in res['rows']:
        if r.get('note'):
            lines += ['', f'**{r["name"]} 细节**', '', '```', r['note'], '```']
    md.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    K.log(f'体检表已写入 {md}')
    res['md'] = str(md)
    K.log('结论：' + ('全部通过' if res['ok'] else '不通过 —— ' + '、'.join(bad)))
    return res


if __name__ == '__main__':
    import sys
    K.setup_stdout()
    cfg = K.load()
    report(cfg, sys.argv[1] if len(sys.argv) > 1 else 'zh')
