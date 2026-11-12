import React from 'react';
import {appear, clamp, ease, lerp, prog, spring} from '../lib/anim';
import {C, F} from '../lib/theme';
import {Char} from './fac';
import {Icon, Spark} from './icons';

// 这一期的共享画面：选手、回合标题、条形图、印章、集中线、档位旋钮。
// 所有数字来自 2026-11-10 至 11 日的模型试用记录（见 script.json 的 about）。

export type Who = 'fable' | 'opus' | 'astra' | 'sol' | 'terra' | 'dfy';

export const P: Record<Who, {name: string; full: string; fam: 'claude' | 'gpt' | 'ds'; color: string; soft: string; char: string}> = {
  fable: {name: 'Fable 5.2', full: 'Claude Fable 5.2', fam: 'claude', color: '#D9603B', soft: '#FBE0D3', char: 'claude_fight'},
  opus: {name: 'Opus 5.5', full: 'Claude Opus 5.5', fam: 'claude', color: '#C98A1E', soft: '#FCEBC4', char: 'claude_read'},
  astra: {name: 'GPT-6 Astra', full: 'GPT-6 Astra', fam: 'gpt', color: '#7A55D0', soft: '#ECE4FB', char: 'gpt_slow'},
  sol: {name: 'GPT-6.1 Sol', full: 'GPT-6.1 Sol', fam: 'gpt', color: '#3366CC', soft: '#E0EAFB', char: 'gpt_dash'},
  terra: {name: 'GPT-6.1 Terra', full: 'GPT-6.1 Terra', fam: 'gpt', color: '#2C8A5A', soft: '#DDF1E4', char: 'gpt_fight'},
  dfy: {name: '大肥鱼 V4.1 Flash', full: 'DeepSeek V4.1 Flash', fam: 'ds', color: '#1C8DA6', soft: '#D8F0F4', char: 'dfy_fight'},
};

const FAM: Record<string, string> = {claude: 'Claude', gpt: 'GPT', ds: 'DeepSeek'};

