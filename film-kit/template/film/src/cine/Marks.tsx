// 更多元素级的戏：填上（打字、选中后出现）、换底板、扫描标注、数字滚动。
// 和 Acts.tsx 一样，全部放在 <Screen> 里面，用页面坐标。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp} from '../lib/anim';
import {Rect} from './cam';
import {flash, press, run, warn} from './motion';
import {CapEl, CapPage, screenGrade, texOf, useScreen} from './Screen';
import {textEm} from './Type';
import {alpha} from './theme';

// ───────── 填上 ─────────
/** 把成品截图上的一块，盖到当前底板的同一位置：底板上这块是空的，成品上是填好的。
 *  - 写 text：按真人打字的速度从左往右一个字一个字露出来，带输入光标（text 只用来算有几个字、多宽）
 *  - 不写 text：在 at 那一刻出现（下拉框选中了一项） */
export const Fill: React.FC<{
  t: number;
  /** 开始的时刻 */
  at: number;
  /** 输入框、下拉框的元素（el(...)） */
  target: CapEl;
  /** 打出来的字。给了就是打字，不给就是直接出现 */
  text?: string;
  /** 每秒打几个字，默认 6.5（真人速度；再快观众看不清在干什么） */
  cps?: number;
  /** 成品是哪张（默认整页纹理；也可以是另一张底板的名字） */
  from?: string;
}> = ({t, at, target, text, cps = 6.5, from}) => {
  const {page, exposure} = useScreen('Fill');
  const src = staticFile(texOf(page, from));
  const fs = target.fontSize ?? 14;
  const padL = target.padL ?? 10;
  let w = target.w;
  let caret: number | null = null;
  if (text !== undefined) {
    const chars = Array.from(text);
    const n = t < at ? 0 : Math.min(chars.length, Math.floor((t - at) * cps) + 1);
    const typedW = textEm(chars.slice(0, n).join('')) * fs;
    w = n === 0 ? 0 : Math.min(target.w, padL + typedW + 2);
    const done = at + chars.length / cps;
    // 光标：打字前半秒出现，打完后再闪一会儿
    if (t > at - 0.5 && t < done + 1.2) caret = padL + typedW + 1.5;
  } else if (t < at) return null;
  const vis = text === undefined ? run(t, at, 0.18, 'settle') : 1;
  return (
    <>
      {w > 0 && (
        <div
          style={{
            position: 'absolute',
            left: target.x,
            top: target.y,
            width: w,
            height: target.h,
            overflow: 'hidden',
            opacity: vis,
            backgroundImage: `url(${src})`,
            backgroundSize: `${page.w}px ${page.h}px`,
            backgroundPosition: `-${target.x}px -${target.y}px`,
            filter: screenGrade(exposure),
          }}
        />
      )}
      {caret !== null && <div style={{position: 'absolute', left: target.x + caret, top: target.y + target.h * 0.24, width: 1.4, height: target.h * 0.52, background: target.color ?? '#fff', opacity: Math.floor(t * 2.2) % 2 ? 0.25 : 0.95}} />}
    </>
  );
};
/** 打字什么时候打完（接下一个动作用） */
export const fillDone = (at: number, text: string, cps = 6.5) => at + Array.from(text).length / cps;

// ───────── 换底板 ─────────
/** 把另一张底板叠化进来（比如标签页的高亮从一项换到另一项）。放在 Screen 的 inside 里 */
export const PlateFade: React.FC<{t: number; at: number; page: CapPage; plate?: string; dur?: number}> = ({t, at, page, plate, dur = 0.14}) => {
  const p = clamp((t - at) / dur);
  if (p <= 0) return null;
  return <Img src={staticFile(texOf(page, plate))} style={{position: 'absolute', left: 0, top: 0, width: page.w, height: page.h, opacity: p}} />;
};

// ───────── 扫描标注 ─────────
export type ScanTarget = {
  rect: Rect;
  /** 标注：短的机器标签，如 'EXIT · 出口'。前半截（· 之前）加粗 */
  tag: string;
};
/** 扫描线越过第 i 个目标右边缘的时刻 */
export const scanHits = (o: {t0: number; dur: number; targets: ScanTarget[]; pad?: number}) => {
  const pad = o.pad ?? 26;
  const x0 = Math.min(...o.targets.map((g) => g.rect.x)) - pad;
  const x1 = Math.max(...o.targets.map((g) => g.rect.x + g.rect.w)) + pad;
  return o.targets.map((g) => o.t0 + ((g.rect.x + g.rect.w - x0) / (x1 - x0)) * o.dur);
};
/** t 时刻已经扫到几个 */
export const scanCount = (t: number, o: {t0: number; dur: number; targets: ScanTarget[]; pad?: number}) => scanHits(o).filter((h) => t >= h).length;

/** 扫描标注：一条竖线匀速扫过一排元素，扫过谁，谁就被四角取景框收紧框住、贴上标注。
 *  「检测、检查、校验」这类能力就这么演：观众看得见因果——线到了，框才来。
 *  规矩：扫描线必须匀速（它是机器，不加缓动）；框和标注用机器色（theme.info），不用产品强调色。 */
