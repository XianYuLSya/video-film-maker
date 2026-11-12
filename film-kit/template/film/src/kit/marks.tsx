import React from 'react';
import {appear, clamp, ease, prog, spring} from '../lib/anim';
import {C, F} from '../lib/theme';
import {tr} from '../lib/time';
import {CamKey, toScreen} from './cam';

/** 圈出一个元素：圆角框描边画出来，再轻轻呼吸。舞台坐标，s 是镜头倍数（让线宽在画面上恒定） */
export const Ring: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  t: number;
  t0: number;
  t1?: number;
  s?: number;
  color?: string;
  pad?: number;
}> = ({x, y, w, h, r = 10, t, t0, t1 = Infinity, s = 1, color = C.coral, pad = 6}) => {
  const vis = appear(t, t0, t1, 0.2, 0.25);
  if (vis <= 0) return null;
  const draw = prog(t, t0, 0.45, ease.out);
  const breathe = 1 + 0.012 * Math.sin((t - t0) * 6);
  const X = x - pad;
  const Y = y - pad;
  const Wd = w + pad * 2;
  const Hd = h + pad * 2;
  const per = 2 * (Wd + Hd);
  const sw = 3.2 / s;
  return (
    <svg
      style={{position: 'absolute', left: X - 10, top: Y - 10, overflow: 'visible', opacity: vis, pointerEvents: 'none'}}
      width={Wd + 20}
      height={Hd + 20}
    >
      <g transform={`translate(${10 + Wd / 2} ${10 + Hd / 2}) scale(${breathe}) translate(${-Wd / 2} ${-Hd / 2})`}>
        <rect x={0} y={0} width={Wd} height={Hd} rx={r + pad} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={sw * 4} />
        <rect
          x={0}
          y={0}
          width={Wd}
          height={Hd}
          rx={r + pad}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={per}
          strokeDashoffset={per * (1 - draw)}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export type Dir = 'up' | 'down' | 'left' | 'right';

/** 按钮说明牌：英文按钮名 + 中文提示（频道规矩：英文按钮配中文提示）。画面坐标，不跟镜头缩放 */
export const Callout: React.FC<{
  cam: CamKey[];
  t: number;
  t0: number;
  t1?: number;
  x: number; // 指向的舞台坐标
  y: number;
  dir?: Dir; // 牌子在锚点的哪一边
  gap?: number;
  label: string;
  hint?: string;
  num?: number | string;
  tone?: 'ink' | 'coral' | 'green';
}> = ({cam, t, t0, t1 = Infinity, x, y, dir = 'down', gap = 54, label, hint, num, tone = 'ink'}) => {
  const vis = appear(t, t0, t1, 0.3, 0.25);
  if (vis <= 0) return null;
  const p = toScreen(cam, t, x, y);
  const sp = clamp(spring(t - t0, 210, 15));
  const bg = tone === 'coral' ? C.coral : tone === 'green' ? C.mintDeep : C.ink;
  const off = {
    up: {dx: 0, dy: -gap, tx: '-50%', ty: '-100%'},
    down: {dx: 0, dy: gap, tx: '-50%', ty: '0%'},
    left: {dx: -gap, dy: 0, tx: '-100%', ty: '-50%'},
    right: {dx: gap, dy: 0, tx: '0%', ty: '-50%'},
  }[dir];
  const lx = p.x + off.dx * sp;
  const ly = p.y + off.dy * sp;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, pointerEvents: 'none', opacity: vis}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1920} height={1080}>
        <line x1={p.x} y1={p.y} x2={lx} y2={ly} stroke={bg} strokeWidth={2.5} strokeDasharray="2 6" strokeLinecap="round" />
        <circle cx={p.x} cy={p.y} r={6.5} fill={bg} stroke="#fff" strokeWidth={2.5} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: lx,
          top: ly,
          transform: `translate(${off.tx}, ${off.ty}) scale(${0.7 + 0.3 * sp})`,
          transformOrigin: dir === 'up' ? '50% 100%' : dir === 'down' ? '50% 0%' : dir === 'left' ? '100% 50%' : '0% 50%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: bg,
          color: '#fff',
          padding: num !== undefined ? '10px 20px 10px 10px' : '11px 20px',
          borderRadius: 16,
          boxShadow: '0 8px 0 rgba(35,40,66,0.14), 0 16px 32px rgba(35,40,66,0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        {num !== undefined && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: tone === 'coral' ? '#fff' : C.coral,
              color: tone === 'coral' ? C.coral : '#fff',
              fontFamily: F.ui,
              fontWeight: 800,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {num}
          </div>
        )}
        <div style={{display: 'flex', flexDirection: 'column', gap: 1}}>
          <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: 0.2}}>{label}</div>
          {hint && <div style={{fontFamily: F.zh, fontWeight: 500, fontSize: 19, opacity: 0.78, lineHeight: 1.2}}>{hint}</div>}
        </div>
      </div>
    </div>
  );
};

