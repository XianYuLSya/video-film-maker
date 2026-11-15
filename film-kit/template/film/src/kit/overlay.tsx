import React from 'react';
import {Img, staticFile} from 'remotion';
import {appear, boil, clamp, ease, prog, spring} from '../lib/anim';
import {C, F} from '../lib/theme';
import {allSubs, bubbles} from '../lib/time';

// ───────── 纸张背景 ─────────
export const Paper: React.FC<{t: number; tone?: 'paper' | 'deep' | 'ink'}> = ({t, tone = 'paper'}) => {
  const base = tone === 'ink' ? C.ink : tone === 'deep' ? C.paper2 : C.paper;
  return (
    <div style={{position: 'absolute', inset: 0, background: base, overflow: 'hidden'}}>
      <Img
        src={staticFile('tex/paper.png')}
        style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: tone === 'ink' ? 'soft-light' : 'multiply', opacity: tone === 'ink' ? 0.25 : 0.45}}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            tone === 'ink'
              ? 'radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.25) 100%)'
              : 'radial-gradient(110% 80% at 25% 15%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%), radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 60%, rgba(120,90,50,0.12) 100%)',
        }}
      />
      <Img
        src={staticFile(`tex/specks${boil(t, 3, 8)}.png`)}
        style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: tone === 'ink' ? 0.12 : 0.22, mixBlendMode: tone === 'ink' ? 'screen' : 'multiply'}}
      />
    </div>
  );
};

// ───────── 字幕 ─────────
export const Subtitles: React.FC<{t: number}> = ({t}) => {
  const s = allSubs().find((x) => t >= x.s - 0.04 && t < x.e + 0.06);
  if (!s) return null;
  const vis = Math.min(clamp((t - (s.s - 0.04)) / 0.08), clamp((s.e + 0.06 - t) / 0.08));
  return (
    <div data-probe="subtitle" style={{position: 'absolute', left: 0, right: 0, bottom: 30, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 40}}>
      <div
        style={{
          maxWidth: 1500,
          background: 'rgba(35,40,66,0.92)',
          color: '#fff',
          fontFamily: F.zh,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: 1.5,
          lineHeight: 1.3,
          padding: '9px 28px 11px',
          borderRadius: 14,
          opacity: vis,
          boxShadow: '0 6px 18px rgba(20,24,40,0.25)',
          textAlign: 'center',
        }}
      >
        {s.t}
      </div>
    </div>
  );
};

// ───────── 角色 ─────────
export const POSES: Record<string, {w: number; h: number}> = {
  think: {w: 1016, h: 1275},
  peek: {w: 1075, h: 1184},
  read: {w: 978, h: 1280},
  victory: {w: 875, h: 1280},
  wave: {w: 756, h: 1280},
  point: {w: 973, h: 1280},
  face_shock: {w: 1215, h: 1180},
  flip: {w: 1068, h: 1135},
  toolbox: {w: 777, h: 1280},
  explore: {w: 985, h: 1018},
  fish_happy: {w: 1240, h: 947},
  face_smug: {w: 1218, h: 1190},
};

export const Mascot: React.FC<{pose: string; t: number; h: number; style?: React.CSSProperties; flipX?: boolean}> = ({pose, t, h, style, flipX}) => {
  const p = POSES[pose] ?? POSES.think;
  const w = (p.w / p.h) * h;
  return (
    <Img
      src={staticFile(`char/${pose}_c${boil(t, 3, 7)}.png`)}
      style={{width: w, height: h, display: 'block', transform: flipX ? 'scaleX(-1)' : undefined, filter: 'drop-shadow(0 10px 14px rgba(35,40,66,0.22))', ...style}}
    />
  );
};

/** 漫画气泡 */
export const Bubble: React.FC<{text: string; vis: number; tail?: 'left' | 'right' | 'down'; size?: number; style?: React.CSSProperties}> = ({text, vis, tail = 'left', size = 46, style}) => {
  if (vis <= 0) return null;
  return (
    <div style={{position: 'relative', opacity: Math.min(1, vis * 2), transform: `scale(${0.6 + 0.4 * vis})`, transformOrigin: tail === 'left' ? '0% 100%' : tail === 'right' ? '100% 100%' : '50% 100%', ...style}}>
      <div
        style={{
          position: 'relative',
          background: '#fff',
          border: `4px solid ${C.ink}`,
          borderRadius: 34,
          padding: '20px 34px 22px',
          fontFamily: F.fun,
          fontWeight: 400,
          fontSize: size,
          color: C.ink,
          whiteSpace: 'nowrap',
          boxShadow: '0 8px 0 rgba(35,40,66,0.16)',
        }}
      >
        {text}
      </div>
      <svg
        width="60"
        height="44"
        viewBox="0 0 60 44"
        style={{position: 'absolute', bottom: -36, left: tail === 'left' ? 30 : tail === 'down' ? '45%' : undefined, right: tail === 'right' ? 30 : undefined, transform: tail === 'right' ? 'scaleX(-1)' : undefined}}
      >
        <path d="M4 0 C10 18 6 32 2 42 C20 32 34 18 40 0 Z" fill="#fff" stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
        <rect x="0" y="-6" width="46" height="9" fill="#fff" />
      </svg>
    </div>
  );
};

/** 无声气泡时段：角色从左下角探出来说一句（q2 是片尾那只大的） */
export const BubbleSlots: React.FC<{t: number}> = ({t}) => {
  const b = bubbles().find((x) => t >= x.start - 0.1 && t <= x.end + 0.5);
  if (!b) return null;
  const inP = clamp(spring(t - b.start, 180, 15));
  const outP = prog(t, b.end - 0.05, 0.4, ease.in);
  const y = (1 - inP) * 420 + outP * 460;
  const bub = appear(t, b.start + 0.18, b.end - 0.1, 0.25, 0.2);
  const pose = b.pose ?? 'think';
  const big = b.id === 'q2';
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 35}}>
      <div style={{position: 'absolute', left: big ? 640 : 80, bottom: -30, transform: `translateY(${y}px) rotate(${(1 - inP) * -8}deg)`}}>
        <Mascot pose={pose} t={t} h={big ? 560 : 430} />
      </div>
      <div style={{position: 'absolute', left: big ? 1110 : 440, bottom: big ? 420 : 330}}>
        <Bubble text={b.text ?? ''} vis={clamp(spring(t - b.start - 0.18, 240, 14)) * bub} tail="left" size={big ? 60 : 54} />
      </div>
    </div>
  );
};
