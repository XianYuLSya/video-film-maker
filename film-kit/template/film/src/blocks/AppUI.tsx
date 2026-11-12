import React from 'react';
import {appear, blink, clamp, ease, lerp, prog} from '../lib/anim';
import {Cursor, Way, cursorSfx} from '../kit/cursor';
import type {Ev} from '../kit/sfx';
import {Icon, IconName} from './atoms';
import {C, F, FitText, Out, Slot, Tone, TONE, fit, innerW, pop, slotBox, stageOf, textW, warnOnce} from './core';

// ═════════ 通用软件窗口 · 手机框 · 里面的控件 ═════════
// 控件按顺序从上往下自动排版；给控件一个 id，就能用 appLayout / phoneLayout 拿到它在舞台上的位置，
// 再用 aim(布局, 'id', 时刻) 生成光标落点，演示「点这里、填这个、点确定」。

export type Widget =
  /** 页面标题 */
  | {kind: 'title'; id?: string; text: string}
  /** 一段说明文字 */
  | {kind: 'text'; id?: string; text: string}
  /** 输入框：typeFrom 起逐字打出 value，typeTo 打完（缺省每秒 12 字） */
  | {kind: 'input'; id?: string; label?: string; placeholder?: string; value?: string; typeFrom?: number; typeTo?: number; secret?: boolean}
  /** 按钮：pressAt 时按下 */
  | {kind: 'button'; id?: string; text: string; tone?: 'primary' | 'plain' | 'danger'; pressAt?: number; icon?: IconName}
  /** 开关：flipAt 时拨动 */
  | {kind: 'toggle'; id?: string; label: string; sub?: string; on?: boolean; flipAt?: number}
  /** 下拉框：openAt 展开，pickAt 选中第 pick 项（从 0 数） */
  | {kind: 'select'; id?: string; label?: string; value: string; options?: string[]; openAt?: number; pickAt?: number; pick?: number}
  /** 提示条 */
  | {kind: 'notice'; id?: string; text: string; tone?: 'info' | 'ok' | 'warn' | 'err'}
  /** 菜单 / 设置项列表：hiAt 时高亮第 i 行 */
  | {kind: 'list'; id?: string; items: {text: string; sub?: string; icon?: IconName}[]; hiAt?: {at: number; i: number}[]}
  /** 一行并排放几个控件（通常是按钮） */
  | {kind: 'row'; id?: string; children: Widget[]}
  /** 空白 */
  | {kind: 'space'; h: number};

export type Dialog = {at: number; t1?: number; title: string; text?: string; /** 按钮文字，最后一个是主按钮 */ buttons: string[]; /** 被按下的按钮序号和时刻 */ pressAt?: number; press?: number; danger?: boolean};
export type Toast = {at: number; t1?: number; text: string; tone?: 'ok' | 'info' | 'err'};

export type Box = {x: number; y: number; w: number; h: number; cx: number; cy: number};

type M = {gap: number; body: number; title: number; ctl: number; pad: number};
const DESK: M = {gap: 26, body: 30, title: 44, ctl: 78, pad: 44};
const MOB: M = {gap: 22, body: 28, title: 40, ctl: 76, pad: 26};

const LIST_H = 88;

const widgetH = (wd: Widget, w: number, m: M): number => {
  switch (wd.kind) {
    case 'title':
      return fit({text: wd.text, maxW: w, size: m.title, min: 32, maxLines: 2, who: '窗口标题'}).h + 4;
    case 'text':
      return fit({text: wd.text, maxW: w, size: m.body, min: 28, maxLines: 3, who: '窗口说明'}, 1.4).h;
    case 'input':
    case 'select':
      return (wd.label ? 40 : 0) + m.ctl;
    case 'button':
      return m.ctl;
    case 'toggle':
      return wd.sub ? 96 : 76;
    case 'notice':
      return fit({text: wd.text, maxW: w - 90, size: m.body - 2, min: 26, maxLines: 3, who: '提示条'}, 1.35).h + 36;
    case 'list':
      return wd.items.length * LIST_H;
    case 'row':
      return Math.max(...wd.children.map((c) => widgetH(c, (w - 20 * (wd.children.length - 1)) / wd.children.length, m)));
    case 'space':
      return wd.h;
  }
};

