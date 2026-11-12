import React from 'react';
import {AbsoluteFill} from 'remotion';
import {drift} from './motion';
import {Theme, alpha} from './theme';

// 品牌片风格包 · 舞台：底色 + 缓慢漂移的光斑 + 暗角 + 胶片颗粒
// 一个场景只铺一个 <Stage>，内容放在它里面。颗粒在最上层，内容也会带颗粒（这正是想要的）。

export type Pool = {
  /** 中心位置（画布 0..1） */
  x: number;
  y: number;
  /** 半径（画布宽度的比例，0.5 = 960px） */
  r: number;
  /** 颜色（带透明度）；不传用 theme.pool[0/1] */
  color?: string;
  /** 漂移幅度（画布比例）和周期（秒） */
  amp?: number;
  period?: number;
};

/** 默认两团光：主色光在左上、墨色光在右下，缓慢对漂 */
export const defaultPools = (th: Theme): Pool[] => [
  {x: 0.3, y: 0.28, r: 0.55, color: th.pool[0], amp: 0.04, period: 14},
  {x: 0.78, y: 0.78, r: 0.5, color: th.pool[1], amp: 0.035, period: 17},
];

export const Pools: React.FC<{t: number; theme: Theme; pools?: Pool[]; strength?: number}> = ({t, theme, pools, strength = 1}) => (
  <>
    {(pools ?? defaultPools(theme)).map((p, i) => {
      const cx = (p.x + drift(t, p.amp ?? 0.03, p.period ?? 15, i * 0.37)) * 1920;
      const cy = (p.y + drift(t, (p.amp ?? 0.03) * 0.6, (p.period ?? 15) * 1.3, i * 0.71 + 0.5)) * 1080;
      const r = p.r * 1920;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx - r,
            top: cy - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            opacity: strength,
            // 多段停靠点做出近似高斯的衰减，不用 filter: blur（大面积模糊很慢）
            background: `radial-gradient(closest-side, ${p.color ?? theme.pool[i % 2]} 0%, ${fade(p.color ?? theme.pool[i % 2], 0.55)} 35%, ${fade(p.color ?? theme.pool[i % 2], 0.18)} 65%, transparent 100%)`,
          }}
        />
      );
    })}
  </>
);

// 把 rgba(...) 的透明度再乘一个系数（光斑渐变的中间停靠点用）
const fade = (c: string, k: number) => {
  const m = c.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/);
  if (!m) return c;
  return `rgba(${m[1]},${m[2]},${m[3]},${(Number(m[4]) * k).toFixed(3)})`;
};

export const Vignette: React.FC<{strength: number; color?: string}> = ({strength, color = '#000000'}) =>
  strength <= 0 ? null : (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse 75% 75% at 50% 48%, transparent 55%, ${alpha(color, strength * 0.55)} 85%, ${alpha(color, strength)} 120%)`,
      }}
    />
  );

/**
 * 确定性胶片颗粒：SVG feTurbulence，种子按 1/24 秒换一次（胶片的颗粒节奏），同一帧永远一样。
 * 在半分辨率上算再放大 2 倍：颗粒更像胶片，也只花四分之一的时间。
 */
export const Grain: React.FC<{t: number; amount: number; dark: boolean}> = ({t, amount, dark}) => {
  if (amount <= 0) return null;
  const seed = Math.floor(t * 24) % 997;
  const id = `bgrain${dark ? 'd' : 'l'}`;
  // 输出颜色固定（深底白点、浅底黑点），透明度 = 噪声亮度的高段
  const c = dark ? 1 : 0;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: amount, overflow: 'hidden'}}>
      <svg width={960} height={540} style={{position: 'absolute', left: 0, top: 0, transform: 'scale(2)', transformOrigin: '0 0'}}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values={`0 0 0 0 ${c}  0 0 0 0 ${c}  0 0 0 0 ${c}  3.2 0 0 0 -1.25`} />
        </filter>
        <rect width={960} height={540} filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * 舞台。所有品牌片场景的最外层。
 * <Stage t={t} theme={th}>…内容…</Stage>
 * - pools：光斑（不传用默认两团；传 [] 关掉）
 * - light：光斑强度 0..1（默认 1）；可以随时间变，做「亮起来」
 * - grain / vignette：不传用 theme 的值；传 0 关掉
 */
export const Stage: React.FC<{
  t: number;
  theme: Theme;
  pools?: Pool[];
  light?: number;
  grain?: number;
  vignette?: number;
  children?: React.ReactNode;
}> = ({t, theme, pools, light = 1, grain, vignette, children}) => (
  <AbsoluteFill style={{background: theme.bg, overflow: 'hidden'}}>
    <Pools t={t} theme={theme} pools={pools} strength={light} />
    <AbsoluteFill>{children}</AbsoluteFill>
    <Vignette strength={vignette ?? theme.vignette} color={theme.mode === 'dark' ? '#000000' : '#5A5040'} />
    <Grain t={t} amount={grain ?? theme.grain} dark={theme.mode === 'dark'} />
  </AbsoluteFill>
);
