// 安卓手机和 Google Play 的示意界面。屏幕坐标 440×940（逻辑像素），镜头和舞台坐标见 phone.ts
import React from 'react';
import {clamp, ease, lerp, prog, spring, typed} from '../lib/anim';
import {F} from '../lib/theme';
import {tr} from '../lib/time';
import {Icon} from './icons';
import {GptIcon, ClaudeIcon, McMark, PlayMark} from './apps';

export const SW = 440;
export const SH = 940;
export const BEZ = 13;
export const PW = SW + BEZ * 2;
export const PH = SH + BEZ * 2;

export const A = {
  bg: '#FFFFFF',
  surf: '#F3F6FB',
  surf2: '#E9EEF6',
  ink: '#1F1F1F',
  ink2: '#444746',
  muted: '#747775',
  line: '#E1E3E1',
  blue: '#0B57D0',
  blueSoft: '#D3E3FD',
  green: '#01875F',
  greenSoft: '#E6F4EA',
  red: '#B3261E',
};
export const UI = F.ui;

const abs = (x: number, y: number, w?: number, h?: number): React.CSSProperties => ({position: 'absolute', left: x, top: y, width: w, height: h});

// ───────── 机身 ─────────
export const StatusBar: React.FC<{dark?: boolean; vpn?: number}> = ({dark, vpn = 0}) => {
  const c = dark ? '#fff' : A.ink;
  return (
    <div style={{...abs(0, 0, SW, 36), pointerEvents: 'none'}}>
      <div style={{...abs(30, 9), fontFamily: UI, fontWeight: 600, fontSize: 15, color: c, letterSpacing: 0.2}}>10:24</div>
      {vpn > 0 && (
        <div style={{...abs(80, 10, 26, 16), opacity: vpn}}>
          <svg width="26" height="16" viewBox="0 0 26 16">
            <circle cx="6" cy="8" r="4.2" fill="none" stroke={c} strokeWidth="2" />
            <path d="M10 8 H22 M18 8 V12 M22 8 V11" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      )}
      <div style={{...abs(SW - 112, 11), display: 'flex', alignItems: 'center', gap: 7}}>
        <svg width="16" height="14" viewBox="0 0 16 14">
          <path d="M1 13 L15 13 L15 1 Z" fill={c} />
        </svg>
        <svg width="18" height="14" viewBox="0 0 18 14">
          <path d="M9 13 L1 4.5 Q9 -2 17 4.5 Z" fill={c} />
        </svg>
        <div style={{width: 24, height: 13, borderRadius: 3.5, border: `1.8px solid ${c}`, boxSizing: 'border-box', padding: 1.5}}>
          <div style={{width: '72%', height: '100%', borderRadius: 1.5, background: c}} />
        </div>
      </div>
    </div>
  );
};

/** 手机外壳。x、y 是舞台坐标（左上角），s 是缩放。children 画在 440×940 的屏幕里 */
export const Phone: React.FC<{x: number; y: number; s?: number; children: React.ReactNode; dark?: boolean; vpn?: number; style?: React.CSSProperties}> = ({
  x,
  y,
  s = 1,
  children,
  dark,
  vpn,
  style,
}) => (
  <div style={{...abs(x, y, PW, PH), transform: `scale(${s})`, transformOrigin: '0 0', ...style}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 64,
        background: 'linear-gradient(150deg, #474C61 0%, #1B1E29 38%, #12141B 100%)',
        boxShadow: '0 2px 0 rgba(35,40,66,0.05), 0 24px 50px rgba(35,40,66,0.22), 0 60px 120px rgba(35,40,66,0.20)',
      }}
    />
    <div style={{position: 'absolute', inset: 3, borderRadius: 61, background: '#0B0D12'}} />
    <div style={{...abs(PW - 2, 230, 5, 74), borderRadius: 3, background: '#30354A'}} />
    <div style={{...abs(PW - 2, 330, 5, 130), borderRadius: 3, background: '#30354A'}} />
    <div style={{...abs(BEZ, BEZ, SW, SH), borderRadius: 50, overflow: 'hidden', background: '#fff'}}>
      {children}
      <StatusBar dark={dark} vpn={vpn} />
      <div style={{...abs(SW / 2 - 8, 11, 16, 16), borderRadius: 8, background: '#07080B', boxShadow: 'inset 0 0 0 3px #1A1D26'}} />
      <div style={{...abs(SW / 2 - 56, SH - 13, 112, 5), borderRadius: 3, background: dark ? 'rgba(255,255,255,0.8)' : 'rgba(31,31,31,0.75)'}} />
    </div>
  </div>
);

// ───────── 页面切换 ─────────
export type Pg = {at: number; el: React.ReactNode; mode?: 'push' | 'back' | 'fade' | 'none' | 'up'};
const Layer: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: SW, height: SH, background: '#fff', ...style}}>{children}</div>
);

export const Stack: React.FC<{t: number; pages: Pg[]}> = ({t, pages}) => {
  let i = 0;
  for (let k = 0; k < pages.length; k++) if (t >= pages[k].at) i = k;
  const cur = pages[i];
  const prev = i > 0 ? pages[i - 1] : null;
  const mode = cur.mode ?? 'push';
  const p = prev ? ease.out(clamp((t - cur.at) / 0.4)) : 1;
  if (!prev || p >= 1 || mode === 'none') return <Layer>{cur.el}</Layer>;
  if (mode === 'fade')
    return (
      <>
        <Layer>{prev.el}</Layer>
        <Layer style={{opacity: p}}>{cur.el}</Layer>
      </>
    );
  if (mode === 'up')
    return (
      <>
        <Layer>{prev.el}</Layer>
        <Layer style={{transform: `translateY(${(1 - p) * SH * 0.12}px)`, opacity: p}}>{cur.el}</Layer>
      </>
    );
  if (mode === 'back')
    return (
      <>
        <Layer style={{transform: `translateX(${-(1 - p) * SW * 0.22}px)`}}>{cur.el}</Layer>
        <Layer style={{transform: `translateX(${p * SW}px)`, boxShadow: '-12px 0 30px rgba(0,0,0,0.12)'}}>{prev.el}</Layer>
      </>
    );
  return (
    <>
      <Layer style={{transform: `translateX(${-p * SW * 0.22}px)`}}>{prev.el}</Layer>
      <Layer style={{transform: `translateX(${(1 - p) * SW}px)`, boxShadow: '-12px 0 30px rgba(0,0,0,0.12)'}}>{cur.el}</Layer>
    </>
  );
};

