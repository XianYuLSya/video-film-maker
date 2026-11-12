import React from 'react';
import {clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Arrow, Icon, IconBox, IconName, Title} from './atoms';
import {C, F, FitText, HARD_S, Out, TONE, Tone, fit, innerW, pop, stageOf} from './core';

// ═════════ 流程图 · 时间线 ═════════

export type FlowNode = {
  /** 节点的名字（连线用） */
  id: string;
  /** 节点出现的时刻 */
  at: number;
  text: string;
  sub?: string;
  icon?: IconName;
  /** 只在 layout='free' 时用：节点中心的舞台坐标 */
  x?: number;
  y?: number;
};
export type FlowEdge = {
  from: string;
  to: string;
  /** 箭头画出来的时刻，缺省在 to 节点出现前 0.15 秒 */
  at?: number;
  /** 箭头上的小字 */
  label?: string;
  dashed?: boolean;
};
export type FlowProps = {
  t0: number;
  t1?: number;
  title?: string;
  /** 2–5 个节点（free 布局最多 8 个） */
  nodes: FlowNode[];
  /** 连线；不给就按节点顺序一个接一个连 */
  edges?: FlowEdge[];
  /** row 横排 / column 竖排 / free 自由坐标；竖屏缺省 column */
  layout?: 'row' | 'column' | 'free';
  /** 走到哪了：[{at, id}]。当前节点高亮（橙），走过的变绿，路过的箭头上有小点跑过去 */
  path?: {at: number; id: string}[];
  vertical?: boolean;
};

type Box = {x: number; y: number; w: number; h: number};

