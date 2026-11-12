import React, {createContext, useContext} from 'react';
import {AbsoluteFill} from 'remotion';
import type {Ev} from '../kit/sfx';
import {BE, DUR, Ease, clamp, lerp, prog} from './motion';
import {BF, Theme, alpha} from './theme';

// 品牌片风格包 · 光与镜头：推拉与视差、由虚到实、光扫、圆形转场

// ═════════ Camera + Depth：慢推慢拉，前后景按深度错开 ═════════

type Cam = {s: number; x: number; y: number};
const CamCtx = createContext<Cam>({s: 1, x: 0, y: 0});

/**
 * 镜头：在 [t0, t1] 里从 from 漂到 to（缩放 s、平移 x/y 像素）。品牌片的镜头几乎感觉不到：
 * 推 3%–6%，平移 ≤ 40px，时长 ≥ 4 秒。里面用 <Depth d={…}> 分层，d 越大越靠前、动得越多。
 * <Camera t={t} t0={s} t1={s + 6} from={{s: 1}} to={{s: 1.05, x: -20}}>
 *   <Depth d={0.3}>背景网格</Depth>
 *   <Depth d={1}>主体</Depth>
 *   <Depth d={1.6}>前景小点</Depth>
 * </Camera>
 */
export const Camera: React.FC<{t: number; t0: number; t1: number; from?: Partial<Cam>; to?: Partial<Cam>; ease?: Ease; children: React.ReactNode}> = ({t, t0, t1, from, to, ease = BE.move, children}) => {
  const p = ease(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
  const a = {s: 1, x: 0, y: 0, ...from};
  const b = {s: 1, x: 0, y: 0, ...to};
  return <CamCtx.Provider value={{s: lerp(a.s, b.s, p), x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p)}}>{children}</CamCtx.Provider>;
};

/** 一层景深。d=1 跟镜头走，d<1 是远景（动得少），d>1 是近景（动得多） */
export const Depth: React.FC<{d?: number; children: React.ReactNode}> = ({d = 1, children}) => {
  const c = useContext(CamCtx);
  const s = 1 + (c.s - 1) * d;
  return <AbsoluteFill style={{transform: `translate(${c.x * d}px, ${c.y * d}px) scale(${s})`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>;
};

// ═════════ Focus：由虚到实 ═════════

/**
 * 包住任何东西，让它从模糊、略大、透明聚焦到清晰。徽标、产品图、大字的出场都能用。
 * 模糊是逐帧计算的滤镜：包住的东西越大越慢（整屏 1920×1080 模糊约多 40–80ms/帧），
 * 所以只包主体，不要包整个场景。聚焦完成后滤镜自动去掉，不再耗时。
 * <Focus t={t} at={s + 0.5}><img …/></Focus>
 */
export const Focus: React.FC<{t: number; at: number; dur?: number; blur?: number; scale?: number; out?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  t,
  at,
  dur = DUR.slow,
  blur = 18,
  scale = 1.06,
  out,
  children,
  style,
}) => {
  const p = prog(t, at, dur, BE.out);
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.base, BE.in);
  if (p <= 0 || o <= 0) return null;
  const b = (1 - p) * blur + (out === undefined ? 0 : (1 - o) * blur * 0.5);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: clamp(p * 1.6) * o,
        transform: `scale(${lerp(scale, 1, p)})`,
        filter: b > 0.25 ? `blur(${b}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
export const focusSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.4, k: 'soft', vol: 0.12}];

// ═════════ 光扫 ═════════

/**
 * 一句字上走过一道光（字本身的颜色里有一段变亮）。品牌名、标语到位后点一下，整片最多两次。
 * <SweepText t={t} at={s + 2} text="FAswitch" size={120} weight={600} color={th.ink} shine="#FFFFFF" />
 */
export const SweepText: React.FC<{
  t: number;
  at: number;
  text: string;
  size: number;
  weight?: number;
  color: string;
  shine?: string;
  font?: string;
  tracking?: string;
  dur?: number;
  style?: React.CSSProperties;
}> = ({t, at, text, size, weight = 600, color, shine = '#FFFFFF', font = BF.sans, tracking = '-0.03em', dur = 1.4, style}) => {
  const p = prog(t, at, dur, BE.move);
  const pos = lerp(-40, 140, p); // 光带中心位置（%）
  const on = t >= at && p < 1;
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: tracking,
        whiteSpace: 'pre',
        lineHeight: 1.2,
        color,
        ...(on
          ? {
              backgroundImage: `linear-gradient(105deg, ${color} ${pos - 18}%, ${shine} ${pos}%, ${color} ${pos + 18}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }
          : {}),
        ...style,
      }}
    >
      {text}
    </div>
  );
};
export const sweepTextSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.5, k: 'shimmer', vol: 0.1}];

/**
 * 整屏一道斜着走过的柔光（像镜头扫过玻璃反光）。叠在内容之上，用 screen / multiply 混合，很淡。
 * <LightSweep t={t} at={s + 1} theme={th} />
 */
export const LightSweep: React.FC<{t: number; at: number; theme: Theme; dur?: number; strength?: number; angle?: number}> = ({t, at, theme, dur = 1.8, strength = 1, angle = 112}) => {
  const p = prog(t, at, dur, BE.move);
  if (t < at || p >= 1) return null;
  const pos = lerp(-30, 130, p);
  const dark = theme.mode === 'dark';
  const c = dark ? alpha('#FFFFFF', 0.11 * strength) : alpha('#FFFFFF', 0.55 * strength);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: dark ? 'screen' : 'soft-light',
        background: `linear-gradient(${angle}deg, transparent ${pos - 16}%, ${c} ${pos - 4}%, ${c} ${pos + 4}%, transparent ${pos + 16}%)`,
      }}
    />
  );
};
export const lightSweepSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.6, k: 'air', vol: 0.1}];

// ═════════ Iris：圆形转场 ═════════

/**
 * 下一幕从一个圆里长出来，圆扩到盖满全屏。圆心最好放在上一幕的一个圆形物体上（月亮、节点、徽标），
 * 这样转场是「顺着形状走」，不是贴一个特效。
 * <Iris t={t} at={s + 4} cx={960} cy={500} r0={300}>…下一幕…</Iris>
 */
export const Iris: React.FC<{t: number; at: number; cx?: number; cy?: number; r0?: number; dur?: number; children: React.ReactNode}> = ({t, at, cx = 960, cy = 540, r0 = 0, dur = 1.1, children}) => {
  if (t < at) return null;
  const p = prog(t, at, dur, BE.move);
  const far = Math.hypot(Math.max(cx, 1920 - cx), Math.max(cy, 1080 - cy)) + 4;
  const r = lerp(r0, far, p);
  return <AbsoluteFill style={{clipPath: p >= 1 ? undefined : `circle(${r}px at ${cx}px ${cy}px)`}}>{children}</AbsoluteFill>;
};
export const irisSfx = (p: {at: number; dur?: number}): Ev[] => [{at: p.at + (p.dur ?? 1.1) * 0.55, k: 'whoosh', vol: 0.16}];
