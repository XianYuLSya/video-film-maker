// 一卷：把几个镜头按时间接起来，镜头之间用硬转场。整部产品片就是一卷。
//
// 每个镜头写清自己「怎么进来」（enter），接缝的时刻就是这个镜头的 from，应该落在拍上。
// 没有淡入淡出这一种：淡入淡出会把两个镜头糊在一起，画面发虚、节奏发软。
//
//   cut        硬切。暗场进亮场、匹配剪辑（前后两个镜头同一个机位）都用它
//   whipLeft / whipRight / whipUp / whipDown   甩镜：画面朝一个方向甩出去，带着方向模糊，在拍后急停
//   push       推进穿越：上一个镜头朝画面里冲、变糊，切到下一个镜头时它从略大处收回来
//   flood      吞没：上一个镜头被一片颜色吞掉（蓄力），在拍上硬切进下一个镜头。接亮场用
//
// 规矩：一个接缝只用一种；同一种不要连着用两次；全片的甩镜不超过两次。
// 转场进行中的那零点几秒，画面整个标成 data-probe="skip"：东西正在飞，不算排版问题。
import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import {H, W} from '../lib/time';
import {clamp} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {bezier, CURVE, warn} from './motion';

export type CutKind = 'cut' | 'whipLeft' | 'whipRight' | 'whipUp' | 'whipDown' | 'push' | 'flood';

export type ReelShot = {
  id: string;
  /** 这个镜头从哪一秒到哪一秒（写 B(拍号)） */
  from: number;
  to: number;
  C: React.FC<{t: number}>;
  /** 怎么进来。第一个镜头不用写 */
  enter?: CutKind;
  /** push：朝画面上的哪一点冲（画面 px），默认画面中心。推向上一镜头里的某个小东西时用 */
  origin?: [number, number];
  /** flood：吞没用的颜色，默认白 */
  color?: string;
  /** 这个镜头自己的音效 */
  sfx?: () => Ev[];
};

/** 定义一个镜头：只是把对象原样返回，好处是 enter 写错名字编辑器会直接标出来，也不用写 as const */
export const defineShot = (s: ReelShot): ReelShot => s;

// 各种转场在接缝前后各占多久（秒）。接缝时刻 = 下一个镜头的 from
const SPAN: Record<CutKind, [number, number]> = {
  cut: [0, 0],
  whipLeft: [0.3, 0.34],
  whipRight: [0.3, 0.34],
  whipUp: [0.3, 0.34],
  whipDown: [0.3, 0.34],
  push: [0.26, 0.42],
  flood: [0.4, 0.14],
};
// 甩镜的位移曲线：起步慢、中段极快、长尾急停。接缝时刻（拍点）画面已经甩过去一大半，拍后收住
const whipCurve = bezier(0.66, 0, 0.12, 1);

