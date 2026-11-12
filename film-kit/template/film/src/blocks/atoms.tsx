import React from 'react';
import {Img, staticFile} from 'remotion';
import {appear, boil, clamp, ease, lerp, prog} from '../lib/anim';
import {C, F} from '../lib/theme';
import {Bubble, Mascot, POSES} from '../kit/overlay';
import type {Ev} from '../kit/sfx';
import {Icon} from '../ui/icons';
import {FitText, Font, HARD, HARD_S, TONE, Tone, fit, pop, stageOf, vis} from './core';

// ═════════ 小件：标题、药丸、贴纸卡、图标块、箭头、荧光笔、盖章、集中线、爆炸气泡、吉祥物、角色图 ═════════

/** 图标名：ui/icons.tsx 里的线条图标（check、x、alert、bolt、chat、clock、lock、key、user、users、star、heart、search、settings、globe、monitor、phone、mail、card、shield、shieldCheck、download、folder、file、fileText、code、route、link、play、sparkles、thumb、qq、calendar、bookOpen、clipboard、ban、cloud、server、camera、music、gamepad、bell、help、info、pin、layers、sliders、trash、send、copy、refresh、upgrade、languages、mouse、plug、briefcase、presentation、activity、chart、edit、pencil、inbox、archive、logIn、logout、idCard、eraser、swap、menu、more、plus、minus、arrowRight、arrowLeft、arrowUp、chevRight、chevDown） */
export type IconName = string;

// ───────── 标题 ─────────
export type TitleProps = {
  text: string;
  /** 左侧小色条的颜色 */
  tone?: Tone;
  size?: number;
  maxW?: number;
  /** 副标题（小字一行） */
  sub?: string;
  align?: 'left' | 'center';
  vis?: number;
};
/** 区块标题：得意黑 + 左侧色条（居中时不画色条，改画下划线） */
export const Title: React.FC<TitleProps> = ({text, tone = 'coral', size = 64, maxW = 1400, sub, align = 'left', vis: v = 1}) => {
  if (v <= 0) return null;
  const f = fit({text, maxW: maxW - (align === 'left' ? 34 : 0), size, min: 44, maxLines: 1, font: 'smiley', who: '标题'});
  return (
    <div style={{opacity: clamp(v * 1.5), transform: `translateY(${(1 - clamp(v)) * 16}px)`, maxWidth: maxW, display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        {align === 'left' && <div style={{width: 14, height: f.size * 0.9, borderRadius: 7, background: TONE[tone].main, flexShrink: 0}} />}
        <FitText text={text} maxW={maxW - (align === 'left' ? 34 : 0)} size={size} min={44} font="smiley" align={align} lh={1.15} style={{width: 'auto'}} who="标题" />
      </div>
      {sub && (
        <div style={{marginTop: 8, marginLeft: align === 'left' ? 34 : 0}}>
          <FitText text={sub} maxW={maxW - 34} size={28} min={24} weight={700} color={C.ink2} align={align} style={{width: 'auto'}} who="副标题" />
        </div>
      )}
    </div>
  );
};

// ───────── 标签药丸 ─────────
export type TagProps = {text: string; tone?: Tone; size?: number; icon?: IconName; solid?: boolean; rot?: number; vis?: number; maxW?: number; style?: React.CSSProperties};
/** 标签药丸：实心（默认）或白底描边 */
export const Tag: React.FC<TagProps> = ({text, tone = 'coral', size = 30, icon, solid = true, rot = 0, vis: v = 1, maxW = 700, style}) => {
  if (v <= 0) return null;
  const T = TONE[tone];
  const s = clamp(v, 0, 1.2);
  const iconW = icon ? size * 1.1 : 0;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.3,
        background: solid ? T.main : '#fff',
        color: solid ? T.on : T.text,
        border: `${Math.max(3, size * 0.12)}px solid ${C.ink}`,
        borderRadius: size * 0.42,
        padding: `${size * 0.14}px ${size * 0.5}px ${size * 0.18}px`,
        boxShadow: `0 ${size * 0.16}px 0 rgba(35,40,66,0.16)`,
        transform: `rotate(${rot}deg) scale(${0.6 + 0.4 * s})`,
        opacity: clamp(v * 2),
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size * 1.0} color={solid ? T.on : T.main} sw={2.6} />}
      <FitText text={text} maxW={maxW - iconW - size} size={size} min={Math.min(size, 22)} weight={900} color={solid ? T.on : C.ink} em={solid ? C.sunPale : C.coral} style={{width: 'auto'}} lh={1.2} who="标签" />
    </div>
  );
};

