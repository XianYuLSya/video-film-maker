import React from 'react';
import {Img, staticFile} from 'remotion';
import {appear, clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Burst, Circle, Icon, SpeedLines, Stamp, Tag, Title} from './atoms';
import {C, F, FitText, HARD, Out, Slot, Tone, fit, innerW, pop, slotBox, stageOf} from './core';

// ═════════ 图片展示 · 截图墙 · 文字截图 · 梗图整活 ═════════

/** 图片来源：public 下的路径，或者一个画图函数（给定宽高，画一张代码做的「图」） */
export type PicSrc = {src?: string; render?: (w: number, h: number) => React.ReactNode};

const Pic: React.FC<PicSrc & {w: number; h: number; fit?: 'cover' | 'contain'}> = ({src, render, w, h, fit: f = 'cover'}) => {
  if (render) return <div style={{position: 'relative', width: w, height: h, overflow: 'hidden'}}>{render(w, h)}</div>;
  if (src) return <Img src={staticFile(src)} style={{width: w, height: h, objectFit: f, display: 'block'}} />;
  return <div style={{width: w, height: h, background: C.paper2}} />;
};

// ───────── 图片展示 ─────────
export type ZoomKey = {
  /** 开始推的时刻（推 0.8 秒） */
  at: number;
  /** 推到图上哪一点（0..1，相对图片宽高） */
  x: number;
  y: number;
  /** 放大倍数，1 是原图 */
  s: number;
};
export type PicCircle = {
  at: number;
  t1?: number;
  /** 圈的范围（0..1，相对图片宽高） */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 圈旁边的说明 */
  label?: string;
};
export type ImageShowProps = PicSrc & {
  t0: number;
  t1?: number;
  /** 图片宽高比（宽/高），必须给对，缺省 16/9 */
  ratio?: number;
  /** 相框下方的题注 */
  caption?: string;
  /** 相框左上角的标签，如「B站热梗」「群友截图」 */
  tag?: string;
  tagTone?: Tone;
  /** 推近：按时间推到某一点 */
  zoom?: ZoomKey[];
  /** 圈出某一块 */
  circles?: PicCircle[];
  slot?: Slot;
  /** 相框倾斜角度，缺省 -1 */
  rot?: number;
  vertical?: boolean;
};

const camOf = (keys: ZoomKey[], t: number) => {
  let cur = {x: 0.5, y: 0.5, s: 1};
  for (const k of keys) {
    if (t <= k.at) break;
    const p = ease.inOut(clamp((t - k.at) / 0.8));
    cur = {x: lerp(cur.x, k.x, p), y: lerp(cur.y, k.y, p), s: Math.exp(lerp(Math.log(cur.s), Math.log(Math.max(1, k.s)), p))};
  }
  // 不露出图外
  const half = 0.5 / cur.s;
  return {x: clamp(cur.x, half, 1 - half), y: clamp(cur.y, half, 1 - half), s: cur.s};
};

