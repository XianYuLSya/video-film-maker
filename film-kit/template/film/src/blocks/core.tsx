import React from 'react';
import {appear, clamp, ease, prog, spring} from '../lib/anim';
import {C, F} from '../lib/theme';
import {H, W} from '../lib/time';

// ═════════ 积木库的地基：画布与安全区、配色档、文字适配、出场节奏 ═════════
// 这里的东西所有积木都在用；使用者一般只需要 Tone、FitText 和 Stage 这几个名字。

// ───────── 画布与安全区 ─────────
/** 一块画布的可用区域。横屏 1920×1080：底部 y>940 是字幕条，左上角是章节牌，四周留 80 以上。
 *  竖屏 1080×1920：上 220、下 420 留给平台界面和字幕。 */
export type Stage = {w: number; h: number; left: number; right: number; top: number; bottom: number; cx: number; cy: number; vertical: boolean};

export const stageOf = (vertical?: boolean): Stage => {
  if (vertical) {
    const s = {w: 1080, h: 1920, left: 80, right: 1000, top: 240, bottom: 1480};
    return {...s, cx: 540, cy: (s.top + s.bottom) / 2, vertical: true};
  }
  const s = {w: W, h: H, left: 110, right: W - 110, top: 150, bottom: 915};
  return {...s, cx: W / 2, cy: (s.top + s.bottom) / 2, vertical: false};
};
export const innerW = (s: Stage) => s.right - s.left;
export const innerH = (s: Stage) => s.bottom - s.top;

/** 具名槽位：左半、居中、右半（横屏）。竖屏一律居中占满宽。 */
export type Slot = 'left' | 'center' | 'right';
export const slotBox = (slot: Slot, st: Stage, wFull = innerW(st)) => {
  if (st.vertical || slot === 'center') return {x: st.cx - wFull / 2, w: wFull};
  const half = (innerW(st) - 60) / 2;
  return slot === 'left' ? {x: st.left, w: half} : {x: st.right - half, w: half};
};

// ───────── 配色档 ─────────
/** 颜色含义：coral=强调/警告/错，mint=对/完成/通过，sun=荧光提示/当前，sky=中性信息/链接，ink=默认 */
export type Tone = 'coral' | 'mint' | 'sun' | 'sky' | 'ink';
export const TONE: Record<Tone, {main: string; pale: string; on: string; text: string}> = {
  coral: {main: C.coral, pale: C.coralPale, on: '#fff', text: C.coral},
  mint: {main: C.mintDeep, pale: '#DDF0E3', on: '#fff', text: C.mintDeep},
  sun: {main: C.sun, pale: C.sunPale, on: C.ink, text: '#B07A00'},
  sky: {main: C.sky, pale: '#DFE8FA', on: '#fff', text: C.sky},
  ink: {main: C.ink, pale: C.paper2, on: '#fff', text: C.ink},
};
export const RED = '#D9483B';

export const INK_LINE = (w = 5) => `${w}px solid ${C.ink}`;
/** 贴纸白卡的硬投影 */
export const HARD = '0 12px 0 rgba(35,40,66,0.14), 0 26px 50px rgba(35,40,66,0.16)';
export const HARD_S = '0 7px 0 rgba(35,40,66,0.14), 0 16px 30px rgba(35,40,66,0.14)';

// ───────── 字号档位 ─────────
/** 横屏字号档位（px）。正文不小于 28，说明小字不小于 24。 */
export const SIZE = {
  giant: 150, // 巨字：大数字、开场落点
  h1: 96, // 整屏大标题（得意黑）
  h2: 64, // 区块标题（得意黑）
  card: 46, // 卡片标题（黑体粗）
  body: 36, // 正文
  bodyMin: 28,
  note: 28, // 说明小字
  noteMin: 24,
};

// ───────── 开发提示 ─────────
const warned = new Set<string>();
export const warnOnce = (msg: string) => {
  if (warned.has(msg)) return;
  warned.add(msg);
  // eslint-disable-next-line no-console
  console.warn(`[积木] ${msg}`);
};

// ───────── 文字宽度估算与适配（确定性，不测 DOM） ─────────
export type Font = 'smiley' | 'zh' | 'ui' | 'mono' | 'fun';
export const FONT: Record<Font, string> = {smiley: F.smiley, zh: F.zh, ui: F.ui, mono: F.mono, fun: F.fun};

