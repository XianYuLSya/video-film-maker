import React from 'react';
import {clamp, ease, lerp} from '../lib/anim';
import {C} from '../lib/theme';
import type {Ev} from './sfx';

// 光标脚本：一串落点。at 是到达（点击）的时刻；光标提前 travel 秒出发，走带一点弧度的缓动路径。
export type Way = {
  at: number;
  x: number;
  y: number;
  click?: boolean;
  hand?: boolean; // 指到按钮上变小手
  travel?: number;
  silent?: boolean; // 点击不出声
};

const travelOf = (a: Way, b: Way) => {
  if (b.travel) return b.travel;
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return clamp(0.32 + d / 1900, 0.38, 0.95);
};

export const cursorAt = (ways: Way[], t: number) => {
  if (!ways.length) return {x: 0, y: 0, hand: false, press: 0, ripple: -1, rippleX: 0, rippleY: 0};
  let x = ways[0].x;
  let y = ways[0].y;
  let hand = !!ways[0].hand;
  for (let i = 1; i < ways.length; i++) {
    const a = ways[i - 1];
    const b = ways[i];
    const tr = travelOf(a, b);
    const t0 = b.at - tr;
    if (t >= b.at) {
      x = b.x;
      y = b.y;
      hand = !!b.hand;
      continue;
    }
    if (t > t0) {
      const p = ease.inOut(clamp((t - t0) / tr));
      // 弧度：垂直方向偏一点，像手腕划过去
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const arc = Math.sin(p * Math.PI) * Math.min(60, len * 0.12);
      x = lerp(a.x, b.x, p) + (-dy / len) * arc;
      y = lerp(a.y, b.y, p) + (dx / len) * arc;
      hand = p > 0.8 ? !!b.hand : !!a.hand;
    }
    break;
  }
  // 点击：按下 0.07s，弹回 0.12s；波纹 0.5s
  let press = 0;
  let ripple = -1;
  let rippleX = 0;
  let rippleY = 0;
  for (const w of ways) {
    if (!w.click) continue;
    const d = t - w.at;
    if (d > -0.07 && d < 0.14) press = d < 0 ? (d + 0.07) / 0.07 : 1 - d / 0.14;
    if (d >= 0 && d < 0.55) {
      ripple = d / 0.55;
      rippleX = w.x;
      rippleY = w.y;
    }
  }
  return {x, y, hand, press: clamp(press), ripple, rippleX, rippleY};
};

/** 光标脚本里的点击音效 */
export const cursorSfx = (ways: Way[], vol = 0.5): Ev[] =>
  ways.filter((w) => w.click && !w.silent).map((w) => ({at: w.at, k: 'click' as const, vol}));

const Arrow: React.FC = () => (
  <svg width="34" height="40" viewBox="0 0 34 40" style={{display: 'block'}}>
    <path
      d="M3 2 L3 31 L10.5 24.6 L15.8 36.4 L21.2 34 L16 22.6 L26 22.6 Z"
      fill="#fff"
      stroke={C.ink}
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
  </svg>
);

const Hand: React.FC = () => (
  <svg width="36" height="40" viewBox="0 0 36 40" style={{display: 'block'}}>
    <path
      d="M12 4.5c0-1.9 1.4-3.2 3.1-3.2s3.1 1.3 3.1 3.2v11.2c.6-.5 1.4-.8 2.3-.8 1.4 0 2.6.8 3 2 .6-.4 1.3-.6 2.1-.6 1.6 0 2.9 1.1 3.1 2.6.5-.2 1-.3 1.6-.3 1.9 0 3.2 1.4 3.2 3.3v7.4c0 6.3-4.6 10.7-10.9 10.7h-2.6c-3.3 0-5.9-1.3-7.9-3.9L4.4 26.5c-1.1-1.4-.9-3.2.4-4.2 1.3-1 3-.8 4.1.4l3.1 3.5V4.5z"
      fill="#fff"
      stroke={C.ink}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  </svg>
);

/** 光标画在舞台坐标里（跟着镜头一起缩放）。show: 可见度 0..1 */
export const Cursor: React.FC<{ways: Way[]; t: number; show?: number; scale?: number}> = ({ways, t, show = 1, scale = 1}) => {
  if (show <= 0 || !ways.length) return null;
  const c = cursorAt(ways, t);
  const s = scale * (1 - 0.14 * c.press);
  return (
    <>
      {c.ripple >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: c.rippleX,
            top: c.rippleY,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -lerp(10, 52, ease.out(c.ripple)) * scale,
              top: -lerp(10, 52, ease.out(c.ripple)) * scale,
              width: lerp(20, 104, ease.out(c.ripple)) * scale,
              height: lerp(20, 104, ease.out(c.ripple)) * scale,
              borderRadius: '50%',
              border: `${4 * scale * (1 - c.ripple * 0.6)}px solid ${C.coral}`,
              opacity: 0.9 * (1 - c.ripple),
              background: `rgba(229,104,63,${0.18 * (1 - c.ripple)})`,
            }}
          />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: c.x,
          top: c.y,
          transform: `translate(${c.hand ? -11 * scale : -3 * scale}px, ${c.hand ? -2 * scale : -2 * scale}px) scale(${s})`,
          transformOrigin: '0 0',
          opacity: show,
          filter: 'drop-shadow(0 3px 4px rgba(20,24,40,0.35))',
          pointerEvents: 'none',
        }}
      >
        {c.hand ? <Hand /> : <Arrow />}
      </div>
    </>
  );
};