/** 图片展示：一张截图或插画，带相框和题注，可推近、可圈出一块 */
export const ImageShow: React.FC<ImageShowProps & {t: number}> = ({t, t0, t1, src, render, ratio = 16 / 9, caption, tag, tagTone = 'coral', zoom = [], circles = [], slot = 'center', rot = -1, vertical}) => {
  const st = stageOf(vertical);
  const box = slotBox(slot, st);
  const pad = 16;
  const capH = caption ? 96 : 0;
  const maxW = box.w - pad * 2 - 10;
  const maxH = st.bottom - st.top - pad * 2 - capH - 20;
  let iw = maxW;
  let ih = iw / ratio;
  if (ih > maxH) {
    ih = maxH;
    iw = ih * ratio;
  }
  const fw = iw + pad * 2;
  const fh = ih + pad * 2 + capH;
  const fx = box.x + (box.w - fw) / 2;
  const fy = st.top + (st.bottom - st.top - fh) / 2;
  const p = pop(t, t0, 190, 15);
  const cam = camOf(zoom, t);
  const toScr = (x: number, y: number) => ({x: (x - cam.x) * cam.s * iw + iw / 2, y: (y - cam.y) * cam.s * ih + ih / 2});
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: fx, top: fy, width: fw, height: fh, transform: `rotate(${rot}deg) scale(${lerp(0.85, 1, clamp(p))})`, opacity: clamp(p * 2)}}>
        <div style={{position: 'absolute', inset: 0, background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 26, boxShadow: HARD, boxSizing: 'border-box'}} />
        <div style={{position: 'absolute', left: pad, top: pad, width: iw, height: ih, borderRadius: 14, overflow: 'hidden', border: `3px solid ${C.ink}`, boxSizing: 'border-box', background: C.paper2}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: iw, height: ih, transformOrigin: '0 0', transform: `translate(${iw / 2}px, ${ih / 2}px) scale(${cam.s}) translate(${-cam.x * iw}px, ${-cam.y * ih}px)`}}>
            <Pic src={src} render={render} w={iw} h={ih} />
          </div>
        </div>
        <div style={{position: 'absolute', left: pad, top: pad, width: iw, height: ih}}>
          {circles.map((c, k) => {
            const a = toScr(c.x, c.y);
            const b = toScr(c.x + c.w, c.y + c.h);
            const lv = appear(t, c.at + 0.3, c.t1 ?? Infinity, 0.25, 0.25);
            const below = b.y + 90 < ih;
            return (
              <React.Fragment key={k}>
                <Circle t={t} at={c.at} t1={c.t1} x={a.x} y={a.y} w={b.x - a.x} h={b.y - a.y} sw={6} />
                {c.label && lv > 0 && (
                  <div style={{position: 'absolute', left: clamp((a.x + b.x) / 2, 120, iw - 120), top: below ? b.y + 22 : a.y - 22, transform: `translate(-50%, ${below ? 0 : -100}%)`, zIndex: 30}}>
                    <Tag text={c.label} tone="coral" size={32} vis={pop(t, c.at + 0.3, 260, 14)} maxW={Math.min(700, iw - 40)} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        {caption && (
          <div style={{position: 'absolute', left: pad, top: pad + ih, width: iw, height: capH, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <FitText text={`「${caption}」`} maxW={iw - 40} size={44} min={28} font="smiley" align="center" style={{width: 'auto'}} lh={1.15} who="图片题注" />
          </div>
        )}
        {tag && (
          <div style={{position: 'absolute', left: -24, top: -30}}>
            <Tag text={tag} tone={tagTone} size={34} rot={-6} vis={pop(t, t0 + 0.2, 260, 13)} />
          </div>
        )}
      </div>
    </Out>
  );
};

export const imageShowSfx = (p: ImageShowProps): Ev[] => [
  {at: p.t0 + 0.03, k: 'slide', vol: 0.3},
  ...(p.tag ? [{at: p.t0 + 0.22, k: 'pop' as const, vol: 0.3}] : []),
  ...(p.zoom ?? []).map((z): Ev => ({at: z.at + 0.4, k: z.s >= 1.01 ? 'zin' : 'zout', vol: 0.22})),
  ...(p.circles ?? []).map((c): Ev => ({at: c.at + 0.05, k: 'marker', vol: 0.3})),
];

// ───────── 截图墙 ─────────
export type Shot = PicSrc & {
  /** 拍上墙的时刻 */
  at: number;
  /** 宽高比（宽/高） */
  ratio: number;
  /** 截图上的小标签，如「出狱」「满血」 */
  label?: string;
  labelTone?: 'coral' | 'mint';
};
export type ShotWallProps = {
  t0: number;
  t1?: number;
  /** 墙的标题（左上） */
  title?: string;
  /** 标题后的小章，如「真实截图」 */
  badge?: string;
  /** 最多 6 张 */
  shots: Shot[];
  vertical?: boolean;
};

// 预排的落点（中心，0..1）和角度：确定性的「随手贴」
const SPOTS: Record<number, [number, number, number][]> = {
  1: [[0.5, 0.52, -2]],
  2: [[0.3, 0.5, -4], [0.7, 0.54, 3.5]],
  3: [[0.2, 0.46, -4], [0.5, 0.58, 2.5], [0.8, 0.46, -2]],
  4: [[0.22, 0.32, -3.5], [0.72, 0.3, 3], [0.3, 0.74, 2.5], [0.76, 0.72, -3]],
  5: [[0.18, 0.32, -3.5], [0.5, 0.28, 2], [0.82, 0.34, -2.5], [0.33, 0.74, 3], [0.67, 0.74, -3]],
  6: [[0.18, 0.3, -3.5], [0.5, 0.27, 2], [0.82, 0.32, -2.5], [0.18, 0.74, 2.5], [0.5, 0.76, -3], [0.82, 0.72, 3.5]],
};
const SPOTS_V: Record<number, [number, number, number][]> = {
  1: [[0.5, 0.5, -2]],
  2: [[0.45, 0.28, -3], [0.55, 0.72, 3]],
  3: [[0.42, 0.2, -3], [0.58, 0.5, 2.5], [0.44, 0.8, -2]],
  4: [[0.3, 0.24, -3], [0.7, 0.36, 3], [0.32, 0.64, 2.5], [0.68, 0.78, -3]],
  5: [[0.3, 0.17, -3], [0.7, 0.3, 3], [0.32, 0.5, 2], [0.68, 0.66, -2.5], [0.4, 0.84, 3]],
  6: [[0.3, 0.16, -3], [0.7, 0.28, 3], [0.3, 0.44, 2], [0.7, 0.58, -2.5], [0.3, 0.74, 3], [0.7, 0.86, -2]],
};

/** 截图墙：多张聊天截图或评论歪着贴一墙，带胶带，一张张拍上去 */
export const ShotWall: React.FC<ShotWallProps & {t: number}> = ({t, t0, t1, title, badge, shots, vertical}) => {
  const st = stageOf(vertical);
  const list = shots.slice(0, 6);
  const n = list.length;
  const titleH = title ? 120 : 0;
  const top = st.top + titleH;
  const H0 = st.bottom - top;
  const W0 = innerW(st);
  const spots = (vertical ? SPOTS_V : SPOTS)[Math.max(1, n)];
  // 每张的尺寸上限
  const capW = vertical ? (n <= 2 ? 820 : 560) : n === 1 ? 1100 : n === 2 ? 760 : n === 3 ? 520 : 600;
  const capH = vertical ? (n <= 2 ? 560 : (H0 / Math.ceil(n / 1)) * 1.5) : n <= 3 ? H0 - 40 : H0 / 2 - 10;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: st.left, top: st.top, display: 'flex', alignItems: 'center', gap: 24}}>
          <Title text={title} maxW={W0 - (badge ? 260 : 0)} size={68} vis={pop(t, t0)} />
          {badge && <Tag text={badge} tone="mint" size={32} solid={false} rot={-4} vis={pop(t, t0 + 0.2)} />}
        </div>
      )}
      {list.map((s, i) => {
        if (t < s.at - 0.02) return null;
        const [ux, uy, rot] = spots[i];
        let w = capW;
        let h = w / s.ratio;
        if (h > capH) {
          h = capH;
          w = h * s.ratio;
        }
        const cx = clamp(st.left + ux * W0, st.left + w / 2, st.right - w / 2);
        const cy = clamp(top + uy * H0, top + h / 2 + 10, st.bottom - h / 2 - 10);
        const p = prog(t, s.at - 0.02, 0.22, ease.out);
        const settle = pop(t, s.at, 400, 18);
        return (
          <div key={i} style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `rotate(${rot + (1 - p) * 8}deg) scale(${lerp(1.35, 1, p) * (2 - clamp(settle, 0.9, 1.1)) ** 0.2})`, opacity: clamp(p * 3), zIndex: 2 + i}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', border: '8px solid #fff', boxShadow: `0 0 0 4px ${C.ink}, 0 14px 0 rgba(35,40,66,0.14), 0 28px 50px rgba(35,40,66,0.2)`}}>
              <Pic src={s.src} render={s.render} w={w - 16} h={h - 16} />
            </div>
            {/* 胶带 */}
            <div style={{position: 'absolute', left: -20, top: -16, width: 120, height: 38, background: 'rgba(245,192,74,0.78)', transform: 'rotate(-28deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.08)'}} />
            <div style={{position: 'absolute', right: -20, top: -16, width: 120, height: 38, background: 'rgba(245,192,74,0.78)', transform: 'rotate(26deg)', boxShadow: '0 2px 4px rgba(0,0,0,0.08)'}} />
            {s.label && (
              <div style={{position: 'absolute', right: -16, bottom: -22}}>
                <Tag text={s.label} tone={s.labelTone ?? 'mint'} size={34} rot={-5} vis={pop(t, s.at + 0.25, 280, 12)} />
              </div>
            )}
          </div>
        );
      })}
    </Out>
  );
};

