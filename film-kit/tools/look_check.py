"""看片体检：量一批静帧够不够亮，再拼一张「手机上看是什么样」的小图。

「整体偏暗、手机上看不清」是深色界面产品片最常见的毛病，而且做的人自己最不容易发现
（显示器亮、屋里暗、盯久了眼睛适应）。所以每一轮抽帧之后跑一遍这个，用数字说话。

用法（片场的 Python）：
    film-kit\\.venv\\Scripts\\python.exe film-kit\\tools\\look_check.py <图片或目录> [更多图片或目录…]
        [--out 手机视角.jpg] [--phone 390] [--cols 3] [--light 文件名里含这个词的按亮场判]

量什么（亮度按 Rec.709 算，0–100）：
    平均亮度   整幅画面的平均。暗场镜头低于 9 就是偏暗，低于 6 手机上基本看不清
    死黑占比   亮度低于 4 的像素占多少。超过 60% 说明画面大半是黑的
    亮部       第 99 百分位的亮度（最亮的那 1% 像素，通常是字和强调色）。低于 40 说明连最亮的地方都发灰
    主体亮度   画面中间 60% 区域的平均（主角通常在这里）
亮场镜头（文件名带 --light 指定的词，或平均亮度本来就高于 50）只查「是不是过曝」。

返回码：有「偏暗」的帧返回 2，方便接进流水线；全部合格返回 0。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

EXTS = {'.png', '.jpg', '.jpeg', '.webp'}


def luma_of(img: Image.Image) -> np.ndarray:
    a = np.asarray(img.convert('RGB'), dtype=np.float32) / 255.0
    return (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]) * 100.0


def measure(path: Path) -> dict:
    img = Image.open(path)
    y = luma_of(img)
    h, w = y.shape
    core = y[int(h * 0.2):int(h * 0.8), int(w * 0.2):int(w * 0.8)]
    return {
        'name': path.name,
        'mean': float(y.mean()),
        'black': float((y < 4).mean() * 100),
        'p95': float(np.percentile(y, 99)),
        'core': float(core.mean()),
        'size': (w, h),
    }


def judge(m: dict, light: bool) -> list[str]:
    notes = []
    if light or m['mean'] > 50:
        if m['p95'] > 99.5 and m['mean'] > 92:
            notes.append('过曝：亮场几乎全白')
        return notes
    if m['mean'] < 6:
        notes.append('太暗：平均亮度不到 6，手机上基本看不清')
    elif m['mean'] < 9:
        notes.append('偏暗：平均亮度不到 9')
    if m['black'] > 60:
        notes.append(f'死黑占了 {m["black"]:.0f}%')
    if m['p95'] < 40:
        notes.append('亮部发灰：最亮的字和色块都不够亮')
    if m['core'] < 8:
        notes.append('画面中间偏暗：主角所在的地方不够亮')
    return notes


def phone_sheet(paths: list[Path], out: Path, phone_w: int, cols: int):
    """把每张图缩到手机竖持时的显示宽度（默认 390 px），拼成一张。缩完还读得清的字，手机上才读得清。"""
    thumbs = []
    for p in paths:
        im = Image.open(p).convert('RGB')
        th = im.resize((phone_w, round(im.height * phone_w / im.width)), Image.LANCZOS)
        thumbs.append(th)
    if not thumbs:
        return
    cols = max(1, min(cols, len(thumbs)))
    rows = (len(thumbs) + cols - 1) // cols
    gap = 12
    cell_h = max(t.height for t in thumbs)
    sheet = Image.new('RGB', (cols * phone_w + (cols + 1) * gap, rows * cell_h + (rows + 1) * gap), (128, 128, 128))
    for i, t in enumerate(thumbs):
        x = gap + (i % cols) * (phone_w + gap)
        y = gap + (i // cols) * (cell_h + gap)
        sheet.paste(t, (x, y))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=92)


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    ap = argparse.ArgumentParser(description='看片体检：亮度 + 手机视角')
    ap.add_argument('inputs', nargs='+')
    ap.add_argument('--out', default='')
    ap.add_argument('--phone', type=int, default=390)
    ap.add_argument('--cols', type=int, default=3)
    ap.add_argument('--light', action='append', default=[], help='文件名里含这个词的帧按亮场判（可重复）')
    a = ap.parse_args()

    paths: list[Path] = []
    for raw in a.inputs:
        p = Path(raw)
        if p.is_dir():
            paths += sorted(q for q in p.iterdir() if q.suffix.lower() in EXTS and not q.name.startswith('_'))
        elif p.exists():
            paths.append(p)
        else:
            print(f'! 找不到 {raw}')
    if not paths:
        print('✗ 没有可量的图片')
        sys.exit(1)

    bad = 0
    print(f'{"平均":>6} {"主体":>6} {"亮部":>6} {"死黑%":>6}  文件')
    for p in paths:
        m = measure(p)
        notes = judge(m, any(k in p.name for k in a.light))
        if any(n.startswith(('太暗', '偏暗')) for n in notes):
            bad += 1
        flag = ('  ← ' + '；'.join(notes)) if notes else ''
        print(f'{m["mean"]:6.1f} {m["core"]:6.1f} {m["p95"]:6.1f} {m["black"]:6.1f}  {m["name"]}{flag}')
    out = Path(a.out) if a.out else paths[0].parent / '_手机视角.jpg'
    phone_sheet(paths, out, a.phone, a.cols)
    print(f'手机视角 → {out}（每张缩到 {a.phone}px 宽；这张图上读不清的字，手机上就读不清）')
    sys.exit(2 if bad else 0)


if __name__ == '__main__':
    main()