// ───────── 贴纸白卡 ─────────
export type CardProps = {children: React.ReactNode; rot?: number; pad?: number; bg?: string; w?: number; h?: number; r?: number; line?: number; style?: React.CSSProperties; small?: boolean};
/** 贴纸白卡：白底、粗墨线、硬投影 */
export const Card: React.FC<CardProps> = ({children, rot = 0, pad = 30, bg = '#fff', w, h, r, line, style, small}) => (
  <div
    style={{
      position: 'relative',
      boxSizing: 'border-box',
      width: w,
      height: h,
      background: bg,
      border: `${line ?? (small ? 4 : 5)}px solid ${C.ink}`,
      borderRadius: r ?? (small ? 22 : 30),
      padding: pad,
      boxShadow: small ? HARD_S : HARD,
      transform: rot ? `rotate(${rot}deg)` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

// ───────── 图标块 ─────────
/** 方形图标块：色底 + 墨线 + 白色线条图标 */
export const IconBox: React.FC<{name: IconName; tone?: Tone; size?: number; soft?: boolean; style?: React.CSSProperties}> = ({name, tone = 'coral', size = 80, soft, style}) => {
  const T = TONE[tone];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: soft ? T.pale : T.main,
        border: `${Math.max(3, size * 0.05)}px solid ${C.ink}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 ${size * 0.07}px 0 rgba(35,40,66,0.15)`,
        flexShrink: 0,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <Icon name={name} size={size * 0.52} color={soft ? (tone === 'sun' ? C.ink : T.main) : T.on} sw={2.5} />
    </div>
  );
};

/** 对勾 / 叉 圆章 */
export const Mark: React.FC<{ok: boolean; size?: number; p?: number; style?: React.CSSProperties}> = ({ok, size = 56, p = 1, style}) => {
  if (p <= 0) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: ok ? C.mintDeep : C.coral,
        border: `${Math.max(3, size * 0.07)}px solid ${C.ink}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${clamp(p, 0, 1.25)}) rotate(${(1 - clamp(p)) * -30}deg)`,
        boxSizing: 'border-box',
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon name={ok ? 'check' : 'x'} size={size * 0.58} color="#fff" sw={3.6} />
    </div>
  );
};

// ───────── 箭头 ─────────
export type ArrowProps = {x1: number; y1: number; x2: number; y2: number; /** 画出进度 0..1 */ p: number; color?: string; w?: number; /** 弯曲度，0 是直线，正负决定弯向 */ bend?: number; dash?: boolean; head?: number};
/** 手绘感箭头（舞台坐标），按 p 画出来 */
export const Arrow: React.FC<ArrowProps> = ({x1, y1, x2, y2, p, color = C.ink, w = 6, bend = 0.12, dash, head = 20}) => {
  if (p <= 0) return null;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const len = Math.hypot(x2 - x1, y2 - y1) * (1 + Math.abs(bend) * 0.6) + 4;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const pp = clamp(p);
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} width={1} height={1}>
      <path
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={dash ? `${w * 0.2} ${w * 2.4}` : `${len} ${len}`}
        strokeDashoffset={dash ? 0 : len * (1 - pp)}
        opacity={dash ? pp : 1}
      />
      {pp > 0.9 && (
        <path
          d={`M ${x2 - head * Math.cos(ang - 0.5)} ${y2 - head * Math.sin(ang - 0.5)} L ${x2} ${y2} L ${x2 - head * Math.cos(ang + 0.5)} ${y2 - head * Math.sin(ang + 0.5)}`}
          fill="none"
          stroke={color}
          strokeWidth={w}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={clamp((pp - 0.9) / 0.1)}
        />
      )}
    </svg>
  );
};

