import React from 'react';
import {clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Icon, Title} from './atoms';
import {C, FitText, HARD, Out, fit, innerW, pop, stageOf} from './core';

// ═════════ 表格 ═════════

export type TableCol = {
  /** 表头文字 */
  title: string;
  /** 列宽权重，缺省第一列 1.2、其余 1 */
  w?: number;
  align?: 'left' | 'center';
};
export type TableRow = {
  /** 这一行出现的时刻 */
  at: number;
  /** 每格文字；写「✓」「✗」会画成对勾 / 叉图标，「—」表示没有 */
  cells: string[];
};
export type TableProps = {
  t0: number;
  t1?: number;
  title?: string;
  /** 2–5 列（竖屏建议不超过 3 列） */
  cols: TableCol[];
  /** 最多 6 行 */
  rows: TableRow[];
  /** 高亮：{at, r: 行号, c: 列号}；c 不给就整行高亮 */
  hi?: {at: number; r: number; c?: number}[];
  vertical?: boolean;
};

/** 表格：两到五列，行逐条出现，可高亮单元格或整行 */
export const Table: React.FC<TableProps & {t: number}> = ({t, t0, t1, title, cols, rows, hi = [], vertical}) => {
  const st = stageOf(vertical);
  const cl = cols.slice(0, 5);
  const rl = rows.slice(0, 6);
  const W0 = Math.min(vertical ? innerW(st) : 1640, innerW(st));
  const ws = cl.map((c, i) => c.w ?? (i === 0 ? 1.2 : 1));
  const sum = ws.reduce((a, b) => a + b, 0);
  const cw = ws.map((x) => (x / sum) * (W0 - 10));
  const padX = cl.length >= 5 ? 18 : 26;
  const size = vertical ? (cl.length <= 3 ? 36 : 30) : cl.length >= 5 ? 30 : 34;
  const headSize = vertical ? (cl.length <= 3 ? 34 : 28) : cl.length >= 5 ? 30 : 32;
  const headF = cl.map((c, i) => fit({text: c.title, maxW: cw[i] - padX * 2, size: headSize, min: 24, maxLines: 2, who: '表头'}));
  const headH = Math.max(...headF.map((f) => f.h)) + 36;
  const cellF = rl.map((r) => cl.map((_, i) => fit({text: r.cells[i] ?? '', maxW: cw[i] - padX * 2, size, min: 28, maxLines: 2, who: '表格单元格'})));
  const rowH = cellF.map((fs) => Math.max(...fs.map((f) => f.h)) + 34);
  const titleH = title ? 130 : 0;
  const total = headH + rowH.reduce((a, b) => a + b, 0) + 10;
  const avail = st.bottom - st.top - titleH;
  const sc = Math.min(1, avail / total);
  const x0 = st.cx - W0 / 2;
  const y0 = st.top + titleH + Math.max(0, (avail - total * sc) / 2);
  const p = pop(t, t0, 200, 16);
  const hiNow = hi.filter((h) => t >= h.at);
  const cellHi = (r: number, c: number) => {
    let best = -1;
    for (const h of hiNow) if (h.r === r && h.c === c) best = Math.max(best, h.at);
    return best;
  };
  let y = headH;
  return (
    <Out t={t} t0={t0} t1={t1}>
      {title && (
        <div style={{position: 'absolute', left: x0, top: st.top}}>
          <Title text={title} maxW={W0} size={68} vis={pop(t, t0)} />
        </div>
      )}
      <div style={{position: 'absolute', left: x0, top: y0, width: W0, transform: `scale(${sc * lerp(0.92, 1, clamp(p))})`, transformOrigin: '50% 0%', opacity: clamp(p * 2)}}>
        <div style={{position: 'relative', width: W0, height: total, boxSizing: 'border-box', background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 28, boxShadow: HARD, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: W0, height: headH, background: C.ink, display: 'flex'}}>
            {cl.map((c, i) => (
              <div key={i} style={{width: cw[i], height: headH, boxSizing: 'border-box', padding: `0 ${padX}px`, display: 'flex', alignItems: 'center', justifyContent: c.align === 'left' || (c.align === undefined && i === 0) ? 'flex-start' : 'center'}}>
                <FitText text={c.title} maxW={cw[i] - padX * 2} size={headSize} min={24} maxLines={2} weight={900} color="#fff" em={C.sun} align={c.align === 'left' || (c.align === undefined && i === 0) ? 'left' : 'center'} who="表头" />
              </div>
            ))}
          </div>
          {rl.map((r, ri) => {
            const top = y;
            y += rowH[ri];
            if (t < r.at - 0.02) return null;
            const rp = prog(t, r.at - 0.02, 0.3, ease.out);
            const rowHi = hiNow.filter((h) => h.r === ri && h.c === undefined).reduce((m, h) => Math.max(m, h.at), -1);
            const rh = rowHi >= 0 ? clamp((t - rowHi) / 0.25) : 0;
            return (
              <div key={ri} style={{position: 'absolute', left: 0, top, width: W0, height: rowH[ri], display: 'flex', background: rh > 0 ? `rgba(252,235,182,${rh})` : ri % 2 ? 'rgba(240,229,210,0.35)' : '#fff', borderTop: `3px solid ${C.line}`, opacity: rp, transform: `translateY(${(1 - rp) * 16}px)`}}>
                {rh > 0 && <div style={{position: 'absolute', inset: 4, borderRadius: 16, border: `5px solid ${C.coral}`, opacity: rh, zIndex: 2, pointerEvents: 'none'}} />}
                {cl.map((c, ci) => {
                  const txt = r.cells[ci] ?? '';
                  const ha = cellHi(ri, ci);
                  const hp = ha >= 0 ? clamp((t - ha) / 0.25) : 0;
                  const left = c.align === 'left' || (c.align === undefined && ci === 0);
                  const isMark = txt === '✓' || txt === '✗';
                  return (
                    <div key={ci} style={{position: 'relative', width: cw[ci], height: rowH[ri], boxSizing: 'border-box', padding: `0 ${padX}px`, display: 'flex', alignItems: 'center', justifyContent: left ? 'flex-start' : 'center', background: hp > 0 ? `rgba(252,235,182,${hp})` : undefined}}>
                      {hp > 0 && <div style={{position: 'absolute', inset: 5, borderRadius: 14, border: `5px solid ${C.coral}`, opacity: hp, transform: `scale(${lerp(1.15, 1, hp)})`}} />}
                      {isMark ? (
                        <div style={{width: 50, height: 50, borderRadius: 50, background: txt === '✓' ? C.mintDeep : C.coral, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <Icon name={txt === '✓' ? 'check' : 'x'} size={32} color="#fff" sw={3.6} />
                        </div>
                      ) : (
                        <FitText text={txt} maxW={cw[ci] - padX * 2} size={size} min={28} maxLines={2} weight={ci === 0 ? 900 : 700} color={txt === '—' ? C.muted : C.ink} align={left ? 'left' : 'center'} who="表格单元格" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Out>
  );
};

export const tableSfx = (p: TableProps): Ev[] => [
  {at: p.t0 + 0.02, k: 'slide', vol: 0.25},
  ...p.rows.slice(0, 6).map((r): Ev => ({at: r.at, k: 'tap', vol: 0.28})),
  ...(p.hi ?? []).map((h): Ev => ({at: h.at + 0.03, k: 'marker', vol: 0.3})),
];
