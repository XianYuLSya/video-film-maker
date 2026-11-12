// 品牌片风格包 · 缓动与节奏
// 全部是成片秒数 t 的纯函数：不用随机数、Date、Remotion 的 interpolate / spring。

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** CSS 同款三次贝塞尔缓动：bezier(0.16, 1, 0.3, 1) 就是 cubic-bezier(.16,1,.3,1) */
export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let s = p;
    for (let i = 0; i < 8; i++) {
      const e = sx(s) - p;
      const d = dx(s);
      if (Math.abs(e) < 1e-6) break;
      if (Math.abs(d) < 1e-6) break;
      s -= e / d;
    }
    // 牛顿法不收敛时用二分兜底
    if (Math.abs(sx(s) - p) > 1e-4) {
      let lo = 0;
      let hi = 1;
      s = p;
      for (let i = 0; i < 30; i++) {
        if (sx(s) < p) lo = s;
        else hi = s;
        s = (lo + hi) / 2;
      }
    }
    return sy(s);
  };
};

/**
 * 品牌片缓动。默认用 out（入场）和 move（位移）；不弹跳。
 * - out：入场、显现。快起慢停，尾巴很长（像 Apple / Linear 的出场）
 * - move：从 A 到 B 的位移、镜头推拉。两头都缓
 * - soft：透明度、颜色这类「不该被看出缓动」的变化
 * - in：退场。慢起快走，退场永远比入场短
 * - settle：归位、对齐的最后一段，比 out 更早停稳
 * - lift：唯一允许的过冲（约 2%），只给徽标落定、最终锁定那一下用，一部片子最多用两次
 */
export const BE = {
  linear: (p: number) => p,
  out: bezier(0.16, 1, 0.3, 1),
  move: bezier(0.65, 0, 0.35, 1),
  soft: bezier(0.4, 0, 0.2, 1),
  in: bezier(0.55, 0, 0.75, 0.2),
  settle: bezier(0.22, 1, 0.36, 1),
  lift: bezier(0.3, 1.18, 0.55, 1),
  sine: (p: number) => -(Math.cos(Math.PI * p) - 1) / 2,
};
export type Ease = (p: number) => number;

/** 时长常量（秒）。品牌片宁慢勿快：小东西 0.4–0.7，大动作 1–1.6，镜头 3 秒以上 */
export const DUR = {
  micro: 0.25, // 颜色、亮一下
  short: 0.45, // 小字、点、细线的出现
  base: 0.8, // 标题、组件入场
  long: 1.3, // 大位移、归位、描线一段
  slow: 2.2, // 徽标整段描绘、整屏转场
  cam: 4, // 镜头推拉至少这么长，看起来才是「漂」而不是「冲」
};
/** 依次出场的间隔：逐字 0.06（< 0.04 糊成一片，> 0.12 像打字机），逐词/逐条 0.08，逐块 0.12 */
export const STAGGER = {char: 0.06, word: 0.08, block: 0.12};

/** 从 t0 开始、dur 秒走完的进度 0..1 */
export const prog = (t: number, t0: number, dur: number = DUR.base, e: Ease = BE.out) => e(clamp((t - t0) / Math.max(1e-6, dur)));

/** 在 [t0, t0+dur] 里从 a 到 b */
export const tw = (t: number, t0: number, dur: number, a: number, b: number, e: Ease = BE.move) => lerp(a, b, prog(t, t0, dur, e));

/** 出现窗口：at 淡入、out 淡出（不传 out 就一直在）。返回 0..1 */
export const win = (t: number, at: number, out = Infinity, inDur = DUR.base, outDur = DUR.short) => {
  if (t < at) return 0;
  const a = prog(t, at, inDur, BE.soft);
  const b = out === Infinity ? 1 : 1 - prog(t, out, outDur, BE.in);
  return Math.min(a, b);
};

/** 稳定的 0..1 伪随机（同一个 n 永远同一个值） */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** 缓慢漂移：周期 period 秒的正弦，幅度 amp。给光斑、呼吸、悬浮用 */
export const drift = (t: number, amp: number, period = 8, phase = 0) => amp * Math.sin(((t / period) * 2 + phase) * Math.PI);

/** 按配乐拍子取时间：beatAt(起点, 一拍秒数, 第几拍)。小节 = 4 拍 */
export const beatAt = (t0: number, beat: number, n: number) => t0 + beat * n;
