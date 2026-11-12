"""生成片场的纸纹理：assets/tex/paper.png 和 specks0~2.png（kit/overlay.tsx 的纸感底和纸面脏点）。

纯程序噪点（numpy + scipy），固定随机种子，输出逐字节可复现：这四张图就是用这段代码生成的，
随本项目一起授权，不涉及第三方素材。

用法：<片场>\\.venv\\Scripts\\python.exe tools\\make_textures.py [输出目录]   （默认 assets\\tex）
"""
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

out = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).resolve().parents[1] / 'assets' / 'tex')
os.makedirs(out, exist_ok=True)
W, H = 1920, 1080
rng = np.random.default_rng(7)
paper = np.array([244, 235, 220], np.float32)
fib = ndi.gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), (0.6, 2.4))
fib2 = ndi.gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), (2.4, 0.6))
blot = ndi.gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), 90)
blot = blot / np.abs(blot).max()
tone = 1 + fib / np.abs(fib).max() * 0.018 + fib2 / np.abs(fib2).max() * 0.018 + blot * 0.016
img = np.clip(paper[None, None] * tone[..., None], 0, 255).astype(np.uint8)
Image.fromarray(img).save(os.path.join(out, 'paper.png'))

for k in range(3):
    r = np.random.default_rng(100 + k)
    sp = (r.random((H, W)) > 0.9965).astype(np.float32)
    sp = ndi.gaussian_filter(sp, 0.55) * 2.2
    big = (r.random((H, W)) > 0.99994).astype(np.float32)
    big = np.clip(ndi.gaussian_filter(big, 1.3) * 9, 0, 1)
    a = np.clip(sp * 0.55 + big * 0.7, 0, 0.8)
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = paper.astype(np.uint8)
    rgba[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'specks{k}.png'), compress_level=3)

print(f'纸纹理已写到 {out}')
