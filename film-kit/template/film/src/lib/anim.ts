// 动画小工具：全部按秒算，确定性，不用随机数
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const ease = {
  linear: (p: number) => p,
  inOut: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p: number) => 1 - Math.pow(1 - p, 3),
  outQuint: (p: number) => 1 - Math.pow(1 - p, 5),
  in: (p: number) => p * p * p,
  outBack: (p: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
  inOutSine: (p: number) => -(Math.cos(Math.PI * p) - 1) / 2,
  outExpo: (p: number) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)),
};

/** 从 t0 开始、dur 秒走完的进度（0..1），带缓动 */
export const prog = (t: number, t0: number, dur = 0.5, e: (p: number) => number = ease.inOut) => e(clamp((t - t0) / dur));

/** 在 [t0, t1] 里从 a 到 b */
export const tween = (t: number, t0: number, t1: number, a: number, b: number, e: (p: number) => number = ease.inOut) =>
  lerp(a, b, e(clamp((t - t0) / Math.max(1e-6, t1 - t0))));

/** 阻尼弹簧，返回 0→1（会略微过冲），dt 是从起点算的秒数 */
export const spring = (dt: number, stiffness = 170, damping = 16, mass = 1) => {
  if (dt <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * dt) * (Math.cos(wd * dt) + ((zeta * w0) / wd) * Math.sin(wd * dt));
  }
  return 1 - Math.exp(-w0 * dt) * (1 + w0 * dt);
};

/** 出现：在 t0 弹出、t1 收起（不传 t1 就一直在） */
export const appear = (t: number, t0: number, t1 = Infinity, inDur = 0.35, outDur = 0.3) => {
  if (t < t0 || t > t1 + outDur) return 0;
  const a = prog(t, t0, inDur, ease.out);
  const b = t1 === Infinity ? 1 : 1 - prog(t, t1, outDur, ease.in);
  return Math.min(a, b);
};

/** 稳定的伪随机（mulberry32），seed 固定 */
export const rand = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/** 打字：从 t0 开始，每秒 cps 个字，返回已经打出来的部分 */
export const typed = (text: string, t: number, t0: number, cps = 16) => {
  if (t < t0) return '';
  const chars = Array.from(text);
  const n = Math.min(chars.length, Math.floor((t - t0) * cps + 0.0001));
  return chars.slice(0, n).join('');
};
export const typeDone = (text: string, t0: number, cps = 16) => t0 + Array.from(text).length / cps;

/** 光标闪烁 */
export const blink = (t: number) => (Math.floor(t * 1.9) % 2 === 0 ? 1 : 0);

/** 循环里的手绘抖动帧（小咸鱼三张图轮换，每秒 8 次） */
export const boil = (t: number, n = 3, rate = 8) => Math.floor(t * rate) % n;