export const shotWallSfx = (p: ShotWallProps): Ev[] => [
  ...(p.title ? [{at: p.t0 + 0.02, k: 'swoosh' as const, vol: 0.22}] : []),
  ...p.shots.slice(0, 6).flatMap((s): Ev[] => [{at: s.at + 0.2, k: 'staple', vol: 0.35}, ...(s.label ? [{at: s.at + 0.28, k: 'pop' as const, vol: 0.28}] : [])]),
];

// ───────── 文字截图（评论 / 群聊原话做成截图样） ─────────
export type TextShotLine = {who?: string; text: string; me?: boolean; likes?: number};
export type TextShotProps = {
  /** chat：群聊气泡样；comment：视频评论区样 */
  kind?: 'chat' | 'comment';
  lines: TextShotLine[];
  w: number;
  h: number;
};
/** 把原话排成截图的样子（给 ShotWall / ImageShow 的 render 用）。只放真实原话，去掉昵称头像 */
export const TextShot: React.FC<TextShotProps> = ({kind = 'chat', lines, w, h}) => {
  const pad = 26;
  const size = 30;
  let y = pad;
  const rows = lines.map((l) => {
    const maxW = kind === 'chat' ? w * 0.72 - 40 : w - pad * 2 - 80;
    const f = fit({text: l.text, maxW, size, min: 24, maxLines: 4, who: '文字截图'}, 1.35);
    const top = y;
    const rh = (kind === 'chat' ? 34 : 40) + f.h + (kind === 'chat' ? 26 : 50);
    y += rh;
    return {l, f, top, maxW, rh};
  });
  return (
    <div data-probe="skip" style={{position: 'absolute', inset: 0, background: kind === 'chat' ? '#F2F3F5' : '#fff', overflow: 'hidden'}}>
      {rows.map(({l, f, top, maxW}, i) =>
        top + 60 > h ? null : kind === 'chat' ? (
          <div key={i} style={{position: 'absolute', top, left: l.me ? undefined : pad, right: l.me ? pad : undefined, display: 'flex', flexDirection: l.me ? 'row-reverse' : 'row', gap: 14, alignItems: 'flex-start'}}>
            <div style={{width: 52, height: 52, borderRadius: 52, background: l.me ? '#9BC4F0' : '#D9D3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <Icon name="user" size={30} color="#fff" sw={2.6} />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: l.me ? 'flex-end' : 'flex-start', gap: 4}}>
              <div style={{fontFamily: F.zh, fontSize: 22, fontWeight: 600, color: '#8A8F99'}}>{l.who ?? '群友'}</div>
              <div style={{background: l.me ? '#0099FF' : '#fff', color: l.me ? '#fff' : '#1F2329', borderRadius: 16, padding: '12px 20px'}}>
                <FitText text={l.text} maxW={maxW} size={size} min={24} maxLines={4} weight={600} color={l.me ? '#fff' : '#1F2329'} style={{width: Math.min(maxW, f.w + 2)}} lh={1.35} />
              </div>
            </div>
          </div>
        ) : (
          <div key={i} style={{position: 'absolute', top, left: pad, right: pad, display: 'flex', gap: 18, borderBottom: '1.5px solid #E7E7E7', paddingBottom: 14}}>
            <div style={{width: 56, height: 56, borderRadius: 56, background: '#D9D3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <Icon name="user" size={32} color="#fff" sw={2.6} />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{fontFamily: F.zh, fontSize: 24, fontWeight: 700, color: '#FB7299'}}>{l.who ?? '观众'}</div>
              <FitText text={l.text} maxW={maxW} size={size} min={24} maxLines={4} weight={600} color="#18191C" lh={1.35} />
              <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.ui, fontSize: 22, color: '#9499A0'}}>
                <Icon name="thumb" size={22} color="#9499A0" />
                {l.likes ?? 0}
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
};

// ───────── 梗图整活 ─────────
export type MemeProps = PicSrc & {
  t0: number;
  t1?: number;
  /** 宽高比（宽/高） */
  ratio?: number;
  /** full：铺满；left / right：图占半屏，大字在另一半 */
  layout?: 'full' | 'left' | 'right';
  /** 冲击大字（full 时压在图的上沿，半屏时放在另一半） */
  text?: string;
  /** 第二行大字（full 时压在图的下沿） */
  text2?: string;
  /** 大字砸下来的时刻，缺省 t0+0.3 */
  at?: number;
  /** 集中线（默认开） */
  lines?: boolean;
  burst?: {at: number; text: string; x?: number; y?: number};
  stamp?: {at: number; text: string; tone?: 'coral' | 'mint'};
  vertical?: boolean;
};

/** 梗图整活：一张图铺满或半屏，加冲击大字、集中线、爆炸气泡、盖章 */
export const Meme: React.FC<MemeProps & {t: number}> = ({t, t0, t1, src, render, ratio = 16 / 9, layout = 'full', text, text2, at, lines = true, burst, stamp, vertical}) => {
  const st = stageOf(vertical);
  const hit = at ?? t0 + 0.3;
  const half = layout !== 'full' && !vertical;
  const inImage = layout === 'full';
  const areaW = half ? innerW(st) * 0.5 : innerW(st);
  const areaH = st.bottom - st.top - (vertical && layout !== 'full' ? 380 : 0);
  let w = areaW;
  let h = w / ratio;
  if (h > areaH) {
    h = areaH;
    w = h * ratio;
  }
  const ax = half ? (layout === 'left' ? st.left : st.right - areaW) : st.left;
  const x = ax + (areaW - w) / 2;
  const y = st.top + (areaH - h) / 2;
  const p = pop(t, t0, 220, 14);
  const d = t - hit;
  const shake = d >= 0 && d < 0.25 ? Math.sin(d * 80) * (1 - d / 0.25) * 12 : 0;
  const punch = d >= 0 ? 1 + 0.06 * Math.exp(-d * 9) : 1;
  const tp = pop(t, hit, 300, 13);
  const capSize = vertical ? 92 : 104;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const sideX = layout === 'left' ? st.left + areaW + 40 : st.left;
  const sideW = innerW(st) - areaW - 40;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {lines && <SpeedLines t={t} vis={appear(t, hit, Infinity, 0.12) * 0.16} cx={cx} cy={cy} inner={Math.min(w, h) * 0.42} vertical={vertical} />}
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `translate(${shake}px, ${shake * 0.5}px) rotate(${half ? (layout === 'left' ? -1.5 : 1.5) : -0.6}deg) scale(${lerp(0.8, 1, clamp(p)) * punch})`, opacity: clamp(p * 2)}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 22, overflow: 'hidden', border: `6px solid ${C.ink}`, background: C.paper2, boxShadow: HARD}}>
          <Pic src={src} render={render} w={w - 12} h={h - 12} />
        </div>
        {inImage && text && d >= 0 && (
          <div style={{position: 'absolute', left: 0, right: 0, top: 24, display: 'flex', justifyContent: 'center', transform: `scale(${lerp(1.8, 1, clamp(tp))}) rotate(-2deg)`, opacity: clamp(tp * 3)}}>
            <FitText text={text} maxW={w - 80} size={capSize} min={56} maxLines={2} font="smiley" color="#fff" em={C.sun} align="center" stroke={`${capSize * 0.16}px ${C.ink}`} lh={1.12} shadow="0 8px 0 rgba(35,40,66,0.3)" who="梗图大字" />
          </div>
        )}
        {inImage && text2 && d >= 0.35 && (
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', transform: `scale(${lerp(1.8, 1, clamp(pop(t, hit + 0.35, 300, 13)))}) rotate(1.5deg)`}}>
            <FitText text={text2} maxW={w - 80} size={capSize * 0.86} min={52} maxLines={2} font="smiley" color="#fff" em={C.sun} align="center" stroke={`${capSize * 0.14}px ${C.ink}`} lh={1.12} shadow="0 8px 0 rgba(35,40,66,0.3)" who="梗图大字" />
          </div>
        )}
      </div>
      {!inImage && text && d >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: vertical ? st.left : sideX,
            top: vertical ? y + h + 50 : st.cy - 150,
            width: vertical ? innerW(st) : sideW,
            transform: `scale(${lerp(1.6, 1, clamp(tp))}) rotate(-3deg)`,
            opacity: clamp(tp * 3),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <FitText text={text} maxW={vertical ? innerW(st) : sideW} size={vertical ? 100 : 120} min={60} maxLines={3} font="smiley" align="center" lh={1.12} who="梗图大字" />
          {text2 && <FitText text={text2} maxW={vertical ? innerW(st) : sideW} size={56} min={36} maxLines={2} font="smiley" color={C.coral} align="center" lh={1.15} who="梗图大字" />}
        </div>
      )}
      {burst && <Burst t={t} at={burst.at} text={burst.text} x={burst.x ?? (half ? (layout === 'left' ? x + w * 0.85 : x + w * 0.15) : x + w * 0.82)} y={burst.y ?? (half ? y + h * 0.15 : y + h * 0.3)} size={vertical ? 58 : 64} />}
      {stamp && <Stamp t={t} at={stamp.at} text={stamp.text} tone={stamp.tone ?? 'coral'} size={vertical ? 80 : 96} x={half ? x + w * 0.3 : x + w * 0.2} y={half ? y + h * 0.82 : y + h * 0.7} rot={-12} />}
    </Out>
  );
};

export const memeSfx = (p: MemeProps): Ev[] => {
  const hit = p.at ?? p.t0 + 0.3;
  return [
    {at: p.t0 + 0.02, k: 'zoom', vol: 0.28},
    ...(p.text ? ([{at: hit, k: 'bass', vol: 0.42}, {at: hit + 0.02, k: 'stamp', vol: 0.3}] as Ev[]) : []),
    ...(p.text2 ? [{at: hit + 0.36, k: 'stamp' as const, vol: 0.32}] : []),
    ...(p.burst ? ([{at: p.burst.at, k: 'poof', vol: 0.4}] as Ev[]) : []),
    ...(p.stamp ? ([{at: p.stamp.at + 0.12, k: 'stamp', vol: 0.45}] as Ev[]) : []),
  ];
};
