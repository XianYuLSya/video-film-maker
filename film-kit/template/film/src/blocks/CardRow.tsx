import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Arrow, IconBox, IconName, Mark, Tag, Title} from './atoms';
import {C, FitText, HARD, Out, Tone, fit, innerW, pop, stageOf} from './core';

// ═════════ 卡片排 ═════════

export type CardItem = {
  /** 念到这张卡的时刻 */
  at: number;
  /** 卡片标题（短，2–8 字最好） */
  title: string;
  /** 一两句说明 */
  desc?: string;
  /** 图标名（和 img 二选一） */
  icon?: IconName;
  /** public 下的图片路径（方形或接近方形最好） */
  img?: string;
  /** 角标：右上角的小药丸，如「推荐」「免费」 */
  badge?: string;
  /** 卡的强调色：图标块和角标的颜色 */
  tone?: Tone;
  /** 右上角打勾 / 打叉（在 markAt 时盖上，缺省和卡一起出） */
  mark?: 'ok' | 'no';
  markAt?: number;
};
export type CardRowProps = {
  t0: number;
  t1?: number;
  /** 这一排的标题（可选） */
  title?: string;
  /** 2–4 张卡 */
  items: CardItem[];
  /** 卡和卡之间画箭头（表示先后） */
  arrows?: boolean;
  /** 到这个时刻整体缩小上移，给下面让位 */
  shrinkAt?: number;
  vertical?: boolean;
};

/** 卡片排：二到四张并排的卡（图标或图、标题、说明、角标），可一张张填，可整体缩小上移让位 */
export const CardRow: React.FC<CardRowProps & {t: number}> = ({t, t0, t1, title, items, arrows, shrinkAt, vertical}) => {
  const st = stageOf(vertical);
  const n = Math.min(4, items.length);
  const list = items.slice(0, n);
  const titleH = title ? 130 : 0;
  if (vertical) return <CardStack t={t} t0={t0} t1={t1} title={title} items={list} />;
  const gap = arrows ? 90 : 50;
  const cw = Math.min(n === 2 ? 640 : 520, (innerW(st) - gap * (n - 1)) / n);
  const inner = cw - 64;
  const tSize = n === 4 ? 42 : 46;
  const tf = list.map((it) => fit({text: it.title, maxW: inner, size: tSize, min: 30, maxLines: 2, who: '卡片标题'}));
  const df = list.map((it) => (it.desc ? fit({text: it.desc, maxW: inner, size: 30, min: 24, maxLines: 3, who: '卡片说明'}, 1.35) : null));
  const hasImg = list.some((it) => it.img);
  const artH = hasImg ? 200 : list.some((it) => it.icon) ? 104 : 0;
  const cardH = 56 + artH + (artH ? 28 : 0) + Math.max(...tf.map((f) => f.h)) + Math.max(0, ...df.map((d) => (d ? d.h + 16 : 0))) + 44;
  const totalW = cw * n + gap * (n - 1);
  const x0 = st.cx - totalW / 2;
  const areaTop = st.top + titleH;
  const y0 = Math.max(areaTop, areaTop + (st.bottom - areaTop - cardH) / 2 - 10);
  // 缩小上移
  const sp = shrinkAt !== undefined ? prog(t, shrinkAt, 0.6, ease.inOut) : 0;
  const sc = lerp(1, 0.7, sp);
  const targetTop = st.top - 10;
  const dy = lerp(0, targetTop - y0, sp);
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top, opacity: 1 - sp}}>
          <Title text={title} maxW={innerW(st)} size={68} vis={pop(t, t0)} />
        </div>
      )}
      <div style={{position: 'absolute', left: 0, top: 0, width: st.w, height: st.h, transformOrigin: `${st.cx}px ${y0}px`, transform: `translateY(${dy}px) scale(${sc})`}}>
        {list.map((it, i) => {
          const at = it.at;
          // 还没念到的卡先画淡淡的虚线占位：一张张出现时版面已经对称，观众不会以为漏了一张
          if (t < at - 0.05) return <Ghost key={i} t={t} t0={t0} i={i} x={x0 + i * (cw + gap)} y={y0} w={cw} h={cardH} />;
          const p = pop(t, at - 0.05, 220, 14);
          const rot = n === 1 ? 0 : [-1.6, 1.2, -0.8, 1.5][i];
          return (
            <div key={i} style={{position: 'absolute', left: x0 + i * (cw + gap), top: y0, width: cw, height: cardH, transform: `translateY(${(1 - clamp(p)) * 50}px) rotate(${rot}deg) scale(${lerp(0.8, 1, clamp(p))})`, opacity: clamp(p * 2)}}>
              <OneCard t={t} it={it} w={cw} h={cardH} artH={artH} inner={inner} tSize={tSize} descFade={1 - sp} />
            </div>
          );
        })}
        {arrows &&
          list.slice(1).map((it, i) => {
            const ax = x0 + (i + 1) * (cw + gap) - gap / 2;
            const ay = y0 + cardH / 2;
            return <Arrow key={i} x1={ax - 28} y1={ay} x2={ax + 26} y2={ay} p={prog(t, it.at - 0.2, 0.3, ease.out)} bend={0} w={7} head={18} color={C.ink2} />;
          })}
      </div>
    </Out>
  );
};

