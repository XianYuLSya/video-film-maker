// 屏：把一页真实界面的截图当成一块发光的面板，放进三维空间。
//
// 三件事由这里保证，使用者不用管：
//   1. 推近以后字不糊。放大量不写进 transform 的 scale，而是用布局级的 zoom：
//      浏览器会按放大后的尺寸栅格化这一层，再从高倍截图往下采样。写成 scale 的话，
//      它先按原尺寸栅格化、再放大，三维里的文字必糊。
//   2. 变换和 cam.ts 的 project() 一一对应，所以别处算出来的画面坐标是准的。
//   3. 屏是「发光的物体」：整体抬一档曝光，亮的字和色块往外晕一点辉光，主光在屏上落一片受光面，
//      顶边有缘光。暗色界面不这么处理就发闷；但也不能把暗部一起抬灰——亮度靠亮的东西更亮来提。
//
// 屏上的东西（浮起来的元素、光标、选中环）作为 children 放进来，用页面坐标定位，
// 可以写 translateZ 离面；它们和屏在同一个三维空间里。
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {H, W} from '../lib/time';
import {Pose, squash} from './cam';
import {safe, warn} from './motion';
import {CineTheme, alpha, luma} from './theme';

/** 坐标表里的一个元素 */
export type CapEl = {x: number; y: number; w: number; h: number; text?: string; fontSize?: number; fontWeight?: string; fontFamily?: string; color?: string; bg?: string; radius?: number; letterSpacing?: string; lineHeight?: string; padL?: number; padT?: number};
export type CapCut = {file: string; x: number; y: number; w: number; h: number; text?: string; scale?: number};
/** 坐标表里的一页（scripts/capture.mjs 写出来的） */
export type CapPage = {
  id: string;
  dir: string;
  w: number;
  h: number;
  scale: number;
  file: string;
  plates: Record<string, string>;
  elements: Record<string, CapEl[]>;
  cuts: Record<string, CapCut[]>;
};

/** 取坐标表里的元素；写错名字直接报错，不会默默画歪 */
export const el = (page: CapPage, key: string, i = 0): CapEl => {
  const list = page.elements[key];
  if (!list) throw new Error(`页面「${page.id}」的坐标表里没有元素「${key}」，现有：${Object.keys(page.elements).join('、')}`);
  if (!list[i]) throw new Error(`页面「${page.id}」的元素「${key}」只有 ${list.length} 个，取不到第 ${i} 个`);
  return list[i];
};
/** 取一张元素抠图 */
export const cut = (page: CapPage, key: string, i = 0): CapCut => {
  const list = page.cuts[key];
  if (!list) throw new Error(`页面「${page.id}」没有抠图「${key}」，现有：${Object.keys(page.cuts).join('、')}`);
  if (!list[i]) throw new Error(`页面「${page.id}」的抠图「${key}」只有 ${list.length} 张，取不到第 ${i} 张`);
  return list[i];
};
/** 页面素材的路径：不传底板名就是整页纹理 */
export const texOf = (page: CapPage, plate?: string) => {
  if (!plate) return `${page.dir}/${page.file}`;
  const f = page.plates[plate];
  if (!f) throw new Error(`页面「${page.id}」没有底板「${plate}」，现有：${Object.keys(page.plates).join('、') || '（无）'}`);
  return `${page.dir}/${f}`;
};

export type ScreenLight = {
  /** 受光面中心在页面上的位置（页面 px）；不给就跟着镜头看向的那一点 */
  x?: number;
  y?: number;
  /** 强度 0–2，默认 1 */
  k?: number;
  /** 受光面半径，占页面宽度的比例，默认 0.34 */
  r?: number;
};

export type ScreenProps = {
  page: CapPage;
  pose: Pose;
  theme: CineTheme;
  /** 用哪张底板；不写就是整页纹理 */
  plate?: string;
  /** 曝光：暗色界面默认 1.32，浅色界面 0.88。范围 0.7–1.7 */
  exposure?: number;
  /** 屏上的受光面 */
  light?: ScreenLight;
  /** 扫光位置 0..1（一条斜的高光带从左扫到右），不传就没有。全片只给主角用一次 */
  sheen?: number;
  /** 圆角（页面 px），默认 14 */
  radius?: number;
  /** 缘光强度 0–1.5，默认 1 */
  rim?: number;
  /** 辉光强度 0–1.5：亮的字和色块往外晕多少。暗色界面默认 1，浅色界面默认 0 */
  bloom?: number;
  /** 投影强度 0–1.5，默认 1 */
  shadow?: number;
  opacity?: number;
  /** 画在截图上面、被屏的圆角裁住的东西（页面坐标）。比如把另一张底板叠化进来 */
  inside?: React.ReactNode;
  /** 屏上的东西（页面坐标，可以离面） */
  children?: React.ReactNode;
};

/** 屏整体的调色：和浮起来的元素共用，保证离面的东西和屏是同一种亮度 */
export const screenGrade = (exposure: number) => `brightness(${exposure.toFixed(3)}) contrast(1.06) saturate(1.12)`;

/** 屏把自己的曝光和受光面告诉屏上的东西（Float 等），离面的元素才能和屏面受同一盏灯 */
export type ScreenInfo = {page: CapPage; theme: CineTheme; exposure: number; light: {x: number; y: number; r: number; k: number}};
const Ctx = React.createContext<ScreenInfo | null>(null);
export const useScreen = (who: string): ScreenInfo => {
  const v = React.useContext(Ctx);
  if (!v) throw new Error(`${who} 必须放在 <Screen> 里面（它用的是页面坐标）`);
  return v;
};
// 辉光只取亮部：先压暗再猛拉对比，暗的底色归零，只剩亮的字和色块（否则整块屏都被抬灰）
export const BLOOM_PASS = 'brightness(0.9) contrast(4) saturate(1.3)';

