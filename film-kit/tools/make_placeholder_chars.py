"""生成占位角色图（assets\char 和 template\film\public\char 里的那一套）。

仓库不带任何频道的角色形象。这里画的是一个中性的占位小人：每个姿势一张、三帧轻微抖动，
文件名和尺寸跟画面代码里的姿势表（kit\overlay.tsx 的 POSES）对得上，模板拿到手就能渲。
做自己的片子时，把这些图换成你自己的角色（同名、透明底 PNG），不用改代码。

用法：python tools\make_placeholder_chars.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

KIT = Path(__file__).resolve().parent.parent
FONT = KIT / 'assets' / 'fonts' / 'NotoSansSC-VF.ttf'
OUT = [KIT / 'assets' / 'char', KIT / 'template' / 'film' / 'public' / 'char']
POSES = {
    'explore': 735, 'face_shock': 783, 'face_smug': 778, 'fish_happy': 995, 'flip': 715, 'peek': 690,
    'point': 578, 'read': 581, 'think': 606, 'toolbox': 461, 'victory': 520, 'wave': 449,
}
H = 760
INK = (42, 47, 69, 255)
FILL = (214, 219, 230, 255)
WHITE = (255, 255, 255, 255)
JIT = [(0, 0), (2, -1), (-1, 2)]


def draw(pose: str, w: int, k: int) -> Image.Image:
    im = Image.new('RGBA', (w, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dx, dy = JIT[k]
    cx = w // 2 + dx
    r = min(150, w // 2 - 40)                      # 头
    head = (cx - r, 40 + dy, cx + r, 40 + 2 * r + dy)
    bw = min(190, w // 2 - 24)                     # 身体
    body = (cx - bw, 40 + 2 * r - 20 + dy, cx + bw, H - 30 + dy)
    # 白色贴纸边
    d.rounded_rectangle([body[0] - 12, body[1] - 12, body[2] + 12, body[3] + 12], radius=bw + 12, fill=WHITE)
    d.ellipse([head[0] - 12, head[1] - 12, head[2] + 12, head[3] + 12], fill=WHITE)
    d.rounded_rectangle(body, radius=bw, fill=FILL, outline=INK, width=7)
    d.ellipse(head, fill=FILL, outline=INK, width=7)
    f1 = ImageFont.truetype(str(FONT), 46)
    f2 = ImageFont.truetype(str(FONT), 34)
    for font in (f1, f2):
        try:
            font.set_variation_by_axes([700])
        except Exception:
            pass
    cy = (body[1] + body[3]) // 2
    d.text((cx, cy - 34), '占位角色', font=f1, fill=INK, anchor='mm')
    d.text((cx, cy + 30), pose, font=f2, fill=INK, anchor='mm')
    return im


def main() -> None:
    for out in OUT:
        out.mkdir(parents=True, exist_ok=True)
        for pose, w in POSES.items():
            for k in range(3):
                draw(pose, w, k).save(out / f'{pose}_c{k}.png')
    print(f'已生成 {len(POSES) * 3} 张占位图 × {len(OUT)} 处')


if __name__ == '__main__':
    main()