const OneCard: React.FC<{t: number; it: CardItem; w: number; h: number; artH: number; inner: number; tSize: number; row?: boolean; descFade?: number}> = ({t, it, w, h, artH, inner, tSize, row, descFade = 1}) => {
  const tone = it.tone ?? 'sky';
  const markAt = it.markAt ?? it.at + 0.25;
  const art = it.img ? (
    <div style={{width: row ? 140 : 200, height: row ? 140 : 200, borderRadius: 22, overflow: 'hidden', border: `4px solid ${C.ink}`, background: C.paper2, flexShrink: 0}}>
      <Img src={staticFile(it.img)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
    </div>
  ) : it.icon ? (
    <IconBox name={it.icon} tone={tone} size={row ? 100 : 104} />
  ) : null;
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        boxSizing: 'border-box',
        background: '#fff',
        border: `5px solid ${C.ink}`,
        borderRadius: 30,
        boxShadow: HARD,
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: row ? 'flex-start' : 'flex-start',
        padding: row ? '0 34px' : `${artH ? 44 : 50}px 27px 30px`,
        gap: row ? 30 : 0,
      }}
    >
      {art && <div style={{height: row ? undefined : artH, marginBottom: row ? 0 : 28, display: 'flex', alignItems: 'center'}}>{art}</div>}
      <div style={{display: 'flex', flexDirection: 'column', alignItems: row ? 'flex-start' : 'center', gap: 16, minWidth: 0}}>
        <FitText text={it.title} maxW={inner} size={tSize} min={30} maxLines={2} weight={900} align={row ? 'left' : 'center'} who="卡片标题" />
        {it.desc && <FitText text={it.desc} maxW={inner} size={30} min={24} maxLines={3} weight={600} color={C.ink2} align={row ? 'left' : 'center'} lh={1.35} who="卡片说明" style={{opacity: descFade}} />}
      </div>
      {it.badge && (
        <div style={{position: 'absolute', right: it.mark ? 50 : -18, top: -28}}>
          <Tag text={it.badge} tone={it.tone ?? 'coral'} size={28} rot={5} vis={pop(t, it.at + 0.15, 260, 13)} maxW={w * 0.8} />
        </div>
      )}
      {it.mark && t >= markAt && (
        <div style={{position: 'absolute', right: -22, top: -26}}>
          <Mark ok={it.mark === 'ok'} size={68} p={pop(t, markAt, 300, 12)} />
        </div>
      )}
    </div>
  );
};

/** 占位：虚线框，从 t0 起和卡排一起淡入 */
const Ghost: React.FC<{t: number; t0: number; i: number; x: number; y: number; w: number; h: number}> = ({t, t0, i, x, y, w, h}) => {
  const v = clamp((t - t0 - 0.1 - i * 0.06) / 0.3);
  if (v <= 0) return null;
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', border: '4px dashed rgba(35,40,66,0.22)', borderRadius: 30, opacity: v}} />;
};

/** 竖屏：卡片竖着叠，每张一行 */
const CardStack: React.FC<{t: number; t0: number; t1?: number; title?: string; items: CardItem[]}> = ({t, t0, t1, title, items}) => {
  const st = stageOf(true);
  const W0 = innerW(st);
  const inner = W0 - 68 - 170;
  const tf = items.map((it) => fit({text: it.title, maxW: inner, size: 46, min: 30, maxLines: 2, who: '卡片标题'}));
  const df = items.map((it) => (it.desc ? fit({text: it.desc, maxW: inner, size: 32, min: 24, maxLines: 3, who: '卡片说明'}, 1.35) : null));
  const hs = items.map((_, i) => Math.max(190, 70 + tf[i].h + (df[i] ? df[i]!.h + 16 : 0)));
  const gap = 36;
  const titleH = title ? 140 : 0;
  const total = hs.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let y = Math.max(st.top + titleH, st.top + titleH + (st.bottom - st.top - titleH - total) / 2);
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top}}>
          <Title text={title} maxW={W0} size={72} vis={pop(t, t0)} />
        </div>
      )}
      {items.map((it, i) => {
        const top = y;
        y += hs[i] + gap;
        if (t < it.at - 0.05) return <Ghost key={i} t={t} t0={t0} i={i} x={st.left} y={top} w={W0} h={hs[i]} />;
        const p = pop(t, it.at - 0.05, 220, 14);
        return (
          <div key={i} style={{position: 'absolute', left: st.left, top, width: W0, height: hs[i], transform: `translateX(${(1 - clamp(p)) * -80}px) rotate(${i % 2 ? 0.8 : -0.8}deg)`, opacity: clamp(p * 2)}}>
            <OneCard t={t} it={it} w={W0} h={hs[i]} artH={0} inner={inner} tSize={46} row />
          </div>
        );
      })}
    </Out>
  );
};

export const cardRowSfx = (p: CardRowProps): Ev[] => [
  ...(p.title ? [{at: p.t0 + 0.02, k: 'swoosh' as const, vol: 0.2}] : []),
  ...p.items.slice(0, 4).flatMap((it): Ev[] => [
    {at: it.at, k: 'pop', vol: 0.35},
    ...(it.mark ? [{at: (it.markAt ?? it.at + 0.25) + 0.03, k: it.mark === 'ok' ? ('ok' as const) : ('stamp' as const), vol: 0.32}] : []),
  ]),
  ...(p.shrinkAt !== undefined ? [{at: p.shrinkAt + 0.1, k: 'zout' as const, vol: 0.25}] : []),
];
