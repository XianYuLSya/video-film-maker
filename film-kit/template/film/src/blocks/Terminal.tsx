import React from 'react';
import {blink, clamp, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {C, F, FitText, Out, Slot, fit, glyphCount, innerW, pop, revealedLines, slotBox, stageOf} from './core';

// ═════════ 终端窗 ═════════

export type TermLine =
  /** 一条命令：at 起逐字敲出（cps 每秒字数，缺省 22） */
  | {at: number; cmd: string; cps?: number}
  /** 一行输出：at 时出现。tone：ok 绿、warn 黄、err 红、mute 灰 */
  | {at: number; out: string; tone?: 'ok' | 'warn' | 'err' | 'mute' | 'plain'};

export type TerminalProps = {
  t0: number;
  t1?: number;
  /** 外观：powershell（蓝黑）/ bash（深灰） / cmd */
  shell?: 'powershell' | 'bash' | 'cmd';
  /** 提示符里的路径，如 'D:\\work' 或 '~/project' */
  cwd?: string;
  /** 标签页标题，缺省按 shell */
  title?: string;
  lines: TermLine[];
  slot?: Slot;
  /** 窗口高度（px），缺省占满安全区；输出行少时给小一点，画面不空 */
  h?: number;
  vertical?: boolean;
};

const SIZE = 28;
const LH = 1.5;
const COL = {ok: '#6CD38B', warn: '#F2C14E', err: '#FF6B6B', mute: '#8A8A8A', plain: '#D4D4D4'};

const promptOf = (shell: TerminalProps['shell'], cwd: string) => (shell === 'bash' ? `${cwd}$ ` : shell === 'cmd' ? `${cwd}>` : `PS ${cwd}> `);

/** 终端窗：命令逐字敲出、输出逐行出来，长行自动折行 */
export const Terminal: React.FC<TerminalProps & {t: number}> = ({t, t0, t1, shell = 'powershell', cwd, title, lines, slot = 'center', h: hProp, vertical}) => {
  const st = stageOf(vertical);
  const box = slotBox(slot, st, vertical ? innerW(st) : 1400);
  const w = box.w;
  const h = Math.min(hProp ?? (vertical ? 1000 : st.bottom - st.top), st.bottom - st.top);
  const x = box.x;
  const y = st.top + (st.bottom - st.top - h) / 2;
  const dir = cwd ?? (shell === 'bash' ? '~' : 'C:\\Users\\you');
  const prompt = promptOf(shell, dir);
  const padX = 30;
  const colW = w - padX * 2;
  const tabH = 56;
  const viewH = h - tabH - 36;
  const bg = shell === 'powershell' ? '#0C1A33' : shell === 'cmd' ? '#0C0C0C' : '#1E1E1E';
  // 排版：命令行 = 提示符 + 命令，按等宽估算折行
  let yy = 0;
  const shownLines = lines.filter((l) => t >= l.at);
  const placed = shownLines.map((l) => {
    const full = 'cmd' in l ? prompt + l.cmd : l.out;
    const f = fit({text: full || ' ', maxW: colW, size: SIZE, min: 24, maxLines: 6, font: 'mono', markup: false, balance: false, keepSize: true, who: '终端'}, LH);
    let n: number | undefined;
    if ('cmd' in l) n = Array.from(prompt).length + Math.floor((t - l.at) * (l.cps ?? 22));
    const hh = revealedLines(f, n) * f.size * LH;
    const top = yy;
    yy += hh;
    return {l, f, top, n};
  });
  const scroll = Math.max(0, yy - viewH + 10);
  const p = pop(t, t0, 190, 16);
  const last = placed[placed.length - 1];
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div data-probe="skip" style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `translateY(${(1 - clamp(p)) * 60}px) scale(${lerp(0.94, 1, clamp(p))})`, opacity: clamp(p * 2)}}>
        <div style={{position: 'absolute', inset: 0, background: bg, borderRadius: 22, overflow: 'hidden', border: `4px solid ${C.ink}`, boxShadow: '0 12px 0 rgba(35,40,66,0.14), 0 30px 60px rgba(35,40,66,0.22)'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: tabH, background: '#202020', display: 'flex', alignItems: 'flex-end', padding: '0 16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, background: bg, height: 44, borderRadius: '10px 10px 0 0', padding: '0 22px', fontFamily: F.ui, fontSize: 22, color: '#E6E6E6'}}>
              <div style={{width: 24, height: 24, borderRadius: 5, background: shell === 'powershell' ? '#2A5BD7' : '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 15, fontWeight: 800, color: '#fff'}}>&gt;_</div>
              {title ?? (shell === 'powershell' ? 'Windows PowerShell' : shell === 'cmd' ? '命令提示符' : 'bash')}
            </div>
            <div style={{flex: 1}} />
            <div style={{display: 'flex', gap: 30, paddingBottom: 14, color: '#9A9A9A', fontFamily: F.ui, fontSize: 22}}>
              <span>—</span>
              <span>☐</span>
              <span>✕</span>
            </div>
          </div>
          <div style={{position: 'absolute', left: padX, top: tabH + 18, width: colW, height: viewH, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: 0, top: -scroll, width: colW}}>
              {placed.map(({l, f, top, n}, k) => {
                const isCmd = 'cmd' in l;
                const col = isCmd ? '#F2F2F2' : COL[l.tone ?? 'plain'];
                const done = n === undefined || n >= glyphCount(f);
                return (
                  <div key={k} style={{position: 'absolute', left: 0, top, width: colW, opacity: isCmd ? 1 : prog(t, l.at, 0.12)}}>
                    <FitText text={'cmd' in l ? prompt + l.cmd : l.out || ' '} maxW={colW} size={SIZE} min={24} maxLines={6} font="mono" weight={500} color={col} lh={LH} reveal={n} markup={false} balance={false} keepSize lead={isCmd ? Array.from(prompt).length : undefined} em={shell === 'powershell' ? '#9CDCFE' : '#6CD38B'} />
                    {last && last.l === l && isCmd && <Caret f={f} n={n} t={t} done={done} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Out>
  );
};

/** 命令末尾的方块光标 */
const Caret: React.FC<{f: ReturnType<typeof fit>; n?: number; t: number; done: boolean}> = ({f, n, t, done}) => {
  const total = f.lines.reduce((a, l) => a + l.length, 0);
  let left = Math.min(n ?? 0, total);
  let row = 0;
  for (let i = 0; i < f.lines.length; i++) {
    if (left <= f.lines[i].length || i === f.lines.length - 1) {
      row = i;
      break;
    }
    left -= f.lines[i].length;
    row = i + 1;
  }
  const lineChars = f.lines[Math.min(row, f.lines.length - 1)]?.slice(0, left) ?? [];
  const x = lineChars.reduce((a, g) => a + (g.ch.codePointAt(0)! >= 0x2e80 ? 1 : 0.6) * f.size, 0);
  return <div style={{position: 'absolute', left: x + 2, top: row * f.size * LH + f.size * 0.2, width: f.size * 0.55, height: f.size * 1.1, background: '#D4D4D4', opacity: done ? blink(t) : 1}} />;
};

export const terminalSfx = (p: TerminalProps): Ev[] => {
  const ev: Ev[] = [{at: p.t0 + 0.03, k: 'popup', vol: 0.28}];
  for (const l of p.lines) {
    if ('cmd' in l) ev.push({at: l.at, typing: Array.from(l.cmd).length / (l.cps ?? 22), vol: 0.2});
    else if (l.tone === 'ok') ev.push({at: l.at, k: 'ok', vol: 0.22});
  }
  return ev;
};
