import React from 'react';
import {appear, clamp, ease, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Icon, IconName, Title} from './atoms';
import {C, F, FitText, Out, TONE, Tone, fit, innerW, pop, stageOf} from './core';

// ═════════ 对比条和排行 ═════════

export type BarRow = {
  /** 这一行出现、条开始长的时刻 */
  at: number;
  /** 名字（左边的胸牌） */
  name: string;
  /** 数值（决定条长） */
  value: number;
  /** 条尾显示的字，缺省显示数值 + unit */
  label?: string;
  icon?: IconName;
  /** 条的颜色，缺省按行轮换 */
  tone?: Tone;
  /** 条下面一行小字 */
  note?: string;
};
export type BarChartProps = {
  t0: number;
  t1?: number;
  title?: string;
  /** 2–6 行 */
  rows: BarRow[];
  /** 满格的值，缺省取最大值 */
  max?: number;
  unit?: string;
  /** 高亮某一行（赢家）：[{at, i}] */
  hi?: {at: number; i: number}[];
  /** 高亮后其余行变淡 */
  dimOthers?: boolean;
  vertical?: boolean;
};

const AUTO: Tone[] = ['sky', 'coral', 'mint', 'sun', 'ink', 'sky'];

/** 对比条和排行：横条图，名字、数值、条长，可高亮某一条 */
export const BarChart: React.FC<BarChartProps & {t: number}> = ({t, t0, t1, title, rows, max, unit = '', hi = [], dimOthers = true, vertical}) => {
  const st = stageOf(vertical);
  const list = rows.slice(0, 6);
  const n = list.length;
  const M = max ?? Math.max(...list.map((r) => r.value)) * 1.0;
  const titleH = title ? 130 : 0;
  const avail = st.bottom - st.top - titleH;
  const W0 = innerW(st);
  const anyHi = hi.some((h) => t >= h.at);
  if (vertical) {
    const rowH = Math.min(200, avail / n);
    const top0 = st.top + titleH + (avail - rowH * n) / 2;
    return (
      <Out t={t} t0={t0} t1={t1}>
        {title && (
          <div style={{position: 'absolute', left: st.left, top: st.top}}>
            <Title text={title} maxW={W0} size={68} vis={pop(t, t0)} />
          </div>
        )}
        {list.map((r, i) => (
          <div key={i} style={{position: 'absolute', left: st.left, top: top0 + i * rowH, width: W0, height: rowH}}>
            <OneRow t={t} r={r} i={i} M={M} unit={unit} hi={hi} anyHi={anyHi && dimOthers} w={W0} h={rowH} vertical />
          </div>
        ))}
      </Out>
    );
  }
  const rowH = Math.min(130, avail / n);
  const top0 = st.top + titleH + (avail - rowH * n) / 2;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top}}>
          <Title text={title} maxW={W0} size={68} vis={pop(t, t0)} />
        </div>
      )}
      {list.map((r, i) => (
        <div key={i} style={{position: 'absolute', left: st.left, top: top0 + i * rowH, width: W0, height: rowH}}>
          <OneRow t={t} r={r} i={i} M={M} unit={unit} hi={hi} anyHi={anyHi && dimOthers} w={W0} h={rowH} />
        </div>
      ))}
    </Out>
  );
};

