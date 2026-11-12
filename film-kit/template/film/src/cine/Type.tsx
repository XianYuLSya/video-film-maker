// 字：这类片子里字只有三种身份，各有锁死的版式。
//   Statement   大字陈述：粗、大、确定。一屏一句，最多两行，上白下灰两段语气
//   Label       等宽小标：`02 PROFILE` 这种精密感纹理，不要求观众读
//   TypeWindow  字里透界面：全片的顶点镜头，巨大的字是窗口，界面在字的笔画里
import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import {H, W} from '../lib/time';
import {clamp} from '../lib/anim';
import {live, run, safe, warn} from './motion';
import {Env} from './Stage';
import {CineTheme, alpha} from './theme';

// ───────── 估字宽（不进浏览器量，够判断「放不放得下」） ─────────
const charEm = (ch: string) => {
  const c = ch.codePointAt(0) ?? 0;
  if (c >= 0x2e80) return 1; // 中日韩文字和全角标点
  if (ch === ' ') return 0.28;
  if (/[A-Z]/.test(ch)) return 0.68;
  if (/[a-z]/.test(ch)) return 0.56;
  if (/[0-9]/.test(ch)) return 0.62;
  return 0.36;
};
export const textEm = (s: string, tracking = 0) => Array.from(s).reduce((a, ch) => a + charEm(ch) + tracking, 0);

// ───────── 大字陈述 ─────────
export type Tone = 'hi' | 'dim' | 'accent';
export type StatementLine = string | {text: string; tone?: Tone};
export type StatementLayout = 'left' | 'right' | 'topLeft' | 'bottomLeft' | 'center';

// 版式是锁死的：位置、可用宽度、对齐。界面摆在字的另一边，字底下自动压一层暗场，保证字永远落在干净的底上。
const LAYOUT: Record<StatementLayout, {x: number; maxW: number; align: 'left' | 'center'; v: 'mid' | 'top' | 'bottom'; y: number}> = {
  left: {x: 140, maxW: 800, align: 'left', v: 'mid', y: 540},
  right: {x: 1150, maxW: 650, align: 'left', v: 'mid', y: 540},
  topLeft: {x: 140, maxW: 1100, align: 'left', v: 'top', y: 172},
  bottomLeft: {x: 140, maxW: 1100, align: 'left', v: 'bottom', y: 940},
  center: {x: 210, maxW: 1500, align: 'center', v: 'mid', y: 540},
};
const SIZE = {xl: 128, l: 104, m: 88} as const;
const TRACK = -0.03;
const LH = 1.16;

/** 大字实际用多大的字：放不下就缩，最小 72 */
const fitSize = (layout: StatementLayout, plain: string[], size: keyof typeof SIZE) => {
  const L = LAYOUT[layout] ?? LAYOUT.left;
  const fs: number = SIZE[size] ?? SIZE.l;
  const widest = Math.max(...plain.map((r) => textEm(r, TRACK)));
  return widest * fs > L.maxW ? Math.max(72, Math.floor(L.maxW / widest)) : fs;
};
const subSizeOf = (fs: number) => Math.round(Math.min(44, Math.max(34, fs * 0.4)));

/** 大字这一块在画面上占的矩形（给 Take 判断「大字有没有压到主角」用） */
export const statementBox = (layout: StatementLayout, lines: StatementLine[], size: keyof typeof SIZE = 'l', sub?: string) => {
  const L = LAYOUT[layout] ?? LAYOUT.left;
  const plain = lines.map((l) => (typeof l === 'string' ? l : l.text).replace(/\|/g, ''));
  const fs = fitSize(layout, plain, size);
  const w = Math.max(...plain.map((r) => textEm(r, TRACK))) * fs;
  const h = plain.length * fs * LH + (sub ? subSizeOf(fs) * 1.5 + 22 : 0);
  const top = L.v === 'mid' ? L.y - h / 2 : L.v === 'top' ? L.y : L.y - h;
  const x = L.align === 'center' ? L.x + (L.maxW - w) / 2 : L.x;
  return {x, y: top, w: Math.min(w, L.maxW), h};
};