// ───────── 荧光笔 ─────────
export type HighlightProps = {t: number; at: number; text: string; size?: number; font?: Font; color?: string; tone?: 'sun' | 'coral' | 'mint'; maxW?: number; dur?: number};
/** 荧光笔划过一行字（字在上、色带在下） */
export const Highlight: React.FC<HighlightProps> = ({t, at, text, size = 48, font = 'zh', color = C.ink, tone = 'sun', maxW = 1600, dur = 0.4}) => {
  const f = fit({text, maxW, size, min: 28, maxLines: 1, font, who: '荧光笔'});
  const p = prog(t, at, dur, ease.out);
  const band = tone === 'sun' ? C.sun : tone === 'coral' ? C.coralSoft : '#9FD9B5';
  return (
    <div style={{position: 'relative', display: 'inline-block'}}>
      <div style={{position: 'absolute', left: -8, right: -8, bottom: f.size * 0.04, height: f.size * 0.46, background: band, opacity: 0.85, borderRadius: 6, transform: `skewX(-8deg) scaleX(${p})`, transformOrigin: '0 50%'}} />
      <div style={{position: 'relative'}}>
        <FitText text={text} maxW={maxW} size={size} min={28} font={font} color={color} style={{width: 'auto'}} />
      </div>
    </div>
  );
};
export const highlightSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.05, k: 'marker', vol: 0.3}];

// ───────── 盖章 ─────────
export type StampProps = {t: number; at: number; t1?: number; text: string; tone?: 'coral' | 'mint' | 'sky' | 'ink'; size?: number; rot?: number; x?: number; y?: number; style?: React.CSSProperties};
/** 盖章：从大到小砸下去（x/y 是章中心的位置；不给就跟随父容器排版） */
export const Stamp: React.FC<StampProps> = ({t, at, t1, text, tone = 'coral', size = 64, rot = -10, x, y, style}) => {
  const v = appear(t, at, t1 ?? Infinity, 0.1, 0.25);
  if (v <= 0) return null;
  const p = clamp((t - at) / 0.18);
  const sc = lerp(2.3, 1, ease.out(p));
  const col = tone === 'mint' ? C.mintDeep : tone === 'sky' ? C.sky : tone === 'ink' ? C.ink : C.coral;
  const placed = x !== undefined && y !== undefined;
  return (
    <div
      style={{
        position: placed ? 'absolute' : 'relative',
        left: x,
        top: y,
        display: 'inline-block',
        fontFamily: F.smiley,
        fontSize: size,
        color: col,
        border: `${size * 0.09}px solid ${col}`,
        borderRadius: size * 0.22,
        padding: `${size * 0.02}px ${size * 0.3}px ${size * 0.08}px`,
        background: 'rgba(255,255,255,0.9)',
        transform: `${placed ? 'translate(-50%,-50%) ' : ''}rotate(${rot}deg) scale(${sc})`,
        opacity: v,
        whiteSpace: 'nowrap',
        lineHeight: 1.15,
        zIndex: 15,
        boxShadow: '0 6px 0 rgba(35,40,66,0.1)',
        ...style,
      }}
    >
      {text}
    </div>
  );
};
export const stampSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.12, k: 'stamp', vol: 0.45}];

// ───────── 集中线 ─────────
export type SpeedLinesProps = {t: number; vis?: number; color?: string; cx?: number; cy?: number; n?: number; inner?: number; vertical?: boolean};
/** 漫画集中线：爆发感用它（频道禁忌：不用红色圆盘配放射光芒） */
export const SpeedLines: React.FC<SpeedLinesProps> = ({t, vis: v = 1, color = C.ink, cx, cy, n = 80, inner = 330, vertical}) => {
  if (v <= 0) return null;
  const st = stageOf(vertical);
  const X = cx ?? st.w / 2;
  const Y = cy ?? st.h / 2;
  const k = Math.floor(t * 12) % 3;
  const R = Math.hypot(st.w, st.h);
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ((i * 7 + k) % 5) * 0.004;
    const r0 = inner + ((i * 37 + k * 23) % 110);
    const w = 3 + ((i * 13) % 8);
    const x1 = X + Math.cos(a) * r0;
    const y1 = Y + Math.sin(a) * r0;
    const x2 = X + Math.cos(a) * R;
    const y2 = Y + Math.sin(a) * R;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    paths.push(<path key={i} d={`M${x1} ${y1} L${x2 + nx} ${y2 + ny} L${x2 - nx} ${y2 - ny} Z`} fill={color} />);
  }
  return (
    <svg width={st.w} height={st.h} style={{position: 'absolute', left: 0, top: 0, opacity: clamp(v), pointerEvents: 'none'}}>
      {paths}
    </svg>
  );
};

