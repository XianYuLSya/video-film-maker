import React from 'react';
import {Img, staticFile} from 'remotion';
import {appear, blink, boil, clamp, ease, lerp, prog, spring, typed} from '../lib/anim';
import {C, F, shadow} from '../lib/theme';
import {Icon, Spark} from './icons';
import chars from '../chars.json';

// 这一期的界面库：FutureAide Control 品牌、Claude / Codex 聊天窗、DSH 桌面版、团队表、报告卡、PowerShell、角色贴纸。
// 全部是示意画面：按真实产品的结构和文字画，数据用这期真实发生过的派单或示例。

export const B = {
  navy: '#0B1625',
  navy2: '#123A40',
  teal: '#2FB9B5',
  tealHi: '#65E7E5',
  mint: '#A8F3BA',
  ds: '#4D6BFE',
  dsSoft: '#EEF1FF',
  dsInk: '#1F2329',
  dsMute: '#8A8F99',
  dsLine: '#EBEDF0',
  cxInk: '#1F1F1F',
  cxMute: '#8A8A8A',
  cxLine: '#E7E7E7',
};

// ───────── 品牌 ─────────
export const FacMark: React.FC<{size?: number}> = ({size = 64}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{display: 'block', flexShrink: 0}}>
    <defs>
      <linearGradient id="facBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0B1625" />
        <stop offset="1" stopColor="#123A40" />
      </linearGradient>
      <linearGradient id="facAc" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#65E7E5" />
        <stop offset="1" stopColor="#A8F3BA" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#facBg)" />
    <path d="M12 19h17a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-8l-6 5v-5h-3a5 5 0 0 1-5-5v-8a5 5 0 0 1 5-5z" fill="#F0F7FF" />
    <circle cx="16.5" cy="28" r="2" fill="#0B1625" />
    <circle cx="23" cy="28" r="2" fill="#0B1625" />
    <path d="M34 28 L47 16 M34 28 H49 M34 28 L47 40" stroke="url(#facAc)" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="48.5" cy="15" r="4.2" fill="#65E7E5" />
    <circle cx="51" cy="28" r="4.2" fill="#86EDCB" />
    <circle cx="48.5" cy="41" r="4.2" fill="#A8F3BA" />
  </svg>
);

export const Wordmark: React.FC<{size?: number; dark?: boolean}> = ({size = 64, dark}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.3}}>
    <FacMark size={size * 1.15} />
    <div style={{fontFamily: F.ui, fontWeight: 800, fontSize: size, letterSpacing: -size * 0.03, color: dark ? '#F0F7FF' : C.ink, whiteSpace: 'nowrap', lineHeight: 1}}>
      FutureAide <span style={{color: dark ? B.tealHi : B.teal}}>Control</span>
    </div>
  </div>
);

/** DeepSeek 的鲸鱼（示意，不是官方标志原图） */
export const Whale: React.FC<{size?: number; color?: string}> = ({size = 28, color = B.ds}) => (
  <svg width={size} height={size * 0.72} viewBox="0 0 50 36" style={{display: 'block', flexShrink: 0}}>
    <path
      d="M3 17c0-8 8-13 18-13 9 0 15 4 18 9l5-6c1-1 3 0 3 1l-2 9 2 8c0 1-2 2-3 1l-5-5c-3 6-10 11-19 11C10 32 3 26 3 17z"
      fill={color}
    />
    <circle cx="13" cy="15" r="2.3" fill="#fff" />
    <path d="M8 22c5 4 13 4 19 0" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
  </svg>
);

export const DsLogo: React.FC<{size?: number}> = ({size = 26}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.32}}>
    <Whale size={size * 1.3} />
    <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: size, color: B.ds, letterSpacing: -0.4}}>deepseek</div>
    <div style={{fontFamily: F.ui, fontWeight: 800, fontSize: size * 0.42, color: '#fff', background: '#20242C', padding: `${size * 0.1}px ${size * 0.18}px`, borderRadius: 3, letterSpacing: 1}}>HARNESS</div>
  </div>
);

