import React from 'react';
import {appear, clamp, ease, lerp, prog, spring} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Icon, IconBox, IconName, Tag, Title} from './atoms';
import {C, F, FitText, Out, TONE, Tone, fit, innerW, pop, stageOf, warnOnce} from './core';

// ═════════ 本期路线 · 章节牌 · 换章过场 ═════════

export type RoadItem = {
  /** 念到这一项的时刻 */
  at: number;
  /** 这一项的名字（短，2–10 字） */
  text: string;
  /** 一行补充（可选） */
  sub?: string;
  icon?: IconName;
};
export type RoadmapProps = {
  t0: number;
  t1?: number;
  /** 标题，默认「这期讲几件事」 */
  title?: string;
  /** 2–5 项 */
  items: RoadItem[];
  /** 之后回到路线图时，点亮正在讲的那一项（其余变淡）：[{at, i}] */
  focus?: {at: number; i: number}[];
  vertical?: boolean;
};

/** 本期路线：这期讲几件事，一项项点亮 */
export const Roadmap: React.FC<RoadmapProps & {t: number}> = ({t, t0, t1, title = '这期讲几件事', items, focus = [], vertical}) => {
  const st = stageOf(vertical);
  const n = Math.min(5, items.length);
  const list = items.slice(0, n);
  let cur = -1;
  let curAt = 0;
  for (const f of focus) if (t >= f.at) {
    cur = f.i;
    curAt = f.at;
  }
  const titleTop = st.top;
  if (vertical) {
    const rowW = innerW(st);
    const rowH = 150;
    const gap = 30;
    const top0 = Math.max(titleTop + 150, titleTop + 150 + (st.bottom - titleTop - 150 - n * (rowH + gap)) / 2 - 40);
    return (
      <Out t={t} t0={t0} t1={t1}>
        <div style={{position: 'absolute', left: st.left, top: titleTop}}>
          <Title text={title} maxW={rowW} size={76} vis={pop(t, t0)} />
        </div>
        {list.map((it, i) => (
          <div key={i} style={{position: 'absolute', left: st.left, top: top0 + i * (rowH + gap), width: rowW, height: rowH}}>
            <RoadCard t={t} it={it} i={i} w={rowW} h={rowH} row cur={cur} curAt={curAt} />
          </div>
        ))}
      </Out>
    );
  }
  const gap = n >= 5 ? 30 : 44;
  // 卡最宽 520：项少时不拉成长条，整排居中
  const cw = Math.min(520, (innerW(st) - gap * (n - 1)) / n);
  const x0 = st.cx - (cw * n + gap * (n - 1)) / 2;
  const tSize = n >= 5 ? 38 : 44;
  const fits = list.map((it) => fit({text: it.text, maxW: cw - 60, size: tSize, min: 30, maxLines: 2, who: '路线项'}));
  const subs = list.map((it) => (it.sub ? fit({text: it.sub, maxW: cw - 60, size: 28, min: 24, maxLines: 2, who: '路线补充'}) : null));
  const cardH = 150 + Math.max(...fits.map((f) => f.h)) + Math.max(0, ...subs.map((s) => (s ? s.h + 14 : 0))) + (list.some((x) => x.icon) ? 0 : -20);
  const top = Math.max(titleTop + 150, st.cy - cardH / 2 + 40);
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: st.left, top: titleTop}}>
        <Title text={title} maxW={innerW(st)} size={72} vis={pop(t, t0)} />
      </div>
      {list.map((it, i) => (
        <div key={i} style={{position: 'absolute', left: x0 + i * (cw + gap), top, width: cw, height: cardH}}>
          <RoadCard t={t} it={it} i={i} w={cw} h={cardH} cur={cur} curAt={curAt} tSize={tSize} />
        </div>
      ))}
    </Out>
  );
};

