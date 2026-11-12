import React from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, clamp, drift, prog} from './motion';
import {Theme, alpha, mix} from './theme';

// 品牌片风格包 · Disc：一块柔和的圆盘（月亮、光源、产品的「核」）
// 由虚到实升起；盘面有受光渐变（左上亮、右下沉）、边缘是柔的（不是剪出来的硬圆）、外面一圈很淡的光晕。
// lift 可以让它在某一刻再亮一点（比如主体落在它上面时），成为这一幕最亮、最安静的东西。

export type DiscProps = {
  t: number;
  at: number;
  cx: number;
  cy: number;
  r: number;
  /** 盘面的基础颜色（深底时只比底亮几档；浅底时比底暗一点） */
  color: string;
  theme: Theme;
  /** 光晕强度 0..2（默认 1） */
  halo?: number;
  /** 再亮一点：从 at 开始用 dur 秒，把盘面朝墨色（深底即亮色）推 amount（0..0.3） */
  lift?: {at: number; amount: number; dur?: number};
  /** 升起的距离（px） */
  rise?: number;
  dur?: number;
  out?: number;
};

export const Disc: React.FC<DiscProps> = ({t, at, cx, cy, r, color, theme, halo = 1, lift, rise = 30, dur = DUR.slow * 1.2, out}) => {
  const p = prog(t, at, dur, BE.out);
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.base, BE.in);
  if (p <= 0 || o <= 0) return null;
  const dark = theme.mode === 'dark';
  const lp = lift ? prog(t, lift.at, lift.dur ?? DUR.slow, BE.soft) * lift.amount : 0;
  const c = mix(color, theme.ink, lp);
  const hi = mix(c, theme.ink, dark ? 0.12 : 0.0); // 受光面
  const lo = mix(c, theme.bg, dark ? 0.28 : 0.08); // 背光面
  const y = cy + (1 - p) * rise + drift(t, 2.5, 9);
  const blur = (1 - p) * 22;
  const h = halo * (dark ? 1 : 0.6) * (1 + lp * 2);
  return (
    <>
      {h > 0 && (
        <div
          style={{
            position: 'absolute',
            left: cx - r * 3.2,
            top: y - r * 3.2,
            width: r * 6.4,
            height: r * 6.4,
            borderRadius: '50%',
            opacity: p * o,
            // 多段停靠做出接近高斯的衰减；不用滤镜
            background: `radial-gradient(closest-side, ${alpha(hi, 0.14 * h)} 0%, ${alpha(hi, 0.1 * h)} 28%, ${alpha(hi, 0.045 * h)} 48%, ${alpha(hi, 0.015 * h)} 72%, transparent 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: cx - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: '50%',
          opacity: clamp(p * 1.3) * o,
          background: `radial-gradient(circle at 36% 30%, ${hi} 0%, ${c} 48%, ${lo} 100%)`,
          // 边缘 4% 的羽化：月亮是一团光，不是贴纸
          WebkitMaskImage: 'radial-gradient(closest-side, #000 95%, transparent 100%)',
          maskImage: 'radial-gradient(closest-side, #000 95%, transparent 100%)',
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      />
    </>
  );
};
export const discSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.6, k: 'soft', vol: 0.12}];
