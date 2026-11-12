// 片子的颜色和字体：从产品自己的界面长出来，不另造一套。
//
// 用法：截界面时在清单里写 palette（见 scripts/capture.mjs），坐标表 cap.json 里就有产品自己的
// 底色、文字色、强调色；makeTheme(CAP.palette) 把它们排成片子用的三档：
//   底（舞台、界面）· 强调（产品色，只给产品自己的状态和落位）· 文字（主、次、弱）
// 另有一档「机器色」info，只给扫描线、取景框这类机器视线，和强调色严格分开用。
//
// 亮场（paper / ink）不从界面取：它是全片只用一两次的反差，默认取中性的暖白；
// 产品有自己的浅色（比如应用图标的底色）就传进来。

export type Palette = Partial<Record<'bg' | 'surface' | 'surface2' | 'line' | 'text' | 'text2' | 'text3' | 'accent' | 'info', string | null>>;

export type CineTheme = {
  /** 舞台最深处（比界面底色更暗一档，但不是纯黑） */
  void: string;
  /** 舞台被主光照到的地方 */
  stage: string;
  /** 界面底色（产品自己的） */
  bg: string;
  surface: string;
  line: string;
  /** 文字三档：主、次、弱 */
  text: string;
  text2: string;
  text3: string;
  /** 产品强调色，和它提亮一档的高光 */
  accent: string;
  accentHi: string;
  /** 机器色：扫描、取景、标注 */
  info: string;
  /** 亮场舞台、亮场上的字 */
  paper: string;
  paperDeep: string;
  ink: string;
  inkSoft: string;
  font: {cjk: string; latin: string; mono: string};
};

type RGB = [number, number, number];
export const rgb = (hex: string): RGB => {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return [128, 128, 128];
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const hex = (c: RGB) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
/** 两色混合：p=0 是 a，p=1 是 b */
export const mixHex = (a: string, b: string, p: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * p, x[1] + (y[1] - x[1]) * p, x[2] + (y[2] - x[2]) * p]);
};
/** 带透明度的颜色：rgba(...)。渐变的透明端一律用同色 0 透明度，不写 transparent（会发灰发脏） */
export const alpha = (color: string, a: number) => {
  const c = rgb(color);
  return `rgba(${c[0]},${c[1]},${c[2]},${+a.toFixed(4)})`;
};
/** 相对亮度（0..1），判断一个颜色是深是浅 */
export const luma = (color: string) => {
  const c = rgb(color).map((v) => v / 255);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

// 字体：片场 public/fonts 里自带的三套（都是 SIL OFL，可以随工程分发）。
// 拉丁字母和数字走 Inter，中文走思源黑体；等宽小标用 JetBrains Mono。
const FONT = {
  cjk: 'Inter, NotoSans, "Microsoft YaHei UI", sans-serif',
  latin: 'Inter, NotoSans, sans-serif',
  mono: 'JBMono, Consolas, monospace',
};

const NEUTRAL: Required<Palette> = {
  bg: '#0f1216',
  surface: '#171b21',
  surface2: '#1d222a',
  line: '#2b323b',
  text: '#e9edf1',
  text2: '#b1b9c2',
  text3: '#8e97a1',
  accent: '#5b9dff',
  info: '#8fd3ff',
};

/** 从界面色板生成片子的主题。什么都不传就是一套中性的深色主题 */
export const makeTheme = (palette: Palette = {}, opts: {paper?: string; ink?: string} = {}): CineTheme => {
  const p = {...NEUTRAL} as Record<keyof Palette, string>;
  for (const k of Object.keys(palette) as (keyof Palette)[]) {
    const v = palette[k];
    if (typeof v === 'string' && /^#[0-9a-f]{3,6}$/i.test(v.trim())) p[k] = v.trim();
  }
  const dark = luma(p.bg) < 0.4;
  // 界面是浅色主题时，舞台仍然用深色：取文字色压暗当底（浅色界面放在深舞台上最显质感）
  const base = dark ? p.bg : mixHex(p.text, '#000000', 0.35);
  const paper = opts.paper ?? '#f2ede5';
  return {
    void: mixHex(base, '#000000', 0.5),
    stage: mixHex(base, '#8fa3b8', 0.1),
    bg: p.bg,
    surface: p.surface,
    line: p.line,
    text: dark ? p.text : '#eef1f4',
    text2: dark ? p.text2 : '#b4bcc6',
    text3: dark ? p.text3 : '#8a939e',
    accent: p.accent,
    accentHi: mixHex(p.accent, '#ffffff', 0.45),
    info: p.info,
    paper,
    paperDeep: mixHex(paper, '#8a7a62', 0.14),
    ink: opts.ink ?? mixHex(base, '#000000', 0.15),
    inkSoft: mixHex(paper, '#2a241c', 0.62),
    font: FONT,
  };
};

export const neutralTheme = makeTheme();
