import React from 'react';
import type {Ev} from '../kit/sfx';
import {BE, DUR, STAGGER, clamp, prog} from './motion';
import {BF, TYPE, Theme} from './theme';

// 品牌片风格包 · 文字
// 大字细字重、字少、一次只出一句。`*这样*` 包起来的字用强调色（一句里最多一处）。

export type RevealMode = 'mask' | 'chars' | 'track' | 'fade';

type Run = {s: string; hi: boolean};
const parseRuns = (text: string): Run[] =>
  text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((s) => (s.startsWith('*') && s.endsWith('*') ? {s: s.slice(1, -1), hi: true} : {s, hi: false}));

// ───────── 量字宽（用画布 measureText，字体加载后结果固定） ─────────
let CANVAS: CanvasRenderingContext2D | null = null;
const CACHE = new Map<string, number>();
/** 一行字在给定字体下的宽度（px），tracking 写 em 数（-0.02 这种） */
export const textWidth = (text: string, size: number, weight = 400, font = BF.sans, trackingEm = 0) => {
  const key = `${text}|${size}|${weight}|${font}|${trackingEm}`;
  const hit = CACHE.get(key);
  if (hit !== undefined) return hit;
  if (!CANVAS && typeof document !== 'undefined') CANVAS = document.createElement('canvas').getContext('2d');
  let w = Array.from(text).length * size * 0.6;
  if (CANVAS) {
    CANVAS.font = `${weight} ${size}px ${font}`;
    w = CANVAS.measureText(text).width;
  }
  w += Array.from(text).length * trackingEm * size;
  CACHE.set(key, w);
  return w;
};
const em = (tr: string) => (tr.endsWith('em') ? parseFloat(tr) : 0);

/**
 * 文字出场。四种：
 * - mask（默认）：每行从下方一道看不见的缝里升上来。最「品牌」，标题首选
 * - chars：逐字淡入并轻轻上浮、由虚到实。短句、标语用（≤ 14 个字）
 * - track：字距从宽收拢到正常，同时由虚到实。字标、英文大字用
 * - fade：淡入加 16px 位移。副标题、小字用
 * 多行用 \n 分开，行与行自动错开。out 给了就在那时退场（退场比入场快）。
 */
