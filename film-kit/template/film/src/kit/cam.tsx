import React from 'react';
import {clamp, ease, lerp} from '../lib/anim';
import {H, W} from '../lib/time';

// 镜头：舞台是 1920×1080 的坐标系，镜头把 (x, y) 放到画面中心、放大 s 倍。
// keys 按时间排：在 at 时刻开始，用 dur 秒推到这个机位。
export type CamKey = {at: number; x: number; y: number; s: number; dur?: number; e?: (p: number) => number};

export const camAt = (keys: CamKey[], t: number) => {
  let cur = {x: W / 2, y: H / 2, s: 1};
  if (!keys.length) return cur;
  cur = {x: keys[0].x, y: keys[0].y, s: keys[0].s};
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.at) break;
    const dur = k.dur ?? 0.9;
    const p = (k.e ?? ease.inOut)(clamp((t - k.at) / dur));
    // 缩放按对数插值，推拉更自然
    const s = Math.exp(lerp(Math.log(cur.s), Math.log(k.s), p));
    cur = {x: lerp(cur.x, k.x, p), y: lerp(cur.y, k.y, p), s};
  }
  return cur;
};

export const Cam: React.FC<{keys: CamKey[]; t: number; children: React.ReactNode}> = ({keys, t, children}) => {
  const c = camAt(keys, t);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        height: H,
        transformOrigin: '0 0',
        transform: `translate(${W / 2}px, ${H / 2}px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** 舞台坐标 → 画面坐标（给不跟镜头缩放的浮层定位用） */
export const toScreen = (keys: CamKey[], t: number, x: number, y: number) => {
  const c = camAt(keys, t);
  return {x: W / 2 + (x - c.x) * c.s, y: H / 2 + (y - c.y) * c.s, s: c.s};
};