type G = {ch: string; em: boolean};

const isCJK = (c: number) => c >= 0x2e80;
/** 单字宽度（em）。宁可估宽一点：多估只会字略小，少估会出框。 */
export const charW = (ch: string, font: Font) => {
  const c = ch.codePointAt(0) ?? 0;
  if (font === 'mono') return isCJK(c) ? 1.0 : 0.6;
  if (isCJK(c)) return font === 'smiley' ? 0.9 : 1.0;
  if (ch === ' ') return 0.3;
  if ('iljI.,:;\'!|`'.includes(ch)) return 0.32;
  if ('mwMW@%'.includes(ch)) return 0.9;
  if (ch >= 'A' && ch <= 'Z') return font === 'smiley' ? 0.56 : 0.7;
  if (ch >= '0' && ch <= '9') return font === 'smiley' ? 0.52 : 0.64;
  if ((ch >= 'a' && ch <= 'z') || '-_/()[]{}<>=+*&#$?"~^'.includes(ch)) return font === 'smiley' ? 0.48 : 0.6;
  return 0.7;
};

/** 估算一行文字的宽度（px） */
export const textW = (text: string, size: number, font: Font = 'zh', ls = 0) => {
  let w = 0;
  for (const ch of Array.from(text)) w += charW(ch, font) * size + ls;
  return w;
};

/** 解析 *强调* 标记 */
const parse = (text: string, markup: boolean): G[][] => {
  const paras = text.split('\n');
  return paras.map((p) => {
    const out: G[] = [];
    let em = false;
    for (const ch of Array.from(p)) {
      if (markup && ch === '*') {
        em = !em;
        continue;
      }
      out.push({ch, em});
    }
    return out;
  });
};

