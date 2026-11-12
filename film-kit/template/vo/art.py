"""把画师交的原图处理成片中素材（角色贴纸 / 整张插画 / 设定图）。

规则按文件名走，不用改脚本里的映射表：
- 以 scene_ / cover / bg_ 开头，或以 _sheet 结尾 → 整张插画：只缩放，长边 1920，出 film/public/art/<名>.png
- 其余 → 角色贴纸：绿幕色键抠图 → 去孤岛 → 裁边 → 长边 1280 → 纸白描边 → 三帧抖动，
  出 film/public/art/<名>_c0..2.png
尺寸登记进 film/src/chars.json（已有条目保留，同名覆盖）。

用法：.\\film.cmd art            处理所有比产物新的原图
      .\\film.cmd art fish_work  只处理这几张（不管新旧）
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from vo import common as K

RAW = K.WORK / 'art' / 'raw'
OUT = K.FILM / 'public' / 'art'
MANI = K.FILM / 'src' / 'chars.json'
ART_MAX = 1920
SPRITE_MAX = 1280
HALO = 9
BOIL_AMP = 1.5
IMG_EXT = ('.png', '.jpg', '.jpeg', '.webp')


def _is_art(stem: str) -> bool:
    s = stem.lower()
    return s.startswith(('scene_', 'cover', 'bg_')) or s.endswith('_sheet')


def _load(p) -> np.ndarray:
    return np.asarray(Image.open(p).convert('RGBA'), np.float32) / 255


def _key_green(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = g - np.maximum(r, b)
    a = 1 - np.clip((spill - 0.10) / 0.22, 0, 1)
    rgb = rgb.copy()
    rgb[..., 1] = np.minimum(g, np.maximum(r, b) + 0.02)  # 去绿溢色
    return rgb, a


def _clean_alpha(a):
    m = a > 0.5
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.where(sizes > sizes.max() * 0.02)[0])
        a = a * ndi.binary_dilation(keep, iterations=2)
    return a


def _crop_bbox(rgba, pad):
    ys, xs = np.where(rgba[..., 3] > 0.05)
    if not len(ys):
        return rgba
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    out = np.zeros((y1 - y0 + 2 * pad, x1 - x0 + 2 * pad, 4), np.float32)
    out[pad:-pad, pad:-pad] = rgba[y0:y1, x0:x1]
    return out


def _resize(rgba, s):
    if s >= 1:
        return rgba
    h, w = rgba.shape[:2]
    pm = rgba.copy()
    pm[..., :3] *= pm[..., 3:4]
    ch = [np.asarray(Image.fromarray(np.ascontiguousarray(pm[..., i])).resize((int(w * s), int(h * s)), Image.LANCZOS))
          for i in range(4)]
    out = np.stack(ch, axis=2).astype(np.float32)
    a = np.clip(out[..., 3:4], 1e-4, 1)
    out[..., :3] = np.clip(out[..., :3] / a, 0, 1)
    out[..., 3] = np.clip(out[..., 3], 0, 1)
    return out


def _add_halo(rgba, r=HALO):
    a = rgba[..., 3]
    d = ndi.distance_transform_edt(a < 0.5)
    halo = np.clip(r + 0.5 - d, 0, 1).astype(np.float32)
    out = np.zeros_like(rgba)
    out[..., :3] = rgba[..., :3] * a[..., None] + (1 - a[..., None])
    out[..., 3] = np.maximum(a, halo)
    return out


def _boil_fields(h, w, seed):
    rng = np.random.default_rng(seed)
    f = [ndi.gaussian_filter(rng.standard_normal((h // 2 + 1, w // 2 + 1)).astype(np.float32), 13) for _ in range(2)]
    f = [np.asarray(Image.fromarray(x).resize((w, h), Image.BICUBIC)) for x in f]
    return [x / (np.abs(x).max() + 1e-6) * BOIL_AMP for x in f]


def _warp(rgba, dx, dy):
    h, w = rgba.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    pm = rgba.copy()
    pm[..., :3] *= pm[..., 3:4]
    ch = [ndi.map_coordinates(pm[..., i], [yy + dy, xx + dx], order=1, mode='constant') for i in range(4)]
    out = np.stack(ch, axis=2)
    a = np.clip(out[..., 3:4], 1e-4, 1)
    out[..., :3] = np.clip(out[..., :3] / a, 0, 1)
    return out


def _save(rgba, path):
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(path, compress_level=3)


def _sprite(src, name, mani) -> dict:
    a = _load(src)
    if a[..., 3].min() > 0.99:  # 不透明：绿幕
        rgb, al = _key_green(a[..., :3])
        a = np.dstack([rgb, al])
    else:  # 透明底：边缘收紧
        a = a.copy()
        a[..., 3] = np.clip((a[..., 3] - 0.45) / 0.35, 0, 1)
    a[..., 3] = _clean_alpha(a[..., 3])
    a = _crop_bbox(a, HALO + 4)
    a = _resize(a, min(1.0, SPRITE_MAX / max(a.shape[:2])))
    full = _add_halo(a)
    h, w = full.shape[:2]
    for k, (dx, dy) in enumerate(_boil_fields(h, w, 11 + k) for k in range(3)):
        _save(_warp(full, dx, dy), OUT / f'{name}_c{k}.png')
    mani[name] = {'w': w, 'h': h}
    return {'w': w, 'h': h, '透明占比': float((full[..., 3] < 0.5).mean())}


def _art(src, name, mani) -> dict:
    im = Image.open(src).convert('RGB')
    s = min(1.0, ART_MAX / max(im.size))
    if s < 1:
        im = im.resize((int(im.size[0] * s), int(im.size[1] * s)), Image.LANCZOS)
    im.save(OUT / f'{name}.png', compress_level=3)
    mani[name] = {'w': im.size[0], 'h': im.size[1]}
    return {'w': im.size[0], 'h': im.size[1], '透明占比': None}


def run(cfg: dict, names: list[str]) -> dict:
    if not RAW.exists():
        K.die(f'没有原图目录：{RAW}', '画师的原图放 art\\raw\\ 里，文件名按「角色名.png / scene_xxx.png / xxx_sheet.png」。')
    OUT.mkdir(parents=True, exist_ok=True)
    MANI.parent.mkdir(parents=True, exist_ok=True)
    mani = json.loads(MANI.read_text(encoding='utf-8')) if MANI.exists() else {}
    only = {n.lower() for n in names}
    raws = sorted(p for p in RAW.iterdir() if p.suffix.lower() in IMG_EXT)
    if not raws:
        K.die(f'{RAW} 里没有图片', '支持 png / jpg / webp。')
    done, skipped, sus = [], [], []
    for src in raws:
        stem = src.stem
        if only and stem.lower() not in only and stem.lower() not in {f'{n}_c{i}' for n in only for i in range(3)}:
            continue
        is_art = _is_art(stem)
        produced = [OUT / f'{stem}.png'] if is_art else [OUT / f'{stem}_c{i}.png' for i in range(3)]
        if not only and all(p.exists() and p.stat().st_mtime >= src.stat().st_mtime for p in produced):
            skipped.append(stem)
            continue
        info = (_art if is_art else _sprite)(src, stem, mani)
        kind = '插画/设定图' if is_art else '角色贴纸'
        extra = ''
        if info['透明占比'] is not None:
            extra = f'，透明 {info["透明占比"] * 100:.0f}%'
            if info['透明占比'] < 0.2 or info['透明占比'] > 0.95:
                sus.append(stem)
                extra += '  可疑，请看图确认'
        K.log(f'{src.name} → {produced[0].name}{"（三帧）" if not is_art else ""}  '
              f'{info["w"]}×{info["h"]}  {kind}{extra}')
        done.append(stem)
    MANI.write_text(json.dumps(mani, ensure_ascii=False, indent=0), encoding='utf-8')
    if skipped:
        K.log(f'跳过（产物比原图新）：{"、".join(skipped)}')
    if not done:
        K.log('没有要处理的原图')
    if sus:
        K.warn(f'这些角色贴纸透明占比异常，多半是没抠掉或抠穿了：{"、".join(sus)}')
    K.log(f'尺寸表：{MANI}')
    return {'done': done, 'skipped': skipped, 'suspect': sus, 'manifest': str(MANI)}


if __name__ == '__main__':
    import sys
    K.setup_stdout()
    cfg = K.load()
    run(cfg, sys.argv[1:])
