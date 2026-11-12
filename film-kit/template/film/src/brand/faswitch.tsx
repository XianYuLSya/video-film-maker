import React from 'react';
import type {Ev} from '../kit/sfx';
import {DrawPaths, Stroke, drawPathsSfx, polyPath, smoothPath} from './Line';
import type {MarkFn} from './Lockup';
import {BE, DUR, drift, prog} from './motion';
import {makeTheme} from './theme';

// FAswitch 的品牌素材：徽标（照 sleepy-fish-mark-1024.png 逐点描的单笔粗墨线）和两套配色。
// 风格包的其他组件都不认识 FAswitch；换品牌时只换这一个文件。

/** 官网（distribution/site/assets/site.css）的颜色，加产品界面的森绿 */
export const FA = {
  paper: '#F5F1E8', // --paper 官网底
  paper2: '#EFE9DC', // --paper-2
  moon: '#EBE3D2', // --moon 首页月亮
  ink: '#1F1D1A', // --ink 徽标墨线
  ink2: '#4B473F',
  ink3: '#6E695E',
  moss: '#3F6B52', // --moss 官网强调
  green: '#2B8A57', // 产品界面森绿
  night: '#101412', // 品牌片夜色底（墨色压暗、带一点绿）
  nightInk: '#EDE6D8', // 夜色上的「纸色」墨线
};

/** 夜：深底，光斑是很淡的森绿和月色 */
export const faNight = {
  ...makeTheme({mode: 'dark', accent: FA.green, bg: FA.night, ink: FA.nightInk}),
  accentInk: '#63C892', // 夜里的森绿再亮一档：全片第一次出现的颜色，要一眼看见
  pool: ['rgba(43,138,87,0.16)', 'rgba(235,227,210,0.05)'] as [string, string],
};
/** 纸：官网的米白，墨色就是徽标的墨 */
export const faPaper = {
  ...makeTheme({mode: 'light', accent: FA.green, bg: FA.paper, ink: FA.ink}),
  ink2: FA.ink2,
  ink3: FA.ink3,
};

// ───────── 徽标路径（坐标 = 1024 原图坐标，viewBox 裁到鱼和 Z） ─────────
export const FISH_VIEWBOX = '120 330 770 380';
export const FISH_RATIO = 770 / 380;
/** 原图线宽 22px（1024 画布），描线时按比例缩放 */
export const FISH_STROKE = 22;

const BODY_TOP: [number, number][] = [
  [808, 541], [830, 528], [852, 521], [862, 509], [852, 495], [826, 483], [800, 470], [776, 462], [740, 455], [700, 452], [650, 454],
  [600, 459], [548, 466], [500, 472], [452, 480], [404, 490], [368, 502], [332, 518], [296, 534], [260, 546], [224, 556], [190, 574],
  [166, 600], [150, 628], [149, 647], [164, 654], [182, 642], [197, 621],
];
const BODY_BOTTOM: [number, number][] = [
  [197, 621], [203, 648], [210, 672], [220, 681], [232, 670], [246, 640], [262, 614], [286, 598], [316, 592], [360, 595], [416, 602],
  [476, 610], [536, 614], [596, 616], [656, 612], [704, 607], [752, 598], [790, 587], [820, 575], [849, 558],
];
const LIP: [number, number][] = [[849, 558], [828, 550], [808, 541]];
const FIN: [number, number][] = [[486, 468], [486, 442], [500, 427], [520, 426], [548, 437], [586, 456]];
const EYE: [number, number][] = [[708, 514], [776, 509]];
const ZED: [number, number][] = [[804, 377], [848, 362], [812, 405], [862, 400]];

export const FISH_PATHS = {
  bodyTop: smoothPath(BODY_TOP),
  bodyBottom: smoothPath(BODY_BOTTOM),
  lip: smoothPath(LIP),
  fin: smoothPath(FIN),
  eye: polyPath(EYE),
  z: polyPath(ZED),
};

/** 描线顺序：嘴 → 背 → 尾 → 腹 → 下唇（一笔绕身），再背鳍、闭着的眼，最后 Z */
export const fishStrokes = (): Stroke[] => [
  {d: FISH_PATHS.bodyTop, weight: 1.15},
  {d: FISH_PATHS.bodyBottom, weight: 0.95},
  {d: FISH_PATHS.lip, weight: 0.12},
  {d: FISH_PATHS.fin, weight: 0.3},
  {d: FISH_PATHS.eye, weight: 0.16},
];

/**
 * 睡鱼徽标。默认用 2.4 秒一笔描出来，Z 最后浮出并一直慢慢上下飘。
 * - draw=false：直接是完整的静态徽标（定格、角标用）
 * - width：显示宽度（px）；高度 = width / FISH_RATIO
 * - lineScale：线宽倍数（1 = 原图比例；画面很小时可以 1.1–1.2 防止发虚）
 */
export const FishMark: React.FC<{
  t: number;
  at: number;
  width: number;
  color: string;
  dur?: number;
  draw?: boolean;
  glow?: boolean | number;
  glint?: boolean;
  lineScale?: number;
  zDelay?: number;
}> = ({t, at, width, color, dur = 2.4, draw = true, glow, glint, lineScale = 1, zDelay}) => {
  const strokes = fishStrokes();
  const zAt = at + (draw ? zDelay ?? dur * 0.92 : 0);
  const zp = draw ? prog(t, zAt, DUR.long, BE.out) : 1;
  const zy = (1 - zp) * 18 + drift(t, 5, 4.2);
  const zo = draw ? zp : 1;
  return (
    <div style={{position: 'relative', width, height: width / FISH_RATIO}}>
      <DrawPaths
        t={draw ? t : at + 999}
        at={at}
        dur={dur}
        strokes={strokes}
        viewBox={FISH_VIEWBOX}
        width={width}
        color={color}
        lineWidth={FISH_STROKE * lineScale}
        overlap={0.08}
        glow={glow}
        glint={glint}
        glintColor="#FFFFFF"
      />
      <svg width={width} height={width / FISH_RATIO} viewBox={FISH_VIEWBOX} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path
          d={FISH_PATHS.z}
          fill="none"
          stroke={color}
          strokeWidth={FISH_STROKE * lineScale * 0.92}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={zo}
          transform={`translate(${(1 - zp) * -6} ${zy})`}
        />
      </svg>
    </div>
  );
};
export const fishMarkSfx = (p: {at: number; dur?: number; glint?: boolean}): Ev[] => [
  ...drawPathsSfx({at: p.at, dur: p.dur ?? 2.4, strokes: fishStrokes(), overlap: 0.08, glint: p.glint}),
  {at: p.at + (p.dur ?? 2.4) * 0.92 + 0.3, k: 'sparkle', vol: 0.08},
];

/** 给 Lockup 用的图形函数：<Lockup mark={fishMarkFn()} markRatio={FISH_RATIO} … /> */
export const fishMarkFn =
  (o: {draw?: boolean; dur?: number} = {}): MarkFn =>
  ({t, at, height, color}) => <FishMark t={t} at={at} width={height * FISH_RATIO} color={color} draw={o.draw ?? true} dur={o.dur ?? 2.0} lineScale={1.05} />;
