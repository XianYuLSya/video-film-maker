// 镜头的景深：焦点对在一个元素上，离焦平面越远越虚。
//
// 做法是按真实镜头的几何来的：一块斜放的屏，离镜头同样远的点连起来是一条直线（焦平面和屏的交线），
// 所以清晰的地方是一条「焦点带」，带的两侧按远近逐渐变虚，近处比远处虚得更厉害。
// 这里用机位算出焦点带在画面上的位置和方向，把同一个画面再渲两遍（一遍小模糊、一遍大模糊），
// 各用一张线性渐变遮罩盖在清晰版上面。焦点跟着你指定的元素走，机位怎么动都对得上。
//
// 景深只做气氛和引导视线，不是清晰度的解法：字糊先查截图倍率（Screen 会提醒），别来调这里。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {H, W} from '../lib/time';
import {Pose, Pt, Rect, depthSlope, project} from './cam';
import {CINE, safe, warn} from './motion';

export type LensProps = {
  pose: Pose;
  /** 焦点对在哪：一个元素的矩形或页面上的点。不给就是镜头看向的那一点 */
  focus?: Rect | Pt;
  /** 焦点离屏面的高度（页面 px）：主角是悬着的元素时，把它当前的高度传进来（floatHeight(...)），焦点才跟得上 */
  lift?: number;
  /** 光圈 0–1：0 = 全清晰，0.5 = 默认的浅景深，1 = 微距那种很薄的焦点带 */
  aperture?: number;
  /** 焦点周围再加一圈「视线聚拢」的虚化（0–1）：离主角远的角落一并变虚，正对屏的机位也有效 */
  spot?: number;
  /** 开发时把焦点带画出来看一眼（成片必须关掉） */
  debug?: boolean;
  children: React.ReactNode;
};

type Stop = {pos: number; a: number};

/** 把一组「沿渐变方向的像素位置 + 不透明度」写成 CSS 渐变 */
const gradient = (angleDeg: number, stops: Stop[]) => {
  const sorted = [...stops].sort((p, q) => p.pos - q.pos);
  return `linear-gradient(${angleDeg.toFixed(3)}deg, ${sorted.map((s) => `rgba(0,0,0,${s.a.toFixed(3)}) ${s.pos.toFixed(1)}px`).join(', ')})`;
};