/** 聚光：画面压暗，只留一块（画面坐标） */
export const Spot: React.FC<{cam: CamKey[]; t: number; t0: number; t1?: number; x: number; y: number; w: number; h: number; r?: number; dim?: number}> = ({
  cam,
  t,
  t0,
  t1 = Infinity,
  x,
  y,
  w,
  h,
  r = 14,
  dim = 0.42,
}) => {
  const vis = appear(t, t0, t1, 0.4, 0.4);
  if (vis <= 0) return null;
  const a = toScreen(cam, t, x, y);
  const b = toScreen(cam, t, x + w, y + h);
  const R = r * a.s;
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}} width={1920} height={1080}>
      <defs>
        <mask id={`spot-${Math.round(t0 * 100)}`}>
          <rect x={0} y={0} width={1920} height={1080} fill="#fff" />
          <rect x={a.x - 8} y={a.y - 8} width={b.x - a.x + 16} height={b.y - a.y + 16} rx={R + 8} fill="#000" />
        </mask>
      </defs>
      <rect x={0} y={0} width={1920} height={1080} fill={C.ink} opacity={dim * vis} mask={`url(#spot-${Math.round(t0 * 100)})`} />
    </svg>
  );
};

/** 顶部小提示条 */
export const Toast: React.FC<{t: number; t0: number; t1: number; text: string; x?: number; y?: number; tone?: 'green' | 'ink'}> = ({
  t,
  t0,
  t1,
  text,
  x = 960,
  y = 120,
  tone = 'green',
}) => {
  const vis = appear(t, t0, t1, 0.3, 0.3);
  if (vis <= 0) return null;
  const sp = spring(t - t0, 220, 18);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, ${(1 - sp) * -30}px)`,
        opacity: vis,
        background: tone === 'green' ? C.faGreen : C.ink,
        color: '#fff',
        fontFamily: F.zh,
        fontWeight: 600,
        fontSize: 24,
        padding: '12px 26px',
        borderRadius: 14,
        boxShadow: '0 12px 30px rgba(35,40,66,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.22)" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </div>
  );
};

/** 角落「示意画面」 */
export const DemoTag: React.FC<{vis: number}> = ({vis}) => {
  if (vis <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        right: 30,
        bottom: 26,
        opacity: vis * 0.92,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255,255,255,0.78)',
        border: `1.5px solid ${C.line}`,
        borderRadius: 999,
        padding: '6px 14px 6px 10px',
        fontFamily: F.zh,
        fontSize: 17,
        fontWeight: 600,
        color: C.ink2,
      }}
    >
      <div style={{width: 9, height: 9, borderRadius: 9, background: C.coral}} />
      {tr('示意画面', 'Illustration')}
    </div>
  );
};

/** 荧光笔划过（放在文字下面） */
export const Marker: React.FC<{t: number; t0: number; w: number; h?: number; color?: string; dur?: number}> = ({
  t,
  t0,
  w,
  h = 22,
  color = C.sun,
  dur = 0.35,
}) => {
  const p = prog(t, t0, dur, ease.out);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: -6,
        bottom: -2,
        width: (w + 12) * p,
        height: h,
        background: color,
        borderRadius: 6,
        transform: 'skewX(-8deg)',
        zIndex: -1,
        opacity: 0.85,
      }}
    />
  );
};
