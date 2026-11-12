import React from 'react';
import {clamp} from '../lib/anim';
import type {Ev} from '../kit/sfx';

export type Scene = {
  id: string;
  range: () => readonly [number, number];
  C: React.FC<{t: number}>;
  sfx: () => Ev[];
  demo?: (t: number) => number;
  /** 整屏自管：这一幕自己铺底，外壳不画纸感底、烧录字幕条、气泡槽和「示意画面」角标。
   *
   * 当前时刻生效的场景里只要有一个 bare: true，外壳就按 bare 画（相邻两幕一个 bare 一个不 bare、
   * 范围重叠淡入淡出时，「有 bare 就全 bare」）。底色变成纯黑 #000，由场景自己铺满；
   * SRT 字幕照常生成，只是不烧进画面 —— 需要字幕的场景自己放。
   * 深色底的品牌片 / 片头用；平常的纸感片子不写这个字段就行。 */
  bare?: boolean;
};

/** 场景首尾淡入淡出 */
export const edge = (t: number, a: number, b: number, fin = 0.35, fout = 0.35) => Math.min(clamp((t - a) / fin), clamp((b - t) / fout));

/** 在 [a, b) 区间内可见（含淡入淡出） */
export const span = (t: number, a: number, b: number, fin = 0.3, fout = 0.3) => (t < a - 0.001 || t > b + fout ? 0 : Math.min(clamp((t - a) / fin), clamp((b + fout - t) / fout)));

export const Layer: React.FC<{vis: number; children: React.ReactNode; style?: React.CSSProperties}> = ({vis, children, style}) =>
  vis <= 0 ? null : <div style={{position: 'absolute', inset: 0, opacity: clamp(vis), ...style}}>{children}</div>;