const DirBlur: React.FC<{id: string; x: number; y: number; children: React.ReactNode}> = ({id, x, y, children}) => {
  if (x < 0.5 && y < 0.5) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{filter: `url(#${id})`}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="-12%" y="-12%" width="124%" height="124%">
          <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

export const Reel: React.FC<{t: number; shots: ReelShot[]; fps?: number}> = ({t, shots, fps = 60}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const layers: React.ReactNode[] = [];
  shots.forEach((s, i) => {
    const next = shots[i + 1];
    const kIn: CutKind = i === 0 ? 'cut' : s.enter ?? 'cut';
    const kOut: CutKind = next ? next.enter ?? 'cut' : 'cut';
    if (i > 0 && Math.abs(shots[i - 1].to - s.from) > 1e-3) warn('Reel', `镜头「${s.id}」的 from 和上一个镜头的 to 对不上（差 ${(s.from - shots[i - 1].to).toFixed(3)} 秒），接缝会黑一下或叠一下`);
    if (i > 1 && kIn !== 'cut' && kIn === (shots[i - 1].enter ?? 'cut')) warn('Reel', `「${s.id}」和上一个接缝连用了同一种转场（${kIn}），换一种`);
    const isWhip = (k: CutKind) => k.startsWith('whip');
    // 这个镜头要画的时间范围：甩镜时前后两个镜头要同时在画面里
    const a = s.from - (isWhip(kIn) ? SPAN[kIn][0] : 0);
    const b = s.to + (isWhip(kOut) ? SPAN[kOut][1] : 0);
    if (t < a || t >= b) return;
    let node: React.ReactNode = <s.C t={t} />;

    const whip = (k: CutKind, at: number) => {
      const [pre, post] = SPAN[k];
      const x = clamp((t - (at - pre)) / (pre + post));
      const p = whipCurve(x);
      const dp = (whipCurve(Math.min(1, x + 0.5 / ((pre + post) * fps))) - whipCurve(Math.max(0, x - 0.5 / ((pre + post) * fps)))) * 1; // 每帧走了多少
      const horiz = k === 'whipLeft' || k === 'whipRight';
      const sign = k === 'whipLeft' || k === 'whipUp' ? -1 : 1;
      const span = horiz ? W : H;
      return {p, sign, horiz, span, blur: Math.min(70, dp * span * 0.42)};
    };

    if (isWhip(kIn) && t < s.from + SPAN[kIn][1]) {
      // 进来：从画面外甩进来
      const w = whip(kIn, s.from);
      const off = -w.sign * (1 - w.p) * w.span;
      node = (
        <AbsoluteFill data-probe="skip" style={{transform: w.horiz ? `translateX(${off.toFixed(2)}px)` : `translateY(${off.toFixed(2)}px)`}}>
          <DirBlur id={`w${uid}i${i}`} x={w.horiz ? w.blur : 0} y={w.horiz ? 0 : w.blur}>
            {node}
          </DirBlur>
        </AbsoluteFill>
      );
    } else if (next && isWhip(kOut) && t >= s.to - SPAN[kOut][0]) {
      // 出去：朝同一个方向甩出画面
      const w = whip(kOut, s.to);
      const off = w.sign * w.p * w.span;
      node = (
        <AbsoluteFill data-probe="skip" style={{transform: w.horiz ? `translateX(${off.toFixed(2)}px)` : `translateY(${off.toFixed(2)}px)`}}>
          <DirBlur id={`w${uid}o${i}`} x={w.horiz ? w.blur : 0} y={w.horiz ? 0 : w.blur}>
            {node}
          </DirBlur>
        </AbsoluteFill>
      );
    } else if (kIn === 'push' && t < s.from + SPAN.push[1]) {
      // 进来：从略大、略糊处收回来（上一个镜头在接缝那一帧已经整个换掉，不叠两层）
      const e = CURVE.settle(clamp((t - s.from) / SPAN.push[1]));
      node = <AbsoluteFill data-probe="skip" style={{transform: `scale(${(1.2 - 0.2 * e).toFixed(4)})`, filter: e < 0.995 ? `blur(${(13 * (1 - e)).toFixed(2)}px)` : undefined}}>{node}</AbsoluteFill>;
    } else if (next && kOut === 'push' && t >= s.to - SPAN.push[0]) {
      // 出去：朝画面里冲，越来越快、越来越糊
      const k = CURVE.launch(clamp((t - (s.to - SPAN.push[0])) / SPAN.push[0]));
      const o = next.origin ?? [W / 2, H / 2];
      node = <AbsoluteFill data-probe="skip" style={{transform: `scale(${(1 + 0.42 * k).toFixed(4)})`, transformOrigin: `${o[0]}px ${o[1]}px`, filter: `blur(${(12 * k).toFixed(2)}px)`}}>{node}</AbsoluteFill>;
    } else if (kIn === 'flood' && t < s.from + SPAN.flood[1]) {
      // 进来：接缝后闪一下退掉
      const k = 1 - CURVE.ease(clamp((t - s.from) / SPAN.flood[1]));
      node = (
        <AbsoluteFill>
          {node}
          <AbsoluteFill style={{background: s.color ?? '#ffffff', opacity: 0.5 * k}} />
        </AbsoluteFill>
      );
    } else if (next && kOut === 'flood' && t >= s.to - SPAN.flood[0]) {
      // 出去：被颜色吞没，同时往前推一点，蓄力
      const k = CURVE.launch(clamp((t - (s.to - SPAN.flood[0])) / SPAN.flood[0]));
      node = (
        <AbsoluteFill>
          <AbsoluteFill style={{transform: `scale(${(1 + 0.06 * k).toFixed(4)})`}}>{node}</AbsoluteFill>
          <AbsoluteFill style={{background: next.color ?? '#ffffff', opacity: 0.96 * k}} />
        </AbsoluteFill>
      );
    }
    layers.push(
      <AbsoluteFill key={s.id} style={{isolation: 'isolate'}}>
        {node}
      </AbsoluteFill>,
    );
  });
  return <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>{layers}</AbsoluteFill>;
};

/** 一卷的全部音效：转场的声音（时刻对在接缝上）加上每个镜头自己报的 */
export const reelSfx = (shots: ReelShot[]): Ev[] => {
  const out: Ev[] = [];
  shots.forEach((s, i) => {
    if (i > 0) {
      const k = s.enter ?? 'cut';
      if (k.startsWith('whip')) out.push({at: s.from, k: 'whoosh', vol: 0.34});
      else if (k === 'push') out.push({at: s.from, k: 'air', vol: 0.3});
      else if (k === 'flood') out.push({at: s.from, k: 'sweep', vol: 0.42}, {at: s.from, k: 'bass', vol: 0.34});
    }
    if (s.sfx) out.push(...s.sfx());
  });
  return out;
};
