import React from 'react';
import {clamp, lerp} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Icon, IconBox, IconName, Mark, Title} from './atoms';
import {C, F, FitText, HARD, HARD_S, Out, Slot, fit, innerW, pop, slotBox, stageOf} from './core';

// ═════════ 步骤清单 · 核对清单 ═════════

export type Step = {
  /** 念到这一步的时刻：这一步亮起，前面的打勾 */
  at: number;
  /** 这一步做什么（动词开头，短） */
  text: string;
  /** 一行补充小字 */
  sub?: string;
  icon?: IconName;
};
export type StepListProps = {
  t0: number;
  t1?: number;
  title?: string;
  /** 2–6 步 */
  steps: Step[];
  /** 全部做完的时刻（最后一步也打勾），缺省不打 */
  doneAt?: number;
  /** 放在哪：left / right 时占半屏（另一半放手机或窗口），center 居中 */
  slot?: Slot;
  /** 一开始就把所有步骤的空位列出来（默认 true），false 则一步步长出来 */
  ghosts?: boolean;
  vertical?: boolean;
};

/** 步骤清单：带序号，念到哪步哪步高亮，念完的打勾 */
export const StepList: React.FC<StepListProps & {t: number}> = ({t, t0, t1, title, steps, doneAt, slot = 'center', ghosts = true, vertical}) => {
  const st = stageOf(vertical);
  const list = steps.slice(0, 6);
  const box = slotBox(slot, st, vertical ? innerW(st) : Math.min(1300, innerW(st)));
  const w = box.w;
  const hasIcon = list.some((s) => s.icon);
  const textW = w - 40 - 70 - (hasIcon ? 84 : 0) - 90;
  const big = list.length <= 4;
  const tSize = big ? 42 : 36;
  const tf = list.map((s) => fit({text: s.text, maxW: textW, size: tSize, min: 28, maxLines: 2, who: '步骤'}));
  const sf = list.map((s) => (s.sub ? fit({text: s.sub, maxW: textW, size: 28, min: 24, maxLines: 2, who: '步骤补充'}) : null));
  const hs = list.map((_, i) => Math.max(big ? 108 : 92, tf[i].h + (sf[i] ? sf[i]!.h + 6 : 0) + 36));
  const titleH = title ? 120 : 0;
  const gapBase = big ? 26 : 18;
  const avail = st.bottom - st.top - titleH;
  const total0 = hs.reduce((a, b) => a + b, 0) + gapBase * (list.length - 1);
  const sc = Math.min(1, avail / total0);
  let cur = -1;
  list.forEach((s, i) => {
    if (t >= s.at - 0.1) cur = i;
  });
  const allDone = doneAt !== undefined && t >= doneAt;
  const top0 = st.top + titleH + Math.max(0, (avail - total0 * sc) / 2) * (vertical ? 1 : 0.6);
  let y = 0;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: box.x, top: st.top}}>
          <Title text={title} maxW={w} size={64} vis={pop(t, t0)} />
        </div>
      )}
      <div style={{position: 'absolute', left: box.x, top: top0, width: w, transform: `scale(${sc})`, transformOrigin: '0 0'}}>
        {list.map((s, i) => {
          const top = y;
          y += hs[i] + gapBase;
          const on = t >= s.at - 0.1;
          if (!on) {
            if (!ghosts || t < t0 + 0.1 + i * 0.06) return null;
            return (
              <div key={i} style={{position: 'absolute', left: 0, top, width: w, height: hs[i], boxSizing: 'border-box', border: '4px dashed rgba(35,40,66,0.22)', borderRadius: 24, display: 'flex', alignItems: 'center', padding: '0 30px', gap: 24, opacity: clamp((t - t0 - 0.1 - i * 0.06) / 0.25)}}>
                <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: 40, color: 'rgba(35,40,66,0.25)', width: 50, textAlign: 'center'}}>{i + 1}</div>
                <div style={{height: 16, width: Math.min(textW, 120 + tf[i].w * 0.5), borderRadius: 8, background: 'rgba(35,40,66,0.1)'}} />
              </div>
            );
          }
          const p = pop(t, s.at - 0.1, 240, 15);
          const isCur = i === cur && !allDone;
          const past = i < cur || allDone;
          const pastAt = allDone && i === cur ? doneAt! : list[i + 1]?.at ?? Infinity;
          const mp = past ? pop(t, pastAt - 0.1, 300, 12) : 0;
          const border = isCur ? C.coral : past ? C.mintDeep : C.ink;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                top,
                width: w,
                height: hs[i],
                boxSizing: 'border-box',
                background: isCur ? '#FFF8EC' : '#fff',
                border: `${isCur ? 5 : 4}px solid ${border}`,
                borderRadius: 24,
                boxShadow: isCur ? `0 0 0 6px rgba(229,104,63,0.18), ${HARD_S}` : HARD_S,
                display: 'flex',
                alignItems: 'center',
                padding: '0 30px',
                gap: 24,
                transform: `translateX(${(1 - clamp(p)) * -50}px) scale(${isCur ? 1.02 : 1})`,
                transformOrigin: '0% 50%',
                opacity: clamp(p * 2),
              }}
            >
              <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: 44, color: isCur ? C.coral : past ? C.mintDeep : C.ink, width: 50, textAlign: 'center', flexShrink: 0}}>{i + 1}</div>
              {hasIcon && <IconBox name={s.icon ?? 'chevRight'} tone={isCur ? 'coral' : past ? 'mint' : 'sun'} soft={!isCur} size={64} />}
              <div style={{display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0}}>
                <FitText text={s.text} maxW={textW} size={tSize} min={28} maxLines={2} weight={900} color={past ? C.ink2 : C.ink} who="步骤" />
                {s.sub && <FitText text={s.sub} maxW={textW} size={28} min={24} maxLines={2} weight={700} color={isCur ? C.coral : C.muted} who="步骤补充" />}
              </div>
              <div style={{width: 60, flexShrink: 0, display: 'flex', justifyContent: 'center'}}>{past && <Mark ok size={56} p={mp} />}</div>
            </div>
          );
        })}
      </div>
    </Out>
  );
};