/** 家族小徽标 */
export const FamDot: React.FC<{who: Who; size?: number}> = ({who, size = 30}) => {
  const p = P[who];
  return (
    <div style={{width: size, height: size, borderRadius: size * 0.32, background: p.color, border: `${Math.max(2, size * 0.09)}px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
      {p.fam === 'claude' ? <Spark size={size * 0.62} color="#fff" /> : p.fam === 'gpt' ? <Knot size={size * 0.6} /> : <Whale size={size * 0.66} />}
    </div>
  );
};

const Knot: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
    <circle cx="12" cy="12" r="3.2" />
    {[0, 60, 120, 180, 240, 300].map((a) => (
      <path key={a} d="M12 3.5 C15 3.5 17 6 16 8.6" transform={`rotate(${a} 12 12)`} />
    ))}
  </svg>
);

const Whale: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
    <path d="M3 13c0-4 3.6-6.5 8-6.5 4 0 6.6 2 7.4 4.3.6-1.3 1.8-2.4 3.1-2.6-.3 1.6-.9 2.8-1.9 3.6.9.7 1.5 1.8 1.7 3.2-1.4-.3-2.6-1-3.3-2-1 3.2-4.3 5-8 5C6.4 18 3 16.4 3 13z" />
  </svg>
);

/** 选手胸牌：徽标 + 名字 + 档位 */
export const Chip: React.FC<{who: Who; effort?: string; size?: number; vis?: number; full?: boolean; style?: React.CSSProperties; dim?: boolean}> = ({who, effort, size = 30, vis = 1, full, style, dim}) => {
  if (vis <= 0) return null;
  const p = P[who];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.35,
        background: dim ? '#EFE7DA' : '#fff',
        border: `${Math.max(2.5, size * 0.11)}px solid ${C.ink}`,
        borderRadius: size * 0.5,
        padding: `${size * 0.18}px ${size * 0.5}px ${size * 0.18}px ${size * 0.2}px`,
        fontFamily: F.ui,
        fontWeight: 800,
        fontSize: size,
        color: C.ink,
        whiteSpace: 'nowrap',
        boxShadow: `0 ${size * 0.16}px 0 rgba(35,40,66,0.16)`,
        opacity: clamp(vis * 2) * (dim ? 0.75 : 1),
        transform: `scale(${0.6 + 0.4 * clamp(vis)})`,
        ...style,
      }}
    >
      <FamDot who={who} size={size * 1.15} />
      <span style={{fontFamily: who === 'dfy' ? F.zh : F.ui}}>{full ? p.full : p.name}</span>
      {effort && (
        <span style={{fontSize: size * 0.68, fontWeight: 800, color: '#fff', background: p.color, borderRadius: size * 0.3, padding: `${size * 0.05}px ${size * 0.3}px`}}>{effort}</span>
      )}
    </div>
  );
};

/** 漫画集中线（深底上用浅线，浅底上用墨线） */
export const SpeedLines: React.FC<{t: number; vis?: number; color?: string; cx?: number; cy?: number; n?: number; inner?: number}> = ({t, vis = 1, color = C.ink, cx = 960, cy = 540, n = 72, inner = 300}) => {
  if (vis <= 0) return null;
  const k = Math.floor(t * 12) % 3;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ((i * 7 + k) % 5) * 0.004;
    const r0 = inner + ((i * 37 + k * 23) % 90);
    const w = 3 + ((i * 13) % 7);
    const x1 = cx + Math.cos(a) * r0;
    const y1 = cy + Math.sin(a) * r0;
    const x2 = cx + Math.cos(a) * 1500;
    const y2 = cy + Math.sin(a) * 1500;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    lines.push(<path key={i} d={`M${x1} ${y1} L${x2 + nx} ${y2 + ny} L${x2 - nx} ${y2 - ny} Z`} fill={color} />);
  }
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: clamp(vis)}}>
      {lines}
    </svg>
  );
};

/** 印章：盖下去的那一下有缩放和轻微旋转 */
export const Stamp: React.FC<{t: number; t0: number; text: string; color?: string; size?: number; rot?: number; style?: React.CSSProperties; t1?: number}> = ({t, t0, text, color = C.coral, size = 64, rot = -10, style, t1 = Infinity}) => {
  const vis = appear(t, t0, t1, 0.12, 0.25);
  if (vis <= 0) return null;
  const p = clamp((t - t0) / 0.18);
  const sc = lerp(2.2, 1, ease.out(p));
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: F.smiley,
        fontSize: size,
        color,
        border: `${size * 0.09}px solid ${color}`,
        borderRadius: size * 0.22,
        padding: `${size * 0.04}px ${size * 0.3}px ${size * 0.08}px`,
        background: 'rgba(255,255,255,0.88)',
        transform: `rotate(${rot}deg) scale(${sc})`,
        opacity: vis,
        whiteSpace: 'nowrap',
        lineHeight: 1.15,
        zIndex: 15,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** 回合标题：ROUND N + 题名 + 图标 */
export const RoundHead: React.FC<{t: number; t0: number; n: number; title: string; icon: string}> = ({t, t0, n, title, icon}) => {
  const sp = spring(t - t0, 190, 15);
  if (t < t0) return null;
  return (
    <div style={{position: 'absolute', left: 70, top: 46, display: 'flex', alignItems: 'center', gap: 22, transform: `translateX(${(1 - clamp(sp)) * -80}px)`, opacity: clamp(sp * 2), zIndex: 12}}>
      <div style={{background: C.ink, color: C.sun, fontFamily: F.ui, fontWeight: 900, fontSize: 30, letterSpacing: 3, borderRadius: 14, padding: '10px 18px 10px 20px', transform: 'rotate(-3deg)'}}>ROUND {n}</div>
      <div style={{width: 64, height: 64, borderRadius: 18, background: C.coral, border: `4px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 0 rgba(35,40,66,0.15)'}}>
        <Icon name={icon} size={34} color="#fff" sw={2.6} />
      </div>
      <div style={{fontFamily: F.smiley, fontSize: 68, color: C.ink, whiteSpace: 'nowrap'}}>{title}</div>
    </div>
  );
};

/** 题面卡 */
export const Task: React.FC<{t: number; t0: number; text: React.ReactNode; sub?: string; x?: number; y?: number; w?: number}> = ({t, t0, text, sub, x = 70, y = 150, w = 1780}) => {
  const vis = appear(t, t0);
  if (vis <= 0) return null;
  const sp = clamp(spring(t - t0, 200, 16));
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: vis, transform: `translateY(${(1 - sp) * 20}px)`}}>
      <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, background: '#fff', border: `4px solid ${C.ink}`, borderRadius: 20, padding: '12px 26px', fontFamily: F.zh, fontWeight: 700, fontSize: 36, color: C.ink, boxShadow: '0 6px 0 rgba(35,40,66,0.12)'}}>
        <Icon name="fileText" size={34} color={C.coral} sw={2.4} />
        {text}
        {sub && <span style={{fontSize: 26, color: C.muted, fontWeight: 600}}>{sub}</span>}
      </div>
    </div>
  );
};

export type Row = {who: Who; effort?: string; v: number; label: string; time?: string; at: number; note?: string; bad?: boolean};

