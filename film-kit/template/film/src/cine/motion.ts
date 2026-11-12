// 镜头包的运动：只有几条有名字的曲线。全部是成片秒数 t 的纯函数。
//
// 选曲线的规矩（判断不了就照这张表）：
//   东西出现、落定        → settle  （起步快、尾巴长，停得干净；不弹）
//   镜头从一个机位到另一个 → glide   （慢起、慢停，中段匀；镜头永远不用弹簧）
//   蓄力、冲向剪点        → launch  （越来越快，停在最快的地方，后面必须接硬切）
//   东西掉回原位          → fall    （加速下落、软着陆）
//   按下、落地的一点回弹   → press   （过冲 3% 以内，只给小物件）
import {clamp} from '../lib/anim';

/** cubic-bezier 求值：给时间进度 x（0..1）返回曲线上的 y */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const X = (u: number) => ((ax * u + bx) * u + cx) * u;
  const Y = (u: number) => ((ay * u + by) * u + cy) * u;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    // 单调函数直接二分，30 次足够到 1e-9，不用担心牛顿法在平坦处发散
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (X(mid) < p) lo = mid;
      else hi = mid;
    }
    return Y((lo + hi) / 2);
  };
};

export const CURVE = {
  linear: (p: number) => p,
  /** 出现、落定：expo-out */
  settle: bezier(0.16, 1, 0.3, 1),
  /** 比 settle 温和一档：大块面、大字 */
  ease: bezier(0.22, 1, 0.36, 1),
  /** 镜头移动：不对称的慢起慢停，停得比起得更缓 */
  glide: bezier(0.45, 0, 0.15, 1),
  /** 长镜头里几乎匀速的漂移 */
  drift: bezier(0.3, 0, 0.7, 1),
  /** 蓄力冲出去：只加速不减速 */
  launch: bezier(0.6, 0, 0.9, 0.5),
  /** 掉回原位：加速 + 软着陆 */
  fall: bezier(0.5, 0.05, 0.6, 1),
  /** 退场：快走 */
  exit: bezier(0.5, 0, 0.9, 0.3),
} as const;
export type CurveName = keyof typeof CURVE;
export type Curve = CurveName | ((p: number) => number);
export const curve = (c: Curve | undefined, fallback: CurveName = 'settle') => (typeof c === 'function' ? c : CURVE[c ?? fallback]);

/** t 在 [t0, t0+dur] 里的进度，套曲线 */
export const run = (t: number, t0: number, dur: number, c: Curve = 'settle') => curve(c)(clamp((t - t0) / Math.max(1e-6, dur)));

/** 在 [t0, t1] 里从 a 走到 b */
export const go = (t: number, t0: number, t1: number, a: number, b: number, c: Curve = 'settle') => a + (b - a) * run(t, t0, t1 - t0, c);

/** 出现后保持、到点退场：返回 0..1 的可见度（进 inDur，出 outDur） */
export const live = (t: number, t0: number, t1 = Infinity, inDur = 0.5, outDur = 0.3) => {
  if (t < t0) return 0;
  const a = run(t, t0, inDur, 'settle');
  const b = t1 === Infinity ? 1 : 1 - run(t, t1, outDur, 'exit');
  return Math.min(a, b);
};

/** 一闪：t0 起 up 秒到顶，再 down 秒回 0（落地缝、按钮按下的亮一下） */
export const flash = (t: number, t0: number, up = 0.05, down = 0.3) => {
  if (t < t0 || t > t0 + up + down) return 0;
  return t < t0 + up ? (t - t0) / up : 1 - CURVE.ease((t - t0 - up) / down);
};

/** 临界阻尼的小回弹（过冲 ≈3%）：只给「按下」「落地」这种小物件，镜头和大字不用 */
export const press = (dt: number, stiffness = 260, damping = 26) => {
  if (dt <= 0) return 0;
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  if (zeta >= 1) return 1 - Math.exp(-w0 * dt) * (1 + w0 * dt);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w0 * dt) * (Math.cos(wd * dt) + ((zeta * w0) / wd) * Math.sin(wd * dt));
};

/** 全包的开关。审片抽帧嫌慢时在工程里调一次：configureCine({lens: 'draft'})；出成片前改回 'full' */
export const CINE = {lens: 'full' as 'full' | 'draft'};
export const configureCine = (o: Partial<typeof CINE>) => Object.assign(CINE, o);

/** 开发时的提醒：同一句只打一次。渲染时在浏览器控制台、抽帧时在命令行里都看得到 */
const warned = new Set<string>();
export const warn = (who: string, msg: string) => {
  const key = `${who}|${msg}`;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[镜头包] ${who}：${msg}`);
};

/** 夹到安全范围，越界就提醒 */
export const safe = (who: string, name: string, v: number, lo: number, hi: number) => {
  if (!Number.isFinite(v)) {
    warn(who, `${name} 不是数字，已改用 ${lo}`);
    return lo;
  }
  if (v < lo - 1e-9 || v > hi + 1e-9) {
    const c = Math.min(hi, Math.max(lo, v));
    warn(who, `${name}=${+v.toFixed(3)} 超出安全范围 ${lo}–${hi}，已夹到 ${c}`);
    return c;
  }
  return v;
};
