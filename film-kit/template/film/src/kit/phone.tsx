// 操作章节的共用布局：手机放在右边，左边是「跟着点」步骤栏
import React from 'react';
import {appear, clamp, ease, prog, spring} from '../lib/anim';
import {C as K, F} from '../lib/theme';
import {isZh} from '../lib/time';
import {BEZ, PH, PW} from '../ui/android';
import {Icon} from '../ui/icons';
import type {CamKey} from './cam';

export type PhonePos = {x: number; y: number; s: number};
/** 操作章节里手机的默认位置 */
export const PHONE: PhonePos = {x: 1100, y: 64, s: 0.92};
export const PHONE_CX = PHONE.x + (PW * PHONE.s) / 2;

/** 手机屏幕坐标 → 舞台坐标 */
export const P = (x: number, y: number, ph: PhonePos = PHONE) => ({x: ph.x + (BEZ + x) * ph.s, y: ph.y + (BEZ + y) * ph.s});
/** 屏幕上的一块 → 舞台上的框 */
export const PR = (x: number, y: number, w: number, h: number, ph: PhonePos = PHONE) => {
  const a = P(x, y, ph);
  return {x: a.x, y: a.y, w: w * ph.s, h: h * ph.s};
};

/** 镜头：手机始终在右半边（横向不动），竖向把屏幕上的 py 放到画面 sy 处 */
export const focusY = (py: number, s: number, at: number, dur = 0.8, sy = 540, ph: PhonePos = PHONE): CamKey => {
  const cx = ph.x + (PW * ph.s) / 2;
  const st = P(0, py, ph);
  return {at, x: cx - (PHONE_CX - 960) / s, y: st.y - (sy - 540) / s, s, dur};
};
export const camRest = (at = 0, dur = 0.8): CamKey => ({at, x: 960, y: 540, s: 1, dur});

/** 手机整体入场：从下面升上来 */
export const phoneRise = (t: number, t0: number) => {
  const p = clamp(spring(t - t0, 150, 17));
  return {transform: `translateY(${(1 - p) * 700}px)`, opacity: clamp((t - t0) / 0.25)};
};

// ───────── 左侧步骤栏 ─────────
export type Step = {at: number; text: string; sub?: string};
export const Steps: React.FC<{t: number; steps: Step[]; t0: number; t1?: number; title: string; x?: number; y?: number; w?: number; row?: number; done?: number}> = ({
  t,
  steps,
  t0,
  t1 = Infinity,
  title,
  x = 150,
  y = 170,
  w = 780,
  row = 76,
  done = Infinity,
}) => {
  const vis = appear(t, t0, t1, 0.4, 0.35);
  if (vis <= 0) return null;
  const zh = isZh();
  let cur = -1;
  steps.forEach((s, k) => {
    if (t >= s.at - 0.15) cur = k;
  });
  const allDone = t >= done;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: vis, transform: `translateX(${(1 - vis) * -40}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26}}>
        <div style={{width: 10, height: 40, borderRadius: 5, background: K.coral}} />
        <div style={{fontFamily: F.serif, fontWeight: 900, fontSize: zh ? 44 : 40, color: K.ink, whiteSpace: 'nowrap'}}>{title}</div>
      </div>
      {steps.map((s, k) => {
        const shown = t >= s.at - 0.15;
        const sp = clamp(spring(t - (s.at - 0.15), 230, 17));
        const isCur = k === cur && !allDone;
        const past = k < cur || allDone;
        if (!shown) {
          return (
            <div key={k} style={{height: row, display: 'flex', alignItems: 'center', gap: 18, opacity: 0.22}}>
              <div style={{width: 44, height: 44, borderRadius: 14, border: `3px dashed ${K.ink}`, boxSizing: 'border-box'}} />
              <div style={{width: 260, height: 14, borderRadius: 7, background: K.ink, opacity: 0.25}} />
            </div>
          );
        }
        return (
          <div key={k} style={{height: row, display: 'flex', alignItems: 'center', gap: 18, transform: `translateX(${(1 - sp) * -30}px)`, opacity: clamp(sp * 1.6)}}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                flexShrink: 0,
                background: past ? K.mintDeep : isCur ? K.coral : '#fff',
                border: `3px solid ${past ? K.mintDeep : isCur ? K.coral : K.ink}`,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: F.ui,
                fontWeight: 900,
                fontSize: 22,
                boxSizing: 'border-box',
                boxShadow: isCur ? '0 6px 0 rgba(229,104,63,0.25)' : 'none',
              }}
            >
              {past ? <Icon name="check" size={24} color="#fff" sw={3.4} /> : k + 1}
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0}}>
              <div
                style={{
                  fontFamily: zh ? F.zh : F.sans,
                  fontWeight: isCur ? 900 : 700,
                  fontSize: isCur ? (zh ? 36 : 32) : zh ? 30 : 27,
                  color: isCur ? K.ink : past ? K.ink2 : K.ink,
                  whiteSpace: 'nowrap',
                  lineHeight: 1.15,
                }}
              >
                {s.text}
              </div>
              {s.sub && isCur && <div style={{fontFamily: zh ? F.zh : F.sans, fontWeight: 600, fontSize: zh ? 22 : 20, color: K.coral, whiteSpace: 'nowrap'}}>{s.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 左侧的一张说明卡（标题 + 若干行） */
export const SideCard: React.FC<{t: number; t0: number; t1?: number; x?: number; y?: number; w?: number; children: React.ReactNode}> = ({t, t0, t1 = Infinity, x = 150, y = 230, w = 800, children}) => {
  const vis = appear(t, t0, t1, 0.4, 0.35);
  if (vis <= 0) return null;
  const sp = clamp(spring(t - t0, 190, 16));
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: vis, transform: `translateY(${(1 - sp) * 40}px)`}}>
      {children}
    </div>
  );
};

/** 打勾的一行 */
export const CheckLine: React.FC<{t: number; at: number; text: string; bad?: boolean; size?: number}> = ({t, at, text, bad, size}) => {
  const zh = isZh();
  const on = t >= at;
  const sp = spring(t - at, 260, 13);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: on ? 1 : 0.28}}>
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: on ? (bad ? K.coral : K.mintDeep) : 'rgba(35,40,66,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${on ? 0.8 + 0.2 * clamp(sp) : 1})`,
          flexShrink: 0,
        }}
      >
        <Icon name={bad ? 'x' : 'check'} size={26} color="#fff" sw={3.4} />
      </div>
      <div style={{fontFamily: zh ? F.zh : F.sans, fontWeight: 800, fontSize: size ?? (zh ? 34 : 30), color: K.ink, whiteSpace: 'nowrap'}}>{text}</div>
    </div>
  );
};

export const fadeOut = (t: number, at: number, dur = 0.35) => 1 - prog(t, at, dur, ease.in);
