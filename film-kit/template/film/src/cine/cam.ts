// 机位：把一块「屏」（界面纹理）放进三维空间以后，镜头在哪、看哪、多近。
//
// 机位不用自由数值去凑，而是「有名字的预设 + 看哪个元素 + 占画面多大 + 落在画面哪里」：
//   shot('fromLeft', {look: el(page,'node'), fill: 0.5, at: [0.3, 0.5]})
// 这四样决定了一个机位，写出来就是能读懂的一句话：从左侧斜看节点那一栏，它占画面一半宽，落在左三分之一。
//
// 这里同时是全包的几何真相：project() 用和 CSS 完全相同的算式，把页面上的点算到画面上。
// 景深的焦点带、文字避让、可读性检查都靠它，所以 Screen.tsx 里的变换必须和这里一一对应。
import {H, W} from '../lib/time';
import {lerp} from '../lib/anim';
import {Curve, curve, safe, warn} from './motion';

export type Rect = {x: number; y: number; w: number; h: number};
export type Pt = {x: number; y: number};

/** 一个机位。角度是度；页面坐标是截图时的 CSS px */
export type Pose = {
  /** 看向页面上的哪一点 */
  cx: number;
  cy: number;
  /** 那一点处，1 页面 px = 多少画面 px */
  zoom: number;
  /** 俯仰：正值 = 屏的上沿往后倒（像低头看桌面） */
  rx: number;
  /** 左右：正值 = 屏的右边退远（镜头在左边），负值 = 左边退远 */
  ry: number;
  /** 画面内的倾斜 */
  rz: number;
  /** 透视距离（按 zoom=1 计的 px）：越小透视越强 */
  persp: number;
  /** 看向的那一点落在画面的哪里（0..1） */
  ax: number;
  ay: number;
};

type Preset = {
  rx: number;
  ry: number;
  rz: number;
  persp: number;
  /** 默认落点、默认占画面宽度 */
  at: [number, number];
  fill: number;
  /** 这个机位上界面文字还读不读得清：false 的机位，界面文字只当纹理，要读的字另外用大字说 */
  readable: boolean;
  zh: string;
};

// 预设机位。角度是在真实界面上一张张抽帧调出来的，不要另起数值；需要微调用 tweak（每个轴 ±6° 以内）。
export const SHOTS = {
  /** 平视：信息密集、要读清每个字的界面；字里透界面的底 */
  front: {rx: 0, ry: 0, rz: 0, persp: 1800, at: [0.5, 0.5], fill: 0.7, readable: true, zh: '平视'},
  /** 从左侧斜看：屏往右后方退远，大字放画面右边 */
  fromLeft: {rx: 9, ry: 22, rz: -1, persp: 1300, at: [0.3, 0.5], fill: 0.5, readable: true, zh: '左侧斜看'},
  /** 从右侧斜看：屏往左后方退远，大字放画面左边 */
  fromRight: {rx: 9, ry: -22, rz: 1, persp: 1300, at: [0.7, 0.5], fill: 0.5, readable: true, zh: '右侧斜看'},
  /** 俯拍：像低头看桌上的一块屏，适合一排卡片、一行数字 */
  top: {rx: 32, ry: -6, rz: 2.5, persp: 1300, at: [0.5, 0.52], fill: 0.6, readable: true, zh: '俯拍'},
  /** 贴面掠过：镜头贴着界面低飞，界面变成地形。文字只当纹理 */
  graze: {rx: 52, ry: -13, rz: 4, persp: 900, at: [0.42, 0.5], fill: 0.45, readable: false, zh: '贴面掠过'},
  /** 退开的全貌：整块屏悬在空间里，给大字让出半边 */
  wide: {rx: 15, ry: -19, rz: 1, persp: 1500, at: [0.66, 0.62], fill: 0.62, readable: false, zh: '退开全貌'},
} as const satisfies Record<string, Preset>;
export type ShotName = keyof typeof SHOTS;

const isRect = (v: Rect | Pt): v is Rect => (v as Rect).w !== undefined;
const D2R = Math.PI / 180;

