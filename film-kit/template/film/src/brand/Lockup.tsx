import React from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, clamp, lerp, prog} from './motion';
import {Stage} from './Stage';
import {Reveal, textWidth} from './Text';
import {BF, Theme, alpha} from './theme';

// 品牌片风格包 · 标志锁定（logo lockup）与最终定格
// lockup = 图形 + 字标 (+ 标语) 的标准组合。比例、间距、留白都按字标字号算死，使用者只给一个 size。

/** 图形的画法：在 height 高的盒子里画自己，自带出场动画（从 at 开始） */
export type MarkFn = (p: {t: number; at: number; height: number; color: string}) => React.ReactNode;

export type LockupProps = {
  t: number;
  /** 图形开始出现的时刻 */
  at: number;
  theme: Theme;
  /** 图形（不给就是纯字标） */
  mark?: MarkFn;
  /** 图形宽高比（宽 / 高） */
  markRatio?: number;
  /** 字标文字，如 "FAswitch" */
  name: string;
  /** 标语（可选），一行 */
  tagline?: string;
  /** row：图形在左（默认）；stack：图形在上 */
  layout?: 'row' | 'stack';
  /** 字标字号（px）。row 一般 96–120，stack 一般 80–96 */
  size?: number;
  /** 中心点（画布坐标），默认画面正中略偏上 */
  cx?: number;
  cy?: number;
  /** 字标在图形之后多久出现（秒），默认 1.8。图形会在字标出现前 0.75 秒先开始让位（滑开 / 从上一幕交接），两者不会叠在一起 */
  nameDelay?: number;
  /** 标语在字标之后多久出现（秒），默认 0.8 */
  tagDelay?: number;
  /** row 布局时：图形先居中，字标出现时一起滑到最终位置（默认 true） */
  slide?: boolean;
  /** 画出安全留白框（陈列、交付规范用） */
  guides?: boolean;
  /** 图形相对默认高度的倍数：图形里留白多（比如带 Z 的睡鱼）时调大，让图形和字标看起来一样重，默认 1 */
  markScale?: number;
  /** 字标字重，默认 500（大字 600 以上就显笨） */
  nameWeight?: number;
  /** 图形从上一幕接过来：给出它在上一幕的中心和宽度，图形会从那里缩放、移动到 lockup 的位置（代替 slide） */
  markFrom?: {cx: number; cy: number; width: number};
  /** 标语里 *包起来* 的字画一道主色底衬（官网写法），在标语出现后 0.9 秒划过 */
  tagMark?: boolean;
};

const geom = (p: LockupProps) => {
  const size = p.size ?? 104;
  const layout = p.layout ?? 'row';
  const ratio = p.markRatio ?? 1;
  const markH = p.mark ? (layout === 'row' ? size * 1.05 : size * 1.75) * (p.markScale ?? 1) : 0;
  const markW = markH * ratio;
  const gap = p.mark ? (layout === 'row' ? size * 0.4 : size * 0.42) : 0;
  const nameW = textWidth(p.name, size, p.nameWeight ?? 500, BF.sans, -0.03);
  const tagSize = Math.round(size * 0.42); // 标语缩到手机宽（÷4.9）后还要 ≥ 8px
  return {size, layout, markH, markW, gap, nameW, tagSize};
};

const CJK = /[一-鿿]/;

export const lockupTimes = (p: Pick<LockupProps, 'at' | 'nameDelay' | 'tagDelay' | 'mark'>) => {
  const name = p.at + (p.mark ? p.nameDelay ?? 1.8 : 0);
  const tag = name + (p.tagDelay ?? 0.8);
  return {mark: p.at, move: name - 0.75, name, tag, done: tag + 1.2};
};