export const Reveal: React.FC<{
  t: number;
  at: number;
  text: string;
  mode?: RevealMode;
  size?: number;
  weight?: number;
  color: string;
  accent?: string;
  font?: string;
  tracking?: string;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  dur?: number;
  stagger?: number;
  out?: number;
  /** 给 *强调* 的字画一道荧光笔式的底衬（官网「各归各位」的写法），从 at 开始自左向右划过 */
  mark?: {at: number; color: string};
  style?: React.CSSProperties;
}> = ({t, at, text, mode = 'mask', size = TYPE.title.size, weight = TYPE.title.weight, color, accent, font = BF.sans, tracking = '0em', lineHeight = 1.18, align = 'left', dur, stagger, out, mark, style}) => {
  if (t < at - 0.001) return <div style={{height: 0, overflow: 'hidden'}} />;
  const lines = text.split('\n');
  const outP = out === undefined ? 0 : prog(t, out, DUR.short, BE.in);
  const base: React.CSSProperties = {
    fontFamily: font,
    fontSize: size,
    fontWeight: weight,
    letterSpacing: tracking,
    lineHeight,
    color,
    textAlign: align,
    whiteSpace: 'pre',
    opacity: 1 - outP,
    transform: outP ? `translateY(${-8 * outP}px)` : undefined,
    fontKerning: 'normal',
    ...style,
  };
  const runSpans = (line: string, mapChar?: (ch: string, i: number) => React.ReactNode) => {
    let k = 0;
    const mp = mark ? prog(t, mark.at, DUR.long, BE.move) : 0;
    const markStyle: React.CSSProperties =
      mark && mp > 0
        ? {backgroundImage: `linear-gradient(transparent 64%, ${mark.color} 64%, ${mark.color} 92%, transparent 92%)`, backgroundSize: `${mp * 100}% 100%`, backgroundRepeat: 'no-repeat'}
        : {};
    return parseRuns(line).map((r, ri) => (
      <span key={ri} style={{color: r.hi ? accent ?? color : undefined, ...(r.hi ? markStyle : {})}}>
        {mapChar ? Array.from(r.s).map((ch) => mapChar(ch, k++)) : r.s}
      </span>
    ));
  };

  if (mode === 'mask') {
    const d = dur ?? DUR.long;
    const sg = stagger ?? STAGGER.block;
    return (
      <div style={base}>
        {lines.map((ln, i) => {
          const p = prog(t, at + i * sg, d, BE.out);
          return (
            <div key={i} style={{overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em'}}>
              <div style={{transform: `translateY(${(1 - p) * 108}%)`}}>{runSpans(ln)}</div>
            </div>
          );
        })}
      </div>
    );
  }
  if (mode === 'chars') {
    const d = dur ?? DUR.base;
    const sg = stagger ?? STAGGER.char;
    let n = 0;
    return (
      <div style={base}>
        {lines.map((ln, li) => (
          <div key={li}>
            {runSpans(ln, (ch, i) => {
              const p = prog(t, at + (n + i) * sg, d, BE.out);
              if (i === Array.from(ln.replace(/\*/g, '')).length - 1) n += i + 1;
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    whiteSpace: 'pre',
                    opacity: clamp(p * 1.4),
                    transform: `translateY(${(1 - p) * 0.3}em)`,
                    filter: p < 0.98 ? `blur(${(1 - p) * 7}px)` : undefined,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
  if (mode === 'track') {
    const d = dur ?? DUR.slow;
    const p = prog(t, at, d, BE.out);
    return (
      <div
        style={{
          ...base,
          letterSpacing: `${em(tracking) + (1 - p) * 0.42}em`,
          opacity: clamp(prog(t, at, d * 0.5, BE.soft)) * (1 - outP),
          filter: p < 0.98 ? `blur(${(1 - p) * 10}px)` : undefined,
        }}
      >
        {lines.map((ln, i) => (
          <div key={i}>{runSpans(ln)}</div>
        ))}
      </div>
    );
  }
  // fade
  const d = dur ?? DUR.base;
  const sg = stagger ?? STAGGER.word;
  return (
    <div style={base}>
      {lines.map((ln, i) => {
        const p = prog(t, at + i * sg, d, BE.out);
        return (
          <div key={i} style={{opacity: clamp(p * 1.2), transform: `translateY(${(1 - p) * 16}px)`}}>
            {runSpans(ln)}
          </div>
        );
      })}
    </div>
  );
};

/** 文字出场完成的时刻（排后面的动作用） */
export const revealEnd = (p: {at: number; text: string; mode?: RevealMode; dur?: number; stagger?: number}) => {
  const lines = p.text.split('\n');
  const m = p.mode ?? 'mask';
  if (m === 'mask') return p.at + (lines.length - 1) * (p.stagger ?? STAGGER.block) + (p.dur ?? DUR.long) * 0.7;
  if (m === 'chars') return p.at + Array.from(p.text.replace(/[*\n]/g, '')).length * (p.stagger ?? STAGGER.char) + (p.dur ?? DUR.base) * 0.7;
  if (m === 'track') return p.at + (p.dur ?? DUR.slow) * 0.6;
  return p.at + (lines.length - 1) * (p.stagger ?? STAGGER.word) + (p.dur ?? DUR.base) * 0.7;
};

/** 文字音效：标题一声很轻的气流；逐字不配打字声（品牌片不要打字声） */
export const revealSfx = (p: {at: number; mode?: RevealMode; quiet?: boolean}): Ev[] =>
  p.quiet ? [] : [{at: p.at + 0.12, k: p.mode === 'track' ? 'soft' : 'air', vol: 0.12}];

/**
 * 档位化的标题：kind 选字号字重字距，其余同 Reveal。
 * <Title t={t} at={s + 0.4} kind="title" text={'Every account,\nin its place.'} color={th.ink} />
 */
export const Title: React.FC<
  Omit<React.ComponentProps<typeof Reveal>, 'size' | 'weight' | 'tracking'> & {kind?: keyof typeof TYPE}
> = ({kind = 'title', font, ...rest}) => {
  const ty = TYPE[kind];
  const zh = kind === 'zhTitle' || /[一-鿿]/.test(rest.text);
  return <Reveal {...rest} font={font ?? (zh ? BF.zh : BF.sans)} size={ty.size} weight={ty.weight} tracking={ty.tracking} />;
};
export const titleSfx = revealSfx;

/**
 * 小标签：一小段细线 + 等宽大写小字。放在标题上方当「眉题」，或角落当注释。
 * <Kicker t={t} at={s} text="ACCOUNTS · PROXIES · TIME ZONES" theme={th} />
 */
export const Kicker: React.FC<{t: number; at: number; text: string; theme: Theme; rule?: boolean; color?: string; size?: number; out?: number}> = ({
  t,
  at,
  text,
  theme,
  rule = true,
  color,
  size = TYPE.label.size,
  out,
}) => {
  const p = prog(t, at, DUR.base, BE.out);
  const q = prog(t, at + 0.2, DUR.base, BE.out);
  const o = out === undefined ? 1 : 1 - prog(t, out, DUR.short, BE.in);
  if (p <= 0) return null;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 18, opacity: o}}>
      {rule && <div style={{width: 44 * p, height: 1.5, background: theme.accentInk}} />}
      <div
        style={{
          fontFamily: BF.mono,
          fontSize: size,
          fontWeight: TYPE.label.weight,
          letterSpacing: TYPE.label.tracking,
          textTransform: 'uppercase',
          color: color ?? theme.ink3,
          opacity: q,
          transform: `translateX(${(1 - q) * -10}px)`,
          whiteSpace: 'pre',
        }}
      >
        {text}
      </div>
    </div>
  );
};
export const kickerSfx = (_p: {at: number}): Ev[] => [];