/** 受光面的渐变：ox、oy 是所在盒子左上角的页面坐标（屏自己是 0,0；浮起来的元素传自己的位置） */
export const lightGradient = (l: ScreenInfo['light'], ox = 0, oy = 0) =>
  `radial-gradient(ellipse ${l.r}px ${l.r * 0.72}px at ${l.x - ox}px ${l.y - oy}px, ${alpha('#cfe0ee', 0.075 * l.k)} 0%, ${alpha('#cfe0ee', 0.03 * l.k)} 50%, ${alpha('#cfe0ee', 0)} 100%)`;

export const Screen: React.FC<ScreenProps> = ({page, pose, theme, plate, exposure, light, sheen, radius = 14, rim = 1, bloom, shadow = 1, opacity = 1, inside, children}) => {
  const who = `Screen(${page.id})`;
  // 暗色界面：抬一档曝光、亮部加辉光、主光落一片受光面。
  // 浅色界面本身就是画面里最亮的东西：压一点曝光、不加辉光、受光面只给三成，不然整块屏白成一片、卡片的边都没了
  const dark = luma(theme.bg) < 0.4;
  const exp = safe(who, 'exposure', exposure ?? (dark ? 1.32 : 0.88), 0.7, 1.7);
  const zoom = pose.zoom;
  // 纹理够不够用：画面上的放大倍数不该超过截图倍率太多，否则字开始发虚
  if (zoom > page.scale * 1.34) warn(who, `放大到 ${zoom.toFixed(2)} 倍，但这页截图只有 ${page.scale} 倍：文字会发虚。把这页的 scale 提到 ${Math.ceil(zoom)}，或者别推这么近`);
  if (squash(pose) < 0.5) warn(who, '这个机位把界面压得很扁，界面上的字已经读不了，只能当纹理');
  const ax = pose.ax * W;
  const ay = pose.ay * H;
  const lk = safe(who, 'light.k', light?.k ?? 1, 0, 2) * (dark ? 1 : 0.3);
  const lr = safe(who, 'light.r', light?.r ?? 0.34, 0.12, 0.9) * page.w;
  const rimK = safe(who, 'rim', rim, 0, 1.5);
  const bloomK = safe(who, 'bloom', bloom ?? (dark ? 1 : 0), 0, 1.5);
  const sh = safe(who, 'shadow', shadow, 0, 1.5);
  const info: ScreenInfo = {page, theme, exposure: exp, light: {x: light?.x ?? pose.cx, y: light?.y ?? pose.cy, r: lr, k: lk}};
  const src = staticFile(texOf(page, plate));
  const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: page.w, height: page.h};
  return (
    <AbsoluteFill style={{perspective: `${pose.persp * zoom}px`, perspectiveOrigin: `${ax}px ${ay}px`, opacity}}>
      <div
        data-probe="skip"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: page.w,
          height: page.h,
          zoom,
          // zoom 以后这一层里 1 个单位 = zoom 个画面像素，所以平移量要先除以 zoom
          transform: `translate(${ax / zoom - pose.cx}px, ${ay / zoom - pose.cy}px) rotateY(${pose.ry}deg) rotateX(${pose.rx}deg) rotateZ(${pose.rz}deg)`,
          transformOrigin: `${pose.cx}px ${pose.cy}px`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            overflow: 'hidden',
            background: theme.bg,
            boxShadow: sh > 0 ? `0 ${36 * sh}px ${110 * sh}px rgba(0,0,0,${0.5 * Math.min(1, sh)}), 0 ${6 * sh}px ${22 * sh}px rgba(0,0,0,${0.35 * Math.min(1, sh)})` : undefined,
            filter: screenGrade(exp),
          }}
        >
          <Img src={src} style={full} />
          {inside}
          {/* 辉光：同一张图只留下亮的部分、糊一下、用滤色叠回去 */}
          {bloomK > 0 && <Img src={src} style={{...full, mixBlendMode: 'screen', opacity: 0.42 * bloomK, filter: `${BLOOM_PASS} blur(${(16 / zoom).toFixed(2)}px)`}} />}
          {/* 受光面：主光落在屏上的那一片 */}
          {lk > 0 && <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', background: lightGradient(info.light)}} />}
          {sheen !== undefined && sheen > 0 && sheen < 1 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                mixBlendMode: 'screen',
                background: `linear-gradient(104deg, ${alpha('#ffffff', 0)} ${sheen * 130 - 30}%, ${alpha('#ffffff', 0.1)} ${sheen * 130 - 18}%, ${alpha('#ffffff', 0.22)} ${sheen * 130 - 15}%, ${alpha('#ffffff', 0.06)} ${sheen * 130 - 9}%, ${alpha('#ffffff', 0)} ${sheen * 130}%)`,
              }}
            />
          )}
          {/* 缘光：一圈发丝描边 + 顶边受光 */}
          {rimK > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: radius,
                pointerEvents: 'none',
                boxShadow: `inset 0 0 0 1px ${alpha('#ffffff', 0.1 * rimK)}, inset 0 1.5px 0 ${alpha('#ffffff', 0.2 * rimK)}`,
              }}
            />
          )}
        </div>
        <Ctx.Provider value={info}>{children}</Ctx.Provider>
      </div>
    </AbsoluteFill>
  );
};