export type ShotOpts = {
  /** 看哪：一个元素的矩形（el(...) 的返回值），或页面上的一个点 */
  look: Rect | Pt;
  /** 这个元素的宽度占画面宽度的多少（0.08–1.6）。看点而不是元素时改用 zoom */
  fill?: number;
  /** 直接给放大倍数（和 fill 二选一） */
  zoom?: number;
  /** 看向的点落在画面哪里（0..1） */
  at?: [number, number];
  /** 在预设上微调角度，每个轴最多 ±6° */
  tweak?: {rx?: number; ry?: number; rz?: number; persp?: number};
};

/** 按预设摆一个机位 */
export const shot = (name: ShotName, o: ShotOpts): Pose => {
  const p: Preset = SHOTS[name];
  if (!p) {
    warn('shot', `没有叫「${String(name)}」的机位，已改用 front。可用：${Object.keys(SHOTS).join(' / ')}`);
    return shot('front', o);
  }
  const who = `shot('${name}')`;
  const tw = o.tweak ?? {};
  const rx = p.rx + safe(who, 'tweak.rx', tw.rx ?? 0, -6, 6);
  const ry = p.ry + safe(who, 'tweak.ry', tw.ry ?? 0, -6, 6);
  const rz = p.rz + safe(who, 'tweak.rz', tw.rz ?? 0, -3, 3);
  const persp = safe(who, 'persp', tw.persp ?? p.persp, 700, 2600);
  const look = o.look;
  const cx = isRect(look) ? look.x + look.w / 2 : look.x;
  const cy = isRect(look) ? look.y + look.h / 2 : look.y;
  let zoom: number;
  if (o.zoom !== undefined) zoom = o.zoom;
  else if (isRect(look)) {
    // 元素在画面上的宽度 ≈ 宽 × zoom × cos(左右角)，反过来求 zoom
    const fill = safe(who, 'fill', o.fill ?? p.fill, 0.08, 1.6);
    zoom = (fill * W) / (look.w * Math.cos(ry * D2R));
  } else {
    warn(who, 'look 是一个点时要给 zoom，已按 zoom=1.6');
    zoom = 1.6;
  }
  zoom = safe(who, 'zoom', zoom, 0.25, 6);
  const at = o.at ?? p.at;
  return {cx, cy, zoom, rx, ry, rz, persp, ax: safe(who, 'at[0]', at[0], -0.3, 1.3), ay: safe(who, 'at[1]', at[1], -0.3, 1.3)};
};

/** 两个机位之间的中间态。放大倍数按对数走（推近时速度看起来才匀） */
export const mixPose = (a: Pose, b: Pose, p: number): Pose => ({
  cx: lerp(a.cx, b.cx, p),
  cy: lerp(a.cy, b.cy, p),
  zoom: Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), p)),
  rx: lerp(a.rx, b.rx, p),
  ry: lerp(a.ry, b.ry, p),
  rz: lerp(a.rz, b.rz, p),
  persp: lerp(a.persp, b.persp, p),
  ax: lerp(a.ax, b.ax, p),
  ay: lerp(a.ay, b.ay, p),
});

export type CamKey = {
  /** 到达这个机位的时刻（成片秒） */
  at: number;
  pose: Pose;
  /** 从上一个机位过来用什么曲线，默认 glide（慢起慢停） */
  ease?: Curve;
};

/** 一条运镜：按时刻走过几个机位。镜头永远不抖、不弹，段与段之间用 glide 接 */
export const track = (t: number, keys: CamKey[]): Pose => {
  if (!keys.length) throw new Error('track 至少要一个机位');
  if (t <= keys[0].at) return keys[0].pose;
  const last = keys[keys.length - 1];
  if (t >= last.at) return last.pose;
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const p = curve(b.ease, 'glide')((t - a.at) / Math.max(1e-6, b.at - a.at));
  return mixPose(a.pose, b.pose, p);
};

/** 极慢的推近：停住的镜头也要「活着」。k 是整段推进的比例（0.02–0.06 合适） */
export const creep = (pose: Pose, t: number, t0: number, t1: number, k = 0.04): Pose => {
  const p = Math.min(1, Math.max(0, (t - t0) / Math.max(1e-6, t1 - t0)));
  return {...pose, zoom: pose.zoom * (1 + safe('creep', 'k', k, -0.12, 0.12) * p)};
};