const RoadCard: React.FC<{t: number; it: RoadItem; i: number; w: number; h: number; row?: boolean; cur: number; curAt: number; tSize?: number}> = ({t, it, i, w, h, row, cur, curAt, tSize = 44}) => {
  const on = t >= it.at - 0.05;
  if (!on) {
    return (
      <div style={{width: w, height: h, boxSizing: 'border-box', border: `4px dashed rgba(35,40,66,0.25)`, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: row ? 'flex-start' : 'center', padding: row ? '0 30px' : 0}}>
        <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: 56, color: 'rgba(35,40,66,0.22)'}}>{i + 1}</div>
      </div>
    );
  }
  const p = pop(t, it.at - 0.05, 230, 14);
  const isCur = cur === i;
  const dim = cur >= 0 && !isCur ? 0.45 : 1;
  const hiP = isCur ? clamp((t - curAt) / 0.25) : 0;
  const rot = row ? 0 : i % 2 === 0 ? -1.2 : 1.2;
  const numBox = (
    <div style={{width: 64, height: 64, borderRadius: 64, background: isCur ? C.coral : C.ink, color: '#fff', fontFamily: F.ui, fontWeight: 900, fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${C.ink}`, flexShrink: 0}}>{i + 1}</div>
  );
  return (
    <div
      style={{
        width: w,
        height: h,
        boxSizing: 'border-box',
        background: '#fff',
        border: `${5 + hiP * 2}px solid ${isCur ? C.coral : C.ink}`,
        borderRadius: 28,
        boxShadow: '0 12px 0 rgba(35,40,66,0.14), 0 26px 50px rgba(35,40,66,0.14)',
        transform: `rotate(${rot}deg) scale(${lerp(0.7, 1, clamp(p)) * (1 + 0.05 * hiP)})`,
        opacity: clamp(p * 2) * dim,
        padding: row ? '0 30px' : '28px 28px',
        display: 'flex',
        flexDirection: row ? 'row' : 'column',
        alignItems: row ? 'center' : 'flex-start',
        gap: row ? 26 : 18,
        position: 'relative',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        {numBox}
        {it.icon && <IconBox name={it.icon} tone="sun" soft size={64} />}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0}}>
        <FitText text={it.text} maxW={row ? w - 260 : w - 60} size={row ? 46 : tSize} min={30} maxLines={2} weight={900} who="路线项" />
        {it.sub && <FitText text={it.sub} maxW={row ? w - 260 : w - 60} size={28} min={24} maxLines={2} weight={700} color={C.ink2} who="路线补充" />}
      </div>
      {isCur && (
        <div style={{position: 'absolute', right: -14, top: -26}}>
          <Tag text="现在讲" tone="coral" size={26} vis={pop(t, curAt, 260, 13)} rot={6} />
        </div>
      )}
    </div>
  );
};

export const roadmapSfx = (p: RoadmapProps): Ev[] => [
  {at: p.t0 + 0.02, k: 'swoosh', vol: 0.22},
  ...p.items.slice(0, 5).map((it): Ev => ({at: it.at, k: 'pop', vol: 0.35})),
  ...(p.focus ?? []).map((f): Ev => ({at: f.at, k: 'select', vol: 0.35})),
];

// ───────── 章节牌（左上角常驻） ─────────
export type ChapterTagProps = {
  t0: number;
  t1?: number;
  text: string;
  icon?: IconName;
  /** 第几章（可选，显示成小号数字） */
  n?: number;
  tone?: Tone;
  vertical?: boolean;
};
/** 章节牌：左上角的小牌子，整章常驻 */
export const ChapterTag: React.FC<ChapterTagProps & {t: number}> = ({t, t0, t1, text, icon = 'bookOpen', n, tone = 'coral', vertical}) => {
  const v = appear(t, t0, t1 ?? Infinity, 0.4, 0.3);
  if (v <= 0) return null;
  const sp = spring(t - t0, 200, 16);
  const T = TONE[tone];
  return (
    <div style={{position: 'absolute', left: vertical ? 60 : 60, top: vertical ? 150 : 40, display: 'flex', alignItems: 'center', gap: 16, opacity: v, transform: `translateX(${(1 - sp) * -40}px)`, zIndex: 20}}>
      <div style={{width: 58, height: 58, borderRadius: 17, background: T.main, border: `4px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 0 rgba(35,40,66,0.15)', boxSizing: 'border-box'}}>
        {n !== undefined ? <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: 28, color: T.on}}>{n}</div> : <Icon name={icon} size={30} color={T.on} sw={2.6} />}
      </div>
      <FitText text={text} maxW={vertical ? 760 : 820} size={44} min={32} font="smiley" style={{width: 'auto'}} lh={1.1} who="章节牌" />
    </div>
  );
};
export const chapterTagSfx = (p: ChapterTagProps): Ev[] => [{at: p.t0 + 0.05, k: 'slide', vol: 0.25}];