/** 排版：返回每个控件的框（舞台坐标） */
const layoutBody = (body: Widget[], x: number, y: number, w: number, m: M, maxH: number) => {
  const out: {wd: Widget; b: Box}[] = [];
  let yy = y;
  const put = (wd: Widget, bx: number, by: number, bw: number) => {
    const h = widgetH(wd, bw, m);
    out.push({wd, b: {x: bx, y: by, w: bw, h, cx: bx + bw / 2, cy: by + h / 2}});
    return h;
  };
  for (const wd of body) {
    if (wd.kind === 'row') {
      const n = wd.children.length;
      const cw = (w - 20 * (n - 1)) / n;
      let rh = 0;
      wd.children.forEach((c, i) => {
        rh = Math.max(rh, put(c, x + i * (cw + 20), yy, cw));
      });
      yy += rh + m.gap;
    } else {
      yy += put(wd, x, yy, w) + m.gap;
    }
  }
  if (yy - y - m.gap > maxH + 1) warnOnce(`窗口里的控件太多，超出 ${Math.round(yy - y - m.gap - maxH)}px，下面的会被裁掉`);
  return out;
};

const idMap = (placed: {wd: Widget; b: Box}[], extra: Record<string, Box> = {}) => {
  const r: Record<string, Box> = {...extra};
  for (const p of placed) if ('id' in p.wd && p.wd.id) r[p.wd.id] = p.b;
  return r;
};

/**
 * 光标落点：点到某个控件上。click 缺省 true。
 * 缺省不点正中心，而是点在控件右侧约 1/3 处、略偏下：光标图标是从落点往右下画的，
 * 点正中心会把按钮上的字盖住；偏到右下，字留在光标左上方看得清。要点别处就自己给 dx / dy（相对中心）。
 */
export const aim = (layout: Record<string, Box>, id: string, at: number, opt: {click?: boolean; dx?: number; dy?: number; hand?: boolean} = {}): Way => {
  const b = layout[id];
  if (!b) {
    warnOnce(`aim 找不到控件 id「${id}」`);
    return {at, x: 960, y: 540};
  }
  return {at, x: b.cx + (opt.dx ?? Math.min(b.w * 0.32, 160)), y: b.cy + (opt.dy ?? Math.min(b.h * 0.15, 12)), click: opt.click ?? true, hand: opt.hand ?? true};
};

