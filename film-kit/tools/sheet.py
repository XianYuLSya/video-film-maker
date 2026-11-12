"""拼图工具：审产品片时把一批帧拼在一起看。你看不了连续播放，拼图就是你的「回放」。

用片场的 Python 跑：film-kit\\.venv\\Scripts\\python.exe film-kit\\tools\\sheet.py <子命令> …

    grid  <目录或若干图片> --out 全片.jpg [--cols 6] [--width 480] [--label]
          把一批帧按文件名顺序拼成一张（全片连看、连续抽帧看运动）。--label 在每格角上写文件名里的秒数。

    video <成片.mp4> --out 全片.jpg [--every 0.5] [--from 0 --to 10] [--cols 8] [--width 480]
          直接从成片里按间隔抽帧再拼（成片体检用；要 ffmpeg）。--every 0.07 配 --from/--to 看一个接缝。

    crop  <图片> --rect x,y,w,h --out 裁切.png [--scale 1]
          按 100% 裁一块出来看文字锐不锐（缩略图上看不出字糊不糊）。可以给多张图，拼成一排。

    pair  <左图或目录> <右图或目录> --out 并排.jpg [--left 名字 --right 名字] [--width 960]
          左右并排：和通过的风格帧比、和参照片比。给目录时按文件名顺序一一配对，上下排开。
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EXTS = {'.png', '.jpg', '.jpeg', '.webp'}
KIT = Path(__file__).resolve().parents[1]


def font(size: int):
    for cand in (KIT / 'assets' / 'fonts' / 'NotoSansSC-VF.ttf', Path('C:/Windows/Fonts/msyh.ttc')):
        if cand.exists():
            try:
                return ImageFont.truetype(str(cand), size)
            except Exception:
                pass
    return ImageFont.load_default()


def collect(inputs) -> list[Path]:
    out: list[Path] = []
    for raw in inputs:
        p = Path(raw)
        if p.is_dir():
            out += sorted(q for q in p.iterdir() if q.suffix.lower() in EXTS and not q.name.startswith('_'))
        elif p.exists():
            out.append(p)
        else:
            print(f'! 找不到 {raw}')
    return out


def sec_of(name: str) -> str:
    m = re.search(r'(\d+\.\d+)', name)
    return f'{float(m.group(1)):.2f}s' if m else Path(name).stem[:14]


def grid(paths: list[Path], out: Path, cols: int, width: int, label: bool, names: list[str] | None = None):
    if not paths:
        sys.exit('✗ 没有图片可拼')
    thumbs = []
    for p in paths:
        im = Image.open(p).convert('RGB')
        thumbs.append(im.resize((width, round(im.height * width / im.width)), Image.LANCZOS))
    cols = max(1, min(cols, len(thumbs)))
    rows = (len(thumbs) + cols - 1) // cols
    gap = 6
    ch = max(t.height for t in thumbs)
    sheet = Image.new('RGB', (cols * width + (cols + 1) * gap, rows * ch + (rows + 1) * gap), (40, 42, 46))
    d = ImageDraw.Draw(sheet)
    f = font(max(14, width // 26))
    for i, t in enumerate(thumbs):
        x = gap + (i % cols) * (width + gap)
        y = gap + (i // cols) * (ch + gap)
        sheet.paste(t, (x, y))
        if label:
            text = names[i] if names else sec_of(paths[i].name)
            d.rectangle((x, y, x + f.getlength(text) + 12, y + f.size + 8), fill=(0, 0, 0))
            d.text((x + 6, y + 2), text, font=f, fill=(255, 255, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=90)
    print(f'拼图 → {out}（{len(thumbs)} 张，{cols} 列）')


def cmd_video(a):
    video = Path(a.video)
    if not video.exists():
        sys.exit(f'✗ 找不到成片 {video}')
    tmp = Path(tempfile.mkdtemp(prefix='sheet-'))
    t0 = a.t_from or 0.0
    args = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0}', '-i', str(video)]
    if a.t_to is not None:
        args += ['-t', f'{a.t_to - t0}']
    args += ['-vf', f'fps=1/{a.every},scale={a.width}:-2', str(tmp / 'f_%05d.png')]
    r = subprocess.run(args, capture_output=True)
    if r.returncode != 0:
        sys.exit('✗ ffmpeg 抽帧失败：' + r.stderr.decode('utf-8', 'replace')[-400:])
    paths = sorted(tmp.glob('f_*.png'))
    names = [f'{t0 + i * a.every:.2f}s' for i in range(len(paths))]
    grid(paths, Path(a.out), a.cols, a.width, True, names)


def cmd_crop(a):
    x, y, w, h = (int(float(v)) for v in a.rect.split(','))
    parts = []
    for p in collect(a.inputs):
        im = Image.open(p).convert('RGB').crop((x, y, x + w, y + h))
        if a.scale != 1:
            im = im.resize((round(w * a.scale), round(h * a.scale)), Image.NEAREST)
        parts.append(im)
    if not parts:
        sys.exit('✗ 没有图片可裁')
    gap = 10
    sheet = Image.new('RGB', (sum(p.width for p in parts) + gap * (len(parts) - 1), max(p.height for p in parts)), (128, 128, 128))
    cx = 0
    for p in parts:
        sheet.paste(p, (cx, 0))
        cx += p.width + gap
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out)
    print(f'裁切 → {a.out}（{len(parts)} 张，每张 {w}×{h}，没有缩放才是 100%）')


def cmd_pair(a):
    L, R = collect([a.left_in]), collect([a.right_in])
    n = min(len(L), len(R))
    if n == 0:
        sys.exit('✗ 两边都要有图片')
    if len(L) != len(R):
        print(f'! 左边 {len(L)} 张、右边 {len(R)} 张，只配前 {n} 对')
    W = a.width
    f = font(max(18, W // 36))
    bar = f.size + 22
    rows = []
    for i in range(n):
        l = Image.open(L[i]).convert('RGB')
        r = Image.open(R[i]).convert('RGB')
        l = l.resize((W, round(l.height * W / l.width)), Image.LANCZOS)
        r = r.resize((W, round(r.height * W / r.width)), Image.LANCZOS)
        rows.append((l, r))
    gap = 16
    height = bar + sum(max(l.height, r.height) + gap for l, r in rows)
    sheet = Image.new('RGB', (W * 2 + gap, height), (24, 26, 30))
    d = ImageDraw.Draw(sheet)
    d.text((14, 8), a.left or Path(a.left_in).name, font=f, fill=(205, 210, 216))
    d.text((W + gap + 14, 8), a.right or Path(a.right_in).name, font=f, fill=(120, 225, 170))
    y = bar
    for l, r in rows:
        sheet.paste(l, (0, y))
        sheet.paste(r, (W + gap, y))
        y += max(l.height, r.height) + gap
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out, quality=92)
    print(f'并排 → {a.out}（{n} 对）')


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    ap = argparse.ArgumentParser(description='拼图工具')
    sub = ap.add_subparsers(dest='cmd', required=True)
    g = sub.add_parser('grid')
    g.add_argument('inputs', nargs='+')
    g.add_argument('--out', required=True)
    g.add_argument('--cols', type=int, default=6)
    g.add_argument('--width', type=int, default=480)
    g.add_argument('--label', action='store_true')
    v = sub.add_parser('video')
    v.add_argument('video')
    v.add_argument('--out', required=True)
    v.add_argument('--every', type=float, default=0.5)
    v.add_argument('--from', dest='t_from', type=float, default=None)
    v.add_argument('--to', dest='t_to', type=float, default=None)
    v.add_argument('--cols', type=int, default=8)
    v.add_argument('--width', type=int, default=480)
    c = sub.add_parser('crop')
    c.add_argument('inputs', nargs='+')
    c.add_argument('--rect', required=True)
    c.add_argument('--out', required=True)
    c.add_argument('--scale', type=float, default=1)
    p = sub.add_parser('pair')
    p.add_argument('left_in')
    p.add_argument('right_in')
    p.add_argument('--out', required=True)
    p.add_argument('--left', default='')
    p.add_argument('--right', default='')
    p.add_argument('--width', type=int, default=960)
    a = ap.parse_args()
    if a.cmd == 'grid':
        grid(collect(a.inputs), Path(a.out), a.cols, a.width, a.label)
    elif a.cmd == 'video':
        cmd_video(a)
    elif a.cmd == 'crop':
        cmd_crop(a)
    else:
        cmd_pair(a)


if __name__ == '__main__':
    main()
