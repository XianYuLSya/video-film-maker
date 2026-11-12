import React from 'react';
import {clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {MascotSay, Pose} from './atoms';
import {C, F, FitText, Out, TONE, Tone, fit, pop, stageOf, textW} from './core';

// ═════════ 大数字 ═════════

export type BigNumberProps = {
  t0: number;
  t1?: number;
  /** 数字（会从 from 滚到这里）或一个短词（如「免费」「3 倍」） */
  value: number | string;
  /** 滚动起点，缺省 0；value 是字符串时不滚 */
  from?: number;
  /** 小数位数 */
  decimals?: number;
  /** 千分位逗号 */
  comma?: boolean;
  /** 数字前的小字，如「¥」 */
  prefix?: string;
  /** 数字后的单位，如「元」「%」「倍」 */
  unit?: string;
  /** 一行注解（大字下面） */
  label: string;
  /** 角落的来源小字，如「数据：2026-11 B站搜索」 */
  note?: string;
  /** 注解出现的时刻，缺省数字滚完时 */
  labelAt?: number;
  tone?: Tone;
  /** 滚动秒数 */
  roll?: number;
  mascot?: Pose;
  vertical?: boolean;
};

const fmt = (v: number, d: number, comma?: boolean) => {
  const s = v.toFixed(d);
  if (!comma) return s;
  const [a, b] = s.split('.');
  return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : '');
};

/** 大数字：一个巨大的数或短词 + 一行注解，数字滚动到位 */
export const BigNumber: React.FC<BigNumberProps & {t: number}> = ({t, t0, t1, value, from = 0, decimals = 0, comma, prefix, unit, label, note, labelAt, tone = 'coral', roll = 1.1, mascot, vertical}) => {
  const st = stageOf(vertical);
  const isNum = typeof value === 'number';
  const rp = prog(t, t0 + 0.1, roll, ease.outQuint);
  const shownV = isNum ? fmt(lerp(from, value as number, rp), decimals, comma) : String(value);
  const finalV = isNum ? fmt(value as number, decimals, comma) : String(value);
  const maxW = vertical ? 920 : mascot ? 1250 : 1600;
  // 字号按最终宽度定，滚动中不跳
  let size = vertical ? 320 : 280;
  const unitK = 0.36;
  const wAt = (s: number) => textW(finalV, s, isNum ? 'ui' : 'smiley') + (unit ? textW(unit, s * unitK, 'zh') + 20 : 0) + (prefix ? textW(prefix, s * unitK, 'zh') + 16 : 0);
  while (size > 110 && wAt(size) > maxW) size -= 4;
  const T = TONE[tone];
  const p = pop(t, t0, 240, 13);
  const la = labelAt ?? t0 + 0.1 + roll * 0.7;
  const lp = pop(t, la, 210, 15);
  const lf = fit({text: label, maxW, size: vertical ? 64 : 72, min: 40, maxLines: 2, font: 'smiley', who: '大数字注解'}, 1.15);
  const cx = vertical ? st.cx : mascot ? st.left + maxW / 2 : st.cx;
  const blockH = size * 1.05 + 30 + lf.h;
  const top = st.cy - blockH / 2 - 10;
  const landed = isNum ? clamp((t - (t0 + 0.1 + roll)) / 0.25) : 0;
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: cx, top, transform: `translateX(-50%) scale(${lerp(0.6, 1, clamp(p)) * (1 + 0.04 * Math.sin(landed * Math.PI))})`, transformOrigin: '50% 60%', opacity: clamp(p * 2), display: 'flex', alignItems: 'baseline', gap: 16, whiteSpace: 'nowrap'}}>
        {prefix && <div style={{fontFamily: F.zh, fontWeight: 900, fontSize: size * unitK, color: C.ink}}>{prefix}</div>}
        <div style={{fontFamily: isNum ? F.ui : F.smiley, fontWeight: 900, fontSize: size, lineHeight: 1.05, color: T.main, WebkitTextStroke: `${Math.round(size / 36)}px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 ${size / 24}px 0 rgba(35,40,66,0.16)`, fontVariantNumeric: 'tabular-nums', letterSpacing: isNum ? -size * 0.02 : 0}}>{shownV}</div>
        {unit && <div style={{fontFamily: F.zh, fontWeight: 900, fontSize: size * unitK, color: C.ink}}>{unit}</div>}
      </div>
      <div style={{position: 'absolute', left: cx - maxW / 2, top: top + size * 1.05 + 30, width: maxW, display: 'flex', justifyContent: 'center', opacity: clamp(lp * 2), transform: `translateY(${(1 - clamp(lp)) * 24}px)`}}>
        <div style={{position: 'relative', display: 'inline-block'}}>
          <div style={{position: 'absolute', left: -12, right: -12, bottom: lf.size * 0.05, height: lf.size * 0.32, background: C.sun, opacity: 0.75, borderRadius: 8, transform: `skewX(-10deg) scaleX(${prog(t, la + 0.15, 0.35, ease.out)})`, transformOrigin: '0 50%'}} />
          <FitText text={label} maxW={maxW} size={vertical ? 64 : 72} min={40} maxLines={2} font="smiley" align="center" lh={1.15} style={{position: 'relative', width: 'auto'}} />
        </div>
      </div>
      {note && (
        <div style={{position: 'absolute', left: cx - maxW / 2, top: top + blockH + 40, width: maxW, display: 'flex', justifyContent: 'center', opacity: clamp(lp)}}>
          <FitText text={note} maxW={maxW} size={26} min={24} weight={600} color={C.muted} align="center" who="大数字来源" />
        </div>
      )}
      {mascot && <MascotSay t={t} t0={la} pose={mascot} spot={vertical ? 'right-bottom' : 'right'} vertical={vertical} h={vertical ? 380 : 520} />}
    </Out>
  );
};

export const bigNumberSfx = (p: BigNumberProps): Ev[] => {
  const roll = p.roll ?? 1.1;
  const isNum = typeof p.value === 'number';
  const la = p.labelAt ?? p.t0 + 0.1 + roll * 0.7;
  return [
    {at: p.t0 + 0.02, k: 'zoom', vol: 0.3},
    ...(isNum ? ([{at: p.t0 + 0.12, k: 'knob', vol: 0.35}, {at: p.t0 + 0.1 + roll, k: 'bass', vol: 0.3}] as Ev[]) : ([{at: p.t0 + 0.05, k: 'bass', vol: 0.35}] as Ev[])),
    {at: la + 0.18, k: 'marker', vol: 0.25},
  ];
};