/** OpenAI / Codex 的花形（示意） */
export const Knot: React.FC<{size?: number; color?: string}> = ({size = 24, color = '#1F1F1F'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block', flexShrink: 0}}>
    {[0, 60, 120, 180, 240, 300].map((a) => (
      <ellipse key={a} cx="12" cy="7.2" rx="3.2" ry="5.2" fill="none" stroke={color} strokeWidth="1.7" transform={`rotate(${a} 12 12)`} />
    ))}
  </svg>
);

// ───────── 角色贴纸（Codex 画，三帧抖动） ─────────
type CharInfo = {w: number; h: number};
const CHARS = chars as Record<string, CharInfo>;

export const Char: React.FC<{name: string; t: number; h: number; flipX?: boolean; style?: React.CSSProperties; noShadow?: boolean}> = ({name, t, h, flipX, style, noShadow}) => {
  const info = CHARS[name];
  if (!info) {
    // 素材还没到时的占位，渲染不中断
    return (
      <div style={{width: h * 0.7, height: h, border: `3px dashed ${C.coral}`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.ui, fontSize: 22, color: C.coral, ...style}}>
        {name}
      </div>
    );
  }
  const w = (info.w / info.h) * h;
  return (
    <Img
      src={staticFile(`char2/${name}_c${boil(t, 3, 7)}.png`)}
      style={{width: w, height: h, display: 'block', transform: flipX ? 'scaleX(-1)' : undefined, filter: noShadow ? undefined : 'drop-shadow(0 10px 14px rgba(35,40,66,0.22))', ...style}}
    />
  );
};
/** 整张插画（场景图、设定图），不抖动；素材没到时画占位框 */
export const Art: React.FC<{name: string; w: number; style?: React.CSSProperties}> = ({name, w, style}) => {
  const info = CHARS[name];
  const h = info ? (info.h / info.w) * w : w * 0.5625;
  if (!info) {
    return <div style={{width: w, height: h, border: `3px dashed ${C.coral}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.ui, fontSize: 26, color: C.coral, background: 'rgba(255,255,255,0.5)', ...style}}>{name}</div>;
  }
  return <Img src={staticFile(`char2/${name}.png`)} style={{width: w, height: h, display: 'block', ...style}} />;
};
export const artH = (name: string, w: number) => {
  const info = CHARS[name];
  return info ? (info.h / info.w) * w : w * 0.5625;
};

export const charW = (name: string, h: number) => {
  const info = CHARS[name];
  return info ? (info.w / info.h) * h : h * 0.7;
};

/** 胸牌式名字标签 */
export const NameTag: React.FC<{text: string; vis?: number; size?: number; tone?: 'ds' | 'ink' | 'coral' | 'green'; style?: React.CSSProperties; dot?: boolean}> = ({
  text,
  vis = 1,
  size = 26,
  tone = 'ds',
  style,
  dot = true,
}) => {
  if (vis <= 0) return null;
  const col = tone === 'ds' ? B.ds : tone === 'coral' ? C.coral : tone === 'green' ? C.mintDeep : C.ink;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.32,
        background: '#fff',
        border: `${Math.max(2.5, size * 0.11)}px solid ${C.ink}`,
        borderRadius: size * 0.45,
        padding: `${size * 0.2}px ${size * 0.55}px ${size * 0.22}px ${size * 0.42}px`,
        fontFamily: F.zh,
        fontWeight: 800,
        fontSize: size,
        color: C.ink,
        whiteSpace: 'nowrap',
        boxShadow: `0 ${size * 0.18}px 0 rgba(35,40,66,0.16)`,
        opacity: clamp(vis * 2),
        transform: `scale(${0.6 + 0.4 * clamp(vis)})`,
        ...style,
      }}
    >
      {dot && <div style={{width: size * 0.42, height: size * 0.42, borderRadius: 99, background: col, flexShrink: 0}} />}
      {text}
    </div>
  );
};

/** 纸卡：白底粗墨线，略带倾斜 */
export const Sticker: React.FC<{children: React.ReactNode; rot?: number; pad?: number; style?: React.CSSProperties; bg?: string}> = ({children, rot = 0, pad = 28, style, bg = '#fff'}) => (
  <div
    style={{
      background: bg,
      border: `5px solid ${C.ink}`,
      borderRadius: 30,
      padding: pad,
      boxShadow: '0 12px 0 rgba(35,40,66,0.14), 0 26px 50px rgba(35,40,66,0.16)',
      transform: `rotate(${rot}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** 弹出进场：spring 缩放 + 透明度 */
export const pop = (t: number, t0: number, k = 200, d = 14) => clamp(spring(t - t0, k, d), 0, 1.2);

// ───────── 状态小药丸 ─────────
export type St = 'run' | 'done' | 'ask' | 'idle' | 'cancel' | 'queue';
const ST: Record<St, {label: string; bg: string; fg: string}> = {
  run: {label: '运行中', bg: '#E8EEFF', fg: '#3655E0'},
  done: {label: '已交付', bg: '#E4F5EA', fg: '#23824F'},
  ask: {label: '提问中', bg: '#FFF0E0', fg: '#C46A12'},
  idle: {label: '空闲', bg: '#F0F1F3', fg: '#6B7280'},
  cancel: {label: '已取消', bg: '#F3F3F3', fg: '#9AA0A8'},
  queue: {label: '排队中', bg: '#F0F1F3', fg: '#6B7280'},
};
export const Pill: React.FC<{st: St; t: number; size?: number}> = ({st, t, size = 18}) => {
  const s = ST[st];
  const pulse = st === 'run' ? 0.55 + 0.45 * Math.abs(Math.sin(t * 3.2)) : 1;
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: size * 0.4, background: s.bg, color: s.fg, borderRadius: 99, padding: `${size * 0.2}px ${size * 0.65}px`, fontFamily: F.zh, fontWeight: 800, fontSize: size, whiteSpace: 'nowrap'}}>
      {st === 'done' ? (
        <Icon name="check" size={size * 1.05} color={s.fg} sw={3} />
      ) : st === 'ask' ? (
        <div style={{fontFamily: F.ui, fontWeight: 900, fontSize: size}}>?</div>
      ) : (
        <div style={{width: size * 0.5, height: size * 0.5, borderRadius: 99, background: s.fg, opacity: pulse}} />
      )}
      {s.label}
    </div>
  );
};

// ───────── 聊天窗（Claude 桌面版 / Codex 桌面版） ─────────
export type Sec = {k: string; v: string; at?: number};
export type ChatEntry =
  | {at: number; kind: 'me'; text: string; typeFrom?: number; cps?: number}
  | {at: number; kind: 'ai'; text: string}
  | {at: number; kind: 'tool'; name: string; args?: string; done?: number; doneText?: string; runText?: string}
  | {at: number; kind: 'ask'; who: string; text: string}
  | {at: number; kind: 'report'; who: string; secs: Sec[]}
  | {at: number; kind: 'card'; h: number; render: (t: number, w: number) => React.ReactNode};

const CHAT_FONT = 21;
const lineChars = (w: number, size: number) => Math.max(8, Math.floor(w / (size * 1.02)));
const textH = (text: string, w: number, size: number, lh = 1.55) => {
  const per = lineChars(w, size);
  const n = text.split('\n').reduce((s, p) => s + Math.max(1, Math.ceil(Array.from(p).length / per)), 0);
  return n * size * lh;
};

const entryH = (e: ChatEntry, w: number) => {
  switch (e.kind) {
    case 'me':
      return textH(e.text, Math.min(w * 0.72, 600) - 40, CHAT_FONT) + 30;
    case 'ai':
      return textH(e.text, w - 70, CHAT_FONT) + 6;
    case 'tool':
      return e.args ? 86 : 56;
    case 'ask':
      return 58 + textH(e.text, w - 90, CHAT_FONT);
    case 'report':
      return 52 + e.secs.length * 38;
    case 'card':
      return e.h;
  }
};

const Entry: React.FC<{e: ChatEntry; t: number; w: number; theme: 'claude' | 'codex'}> = ({e, t, w, theme}) => {
  const ink = theme === 'claude' ? C.claudeInk : B.cxInk;
  const mute = theme === 'claude' ? C.claudeMuted : B.cxMute;
  const line = theme === 'claude' ? C.claudeLine : B.cxLine;
  if (e.kind === 'me') {
    return (
      <div style={{display: 'flex', justifyContent: 'flex-end'}}>
        <div style={{maxWidth: Math.min(w * 0.72, 600), background: theme === 'claude' ? '#EFEDE6' : '#F1F1F1', borderRadius: 18, padding: '13px 20px', fontFamily: F.zh, fontSize: CHAT_FONT, lineHeight: 1.55, color: ink}}>{e.text}</div>
      </div>
    );
  }
  if (e.kind === 'ai') {
    return (
      <div style={{display: 'flex', gap: 14, alignItems: 'flex-start'}}>
        <div style={{marginTop: 4}}>{theme === 'claude' ? <Spark size={24} color={C.claudeSpark} /> : <Knot size={24} />}</div>
        <div style={{fontFamily: F.zh, fontSize: CHAT_FONT, lineHeight: 1.55, color: ink, flex: 1}}>{e.text}</div>
      </div>
    );
  }
  if (e.kind === 'tool') {
    const done = e.done !== undefined && t >= e.done;
    return (
      <div style={{border: `1.5px solid ${line}`, borderRadius: 14, background: '#fff', padding: '12px 16px', marginLeft: 38}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <FacMark size={26} />
          <div style={{fontFamily: F.mono, fontSize: 18.5, fontWeight: 700, color: ink}}>{e.name}</div>
          <div style={{flex: 1}} />
          {done ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 6, fontFamily: F.zh, fontSize: 17, fontWeight: 700, color: '#23824F'}}>
              <Icon name="check" size={18} color="#23824F" sw={3} />
              {e.doneText ?? '已受理'}
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.zh, fontSize: 17, color: mute}}>
              <div style={{width: 16, height: 16, borderRadius: 99, border: `2.5px solid ${line}`, borderTopColor: B.teal, transform: `rotate(${t * 400}deg)`}} />
              {e.runText ?? '调用中'}
            </div>
          )}
        </div>
        {e.args && <div style={{marginTop: 9, fontFamily: F.mono, fontSize: 16.5, color: mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{e.args}</div>}
      </div>
    );
  }
  if (e.kind === 'ask') {
    return (
      <div style={{border: `2px solid #F2C58F`, background: '#FFF8EE', borderRadius: 14, padding: '12px 18px', marginLeft: 38}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.zh, fontSize: 17, fontWeight: 800, color: '#B4610E'}}>
          <Whale size={22} color="#B4610E" />
          {e.who} 提问
        </div>
        <div style={{marginTop: 4, fontFamily: F.zh, fontSize: CHAT_FONT, lineHeight: 1.55, color: ink}}>{e.text}</div>
      </div>
    );
  }
  if (e.kind === 'report') {
    return (
      <div style={{border: `2px solid #BFE9E3`, background: '#F3FBF9', borderRadius: 14, padding: '12px 18px 10px', marginLeft: 38}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.zh, fontSize: 17, fontWeight: 800, color: '#17786F'}}>
          <Whale size={22} color="#17786F" />
          {e.who} 交付
          <div style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 14, fontWeight: 700, color: '#17786F', background: '#DDF4EF', padding: '2px 8px', borderRadius: 6}}>report_parent · final</div>
        </div>
        <div style={{marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6}}>
          {e.secs.map((s, k) => {
            const hi = s.at !== undefined ? appear(t, s.at, s.at + 1.6, 0.2, 0.4) : 0;
            return (
              <div key={k} style={{display: 'flex', gap: 12, alignItems: 'baseline', height: 32, borderRadius: 8, background: `rgba(245,192,74,${0.35 * hi})`, padding: '0 6px', marginLeft: -6}}>
                <div style={{width: 72, flexShrink: 0, fontFamily: F.zh, fontSize: 17, fontWeight: 800, color: '#17786F'}}>{s.k}</div>
                <div style={{fontFamily: F.zh, fontSize: 18.5, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{s.v}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return <>{e.render(t, w)}</>;
};

export const ChatWin: React.FC<{
  t: number;
  w: number;
  h: number;
  entries: ChatEntry[];
  theme?: 'claude' | 'codex';
  title?: string;
  side?: string[];
  sideActive?: number;
  placeholder?: string;
}> = ({t, w, h, entries, theme = 'claude', title = 'FutureAide 介绍片', side, sideActive = 0, placeholder}) => {
  const isC = theme === 'claude';
  const bg = isC ? C.claudeBg : '#FFFFFF';
  const sideBg = isC ? C.claudeSide : '#F7F7F7';
  const ink = isC ? C.claudeInk : B.cxInk;
  const mute = isC ? C.claudeMuted : B.cxMute;
  const line = isC ? C.claudeLine : B.cxLine;
  const SW = side ? 236 : 0;
  const mainW = w - SW;
  const colW = Math.min(820, mainW - 80);
  const viewTop = 66;
  const inputH = 96;
  const viewH = h - viewTop - inputH - 28;
  // 已出现的条目（me 在 at 时发出；输入框里先打字）
  const shown = entries.filter((e) => t >= e.at);
  let y = 18;
  const placed = shown.map((e) => {
    const hh = entryH(e, colW);
    const p = prog(t, e.at, 0.35, ease.out);
    const top = y;
    y += (hh + 18) * p;
    return {e, top, p};
  });
  const scroll = Math.max(0, y - viewH);
  // 输入框：正在打的那条
  const typing = entries.find((e) => e.kind === 'me' && e.typeFrom !== undefined && t >= e.typeFrom && t < e.at) as Extract<ChatEntry, {kind: 'me'}> | undefined;
  const inputText = typing ? typed(typing.text, t, typing.typeFrom!, typing.cps ?? 14) : '';
  return (
    <div data-probe="skip" style={{position: 'relative', width: w, height: h, background: bg, borderRadius: 18, overflow: 'hidden', boxShadow: shadow.window, border: `1.5px solid ${line}`}}>
      {side && (
        <div style={{position: 'absolute', left: 0, top: 0, width: SW, height: h, background: sideBg, borderRight: `1.5px solid ${line}`}}>
          <div style={{position: 'absolute', left: 22, top: 22}}>
            {isC ? (
              <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
                <Spark size={26} color={C.claudeSpark} />
                <div style={{fontFamily: F.serif, fontSize: 25, fontWeight: 600, color: ink}}>Claude</div>
              </div>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
                <Knot size={24} />
                <div style={{fontFamily: F.ui, fontSize: 23, fontWeight: 700, color: ink}}>Codex</div>
              </div>
            )}
          </div>
          <div style={{position: 'absolute', left: 16, top: 78, width: SW - 32, height: 42, borderRadius: 11, background: isC ? '#fff' : '#EFEFEF', border: `1.5px solid ${line}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box', fontFamily: F.zh, fontSize: 18, fontWeight: 600, color: ink}}>
            <Icon name="plus" size={20} color={ink} />
            {isC ? '新聊天' : '新对话'}
          </div>
          <div style={{position: 'absolute', left: 22, top: 146, fontFamily: F.zh, fontSize: 15, color: mute}}>{isC ? '最近' : '对话'}</div>
          {side.map((s, k) => (
            <div key={k} style={{position: 'absolute', left: 12, top: 172 + k * 40, width: SW - 24, height: 34, borderRadius: 9, background: k === sideActive ? (isC ? '#E8E6DD' : '#E9E9E9') : 'transparent', display: 'flex', alignItems: 'center', padding: '0 12px', boxSizing: 'border-box', fontFamily: F.zh, fontSize: 17, color: ink, whiteSpace: 'nowrap', overflow: 'hidden'}}>
              {s}
            </div>
          ))}
          <div style={{position: 'absolute', left: 18, bottom: 18, display: 'flex', alignItems: 'center', gap: 10}}>
            <div style={{width: 34, height: 34, borderRadius: 99, background: C.coral, color: '#fff', fontFamily: F.zh, fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>咸</div>
            <div style={{fontFamily: F.zh, fontSize: 16, color: ink}}>咸鱼凌生</div>
          </div>
        </div>
      )}
      <div style={{position: 'absolute', left: SW, top: 0, width: mainW, height: h}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 56, borderBottom: `1.5px solid ${line}`, display: 'flex', alignItems: 'center', padding: '0 26px', fontFamily: F.zh, fontSize: 19, fontWeight: 600, color: ink, gap: 8}}>
          {title}
          <Icon name="chevDown" size={18} color={mute} />
          <div style={{flex: 1}} />
          <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.ui, fontSize: 15, color: mute, border: `1.5px solid ${line}`, borderRadius: 99, padding: '4px 12px'}}>
            <FacMark size={18} />
            futureaide
          </div>
        </div>
        <div style={{position: 'absolute', left: (mainW - colW) / 2, top: viewTop, width: colW, height: viewH, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, top: -scroll, width: colW}}>
            {placed.map(({e, top, p}, k) => (
              <div key={k} style={{position: 'absolute', left: 0, top, width: colW, opacity: p, transform: `translateY(${(1 - p) * 18}px)`}}>
                <Entry e={e} t={t} w={colW} theme={theme} />
              </div>
            ))}
          </div>
        </div>
        <div style={{position: 'absolute', left: (mainW - colW) / 2, bottom: 22, width: colW, height: inputH, borderRadius: 20, background: '#fff', border: `1.5px solid ${line}`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', boxSizing: 'border-box', padding: '16px 20px'}}>
          <div style={{fontFamily: F.zh, fontSize: CHAT_FONT, color: inputText ? ink : '#B3B1A9', whiteSpace: 'nowrap', overflow: 'hidden'}}>
            {inputText || placeholder || (isC ? '回复 Claude…' : '向 Codex 提问…')}
            {typing && <span style={{display: 'inline-block', width: 2, height: 22, background: ink, marginLeft: 2, verticalAlign: 'middle', opacity: blink(t)}} />}
          </div>
          <div style={{position: 'absolute', right: 14, bottom: 12, width: 38, height: 38, borderRadius: 11, background: inputText ? (isC ? C.claudeSpark : '#1F1F1F') : '#E9E7E0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name="arrowUp" size={20} color="#fff" sw={2.6} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ───────── DSH 桌面版 ─────────
export type DshLine = {at: number; kind: 'tool' | 'text' | 'think'; tool?: string; text: string};
export type DshSession = {name: string; at?: number; ago?: string};

export const DshWin: React.FC<{t: number; w: number; h: number; sessions: DshSession[]; active?: string; title: string; lines: DshLine[]; fishAt?: number}> = ({
  t,
  w,
  h,
  sessions,
  active,
  title,
  lines,
}) => {
  const SW = 250;
  const shownS = sessions.filter((s) => s.at === undefined || t >= s.at);
  const shownL = lines.filter((l) => t >= l.at);
  let y = 0;
  const placed = shownL.map((l) => {
    const hh = l.kind === 'tool' ? 44 : textH(l.text, w - SW - 90, 19) + 8;
    const p = prog(t, l.at, 0.3, ease.out);
    const top = y;
    y += (hh + 10) * p;
    return {l, top, p};
  });
  const viewH = h - 150;
  const scroll = Math.max(0, y - viewH);
  const lastAt = shownL.length ? shownL[shownL.length - 1].at : -1;
  const working = lines.length > 0 && t >= lines[0].at && t < lines[lines.length - 1].at + 0.6;
  return (
    <div data-probe="skip" style={{position: 'relative', width: w, height: h, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: shadow.window, border: `1.5px solid ${B.dsLine}`}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: SW, height: h, background: '#F7F8FA', borderRight: `1.5px solid ${B.dsLine}`}}>
        <div style={{position: 'absolute', left: 20, top: 24}}>
          <DsLogo size={21} />
        </div>
        <div style={{position: 'absolute', left: 16, top: 72, width: SW - 32, height: 42, borderRadius: 12, background: '#fff', border: `1.5px solid ${B.dsLine}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F.zh, fontSize: 17, color: B.dsInk}}>
          <Icon name="plus" size={18} color={B.dsInk} />
          新会话
        </div>
        {[
          ['plug', '插件'],
          ['clock', '自动化任务'],
          ['layers', '更多'],
        ].map(([ic, lb], k) => (
          <div key={k} style={{position: 'absolute', left: 24, top: 134 + k * 40, display: 'flex', alignItems: 'center', gap: 12, fontFamily: F.zh, fontSize: 17, color: B.dsInk}}>
            <Icon name={ic} size={19} color={B.dsInk} />
            {lb}
          </div>
        ))}
        <div style={{position: 'absolute', left: 24, top: 268, fontFamily: F.zh, fontSize: 15, color: B.dsMute}}>工作区</div>
        {shownS.map((s, k) => {
          const isNew = s.at !== undefined;
          const p = isNew ? prog(t, s.at!, 0.35, ease.out) : 1;
          const act = s.name === active;
          return (
            <div
              key={s.name}
              style={{
                position: 'absolute',
                left: 12,
                top: 294 + k * 40,
                width: SW - 24,
                height: 34,
                borderRadius: 9,
                background: act ? B.dsSoft : 'transparent',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                boxSizing: 'border-box',
                fontFamily: F.zh,
                fontSize: 16.5,
                color: act ? B.ds : B.dsInk,
                fontWeight: act ? 700 : 400,
                opacity: p,
                transform: `translateX(${(1 - p) * -30}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{overflow: 'hidden', textOverflow: 'ellipsis', flex: 1}}>{s.name}</div>
              <div style={{fontSize: 13, color: B.dsMute, marginLeft: 8}}>{s.ago ?? '刚刚'}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: SW, top: 0, width: w - SW, height: h}}>
        <div style={{position: 'absolute', left: 30, top: 20, display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{fontFamily: F.zh, fontSize: 20, fontWeight: 600, color: B.dsInk}}>{title}</div>
          <div style={{fontFamily: F.zh, fontSize: 14, color: B.dsMute, border: `1.5px solid ${B.dsLine}`, borderRadius: 99, padding: '3px 10px'}}>标准模式</div>
        </div>
        <div style={{position: 'absolute', left: 30, top: 62, display: 'flex', gap: 34, fontFamily: F.zh, fontSize: 17}}>
          <div style={{color: B.ds, fontWeight: 700, borderBottom: `3px solid ${B.ds}`, paddingBottom: 8}}>对话</div>
          <div style={{color: B.dsMute}}>轨迹</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 100, height: 1.5, background: B.dsLine}} />
        <div style={{position: 'absolute', left: 30, top: 120, width: w - SW - 60, height: viewH - 10, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, top: -scroll, width: '100%'}}>
            {placed.map(({l, top, p}, k) => (
              <div key={k} style={{position: 'absolute', left: 0, top, width: '100%', opacity: p}}>
                {l.kind === 'tool' ? (
                  <div style={{display: 'inline-flex', alignItems: 'center', gap: 10, height: 38, borderRadius: 10, background: '#F5F6F8', border: `1.5px solid ${B.dsLine}`, padding: '0 14px'}}>
                    {l.at === lastAt && working ? (
                      <div style={{width: 15, height: 15, borderRadius: 99, border: `2.5px solid #D6DAE3`, borderTopColor: B.ds, transform: `rotate(${t * 420}deg)`}} />
                    ) : (
                      <Icon name="check" size={16} color="#23824F" sw={3} />
                    )}
                    <div style={{fontFamily: F.mono, fontSize: 15.5, fontWeight: 700, color: B.dsInk}}>{l.tool}</div>
                    <div style={{fontFamily: F.zh, fontSize: 16, color: B.dsMute, whiteSpace: 'nowrap'}}>{l.text}</div>
                  </div>
                ) : (
                  <div style={{fontFamily: F.zh, fontSize: 19, lineHeight: 1.55, color: l.kind === 'think' ? B.dsMute : B.dsInk, fontStyle: l.kind === 'think' ? 'italic' : undefined}}>{l.text}</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={{position: 'absolute', left: 30, right: 30, bottom: 22, height: 64, borderRadius: 16, border: `1.5px solid ${B.dsLine}`, display: 'flex', alignItems: 'center', padding: '0 18px', fontFamily: F.zh, fontSize: 17, color: '#B6BAC2'}}>
          {working ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 10, color: B.ds}}>
              <Whale size={22} />
              大肥鱼干活中{'.'.repeat(1 + (Math.floor(t * 3) % 3))}
            </div>
          ) : (
            '给 DeepSeek 发送消息'
          )}
        </div>
      </div>
    </div>
  );
};

// ───────── 团队表（futureaide_list_agents） ─────────
export type TeamRow = {name: string; depth?: number; st: St | {at: number; st: St}[]; model?: string; task?: string; act?: string; files?: string; at?: number};
const stAt = (st: TeamRow['st'], t: number): St => {
  if (typeof st === 'string') return st;
  let cur = st[0].st;
  for (const s of st) if (t >= s.at) cur = s.st;
  return cur;
};
export const TeamTable: React.FC<{t: number; rows: TeamRow[]; w: number; title?: string; cols?: {model?: boolean; act?: boolean}}> = ({t, rows, w, title = 'futureaide_list_agents', cols = {model: true, act: false}}) => {
  const head = ['名字', '状态', cols.model ? '模型' : '', '任务', cols.act ? '正在' : '', '改动'].filter(Boolean);
  const widths = {name: 260, st: 150, model: cols.model ? 250 : 0, act: cols.act ? 170 : 0, files: 110};
  const taskW = w - 48 - widths.name - widths.st - widths.model - widths.act - widths.files;
  return (
    <div data-probe="skip" style={{width: w, background: '#fff', borderRadius: 22, border: `2px solid ${C.line}`, boxShadow: shadow.card, overflow: 'hidden'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: '#F6F7F9', borderBottom: `1.5px solid ${C.line}`}}>
        <FacMark size={30} />
        <div style={{fontFamily: F.mono, fontSize: 19, fontWeight: 700, color: C.ink}}>{title}</div>
        <div style={{marginLeft: 'auto', fontFamily: F.zh, fontSize: 17, color: C.muted}}>{rows.filter((r) => r.at === undefined || t >= r.at).length} 位助手</div>
      </div>
      <div style={{display: 'flex', padding: '10px 24px', fontFamily: F.zh, fontSize: 16, fontWeight: 700, color: C.muted, borderBottom: `1.5px solid ${C.line}`}}>
        <div style={{width: widths.name}}>{head[0]}</div>
        <div style={{width: widths.st}}>状态</div>
        {cols.model && <div style={{width: widths.model}}>模型</div>}
        <div style={{width: taskW}}>任务</div>
        {cols.act && <div style={{width: widths.act}}>正在</div>}
        <div style={{width: widths.files, textAlign: 'right'}}>改动</div>
      </div>
      {rows.map((r, k) => {
        const vis = r.at === undefined ? 1 : prog(t, r.at, 0.35, ease.out);
        if (vis <= 0) return null;
        const st = stAt(r.st, t);
        const dim = st === 'cancel';
        return (
          <div key={k} style={{display: 'flex', alignItems: 'center', height: 58, padding: '0 24px', borderBottom: k < rows.length - 1 ? `1.5px solid ${C.line}` : undefined, opacity: vis * (dim ? 0.55 : 1), transform: `translateY(${(1 - vis) * 14}px)`}}>
            <div style={{width: widths.name, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: (r.depth ?? 0) * 30, boxSizing: 'border-box'}}>
              {(r.depth ?? 0) > 0 && <div style={{width: 16, height: 16, borderLeft: `2.5px solid ${C.muted}`, borderBottom: `2.5px solid ${C.muted}`, borderBottomLeftRadius: 4, marginTop: -10}} />}
              <div style={{fontFamily: F.zh, fontSize: 20, fontWeight: 800, color: C.ink, whiteSpace: 'nowrap', textDecoration: dim ? 'line-through' : undefined}}>{r.name}</div>
            </div>
            <div style={{width: widths.st}}>
              <Pill st={st} t={t} size={16} />
            </div>
            {cols.model && <div style={{width: widths.model, fontFamily: F.mono, fontSize: 16, color: C.ink2, whiteSpace: 'nowrap'}}>{r.model}</div>}
            <div style={{width: taskW, fontFamily: F.zh, fontSize: 18, color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16, boxSizing: 'border-box'}}>{r.task}</div>
            {cols.act && <div style={{width: widths.act, fontFamily: F.mono, fontSize: 15.5, color: C.muted, whiteSpace: 'nowrap'}}>{st === 'run' ? r.act : ''}</div>}
            <div style={{width: widths.files, textAlign: 'right', fontFamily: F.ui, fontSize: 18, fontWeight: 700, color: C.ink}}>{r.files ?? '—'}</div>
          </div>
        );
      })}
    </div>
  );
};

// ───────── PowerShell（Windows Terminal 样式） ─────────
export type TermLine = {at: number; cmd?: string; out?: string; tone?: 'ok' | 'mute' | 'warn' | 'plain'; cps?: number; prompt?: string};
export const Term: React.FC<{t: number; w: number; h: number; lines: TermLine[]; cwd?: string}> = ({t, w, h, lines, cwd = 'D:\\'}) => {
  const shown = lines.filter((l) => t >= l.at);
  const LH = 44;
  const viewH = h - 66;
  const scroll = Math.max(0, shown.length * LH - viewH + 20);
  return (
    <div data-probe="skip" style={{position: 'relative', width: w, height: h, background: '#0C0C0C', borderRadius: 16, overflow: 'hidden', boxShadow: shadow.window, border: '1.5px solid #2B2B2B'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 46, background: '#1F1F1F', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, background: '#0C0C0C', height: 36, marginTop: 10, borderRadius: '8px 8px 0 0', padding: '0 16px', fontFamily: F.ui, fontSize: 15, color: '#E6E6E6'}}>
          <div style={{width: 18, height: 18, borderRadius: 4, background: '#2A5BD7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 12, fontWeight: 800, color: '#fff'}}>&gt;</div>
          PowerShell
        </div>
      </div>
      <div style={{position: 'absolute', left: 22, top: 62, right: 22, height: viewH, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: -scroll, right: 0}}>
          {shown.map((l, k) => {
            const isLast = k === shown.length - 1;
            if (l.cmd !== undefined) {
              const txt = typed(l.cmd, t, l.at, l.cps ?? 30);
              const done = txt.length >= l.cmd.length;
              return (
                <div key={k} style={{height: LH, fontFamily: F.mono, fontSize: 24, color: '#CCCCCC', whiteSpace: 'nowrap'}}>
                  <span style={{color: '#9CDCFE'}}>PS {l.prompt ?? cwd}&gt;</span> <span style={{color: '#F2F2F2'}}>{txt}</span>
                  {isLast && <span style={{display: 'inline-block', width: 13, height: 26, background: '#CCCCCC', marginLeft: 2, verticalAlign: 'middle', opacity: done ? blink(t) : 1}} />}
                </div>
              );
            }
            const col = l.tone === 'ok' ? '#6CD38B' : l.tone === 'mute' ? '#8A8A8A' : l.tone === 'warn' ? '#F2C14E' : '#CCCCCC';
            return (
              <div key={k} style={{height: LH, fontFamily: F.mono, fontSize: 23, color: col, whiteSpace: 'nowrap', opacity: prog(t, l.at, 0.15)}}>
                {l.out}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ───────── 小工具 ─────────
/** 从 a 到 b 的手绘箭头（舞台坐标），按 p 画出来 */
export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; color?: string; w?: number; bend?: number; dash?: boolean}> = ({x1, y1, x2, y2, p, color = C.ink, w = 5, bend = 0.15, dash}) => {
  if (p <= 0) return null;
  const mx = (x1 + x2) / 2 - (y2 - y1) * bend;
  const my = (y1 + y2) / 2 + (x2 - x1) * bend;
  const len = Math.hypot(x2 - x1, y2 - y1) * 1.15;
  // 箭头尖的方向取曲线末端切线
  const ang = Math.atan2(y2 - my, x2 - mx);
  const hs = 18;
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}} width={1} height={1}>
      <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dash ? `2 ${w * 2.4}` : `${len} ${len}`} strokeDashoffset={dash ? 0 : len * (1 - p)} opacity={dash ? clamp(p * 1.5) : 1} />
      {p > 0.92 && (
        <path
          d={`M ${x2 - hs * Math.cos(ang - 0.45)} ${y2 - hs * Math.sin(ang - 0.45)} L ${x2} ${y2} L ${x2 - hs * Math.cos(ang + 0.45)} ${y2 - hs * Math.sin(ang + 0.45)}`}
          fill="none"
          stroke={color}
          strokeWidth={w}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={clamp((p - 0.92) / 0.08)}
        />
      )}
    </svg>
  );
};

/** 章节标题牌（左上角的小标签） */
export const ChapterTag: React.FC<{t: number; t0: number; t1?: number; icon: string; text: string}> = ({t, t0, t1 = Infinity, icon, text}) => {
  const vis = appear(t, t0, t1, 0.4, 0.3);
  if (vis <= 0) return null;
  const sp = spring(t - t0, 200, 16);
  return (
    <div style={{position: 'absolute', left: 60, top: 40, display: 'flex', alignItems: 'center', gap: 14, opacity: vis, transform: `translateX(${(1 - sp) * -40}px)`, zIndex: 20}}>
      <div style={{width: 50, height: 50, borderRadius: 15, background: C.coral, border: `3.5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 0 rgba(35,40,66,0.15)'}}>
        <Icon name={icon} size={26} color="#fff" sw={2.6} />
      </div>
      <div style={{fontFamily: F.smiley, fontSize: 42, color: C.ink, whiteSpace: 'nowrap'}}>{text}</div>
    </div>
  );
};

/** 大字标题（得意黑） */
export const BigTitle: React.FC<{text: string; size?: number; color?: string; vis?: number; style?: React.CSSProperties}> = ({text, size = 90, color = C.ink, vis = 1, style}) => (
  <div style={{fontFamily: F.smiley, fontSize: size, color, whiteSpace: 'nowrap', lineHeight: 1.1, opacity: vis, ...style}}>{text}</div>
);

export const lerpC = lerp;