export type StatementProps = {
  t: number;
  /** 第一段字开始出现的时刻；退场时刻（不给就一直在） */
  t0: number;
  t1?: number;
  theme: CineTheme;
  env?: Env;
  /** 一到两行。行内用 | 切成几段依次出现，如 '各自登录，|互不串号。'。默认第一行亮、后面的行灰 */
  lines: StatementLine[];
  layout?: StatementLayout;
  size?: keyof typeof SIZE;
  /** 副句：小一号的补充说明，一行 */
  sub?: string;
  /** 出场方式：rise 浮上来（默认）· wipe 从行底推上来 · cut 踩着拍子直接出现 */
  enter?: 'rise' | 'wipe' | 'cut';
  /** 字底下压暗的强度 0–1，默认 1（亮场自动关掉） */
  scrim?: number;
};

// box 是字块（大字加副句）在画面上占的上下范围：上下两种版位的暗带跟着字块走，保证最后一行和副句也落在暗处。
// 浅色界面上这一点尤其要紧：暗带短了，第二行和副句就压在亮界面上，读不出来。
const scrimOf = (layout: StatementLayout, c: string, k: number, box: {top: number; bottom: number}) => {
  const pct = (px: number) => `${(clamp(px / H) * 100).toFixed(1)}%`;
  if (layout === 'right') return `linear-gradient(90deg, ${alpha(c, 0)} 44%, ${alpha(c, 0.8 * k)} 60%, ${alpha(c, 0.94 * k)} 100%)`;
  if (layout === 'left') return `linear-gradient(270deg, ${alpha(c, 0)} 46%, ${alpha(c, 0.8 * k)} 62%, ${alpha(c, 0.94 * k)} 100%)`;
  // 上下两种版位压的是一整条横带：字在左，但右边同一高度的界面也要退掉，不然字旁边飘着半截界面
  if (layout === 'topLeft') {
    const edge = Math.max(H * 0.26, box.bottom + 44); // 暗到这里为止是实的，再往下 0.17 屏高过渡完
    return `linear-gradient(180deg, ${alpha(c, 0.96 * k)} 0%, ${alpha(c, 0.9 * k)} ${pct(edge)}, ${alpha(c, 0)} ${pct(edge + H * 0.17)})`;
  }
  if (layout === 'bottomLeft') {
    const edge = Math.min(H * 0.58, box.top - 44);
    return `linear-gradient(0deg, ${alpha(c, 0.97 * k)} 0%, ${alpha(c, 0.93 * k)} ${pct(H - edge)}, ${alpha(c, 0)} ${pct(H - edge + H * 0.17)})`;
  }
  return `radial-gradient(ellipse 62% 46% at 50% 50%, ${alpha(c, 0.8 * k)} 0%, ${alpha(c, 0)} 100%)`;
};

