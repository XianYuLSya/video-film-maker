"""音效轨：把画面代码导出的音效清单混成一条 sfx_<键>.wav。

清单由 film/scripts/sfxlist.mjs 从画面代码里导出（和画面用的是同一份时间），
这里按每条音效的能量峰对齐画面上那一下。LIB 必须和 film/src/kit/sfx.tsx 的 LIB 一致：
左边是画面代码写的音效名，右边是（文件名, 能量峰在文件里的秒数, 默认音量）。
"""
from __future__ import annotations

import numpy as np

from vo import common as K

LIB = {
    'click': ('ui-click-tone', 0.0, 0.5), 'tap': ('switch-tap', 0.0, 0.32), 'select': ('ui-select-click', 0.0, 0.35),
    'option': ('ui-option-select', 0.12, 0.22), 'pop': ('pop', 0.035, 0.28), 'msg': ('ui-message-pop', 0.055, 0.5),
    'popup': ('ui-popup-dry', 0.13, 0.4), 'ok': ('ui-success-soft', 0.26, 0.3), 'chime': ('chime-crystal', 0.225, 0.32),
    'confirm': ('ui-confirm-tone', 0.005, 0.22), 'key': ('typewriter-hit-soft', 0.14, 0.32),
    'marker': ('marker-pen-line', 0.02, 0.28),
    'swoosh': ('swoosh-quick', 0.275, 0.3), 'whoosh': ('whoosh-fast', 0.72, 0.32), 'soft': ('transition-soft', 0.45, 0.32),
    'air': ('air-woosh-quick', 0.225, 0.26), 'sweep': ('sweep-short', 0.46, 0.4), 'page': ('paper-page-turn', 0.14, 0.9),
    'slide': ('paper-slide', 0.355, 0.35), 'staple': ('paper-staple', 0.115, 0.22),
    'lock': ('gear-lock-metallic', 0.225, 0.42),
    'lockq': ('lock-quick', 0.01, 0.25), 'tick': ('clock-tick-single', 0.49, 0.9), 'knob': ('clock-knob-spin', 0.105, 1.0),
    'sparkle': ('sparkle-touch', 0.475, 0.35), 'poof': ('sparkle-poof-hit', 0.09, 0.28),
    'shimmer': ('shimmer-sparkle-sweep', 0.91, 0.26),
    'stamp': ('hit-weak', 0.145, 0.45), 'zoom': ('impact-zoom-quick', 0.51, 0.25), 'bass': ('bass-hit-short', 0.085, 0.3),
    'zin': ('ui-zoom-in', 0.425, 0.8), 'zout': ('ui-zoom-out', 0.32, 0.7), 'scan': ('data-scan', 0.125, 0.18),
    'rewind': ('reel-rewind', 0.31, 0.22),
}


def run(cfg: dict, key: str) -> dict:
    key = K.check_key(key, cfg)
    tm = K.load_timing(key)
    events_path = K.sfx_events(cfg, key)
    events = K.read_json(events_path, f'音效清单 sfx_events_{key}.json')
    n = int((tm['total'] + 0.5) * K.SR)
    sfx_dir = K.FILM / 'public' / 'sfx'
    cache = {}
    hint = ('音效文件不随片场分发：照' + K.ASSETS_DOC + '把音效放进片场 local\\sfx\\，'
            f'再跑 tools\\new_film.py --fill "{K.WORK}" 拷进 film\\public\\sfx\\。')
    if events:
        need = sorted({'keyboard' if 'typing' in ev else LIB[ev['k']][0] for ev in events if 'typing' in ev or ev.get('k') in LIB})
        lack = [n for n in need if not (sfx_dir / f'{n}.mp3').exists()]
        if lack:
            K.die(f'film\\public\\sfx 里缺 {len(lack)} 个音效：{"、".join(f"{n}.mp3" for n in lack)}', hint)

    def load(name):
        if name not in cache:
            p = sfx_dir / f'{name}.mp3'
            if not p.exists():
                K.die(f'音效文件不存在：{p}', hint)
            r = K.run([K.which('ffmpeg'), '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '2',
                       '-ar', str(K.SR), '-'], quiet=True)
            cache[name] = np.frombuffer(r.stdout, np.float32).reshape(-1, 2).astype(np.float64)
        return cache[name]

    out = np.zeros((n, 2))
    for ev in events:
        at = float(ev['at'])
        if 'typing' in ev:
            kb = load('keyboard')
            dur = max(0.25, float(ev['typing']))
            off = int(((abs(np.sin(at * 12.9898)) * 43758.5453) % 1) * 12 * K.SR)
            seg = kb[off:off + int(dur * K.SR)].copy()
            if not len(seg):
                continue
            fi, fo = min(len(seg), int(0.1 * K.SR)), min(len(seg), int(0.13 * K.SR))
            seg[:fi] *= np.linspace(0, 1, fi)[:, None]
            seg[-fo:] *= np.linspace(1, 0, fo)[:, None]
            seg *= float(ev.get('vol', 0.2))
            a = int(at * K.SR)
        else:
            k = ev.get('k')
            if k not in LIB:
                K.die(f'音效清单里有个名字「{k}」不在音效表里',
                      f'kit/sfx.tsx 加了新音效就要在 vo/sfx.py 的 LIB 里也加一条（现有：{len(LIB)} 个）。')
            name, peak, vol = LIB[k]
            seg = load(name) * float(ev.get('vol', vol))
            a = int(round((at - peak) * K.SR))
            if a < 0:
                seg = seg[-a:]
                a = 0
        m = min(len(seg), n - a)
        if m > 0:
            out[a:a + m] += seg[:m]

    dst = K.sfx_wav(cfg, key)
    K.run_stdin([K.which('ffmpeg'), '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-i', '-',
                 '-c:a', 'pcm_f32le', str(dst)], out.astype(np.float32).tobytes())
    peak = 20 * np.log10(np.abs(out).max() + 1e-12)
    K.log(f'音效 {key}：{len(events)} 条，峰值 {peak:.2f} dBFS')
    return {'events': len(events), 'peak': peak, 'out': str(dst)}


if __name__ == '__main__':
    import sys
    K.setup_stdout()
    cfg = K.load()
    run(cfg, sys.argv[1] if len(sys.argv) > 1 else 'zh')
