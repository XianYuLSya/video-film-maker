// 多页纵深：把几页界面排成一列伸向远处，镜头横移、拉远。「这是一整套」的全貌镜头。
//
// 这是一个单独的三维世界（不是 <Screen> 的机位）：几块屏斜着排开，脚下有反光的地面，头顶一排顶光。
// 镜头用 view 描述：盯着第几页（可以是小数，1.5 = 第 1、2 页中间）、离多远、偏多少度。
// 这场戏要有分量：最前面那页必须够大、够亮（缩到手机宽度还认得出是什么），后面的页一层层暗下去。
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {H, W} from '../lib/time';
import {lerp} from '../lib/anim';
import {Curve, curve, safe, warn} from './motion';
import {BLOOM_PASS, CapPage, screenGrade, texOf} from './Screen';
import {CineTheme, alpha, luma} from './theme';

export type PagesView = {
  /** 盯着第几页（0 是最前面那页；可以是小数） */
  at: number;
  /** 镜头离盯着的那一点多远（世界 px）。600 很近，2400 能看到全貌；负数是贴上去的特写（-1500 时那一点放大到约 2.7 倍，冲向某个小东西时用） */
  dist: number;
  /** 镜头绕竖轴偏多少度（负值 = 从左边看过去），-30–10 */
  yaw: number;
  /** 俯仰（正值 = 略微俯视），0–12 */
  pitch: number;
  /** 盯着的点在那一页上的位置（0..1，默认页面中心） */
  u?: number;
  v?: number;
};
export type PagesKey = {at: number; view: PagesView; ease?: Curve};

/** 一条运镜：按时刻走过几个视角 */
export const pagesTrack = (t: number, keys: PagesKey[]): PagesView => {
  if (t <= keys[0].at) return keys[0].view;
  const last = keys[keys.length - 1];
  if (t >= last.at) return last.view;
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const p = curve(b.ease, 'glide')((t - a.at) / Math.max(1e-6, b.at - a.at));
  const L = (k: keyof PagesView, d: number) => lerp((a.view[k] as number) ?? d, (b.view[k] as number) ?? d, p);
  return {at: L('at', 0), dist: L('dist', 1200), yaw: L('yaw', 0), pitch: L('pitch', 0), u: L('u', 0.5), v: L('v', 0.5)};
};

// 队列的排法（锁死）：每一页比前一页靠右、靠上、靠后，全部朝同一个方向偏
const STEP = {x: 760, y: -64, z: -980};
const TURN = -30; // 每块屏绕竖轴的角度
const PERSP = 2400;
const D2R = Math.PI / 180;
const CY = 0.47; // 视线中心在画面的高度

const slot = (i: number) => ({x: i * STEP.x, y: i * STEP.y, z: i * STEP.z});

/** 第 i 页上的一点（u、v 是 0..1）落在画面哪里。推向某页上的某个小东西时，用它算转场的 origin */
export const pagesPoint = (view: PagesView, pages: CapPage[], i: number, u: number, v: number): [number, number] => {
  const look = lookPoint(view, pages);
  const pg = pages[i];
  const lx = (u - 0.5) * pg.w;
  const ly = (v - 0.5) * pg.h;
  const a = TURN * D2R;
  const s = slot(i);
  // 页面自己的旋转（rotateY）
  let x = s.x + lx * Math.cos(a);
  const y0 = s.y + ly;
  let z = s.z - lx * Math.sin(a);
  x -= look.x;
  let y = y0 - look.y;
  z -= look.z;
  // 镜头：先 rotateY(yaw) 再 rotateX(pitch)，最后退后 dist
  const yw = view.yaw * D2R;
  const x1 = x * Math.cos(yw) + z * Math.sin(yw);
  const z1 = -x * Math.sin(yw) + z * Math.cos(yw);
  const pt = view.pitch * D2R;
  const y2 = y * Math.cos(pt) - z1 * Math.sin(pt);
  const z2 = y * Math.sin(pt) + z1 * Math.cos(pt) - view.dist;
  y = y2;
  const f = PERSP / Math.max(PERSP * 0.05, PERSP - z2);
  return [W / 2 + x1 * f, H * CY + y * f];
};

const lookPoint = (view: PagesView, pages: CapPage[]) => {
  const i = Math.min(pages.length - 1, Math.max(0, view.at));
  const s = slot(i);
  const pg = pages[Math.round(i)];
  const a = TURN * D2R;
  const lx = ((view.u ?? 0.5) - 0.5) * pg.w;
  const ly = ((view.v ?? 0.5) - 0.5) * pg.h;
  return {x: s.x + lx * Math.cos(a), y: s.y + ly, z: s.z - lx * Math.sin(a)};
};