// ───────── 手指点按 ─────────
export type Tap = {at: number; x: number; y: number; silent?: boolean};
export const Touches: React.FC<{t: number; taps: Tap[]}> = ({t, taps}) => (
  <>
    {taps.map((k, i) => {
      const d = t - k.at;
      if (d < -0.32 || d > 0.6) return null;
      const show = d < 0 ? clamp((d + 0.32) / 0.2) : 1 - clamp((d - 0.22) / 0.2);
      const press = d > -0.06 && d < 0.12 ? 0.82 : 1;
      const rp = clamp(d / 0.5);
      return (
        <div key={i} style={{...abs(k.x, k.y, 0, 0), pointerEvents: 'none'}}>
          {d >= 0 && (
            <div
              style={{
                position: 'absolute',
                left: -lerp(14, 46, ease.out(rp)),
                top: -lerp(14, 46, ease.out(rp)),
                width: lerp(28, 92, ease.out(rp)),
                height: lerp(28, 92, ease.out(rp)),
                borderRadius: '50%',
                border: `${3.5 * (1 - rp) + 0.5}px solid #E5683F`,
                background: `rgba(229,104,63,${0.16 * (1 - rp)})`,
                opacity: 1 - rp,
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              left: -21,
              top: -21,
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'rgba(35,40,66,0.30)',
              border: '2.5px solid rgba(255,255,255,0.9)',
              boxShadow: '0 4px 10px rgba(35,40,66,0.3)',
              opacity: show,
              transform: `scale(${press * (0.8 + 0.2 * show)})`,
            }}
          />
        </div>
      );
    })}
  </>
);
export const tapSfx = (taps: Tap[], vol = 0.32) => taps.filter((k) => !k.silent).map((k) => ({at: k.at, k: 'tap' as const, vol}));

// ───────── 通用控件 ─────────
export const AppBar: React.FC<{title: string; close?: boolean; right?: React.ReactNode; size?: number}> = ({title, close, right, size = 23}) => (
  <div style={{...abs(0, 36, SW, 64)}}>
    <div style={{...abs(20, 18)}}>
      <Icon name={close ? 'x' : 'arrowLeft'} size={26} color={A.ink} sw={2.2} />
    </div>
    <div style={{...abs(66, 17), fontFamily: UI, fontWeight: 500, fontSize: size, color: A.ink, whiteSpace: 'nowrap'}}>{title}</div>
    {right && <div style={{...abs(SW - 60, 18)}}>{right}</div>}
  </div>
);

export const Avatar: React.FC<{size?: number; color?: string; text?: string}> = ({size = 36, color = '#7B61FF', text = 'X'}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      color: '#fff',
      fontFamily: UI,
      fontWeight: 600,
      fontSize: size * 0.46,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {text}
  </div>
);

/** 输入框：t0 开始打字（cps 每秒字数），focus 是聚焦时段 */
export const Field: React.FC<{
  x: number;
  y: number;
  w: number;
  label: string;
  value: string;
  t: number;
  t0?: number;
  cps?: number;
  focus?: [number, number];
  disabled?: boolean;
  dropdown?: boolean;
  mono?: boolean;
  right?: React.ReactNode;
}> = ({x, y, w, label, value, t, t0, cps = 14, focus, disabled, dropdown, mono, right}) => {
  const shown = t0 === undefined ? value : typed(value, t, t0, cps);
  const on = focus ? t >= focus[0] && t < focus[1] : false;
  const has = shown.length > 0;
  const caret = on && Math.floor(t * 2.2) % 2 === 0;
  return (
    <div style={{...abs(x, y, w, 56)}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 6,
          border: on ? `2px solid ${A.blue}` : `1.2px solid ${disabled ? '#C4C7C5' : '#8E918F'}`,
          background: disabled ? '#F7F8F8' : '#fff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: has || on ? -9 : 17,
          padding: '0 4px',
          background: has || on ? (disabled ? '#F7F8F8' : '#fff') : 'transparent',
          fontFamily: UI,
          fontSize: has || on ? 12.5 : 16,
          color: on ? A.blue : A.muted,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 16,
          fontFamily: mono ? F.mono : UI,
          fontSize: 17,
          color: disabled ? A.ink2 : A.ink,
          whiteSpace: 'nowrap',
          letterSpacing: mono ? 0.5 : 0.1,
        }}
      >
        {shown}
        {caret && <span style={{display: 'inline-block', width: 2, height: 20, background: A.blue, marginLeft: 1, verticalAlign: -3}} />}
      </div>
      {dropdown && (
        <div style={{position: 'absolute', right: 14, top: 22, width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${A.ink2}`}} />
      )}
      {right && <div style={{position: 'absolute', right: 12, top: 14}}>{right}</div>}
    </div>
  );
};

export const Btn: React.FC<{x: number; y: number; w: number; h?: number; text: React.ReactNode; color?: string; fg?: string; outline?: boolean; press?: number; radius?: number; size?: number}> = ({
  x,
  y,
  w,
  h = 48,
  text,
  color = A.blue,
  fg = '#fff',
  outline,
  press = 0,
  radius = 24,
  size = 17,
}) => (
  <div
    style={{
      ...abs(x, y, w, h),
      borderRadius: radius,
      background: outline ? '#fff' : color,
      border: outline ? `1.3px solid #747775` : 'none',
      color: outline ? color : fg,
      fontFamily: UI,
      fontWeight: 600,
      fontSize: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      transform: `scale(${1 - 0.04 * press})`,
      boxSizing: 'border-box',
    }}
  >
    {text}
  </div>
);

/** 一段时间内按下的程度（给按钮缩一下） */
export const pressAt = (t: number, at: number) => {
  const d = t - at;
  return d > -0.06 && d < 0.16 ? 1 : 0;
};

export const Spinner: React.FC<{t: number; size?: number; color?: string}> = ({t, size = 26, color = '#fff'}) => (
  <svg width={size} height={size} viewBox="0 0 26 26" style={{transform: `rotate(${t * 420}deg)`}}>
    <circle cx="13" cy="13" r="10" fill="none" stroke={color} strokeOpacity={0.3} strokeWidth="3" />
    <path d="M13 3 A10 10 0 0 1 23 13" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Row: React.FC<{y: number; h?: number; icon?: React.ReactNode; title: string; sub?: string; hi?: number; chevron?: boolean; size?: number}> = ({
  y,
  h = 60,
  icon,
  title,
  sub,
  hi = 0,
  chevron,
  size = 18,
}) => (
  <div style={{...abs(0, y, SW, h)}}>
    {hi > 0 && <div style={{position: 'absolute', inset: '2px 8px', borderRadius: 14, background: `rgba(11,87,208,${0.1 * hi})`}} />}
    {icon && <div style={{...abs(26, h / 2 - 13, 26, 26), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{icon}</div>}
    <div style={{...abs(icon ? 72 : 26, sub ? h / 2 - 22 : h / 2 - 12), fontFamily: UI, fontSize: size, color: A.ink, whiteSpace: 'nowrap'}}>{title}</div>
    {sub && <div style={{...abs(icon ? 72 : 26, h / 2 + 3), fontFamily: UI, fontSize: 14, color: A.muted, whiteSpace: 'nowrap'}}>{sub}</div>}
    {chevron && (
      <div style={{...abs(SW - 44, h / 2 - 11)}}>
        <Icon name="arrowRight" size={20} color={A.ink2} sw={2} />
      </div>
    )}
  </div>
);

// ───────── Play 商店：首页 ─────────
export const PLAY_AVATAR = {x: 386, y: 72};
export const PlayHome: React.FC<{avatarHi?: number}> = ({avatarHi = 0}) => {
  const tiles = [
    ['#E8F0FE', '#4285F4', tr('笔记', 'Notes')],
    ['#FCE8E6', '#EA4335', tr('相册', 'Photos')],
    ['#E6F4EA', '#34A853', tr('地图', 'Maps')],
    ['#FEF7E0', '#F9AB00', tr('音乐', 'Music')],
  ];
  return (
    <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
      <div style={{...abs(14, 46, SW - 28, 52), borderRadius: 26, background: A.surf2, display: 'flex', alignItems: 'center'}}>
        <div style={{marginLeft: 18}}>
          <Icon name="search" size={22} color={A.ink2} sw={2.2} />
        </div>
        <div style={{marginLeft: 14, fontFamily: UI, fontSize: 17, color: A.ink2}}>{tr('搜索应用和游戏', 'Search apps & games')}</div>
      </div>
      <div style={{...abs(PLAY_AVATAR.x - 18, PLAY_AVATAR.y - 18), borderRadius: 30, boxShadow: avatarHi ? `0 0 0 ${4 * avatarHi}px rgba(11,87,208,0.25)` : 'none'}}>
        <Avatar size={36} />
      </div>
      <div style={{...abs(14, 114), display: 'flex', gap: 8}}>
        {[tr('为你推荐', 'For you'), tr('排行榜', 'Top charts'), tr('儿童', 'Kids'), tr('类别', 'Categories')].map((c, k) => (
          <div
            key={k}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              border: k ? '1.2px solid #C4C7C5' : 'none',
              background: k ? '#fff' : A.blueSoft,
              fontFamily: UI,
              fontSize: 14.5,
              fontWeight: 500,
              color: k ? A.ink2 : '#041E49',
              whiteSpace: 'nowrap',
            }}
          >
            {c}
          </div>
        ))}
      </div>
      <div style={{...abs(20, 174), fontFamily: UI, fontWeight: 600, fontSize: 19, color: A.ink}}>{tr('为你推荐', 'Recommended for you')}</div>
      <div style={{...abs(20, 214), display: 'flex', gap: 14}}>
        {tiles.map(([bg, fg, name], k) => (
          <div key={k} style={{width: 88}}>
            <div style={{width: 88, height: 88, borderRadius: 22, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{width: 40, height: 40, borderRadius: k % 2 ? 20 : 10, background: fg, opacity: 0.85}} />
            </div>
            <div style={{fontFamily: UI, fontSize: 13.5, color: A.ink, marginTop: 8}}>{name}</div>
            <div style={{fontFamily: UI, fontSize: 12, color: A.muted}}>4.{6 + (k % 3)} ★</div>
          </div>
        ))}
      </div>
      <div style={{...abs(20, 384), fontFamily: UI, fontWeight: 600, fontSize: 19, color: A.ink}}>{tr('热门应用', 'Popular apps')}</div>
      {[0, 1, 2, 3, 4].map((k) => (
        <div key={k} style={{...abs(20, 428 + k * 76, SW - 40, 64), display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 56, height: 56, borderRadius: 14, background: ['#E8F0FE', '#FCE8E6', '#E6F4EA', '#FEF7E0', '#F3E8FD'][k]}} />
          <div style={{flex: 1}}>
            <div style={{width: [150, 120, 170, 110, 140][k], height: 13, borderRadius: 7, background: '#DADCE0'}} />
            <div style={{width: [90, 70, 100, 80, 60][k], height: 10, borderRadius: 5, background: '#ECEDEF', marginTop: 9}} />
          </div>
        </div>
      ))}
      <div style={{...abs(0, SH - 86, SW, 86), background: A.surf, borderTop: '1px solid #E8EAED', display: 'flex', justifyContent: 'space-around', paddingTop: 12}}>
        {[
          ['shapes', tr('游戏', 'Games')],
          ['layers', tr('应用', 'Apps')],
          ['search', tr('搜索', 'Search')],
          ['bookOpen', tr('图书', 'Books')],
        ].map(([ic, label], k) => (
          <div key={k} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
            <div style={{width: 58, height: 30, borderRadius: 15, background: k === 1 ? A.blueSoft : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Icon name={ic} size={21} color={k === 1 ? '#041E49' : A.ink2} sw={2} />
            </div>
            <div style={{fontFamily: UI, fontSize: 12.5, fontWeight: k === 1 ? 700 : 500, color: A.ink}}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────── Play 商店：头像菜单 ─────────
export const MENU_Y = (k: number) => 236 + 54 * k + 27;
export const PlayMenu: React.FC<{hi?: number; hiK?: number}> = ({hi = 0, hiK = 2}) => {
  const items: [string, string][] = [
    ['layers', tr('管理应用和设备', 'Manage apps & device')],
    ['bell', tr('通知和优惠', 'Notifications & offers')],
    ['card', tr('付款和订阅', 'Payments & subscriptions')],
    ['shieldCheck', tr('Play 保护机制', 'Play Protect')],
    ['bookOpen', tr('媒体库', 'Library')],
    ['sparkles', 'Play Pass'],
    ['chart', tr('Play 积分', 'Play Points')],
    ['settings', tr('设置', 'Settings')],
    ['help', tr('帮助与反馈', 'Help & feedback')],
  ];
  return (
    <div style={{position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)'}}>
      <div style={{...abs(10, 44, SW - 20, 790), borderRadius: 28, background: '#F0F4F9', overflow: 'hidden'}}>
        <div style={{...abs(22, 20)}}>
          <Icon name="x" size={24} color={A.ink2} sw={2.2} />
        </div>
        <div style={{...abs(0, 18, SW - 20), textAlign: 'center', fontFamily: UI, fontWeight: 500, fontSize: 21, color: A.ink2, letterSpacing: 0.2}}>Google</div>
        <div style={{...abs(22, 70, SW - 64, 120), borderRadius: 22, background: '#fff'}}>
          <div style={{...abs(16, 18)}}>
            <Avatar size={44} />
          </div>
          <div style={{...abs(74, 16), fontFamily: UI, fontWeight: 600, fontSize: 18, color: A.ink}}>Xiao Yu</div>
          <div style={{...abs(74, 42), fontFamily: UI, fontSize: 14.5, color: A.ink2}}>yourname@gmail.com</div>
          <div style={{...abs(74, 72, 230, 34), borderRadius: 17, border: '1.2px solid #747775', fontFamily: UI, fontSize: 14, fontWeight: 500, color: A.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {tr('管理您的 Google 账号', 'Manage your Google Account')}
          </div>
        </div>
        {items.map(([ic, label], k) => {
          const on = k === hiK ? hi : 0;
          return (
            <div key={k} style={{...abs(10, 236 + 54 * k - 44, SW - 40, 54)}}>
              {on > 0 && <div style={{position: 'absolute', inset: '3px 0', borderRadius: 14, background: `rgba(11,87,208,${0.12 * on})`}} />}
              <div style={{...abs(18, 15)}}>
                <Icon name={ic} size={23} color={A.ink2} sw={2} />
              </div>
              <div style={{...abs(62, 15), fontFamily: UI, fontSize: 17.5, color: A.ink, whiteSpace: 'nowrap'}}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ───────── Play 商店：付款和订阅 ─────────
export const PAYSUB_Y = (k: number) => 112 + 72 * k + 36;
export const PlayPaySubs: React.FC<{hi?: number; hiK?: number}> = ({hi = 0, hiK = 0}) => {
  const items: [string, string, string][] = [
    ['card', tr('付款方式', 'Payment methods'), tr('添加和管理付款方式', 'Add and manage payment methods')],
    ['refresh', tr('订阅', 'Subscriptions'), tr('管理您的订阅', 'Manage your subscriptions')],
    ['chart', tr('预算和记录', 'Budget & history'), tr('查看购买记录、设置预算', 'See purchases, set a budget')],
    ['archive', tr('兑换代码', 'Redeem code'), tr('兑换礼品卡或促销代码', 'Gift cards & promo codes')],
  ];
  return (
    <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
      <AppBar title={tr('付款和订阅', 'Payments & subscriptions')} />
      {items.map(([ic, a, b], k) => (
        <Row key={k} y={112 + 72 * k} h={72} icon={<Icon name={ic} size={24} color={A.ink2} sw={2} />} title={a} sub={b} hi={k === hiK ? hi : 0} />
      ))}
    </div>
  );
};

// ───────── Play 商店：付款方式 ─────────
export const PM_ADD_Y = (bound: boolean) => (bound ? 270 : 150) + 30;
export const PlayPayMethods: React.FC<{bound?: number; hi?: number}> = ({bound = 0, hi = 0}) => {
  const b = bound > 0;
  const y0 = b ? 270 : 150;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
      <AppBar title={tr('付款方式', 'Payment methods')} />
      {b && (
        <>
          <div style={{...abs(26, 112), fontFamily: UI, fontWeight: 600, fontSize: 14.5, color: A.blue}}>{tr('付款方式', 'Payment methods')}</div>
          <div style={{...abs(10, 140, SW - 20, 76), borderRadius: 16, background: `rgba(1,135,95,${0.1 * bound})`, opacity: clamp(bound * 2)}}>
            <div style={{...abs(16, 22)}}>
              <McMark h={30} />
            </div>
            <div style={{...abs(80, 14), fontFamily: UI, fontSize: 18, color: A.ink}}>Mastercard-4444</div>
            <div style={{...abs(80, 42), fontFamily: UI, fontSize: 14, color: A.muted}}>{tr('到期日 08/29', 'Expires 08/29')}</div>
          </div>
          <div style={{...abs(20, 234, SW - 40, 1), background: A.line}} />
        </>
      )}
      <div style={{...abs(26, y0 - 38), fontFamily: UI, fontWeight: 600, fontSize: 14.5, color: A.blue}}>{tr('添加付款方式', 'Add payment method')}</div>
      <Row y={y0} icon={<Icon name="card" size={24} color={A.ink2} sw={2} />} title={tr('添加信用卡或借记卡', 'Add credit or debit card')} hi={hi} />
      <Row y={y0 + 60} icon={<div style={{fontFamily: UI, fontWeight: 900, fontStyle: 'italic', fontSize: 15, color: '#003087'}}>P</div>} title={tr('添加 PayPal', 'Add PayPal')} />
      <Row y={y0 + 120} icon={<Icon name="archive" size={24} color={A.ink2} sw={2} />} title={tr('兑换代码', 'Redeem code')} />
      <div style={{...abs(26, y0 + 200), fontFamily: UI, fontWeight: 600, fontSize: 15.5, color: A.blue}}>{tr('更多付款设置', 'More payment settings')}</div>
    </div>
  );
};

// ───────── 添加信用卡或借记卡 ─────────
export const CARD = {num: '5555 5555 5555 4444', exp: '08/29', cvc: '123', name: 'XIAO YU', street: '123 Example Street', city: 'Los Angeles', state: 'CA', zip: '90012'};
export const FORM = {num: 120, exp: 192, name: 264, country: 336, street: 408, city: 480, save: 876};
export type FormTimes = {num: number; exp: number; cvc: number; name: number; street: number; city: number; save: number};
export const AddCardForm: React.FC<{t: number; ft: FormTimes; saving?: number}> = ({t, ft, saving = 0}) => {
  const fx = 20;
  const fw = SW - 40;
  const half = (fw - 12) / 2;
  const showBrand = typed(CARD.num, t, ft.num, 16).length >= 2;
  const f = (a: number, b: number): [number, number] => [a - 0.05, b];
  const doneNum = ft.num + CARD.num.length / 16;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
      <AppBar title={tr('添加信用卡或借记卡', 'Add credit or debit card')} close size={21} />
      <Field x={fx} y={FORM.num} w={fw} label={tr('卡号', 'Card number')} value={CARD.num} t={t} t0={ft.num} cps={16} focus={f(ft.num, ft.exp)} mono right={showBrand ? <McMark h={24} /> : <Icon name="card" size={24} color={A.muted} sw={1.8} />} />
      <Field x={fx} y={FORM.exp} w={half} label="MM/YY" value={CARD.exp} t={t} t0={ft.exp} cps={8} focus={f(ft.exp, ft.cvc)} mono />
      <Field x={fx + half + 12} y={FORM.exp} w={half} label="CVC" value={CARD.cvc} t={t} t0={ft.cvc} cps={7} focus={f(ft.cvc, ft.name)} mono />
      <Field x={fx} y={FORM.name} w={fw} label={tr('持卡人姓名', 'Cardholder name')} value={CARD.name} t={t} t0={ft.name} cps={10} focus={f(ft.name, ft.street)} />
      <Field x={fx} y={FORM.country} w={fw} label={tr('国家/地区', 'Country/region')} value={tr('美国', 'United States')} t={t} disabled dropdown />
      <Field x={fx} y={FORM.street} w={fw} label={tr('街道地址', 'Street address')} value={CARD.street} t={t} t0={ft.street} cps={18} focus={f(ft.street, ft.city)} />
      <Field x={fx} y={FORM.city} w={176} label={tr('城市', 'City')} value={CARD.city} t={t} t0={ft.city} cps={18} focus={f(ft.city, ft.city + 1.4)} />
      <Field x={fx + 188} y={FORM.city} w={80} label={tr('州', 'State')} value={CARD.state} t={t} t0={ft.city + 0.7} cps={8} />
      <Field x={fx + 280} y={FORM.city} w={fw - 280} label={tr('邮编', 'ZIP code')} value={CARD.zip} t={t} t0={ft.city + 1.0} cps={12} />
      <div style={{...abs(26, 556, SW - 52), fontFamily: UI, fontSize: 13, color: A.muted, lineHeight: 1.5}}>
        {tr('您的卡信息由 Google 安全保存，可用于 Google Play 购买。', 'Your card details are saved securely by Google for Google Play purchases.')}
      </div>
      {t > doneNum && t < ft.save + 2 && (
        <div style={{...abs(26, 620), display: 'flex', alignItems: 'center', gap: 8, fontFamily: UI, fontSize: 13.5, color: A.green, opacity: clamp((t - doneNum) / 0.3)}}>
          <Icon name="lock" size={16} color={A.green} sw={2.2} />
          {tr('示例卡号，仅作演示', 'Sample card number for demo only')}
        </div>
      )}
      <Btn x={fx} y={FORM.save - 24} w={fw} text={saving > 0 ? <Spinner t={t} /> : tr('保存', 'Save')} press={pressAt(t, ft.save)} />
    </div>
  );
};

// ───────── 搜索结果 ─────────
export type AppInfo = {name: string; dev: string; icon: 'gpt' | 'claude'};
export const SEARCH_BTN = {x: SW / 2, y: 256};
export const PlaySearch: React.FC<{t: number; q: string; t0: number; app: AppInfo; devHi?: number; state?: 'install' | 'loading' | 'open'; prog?: number}> = ({
  t,
  q,
  t0,
  app,
  devHi = 0,
  state = 'install',
  prog: pr = 0,
}) => {
  const shown = typed(q, t, t0, 9);
  const showRes = t > t0 + q.length / 9 + 0.25;
  const rp = spring(t - (t0 + q.length / 9 + 0.25), 220, 18);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
      <div style={{...abs(14, 46, SW - 28, 52), borderRadius: 26, background: A.surf2, display: 'flex', alignItems: 'center'}}>
        <div style={{marginLeft: 16}}>
          <Icon name="arrowLeft" size={22} color={A.ink2} sw={2.2} />
        </div>
        <div style={{marginLeft: 14, fontFamily: UI, fontSize: 18, color: A.ink}}>
          {shown}
          {!showRes && Math.floor(t * 2.2) % 2 === 0 && <span style={{display: 'inline-block', width: 2, height: 20, background: A.blue, marginLeft: 1, verticalAlign: -3}} />}
        </div>
      </div>
      {showRes && (
        <div style={{opacity: clamp(rp * 1.5), transform: `translateY(${(1 - rp) * 20}px)`}}>
          <div style={{...abs(20, 122)}}>{app.icon === 'gpt' ? <GptIcon size={76} /> : <ClaudeIcon size={76} />}</div>
          <div style={{...abs(112, 124), fontFamily: UI, fontWeight: 600, fontSize: 21, color: A.ink, whiteSpace: 'nowrap'}}>{app.name}</div>
          <div style={{...abs(108, 154), padding: '1px 4px', borderRadius: 6, background: devHi ? `rgba(1,135,95,${0.14 * devHi})` : 'transparent', fontFamily: UI, fontWeight: 600, fontSize: 15.5, color: A.green, whiteSpace: 'nowrap'}}>
            {app.dev}
          </div>
          <div style={{...abs(112, 182), fontFamily: UI, fontSize: 13.5, color: A.ink2, whiteSpace: 'nowrap'}}>{tr('4.8 ★  ·  51 MB  ·  12 岁以上', '4.8 ★  ·  51 MB  ·  Teen')}</div>
          <div style={{...abs(20, SEARCH_BTN.y - 22, SW - 40, 44), borderRadius: 22, background: state === 'loading' ? '#fff' : A.green, border: state === 'loading' ? `1.5px solid ${A.line}` : 'none', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 16.5, color: state === 'loading' ? A.green : '#fff'}}>
            {state === 'loading' && <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pr * 100}%`, background: A.greenSoft}} />}
            <span style={{position: 'relative'}}>{state === 'install' ? tr('安装', 'Install') : state === 'open' ? tr('打开', 'Open') : `${Math.round(pr * 100)}%`}</span>
          </div>
          <div style={{...abs(20, 304), display: 'flex', gap: 12}}>
            {[0, 1, 2].map((k) => (
              <div key={k} style={{width: 124, height: 250, borderRadius: 14, background: ['#F1F3F4', '#E8F0FE', '#F3E8FD'][k], overflow: 'hidden', position: 'relative'}}>
                <div style={{...abs(14, 24, 70, 10), borderRadius: 5, background: 'rgba(0,0,0,0.12)'}} />
                <div style={{...abs(14, 44, 96, 8), borderRadius: 4, background: 'rgba(0,0,0,0.07)'}} />
                <div style={{...abs(14, 200, 96, 30), borderRadius: 15, background: 'rgba(0,0,0,0.08)'}} />
              </div>
            ))}
          </div>
          <div style={{...abs(20, 580), fontFamily: UI, fontWeight: 600, fontSize: 18, color: A.ink}}>{tr('关于此应用', 'About this app')}</div>
          <div style={{...abs(20, 616, SW - 40, 10), borderRadius: 5, background: '#ECEDEF'}} />
          <div style={{...abs(20, 636, 300, 10), borderRadius: 5, background: '#ECEDEF'}} />
        </div>
      )}
    </div>
  );
};

// ───────── Google Play 付款页（从下面弹出来） ─────────
export const SHEET_TOP = 404;
export const SHEET = {plan: SHEET_TOP + 86, price: SHEET_TOP + 160, card: SHEET_TOP + 368, arrow: {x: SW - 46, y: SHEET_TOP + 368}, btn: SHEET_TOP + 470};
export type Product = {title: string; app: string; icon: 'gpt' | 'claude'; price: string};
export const BuySheet: React.FC<{t: number; t0: number; prod: Product; tSub?: number; tOut?: number; hi?: {plan?: number; price?: number; card?: number}}> = ({
  t,
  t0,
  prod,
  tSub = Infinity,
  tOut = Infinity,
}) => {
  const pin = ease.outQuint(clamp((t - t0) / 0.45));
  const pout = ease.in(clamp((t - tOut) / 0.35));
  const y = (1 - pin) * 560 + pout * 560;
  const scrim = clamp((t - t0) / 0.3) * (1 - clamp((t - tOut) / 0.35));
  const loading = t >= tSub && t < tSub + 0.9;
  const done = t >= tSub + 0.9;
  const dp = spring(t - tSub - 0.9, 200, 14);
  if (t < t0) return null;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.36 * scrim})`}} />
      <div style={{...abs(0, SHEET_TOP + y, SW, SH - SHEET_TOP + 40), borderRadius: '28px 28px 0 0', background: '#fff', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)'}}>
        <div style={{...abs(SW / 2 - 18, 10, 36, 4), borderRadius: 2, background: '#C4C7C5'}} />
        <div style={{...abs(24, 26), display: 'flex', alignItems: 'center', gap: 8}}>
          <PlayMark size={20} />
          <div style={{fontFamily: UI, fontWeight: 500, fontSize: 16, color: A.ink2}}>Google Play</div>
        </div>
        {!done ? (
          <>
            <div style={{...abs(24, 66)}}>{prod.icon === 'gpt' ? <GptIcon size={46} /> : <ClaudeIcon size={46} />}</div>
            <div style={{...abs(84, 66), fontFamily: UI, fontWeight: 600, fontSize: 19, color: A.ink, whiteSpace: 'nowrap'}}>{prod.title}</div>
            <div style={{...abs(84, 92), fontFamily: UI, fontSize: 14.5, color: A.muted, whiteSpace: 'nowrap'}}>{prod.app}</div>
            <div style={{...abs(24, 140, SW - 48, 1), background: A.line}} />
            <div style={{...abs(24, 156), fontFamily: UI, fontSize: 16, color: A.ink}}>{tr('开始日期：今天', 'Starting today')}</div>
            <div style={{...abs(24, 156, SW - 48), textAlign: 'right', fontFamily: UI, fontWeight: 600, fontSize: 16.5, color: A.ink}}>{prod.price}</div>
            <div style={{...abs(24, 181, SW - 48), textAlign: 'right', fontFamily: UI, fontSize: 13, color: A.muted}}>{tr('按月续订 · 税费另计', 'Monthly · plus tax')}</div>
            <div style={{...abs(24, 222, SW - 48), fontFamily: UI, fontSize: 13, color: A.muted, lineHeight: 1.55}}>
              <div>{tr('• 您可以随时在 Google Play 的「订阅」中取消', '• Cancel anytime in Subscriptions on Google Play')}</div>
              <div>{tr('• 续订前最多 2 天，可能会先对您的付款方式预授权一笔款项', '• Up to 2 days before renewal, a temporary hold may be placed on your payment method')}</div>
            </div>
            <div style={{...abs(24, 330, SW - 48, 1), background: A.line}} />
            <div style={{...abs(24, 344, SW - 48, 48), display: 'flex', alignItems: 'center', gap: 14}}>
              <McMark h={26} />
              <div style={{fontFamily: UI, fontSize: 16.5, color: A.ink}}>Mastercard-4444</div>
            </div>
            <div style={{...abs(SW - 62, 352)}}>
              <Icon name="arrowRight" size={24} color={A.ink2} sw={2.2} />
            </div>
            <div style={{...abs(24, 406, SW - 48, 1), background: A.line}} />
            <Btn x={24} y={SHEET.btn - SHEET_TOP - 24} w={SW - 48} h={48} color={A.green} text={loading ? <Spinner t={t} /> : tr('订阅', 'Subscribe')} press={pressAt(t, tSub)} />
          </>
        ) : (
          <div style={{opacity: clamp(dp * 2)}}>
            <div style={{...abs(SW / 2 - 44, 100, 88, 88), borderRadius: 44, background: A.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.6 + 0.4 * dp})`}}>
              <Icon name="check" size={52} color={A.green} sw={3.2} />
            </div>
            <div style={{...abs(0, 214, SW), textAlign: 'center', fontFamily: UI, fontWeight: 600, fontSize: 22, color: A.ink}}>{tr('订阅成功', "You're subscribed")}</div>
            <div style={{...abs(0, 252, SW), textAlign: 'center', fontFamily: UI, fontSize: 15.5, color: A.muted}}>{prod.title}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ───────── 订阅列表、管理订阅 ─────────
export const SUBS_ROW_Y = (k: number) => 144 + 88 * k + 44;
export const PlaySubs: React.FC<{items: Product[]; hi?: number; hiK?: number; showK?: number[]}> = ({items, hi = 0, hiK = 0, showK}) => (
  <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
    <AppBar title={tr('订阅', 'Subscriptions')} />
    <div style={{...abs(26, 112), fontFamily: UI, fontWeight: 600, fontSize: 16, color: A.ink}}>{tr('活跃', 'Active')}</div>
    {items.map((p, k) => (
      <div key={k} style={{...abs(10, 144 + 88 * k, SW - 20, 84), opacity: showK ? showK[k] ?? 1 : 1}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 18, background: k === hiK && hi ? `rgba(1,135,95,${0.12 * hi})` : 'transparent'}} />
        <div style={{...abs(16, 18)}}>{p.icon === 'gpt' ? <GptIcon size={46} /> : <ClaudeIcon size={46} />}</div>
        <div style={{...abs(78, 12), fontFamily: UI, fontWeight: 600, fontSize: 17.5, color: A.ink, whiteSpace: 'nowrap'}}>{p.app}</div>
        <div style={{...abs(78, 36), fontFamily: UI, fontSize: 14, color: A.ink2, whiteSpace: 'nowrap'}}>{`${p.title} · ${p.price}`}</div>
        <div style={{...abs(78, 57), fontFamily: UI, fontSize: 13, color: A.muted, whiteSpace: 'nowrap'}}>{tr('将于 12月10日 续订', 'Renews Dec 10')}</div>
        <div style={{...abs(SW - 58, 30)}}>
          <Icon name="arrowRight" size={20} color={A.ink2} sw={2} />
        </div>
      </div>
    ))}
    <div style={{...abs(26, 144 + 88 * items.length + 24), fontFamily: UI, fontWeight: 600, fontSize: 16, color: A.ink}}>{tr('已过期', 'Expired')}</div>
    <div style={{...abs(26, 144 + 88 * items.length + 56), fontFamily: UI, fontSize: 14.5, color: A.muted}}>{tr('没有已过期的订阅', 'No expired subscriptions')}</div>
  </div>
);

export const MANAGE_CANCEL_Y = 800;
export const PlayManage: React.FC<{t: number; prod: Product; tCancel?: number; tDlg?: number; tConfirm?: number}> = ({t, prod, tCancel = Infinity, tDlg = Infinity, tConfirm = Infinity}) => {
  const dlg = clamp((t - tDlg) / 0.3) * (t < tConfirm + 0.6 ? 1 : 1 - clamp((t - tConfirm - 0.6) / 0.3));
  const cancelled = t > tConfirm + 0.6;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
      <AppBar title="" />
      <div style={{...abs(24, 112)}}>{prod.icon === 'gpt' ? <GptIcon size={64} /> : <ClaudeIcon size={64} />}</div>
      <div style={{...abs(104, 116), fontFamily: UI, fontWeight: 600, fontSize: 22, color: A.ink}}>{prod.title}</div>
      <div style={{...abs(104, 148), fontFamily: UI, fontSize: 15, color: A.ink2}}>{prod.app}</div>
      <div style={{...abs(24, 210, SW - 48, 1), background: A.line}} />
      {[
        [tr('价格', 'Price'), prod.price],
        [cancelled ? tr('到期日', 'Ends') : tr('下次付款', 'Next payment'), tr('2026年12月10日', 'Dec 10, 2026')],
        [tr('付款方式', 'Payment method'), 'Mastercard-4444'],
      ].map(([a, b], k) => (
        <div key={k} style={{...abs(24, 228 + k * 64, SW - 48, 60)}}>
          <div style={{fontFamily: UI, fontSize: 14, color: A.muted}}>{a}</div>
          <div style={{fontFamily: UI, fontSize: 17, color: k === 1 && cancelled ? A.red : A.ink, marginTop: 4}}>{b}</div>
        </div>
      ))}
      {cancelled && (
        <div style={{...abs(24, 440, SW - 48), padding: '14px 16px', borderRadius: 14, background: '#FEF7E0', fontFamily: UI, fontSize: 14.5, color: '#5F4500', lineHeight: 1.5, boxSizing: 'border-box'}}>
          {tr('已取消。到期前仍可使用 ChatGPT Plus。', 'Canceled. You can keep using it until Dec 10.')}
        </div>
      )}
      {!cancelled && <Btn x={24} y={MANAGE_CANCEL_Y - 24} w={SW - 48} h={48} outline color={A.blue} text={tr('取消订阅', 'Cancel subscription')} press={pressAt(t, tCancel)} />}
      {dlg > 0 && (
        <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.32 * dlg})`}}>
          <div style={{...abs(34, 330, SW - 68, 250), borderRadius: 28, background: '#F0F4F9', opacity: dlg, transform: `scale(${0.92 + 0.08 * dlg})`}}>
            <div style={{...abs(24, 26), fontFamily: UI, fontSize: 22, color: A.ink}}>{tr('取消订阅？', 'Cancel subscription?')}</div>
            <div style={{...abs(24, 68, SW - 116), fontFamily: UI, fontSize: 15, color: A.ink2, lineHeight: 1.5}}>
              {tr('取消后，你仍可以使用到 2026年12月10日。', "You'll keep access until Dec 10, 2026.")}
            </div>
            <div style={{...abs(SW - 68 - 250, 186, 226), display: 'flex', justifyContent: 'flex-end', gap: 26, fontFamily: UI, fontWeight: 600, fontSize: 16, color: A.blue}}>
              <span>{tr('不用了', 'No thanks')}</span>
              <span style={{padding: '0 6px', borderRadius: 8, background: pressAt(t, tConfirm) ? 'rgba(11,87,208,0.12)' : 'transparent'}}>{tr('取消订阅', 'Cancel')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export const DLG_CONFIRM = {x: SW - 68 - 24 - 36, y: 330 + 196};

// ───────── 通知：银行短信 ─────────
export const SmsBanner: React.FC<{t: number; t0: number; t1: number; amount: string; hi?: number}> = ({t, t0, t1, amount, hi = 0}) => {
  const pin = ease.outQuint(clamp((t - t0) / 0.45));
  const pout = ease.in(clamp((t - t1) / 0.35));
  if (t < t0 || t > t1 + 0.4) return null;
  const y = 44 - (1 - pin) * 200 - pout * 200;
  return (
    <div style={{...abs(10, y, SW - 20, 128), borderRadius: 24, background: '#FDFDFD', boxShadow: '0 10px 30px rgba(0,0,0,0.22)', border: '1px solid #ECEDEF'}}>
      <div style={{...abs(18, 14), display: 'flex', alignItems: 'center', gap: 8}}>
        <div style={{width: 22, height: 22, borderRadius: 11, background: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name="chat" size={13} color="#fff" sw={2.6} />
        </div>
        <div style={{fontFamily: UI, fontSize: 13, color: A.ink2}}>{tr('信息 · 现在', 'Messages · now')}</div>
      </div>
      <div style={{...abs(18, 44), fontFamily: UI, fontWeight: 600, fontSize: 15.5, color: A.ink}}>{tr('你的银行', 'Your Bank')}</div>
      <div style={{...abs(18, 68, SW - 56), fontFamily: UI, fontSize: 14.5, color: A.ink2, lineHeight: 1.45}}>
        {tr(`您尾号 4444 的借记卡发生一笔网上消费，金额 ${amount}，`, `Card ending 4444: online purchase ${amount}, `)}
        <span style={{background: hi ? `rgba(245,192,74,${0.65 * hi})` : 'transparent', borderRadius: 4, padding: '0 2px', fontWeight: hi ? 700 : 400, color: A.ink}}>{tr('已冻结', 'on hold')}</span>
        {tr('。', '.')}
      </div>
    </div>
  );
};

/** 屏幕顶部的小提示（Snackbar） */
export const Snack: React.FC<{t: number; t0: number; t1: number; text: string}> = ({t, t0, t1, text}) => {
  const v = clamp((t - t0) / 0.25) * (1 - clamp((t - t1) / 0.25));
  if (v <= 0) return null;
  return (
    <div style={{...abs(20, SH - 120 + (1 - v) * 20, SW - 40, 52), borderRadius: 10, background: '#303030', opacity: v, display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', fontFamily: UI, fontSize: 15.5, color: '#F2F2F2'}}>
      {text}
    </div>
  );
};

export const _unused = [prog];