// 不能放行首的标点 / 不能放行尾的标点
const NO_HEAD = '，。、！？；：）》」』】”’,.!?;:)%…·~';
const NO_TAIL = '（《「『【“‘(';
const isWordCh = (ch: string) => /[A-Za-z0-9_\-.:/@#%+&'’=]/.test(ch);

/** 把一段字切成不可分的小块：英文单词、数字整体不拆，标点粘在前后字上 */
const tokenize = (gs: G[]): G[][] => {
  const toks: G[][] = [];
  let i = 0;
  while (i < gs.length) {
    const g = gs[i];
    let tok: G[] = [g];
    i++;
    if (isWordCh(g.ch)) {
      while (i < gs.length && isWordCh(gs[i].ch)) tok.push(gs[i++]);
    }
    // 前括号粘到下一个字
    if (NO_TAIL.includes(g.ch) && i < gs.length) {
      const nx: G[] = [gs[i++]];
      if (isWordCh(nx[0].ch)) while (i < gs.length && isWordCh(gs[i].ch)) nx.push(gs[i++]);
      tok = tok.concat(nx);
    }
    // 行首禁则：后面的标点粘到本块
    while (i < gs.length && NO_HEAD.includes(gs[i].ch)) tok.push(gs[i++]);
    toks.push(tok);
  }
  return toks;
};

const gW = (gs: G[], size: number, font: Font, ls: number) => gs.reduce((s, g) => s + charW(g.ch, font) * size + ls, 0);

/** 按宽度折行，返回每行的字 */
const wrap = (paras: G[][], size: number, font: Font, ls: number, maxW: number): G[][] => {
  const lines: G[][] = [];
  for (const p of paras) {
    if (!p.length) {
      lines.push([]);
      continue;
    }
    let cur: G[] = [];
    let curW = 0;
    for (const tok of tokenize(p)) {
      const tw = gW(tok, size, font, ls);
      if (curW + tw <= maxW || cur.length === 0) {
        if (tw > maxW && cur.length === 0) {
          // 超长单词：逐字硬拆
          for (const g of tok) {
            const w1 = charW(g.ch, font) * size + ls;
            if (curW + w1 > maxW && cur.length) {
              lines.push(cur);
              cur = [];
              curW = 0;
            }
            cur.push(g);
            curW += w1;
          }
          continue;
        }
        cur = cur.concat(tok);
        curW += tw;
      } else {
        // 行首空格去掉
        lines.push(cur);
        const t2 = tok[0]?.ch === ' ' ? tok.slice(1) : tok;
        cur = t2;
        curW = gW(t2, size, font, ls);
      }
    }
    lines.push(cur);
  }
  return lines.map((l) => {
    let a = 0;
    let b = l.length;
    while (a < b && l[a].ch === ' ') a++;
    while (b > a && l[b - 1].ch === ' ') b--;
    return l.slice(a, b);
  });
};

export type FitOpts = {
  text: string;
  /** 可用宽度（px） */
  maxW: number;
  /** 理想字号 */
  size: number;
  /** 下限字号：正文 28，说明 24，标题自定 */
  min?: number;
  maxLines?: number;
  font?: Font;
  ls?: number;
  /** 多行时把各行长度拉匀（标题默认开） */
  balance?: boolean;
  /** 识别 *强调* 标记（等宽字体默认关） */
  markup?: boolean;
  /** 截断时报警用的名字 */
  who?: string;
  /** 不为了保持一行而缩字（聊天、终端这类要字号统一的地方用） */
  keepSize?: boolean;
};
export type Fit = {size: number; lines: G[][]; h: number; w: number; lh: number; truncated: boolean};

const cache = new Map<string, Fit>();

/** 适配：先轻缩（到 82%）保持一行，再换行（不超过 maxLines），再缩到下限，最后截断并报警 */
export const fit = (o: FitOpts, lh = 1.25): Fit => {
  const font = o.font ?? 'zh';
  const ls = o.ls ?? 0;
  const maxLines = Math.max(1, o.maxLines ?? 1);
  const min = Math.min(o.size, o.min ?? Math.min(o.size, SIZE.bodyMin));
  const markup = o.markup ?? font !== 'mono';
  const balance = o.balance ?? true;
  const key = [o.text, o.maxW, o.size, min, maxLines, font, ls, balance, markup, lh, o.keepSize ? 1 : 0].join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const paras = parse(o.text, markup);
  const lsAt = (s: number) => (ls * s) / o.size;
  const tryAt = (s: number) => wrap(paras, s, font, lsAt(s), o.maxW);
  let size = -1;
  let lines: G[][] = [];
  const soft = Math.max(min, Math.floor(o.size * 0.82));
  const explicitBreaks = paras.length;
  // 1) 一行（若文字本身含换行，就按那么多行）
  for (let s = o.size; s >= (o.keepSize ? o.size : soft); s -= 1) {
    const l = tryAt(s);
    if (l.length <= Math.max(1, explicitBreaks) && l.length <= maxLines) {
      size = s;
      lines = l;
      break;
    }
  }
  // 2) 换行 + 缩到下限
  if (size < 0) {
    for (let s = o.size; s >= min; s -= 1) {
      const l = tryAt(s);
      if (l.length <= maxLines) {
        size = s;
        lines = l;
        break;
      }
    }
  }
  let truncated = false;
  if (size < 0) {
    size = min;
    const l = tryAt(min).slice(0, maxLines);
    // 末行加省略号，确保放得下
    const last = l[l.length - 1];
    const ell: G = {ch: '…', em: false};
    while (last.length && gW(last.concat(ell), min, font, lsAt(min)) > o.maxW) last.pop();
    last.push(ell);
    lines = l;
    truncated = true;
    warnOnce(`${o.who ?? '文字'}放不下，已截断：「${o.text.slice(0, 30)}」（宽 ${Math.round(o.maxW)}，最多 ${maxLines} 行，下限 ${min}px）`);
  }
  // 3) 拉匀：多行时找最窄的宽度仍保持同样行数
  if (!truncated && balance && lines.length > 1 && explicitBreaks === 1) {
    const n = lines.length;
    let lo = o.maxW * 0.4;
    let hi = o.maxW;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      if (wrap(paras, size, font, lsAt(size), mid).length <= n) hi = mid;
      else lo = mid;
    }
    lines = wrap(paras, size, font, lsAt(size), hi);
  }
  const w = Math.max(0, ...lines.map((l) => gW(l, size, font, lsAt(size))));
  const res: Fit = {size, lines, h: lines.length * size * lh, w, lh, truncated};
  cache.set(key, res);
  return res;
};

/** 只要高度（布局计算用） */
export const fitH = (o: FitOpts, lh = 1.25) => fit(o, lh).h;