export const stepListSfx = (p: StepListProps): Ev[] => [
  ...(p.title ? [{at: p.t0 + 0.02, k: 'swoosh' as const, vol: 0.2}] : []),
  ...p.steps.slice(0, 6).flatMap((s, i): Ev[] => [{at: s.at - 0.05, k: 'select', vol: 0.32}, ...(i > 0 ? [{at: s.at - 0.02, k: 'tap' as const, vol: 0.25}] : [])]),
  ...(p.doneAt !== undefined ? [{at: p.doneAt, k: 'ok' as const, vol: 0.35}] : []),
];

// ───────── 核对清单 ─────────
export type CheckItem = {
  /** 盖上对勾 / 叉的时刻 */
  at: number;
  text: string;
  /** true=对勾（绿），false=叉（橙）；缺省 true */
  ok?: boolean;
  /** 一行小字补充 */
  note?: string;
};
export type CheckListProps = {
  t0: number;
  t1?: number;
  /** 卡片顶上的标题（写在卡里） */
  title?: string;
  /** 2–6 条 */
  items: CheckItem[];
  /** 所有条目一开始就列出来（淡色），到各自 at 再打勾；false 则到 at 才出现 */
  listFirst?: boolean;
  slot?: Slot;
  vertical?: boolean;
};

/** 核对清单：一张白卡里一条条打勾或打叉 */
export const CheckList: React.FC<CheckListProps & {t: number}> = ({t, t0, t1, title, items, listFirst = true, slot = 'center', vertical}) => {
  const st = stageOf(vertical);
  const list = items.slice(0, 6);
  const box = slotBox(slot, st, vertical ? innerW(st) : Math.min(1360, innerW(st)));
  const w = box.w;
  const pad = 46;
  const textW = w - pad * 2 - 90;
  const tSize = list.length <= 4 ? 40 : 34;
  const tf = list.map((s) => fit({text: s.text, maxW: textW, size: tSize, min: 28, maxLines: 2, who: '核对项'}));
  const nf = list.map((s) => (s.note ? fit({text: s.note, maxW: textW, size: 28, min: 24, maxLines: 1, who: '核对补充'}) : null));
  const hs = list.map((_, i) => Math.max(96, tf[i].h + (nf[i] ? nf[i]!.h + 4 : 0) + 34));
  const head = title ? fit({text: title, maxW: w - pad * 2, size: 64, min: 40, maxLines: 1, font: 'smiley', who: '核对标题'}).h + 40 : 0;
  const cardH = pad + head + hs.reduce((a, b) => a + b, 0) + pad - 10;
  const avail = st.bottom - st.top;
  const sc = Math.min(1, avail / cardH);
  const top = st.top + (avail - cardH * sc) / 2;
  const p = pop(t, t0, 200, 15);
  let y = 0;
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: box.x, top, width: w, height: cardH, transform: `scale(${sc * lerp(0.9, 1, clamp(p))}) rotate(-1deg)`, transformOrigin: '50% 0%', opacity: clamp(p * 2)}}>
        <div style={{width: w, height: cardH, boxSizing: 'border-box', background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 32, boxShadow: HARD, padding: `${pad - 8}px ${pad}px`}}>
          {title && (
            <div style={{height: head, borderBottom: `3px solid ${C.line}`, boxSizing: 'border-box'}}>
              <FitText text={title} maxW={w - pad * 2} size={64} min={40} font="smiley" lh={1.2} who="核对标题" />
            </div>
          )}
          {list.map((s, i) => {
            const rowTop = y;
            y += hs[i];
            const on = t >= s.at;
            const listed = listFirst ? t >= t0 + 0.25 + i * 0.08 : on;
            if (!listed) return null;
            const ok = s.ok ?? true;
            const mp = on ? pop(t, s.at, 300, 12) : 0;
            const rp = pop(t, listFirst ? t0 + 0.25 + i * 0.08 : s.at, 240, 15);
            return (
              <div key={i} style={{height: hs[i], display: 'flex', alignItems: 'center', gap: 28, borderBottom: i < list.length - 1 ? `3px solid ${C.line}` : undefined, opacity: clamp(rp * 2) * (on ? 1 : 0.38), transform: `translateX(${(1 - clamp(rp)) * -24}px)`, position: 'relative', top: 0}}>
                <div style={{width: 62, height: 62, flexShrink: 0, borderRadius: 62, border: on ? 'none' : `4px dashed rgba(35,40,66,0.3)`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{on && <Mark ok={ok} size={62} p={mp} />}</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0}}>
                  <div style={{position: 'relative'}}>
                    <FitText text={s.text} maxW={textW} size={tSize} min={28} maxLines={2} weight={900} color={on && !ok ? C.ink2 : C.ink} who="核对项" />
                  </div>
                  {s.note && <FitText text={s.note} maxW={textW} size={28} min={24} weight={700} color={ok ? C.mintDeep : C.coral} who="核对补充" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Out>
  );
};

export const checkListSfx = (p: CheckListProps): Ev[] => [
  {at: p.t0 + 0.02, k: 'slide', vol: 0.25},
  ...p.items.slice(0, 6).map((s): Ev => ({at: s.at + 0.03, k: s.ok === false ? 'stamp' : 'ok', vol: s.ok === false ? 0.4 : 0.32})),
];

