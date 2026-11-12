// 舞台：屏放在什么样的空间里。两种环境——暗场（默认）和亮场（全片只用一两次的反差）。
//
// 暗场不是黑场：最深处也带色相，主光打出一片看得见的光池，角落有一抹产品色的回光。
// 「整体偏暗、手机上看不清」是这类片子最常见的毛病，所以舞台默认就比界面底色亮一档，
// 屏的边缘才能从背景里分出来。成片再用 tools/look_check.py 量一遍亮度。
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {rand} from '../lib/anim';
import {safe} from './motion';
import {CineTheme, alpha, mixHex} from './theme';

export type Env = 'dark' | 'light';

export type StageProps = {
  theme: CineTheme;
  env?: Env;
  /** 主光在画面里的位置（0..1）。默认从左上方打下来 */
  keyAt?: [number, number];
  /** 主光强度 0–1.6，默认 1 */
  key?: number;
  /** 产品色回光的强度 0–1.5，默认 1；位置固定在主光的对角 */
  bounce?: number;
  /** 地面：屏下方一条极淡的地平线和反光带，给「屏立在空间里」的镜头用 */
  floor?: number;
  children?: React.ReactNode;
};

export const Stage: React.FC<StageProps> = ({theme, env = 'dark', keyAt = [0.3, 0.08], key: keyK = 1, bounce = 1, floor = 0, children}) => {
  const k = safe('Stage', 'key', keyK, 0, 1.6);
  const b = safe('Stage', 'bounce', bounce, 0, 1.5);
  const kx = keyAt[0] * 100;
  const ky = keyAt[1] * 100;
  // 回光放在主光的对角
  const bx = keyAt[0] < 0.5 ? 86 : 14;
  const cool = mixHex('#c4d6e8', theme.accent, 0.14);
  if (env === 'light') {
    return (
      <AbsoluteFill style={{background: theme.paper, overflow: 'hidden'}}>
        <AbsoluteFill
          style={{
            background:
              `radial-gradient(ellipse 64% 66% at ${kx}% ${ky}%, ${alpha('#ffffff', 0.92 * Math.min(1, k))} 0%, ${alpha('#ffffff', 0)} 72%),` +
              `linear-gradient(180deg, ${mixHex(theme.paper, '#ffffff', 0.35)} 0%, ${theme.paper} 52%, ${theme.paperDeep} 100%)`,
          }}
        />
        {children}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: theme.void, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background:
            // 主光光池：冷白里带一点产品色。中心亮、收得快，四周仍然是深的（要的是一盏灯，不是一片灰雾）
            `radial-gradient(ellipse 58% 54% at ${kx}% ${ky}%, ${alpha(cool, 0.3 * k)} 0%, ${alpha(cool, 0.11 * k)} 40%, ${alpha(cool, 0)} 78%),` +
            // 产品色回光
            `radial-gradient(ellipse 60% 52% at ${bx}% 104%, ${alpha(theme.accent, 0.17 * b)} 0%, ${alpha(theme.accent, 0)} 72%),` +
            `linear-gradient(180deg, ${mixHex(theme.stage, theme.void, 0.35)} 0%, ${mixHex(theme.stage, theme.void, 0.7)} 55%, ${theme.void} 100%)`,
        }}
      />
      {floor > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, ${alpha('#c9d8e6', 0)} 58%, ${alpha('#c9d8e6', 0.07 * floor)} 66%, ${alpha('#c9d8e6', 0.02 * floor)} 80%, ${alpha('#c9d8e6', 0)} 100%)`,
          }}
        />
      )}
      {children}
    </AbsoluteFill>
  );
};

// ───────── 收尾：暗角 + 颗粒 ─────────
// 颗粒用固定种子画几张小噪点图平铺，每帧换一张、换一个偏移：成本几乎为零，逐帧确定，分段渲染不会闪。
const tiles = new Map<number, string>();
const noiseTile = (seed: number) => {
  const hit = tiles.get(seed);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const size = 192;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  const r = rand(seed);
  for (let i = 0; i < size * size; i++) {
    // 两个随机数取平均：比均匀噪点更接近胶片颗粒的亮度分布
    const g = Math.floor(((r() + r()) / 2) * 256);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');
  tiles.set(seed, url);
  return url;
};

export type FinishProps = {
  theme: CineTheme;
  env?: Env;
  /** 暗角 0–1，默认暗场 0.42、亮场 0.16。再大画面四角就死黑，手机上更暗 */
  vignette?: number;
  /** 颗粒 0–0.1，默认 0.05 */
  grain?: number;
};

/** 每个镜头最上面盖一层：暗角把视线收到中间，颗粒把「数码塑料感」压掉 */
export const Finish: React.FC<FinishProps> = ({theme, env = 'dark', vignette, grain = 0.05}) => {
  const frame = useCurrentFrame();
  const v = safe('Finish', 'vignette', vignette ?? (env === 'dark' ? 0.42 : 0.16), 0, 0.7);
  const g = safe('Finish', 'grain', grain, 0, 0.1);
  const idx = ((frame % 6) + 6) % 6;
  const url = noiseTile(4201 + idx);
  const r = rand(frame * 7919 + 13);
  const ox = Math.round(r() * 192);
  const oy = Math.round(r() * 192);
  const edge = env === 'dark' ? mixHex(theme.void, '#000000', 0.55) : mixHex(theme.paperDeep, '#4a3c28', 0.6);
  return (
    <>
      <AbsoluteFill style={{pointerEvents: 'none', zIndex: 8, background: `radial-gradient(ellipse 82% 78% at 50% 48%, ${alpha(edge, 0)} 52%, ${alpha(edge, v)} 100%)`}} />
      {g > 0 && url && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            zIndex: 9,
            backgroundImage: `url(${url})`,
            backgroundSize: '384px 384px',
            backgroundPosition: `${ox}px ${oy}px`,
            opacity: g,
            mixBlendMode: env === 'dark' ? 'overlay' : 'soft-light',
          }}
        />
      )}
    </>
  );
};