const OneRow: React.FC<{t: number; r: BarRow; i: number; M: number; unit: string; hi: {at: number; i: number}[]; anyHi: boolean; w: number; h: number; vertical?: boolean}> = ({t, r, i, M, unit, hi, anyHi, w, h, vertical}) => {
  const v = appear(t, r.at, Infinity, 0.3);
  if (v <= 0) return null;
  const p = prog(t, r.at + 0.1, 0.8, ease.outQuint);
  const hiEv = hi.filter((x) => x.i === i && t >= x.at);
  const isHi = hiEv.length > 0;
  const hp = isHi ? clamp((t - hiEv[0].at) / 0.25) : 0;
  const dim = anyHi && !isHi ? 0.42 : 1;
  const T = TONE[r.tone ?? AUTO[i % AUTO.length]];
  const frac = clamp(r.value / Math.max(1e-6, M));
  const label = r.label ?? `${r.value}${unit}`;
  const nameW = vertical ? w * 0.62 : 400;
  const valW = vertical ? w * 0.36 : 260;
  const barH = vertical ? Math.min(64, h * 0.34) : Math.min(66, h * 0.52);
  const nameEl = (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, background: '#fff', border: `4px solid ${C.ink}`, borderRadius: 18, padding: '8px 18px', boxShadow: '0 5px 0 rgba(35,40,66,0.14)', maxWidth: nameW - 20, boxSizing: 'border-box'}}>
      {r.icon && (
        <div style={{width: 40, height: 40, borderRadius: 11, background: T.main, border: `3px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box'}}>
          <Icon name={r.icon} size={24} color={T.on} sw={2.6} />
        </div>
      )}
      <FitText text={r.name} maxW={nameW - 60 - (r.icon ? 52 : 0)} size={34} min={26} maxLines={vertical ? 1 : 2} weight={900} style={{width: 'auto'}} lh={1.15} who="条形图名字" />
    </div>
  );
  const valEl = (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, opacity: clamp((p - 0.3) * 2), justifyContent: vertical ? 'flex-end' : 'flex-start'}}>
      {isHi && <Icon name="star" size={40} color={C.ink} fill={C.sun} sw={2.4} />}
      <FitText text={label} maxW={valW - (isHi ? 50 : 0)} size={isHi ? 50 : 44} min={28} font="ui" weight={900} color={isHi ? C.coral : C.ink} style={{width: 'auto'}} lh={1.1} markup={false} who="条形图数值" />
    </div>
  );
  const track = (bw: number) => (
    <div style={{position: 'relative', width: bw, height: barH, background: 'rgba(35,40,66,0.07)', borderRadius: 16, border: `4px solid ${isHi ? C.ink : 'rgba(35,40,66,0.18)'}`, boxSizing: 'border-box', boxShadow: isHi ? `0 0 0 ${7 * hp}px ${C.sun}` : undefined}}>
      <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(frac > 0 ? 4 : 0, frac * 100 * p)}%`, background: T.main, borderRadius: 12}} />
    </div>
  );
  if (vertical) {
    return (
      <div style={{width: w, height: h, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, opacity: v * dim, transform: `translateX(${(1 - v) * -30}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          {nameEl}
          <div style={{width: valW}}>{valEl}</div>
        </div>
        {track(w)}
        {r.note && <FitText text={r.note} maxW={w} size={26} min={24} weight={700} color={C.ink2} who="条形图小字" />}
      </div>
    );
  }
  const barW = w - nameW - valW - 30;
  return (
    <div style={{width: w, height: h, display: 'flex', alignItems: 'center', opacity: v * dim, transform: `translateX(${(1 - v) * -30}px)`}}>
      <div style={{width: nameW, display: 'flex', justifyContent: 'flex-end', paddingRight: 26, boxSizing: 'border-box'}}>{nameEl}</div>
      <div style={{position: 'relative'}}>
        {track(barW)}
        {r.note && (
          <div style={{position: 'absolute', left: 6, top: '100%', marginTop: 4, opacity: clamp((p - 0.5) * 2)}}>
            <FitText text={r.note} maxW={barW} size={24} min={24} weight={700} color={C.ink2} style={{width: 'auto'}} who="条形图小字" />
          </div>
        )}
      </div>
      <div style={{width: valW, paddingLeft: 26, boxSizing: 'border-box'}}>{valEl}</div>
    </div>
  );
};

export const barChartSfx = (p: BarChartProps): Ev[] => [
  ...p.rows.slice(0, 6).flatMap((r): Ev[] => [
    {at: r.at, k: 'tap', vol: 0.3},
    {at: r.at + 0.12, k: 'sweep', vol: 0.18},
  ]),
  ...(p.hi ?? []).map((h): Ev => ({at: h.at + 0.05, k: 'chime', vol: 0.3})),
];

