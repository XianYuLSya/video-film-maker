import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp, lerp} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Icon, IconBox, IconName, Stamp, Title} from './atoms';
import {C, F, FitText, HARD, Out, TONE, Tone, fit, innerW, pop, stageOf} from './core';

// ═════════ 左右对比 ═════════

export type VsSide = {
  /** 这一边出现的时刻 */
  at: number;
  /** 这一边的名字，如「之前」「GPT」「错误做法」 */
  title: string;
  /** 2–4 条要点，每条可带自己的出现时刻 */
  items?: {at?: number; text: string}[];
  icon?: IconName;
  /** public 下的图片（放在要点上方，16:9 最好） */
  img?: string;
};
export type VersusProps = {
  t0: number;
  t1?: number;
  /** vs：A 对 B；before-after：之前对之后；wrong-right：错的对对的（左错右对） */
  kind?: 'vs' | 'before-after' | 'wrong-right';
  left: VsSide;
  right: VsSide;
  /** 判定：哪边赢，盖章文字（缺省：vs「胜」、before-after「更好」、wrong-right「这样做」） */
  verdict?: {at: number; win: 'left' | 'right'; text?: string};
  title?: string;
  vertical?: boolean;
};

const tonesOf = (kind: VersusProps['kind']): [Tone, Tone] => (kind === 'wrong-right' ? ['coral', 'mint'] : kind === 'before-after' ? ['ink', 'mint'] : ['sky', 'coral']);

/** 左右对比：A 对 B、之前对之后、错的对对的，带胜负或对错标记 */
export const Versus: React.FC<VersusProps & {t: number}> = ({t, t0, t1, kind = 'vs', left, right, verdict, title, vertical}) => {
  const st = stageOf(vertical);
  const [tl, tr] = tonesOf(kind);
  const titleH = title ? 130 : 0;
  const gap = vertical ? 110 : 150;
  const cw = vertical ? innerW(st) : (innerW(st) - gap) / 2;
  const inner = cw - 80;
  const sideH = (s: VsSide) => {
    const hdr = fit({text: s.title, maxW: inner - (s.icon ? 90 : 0), size: 56, min: 36, maxLines: 1, font: 'smiley', who: '对比标题'}).h + 56;
    const img = s.img ? (vertical ? 300 : 330) + 24 : 0;
    const its = (s.items ?? []).slice(0, 4).reduce((a, it) => a + fit({text: it.text, maxW: inner - 60, size: 34, min: 26, maxLines: 2, who: '对比要点'}, 1.3).h + 22, 0);
    return hdr + img + its + 50;
  };
  const avail = st.bottom - st.top - titleH;
  let ch = Math.max(sideH(left), sideH(right));
  if (vertical) ch = Math.min(ch, (avail - gap) / 2);
  else ch = Math.min(ch, avail);
  const y0 = vertical ? st.top + titleH + (avail - ch * 2 - gap) / 2 : st.top + titleH + (avail - ch) / 2;
  const pos = (i: 0 | 1) => (vertical ? {x: st.left, y: y0 + i * (ch + gap)} : {x: st.left + i * (cw + gap), y: y0});
  const win = verdict && t >= verdict.at ? verdict.win : undefined;
  const wp = verdict ? clamp((t - verdict.at) / 0.3) : 0;
  const stampText = verdict?.text ?? (kind === 'vs' ? '胜' : kind === 'before-after' ? '更好' : '这样做');
  const mid = vertical ? {x: st.cx, y: y0 + ch + gap / 2} : {x: st.left + cw + gap / 2, y: y0 + ch / 2};
  const midAt = Math.max(left.at, right.at);
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top}}>
          <Title text={title} maxW={innerW(st)} size={68} vis={pop(t, t0)} />
        </div>
      )}
      {([left, right] as VsSide[]).map((s, i) => {
        if (t < s.at - 0.05) return null;
        const p = pop(t, s.at - 0.05, 210, 14);
        const P = pos(i as 0 | 1);
        const isWin = win === (i === 0 ? 'left' : 'right');
        const isLose = win !== undefined && !isWin;
        const from = vertical ? 0 : i === 0 ? -120 : 120;
        const rot = vertical ? (i === 0 ? -0.8 : 0.8) : i === 0 ? -1.5 : 1.5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: P.x,
              top: P.y,
              width: cw,
              height: ch,
              transform: `translateX(${(1 - clamp(p)) * from}px) rotate(${rot}deg) scale(${lerp(0.85, 1, clamp(p)) * (isWin ? 1 + 0.04 * wp : isLose ? 1 - 0.04 * wp : 1)})`,
              opacity: clamp(p * 2) * (isLose ? 1 - 0.45 * wp : 1),
              filter: isLose ? `grayscale(${0.7 * wp})` : undefined,
            }}
          >
            <Side t={t} s={s} tone={i === 0 ? tl : tr} w={cw} h={ch} inner={inner} kind={kind} isLeft={i === 0} hi={isWin ? wp : 0} vertical={vertical} />
            {isWin && (
              <div style={{position: 'absolute', right: 10, top: -30}}>
                <Stamp t={t} at={verdict!.at} text={stampText} tone={i === 0 ? (tl === 'coral' ? 'coral' : 'sky') : tr === 'mint' ? 'mint' : 'coral'} size={64} rot={8} />
              </div>
            )}
          </div>
        );
      })}
      {t >= midAt && (
        <div style={{position: 'absolute', left: mid.x, top: mid.y, transform: `translate(-50%,-50%) scale(${pop(t, midAt + 0.15, 280, 12)}) rotate(${vertical ? 90 : 0}deg)`, zIndex: 5}}>
          {kind === 'vs' ? (
            <div style={{width: 120, height: 120, borderRadius: 120, background: C.sun, border: `6px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 0 rgba(35,40,66,0.2)', transform: `rotate(${vertical ? -90 : -8}deg)`}}>
              <div style={{fontFamily: F.ui, fontWeight: 900, fontStyle: 'italic', fontSize: 52, color: C.ink}}>VS</div>
            </div>
          ) : (
            <div style={{width: 100, height: 100, borderRadius: 30, background: '#fff', border: `5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 7px 0 rgba(35,40,66,0.18)'}}>
              <Icon name="arrowRight" size={56} color={C.ink} sw={3.2} />
            </div>
          )}
        </div>
      )}
    </Out>
  );
};

