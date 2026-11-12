import React, {useId} from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, lerp, prog} from './motion';
import {smoothPath} from './Line';
import {BF, Theme, alpha} from './theme';

// 品牌片风格包 · Lanes：缠在一起的几条线理顺成平行的轨道，各自的标签落到自己那条上
// 缠绕时线可以放开到整幅宽（出画）、分远近（近的粗亮带微光，远的细暗发虚），乱得有纵深；
// 理顺后统一成同一种线，标签、节点、注释依次落位。「各归各位」「互不串号」用它。

type Box = {x: number; y: number; w: number; h: number};

export type Lane = {label: string; note?: string};

export type LanesProps = {
  t: number;
  /** 线出现（缠绕状态）的时刻 */
  t0: number;
  /** 开始理顺的时刻 */
  at: number;
  theme: Theme;
  lanes: Lane[];
  /** 理顺后的区域：线从 box.x + labelW 画到 box.x + box.w，几条线在 box 的高度里等距排开 */
  box?: Box;
  /** 缠绕时的区域（可以比画面大，线会出画）。不给就等于 box。品牌片里建议放开到整幅宽 */
  tangleBox?: Box;
  labelW?: number;
  /** 标签字号（手机上要读得出：主词 ≥ 64） */
  size?: number;
  /** 右侧注释字号（≥ 28） */
  noteSize?: number;
  dur?: number;
  stagger?: number;
  /** 缠绕的剧烈程度 0..1.5 */
  chaos?: number;
  /** 缠绕时每条线的远近 0（远：细、暗、虚）..1（近：粗、亮、带微光）。不给全是 0.6。理顺后统一 */
  depth?: number[];
  /** 理顺后的线宽，默认 2 */
  lineWidth?: number;
  /** 标签什么时候出现：'land'（默认）= 缠绕时不出字，每条落位时才出；'start' = 线一出现就挂在线上 */
  labels?: 'start' | 'land';
  /** 到位后线右端的节点和注释是否点亮强调色（默认 true） */
  accentEnds?: boolean;
  out?: number;
};

const N = 72;
const boxOf = (p: LanesProps): Box => p.box ?? {x: 300, y: 330, w: 1320, h: 420};
const laneY = (p: LanesProps, i: number) => {
  const b = boxOf(p);
  return b.y + (b.h * (i + 0.5)) / p.lanes.length;
};
const tangledY = (p: LanesProps, i: number, u: number, t: number) => {
  const b = p.tangleBox ?? boxOf(p);
  const cy = b.y + b.h / 2;
  const ch = p.chaos ?? 1;
  const f = 1.1 + i * 0.45;
  const ph = i * 2.1 + 0.4;
  const env = 0.45 + 0.55 * Math.sin(Math.PI * u);
  const wob = Math.sin((u * f + ph / 6.28) * Math.PI * 2 + t * (0.5 + i * 0.12)) * 0.75 + Math.sin(u * 7.3 + i * 1.7 - t * 0.4) * 0.25;
  return cy + b.h * 0.42 * ch * env * wob;
};
/** 第 i 条线落位的时刻（音效、后续动作用） */
export const lanesLand = (p: Pick<LanesProps, 'at' | 'dur' | 'stagger'>, i: number) => p.at + i * (p.stagger ?? 0.1) + (p.dur ?? DUR.long * 1.15) * 0.55;

const CJK = /[一-鿿]/;