export const Statement: React.FC<StatementProps> = ({t, t0, t1 = Infinity, theme, env = 'dark', lines, layout = 'left', size = 'l', sub, enter = 'rise', scrim = 1}) => {
  const who = 'Statement';
  const L = LAYOUT[layout] ?? LAYOUT.left;
  if (lines.length > 2) warn(who, `一屏一句，最多两行；现在有 ${lines.length} 行，后面的行会把画面挤满`);
  const rows = lines.map((l, i) => {
    const o = typeof l === 'string' ? {text: l} : l;
    return {segs: o.text.split('|'), plain: o.text.replace(/\|/g, ''), tone: o.tone ?? (i === 0 ? 'hi' : 'dim')};
  });
  // 放不下就缩，缩到 72 还放不下就提醒改短
  const widest = Math.max(...rows.map((r) => textEm(r.plain, TRACK)));
  if (widest * 72 > L.maxW) warn(who, `「${rows[0].plain}…」在 ${layout} 版式里放不下（每行最多约 ${Math.floor(L.maxW / 72)} 个字），已缩到 72px，请把句子改短`);
  const fs = fitSize(layout, rows.map((r) => r.plain), size);
  const lh = LH;
  const subSize = subSizeOf(fs);
  const blockH = rows.length * fs * lh + (sub ? subSize * 1.5 + 22 : 0);
  const top = L.v === 'mid' ? L.y - blockH / 2 : L.v === 'top' ? L.y : L.y - blockH;
  const out = t1 === Infinity ? 1 : 1 - run(t, t1, 0.28, 'exit');
  const vis = t < t0 ? 0 : out;
  if (vis <= 0.001) return null;
  const color = (tone: Tone) => (env === 'light' ? (tone === 'hi' ? theme.ink : tone === 'accent' ? theme.accent : theme.inkSoft) : tone === 'hi' ? theme.text : tone === 'accent' ? theme.accent : theme.text3);
  const sk = env === 'light' ? 0 : safe(who, 'scrim', scrim, 0, 1);
  const scrimVis = Math.min(run(t, t0 - 0.15, 0.6, 'ease'), out);
  let n = 0;
  return (
    <>
      {sk > 0 && <AbsoluteFill style={{pointerEvents: 'none', zIndex: 1, opacity: scrimVis, background: scrimOf(layout, theme.void, sk, {top, bottom: top + blockH})}} />}
      <div
        style={{
          position: 'absolute',
          zIndex: 2,
          left: L.x,
          top,
          width: L.maxW,
          textAlign: L.align,
          fontFamily: theme.font.cjk,
          fontWeight: 800,
          fontSize: fs,
          lineHeight: lh,
          letterSpacing: `${TRACK}em`,
          opacity: out,
          filter: out < 0.999 ? `blur(${((1 - out) * 10).toFixed(2)}px)` : undefined,
        }}
      >
        {rows.map((r, li) => (
          <div key={li} style={{color: color(r.tone), whiteSpace: 'nowrap', overflow: enter === 'wipe' ? 'hidden' : undefined, height: enter === 'wipe' ? fs * lh : undefined}}>
            {r.segs.map((s, si) => {
              const start = t0 + n * 0.12 + li * 0.08;
              n++;
              let style: React.CSSProperties;
              if (enter === 'cut') {
                const p = run(t, start, 0.22, 'settle');
                style = {opacity: t >= start ? 1 : 0, transform: `scale(${(1.035 - 0.035 * p).toFixed(4)})`, transformOrigin: '0 60%'};
              } else if (enter === 'wipe') {
                const p = run(t, start, 0.8, 'ease');
                style = {transform: `translateY(${((1 - p) * 106).toFixed(2)}%)`};
              } else {
                const p = run(t, start, 0.7, 'settle');
                style = {opacity: clamp(p * 1.4), transform: `translateY(${((1 - p) * fs * 0.34).toFixed(2)}px)`, filter: p < 0.999 ? `blur(${((1 - p) * 16).toFixed(2)}px)` : undefined};
              }
              return (
                <span key={si} style={{display: 'inline-block', whiteSpace: 'pre', ...style}}>
                  {s}
                </span>
              );
            })}
          </div>
        ))}
        {sub && (
          <div
            style={{
              marginTop: 22,
              fontSize: subSize,
              fontWeight: 500,
              letterSpacing: '0em',
              lineHeight: 1.5,
              color: env === 'light' ? theme.inkSoft : theme.text2,
              opacity: live(t, t0 + n * 0.12 + 0.25, Infinity, 0.6),
              whiteSpace: 'nowrap',
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </>
  );
};

// ───────── 等宽小标 ─────────
export type LabelProps = {
  t: number;
  t0: number;
  t1?: number;
  theme: CineTheme;
  env?: Env;
  /** 编号，如 '02'（产品色） */
  index?: string;
  /** 大写英文短语，如 'PROFILE'。它是纹理，不是给人读的信息，别把要紧的话放这里 */
  text: string;
  corner?: 'tl' | 'tr' | 'bl' | 'br';
};

export const Label: React.FC<LabelProps> = ({t, t0, t1 = Infinity, theme, env = 'dark', index, text, corner = 'tl'}) => {
  const vis = live(t, t0, t1, 0.5, 0.25);
  if (vis <= 0.001) return null;
  // 逐字打出来，0.5 秒打完
  const n = Math.round(text.length * clamp((t - t0) / 0.5));
  const pos: React.CSSProperties = {
    left: corner === 'tl' || corner === 'bl' ? 140 : undefined,
    right: corner === 'tr' || corner === 'br' ? 140 : undefined,
    top: corner === 'tl' || corner === 'tr' ? 92 : undefined,
    bottom: corner === 'bl' || corner === 'br' ? 92 : undefined,
  };
  return (
    <div data-probe="skip" style={{position: 'absolute', zIndex: 3, ...pos, display: 'flex', gap: 18, whiteSpace: 'pre', fontFamily: theme.font.mono, fontSize: 22, fontWeight: 500, letterSpacing: '0.16em', opacity: vis, color: env === 'light' ? alpha(theme.inkSoft, 0.75) : alpha(theme.text3, 0.85)}}>
      {index && <span style={{color: env === 'light' ? theme.accent : theme.accent}}>{index}</span>}
      <span>{text.slice(0, n)}</span>
    </div>
  );
};

// ───────── 一行补充说明 ─────────
export type NoteProps = {
  t: number;
  t0: number;
  t1?: number;
  theme: CineTheme;
  env?: Env;
  /** 一行，24 个字以内。用 *星号* 包住要加重的几个字 */
  text: string;
  /** 放在画面下方（默认）还是上方，水平居中 */
  place?: 'bottom' | 'top';
};

/** 一行居中的补充说明：跟在主陈述后面，把那句话说完整。字号锁在 44（手机上也读得清） */
export const Note: React.FC<NoteProps> = ({t, t0, t1 = Infinity, theme, env = 'dark', text, place = 'bottom'}) => {
  const vis = live(t, t0, t1, 0.6, 0.25);
  if (vis <= 0.001) return null;
  const plain = text.replace(/\*/g, '');
  if (textEm(plain) > 30) warn('Note', `「${plain}」太长，一行放不下，改到 24 个字以内`);
  const parts = text.split('*');
  const p = run(t, t0, 0.6, 'settle');
  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 2,
        left: 0,
        width: W,
        top: place === 'bottom' ? 892 : 150,
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontFamily: theme.font.cjk,
        fontSize: 44,
        fontWeight: 500,
        lineHeight: 1.3,
        opacity: vis,
        transform: `translateY(${((1 - p) * 16).toFixed(2)}px)`,
        color: env === 'light' ? theme.inkSoft : theme.text2,
      }}
    >
      {parts.map((s, i) => (i % 2 ? <span key={i} style={{fontWeight: 750, color: env === 'light' ? theme.ink : theme.text}}>{s}</span> : <React.Fragment key={i}>{s}</React.Fragment>))}
    </div>
  );
};

// ───────── 字里透界面 ─────────
export type TypeWindowProps = {
  t: number;
  /** 字出现的时刻 */
  t0: number;
  theme: CineTheme;
  /** 出场：cut（默认）在 t0 那一拍直接出现、略微收紧落定，配硬切用；wipe 从上往下揭开 */
  enter?: 'cut' | 'wipe';
  /** 一到两行，每行最多 4 个汉字。字就是窗口，越少越粗越好 */
  lines: string[];
  /** 字号，默认 300。两行各 4 字时 300 正好撑满安全区 */
  size?: number;
  /** 字里的界面压暗多少（0–0.6）：保证远看先读到字，再看到字里的界面。默认 0.18 */
  dim?: number;
  /** 冲进字里：到 through.at 时刻开始，dur 秒内镜头从某一笔画冲进去，界面接管全屏。
   *  origin 是冲入点（画面 px），必须落在笔画实心处，不给就取画面中心 */
  through?: {at: number; dur?: number; origin?: [number, number]};
  /** 字里看到的界面：一层铺满画面的内容（通常是 <Screen> 加它自己的底色） */
  children: React.ReactNode;
};

/** 字的窗口。它只管「字形的洞」和洞口的立体感；洞外面的舞台、小标、副句由场景自己放在它上面或下面 */
export const TypeWindow: React.FC<TypeWindowProps> = ({t, t0, theme, enter = 'cut', lines, size = 300, dim = 0.18, through, children}) => {
  const who = 'TypeWindow';
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (lines.length > 2) warn(who, '最多两行');
  const fs = safe(who, 'size', size, 180, 380);
  const track = -0.02;
  const widest = Math.max(...lines.map((l) => textEm(l, track)));
  if (widest * fs > W - 280) warn(who, `「${lines.join(' / ')}」在 ${fs}px 下超出安全区，每行最多 ${Math.floor((W - 280) / fs)} 个汉字`);
  const lh = 1.07;
  const blockH = lines.length * fs * lh - (lh - 1) * fs;
  const top = H / 2 - blockH / 2 - fs * 0.03;
  const base = (i: number) => top + i * fs * lh + fs * 0.88;

  // 入场：从 1.04 收到 1（wipe 时同时从上往下揭开）
  const inP = run(t, t0, 0.75, 'ease');
  if (t < t0) return null;
  // 冲入：先吸一口气（缩 3%），再按指数冲进去。指数冲入才是匀速穿过的观感，线性放大会越冲越慢
  const dur = through?.dur ?? 0.55;
  const breath = through ? run(t, through.at - 0.3, 0.3, 'drift') : 0;
  const rush = through ? Math.pow(clamp((t - through.at) / dur), 1.7) : 0;
  const s0 = (1.04 - 0.04 * inP) * (1 - 0.03 * breath);
  const MAX = 70;
  const s = s0 * Math.pow(MAX / s0, rush);
  const ox = through?.origin?.[0] ?? W / 2;
  const oy = through?.origin?.[1] ?? H / 2;
  // 冲入时把冲入点逐渐挪到画面中心
  const dx = (W / 2 - ox) * rush;
  const dy = (H / 2 - oy) * rush;
  const tf = `translate(${(ox + dx).toFixed(2)} ${(oy + dy).toFixed(2)}) scale(${s.toFixed(5)}) translate(${-ox} ${-oy})`;
  const takeover = clamp((rush - 0.8) / 0.14); // 冲到头，界面接管全屏
  const reveal = `inset(0 0 ${((1 - inP) * 100).toFixed(2)}% 0)`;
  const edge = 1 - clamp(rush / 0.3); // 洞口的立体感在冲入时很快消失

  const texts = (fill: string, extra?: React.SVGProps<SVGTextElement>) =>
    lines.map((l, i) => (
      <text key={i} x={W / 2} y={base(i)} textAnchor="middle" fontFamily="NotoSans, sans-serif" fontWeight={900} fontSize={fs} letterSpacing={`${track}em`} fill={fill} transform={tf} {...extra}>
        {l}
      </text>
    ));
  const dimK = safe(who, 'dim', dim, 0, 0.6) * (1 - rush);

  return (
    <AbsoluteFill style={{clipPath: enter === 'wipe' && inP < 1 ? reveal : undefined}}>
      {/* 字形在这里出现三遍（裁剪路径、影子遮罩、高光遮罩）：排版体检只量第一遍；冲入时字在放大，也不量 */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}} data-probe={rush > 0 ? 'skip' : undefined}>
        <defs>
          <clipPath id={`c${uid}`} clipPathUnits="userSpaceOnUse">
            {texts('#000')}
          </clipPath>
          <filter id={`b${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={fs * 0.03} />
          </filter>
          <filter id={`b2${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={fs * 0.006} />
          </filter>
          {/* 洞口上沿的影子：舞台在上、界面在下，影子落在界面上 = 字形往右下挪一点、取它外面的部分 */}
          <mask id={`s${uid}`} data-probe="skip" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <g filter={`url(#b${uid})`} transform={`translate(${fs * 0.012} ${fs * 0.05})`}>
              {texts('#000')}
            </g>
          </mask>
          {/* 洞口下沿的一线高光：字形往上挪一点、取它外面的部分 */}
          <mask id={`h${uid}`} data-probe="skip" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <g filter={`url(#b2${uid})`} transform={`translate(0 ${-fs * 0.01})`}>
              {texts('#000')}
            </g>
          </mask>
        </defs>
      </svg>
      {/* 字里的界面：整层被字形裁住 */}
      <AbsoluteFill style={{clipPath: takeover >= 1 ? undefined : `url(#c${uid})`}}>
        {children}
        {dimK > 0 && <AbsoluteFill style={{background: alpha(theme.void, dimK)}} />}
      </AbsoluteFill>
      {takeover > 0 && takeover < 1 && <AbsoluteFill style={{opacity: takeover}}>{children}</AbsoluteFill>}
      {edge > 0 && (
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity: edge}}>
          <g clipPath={`url(#c${uid})`}>
            <rect width={W} height={H} fill="rgba(0,0,0,0.62)" mask={`url(#s${uid})`} />
            <rect width={W} height={H} fill="rgba(255,255,255,0.16)" mask={`url(#h${uid})`} />
          </g>
        </svg>
      )}
    </AbsoluteFill>
  );
};
