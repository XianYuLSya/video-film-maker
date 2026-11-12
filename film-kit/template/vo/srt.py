"""从时间表生成字幕（.srt，UTF-8 带 BOM，剪辑软件和播放器都认）。

时间表里每条字幕的起止已经由 voice 算好，这里只负责排版和写文件。
"""
from __future__ import annotations

from pathlib import Path

from vo import common as K


def _ts(t: float) -> str:
    t = max(0.0, float(t))
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    ms = int(round((s - int(s)) * 1000))
    if ms >= 1000:
        s += 1
        ms -= 1000
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d},{ms:03d}'


def cues(cfg: dict, key: str) -> list[tuple[float, float, str]]:
    tm = K.load_timing(key)
    return [(s['s'], s['e'], s['t']) for it in tm['items'] if it['kind'] == 'line' for s in it.get('subs', [])]


def write(cfg: dict, key: str, out_path) -> int:
    key = K.check_key(key, cfg)
    data = cues(cfg, key)
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for i, (a, b, txt) in enumerate(data, 1):
        lines += [str(i), f'{_ts(a)} --> {_ts(b)}', txt, '']
    out_path.write_text('\n'.join(lines), encoding='utf-8-sig')
    K.log(f'字幕：{out_path.name}，{len(data)} 条')
    return len(data)


if __name__ == '__main__':
    import sys
    K.setup_stdout()
    cfg = K.load()
    key = sys.argv[1] if len(sys.argv) > 1 else 'zh'
    target = sys.argv[2] if len(sys.argv) > 2 else str(K.out_dir(cfg) / K.scalar_for(cfg, key, 'srts'))
    write(cfg, key, target)