export const Lockup: React.FC<LockupProps> = (p) => {
  const {t, theme} = p;
  const g = geom(p);
  const tm = lockupTimes(p);
  const cx = p.cx ?? 960;
  const cy = p.cy ?? 500;
  const row = g.layout === 'row';
  const groupW = row ? g.markW + g.gap + g.nameW : Math.max(g.markW, g.nameW);
  const groupH = row ? Math.max(g.markH, g.size) : g.markH + g.gap + g.size;
  // row 布局：图形先在正中，字标出现时整体滑到位
  const slideP = row && p.slide !== false && p.mark ? prog(t, tm.move, DUR.long, BE.move) : 1;
  const markX0 = cx - g.markW / 2;
  const markX1 = cx - groupW / 2;
  let markX = row ? lerp(markX0, markX1, slideP) : cx - g.markW / 2;
  let markY = row ? cy - g.markH / 2 : cy - groupH / 2;
  let markS = 1;
  if (p.markFrom && p.mark) {
    // 交接：从上一幕的位置和大小，移到最终位置
    const fx = row ? markX1 : cx - g.markW / 2;
    const fy = markY;
    const hp = prog(t, tm.move, DUR.long * 1.05, BE.move);
    const s0 = p.markFrom.width / g.markW;
    markS = lerp(s0, 1, hp);
    markX = lerp(p.markFrom.cx - g.markW / 2, fx, hp);
    markY = lerp(p.markFrom.cy - g.markH / 2, fy, hp);
  }
  const nameX = row ? markX1 + g.markW + g.gap : cx - g.nameW / 2;
  const nameY = row ? cy - g.size * 0.6 : markY + g.markH + g.gap;
  const tagY = cy + groupH / 2 + g.size * 0.78; // 标语在安全留白之外
  const clear = g.size * 0.6;
  const gOp = p.guides ? prog(t, tm.done - 0.6, DUR.base, BE.soft) : 0;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {p.mark && (
        <div style={{position: 'absolute', left: markX, top: markY, width: g.markW, height: g.markH, transform: markS !== 1 ? `scale(${markS})` : undefined}}>
          {p.mark({t, at: tm.mark, height: g.markH, color: theme.ink})}
        </div>
      )}
      <div style={{position: 'absolute', left: nameX, top: nameY, width: g.nameW + 40}}>
        <Reveal
          t={t}
          at={tm.name}
          text={p.name}
          mode={p.mark ? 'mask' : 'track'}
          size={g.size}
          weight={p.nameWeight ?? 500}
          tracking="-0.03em"
          lineHeight={1.2}
          color={theme.ink}
          dur={DUR.long}
        />
      </div>
      {p.tagline && (
        <div style={{position: 'absolute', left: 0, right: 0, top: tagY}}>
          <Reveal t={t} at={tm.tag} text={p.tagline} mode="fade" size={g.tagSize} weight={400} tracking={CJK.test(p.tagline) ? '0.12em' : '0.02em'} color={theme.ink2} align="center" font={CJK.test(p.tagline) ? BF.zh : BF.sans} dur={DUR.long} mark={p.tagMark ? {at: tm.tag + 0.9, color: alpha(theme.accent, theme.mode === 'dark' ? 0.32 : 0.2)} : undefined} />
        </div>
      )}
      {gOp > 0 && (
        <div
          style={{
            position: 'absolute',
            left: cx - groupW / 2 - clear,
            top: cy - groupH / 2 - clear,
            width: groupW + clear * 2,
            height: groupH + clear * 2,
            border: `1px dashed ${theme.line2}`,
            opacity: gOp,
          }}
        >
          <div style={{position: 'absolute', left: 8, top: 6, fontFamily: BF.mono, fontSize: 16, letterSpacing: '0.12em', color: theme.ink3}}>CLEAR SPACE = 0.6 × CAP</div>
        </div>
      )}
    </div>
  );
};

export const lockupSfx = (p: Pick<LockupProps, 'at' | 'nameDelay' | 'tagDelay' | 'mark' | 'tagline'>): Ev[] => {
  const tm = lockupTimes(p);
  const ev: Ev[] = [{at: tm.name + 0.3, k: 'chime', vol: 0.16}];
  if (p.mark) ev.unshift({at: tm.mark + 0.2, k: 'air', vol: 0.12});
  if (p.tagline) ev.push({at: tm.tag + 0.1, k: 'soft', vol: 0.1});
  return ev;
};

/**
 * 最终定格：舞台 + 居中 lockup + 标语 + 可选一行小字。停稳以后什么都不动（只有颗粒和光斑在呼吸），
 * 随便截一帧就是海报。片尾留 ≥ 2 秒定格。
 * <EndFrame t={t} at={s} theme={th} mark={fishMark} markRatio={FISH_RATIO} name="FAswitch" tagline="账号、代理、时区，各归各位。" note="faswitch.example" />
 */
export const EndFrame: React.FC<
  Omit<LockupProps, 'cx' | 'cy'> & {
    /** 最底下一行小字（网址、一句说明），可选 */
    note?: string;
    /** 定格时光斑亮度 0..1 */
    light?: number;
    /** 外面已经铺了 Stage 时传 false */
    stage?: boolean;
  }
> = ({note, light = 0.8, stage = true, ...lp}) => {
  const tm = lockupTimes(lp);
  const body = (
    <>
      <Lockup {...lp} cy={lp.layout === 'stack' ? 470 : 492} />
      {note && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', justifyContent: 'center'}}>
          <Reveal t={lp.t} at={tm.tag + 0.6} text={note} mode="fade" size={26} weight={400} tracking="0.12em" color={lp.theme.ink2} font={CJK.test(note) ? BF.zh : BF.mono} align="center" />
        </div>
      )}
    </>
  );
  if (!stage) return body;
  return (
    <Stage t={lp.t} theme={lp.theme} light={light * clamp(0.4 + prog(lp.t, lp.at, DUR.slow, BE.soft))}>
      {body}
    </Stage>
  );
};
export const endFrameSfx = lockupSfx;