export const Pages: React.FC<{
  theme: CineTheme;
  /** 排在最前面的写在最前面。3–5 页；再多后面的就小得看不见了 */
  pages: CapPage[];
  view: PagesView;
  /** 曝光：暗色界面默认 1.42（这场戏屏小，要比单屏镜头再亮一点），浅色界面默认 0.9 */
  exposure?: number;
  /** 地面反光的强度 0–1，默认 1 */
  floor?: number;
}> = ({theme, pages, view, exposure, floor = 1}) => {
  if (pages.length < 2) warn('Pages', '只有一页就不用 Pages，用 <Screen>');
  if (pages.length > 5) warn('Pages', `${pages.length} 页太多，第 6 页以后小得认不出来，留 3–5 页`);
  const v: PagesView = {
    ...view,
    at: safe('Pages', 'view.at', view.at, 0, pages.length - 1),
    dist: safe('Pages', 'view.dist', view.dist, -1900, 4200),
    yaw: safe('Pages', 'view.yaw', view.yaw, -34, 14),
    pitch: safe('Pages', 'view.pitch', view.pitch, -4, 14),
  };
  const look = lookPoint(v, pages);
  const fl = safe('Pages', 'floor', floor, 0, 1);
  const dark = luma(theme.bg) < 0.4;
  const baseExp = exposure ?? (dark ? 1.42 : 0.9);
  return (
    <AbsoluteFill style={{perspective: PERSP, perspectiveOrigin: `50% ${CY * 100}%`}}>
      <div
        data-probe="skip"
        style={{
          position: 'absolute',
          left: '50%',
          top: `${CY * 100}%`,
          width: 0,
          height: 0,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${-v.dist}px) rotateX(${v.pitch}deg) rotateY(${v.yaw}deg) translate3d(${-look.x}px, ${-look.y}px, ${-look.z}px)`,
        }}
      >
        {/* 远的先画 */}
        {pages
          .map((pg, i) => ({pg, i}))
          .reverse()
          .map(({pg, i}) => {
            const s = slot(i);
            const src = staticFile(texOf(pg));
            // 离盯着的那一页越远越暗；最前面几页保持亮
            const far = Math.max(0, i - v.at);
            const exp = baseExp * (1 - 0.1 * Math.min(3, far));
            return (
              <div
                key={i}
                style={{position: 'absolute', left: 0, top: 0, width: pg.w, height: pg.h, marginLeft: -pg.w / 2, marginTop: -pg.h / 2, transformStyle: 'preserve-3d', transform: `translate3d(${s.x}px, ${s.y}px, ${s.z}px) rotateY(${TURN}deg)`}}
              >
                {fl > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: pg.h + 16,
                      width: pg.w,
                      height: pg.h,
                      borderRadius: 14,
                      overflow: 'hidden',
                      transform: 'scaleY(-1)',
                      opacity: 0.26 * fl,
                      WebkitMaskImage: 'linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 46%)',
                      maskImage: 'linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 46%)',
                      filter: 'blur(2px)',
                    }}
                  >
                    <Img src={src} style={{width: pg.w, height: pg.h, display: 'block', filter: screenGrade(exp)}} />
                  </div>
                )}
                <div style={{position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', background: theme.bg, boxShadow: `0 60px 150px rgba(0,0,0,0.7)`, filter: screenGrade(exp)}}>
                  <Img src={src} style={{position: 'absolute', left: 0, top: 0, width: pg.w, height: pg.h}} />
                  {dark && <Img src={src} style={{position: 'absolute', left: 0, top: 0, width: pg.w, height: pg.h, mixBlendMode: 'screen', opacity: 0.4, filter: `${BLOOM_PASS} blur(7px)`}} />}
                  {/* 顶光：每块屏的上半截被照亮 */}
                  {dark && <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${alpha('#d8e8f0', 0.11)} 0%, ${alpha('#d8e8f0', 0.03)} 34%, ${alpha('#d8e8f0', 0)} 62%)`}} />}
                  <div style={{position: 'absolute', inset: 0, borderRadius: 14, boxShadow: `inset 0 0 0 1px ${alpha('#ffffff', 0.13)}, inset 0 1.5px 0 ${alpha('#ffffff', 0.3)}`}} />
                </div>
              </div>
            );
          })}
      </div>
    </AbsoluteFill>
  );
};