/** 流程图：节点 + 箭头，当前节点高亮、走过的变色 */
export const Flow: React.FC<FlowProps & {t: number}> = ({t, t0, t1, title, nodes, edges, layout, path = [], vertical}) => {
  const st = stageOf(vertical);
  const lay = layout ?? (vertical ? 'column' : 'row');
  const list = nodes.slice(0, lay === 'free' ? 8 : 5);
  const n = list.length;
  const titleH = title ? 130 : 0;
  const top = st.top + titleH;
  const avail = st.bottom - top;
  const W0 = innerW(st);
  // 节点尺寸
  const compact = lay === 'column';
  const gap = lay === 'row' ? 100 : 64;
  const nodeW = lay === 'row' ? Math.min(330, (W0 - gap * (n - 1)) / n) : lay === 'column' ? Math.min(vertical ? 820 : 760, W0) : 300;
  const textW = compact ? nodeW - 60 - 90 : nodeW - 48;
  const tS = compact ? 40 : 36;
  const tf = list.map((d) => fit({text: d.text, maxW: textW, size: tS, min: 28, maxLines: 2, who: '流程节点'}));
  const sf = list.map((d) => (d.sub ? fit({text: d.sub, maxW: textW, size: 26, min: 24, maxLines: 2, who: '流程补充'}) : null));
  const hasIcon = list.some((d) => d.icon);
  const nodeH = (i: number) => (compact ? Math.max(110, tf[i].h + (sf[i] ? sf[i]!.h + 6 : 0) + 40) : 40 + (hasIcon ? 84 : 0) + tf[i].h + (sf[i] ? sf[i]!.h + 8 : 0) + 34);
  const hs = list.map((_, i) => nodeH(i));
  const boxes: Record<string, Box> = {};
  if (lay === 'row') {
    const H = Math.max(...hs);
    const total = nodeW * n + gap * (n - 1);
    list.forEach((d, i) => {
      boxes[d.id] = {x: st.cx - total / 2 + i * (nodeW + gap), y: top + (avail - H) / 2, w: nodeW, h: H};
    });
  } else if (lay === 'column') {
    let g = gap;
    let total = hs.reduce((a, b) => a + b, 0) + g * (n - 1);
    if (total > avail) {
      g = Math.max(36, (avail - hs.reduce((a, b) => a + b, 0)) / Math.max(1, n - 1));
      total = hs.reduce((a, b) => a + b, 0) + g * (n - 1);
    }
    let y = top + Math.max(0, (avail - total) / 2);
    list.forEach((d, i) => {
      boxes[d.id] = {x: st.cx - nodeW / 2, y, w: nodeW, h: hs[i]};
      y += hs[i] + g;
    });
  } else {
    list.forEach((d, i) => {
      const cx = d.x ?? st.cx;
      const cy = d.y ?? st.cy;
      boxes[d.id] = {x: cx - nodeW / 2, y: cy - hs[i] / 2, w: nodeW, h: hs[i]};
    });
  }
  const es: FlowEdge[] = edges ?? list.slice(1).map((d, i) => ({from: list[i].id, to: d.id}));
  // 走到哪
  let cur: string | undefined;
  let curAt = 0;
  const visited = new Set<string>();
  for (const s of path) {
    if (t >= s.at) {
      if (cur) visited.add(cur);
      cur = s.id;
      curAt = s.at;
    }
  }
  if (cur) visited.delete(cur);
  const nodeAt = (id: string) => list.find((d) => d.id === id)?.at ?? t0;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top}}>
          <Title text={title} maxW={W0} size={68} vis={pop(t, t0)} />
        </div>
      )}
      {es.map((e, k) => {
        const a = boxes[e.from];
        const b = boxes[e.to];
        if (!a || !b) return null;
        const at = e.at ?? nodeAt(e.to) - 0.15;
        const p = prog(t, at, 0.4, ease.out);
        if (p <= 0) return null;
        const [x1, y1, x2, y2] = edgeEnds(a, b);
        const passed = (visited.has(e.from) || cur === e.from) && (visited.has(e.to) || cur === e.to);
        const col = passed ? C.mintDeep : C.ink2;
        // 跑动的小点：当前节点刚切到 e.to 时
        const run = cur === e.to && path.some((s) => s.id === e.from) ? prog(t, curAt - 0.45, 0.45, ease.inOut) : 1;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <React.Fragment key={k}>
            <Arrow x1={x1} y1={y1} x2={x2} y2={y2} p={p} bend={lay === 'free' ? 0.1 : 0} w={passed ? 8 : 6} color={col} dash={e.dashed} head={18} />
            {run < 1 && run > 0 && <div style={{position: 'absolute', left: lerp(x1, x2, run) - 13, top: lerp(y1, y2, run) - 13, width: 26, height: 26, borderRadius: 26, background: C.coral, border: `4px solid ${C.ink}`, boxSizing: 'border-box', zIndex: 6}} />}
            {e.label && p > 0.5 && (
              <div style={{position: 'absolute', left: mx, top: my, transform: `translate(-50%, ${lay === 'row' ? '-150%' : '-50%'}) ${lay === 'column' ? 'translateX(60%)' : ''}`, background: '#fff', border: `3px solid ${C.ink}`, borderRadius: 12, padding: '4px 12px', opacity: clamp((p - 0.5) * 2), zIndex: 4}}>
                <FitText text={e.label} maxW={lay === 'row' ? gap + 140 : 300} size={24} min={24} weight={800} color={C.ink2} style={{width: 'auto'}} lh={1.2} who="流程箭头字" />
              </div>
            )}
          </React.Fragment>
        );
      })}
      {list.map((d, i) => {
        const b = boxes[d.id];
        if (t < d.at - 0.05) return null;
        const p = pop(t, d.at - 0.05, 230, 14);
        const isCur = cur === d.id;
        const was = visited.has(d.id);
        const hp = isCur ? clamp((t - curAt) / 0.25) : 0;
        const tone: Tone = isCur ? 'coral' : was ? 'mint' : 'sky';
        const T = TONE[tone];
        return (
          <div
            key={d.id}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              boxSizing: 'border-box',
              background: was ? '#EEF8F1' : isCur ? '#FFF6EC' : '#fff',
              border: `${isCur ? 6 : 5}px solid ${isCur ? C.coral : was ? C.mintDeep : C.ink}`,
              borderRadius: 26,
              boxShadow: isCur ? `0 0 0 ${8 * hp}px rgba(229,104,63,0.2), ${HARD_S}` : HARD_S,
              transform: `scale(${lerp(0.7, 1, clamp(p)) * (1 + 0.05 * hp)})`,
              opacity: clamp(p * 2),
              display: 'flex',
              flexDirection: compact ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: compact ? 'flex-start' : 'center',
              gap: compact ? 24 : 12,
              padding: compact ? '0 30px' : '20px 22px',
              zIndex: 5,
            }}
          >
            {d.icon ? <IconBox name={d.icon} tone={tone} size={compact ? 70 : 72} /> : compact ? <div style={{width: 56, height: 56, borderRadius: 56, background: T.main, border: `4px solid ${C.ink}`, color: '#fff', fontFamily: F.ui, fontWeight: 900, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box'}}>{i + 1}</div> : null}
            <div style={{display: 'flex', flexDirection: 'column', alignItems: compact ? 'flex-start' : 'center', gap: 6}}>
              <FitText text={d.text} maxW={textW} size={tS} min={28} maxLines={2} weight={900} align={compact ? 'left' : 'center'} who="流程节点" />
              {d.sub && <FitText text={d.sub} maxW={textW} size={26} min={24} maxLines={2} weight={700} color={C.ink2} align={compact ? 'left' : 'center'} who="流程补充" />}
            </div>
            {was && (
              <div style={{position: 'absolute', right: -16, top: -16, width: 44, height: 44, borderRadius: 44, background: C.mintDeep, border: `4px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'}}>
                <Icon name="check" size={26} color="#fff" sw={3.6} />
              </div>
            )}
          </div>
        );
      })}
    </Out>
  );
};

/** 两个框之间的连线端点：从框边出发，到框边结束 */
const edgeEnds = (a: Box, b: Box): [number, number, number, number] => {
  const ac = {x: a.x + a.w / 2, y: a.y + a.h / 2};
  const bc = {x: b.x + b.w / 2, y: b.y + b.h / 2};
  const hit = (bx: Box, c: {x: number; y: number}, dx: number, dy: number) => {
    const sx = dx === 0 ? Infinity : bx.w / 2 / Math.abs(dx);
    const sy = dy === 0 ? Infinity : bx.h / 2 / Math.abs(dy);
    const s = Math.min(sx, sy);
    return {x: c.x + dx * s, y: c.y + dy * s};
  };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  const p1 = hit(a, ac, dx, dy);
  const p2 = hit(b, bc, -dx, -dy);
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
  const m = 14;
  return [p1.x + (dx / Math.hypot(dx, dy)) * m, p1.y + (dy / Math.hypot(dx, dy)) * m, p2.x - ((p2.x - p1.x) / len) * m, p2.y - ((p2.y - p1.y) / len) * m];
};

export const flowSfx = (p: FlowProps): Ev[] => [
  ...p.nodes.slice(0, 8).map((d): Ev => ({at: d.at, k: 'pop', vol: 0.32})),
  ...(p.edges ?? []).map((e): Ev => ({at: (e.at ?? (p.nodes.find((d) => d.id === e.to)?.at ?? p.t0) - 0.15) + 0.05, k: 'marker', vol: 0.18})),
  ...(p.path ?? []).map((s, i): Ev => ({at: s.at, k: i === 0 ? 'select' : 'confirm', vol: 0.32})),
];

// ───────── 时间线 ─────────
export type TimePoint = {
  /** 这个点出现的时刻 */
  at: number;
  /** 时间标签，如「10 月 16 日」「v3.0」「第 1 天」 */
  date: string;
  /** 这个点发生了什么 */
  text: string;
  sub?: string;
  tone?: Tone;
};
export type TimelineProps = {
  t0: number;
  t1?: number;
  title?: string;
  /** 3–6 个点 */
  points: TimePoint[];
  /** 高亮「现在」那一个：{at, i} */
  now?: {at: number; i: number};
  vertical?: boolean;
};

/** 时间线：几个时间点一路排开，轴线跟着画过去 */
export const Timeline: React.FC<TimelineProps & {t: number}> = ({t, t0, t1, title, points, now, vertical}) => {
  const st = stageOf(vertical);
  const list = points.slice(0, 6);
  const n = list.length;
  const titleH = title ? 130 : 0;
  const top = st.top + titleH;
  const avail = st.bottom - top;
  const W0 = innerW(st);
  const nowI = now && t >= now.at ? now.i : -1;
  const nowP = now ? clamp((t - now.at) / 0.3) : 0;
  const reached = list.reduce((m, d, i) => (t >= d.at - 0.25 ? i : m), -1);
  if (vertical) {
    const ax = st.left + 40;
    const step = Math.min(240, avail / n);
    const y0 = top + (avail - step * n) / 2 + step / 2;
    const lineP = reached < 0 ? 0 : prog(t, list[reached].at - 0.25, 0.3, ease.out);
    const lineEnd = reached < 0 ? y0 : y0 + (reached - 1 + lineP) * step;
    return (
      <Out t={t} t0={t0} t1={t1}>
        {title && (
          <div style={{position: 'absolute', left: st.left, top: st.top}}>
            <Title text={title} maxW={W0} size={68} vis={pop(t, t0)} />
          </div>
        )}
        <div style={{position: 'absolute', left: ax - 5, top: y0, width: 10, height: Math.max(0, lineEnd - y0), background: C.ink, borderRadius: 5}} />
        {list.map((d, i) => (
          <TPoint key={i} t={t} d={d} x={ax} y={y0 + i * step} vertical cardW={W0 - 110} isNow={nowI === i} nowP={nowP} />
        ))}
      </Out>
    );
  }
  const margin = 215;
  const step = (W0 - margin * 2) / Math.max(1, n - 1);
  const ay = top + avail / 2;
  const x0 = st.left + margin;
  const lineP = reached < 0 ? 0 : reached === 0 ? 1 : prog(t, list[reached].at - 0.25, 0.3, ease.out);
  const lineEnd = reached <= 0 ? x0 : x0 + (reached - 1 + lineP) * step;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top}}>
          <Title text={title} maxW={W0} size={68} vis={pop(t, t0)} />
        </div>
      )}
      <div style={{position: 'absolute', left: st.left + 20, top: ay - 5, width: W0 - 40, height: 10, background: 'rgba(35,40,66,0.12)', borderRadius: 5, opacity: clamp((t - t0) / 0.3)}} />
      <div style={{position: 'absolute', left: x0, top: ay - 5, width: Math.max(0, lineEnd - x0), height: 10, background: C.ink, borderRadius: 5}} />
      {list.map((d, i) => (
        <TPoint key={i} t={t} d={d} x={x0 + i * step} y={ay} up={i % 2 === 0} cardW={Math.min(420, step * 2 - 60)} isNow={nowI === i} nowP={nowP} />
      ))}
    </Out>
  );
};

const TPoint: React.FC<{t: number; d: TimePoint; x: number; y: number; up?: boolean; vertical?: boolean; cardW: number; isNow: boolean; nowP: number}> = ({t, d, x, y, up, vertical, cardW, isNow, nowP}) => {
  if (t < d.at - 0.05) return null;
  const p = pop(t, d.at - 0.05, 240, 14);
  const T = TONE[isNow ? 'coral' : d.tone ?? 'sky'];
  const inner = cardW - 52;
  const dot = (
    <div style={{position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: 44, background: T.main, border: `6px solid ${C.ink}`, boxSizing: 'border-box', transform: `scale(${clamp(p, 0, 1.3) * (1 + 0.25 * (isNow ? nowP : 0))})`, zIndex: 3}} />
  );
  const card = (
    <div style={{width: cardW, boxSizing: 'border-box', background: isNow ? '#FFF6EC' : '#fff', border: `${isNow ? 6 : 4}px solid ${isNow ? C.coral : C.ink}`, borderRadius: 22, padding: '16px 24px 18px', boxShadow: HARD_S, display: 'flex', flexDirection: 'column', alignItems: vertical ? 'flex-start' : 'center', gap: 8}}>
      <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: 30, color: T.text, whiteSpace: 'nowrap'}}>
        <FitText text={d.date} maxW={inner} size={30} min={24} font="ui" weight={900} color={isNow ? C.coral : C.ink2} align={vertical ? 'left' : 'center'} markup={false} who="时间标签" />
      </div>
      <FitText text={d.text} maxW={inner} size={34} min={28} maxLines={2} weight={900} align={vertical ? 'left' : 'center'} who="时间线事件" />
      {d.sub && <FitText text={d.sub} maxW={inner} size={26} min={24} maxLines={1} weight={700} color={C.ink2} align={vertical ? 'left' : 'center'} who="时间线补充" />}
    </div>
  );
  if (vertical) {
    return (
      <>
        {dot}
        <div style={{position: 'absolute', left: x + 50, top: y, transform: `translateY(-50%) translateX(${(1 - clamp(p)) * 40}px)`, opacity: clamp(p * 2)}}>{card}</div>
      </>
    );
  }
  return (
    <>
      <div style={{position: 'absolute', left: x - 2, top: up ? y - 60 : y, width: 4, height: 60, background: C.ink, opacity: clamp(p * 2)}} />
      {dot}
      <div style={{position: 'absolute', left: x, top: up ? y - 56 : y + 56, transform: `translate(-50%, ${up ? '-100%' : '0%'}) translateY(${(1 - clamp(p)) * (up ? 30 : -30)}px)`, opacity: clamp(p * 2)}}>{card}</div>
    </>
  );
};

export const timelineSfx = (p: TimelineProps): Ev[] => [
  ...p.points.slice(0, 6).flatMap((d, i): Ev[] => [...(i > 0 ? [{at: d.at - 0.25, k: 'sweep' as const, vol: 0.15}] : []), {at: d.at, k: 'pop', vol: 0.32}]),
  ...(p.now ? [{at: p.now.at, k: 'chime' as const, vol: 0.3}] : []),
];