export const Lanes: React.FC<LanesProps> = (p) => {
  const {t, t0, at, theme, lanes} = p;
  const fid = `lanes${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (t < t0) return null;
  const b = boxOf(p);
  const tb = p.tangleBox ?? b;
  const lw = p.labelW ?? 240;
  const size = p.size ?? 30;
  const noteSize = p.noteSize ?? 28;
  const dur = p.dur ?? DUR.long * 1.15;
  const sg = p.stagger ?? 0.1;
  const lineW = p.lineWidth ?? 2;
  const o = p.out === undefined ? 1 : 1 - prog(t, p.out, DUR.base, BE.in);
  const draw = (i: number) => prog(t, t0 + i * 0.12, DUR.slow, BE.move);
  const dep = (i: number) => p.depth?.[i] ?? 0.6;
  const big = {filterUnits: 'userSpaceOnUse' as const, x: -600, y: -600, width: 3120, height: 2280};
  return (
    <div style={{position: 'absolute', inset: 0, opacity: o}}>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          {lanes.map((_, i) => (
            <filter key={i} id={`${fid}b${i}`} {...big}>
              <feGaussianBlur stdDeviation={(1 - dep(i)) * 3.4} />
            </filter>
          ))}
          <filter id={`${fid}g`} {...big}>
            <feGaussianBlur stdDeviation={8} />
          </filter>
        </defs>
        {lanes.map((_, i) => {
          const pm = prog(t, at + i * sg, dur, BE.settle);
          const ys = laneY(p, i);
          const pts: [number, number][] = Array.from({length: N + 1}, (_, k) => {
            const u = k / N;
            const x = lerp(tb.x + u * tb.w, b.x + lw + u * (b.w - lw), pm);
            return [x, lerp(tangledY(p, i, u, t), ys, pm)];
          });
          const placed = prog(t, lanesLand(p, i), DUR.base, BE.soft);
          const end = pts[N];
          const d = dep(i);
          // 缠绕时按远近给粗细和亮度，理顺过程中统一成同一种线
          const w = lerp(lerp(1.3, 4, d), lineW, pm);
          const op = lerp(lerp(0.3, 0.95, d), 0.6 + 0.2 * placed, pm);
          const blurOn = (1 - d) * (1 - pm) > 0.08;
          const path = smoothPath(pts);
          const dash = {strokeDasharray: `${draw(i)} 2`};
          const glow = d > 0.5 ? (d - 0.5) * 2 * (1 - pm) : 0;
          return (
            <g key={i}>
              {glow > 0.02 && (
                <path d={path} pathLength={1} fill="none" stroke={theme.ink} strokeWidth={w * 2.6} strokeLinecap="round" opacity={0.4 * glow} style={dash} filter={`url(#${fid}g)`} />
              )}
              <path
                d={path}
                pathLength={1}
                fill="none"
                stroke={theme.ink}
                strokeWidth={w}
                strokeLinecap="round"
                opacity={op}
                style={dash}
                filter={blurOn ? `url(#${fid}b${i})` : undefined}
              />
              {/* 右端节点：落位后点亮（全片第一次出现颜色的地方） */}
              {pm > 0.6 && (
                <>
                  {p.accentEnds !== false && placed > 0 && <circle cx={end[0]} cy={end[1]} r={10 + 24 * placed} fill={alpha(theme.accent, 0.3 * placed)} />}
                  <circle cx={end[0]} cy={end[1]} r={lerp(4, 10, placed)} fill={p.accentEnds !== false && placed > 0 ? theme.accentInk : theme.ink2} />
                </>
              )}
            </g>
          );
        })}
      </svg>
      {lanes.map((ln, i) => {
        const pm = prog(t, at + i * sg, dur, BE.settle);
        const placed = prog(t, lanesLand(p, i), DUR.base, BE.soft);
        const early = p.labels === 'start';
        const u0 = 0.22 + i * 0.19;
        const yEnd = laneY(p, i) - size * 0.62;
        const x = early ? lerp(tb.x + u0 * tb.w, b.x, pm) : b.x;
        const y = early ? lerp(tangledY(p, i, u0, t) - size * 1.25, yEnd, pm) : yEnd + (1 - prog(t, lanesLand(p, i) - 0.3, DUR.long, BE.out)) * size * 0.3;
        const ap = early ? prog(t, t0 + 0.5 + i * 0.15, DUR.base, BE.out) : prog(t, lanesLand(p, i) - 0.3, DUR.long, BE.out);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: y,
                fontFamily: CJK.test(ln.label) ? BF.zh : BF.sans,
                fontSize: size,
                fontWeight: 400,
                letterSpacing: '0.04em',
                lineHeight: 1.24,
                whiteSpace: 'pre',
                color: theme.ink,
                opacity: ap,
                filter: !early && ap < 0.98 ? `blur(${(1 - ap) * 8}px)` : undefined,
              }}
            >
              {ln.label}
            </div>
            {ln.note && (
              <div
                style={{
                  position: 'absolute',
                  left: b.x + b.w + 36,
                  top: laneY(p, i) - noteSize * 0.62,
                  fontFamily: CJK.test(ln.note) ? BF.zh : BF.mono,
                  fontSize: noteSize,
                  lineHeight: 1.24,
                  letterSpacing: '0.06em',
                  color: theme.ink2,
                  opacity: placed,
                  transform: `translateX(${(1 - placed) * -10}px)`,
                  whiteSpace: 'pre',
                }}
              >
                {ln.note}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const lanesSfx = (p: Pick<LanesProps, 't0' | 'at' | 'dur' | 'stagger'> & {n: number}): Ev[] => [
  {at: p.t0 + 0.4, k: 'air', vol: 0.12},
  {at: p.at + 0.3, k: 'sweep', vol: 0.12},
  ...Array.from({length: p.n}, (_, i) => ({at: lanesLand(p, i), k: 'lockq' as const, vol: 0.15})),
];
