import React from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, STAGGER, clamp, drift, hash, lerp, prog} from './motion';
import {BF, Theme, alpha} from './theme';

// 品牌片风格包 · 从无序到有序
// 品牌片里「秩序」本身就是主角：先给观众看一眼乱（交叠、歪斜、缠在一起），再干脆地归位。
// 乱的那一段要短（1–2 秒）、要慢（轻轻漂），归位那一下要准（BE.settle，不弹）。

type Box = {x: number; y: number; w: number; h: number};

// ═════════ Arrange：一组块从散落到各就各位 ═════════

export type ArrangeItem = {
  /** 块的尺寸 */
  w: number;
  h: number;
  /** 画块的内容。placed = 0..1，到位的程度（到位后可以点亮强调色） */
  render: (s: {placed: number}) => React.ReactNode;
};

/** 一排槽位：n 个 w×h 的块，以 (cx, cy) 为中心横排，间距 gap */
export const rowSlots = (n: number, w: number, h: number, gap = 32, cx = 960, cy = 540) => {
  const total = n * w + (n - 1) * gap;
  return Array.from({length: n}, (_, i) => ({x: cx - total / 2 + i * (w + gap), y: cy - h / 2}));
};
/** 网格槽位：cols 列，以 (cx, cy) 为中心 */
export const gridSlots = (n: number, cols: number, w: number, h: number, gap = 28, cx = 960, cy = 540) => {
  const rows = Math.ceil(n / cols);
  const tw = cols * w + (cols - 1) * gap;
  const th = rows * h + (rows - 1) * gap;
  return Array.from({length: n}, (_, i) => ({x: cx - tw / 2 + (i % cols) * (w + gap), y: cy - th / 2 + Math.floor(i / cols) * (h + gap)}));
};

export type ArrangeProps = {
  t: number;
  /** 散落状态出现的时刻 */
  t0: number;
  /** 开始归位的时刻 */
  at: number;
  theme: Theme;
  items: ArrangeItem[];
  /** 每个块最终的左上角（用 rowSlots / gridSlots 生成） */
  slots: {x: number; y: number}[];
  /** 散落范围（默认整个画面的中间区域） */
  scatter?: Box;
  /** 散落时最大歪多少度 */
  tilt?: number;
  /** 显示槽位的细框（默认 true：先出现空位，再被填上） */
  showSlots?: boolean;
  dur?: number;
  stagger?: number;
  seed?: number;
};

const scatterOf = (p: ArrangeProps, i: number) => {
  const sc = p.scatter ?? {x: 260, y: 170, w: 1400, h: 700};
  const s = (p.seed ?? 7) * 13 + i * 31;
  const it = p.items[i];
  return {
    x: sc.x + hash(s + 1) * Math.max(0, sc.w - it.w),
    y: sc.y + hash(s + 2) * Math.max(0, sc.h - it.h),
    r: (hash(s + 3) * 2 - 1) * (p.tilt ?? 12),
  };
};
export const arrangeLand = (p: Pick<ArrangeProps, 'at' | 'dur' | 'stagger'>, i: number) => p.at + i * (p.stagger ?? STAGGER.block) + (p.dur ?? DUR.long) * 0.62;

export const Arrange: React.FC<ArrangeProps> = (p) => {
  const {t, t0, at, theme, items, slots} = p;
  if (t < t0) return null;
  const dur = p.dur ?? DUR.long;
  const sg = p.stagger ?? STAGGER.block;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {p.showSlots !== false &&
        slots.map((s, i) => {
          const it = items[i];
          const sp = prog(t, at - 0.5 + i * 0.05, DUR.base, BE.soft);
          const land = arrangeLand(p, i);
          const flash = clamp(1 - Math.abs(t - land) / 0.35);
          return (
            <div
              key={`s${i}`}
              style={{
                position: 'absolute',
                left: s.x - 1,
                top: s.y - 1,
                width: it.w + 2,
                height: it.h + 2,
                borderRadius: 16,
                border: `1px solid ${flash > 0 ? alpha(theme.accentInk, 0.3 + 0.5 * flash) : theme.line2}`,
                opacity: sp * (t > land ? 1 - prog(t, land + 0.4, DUR.long, BE.soft) * 0.6 : 1),
              }}
            />
          );
        })}
      {items.map((it, i) => {
        const a = scatterOf(p, i);
        const s = slots[i];
        const p0 = prog(t, t0 + i * 0.08, DUR.long, BE.out);
        const pm = prog(t, at + i * sg, dur, BE.settle);
        // 散落时轻轻漂
        const fx = drift(t, 10, 6 + i, i * 0.3) * (1 - pm);
        const fy = drift(t, 8, 7 + i * 0.7, i * 0.6) * (1 - pm);
        const x = lerp(a.x, s.x, pm) + fx;
        const y = lerp(a.y + (1 - p0) * 30, s.y, pm) + fy;
        const r = a.r * (1 - pm);
        const placed = prog(t, arrangeLand(p, i) - 0.1, DUR.base, BE.soft);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: it.w,
              height: it.h,
              transform: `rotate(${r}deg)`,
              opacity: clamp(p0 * 1.2),
            }}
          >
            {it.render({placed})}
          </div>
        );
      })}
    </div>
  );
};
export const arrangeSfx = (p: Pick<ArrangeProps, 't0' | 'at' | 'dur' | 'stagger'> & {n: number}): Ev[] => [
  {at: p.t0 + 0.3, k: 'air', vol: 0.1},
  {at: p.at + 0.25, k: 'sweep', vol: 0.12},
  ...Array.from({length: p.n}, (_, i) => ({at: arrangeLand(p, i), k: 'lockq' as const, vol: 0.16})),
];

/**
 * 现成的块：极简细框卡片（标题 + 一行等宽小字），到位后左上角小点亮起强调色。
 * 放进 Arrange 的 render 里用：render: (s) => <Tile theme={th} title="Design" note="01" placed={s.placed} />
 */
export const Tile: React.FC<{theme: Theme; title: string; note?: string; placed?: number; size?: number}> = ({theme, title, note, placed = 0, size = 30}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: 16,
      background: theme.surface,
      border: `1px solid ${theme.line}`,
      boxShadow: theme.mode === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.04), 0 18px 40px -28px rgba(0,0,0,0.25)',
      padding: '22px 26px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
      <div style={{width: 8, height: 8, borderRadius: 4, background: placed > 0 ? theme.accentInk : theme.line2, opacity: lerp(0.6, 1, placed)}} />
      {note && <div style={{fontFamily: BF.mono, fontSize: 16, letterSpacing: '0.14em', color: theme.ink3}}>{note}</div>}
    </div>
    <div style={{fontFamily: BF.sans, fontSize: size, fontWeight: 500, letterSpacing: '-0.01em', color: theme.ink}}>{title}</div>
  </div>
);