// ───────── 换章过场 ─────────
export type ChapterBreakProps = {
  /** 过场开始时刻 */
  t0: number;
  /** 整段时长，缺省 2.1 秒。推入 0.35 + 推出 0.35，中间标题停稳的时间 = dur - 0.7，标题要能读 1.2 秒以上，所以 dur 不要小于 1.9 */
  dur?: number;
  /** 第几部分 */
  n: number;
  title: string;
  sub?: string;
  icon?: IconName;
  tone?: Tone;
  vertical?: boolean;
};
/** 换章过场：一张大纸从左边推进来，大号章节数 + 标题，停一下再推走 */
export const ChapterBreak: React.FC<ChapterBreakProps & {t: number}> = ({t, t0, dur: durIn = 2.1, n, title, sub, icon, tone = 'coral', vertical}) => {
  const st = stageOf(vertical);
  if (durIn < 1.9) warnOnce(`换章过场「${title}」只有 ${durIn.toFixed(2)} 秒，标题停不满 1.2 秒，读不完（dur 至少 1.9）`);
  const dur = Math.max(1.2, durIn);
  if (t < t0 || t > t0 + dur + 0.05) return null;
  const inP = prog(t, t0, 0.35, ease.outQuint);
  const outQ = prog(t, t0 + dur - 0.35, 0.35, ease.in);
  const x = (1 - inP) * -(st.w + 300) + outQ * (st.w + 300);
  // 字跟着大纸一起走：纸推进到七八成（约 0.1 秒）字就开始弹出，推出时字随纸滑走，不提前淡掉。
  // 这样标题从 t0+0.2 到 t0+dur-0.35 一直清楚可读（dur=2.1 时约 1.5 秒）
  const textVis = clamp((inP - 0.75) / 0.15);
  const T = TONE[tone];
  const numP = pop(t, t0 + 0.08, 240, 13);
  const titP = pop(t, t0 + 0.15, 220, 15);
  const tW = vertical ? 900 : 1300;
  const numStr = String(n).padStart(2, '0');
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: x - 150, top: -60, width: st.w + 300, height: st.h + 120, transform: 'skewX(-8deg)', background: C.ink, borderLeft: `22px solid ${T.main}`, borderRight: `22px solid ${T.main}`}} />
      <div style={{position: 'absolute', left: x, top: 0, width: st.w, height: st.h}}>
        <div style={{position: 'absolute', left: st.cx, top: st.cy - (vertical ? 120 : 60), transform: `translate(-50%,-50%) scale(${lerp(1.5, 1, clamp(numP))})`, opacity: clamp(numP * 2) * textVis, display: 'flex', alignItems: 'center', gap: 40}}>
          {icon && <IconBox name={icon} tone={tone} size={vertical ? 120 : 140} />}
          <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: vertical ? 220 : 260, lineHeight: 1, color: tone === 'ink' ? C.sun : T.main, textShadow: '0 12px 0 rgba(0,0,0,0.28)'}}>{numStr}</div>
        </div>
        <div style={{position: 'absolute', left: st.cx - tW / 2, top: st.cy + (vertical ? 70 : 130), width: tW, opacity: clamp(titP * 2) * textVis, transform: `translateY(${(1 - clamp(titP)) * 30}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
          <FitText text={title} maxW={tW} size={vertical ? 96 : 104} min={60} maxLines={2} font="smiley" color="#fff" em={C.sun} align="center" lh={1.12} who="换章标题" />
          {sub && <FitText text={sub} maxW={tW} size={38} min={28} maxLines={1} weight={800} color={C.coralSoft} align="center" who="换章副标题" />}
        </div>
      </div>
    </div>
  );
};
export const chapterBreakSfx = (p: ChapterBreakProps): Ev[] => [
  {at: p.t0 + 0.15, k: 'whoosh', vol: 0.3},
  {at: p.t0 + 0.2, k: 'stamp', vol: 0.35},
  {at: p.t0 + Math.max(1.2, p.dur ?? 2.1) - 0.2, k: 'swoosh', vol: 0.22},
];