const Side: React.FC<{t: number; s: VsSide; tone: Tone; w: number; h: number; inner: number; kind: VersusProps['kind']; isLeft: boolean; hi: number; vertical?: boolean}> = ({t, s, tone, w, h, inner, kind, isLeft, hi, vertical}) => {
  const T = TONE[tone];
  const bullet = kind === 'wrong-right' ? (isLeft ? 'x' : 'check') : kind === 'before-after' && isLeft ? 'minus' : 'check';
  const bulletCol = kind === 'wrong-right' ? T.main : kind === 'before-after' && isLeft ? C.muted : T.main;
  return (
    <div style={{width: w, height: h, boxSizing: 'border-box', background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 30, boxShadow: hi > 0 ? `0 0 0 ${8 * hi}px ${C.sun}, ${HARD}` : HARD, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
      <div style={{background: T.main, borderBottom: `5px solid ${C.ink}`, padding: '18px 36px 20px', display: 'flex', alignItems: 'center', gap: 22}}>
        {s.icon && <IconBox name={s.icon} tone={tone === 'ink' ? 'sun' : 'sun'} size={68} />}
        <FitText text={s.title} maxW={inner - (s.icon ? 90 : 0)} size={56} min={36} font="smiley" color={tone === 'sun' ? C.ink : '#fff'} em={C.sunPale} style={{width: 'auto'}} lh={1.15} who="对比标题" />
      </div>
      <div style={{padding: '28px 40px 20px', display: 'flex', flexDirection: 'column', gap: 22, flex: 1, minHeight: 0, overflow: 'hidden'}}>
        {s.img && (
          <div style={{height: vertical ? 300 : 330, borderRadius: 18, overflow: 'hidden', border: `4px solid ${C.ink}`, background: C.paper2, flexShrink: 0}}>
            <Img src={staticFile(s.img)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
          </div>
        )}
        {(s.items ?? []).slice(0, 4).map((it, k) => {
          const at = it.at ?? s.at + 0.25 + k * 0.2;
          if (t < at - 0.03) return null;
          const p = pop(t, at - 0.03, 260, 15);
          return (
            <div key={k} style={{display: 'flex', alignItems: 'flex-start', gap: 18, opacity: clamp(p * 2), transform: `translateX(${(1 - clamp(p)) * -24}px)`}}>
              <div style={{marginTop: 4, width: 42, height: 42, borderRadius: 12, background: bulletCol === C.muted ? C.paper2 : TONE[tone === 'ink' ? 'sky' : tone].pale, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <Icon name={bullet} size={28} color={bulletCol} sw={3.4} />
              </div>
              <FitText text={it.text} maxW={inner - 60} size={34} min={26} maxLines={2} weight={800} lh={1.3} who="对比要点" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const versusSfx = (p: VersusProps): Ev[] => {
  const ev: Ev[] = [
    {at: p.left.at, k: 'swoosh', vol: 0.25},
    {at: p.right.at, k: 'swoosh', vol: 0.25},
    {at: Math.max(p.left.at, p.right.at) + 0.18, k: 'pop', vol: 0.35},
  ];
  for (const s of [p.left, p.right]) (s.items ?? []).slice(0, 4).forEach((it, k) => ev.push({at: it.at ?? s.at + 0.25 + k * 0.2, k: 'tap', vol: 0.25}));
  if (p.verdict) ev.push({at: p.verdict.at + 0.12, k: 'stamp', vol: 0.45}, {at: p.verdict.at + 0.15, k: 'ok', vol: 0.25});
  return ev;
};
