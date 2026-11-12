import React from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, clamp, prog} from './motion';
import {Theme, alpha} from './theme';

// 品牌片风格包 · 构成元素：网格、细线、轨道、角标、圆盘
// 它们是「底下的秩序」，永远比主体弱：线宽 1–1.5px、颜色用 theme.line，不抢戏。

type Box = {x: number; y: number; w: number; h: number};

/**
 * 网格：线从中心向两边依次画出，像图纸展开。
 * <Grid t={t} at={s} theme={th} box={{x: 160, y: 140, w: 1600, h: 800}} cols={8} rows={4} />
 * dots=true 时只画交点（更轻）。out 给了就淡出。
 */
export const Grid: React.FC<{t: number; at: number; theme: Theme; box?: Box; cols?: number; rows?: number; dots?: boolean; color?: string; dur?: number; out?: number}> = ({
  t,
  at,
  theme,
  box = {x: 160, y: 140, w: 1600, h: 800},
  cols = 8,
  rows = 4,
  dots,
  color,
  dur = DUR.long,
  out,
}) => {
  const c = color ?? theme.line;
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.base, BE.in);
  if (t < at || o <= 0) return null;
  const xs = Array.from({length: cols + 1}, (_, i) => box.x + (box.w * i) / cols);
  const ys = Array.from({length: rows + 1}, (_, i) => box.y + (box.h * i) / rows);
  const order = (i: number, n: number) => Math.abs(i - n / 2) / (n / 2 || 1); // 中间先出
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
      {dots
        ? xs.flatMap((x, i) =>
            ys.map((y, j) => {
              const p = prog(t, at + (order(i, cols) + order(j, rows)) * 0.3, DUR.base, BE.out);
              return <circle key={`${i}-${j}`} cx={x} cy={y} r={2.2 * p} fill={c} opacity={p} />;
            }),
          )
        : [
            ...xs.map((x, i) => {
              const p = prog(t, at + order(i, cols) * 0.35, dur, BE.out);
              const h = box.h * p;
              return <line key={`v${i}`} x1={x} x2={x} y1={box.y + (box.h - h) / 2} y2={box.y + (box.h + h) / 2} stroke={c} strokeWidth={1} />;
            }),
            ...ys.map((y, j) => {
              const p = prog(t, at + 0.1 + order(j, rows) * 0.35, dur, BE.out);
              const w = box.w * p;
              return <line key={`h${j}`} y1={y} y2={y} x1={box.x + (box.w - w) / 2} x2={box.x + (box.w + w) / 2} stroke={c} strokeWidth={1} />;
            }),
          ]}
    </svg>
  );
};
export const gridSfx = (_p: {at: number}): Ev[] => [];

/**
 * 细分隔线：从 from 端（center / left / right）画出。标题下面、两段之间用。
 * <Rule t={t} at={s} x={760} y={620} w={400} theme={th} />
 */
export const Rule: React.FC<{t: number; at: number; x: number; y: number; w: number; theme: Theme; from?: 'center' | 'left' | 'right'; color?: string; thick?: number; dur?: number; out?: number}> = ({
  t,
  at,
  x,
  y,
  w,
  theme,
  from = 'center',
  color,
  thick = 1.5,
  dur = DUR.long,
  out,
}) => {
  const p = prog(t, at, dur, BE.out);
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.short, BE.in);
  if (p <= 0 || o <= 0) return null;
  const ww = w * p;
  const left = from === 'left' ? x : from === 'right' ? x + w - ww : x + (w - ww) / 2;
  return <div style={{position: 'absolute', left, top: y - thick / 2, width: ww, height: thick, background: color ?? theme.line2, opacity: o}} />;
};
export const ruleSfx = (_p: {at: number}): Ev[] => [];

/**
 * 轨道：一组同心（可压扁成椭圆）的细圆，圆上有小点匀速绕行。表达「各自运行、互不相交」。
 * <Orbit t={t} at={s} theme={th} cx={960} cy={540} radii={[180, 300, 420]} tilt={0.42} />
 * - tilt：纵向压扁比例（1 = 正圆，0.4 = 透视感的椭圆）
 * - dots：每圈几个点（默认 1），speed：每秒转几圈（默认外圈慢内圈快）
 * - accent：第几圈的点用强调色（-1 不用）
 */
export const Orbit: React.FC<{
  t: number;
  at: number;
  theme: Theme;
  cx?: number;
  cy?: number;
  radii?: number[];
  tilt?: number;
  rotate?: number;
  dots?: number;
  speed?: number;
  accent?: number;
  out?: number;
}> = ({t, at, theme, cx = 960, cy = 540, radii = [180, 300, 420], tilt = 0.42, rotate = -8, dots = 1, speed = 0.06, accent = 0, out}) => {
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.base, BE.in);
  if (t < at || o <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: o, overflow: 'visible'}}>
      <g transform={`rotate(${rotate} ${cx} ${cy})`}>
        {radii.map((r, i) => {
          const p = prog(t, at + i * 0.15, DUR.slow, BE.move);
          const ry = r * tilt;
          const sp = (speed * radii[0]) / r;
          return (
            <g key={i}>
              <ellipse
                cx={cx}
                cy={cy}
                rx={r}
                ry={ry}
                fill="none"
                stroke={theme.line2}
                strokeWidth={1.2}
                pathLength={1}
                style={{strokeDasharray: `${p} 2`}}
                opacity={0.9}
              />
              {Array.from({length: dots}, (_, k) => {
                const a = (k / dots + i * 0.27 + (t - at) * sp) * Math.PI * 2;
                const dp = prog(t, at + 0.8 + i * 0.15, DUR.base, BE.out);
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * ry;
                const hi = i === accent;
                return (
                  <g key={k} opacity={dp}>
                    {hi && <circle cx={x} cy={y} r={16} fill={alpha(theme.accent, 0.18)} />}
                    <circle cx={x} cy={y} r={hi ? 6 : 4.5} fill={hi ? theme.accentInk : theme.ink} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
};
export const orbitSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.3, k: 'soft', vol: 0.1}];

/**
 * 角标：四个 L 形细角框住一块区域（取景框、版心）。框住主体时，主体立刻显得「被认真放置」。
 * <CornerMarks t={t} at={s} box={{x: 560, y: 300, w: 800, h: 480}} theme={th} />
 */
export const CornerMarks: React.FC<{t: number; at: number; box: Box; theme: Theme; len?: number; color?: string; out?: number}> = ({t, at, box, theme, len = 28, color, out}) => {
  const p = prog(t, at, DUR.long, BE.out);
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.short, BE.in);
  if (p <= 0 || o <= 0) return null;
  const inset = (1 - p) * 26; // 从外往里收
  const c = color ?? theme.line2;
  const L = len * p;
  const pts: [number, number, number, number][] = [
    [box.x - inset, box.y - inset, 1, 1],
    [box.x + box.w + inset, box.y - inset, -1, 1],
    [box.x - inset, box.y + box.h + inset, 1, -1],
    [box.x + box.w + inset, box.y + box.h + inset, -1, -1],
  ];
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: o * clamp(p * 1.5)}}>
      {pts.map(([x, y, sx, sy], i) => (
        <path key={i} d={`M${x + sx * L},${y} L${x},${y} L${x},${y + sy * L}`} fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="square" />
      ))}
    </svg>
  );
};
export const cornerMarksSfx = (_p: {at: number}): Ev[] => [];