// ───────── 爆炸气泡 ─────────
export type BurstProps = {t: number; at: number; t1?: number; text: string; x: number; y: number; size?: number; tone?: 'sun' | 'white' | 'coral'; rot?: number};
/** 爆炸气泡：锯齿边的漫画对白框，中间一句大字（x/y 是中心） */
export const Burst: React.FC<BurstProps> = ({t, at, t1, text, x, y, size = 64, tone = 'sun', rot = -6}) => {
  const v = appear(t, at, t1 ?? Infinity, 0.1, 0.25);
  if (v <= 0) return null;
  const sp = pop(t, at, 320, 12);
  const f = fit({text, maxW: size * 7, size, min: 36, maxLines: 2, font: 'smiley', who: '爆炸气泡'});
  const bw = f.w + size * 1.9;
  const bh = f.h + size * 1.5;
  const n = 18;
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const out = i % 2 === 0;
    const jit = out ? 1 + ((i * 37) % 7) * 0.025 : 0.8;
    pts.push(`${bw / 2 + Math.cos(a) * (bw / 2) * jit},${bh / 2 + Math.sin(a) * (bh / 2) * jit}`);
  }
  const fill = tone === 'sun' ? C.sun : tone === 'coral' ? C.coral : '#fff';
  const ink = tone === 'coral' ? '#fff' : C.ink;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: bw, height: bh, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${sp})`, opacity: v, zIndex: 16}}>
      <svg width={bw} height={bh} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <polygon points={pts.join(' ')} fill="rgba(35,40,66,0.18)" transform="translate(6 10)" />
        <polygon points={pts.join(' ')} fill={fill} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      <div style={{position: 'absolute', left: 0, top: 0, width: bw, height: bh, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <FitText text={text} maxW={size * 7} size={size} min={36} maxLines={2} font="smiley" color={ink} align="center" lh={1.15} style={{width: f.w + 4}} />
      </div>
    </div>
  );
};
export const burstSfx = (p: {at: number}): Ev[] => [
  {at: p.at, k: 'poof', vol: 0.4},
  {at: p.at + 0.02, k: 'bass', vol: 0.3},
];

// ───────── 小咸鱼吉祥物（带具名站位） ─────────
export type Pose = 'think' | 'peek' | 'read' | 'victory' | 'wave' | 'point' | 'face_shock' | 'flip' | 'toolbox' | 'explore' | 'fish_happy' | 'face_smug';
export type MascotSpot = 'left-bottom' | 'right-bottom' | 'right' | 'left';
export type MascotSayProps = {
  t: number;
  t0: number;
  t1?: number;
  pose?: Pose;
  /** 站位：左下角探出 / 右下角探出 / 右侧站立 / 左侧站立 */
  spot?: MascotSpot;
  /** 气泡里的一句话（短，8 个字以内最好） */
  say?: string;
  sayAt?: number;
  h?: number;
  vertical?: boolean;
};
/** 小咸鱼：从画面边上弹出来，可带一句气泡 */
export const MascotSay: React.FC<MascotSayProps> = ({t, t0, t1, pose = 'point', spot = 'right-bottom', say, sayAt, h, vertical}) => {
  const v = vis(t, t0, t1);
  if (v <= 0) return null;
  const st = stageOf(vertical);
  const sp = clamp(pop(t, t0, 170, 15));
  const corner = spot === 'left-bottom' || spot === 'right-bottom';
  const hh = h ?? (corner ? 400 : 520);
  const info = POSES[pose] ?? POSES.think;
  const w = (info.w / info.h) * hh;
  const isLeft = spot === 'left-bottom' || spot === 'left';
  const x = isLeft ? (corner ? 40 : st.left) : st.w - w - (corner ? 40 : st.w - st.right);
  const y = corner ? st.h - (vertical ? 420 : 140) - hh * 0.92 : st.cy - hh / 2;
  const enterY = (1 - sp) * (corner ? 420 : 60);
  const bubV = say ? clamp(pop(t, sayAt ?? t0 + 0.3, 240, 14)) * appear(t, sayAt ?? t0 + 0.3, t1 ?? Infinity, 0.2, 0.2) : 0;
  const bubSize = 46;
  const bf = say ? fit({text: say, maxW: 400, size: bubSize, min: 32, maxLines: 1, font: 'fun', who: '气泡'}) : null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: st.w, height: st.h, opacity: v, pointerEvents: 'none', zIndex: 30}}>
      <div style={{position: 'absolute', left: x, top: y, transform: `translateY(${enterY}px) rotate(${(1 - sp) * (isLeft ? -8 : 8)}deg)`}}>
        <Mascot pose={pose} t={t} h={hh} flipX={!isLeft && (pose === 'point' || pose === 'wave')} />
      </div>
      {say && bf && bubV > 0 && (
        <div style={{position: 'absolute', left: isLeft ? x + w * 0.62 : undefined, right: isLeft ? undefined : st.w - x - w * 0.38, top: y - 40}}>
          <Bubble text={bf.lines.map((l) => l.map((g) => g.ch).join('')).join('')} vis={bubV} tail={isLeft ? 'left' : 'right'} size={bf.size} />
        </div>
      )}
    </div>
  );
};
export const mascotSaySfx = (p: {t0: number; say?: string; sayAt?: number}): Ev[] => [
  {at: p.t0 + 0.05, k: 'swoosh', vol: 0.25},
  ...(p.say ? [{at: (p.sayAt ?? p.t0 + 0.3) + 0.05, k: 'pop' as const, vol: 0.35}] : []),
];

// ───────── 角色图 ─────────
export type CharImgProps = {
  /** public 下的图片路径，如 'char2/claude_read.png'；要三帧抖动就给 frames */
  src?: string;
  /** 三帧抖动：['char/wave_c0.png','char/wave_c1.png','char/wave_c2.png'] */
  frames?: string[];
  t: number;
  h: number;
  flipX?: boolean;
  shadow?: boolean;
  style?: React.CSSProperties;
};
/** 角色图：按高度放一张透明底角色，可三帧抖动 */
export const CharImg: React.FC<CharImgProps> = ({src, frames, t, h, flipX, shadow = true, style}) => {
  const path = frames && frames.length ? frames[boil(t, frames.length, 7)] : src;
  if (!path) return null;
  return (
    <Img
      src={staticFile(path)}
      style={{height: h, width: 'auto', display: 'block', transform: flipX ? 'scaleX(-1)' : undefined, filter: shadow ? 'drop-shadow(0 10px 14px rgba(35,40,66,0.22))' : undefined, ...style}}
    />
  );
};

// ───────── 指向说明牌 ─────────
export type PointNoteProps = {t: number; at: number; t1?: number; /** 指向的点（舞台坐标） */ x: number; y: number; dir?: 'up' | 'down' | 'left' | 'right'; gap?: number; text: string; sub?: string; num?: number; tone?: 'ink' | 'coral' | 'mint'};
/** 指向某一点的说明牌：小圆点 + 虚线 + 深色牌子（「点这里」「填这个」） */
/** 牌子默认离锚点 100px：留出目标本身和它旁边一行字的位置，牌子不压目标 */
export const PointNote: React.FC<PointNoteProps> = ({t, at, t1, x, y, dir = 'down', gap = 100, text, sub, num, tone = 'ink'}) => {
  const v = appear(t, at, t1 ?? Infinity, 0.25, 0.25);
  if (v <= 0) return null;
  const sp = clamp(pop(t, at, 220, 15));
  const bg = tone === 'coral' ? C.coral : tone === 'mint' ? C.mintDeep : C.ink;
  const off = {up: [0, -gap, '-50%', '-100%'], down: [0, gap, '-50%', '0%'], left: [-gap, 0, '-100%', '-50%'], right: [gap, 0, '0%', '-50%']}[dir] as [number, number, string, string];
  const lx = x + off[0] * sp;
  const ly = y + off[1] * sp;
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: v, zIndex: 25}} width={1} height={1}>
        <line x1={x} y1={y} x2={lx} y2={ly} stroke={bg} strokeWidth={3.5} strokeDasharray="2 8" strokeLinecap="round" />
        <circle cx={x} cy={y} r={9} fill={bg} stroke="#fff" strokeWidth={3.5} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: lx,
          top: ly,
          transform: `translate(${off[2]}, ${off[3]}) scale(${0.7 + 0.3 * sp})`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: bg,
          color: '#fff',
          padding: num !== undefined ? '12px 24px 12px 12px' : '12px 24px',
          borderRadius: 18,
          boxShadow: '0 8px 0 rgba(35,40,66,0.16), 0 16px 32px rgba(35,40,66,0.22)',
          whiteSpace: 'nowrap',
          opacity: v,
          zIndex: 26,
        }}
      >
        {num !== undefined && (
          <div style={{width: 46, height: 46, borderRadius: 13, background: tone === 'coral' ? '#fff' : C.coral, color: tone === 'coral' ? C.coral : '#fff', fontFamily: F.ui, fontWeight: 900, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{num}</div>
        )}
        <div>
          <FitText text={text} maxW={520} size={32} min={26} weight={900} color="#fff" em={C.sun} style={{width: 'auto'}} lh={1.2} />
          {sub && <FitText text={sub} maxW={520} size={24} min={24} weight={600} color="rgba(255,255,255,0.8)" style={{width: 'auto'}} lh={1.2} />}
        </div>
      </div>
    </>
  );
};
export const pointNoteSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.04, k: 'pop', vol: 0.3}];

/** 圈出一块（舞台坐标）：描边画出来再轻轻呼吸 */
export const Circle: React.FC<{t: number; at: number; t1?: number; x: number; y: number; w: number; h: number; r?: number; color?: string; pad?: number; sw?: number}> = ({t, at, t1, x, y, w, h, r = 14, color = C.coral, pad = 8, sw = 5}) => {
  const v = appear(t, at, t1 ?? Infinity, 0.2, 0.25);
  if (v <= 0) return null;
  const draw = prog(t, at, 0.45, ease.out);
  const br = 1 + 0.012 * Math.sin((t - at) * 6);
  const X = x - pad;
  const Y = y - pad;
  const Wd = w + pad * 2;
  const Hd = h + pad * 2;
  const per = 2 * (Wd + Hd);
  return (
    <svg style={{position: 'absolute', left: X - 12, top: Y - 12, overflow: 'visible', opacity: v, pointerEvents: 'none', zIndex: 24}} width={Wd + 24} height={Hd + 24}>
      <g transform={`translate(${12 + Wd / 2} ${12 + Hd / 2}) scale(${br}) translate(${-Wd / 2} ${-Hd / 2})`}>
        <rect x={0} y={0} width={Wd} height={Hd} rx={r + pad} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={sw * 3.5} />
        <rect x={0} y={0} width={Wd} height={Hd} rx={r + pad} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} strokeLinecap="round" />
      </g>
    </svg>
  );
};
export const circleSfx = (p: {at: number}): Ev[] => [{at: p.at + 0.05, k: 'marker', vol: 0.28}];

/** 角落「示意画面」小标（模拟界面时放） */
export const DemoMark: React.FC<{vertical?: boolean; text?: string}> = ({vertical, text = '示意画面'}) => {
  const st = stageOf(vertical);
  return (
    <div
      style={{
        position: 'absolute',
        right: 40,
        top: vertical ? 160 : 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(255,255,255,0.8)',
        border: `2px solid ${C.line}`,
        borderRadius: 999,
        padding: '6px 16px 6px 12px',
        fontFamily: F.zh,
        fontSize: 26,
        fontWeight: 700,
        color: C.ink2,
        zIndex: 40,
        maxWidth: st.w,
      }}
    >
      <div style={{width: 11, height: 11, borderRadius: 11, background: C.coral}} />
      {text}
    </div>
  );
};

export {Icon};