export type FitTextProps = FitOpts & {
  color?: string;
  /** 强调色（*星号* 包住的字） */
  em?: string;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  lh?: number;
  style?: React.CSSProperties;
  /** 描边（梗图大字用），如 '10px #232842' */
  stroke?: string;
  shadow?: string;
  /** 只显示前 n 个字（逐字打出 / 流式输出用；版式按全文排好，不会跳） */
  reveal?: number;
  /** 前 n 个字用强调色（终端提示符用） */
  lead?: number;
};

/** 按已显示字数截取各行 */
const revealLines = (lines: G[][], n?: number) => {
  if (n === undefined) return lines;
  const out: G[][] = [];
  let left = Math.max(0, Math.floor(n));
  for (const l of lines) {
    if (left <= 0) break;
    out.push(l.slice(0, left));
    left -= l.length;
  }
  return out;
};
/** 已显示 n 个字时占几行 */
export const revealedLines = (f: Fit, n?: number) => Math.max(1, revealLines(f.lines, n).length);
/** 一段字的总字数（去掉标记后） */
export const glyphCount = (f: Fit) => f.lines.reduce((a, l) => a + l.length, 0);

/** 自适应文字：给宽度和理想字号，自动缩字号、换行、截断，永不出框 */
export const FitText: React.FC<FitTextProps> = (p) => {
  const lh = p.lh ?? 1.25;
  const f = fit(p, lh);
  const font = p.font ?? 'zh';
  const ls = ((p.ls ?? 0) * f.size) / p.size;
  return (
    <div
      style={{
        width: p.maxW,
        fontFamily: FONT[font],
        fontWeight: p.weight ?? (font === 'zh' ? 800 : font === 'ui' ? 800 : 400),
        fontSize: f.size,
        lineHeight: lh,
        letterSpacing: ls,
        color: p.color ?? C.ink,
        textAlign: p.align ?? 'left',
        WebkitTextStroke: p.stroke,
        paintOrder: p.stroke ? 'stroke fill' : undefined,
        textShadow: p.shadow,
        ...p.style,
      }}
    >
      {revealLines(f.lines, p.reveal).map((l, i) => (
        <div key={i} style={{whiteSpace: 'pre', height: f.size * lh}}>
          {runs(l, p.lead === undefined ? undefined : p.lead - f.lines.slice(0, i).reduce((a, x) => a + x.length, 0)).map((r, k) =>
            r.em ? (
              <span key={k} style={{color: p.em ?? C.coral}}>
                {r.s}
              </span>
            ) : (
              <span key={k}>{r.s}</span>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

const runs = (l: G[], lead?: number) => {
  const out: {s: string; em: boolean}[] = [];
  l.forEach((g, i) => {
    const em = g.em || (lead !== undefined && i < lead);
    const last = out[out.length - 1];
    if (last && last.em === em) last.s += g.ch;
    else out.push({s: g.ch, em});
  });
  return out;
};

/** 去掉 *强调* 标记后的纯文字 */
export const plain = (s: string) => s.split('*').join('');

// ───────── 出场节奏 ─────────
/** 弹出：弹簧 0→1（略过冲，最多 1.2） */
export const pop = (t: number, t0: number, k = 200, d = 14) => clamp(spring(t - t0, k, d), 0, 1.2);
/** 可见度：t0 起 0.3s 淡入，t1 起 0.3s 淡出 */
export const vis = (t: number, t0: number, t1?: number, inDur = 0.3, outDur = 0.3) => appear(t, t0, t1 ?? Infinity, inDur, outDur);
/** 退场进度 0..1 */
export const outP = (t: number, t1?: number, dur = 0.3) => (t1 === undefined ? 0 : prog(t, t1, dur, ease.in));
export const shown = (t: number, at: number | undefined) => at === undefined || t >= at;

/** 整块积木的外壳：负责出场前不画、退场淡出下沉 */
export const Out: React.FC<{t: number; t0: number; t1?: number; children: React.ReactNode; z?: number}> = ({t, t0, t1, children, z}) => {
  if (t < t0 - 0.001) return null;
  const o = outP(t, t1);
  if (o >= 1) return null;
  return <div style={{position: 'absolute', inset: 0, opacity: 1 - o, transform: `translateY(${o * 24}px)`, zIndex: z, pointerEvents: 'none'}}>{children}</div>;
};

/** 一条数据什么时候出现：没给 at 就跟着 t0 依次错开 */
export const atOf = (at: number | undefined, t0: number, i: number, gap = 0.25) => at ?? t0 + 0.2 + i * gap;

export {C, F};
