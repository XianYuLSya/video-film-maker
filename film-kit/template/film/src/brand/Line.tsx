import React, {useId} from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, Ease, clamp, prog} from './motion';

// 品牌片风格包 · 线条：任意 SVG 路径的描绘（多段依次、圆线头、可带微光和一道走过的高光）

type Pt = [number, number];

/** 过点的平滑曲线（Catmull-Rom → 三次贝塞尔）。描徽标、画轨道都用它：给一串点就是一条顺的线 */
export const smoothPath = (pts: Pt[], closed = false) => {
  if (pts.length < 2) return '';
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const f = (n: number) => Math.round(n * 100) / 100;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 1; i <= n; i++) {
    const p0 = P[i - 1];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? d + ' Z' : d;
};
/** 折线（Z 字、对勾这种要尖角的） */
export const polyPath = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');

/** 一段要描的线 */
export type Stroke = {
  d: string;
  /** 开始描的时刻（秒）；不传则接在上一段后面 */
  at?: number;
  /** 描这段用几秒；不传按 weight 分配 DrawPaths 的总时长 */
  dur?: number;
  /** 这段在总时长里占多少份（长的线给大一点），默认 1 */
  weight?: number;
  width?: number;
  color?: string;
};

/**
 * 依次描绘多段路径。徽标、图形、轨道都用它。
 * <DrawPaths t={t} at={2} dur={2.2} viewBox="0 0 100 100" width={600} strokes={[{d: ...}, {d: ..., weight: 0.3}]} color={th.ink} lineWidth={4} glow glint />
 * - 不给每段 at/dur 时：总时长 dur 按 weight 分给各段，首尾相接、略有重叠（overlap），一笔接一笔
 * - glow：线外两层宽而淡的同色线（假的光晕，不用模糊滤镜，很快）
 * - glint：描完后一道短高光沿线走一遍（glintAt 不传就在描完后 0.15 秒）
 * - fill：描完后淡入的填充色（可选，徽标是实心形状时用）
 */
export const DrawPaths: React.FC<{
  t: number;
  at: number;
  dur?: number;
  strokes: Stroke[];
  viewBox: string;
  width: number;
  height?: number;
  color: string;
  lineWidth: number;
  overlap?: number;
  ease?: Ease;
  glow?: boolean | number;
  glint?: boolean;
  glintAt?: number;
  glintColor?: string;
  fill?: string;
  style?: React.CSSProperties;
}> = ({t, at, dur = DUR.slow, strokes, viewBox, width, height, color, lineWidth, overlap = 0.25, ease = BE.move, glow, glint, glintAt, glintColor = '#FFFFFF', fill, style}) => {
  const tm = strokeTimes(at, dur, strokes, overlap);
  const end = Math.max(...tm.map((x) => x.at + x.dur));
  const [vx, vy, vw, vh] = viewBox.split(/[ ,]+/).map(Number);
  const h = height ?? (width * vh) / vw;
  const g = glow === true ? 1 : typeof glow === 'number' ? glow : 0;
  const gl0 = glintAt ?? end + 0.15;
  // 走光：一道高光按描线顺序从第一段走到最后一段，总共 glintDur 秒，各段按自己的描线时长分时间
  const glintDur = 1.3;
  const totalD = tm.reduce((a, x) => a + x.dur, 0) || 1;
  const glintAtOf = tm.map((_, i) => gl0 + (tm.slice(0, i).reduce((a, x) => a + x.dur, 0) / totalD) * glintDur);
  const glintP = (i: number) => clamp((t - glintAtOf[i]) / Math.max(0.05, (tm[i].dur / totalD) * glintDur));
  const fid = `bglow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={width} height={h} viewBox={viewBox} style={{display: 'block', overflow: 'visible', ...style}}>
      {g > 0 && (
        <defs>
          <filter id={fid} filterUnits="userSpaceOnUse" x={vx - vw * 0.2} y={vy - vh * 0.3} width={vw * 1.4} height={vh * 1.6}>
            <feGaussianBlur stdDeviation={lineWidth * 1.3} />
          </filter>
        </defs>
      )}
      {strokes.map((s, i) => {
        const p = prog(t, tm[i].at, tm[i].dur, ease);
        if (p <= 0.0005) return null;
        const w = s.width ?? lineWidth;
        const c = s.color ?? color;
        const dash = {strokeDasharray: `${p} 2`, strokeDashoffset: 0};
        const fillOp = fill ? prog(t, end, DUR.base, BE.soft) : 0;
        return (
          <g key={i}>
            {fill && fillOp > 0 && <path d={s.d} fill={fill} opacity={fillOp} stroke="none" />}
            {g > 0 && (
              <path d={s.d} pathLength={1} fill="none" stroke={c} strokeWidth={w * 1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.5 * g} style={dash} filter={`url(#${fid})`} />
            )}
            <path d={s.d} pathLength={1} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={dash} />
            {glint && glintP(i) > 0 && glintP(i) < 1 && (
              <path
                d={s.d}
                pathLength={1}
                fill="none"
                stroke={glintColor}
                strokeWidth={w * 0.9}
                strokeLinecap="round"
                opacity={Math.sin(glintP(i) * Math.PI) * 0.7}
                style={{strokeDasharray: '0.07 2', strokeDashoffset: -(glintP(i) * 1.1 - 0.08)}}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

/** 算出每一段真正的起点和时长（DrawPaths 和音效共用） */
export const strokeTimes = (at: number, dur: number, strokes: Stroke[], overlap = 0.25) => {
  const total = strokes.reduce((a, s) => a + (s.dur === undefined && s.at === undefined ? s.weight ?? 1 : 0), 0) || 1;
  let cur = at;
  return strokes.map((s) => {
    const d = s.dur ?? (dur * (s.weight ?? 1)) / total;
    const a = s.at ?? cur;
    cur = a + d * (1 - overlap);
    return {at: a, dur: d};
  });
};

/** 描线音效：开始一声轻风，描完一声细亮 */
export const drawPathsSfx = (p: {at: number; dur?: number; strokes: Stroke[]; overlap?: number; glint?: boolean; glintAt?: number}): Ev[] => {
  const tm = strokeTimes(p.at, p.dur ?? DUR.slow, p.strokes, p.overlap);
  const end = Math.max(...tm.map((x) => x.at + x.dur));
  const ev: Ev[] = [{at: p.at + 0.25, k: 'air', vol: 0.14}];
  if (p.glint) ev.push({at: (p.glintAt ?? end + 0.15) + 0.45, k: 'shimmer', vol: 0.12});
  return ev;
};