// ───────── 几何：和 Screen.tsx 的 CSS 变换一一对应 ─────────
// CSS 写的是 rotateY(ry) rotateX(rx) rotateZ(rz)，作用顺序从右到左：先绕 Z、再绕 X、最后绕 Y。
type M3 = [number, number, number, number, number, number, number, number, number];
const rotation = (pose: Pose): M3 => {
  const a = pose.rx * D2R;
  const b = pose.ry * D2R;
  const c = pose.rz * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // M = Ry · Rx · Rz
  return [
    cb * cc + sb * sa * sc, -cb * sc + sb * sa * cc, sb * ca,
    ca * sc, ca * cc, -sa,
    -sb * cc + cb * sa * sc, sb * sc + cb * sa * cc, cb * ca,
  ];
};

export type Projected = {
  /** 画面坐标（px） */
  x: number;
  y: number;
  /** 离镜头的远近：正值 = 比看向的那一点更靠近镜头（单位是画面 px） */
  depth: number;
  /** 这一点处的局部放大倍数（1 页面 px 大约等于多少画面 px） */
  scale: number;
};

/** 页面上的一点（可带离面高度 z，页面 px）落在画面的哪里 */
export const project = (pose: Pose, x: number, y: number, z = 0): Projected => {
  const m = rotation(pose);
  const vx = x - pose.cx;
  const vy = y - pose.cy;
  const X = m[0] * vx + m[1] * vy + m[2] * z;
  const Y = m[3] * vx + m[4] * vy + m[5] * z;
  const Z = m[6] * vx + m[7] * vy + m[8] * z;
  // 透视：离镜头 persp 的平面 1:1，越近越大。分母夹住，防止点跑到镜头背后
  const f = pose.persp / Math.max(pose.persp * 0.08, pose.persp - Z);
  return {x: pose.ax * W + pose.zoom * X * f, y: pose.ay * H + pose.zoom * Y * f, depth: pose.zoom * Z, scale: pose.zoom * f};
};

/** 页面上一个矩形在画面里的外接框 */
export const projectRect = (pose: Pose, r: Rect, z = 0): Rect & {scale: number; depth: number} => {
  const pts = [project(pose, r.x, r.y, z), project(pose, r.x + r.w, r.y, z), project(pose, r.x, r.y + r.h, z), project(pose, r.x + r.w, r.y + r.h, z)];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const c = project(pose, r.x + r.w / 2, r.y + r.h / 2, z);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, scale: c.scale, depth: c.depth};
};

/** 深度在页面上变化最快的方向（单位向量）和变化率（每页面 px 多少画面 px 的深度） */
export const depthSlope = (pose: Pose) => {
  const m = rotation(pose);
  const gx = m[6];
  const gy = m[7];
  const len = Math.hypot(gx, gy);
  return len < 1e-6 ? {gx: 0, gy: 0, rate: 0} : {gx: gx / len, gy: gy / len, rate: len * pose.zoom};
};

/** 界面文字在这个机位上被压扁到原来的多少（1 = 没压）。低于 0.72 就别指望观众读界面上的小字 */
export const squash = (pose: Pose) => Math.min(Math.cos(pose.rx * D2R), Math.cos(pose.ry * D2R));

/** 取出几个矩形的并集 */
export const union = (...rs: Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return {x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y};
};

/** 把矩形向外扩一圈 */
export const grow = (r: Rect, d: number): Rect => ({x: r.x - d, y: r.y - d, w: r.w + d * 2, h: r.h + d * 2});

/** 取矩形的一部分（按比例）：很宽的输入框只想看左边 40% 时用 slice(r, 0, 0.4) */
export const slice = (r: Rect, x0: number, x1: number, y0 = 0, y1 = 1): Rect => ({x: r.x + r.w * x0, y: r.y + r.h * y0, w: r.w * (x1 - x0), h: r.h * (y1 - y0)});
