// 品牌片风格包 · 配色与字体
// 一个 theme 就是一整套协调的颜色：传品牌主色和底色（可省），其余全部推出来。
// 原则：一屏只用「底 + 一种墨色的三档透明度 + 一个强调色」，强调色只点一两处。

export type Mode = 'dark' | 'light';

export type Theme = {
  mode: Mode;
  /** 底色（不是纯黑纯白） */
  bg: string;
  /** 比底色略亮/略暗一档，用于大块面、光斑中心 */
  bg2: string;
  /** 浮在底上的面（极少用：卡片、圆盘） */
  surface: string;
  /** 主墨色：标题、徽标线 */
  ink: string;
  /** 次墨色：副标题、标语 */
  ink2: string;
  /** 弱墨色：注释、角标、小字 */
  ink3: string;
  /** 细线（网格、分隔线、轨道） */
  line: string;
  /** 强一点的细线（到位后的线、选中框） */
  line2: string;
  /** 品牌主色（原样） */
  accent: string;
  /** 在这个底上看得清的主色（深底提亮、浅底压暗） */
  accentInk: string;
  /** 主色的淡底 */
  accentSoft: string;
  /** 光斑的颜色（两种：主色光、墨色光） */
  pool: [string, string];
  /** 胶片颗粒的强度 0..1，Stage 用 */
  grain: number;
  /** 暗角强度 0..1 */
  vignette: number;
};

// ───────── 颜色小工具 ─────────
const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
export const rgbOf = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** 两色按 p 混合（0 = a，1 = b），返回 #rrggbb */
export const mix = (a: string, b: string, p: number) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `#${hex2(x[0] + (y[0] - x[0]) * p)}${hex2(x[1] + (y[1] - x[1]) * p)}${hex2(x[2] + (y[2] - x[2]) * p)}`;
};
/** 给颜色加透明度 */
export const alpha = (hex: string, a: number) => {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};

/**
 * 造一套配色。
 * makeTheme({mode: 'dark', accent: '#2B8A57'})                 深底，底色由主色微微染出来
 * makeTheme({mode: 'light', accent: '#4F46E5', bg: '#F4F2EE'})  浅底，自己定底色
 */
export const makeTheme = (o: {mode: Mode; accent: string; bg?: string; ink?: string}): Theme => {
  const dark = o.mode === 'dark';
  const bg = o.bg ?? (dark ? mix('#0D0F11', o.accent, 0.07) : mix('#F4F2EC', o.accent, 0.025));
  const ink = o.ink ?? (dark ? '#EEEAE2' : '#1C1C1A');
  return {
    mode: o.mode,
    bg,
    bg2: dark ? mix(bg, ink, 0.05) : mix(bg, '#FFFFFF', 0.55),
    surface: dark ? mix(bg, ink, 0.08) : mix(bg, '#FFFFFF', 0.75),
    ink,
    ink2: alpha(ink, dark ? 0.68 : 0.7),
    ink3: alpha(ink, dark ? 0.42 : 0.48),
    line: alpha(ink, dark ? 0.13 : 0.12),
    line2: alpha(ink, dark ? 0.34 : 0.3),
    accent: o.accent,
    accentInk: dark ? mix(o.accent, '#FFFFFF', 0.32) : mix(o.accent, '#000000', 0.08),
    accentSoft: alpha(o.accent, dark ? 0.18 : 0.1),
    pool: dark ? [alpha(o.accent, 0.2), alpha(ink, 0.06)] : [alpha(o.accent, 0.035), alpha('#FFFFFF', 0.7)],
    grain: dark ? 0.07 : 0.045,
    vignette: dark ? 0.55 : 0.11,
  };
};

/** 几套现成的：中性石墨（深）、象牙（浅），和任何品牌都不冲突 */
export const THEMES = {
  graphite: makeTheme({mode: 'dark', accent: '#7C8CFF', bg: '#0E0F12'}),
  ivory: makeTheme({mode: 'light', accent: '#3A5BD9', bg: '#F3F1EC'}),
};

// ───────── 字体 ─────────
// 片场已加载：Inter（100–900）、NotoSans SC（100–900）、NotoSerif SC（200–900）、JetBrains Mono。
export const BF = {
  /** 标题、字标：英文走 Inter，中文落到思源黑 */
  sans: '"Inter", "NotoSans", "Noto Sans SC", sans-serif',
  /** 纯中文段落（中文标点更好看） */
  zh: '"NotoSans", "Noto Sans SC", sans-serif',
  /** 需要人文感时偶尔用（宋体），一部片子最多一处 */
  serif: '"NotoSerif", "Noto Serif SC", serif',
  /** 角标、小标签、数据 */
  mono: '"JBMono", "Consolas", monospace',
};

/** 字号档位（1920×1080）。品牌片字大而细：大字 300 字重，小字 500 加字距。 */
export const TYPE = {
  hero: {size: 132, weight: 300, tracking: '-0.03em'},
  title: {size: 88, weight: 300, tracking: '-0.02em'},
  zhTitle: {size: 76, weight: 300, tracking: '0.04em'},
  sub: {size: 40, weight: 400, tracking: '0.02em'},
  body: {size: 32, weight: 400, tracking: '0.01em'},
  label: {size: 22, weight: 500, tracking: '0.18em'},
};