export const Scan: React.FC<{
  t: number;
  /** 扫描线出发的时刻、扫完全程用多久 */
  t0: number;
  dur: number;
  /** 被扫的元素，从左到右排。3–5 个最合适 */
  targets: ScanTarget[];
  pad?: number;
}> = ({t, t0, dur, targets, pad = 26}) => {
  const {theme} = useScreen('Scan');
  if (targets.length > 6) warn('Scan', `一次扫 ${targets.length} 个太多了，观众数不过来，留 3–5 个`);
  const M = theme.info;
  const x0 = Math.min(...targets.map((g) => g.rect.x)) - pad;
  const x1 = Math.max(...targets.map((g) => g.rect.x + g.rect.w)) + pad;
  const y0 = Math.min(...targets.map((g) => g.rect.y)) - 14;
  const y1 = Math.max(...targets.map((g) => g.rect.y + g.rect.h)) + 22;
  const hits = scanHits({t0, dur, targets, pad});
  const x = x0 + (x1 - x0) * clamp((t - t0) / dur); // 匀速
  const lineOn = Math.min(clamp((t - (t0 - 0.12)) / 0.12), 1 - clamp((t - (t0 + dur)) / 0.22));
  return (
    <>
      {lineOn > 0.01 && (
        <>
          <div style={{position: 'absolute', left: x - 90, top: y0, width: 90, height: y1 - y0, opacity: lineOn, background: `linear-gradient(90deg, ${alpha(M, 0)} 0%, ${alpha(M, 0.14)} 100%)`}} />
          <div style={{position: 'absolute', left: x - 0.75, top: y0 - 4, width: 1.5, height: y1 - y0 + 8, opacity: lineOn, background: M, boxShadow: `0 0 6px ${alpha(M, 0.75)}, 0 0 16px ${alpha(M, 0.4)}`, transform: 'translateZ(2px)'}} />
        </>
      )}
      {targets.map((g, i) => {
        const h = hits[i];
        if (t < h) return null;
        const s = press(t - h, 230, 24);
        const gap = 24 * (1 - s) + 3;
        const arm = 7;
        const r = {x: g.rect.x - gap, y: g.rect.y - gap, w: g.rect.w + gap * 2, h: g.rect.h + gap * 2};
        const d = `M${r.x} ${r.y + arm}V${r.y}H${r.x + arm}M${r.x + r.w - arm} ${r.y}H${r.x + r.w}V${r.y + arm}M${r.x + r.w} ${r.y + r.h - arm}V${r.y + r.h}H${r.x + r.w - arm}M${r.x + arm} ${r.y + r.h}H${r.x}V${r.y + r.h - arm}`;
        const lit = flash(t, h + 0.08, 0.08, 0.5);
        const [head, ...rest] = g.tag.split('·');
        const tagAt = h + 0.16;
        const full = rest.length ? `${head.trim()} · ${rest.join('·').trim()}` : head.trim();
        const shown = Array.from(full).slice(0, Math.floor(clamp((t - tagAt) / 0.3) * Array.from(full).length + 0.001)).join('');
        const headLen = head.trim().length;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: g.rect.x, top: g.rect.y, width: g.rect.w, height: g.rect.h, borderRadius: g.rect.h / 2, background: alpha(M, 0.12 * lit), boxShadow: `inset 0 0 0 1px ${alpha(M, 0.55 * lit)}`}} />
            <svg width={10} height={10} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: clamp((t - h) / 0.1)}}>
              <path d={d} fill="none" stroke={M} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t >= tagAt && (
              <div
                style={{
                  position: 'absolute',
                  left: g.rect.x + 2,
                  top: g.rect.y + g.rect.h + 3,
                  height: 13,
                  padding: '0 5px',
                  borderRadius: 3,
                  background: M,
                  color: '#06101f',
                  display: 'flex',
                  alignItems: 'center',
                  whiteSpace: 'pre',
                  fontFamily: theme.font.mono,
                  fontSize: 8.5,
                  fontWeight: 500,
                  opacity: clamp((t - tagAt) / 0.12),
                  transform: 'translateZ(3px)',
                  boxShadow: '0 6px 14px -6px rgba(0,0,0,0.6)',
                }}
              >
                <span style={{fontWeight: 800}}>{shown.slice(0, headLen)}</span>
                <span style={{fontFamily: theme.font.cjk, opacity: 0.85}}>{shown.slice(headLen)}</span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ───────── 数字滚动 ─────────
/** 把 "$441.07" / "4,614" / "83.0%" / "74.6 tok/s" 按进度从 0 数到成品（前后缀、小数位、千分位都照原样） */
export const countTo = (text: string, p: number) => {
  const m = text.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
  if (!m) return text;
  const dec = m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const v = parseFloat(m[2].replace(/,/g, '')) * clamp(p);
  let s = v.toFixed(dec);
  if (m[2].includes(',')) {
    const [a, b] = s.split('.');
    s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? `.${b}` : '');
  }
  return m[1] + s + m[3];
};

/** 数字滚动：界面上的一个数从 0 数到它在截图里的值，字体、字号、颜色都按截图量到的来，和原界面一模一样。
 *  要配一张把这些数字藏掉的底板。数字的元素来自坐标表（el(page, 'values', i)），不用自己填任何样式。 */
export const Roll: React.FC<{t: number; at: number; target: CapEl; dur?: number}> = ({t, at, target, dur = 0.95}) => {
  const {exposure} = useScreen('Roll');
  if (!target.text) {
    warn('Roll', '这个元素在坐标表里没有文字，数不了。检查截图清单里 elements 的选择器是不是选到了数字本身');
    return null;
  }
  const p = run(t, at, dur, 'settle');
  return (
    <div
      style={{
        position: 'absolute',
        left: target.x,
        top: target.y,
        width: target.w + 60,
        height: target.h,
        fontFamily: target.fontFamily,
        fontSize: target.fontSize,
        fontWeight: target.fontWeight as React.CSSProperties['fontWeight'],
        letterSpacing: target.letterSpacing,
        lineHeight: target.lineHeight === 'normal' ? `${target.h}px` : target.lineHeight,
        color: target.color,
        whiteSpace: 'pre',
        fontVariantNumeric: 'tabular-nums',
        opacity: clamp((t - at) / 0.12),
        filter: screenGrade(exposure),
      }}
    >
      {countTo(target.text, p)}
    </div>
  );
};