export const Lens: React.FC<LensProps> = ({pose, focus, lift = 0, aperture = 0.5, spot = 0, debug = false, children}) => {
  const ap = safe('Lens', 'aperture', aperture, 0, 1);
  const sp = safe('Lens', 'spot', spot, 0, 1);
  const f = focus ?? {x: pose.cx, y: pose.cy};
  const fr = f as Partial<Rect> & Pt;
  const fx = fr.x + (fr.w ?? 0) / 2;
  const fy = fr.y + (fr.h ?? 0) / 2;
  const fp = project(pose, fx, fy, lift);
  if (fp.x < -W * 0.1 || fp.x > W * 1.1 || fp.y < -H * 0.1 || fp.y > H * 1.1) warn('Lens', `焦点落在画面外（${Math.round(fp.x)}, ${Math.round(fp.y)}）：主角是虚的。检查 focus 和机位的 look 是不是同一个元素`);
  if (ap <= 0.001 && sp <= 0.001) return <AbsoluteFill>{children}</AbsoluteFill>;

  const maxBlur = 5 + 21 * ap; // 最远处的模糊半径
  const {gx, gy, rate} = depthSlope(pose);
  const layers: {blur: number; mask: string}[] = [];

  if (ap > 0.001 && rate > 0.02) {
    // 焦点带：深度差在 tol 以内完全清晰，到 fall 处达到最大模糊。光圈越大带越窄
    const tol = 26 + 90 * (1 - ap);
    const fall = 300 + 520 * (1 - ap);
    // 沿「深度变化最快」的方向走 s 个页面 px，深度变化 rate*s。往 +g 方向是靠近镜头
    const at = (depth: number) => project(pose, fx + (gx * depth) / rate, fy + (gy * depth) / rate, lift);
    // 等深线在画面上互相平行；渐变方向取它的垂线，朝着「靠近镜头」的一侧
    const ip = project(pose, fx - gy * 50, fy + gx * 50, lift);
    const iso = {x: ip.x - fp.x, y: ip.y - fp.y};
    const il = Math.hypot(iso.x, iso.y) || 1;
    let nx = -iso.y / il;
    let ny = iso.x / il;
    const near = at(tol);
    if ((near.x - fp.x) * nx + (near.y - fp.y) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    // CSS 的 linear-gradient(θ)：方向向量是 (sinθ, -cosθ)，渐变线过盒子中心，长度 |W·sinθ| + |H·cosθ|
    const theta = Math.atan2(nx, -ny);
    const L = Math.abs(W * Math.sin(theta)) + Math.abs(H * Math.cos(theta));
    const along = (p: {x: number; y: number}) => (p.x - W / 2) * nx + (p.y - H / 2) * ny + L / 2;
    const deg = (theta * 180) / Math.PI;
    // 近处（靠近镜头）比远处虚得快：同样的深度差，近侧按 0.75 的距离就到头
    const nearK = 0.75;
    const maxDepth = pose.persp * pose.zoom * 0.7; // 别把采样点推到镜头背后
    const P = (d: number) => along(at(Math.max(-maxDepth * 4, Math.min(maxDepth, d))));
    const mid = tol + (fall - tol) * 0.4;
    // 第一层：小模糊，从焦点带边缘起、到 mid 处盖满（审片用的 draft 档省掉这一层：画面少渲一遍，虚实过渡硬一点）
    if (CINE.lens === 'full') layers.push({
      blur: maxBlur * 0.38,
      mask: gradient(deg, [
        {pos: P(-fall * 3), a: 1},
        {pos: P(-mid), a: 1},
        {pos: P(-tol), a: 0},
        {pos: P(tol * nearK), a: 0},
        {pos: P(mid * nearK), a: 1},
        {pos: P(fall * 3), a: 1},
      ]),
    });
    // 第二层：大模糊，从 mid 起、到 fall 处盖满
    layers.push({
      blur: maxBlur,
      mask: gradient(deg, [
        {pos: P(-fall * 3), a: 1},
        {pos: P(-fall), a: 1},
        {pos: P(CINE.lens === 'full' ? -mid : -tol), a: 0},
        {pos: P((CINE.lens === 'full' ? mid : tol) * nearK), a: 0},
        {pos: P(fall * nearK), a: 1},
        {pos: P(fall * 3), a: 1},
      ]),
    });
  }
  if (sp > 0.001 && (CINE.lens === 'full' || layers.length === 0)) {
    const rx = 62 - 22 * sp;
    const ry = 70 - 24 * sp;
    layers.push({
      blur: 4 + 12 * sp,
      mask: `radial-gradient(ellipse ${rx}% ${ry}% at ${fp.x.toFixed(1)}px ${fp.y.toFixed(1)}px, rgba(0,0,0,0) 42%, rgba(0,0,0,0.9) 82%, rgba(0,0,0,1) 100%)`,
    });
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill>{children}</AbsoluteFill>
      {layers.map((l, i) => (
        <AbsoluteFill key={i} style={{filter: `blur(${l.blur.toFixed(2)}px)`, WebkitMaskImage: l.mask, maskImage: l.mask}}>
          {children}
        </AbsoluteFill>
      ))}
      {debug && (
        <>
          {layers.map((l, i) => (
            <AbsoluteFill key={`d${i}`} style={{background: i === 0 ? 'rgba(255,200,0,0.25)' : 'rgba(255,60,60,0.25)', WebkitMaskImage: l.mask, maskImage: l.mask}} />
          ))}
          <div style={{position: 'absolute', left: fp.x - 14, top: fp.y - 14, width: 28, height: 28, border: '2px solid #00e0ff', borderRadius: 14}} />
        </>
      )}
    </AbsoluteFill>
  );
};