/** 横向条形图：每行在 at 秒弹出、条从 0 长到 v；max 是满格；hi 是高亮的那一行（赢家） */
export const Bars: React.FC<{
  t: number;
  rows: Row[];
  max: number;
  x?: number;
  y?: number;
  w?: number;
  rowH?: number;
  hi?: {i: number; at: number}[];
  unit?: string;
  title?: string;
  titleAt?: number;
  invert?: boolean;
  dimAt?: number;
  ticks?: boolean;
}> = ({t, rows, max, x = 110, y = 300, w = 1700, rowH = 104, hi = [], title, titleAt = 0, invert, dimAt, ticks = true}) => {
  const labW = 420;
  const barW = w - labW - 330;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w}}>
      {title && (
        <div style={{fontFamily: F.zh, fontWeight: 800, fontSize: 30, color: C.ink2, marginBottom: 14, opacity: appear(t, titleAt), display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{width: 10, height: 30, borderRadius: 5, background: C.coral}} />
          {title}
        </div>
      )}
      {rows.map((r, i) => {
        const vis = appear(t, r.at, Infinity, 0.3);
        if (vis <= 0) return <div key={i} style={{height: rowH}} />;
        const p = prog(t, r.at + 0.1, 0.7, ease.outQuint);
        const isHi = hi.some((h) => h.i === i && t >= h.at);
        const hiP = hi.filter((h) => h.i === i).reduce((m, h) => Math.max(m, clamp((t - h.at) / 0.25)), 0);
        const dim = dimAt !== undefined && t >= dimAt && !isHi ? 0.45 : 1;
        const col = r.bad ? '#C2413A' : P[r.who].color;
        const frac = clamp(r.v / max);
        return (
          <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', opacity: vis * dim, transform: `translateX(${(1 - vis) * -30}px)`}}>
            <div style={{width: labW, display: 'flex', justifyContent: 'flex-end', paddingRight: 24}}>
              <Chip who={r.who} effort={r.effort} size={32} />
            </div>
            <div style={{position: 'relative', width: barW, height: rowH * 0.56, background: 'rgba(35,40,66,0.07)', borderRadius: 14, border: `3px solid ${isHi ? C.ink : 'rgba(35,40,66,0.18)'}`}}>
              <div
                style={{
                  position: 'absolute',
                  left: invert ? undefined : 0,
                  right: invert ? 0 : undefined,
                  top: 0,
                  bottom: 0,
                  width: `${Math.max(frac > 0 ? 3 : 0, frac * 100 * p)}%`,
                  background: col,
                  borderRadius: 11,
                  boxShadow: isHi ? `0 0 0 ${4 * hiP}px ${C.sun}` : undefined,
                }}
              />
              {r.note && (
                <div style={{position: 'absolute', left: 8, top: '100%', marginTop: 6, fontFamily: F.zh, fontWeight: 700, fontSize: 22, color: C.ink2, whiteSpace: 'nowrap', opacity: clamp((p - 0.5) * 2)}}>{r.note}</div>
              )}
              {Array.from({length: ticks ? max - 1 : 0}, (_, k) => (
                <div key={k} style={{position: 'absolute', top: 6, bottom: 6, left: `${((k + 1) / max) * 100}%`, width: 2, background: 'rgba(255,255,255,0.55)'}} />
              ))}
            </div>
            <div style={{width: 330, paddingLeft: 24, display: 'flex', alignItems: 'baseline', gap: 16}}>
              <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: 50, color: r.bad ? '#C2413A' : C.ink, opacity: clamp((p - 0.3) * 2)}}>{r.label}</div>
              {r.time && (
                <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 26, color: C.ink2, display: 'flex', alignItems: 'center', gap: 6, opacity: clamp((p - 0.5) * 2)}}>
                  <Icon name="clock" size={24} color={C.ink2} sw={2.4} />
                  {r.time}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 角落里的小字说明 */
export const FootNote: React.FC<{t: number; t0: number; text: string; t1?: number}> = ({t, t0, text, t1 = Infinity}) => {
  const vis = appear(t, t0, t1);
  if (vis <= 0) return null;
  return (
    <div style={{position: 'absolute', right: 60, top: 60, fontFamily: F.zh, fontSize: 24, fontWeight: 600, color: C.ink2, background: 'rgba(255,255,255,0.75)', border: `2px solid ${C.line}`, borderRadius: 12, padding: '6px 14px', opacity: vis}}>
      {text}
    </div>
  );
};

/** 角色贴纸从屏幕边弹进来 */
export const Enter: React.FC<{t: number; t0: number; t1?: number; name: string; h: number; x: number; y: number; from?: 'right' | 'left' | 'bottom'; flipX?: boolean; rot?: number}> = ({t, t0, t1 = Infinity, name, h, x, y, from = 'right', flipX, rot = 0}) => {
  if (t < t0 || t > t1 + 0.4) return null;
  const sp = spring(t - t0, 170, 15);
  const out = prog(t, t1, 0.35, ease.in);
  const d = (1 - clamp(sp)) + out;
  const dx = from === 'right' ? d * 700 : from === 'left' ? -d * 700 : 0;
  const dy = from === 'bottom' ? d * 700 : 0;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${dx}px, ${dy}px) rotate(${rot + (1 - clamp(sp)) * 6}deg)`, zIndex: 8}}>
      <Char name={name} t={t} h={h} flipX={flipX} />
    </div>
  );
};

export {FAM};