// ───────── 控件绘制 ─────────
const Wd: React.FC<{t: number; wd: Widget; b: Box; m: M; mobile?: boolean}> = ({t, wd, b, m, mobile}) => {
  const st: React.CSSProperties = {position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h};
  switch (wd.kind) {
    case 'title':
      return (
        <div style={st}>
          <FitText text={wd.text} maxW={b.w} size={m.title} min={32} maxLines={2} weight={900} />
        </div>
      );
    case 'text':
      return (
        <div style={st}>
          <FitText text={wd.text} maxW={b.w} size={m.body} min={28} maxLines={3} weight={500} color={C.ink2} lh={1.4} />
        </div>
      );
    case 'input': {
      const v = wd.value ?? '';
      const n = Array.from(v).length;
      let shown = v;
      let focus = false;
      if (wd.typeFrom !== undefined) {
        const to = wd.typeTo ?? wd.typeFrom + n / 12;
        const k = t < wd.typeFrom ? 0 : Math.min(n, Math.floor(((t - wd.typeFrom) / Math.max(0.1, to - wd.typeFrom)) * n + 0.001));
        shown = Array.from(v).slice(0, k).join('');
        focus = t >= wd.typeFrom - 0.3 && t < to + 0.8;
      }
      const disp = wd.secret ? '•'.repeat(Array.from(shown).length) : shown;
      return (
        <div style={st}>
          {wd.label && <div style={{height: 40, fontFamily: F.zh, fontWeight: 700, fontSize: 26, color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden'}}>{wd.label}</div>}
          <div style={{height: m.ctl, boxSizing: 'border-box', border: `3px solid ${focus ? C.sky : 'rgba(35,40,66,0.22)'}`, boxShadow: focus ? '0 0 0 5px rgba(63,111,214,0.18)' : undefined, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', overflow: 'hidden', whiteSpace: 'nowrap'}}>
            {/* 靠左显示；打的字比框长时整体左移，让最新打出的字留在框里（按估宽算，不量 DOM） */}
            <span style={{flexShrink: 0, marginLeft: Math.min(0, b.w - 46 - textW(disp || wd.placeholder || '', m.body, 'zh') - 6), fontFamily: F.zh, fontSize: m.body, color: disp ? C.ink : '#A8A9B4', fontWeight: 500}}>
              {disp || wd.placeholder || ''}
              {focus && <span style={{display: 'inline-block', width: 3, height: m.body * 1.05, background: C.ink, marginLeft: 2, verticalAlign: 'middle', opacity: blink(t)}} />}
            </span>
          </div>
        </div>
      );
    }
    case 'button': {
      const d = wd.pressAt !== undefined ? t - wd.pressAt : -1;
      const press = d > -0.06 && d < 0.18 ? (d < 0 ? (d + 0.06) / 0.06 : 1 - d / 0.18) : 0;
      const tone = wd.tone ?? 'primary';
      const bg = tone === 'primary' ? C.sky : tone === 'danger' ? '#D9483B' : '#fff';
      const fg = tone === 'plain' ? C.ink : '#fff';
      return (
        <div style={{...st, boxSizing: 'border-box', background: bg, border: tone === 'plain' ? '3px solid rgba(35,40,66,0.25)' : 'none', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transform: `scale(${1 - 0.05 * press})`, filter: press > 0 ? `brightness(${1 - 0.15 * press})` : undefined, boxShadow: tone === 'plain' ? undefined : '0 4px 0 rgba(35,40,66,0.15)'}}>
          {wd.icon && <Icon name={wd.icon} size={m.body} color={fg} sw={2.6} />}
          <FitText text={wd.text} maxW={b.w - 40 - (wd.icon ? m.body + 12 : 0)} size={m.body} min={24} weight={800} color={fg} style={{width: 'auto'}} lh={1.2} markup={false} />
        </div>
      );
    }
    case 'toggle': {
      const on0 = !!wd.on;
      const fp = wd.flipAt !== undefined ? prog(t, wd.flipAt, 0.22, ease.inOut) : 0;
      const k = on0 ? 1 - fp : fp;
      const tw = 84;
      return (
        <div style={{...st, display: 'flex', alignItems: 'center', gap: 20}}>
          <div style={{flex: 1, minWidth: 0}}>
            <FitText text={wd.label} maxW={b.w - tw - 20} size={m.body} min={26} weight={700} lh={1.25} />
            {wd.sub && <FitText text={wd.sub} maxW={b.w - tw - 20} size={24} min={24} weight={500} color={C.muted} lh={1.25} />}
          </div>
          <div style={{width: tw, height: 48, borderRadius: 48, background: `rgb(${lerp(205, 44, k)},${lerp(208, 138, k)},${lerp(214, 90, k)})`, position: 'relative', flexShrink: 0}}>
            <div style={{position: 'absolute', top: 5, left: lerp(5, tw - 43, k), width: 38, height: 38, borderRadius: 38, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'}} />
          </div>
        </div>
      );
    }
    case 'select': {
      const picked = wd.pickAt !== undefined && t >= wd.pickAt && wd.options && wd.pick !== undefined ? wd.options[wd.pick] : wd.value;
      const open = wd.openAt !== undefined && t >= wd.openAt && (wd.pickAt === undefined || t < wd.pickAt + 0.35);
      return (
        <div style={st}>
          {wd.label && <div style={{height: 40, fontFamily: F.zh, fontWeight: 700, fontSize: 26, color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden'}}>{wd.label}</div>}
          <div style={{height: m.ctl, boxSizing: 'border-box', border: `3px solid ${open ? C.sky : 'rgba(35,40,66,0.22)'}`, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12}}>
            <FitText text={picked} maxW={b.w - 100} size={m.body} min={24} weight={600} style={{width: 'auto', flex: 1}} lh={1.2} markup={false} />
            <div style={{flex: 1}} />
            <Icon name="chevDown" size={30} color={C.ink2} sw={2.6} style={{transform: open ? 'rotate(180deg)' : undefined}} />
          </div>
        </div>
      );
    }
    case 'notice': {
      const tn = wd.tone ?? 'info';
      const T = TONE[tn === 'ok' ? 'mint' : tn === 'warn' ? 'sun' : tn === 'err' ? 'coral' : 'sky'];
      return (
        <div style={{...st, boxSizing: 'border-box', background: T.pale, border: `3px solid ${T.main}`, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px'}}>
          <Icon name={tn === 'ok' ? 'check' : tn === 'info' ? 'info' : 'alert'} size={36} color={tn === 'warn' ? '#B07A00' : T.main} sw={2.6} />
          <FitText text={wd.text} maxW={b.w - 90} size={m.body - 2} min={26} maxLines={3} weight={700} lh={1.35} />
        </div>
      );
    }
    case 'list': {
      let hi = -1;
      for (const h of wd.hiAt ?? []) if (t >= h.at) hi = h.i;
      return (
        <div style={{...st, boxSizing: 'border-box', border: '3px solid rgba(35,40,66,0.14)', borderRadius: 18, overflow: 'hidden', background: '#fff'}}>
          {wd.items.map((it, i) => (
            <div key={i} style={{height: LIST_H, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', background: i === hi ? C.sunPale : undefined, borderTop: i ? '2px solid rgba(35,40,66,0.08)' : undefined}}>
              {it.icon && <Icon name={it.icon} size={34} color={i === hi ? C.coral : C.ink2} sw={2.4} />}
              <div style={{flex: 1, minWidth: 0}}>
                <FitText text={it.text} maxW={b.w - 130 - (it.icon ? 52 : 0)} size={m.body - 2} min={26} weight={700} lh={1.2} />
                {it.sub && <FitText text={it.sub} maxW={b.w - 130 - (it.icon ? 52 : 0)} size={24} min={24} weight={500} color={C.muted} lh={1.2} />}
              </div>
              <Icon name="chevRight" size={30} color={C.muted} sw={2.4} />
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
};

/** 下拉框展开的选项层（画在最上层） */
const Dropdowns: React.FC<{t: number; placed: {wd: Widget; b: Box}[]; m: M}> = ({t, placed, m}) => (
  <>
    {placed.map(({wd, b}, k) => {
      if (wd.kind !== 'select' || wd.openAt === undefined || !wd.options) return null;
      const v = appear(t, wd.openAt, wd.pickAt !== undefined ? wd.pickAt + 0.3 : Infinity, 0.15, 0.15);
      if (v <= 0) return null;
      const hiI = wd.pickAt !== undefined && t >= wd.pickAt - 0.35 ? wd.pick ?? -1 : -1;
      const rowH = 68;
      return (
        <div key={k} style={{position: 'absolute', left: b.x, top: b.y + b.h + 6, width: b.w, background: '#fff', border: `3px solid ${C.ink}`, borderRadius: 16, boxShadow: '0 16px 40px rgba(35,40,66,0.25)', overflow: 'hidden', opacity: v, transform: `translateY(${(1 - v) * -10}px)`, zIndex: 20}}>
          {wd.options.map((o, i) => (
            <div key={i} style={{height: rowH, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', background: i === hiI ? '#E4ECFB' : undefined}}>
              <FitText text={o} maxW={b.w - 90} size={m.body - 2} min={24} weight={600} style={{width: 'auto', flex: 1}} lh={1.2} markup={false} />
              <div style={{flex: 1}} />
              {i === hiI && <Icon name="check" size={28} color={C.sky} sw={3} />}
            </div>
          ))}
        </div>
      );
    })}
  </>
);

const DialogLayer: React.FC<{t: number; d: Dialog; x: number; y: number; w: number; h: number; m: M; mobile?: boolean}> = ({t, d, x, y, w, h, m, mobile}) => {
  const v = appear(t, d.at, d.t1 ?? Infinity, 0.2, 0.2);
  if (v <= 0) return null;
  const dw = Math.min(mobile ? w - 40 : 700, w - 60);
  const sp = pop(t, d.at, 260, 16);
  const tf = fit({text: d.title, maxW: dw - 70, size: m.title - 6, min: 30, maxLines: 2, who: '对话框标题'});
  const bf = d.text ? fit({text: d.text, maxW: dw - 70, size: m.body - 2, min: 26, maxLines: 4, who: '对话框正文'}, 1.4) : null;
  const dh = 40 + tf.h + (bf ? bf.h + 16 : 0) + 40 + m.ctl + 32;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, zIndex: 30}}>
      <div style={{position: 'absolute', inset: 0, background: `rgba(20,24,40,${0.35 * v})`}} />
      <div style={{position: 'absolute', left: (w - dw) / 2, top: (h - dh) / 2, width: dw, height: dh, boxSizing: 'border-box', background: '#fff', borderRadius: 24, border: `4px solid ${C.ink}`, padding: '36px 34px 32px', boxShadow: '0 20px 60px rgba(20,24,40,0.35)', transform: `scale(${lerp(0.85, 1, clamp(sp))})`, opacity: v}}>
        <FitText text={d.title} maxW={dw - 70} size={m.title - 6} min={30} maxLines={2} weight={900} />
        {d.text && <FitText text={d.text} maxW={dw - 70} size={m.body - 2} min={26} maxLines={4} weight={500} color={C.ink2} lh={1.4} style={{marginTop: 16}} />}
        <div style={{position: 'absolute', left: 34, right: 34, bottom: 32, display: 'flex', gap: 16, justifyContent: 'flex-end'}}>
          {d.buttons.map((bt, i) => {
            const main = i === d.buttons.length - 1;
            const pressed = d.press === i && d.pressAt !== undefined ? t - d.pressAt : -1;
            const pr = pressed > -0.06 && pressed < 0.18 ? 1 - Math.abs(pressed) / 0.18 : 0;
            const bw = (dw - 68 - 16 * (d.buttons.length - 1)) / d.buttons.length;
            return (
              <div key={i} style={{width: bw, height: m.ctl, borderRadius: 16, boxSizing: 'border-box', background: main ? (d.danger ? '#D9483B' : C.sky) : '#fff', border: main ? 'none' : '3px solid rgba(35,40,66,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - 0.05 * pr})`}}>
                <FitText text={bt} maxW={bw - 24} size={m.body} min={24} weight={800} color={main ? '#fff' : C.ink} style={{width: 'auto'}} lh={1.2} markup={false} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** 对话框按钮的位置（给光标用）：返回 {'dialog.0': Box, 'dialog.1': Box…} */
const dialogBoxes = (d: Dialog | undefined, x: number, y: number, w: number, h: number, m: M, mobile?: boolean): Record<string, Box> => {
  if (!d) return {};
  const dw = Math.min(mobile ? w - 40 : 700, w - 60);
  const tf = fit({text: d.title, maxW: dw - 70, size: m.title - 6, min: 30, maxLines: 2});
  const bf = d.text ? fit({text: d.text, maxW: dw - 70, size: m.body - 2, min: 26, maxLines: 4}, 1.4) : null;
  const dh = 40 + tf.h + (bf ? bf.h + 16 : 0) + 40 + m.ctl + 32;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  const bw = (dw - 68 - 16 * (d.buttons.length - 1)) / d.buttons.length;
  const r: Record<string, Box> = {};
  d.buttons.forEach((_, i) => {
    const bx = dx + 34 + i * (bw + 16);
    const by = dy + dh - 32 - m.ctl;
    r[`dialog.${i}`] = {x: bx, y: by, w: bw, h: m.ctl, cx: bx + bw / 2, cy: by + m.ctl / 2};
  });
  return r;
};

const ToastLayer: React.FC<{t: number; tt: Toast; cx: number; y: number; maxW: number; m: M}> = ({t, tt, cx, y, maxW, m}) => {
  const v = appear(t, tt.at, tt.t1 ?? tt.at + 2.2, 0.25, 0.3);
  if (v <= 0) return null;
  const sp = pop(t, tt.at, 240, 16);
  const bg = tt.tone === 'err' ? '#D9483B' : tt.tone === 'info' ? C.ink : C.mintDeep;
  return (
    <div style={{position: 'absolute', left: cx, top: y, transform: `translate(-50%, ${(1 - clamp(sp)) * -30}px)`, opacity: v, background: bg, borderRadius: 16, padding: '14px 26px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 12px 30px rgba(35,40,66,0.3)', zIndex: 40, whiteSpace: 'nowrap'}}>
      <Icon name={tt.tone === 'err' ? 'alert' : tt.tone === 'info' ? 'info' : 'check'} size={30} color="#fff" sw={2.8} />
      <FitText text={tt.text} maxW={maxW - 100} size={m.body - 2} min={24} weight={800} color="#fff" style={{width: 'auto'}} lh={1.2} markup={false} />
    </div>
  );
};

// ───────── 软件窗口 ─────────
export type AppWindowProps = {
  t0: number;
  t1?: number;
  /** 窗口标题 */
  title: string;
  /** 标题栏左边的图标 */
  icon?: IconName;
  iconTone?: Tone;
  /** 左侧栏：几个菜单项，active 是当前选中的序号（可随时间变：activeAt） */
  sidebar?: {items: {text: string; icon?: IconName}[]; active?: number; activeAt?: {at: number; i: number}[]};
  /** 内容区从上往下的控件 */
  body: Widget[];
  dialog?: Dialog;
  toast?: Toast;
  /** 光标脚本（舞台坐标），用 aim(appLayout(props), 'id', 时刻) 生成落点 */
  cursor?: Way[];
  slot?: Slot;
};

const winGeom = (p: AppWindowProps) => {
  const st = stageOf(false);
  const box = slotBox(p.slot ?? 'center', st, 1380);
  const w = box.w;
  const h = st.bottom - st.top + 10;
  const x = box.x;
  const y = st.top - 10;
  const barH = 68;
  const sideW = p.sidebar ? (w > 1000 ? 300 : 240) : 0;
  const m = DESK;
  const cx = x + sideW + m.pad;
  const cw = Math.min(860, w - sideW - m.pad * 2);
  const cy = y + barH + 36;
  const ch = h - barH - 36 - 30;
  return {x, y, w, h, barH, sideW, m, cx, cw, cy, ch};
};

/** 算出窗口里每个控件的舞台坐标：{id: {x,y,w,h,cx,cy}}，对话框按钮是 'dialog.0'、'dialog.1'… */
export const appLayout = (p: AppWindowProps): Record<string, Box> => {
  const g = winGeom(p);
  const placed = layoutBody(p.body, g.cx, g.cy, g.cw, g.m, g.ch);
  const side: Record<string, Box> = {};
  p.sidebar?.items.forEach((_, i) => {
    const by = g.y + g.barH + 24 + i * 72;
    side[`side.${i}`] = {x: g.x + 14, y: by, w: g.sideW - 28, h: 60, cx: g.x + g.sideW / 2, cy: by + 30};
  });
  return idMap(placed, {...side, ...dialogBoxes(p.dialog, g.x, g.y + g.barH, g.w, g.h - g.barH, g.m)});
};

/** 通用软件窗口：标题栏、可选侧栏，里面摆输入框、按钮、开关、下拉、列表、提示条，可弹对话框和提示 */
export const AppWindow: React.FC<AppWindowProps & {t: number}> = (p) => {
  const {t, t0, t1, title, icon = 'window', iconTone = 'sky', sidebar, body, dialog, toast, cursor} = p;
  const g = winGeom(p);
  const placed = layoutBody(body, g.cx, g.cy, g.cw, g.m, g.ch);
  const sp = pop(t, t0, 190, 16);
  let active = sidebar?.active ?? 0;
  for (const a of sidebar?.activeAt ?? []) if (t >= a.at) active = a.i;
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div data-probe="skip" style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - clamp(sp)) * 60}px) scale(${lerp(0.95, 1, clamp(sp))})`, transformOrigin: `${g.x + g.w / 2}px ${g.y + g.h / 2}px`, opacity: clamp(sp * 2)}}>
        <div style={{position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, background: '#fff', borderRadius: 22, border: `4px solid ${C.ink}`, overflow: 'hidden', boxShadow: '0 12px 0 rgba(35,40,66,0.12), 0 30px 60px rgba(35,40,66,0.18)', boxSizing: 'border-box'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: g.barH, background: '#F4F5F7', borderBottom: '2px solid rgba(35,40,66,0.1)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px'}}>
            <div style={{width: 40, height: 40, borderRadius: 11, background: TONE[iconTone].main, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Icon name={icon} size={24} color="#fff" sw={2.4} />
            </div>
            <FitText text={title} maxW={g.w - 320} size={28} min={24} weight={700} style={{width: 'auto'}} lh={1.2} markup={false} />
            <div style={{flex: 1}} />
            <div style={{display: 'flex', gap: 34, alignItems: 'center', paddingRight: 8}}>
              <Icon name="minus" size={24} color={C.ink2} />
              <Icon name="square" size={20} color={C.ink2} />
              <Icon name="x" size={24} color={C.ink2} />
            </div>
          </div>
          {sidebar && (
            <div style={{position: 'absolute', left: 0, top: g.barH, width: g.sideW, bottom: 0, background: '#F7F7F9', borderRight: '2px solid rgba(35,40,66,0.08)'}}>
              {sidebar.items.map((it, i) => (
                <div key={i} style={{position: 'absolute', left: 14, top: 24 + i * 72, width: g.sideW - 28, height: 60, borderRadius: 14, background: i === active ? C.coralPale : undefined, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', boxSizing: 'border-box'}}>
                  {it.icon && <Icon name={it.icon} size={30} color={i === active ? C.coral : C.ink2} sw={2.4} />}
                  <FitText text={it.text} maxW={g.sideW - 60 - (it.icon ? 44 : 0)} size={28} min={24} weight={i === active ? 800 : 600} color={i === active ? C.ink : C.ink2} style={{width: 'auto'}} lh={1.2} markup={false} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, overflow: 'hidden', borderRadius: 22, pointerEvents: 'none'}}>
          <div style={{position: 'absolute', left: -g.x, top: -g.y, width: 1920, height: 1080}}>
            {placed.map(({wd, b}, k) => (
              <Wd key={k} t={t} wd={wd} b={b} m={g.m} />
            ))}
            <Dropdowns t={t} placed={placed} m={g.m} />
            {dialog && <DialogLayer t={t} d={dialog} x={g.x} y={g.y + g.barH} w={g.w} h={g.h - g.barH} m={g.m} />}
            {toast && <ToastLayer t={t} tt={toast} cx={g.x + g.w / 2} y={g.y + 4} maxW={g.w - 360} m={g.m} />}
          </div>
        </div>
      </div>
      {cursor && <Cursor ways={cursor} t={t} scale={1.4} />}
    </Out>
  );
};

const widgetSfx = (body: Widget[]): Ev[] => {
  const ev: Ev[] = [];
  const walk = (ws: Widget[]) =>
    ws.forEach((w) => {
      if (w.kind === 'row') walk(w.children);
      else if (w.kind === 'input' && w.typeFrom !== undefined) {
        const n = Array.from(w.value ?? '').length;
        ev.push({at: w.typeFrom, typing: Math.max(0.3, (w.typeTo ?? w.typeFrom + n / 12) - w.typeFrom), vol: 0.2});
      } else if (w.kind === 'toggle' && w.flipAt !== undefined) ev.push({at: w.flipAt, k: 'tap', vol: 0.35});
      else if (w.kind === 'select') {
        if (w.openAt !== undefined) ev.push({at: w.openAt, k: 'option', vol: 0.3});
        if (w.pickAt !== undefined) ev.push({at: w.pickAt, k: 'select', vol: 0.32});
      }
    });
  walk(body);
  return ev;
};

export const appWindowSfx = (p: AppWindowProps): Ev[] => [
  {at: p.t0 + 0.03, k: 'popup', vol: 0.3},
  ...widgetSfx(p.body),
  ...(p.dialog ? [{at: p.dialog.at + 0.02, k: 'popup' as const, vol: 0.32}] : []),
  ...(p.toast ? [{at: p.toast.at + 0.05, k: p.toast.tone === 'err' ? ('stamp' as const) : ('ok' as const), vol: 0.32}] : []),
  ...(p.cursor ? cursorSfx(p.cursor, 0.45) : []),
];

// ───────── 手机框 ─────────
export type PhoneProps = {
  t0: number;
  t1?: number;
  /** 顶部应用栏标题 */
  title: string;
  /** 应用栏左边显示返回箭头 */
  back?: boolean;
  body: Widget[];
  dialog?: Dialog;
  toast?: Toast;
  /** 光标脚本：手机上显示成手指点按（用 aim(phoneLayout(props), 'id', 时刻) 生成） */
  cursor?: Way[];
  /** 横屏放哪边，缺省 right（左边留给步骤清单） */
  slot?: Slot;
  /** 状态栏时间 */
  clock?: string;
  vertical?: boolean;
};

const phoneGeom = (p: PhoneProps) => {
  const st = stageOf(p.vertical);
  const h = p.vertical ? 1220 : st.bottom - st.top + 30;
  const w = h * (p.vertical ? 0.5 : 0.52);
  const slot = p.slot ?? (p.vertical ? 'center' : 'right');
  const box = slotBox(slot, st);
  const x = p.vertical ? st.cx - w / 2 : box.x + (box.w - w) / 2;
  const y = p.vertical ? st.top + (st.bottom - st.top - h) / 2 : st.top - 15;
  const bez = 16;
  const sx = x + bez;
  const sy = y + bez;
  const sw = w - bez * 2;
  const sh = h - bez * 2;
  const statusH = 50;
  const appH = 84;
  const m = MOB;
  const cx = sx + m.pad;
  const cw = sw - m.pad * 2;
  const cy = sy + statusH + appH + 24;
  const ch = sh - statusH - appH - 40;
  return {x, y, w, h, sx, sy, sw, sh, statusH, appH, m, cx, cw, cy, ch};
};

/** 算出手机里每个控件的舞台坐标（同 appLayout） */
export const phoneLayout = (p: PhoneProps): Record<string, Box> => {
  const g = phoneGeom(p);
  return idMap(layoutBody(p.body, g.cx, g.cy, g.cw, g.m, g.ch), dialogBoxes(p.dialog, g.sx, g.sy, g.sw, g.sh, g.m, true));
};

/** 手机框：状态栏 + 应用栏，里面摆和软件窗口一样的控件，手指点按演示 */
export const Phone: React.FC<PhoneProps & {t: number}> = (p) => {
  const {t, t0, t1, title, back = true, body, dialog, toast, cursor, clock = '12:00', vertical} = p;
  const g = phoneGeom(p);
  const placed = layoutBody(body, g.cx, g.cy, g.cw, g.m, g.ch);
  const sp = pop(t, t0, 150, 17);
  const st = stageOf(vertical);
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div data-probe="skip" style={{position: 'absolute', left: 0, top: 0, width: st.w, height: st.h, transform: `translateY(${(1 - clamp(sp)) * 700}px)`, opacity: clamp((t - t0) / 0.25)}}>
        <div style={{position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, background: '#1C1F2E', borderRadius: 64, border: `5px solid ${C.ink}`, boxSizing: 'border-box', boxShadow: '0 14px 0 rgba(35,40,66,0.16), 0 34px 70px rgba(35,40,66,0.25)'}} />
        <div style={{position: 'absolute', left: g.sx, top: g.sy, width: g.sw, height: g.sh, background: '#F7F7F9', borderRadius: 50, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: g.statusH, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', fontFamily: F.ui, fontWeight: 700, fontSize: 22, color: C.ink}}>
            <span>{clock}</span>
            <div style={{width: 110, height: 30, borderRadius: 30, background: '#1C1F2E'}} />
            <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
              <Icon name="signal" size={22} color={C.ink} sw={2.4} />
              <div style={{width: 34, height: 18, borderRadius: 5, border: `2.5px solid ${C.ink}`, padding: 2, boxSizing: 'border-box'}}>
                <div style={{width: '75%', height: '100%', background: C.ink, borderRadius: 2}} />
              </div>
            </div>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: g.statusH, height: g.appH, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '2px solid rgba(35,40,66,0.08)', background: '#fff'}}>
            {back && <Icon name="chevLeft" size={36} color={C.ink} sw={2.6} />}
            <FitText text={title} maxW={g.sw - 120} size={32} min={24} weight={800} style={{width: 'auto'}} lh={1.2} markup={false} />
          </div>
        </div>
        <div style={{position: 'absolute', left: g.sx, top: g.sy, width: g.sw, height: g.sh, overflow: 'hidden', borderRadius: 50}}>
          <div style={{position: 'absolute', left: -g.sx, top: -g.sy, width: st.w, height: st.h}}>
            {placed.map(({wd, b}, k) => (
              <Wd key={k} t={t} wd={wd} b={b} m={g.m} mobile />
            ))}
            <Dropdowns t={t} placed={placed} m={g.m} />
            {dialog && <DialogLayer t={t} d={dialog} x={g.sx} y={g.sy} w={g.sw} h={g.sh} m={g.m} mobile />}
            {toast && <ToastLayer t={t} tt={toast} cx={g.sx + g.sw / 2} y={g.sy + g.statusH + 20} maxW={g.sw - 30} m={g.m} />}
          </div>
        </div>
        <div style={{position: 'absolute', left: g.x + g.w / 2 - 70, top: g.y + g.h - 34, width: 140, height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.5)'}} />
      </div>
      {cursor && <Cursor ways={cursor} t={t} scale={1.5} />}
    </Out>
  );
};

export const phoneSfx = (p: PhoneProps): Ev[] => [
  {at: p.t0 + 0.05, k: 'swoosh', vol: 0.28},
  ...widgetSfx(p.body),
  ...(p.dialog ? [{at: p.dialog.at + 0.02, k: 'popup' as const, vol: 0.32}] : []),
  ...(p.toast ? [{at: p.toast.at + 0.05, k: p.toast.tone === 'err' ? ('stamp' as const) : ('ok' as const), vol: 0.32}] : []),
  ...(p.cursor ? cursorSfx(p.cursor, 0.4) : []),
];

