import React from 'react';
import {C, F} from '../lib/theme';
import {GoogleG, Icon, Spark} from './icons';

// Claude 网页（按 2026-11-07 录屏还原，账号、地址、卡号都是示例）。坐标：网页内容区左上角为原点
export const PW = 1620; // 网页宽
export const PH = 802; // 网页可见高

const serif = F.serif;
const ui = F.ui;
const ink = C.claudeInk;
const mute = C.claudeMuted;

export const Logo: React.FC<{size?: number}> = ({size = 30}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.28}}>
    <Spark size={size * 0.92} color={C.claudeSpark} />
    <div style={{fontFamily: serif, fontSize: size, fontWeight: 500, color: ink, letterSpacing: -0.3}}>Claude</div>
  </div>
);

const Caret: React.FC<{on?: boolean; h?: number}> = ({on, h = 20}) =>
  on ? <span style={{display: 'inline-block', width: 2, height: h, background: ink, marginLeft: 1, verticalAlign: 'middle'}} /> : null;

const BtnDark: React.FC<{w: number; h?: number; children: React.ReactNode; hover?: number; disabled?: boolean; busy?: boolean; style?: React.CSSProperties}> = ({
  w,
  h = 46,
  children,
  hover = 0,
  disabled,
  busy,
  style,
}) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: 10,
      background: disabled ? '#ECEAE3' : hover ? '#3A3936' : ink,
      color: disabled ? '#B5B2A8' : '#fff',
      fontFamily: ui,
      fontWeight: 500,
      fontSize: 16.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {busy ? <div style={{width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff'}} /> : children}
  </div>
);

const BtnSoft: React.FC<{w: number; h?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({w, h = 46, children, style}) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: 10,
      background: '#F2F1EC',
      color: ink,
      fontFamily: ui,
      fontWeight: 500,
      fontSize: 16.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      ...style,
    }}
  >
    {children}
  </div>
);

const Input: React.FC<{w: number; h?: number; value: string; placeholder: string; focus?: boolean; caret?: boolean; center?: boolean; style?: React.CSSProperties}> = ({
  w,
  h = 46,
  value,
  placeholder,
  focus,
  caret,
  center,
  style,
}) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: 10,
      border: focus ? `2px solid ${C.claudeBlue}` : `1px solid #D9D6CC`,
      background: '#fff',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: center ? 'center' : 'flex-start',
      padding: '0 14px',
      fontFamily: ui,
      fontSize: 16.5,
      color: ink,
      boxShadow: focus ? '0 0 0 3px rgba(44,107,214,0.15)' : 'none',
      ...style,
    }}
  >
    {value ? <span>{value}</span> : <span style={{color: '#A3A097'}}>{placeholder}</span>}
    <Caret on={caret} />
  </div>
);

/** 右半边配图（录屏里是一张照片，这里换成示意插画：一摞纸和便签） */
const HeroArt: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => {
  const notes = [
    {l: 0.12, t: 0.12, w: 0.2, h: 0.24, c: '#F7E3C8', r: -4},
    {l: 0.36, t: 0.08, w: 0.22, h: 0.3, c: '#FFFFFF', r: 3},
    {l: 0.62, t: 0.1, w: 0.24, h: 0.22, c: '#F3D6CC', r: -2},
    {l: 0.18, t: 0.42, w: 0.26, h: 0.2, c: '#FFFFFF', r: 2},
    {l: 0.5, t: 0.4, w: 0.18, h: 0.18, c: '#F6EDB8', r: -5},
    {l: 0.72, t: 0.38, w: 0.18, h: 0.26, c: '#FFFFFF', r: 4},
  ];
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(160deg, #E9DCC9 0%, #D9C3A8 55%, #C7A889 100%)'}}>
      {notes.map((n, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: n.l * w,
            top: n.t * h,
            width: n.w * w,
            height: n.h * h,
            background: n.c,
            transform: `rotate(${n.r}deg)`,
            boxShadow: '0 6px 14px rgba(80,50,20,0.18)',
            borderRadius: 3,
            padding: 14,
            boxSizing: 'border-box',
          }}
        >
          {[0.8, 0.6, 0.72, 0.5].map((lw, k) => (
            <div key={k} style={{height: 6, width: `${lw * 100}%`, background: 'rgba(60,40,20,0.16)', borderRadius: 3, marginBottom: 9}} />
          ))}
        </div>
      ))}
      {/* 桌面一角：一摞书和一台笔记本 */}
      <div style={{position: 'absolute', left: 0, bottom: 0, width: w, height: h * 0.3, background: 'linear-gradient(180deg, rgba(120,84,52,0) 0%, rgba(120,84,52,0.35) 100%)'}} />
      {[0, 1, 2, 3].map((k) => (
        <div key={k} style={{position: 'absolute', left: w * 0.08, bottom: h * 0.06 + k * 22, width: w * 0.32, height: 20, borderRadius: 3, background: ['#8F5E3D', '#C99A6B', '#6E7A86', '#D8C4A3'][k]}} />
      ))}
      <div style={{position: 'absolute', left: w * 0.52, bottom: h * 0.07, width: w * 0.36, height: h * 0.2, borderRadius: 10, background: '#B9BCC2', transform: 'skewX(-8deg)'}}>
        <div style={{position: 'absolute', left: '42%', top: '38%'}}>
          <Spark size={30} color="#fff" />
        </div>
      </div>
    </div>
  );
};

// ───────── 登录页 ─────────
export const LOGIN = {
  cardX: 247,
  cardY: 340,
  email: {x: 267, y: 340 + 166, w: 390, h: 46},
  cont: {x: 267, y: 340 + 224, w: 390, h: 46},
};

export const ClaudeLogin: React.FC<{email: string; focus?: boolean; caret?: boolean; contHover?: number; busy?: boolean; mode?: 'login' | 'check'; resendHover?: number}> = ({
  email,
  focus,
  caret,
  contHover,
  busy,
  mode = 'login',
}) => (
  <div style={{position: 'relative', width: PW, height: PH, background: '#fff'}}>
    <div style={{position: 'absolute', left: 110, top: 40}}>
      <Logo size={30} />
    </div>
    <div style={{position: 'absolute', left: 462, top: 190, transform: 'translateX(-50%)', fontFamily: serif, fontSize: 64, fontWeight: 400, color: ink, whiteSpace: 'nowrap', letterSpacing: -1.5}}>
      Question what&apos;s next
    </div>
    <div style={{position: 'absolute', left: 462, top: 284, transform: 'translateX(-50%)', fontFamily: serif, fontSize: 21, color: '#2F2E2A', whiteSpace: 'nowrap'}}>
      Your thinking partner for big ambitions
    </div>
    <div
      style={{
        position: 'absolute',
        left: LOGIN.cardX,
        top: LOGIN.cardY,
        width: 430,
        height: mode === 'login' ? 338 : 330,
        borderRadius: 26,
        border: '1px solid #ECEAE3',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {mode === 'login' ? (
        <>
          <BtnSoft w={390} style={{position: 'absolute', left: 20, top: 22}}>
            <GoogleG size={17} /> Continue with Google
          </BtnSoft>
          <BtnSoft w={390} style={{position: 'absolute', left: 20, top: 80}}>
            <svg width="16" height="18" viewBox="0 0 16 18">
              <path d="M13.2 9.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8C3.7 4.4 2.2 5.3 1.4 6.8-.3 9.7.9 14 2.5 16.3c.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.3-.9-2.3-4.1zM10.9 2.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.6-1.3z" fill="#141413" />
            </svg>
            Continue with Apple
          </BtnSoft>
          <div style={{position: 'absolute', left: 0, top: 138, width: 430, textAlign: 'center', fontFamily: ui, fontSize: 13, color: mute}}>OR</div>
          <Input w={390} value={email} placeholder="Enter your email" focus={focus} caret={caret} style={{position: 'absolute', left: 20, top: 166}} />
          <BtnDark w={390} hover={contHover} busy={busy} style={{position: 'absolute', left: 20, top: 224}}>
            Continue with email
          </BtnDark>
          <div style={{position: 'absolute', left: 30, top: 284, width: 370, textAlign: 'center', fontFamily: ui, fontSize: 12.5, color: mute, lineHeight: 1.5}}>
            By continuing, you acknowledge Anthropic&apos;s <span style={{color: '#2F5DB8'}}>Privacy Policy</span> and agree to get occasional promotional emails and notifications.
          </div>
        </>
      ) : (
        <div style={{position: 'absolute', left: 26, top: 30, width: 378, textAlign: 'center', fontFamily: ui, fontSize: 15, color: '#3D3C38', lineHeight: 1.55}}>
          <div>To continue, click the link sent to</div>
          <div style={{fontWeight: 700, color: ink}}>{email}</div>
          <div style={{marginTop: 14, color: mute}}>
            Not seeing the email in your inbox? <span style={{color: '#2F5DB8'}}>Try sending again.</span>
          </div>
          <div style={{color: mute}}>
            Wrong email? <span style={{color: '#2F5DB8'}}>Change email address</span>
          </div>
          <div style={{marginTop: 16, color: mute, fontSize: 14}}>If the link shows a verification code instead of signing you in, enter it here.</div>
          <Input w={378} h={42} value="" placeholder="Enter verification code" center style={{marginTop: 12}} />
          <BtnDark w={378} h={42} style={{marginTop: 10}}>
            Verify email address
          </BtnDark>
        </div>
      )}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 462,
        top: 712,
        transform: 'translateX(-50%)',
        height: 40,
        borderRadius: 10,
        background: '#F2F1EC',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '0 16px',
        fontFamily: ui,
        fontSize: 15.5,
        color: ink,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon name="window" size={15} /> Download desktop app
    </div>
    <HeroArt x={850} y={70} w={620} h={690} />
  </div>
);

// ───────── 建账号：同意条款 ─────────
export const CREATE = {check: {x: 810 - 215 + 34, y: 430 + 34}, btn: {x: 810, y: 430 + 96}};
export const ClaudeCreate: React.FC<{checked: number; email: string; hover?: number; busy?: boolean}> = ({checked, email, hover, busy}) => (
  <div style={{position: 'relative', width: PW, height: PH, background: '#fff'}}>
    <div style={{position: 'absolute', left: 810, top: 40, transform: 'translateX(-50%)'}}>
      <Logo size={26} />
    </div>
    <div style={{position: 'absolute', left: 810, top: 330, transform: 'translateX(-50%)', fontFamily: serif, fontSize: 40, color: ink, whiteSpace: 'nowrap', letterSpacing: -0.6}}>
      Let&apos;s create your account
    </div>
    <div style={{position: 'absolute', left: 810, top: 388, transform: 'translateX(-50%)', fontFamily: ui, fontSize: 15, color: mute}}>A few things for you to review</div>
    <div style={{position: 'absolute', left: 810 - 215, top: 430, width: 430, height: 132, borderRadius: 16, border: '1px solid #ECEAE3', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
      <div style={{position: 'absolute', left: 22, top: 22, display: 'flex', gap: 12}}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: checked > 0.5 ? 'none' : '1.5px solid #B9B6AC',
            background: checked > 0.5 ? C.claudeBlue : '#fff',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${1 + 0.15 * Math.sin(Math.min(1, checked) * Math.PI)})`,
          }}
        >
          {checked > 0.5 && <Icon name="check" size={15} color="#fff" sw={3} />}
        </div>
        <div style={{fontFamily: ui, fontSize: 14.5, color: '#3D3C38', lineHeight: 1.5}}>
          I agree to Anthropic&apos;s <span style={{color: '#2F5DB8'}}>Consumer Terms</span> and <span style={{color: '#2F5DB8'}}>Acceptable Use Policy</span> and confirm that I am at least 18 years of age.
        </div>
      </div>
      <BtnDark w={386} h={44} hover={hover} busy={busy} disabled={checked < 0.5} style={{position: 'absolute', left: 22, top: 74}}>
        Create account
      </BtnDark>
    </div>
    <div style={{position: 'absolute', left: 810, top: 735, transform: 'translateX(-50%)', fontFamily: ui, fontSize: 13.5, color: mute, textAlign: 'center', lineHeight: 1.6, whiteSpace: 'nowrap'}}>
      Email verified as {email}
      <br />
      <span style={{textDecoration: 'underline'}}>Use a different email</span>
    </div>
  </div>
);

// ───────── 套餐（注册引导里的那页 / 菜单进去的那页） ─────────
const Sprout: React.FC<{n: number}> = ({n}) => (
  <svg width="40" height="40" viewBox="0 0 40 40" style={{display: 'block'}}>
    <g fill="none" stroke="#3D3C38" strokeWidth="1.6" strokeLinecap="round">
      <path d="M20 36V14" />
      <circle cx="20" cy="9" r="4" />
      {n >= 2 && (
        <>
          <path d="M20 26l-8-6" />
          <circle cx="10" cy="18" r="3" />
          <path d="M20 22l8-6" />
          <circle cx="30" cy="14" r="3" />
        </>
      )}
      {n >= 3 && (
        <>
          <path d="M20 31l-11 2" />
          <circle cx="6" cy="33" r="2.6" />
          <path d="M20 31l11 2" />
          <circle cx="34" cy="33" r="2.6" />
        </>
      )}
      <path d="M12 36h16" />
    </g>
  </svg>
);

const Check: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: ui, fontSize: 14, color: '#3D3C38', lineHeight: 1.45, marginBottom: 9}}>
    <div style={{marginTop: 2}}>
      <Icon name="check" size={14} color="#5E5D58" sw={2.2} />
    </div>
    <div>{children}</div>
  </div>
);

export const PLAN = {cardW: 372, gap: 24, x0: (PW - (372 * 3 + 24 * 2)) / 2, y0: 170};
export const planBtn = (i: number) => ({x: PLAN.x0 + i * (PLAN.cardW + PLAN.gap) + PLAN.cardW / 2, y: PLAN.y0 + 207});

export const ClaudePlans: React.FC<{
  variant: 'onboard' | 'menu';
  hover?: number; // 悬停第几张卡的按钮
  glow?: number[]; // 每张卡的高亮
  featGlow?: number; // Pro 卡里两条特性的高亮
}> = ({variant, hover = -1, glow = [0, 0, 0], featGlow = 0}) => {
  const onboard = variant === 'onboard';
  const cards = [
    {
      name: 'Free',
      sub: 'Meet Claude',
      price: '$0',
      unit: '',
      btn: 'Use Claude for free',
      btnDark: onboard,
      head: '',
      feats: onboard
        ? ['Chat on web, iOS, Android, and on your desktop', 'Generate code and visualize data', 'Write, edit, and create content', 'Ability to search the web', 'Memory across conversations', 'Create files and execute code', 'Connect Slack and Google Workspace services', 'Extended thinking for complex work']
        : ['Chat on web, iOS, Android, and desktop', 'Generate code and visualize data', 'Connect Slack and Google Workspace', 'Extended thinking for complex work', 'Built-in web search'],
    },
    {
      name: 'Pro',
      sub: 'Research, code, and organize',
      price: onboard ? '$17' : '$20',
      unit: onboard ? 'USD / month\n$200 billed annually' : 'USD / month · billed monthly',
      btn: 'Get Pro plan',
      btnDark: true,
      head: onboard ? 'Everything in Free and:' : 'Everything in Free and:',
      feats: onboard
        ? ['More usage*', 'Includes Claude Code', 'Includes Claude Design', 'Access to unlimited projects to organize chats and documents', 'Access to Research', 'Ability to use more Claude models', 'Claude for Microsoft 365']
        : ['Claude Code directly in your codebase', 'Power through tasks with Claude', 'Build and prototype with Claude Design', 'Higher usage limits', 'Access to more Claude models', 'Memory that carries across conversations'],
      toggle: true,
    },
    {
      name: 'Max and Ultra',
      sub: 'Higher limits, priority access',
      price: '$100',
      pre: 'From',
      unit: 'USD / month · billed monthly',
      btn: 'Get Max or Ultra plan',
      btnDark: true,
      head: 'Everything in Pro, plus:',
      feats: ['Up to 10x Pro usage every week*', 'Recommended for Claude Code and long-running tasks', 'Early access to advanced Claude features', 'Priority access at high traffic times'],
    },
  ];
  return (
    <div style={{position: 'relative', width: PW, height: PH, background: '#fff'}}>
      {onboard && (
        <div style={{position: 'absolute', left: 810, top: 26, transform: 'translateX(-50%)'}}>
          <Logo size={24} />
        </div>
      )}
      <div style={{position: 'absolute', left: 810, top: onboard ? 88 : 54, transform: 'translateX(-50%)', fontFamily: serif, fontSize: 36, color: ink, whiteSpace: 'nowrap', letterSpacing: -0.5}}>
        Plans that grow with you
      </div>
      {!onboard && (
        <div style={{position: 'absolute', left: 810, top: 112, transform: 'translateX(-50%)', height: 38, borderRadius: 10, background: '#F2F1EC', padding: 4, display: 'flex', gap: 2, boxSizing: 'border-box', fontFamily: ui, fontSize: 14.5}}>
          <div style={{height: 30, borderRadius: 7, background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.08)'}}>Individual</div>
          <div style={{height: 30, padding: '0 16px', display: 'flex', alignItems: 'center', color: mute}}>Team and Enterprise</div>
        </div>
      )}
      {cards.map((c, i) => {
        const x = PLAN.x0 + i * (PLAN.cardW + PLAN.gap);
        const g = glow[i] ?? 0;
        return (
          <div
            key={c.name}
            style={{
              position: 'absolute',
              left: x,
              top: PLAN.y0,
              width: PLAN.cardW,
              height: 590,
              borderRadius: 16,
              border: g > 0 ? `2px solid rgba(217,119,87,${0.4 + 0.6 * g})` : '1px solid #ECEAE3',
              background: '#fff',
              boxShadow: g > 0 ? `0 12px 40px rgba(217,119,87,${0.18 * g})` : '0 2px 10px rgba(0,0,0,0.04)',
              padding: '22px 22px',
              boxSizing: 'border-box',
            }}
          >
            <Sprout n={i + 1} />
            {c.toggle && (
              <div style={{position: 'absolute', right: 18, top: 22, height: 28, borderRadius: 8, background: '#F2F1EC', padding: 3, display: 'flex', gap: 2, boxSizing: 'border-box', fontFamily: ui, fontSize: 12}}>
                <div style={{height: 22, borderRadius: 6, padding: '0 9px', display: 'flex', alignItems: 'center', background: onboard ? 'transparent' : '#fff', color: onboard ? mute : ink}}>Monthly</div>
                <div style={{height: 22, borderRadius: 6, padding: '0 9px', display: 'flex', alignItems: 'center', background: onboard ? '#fff' : 'transparent', color: onboard ? ink : mute}}>
                  Yearly · <span style={{color: C.claudeBlue, marginLeft: 3}}>Save 17%</span>
                </div>
              </div>
            )}
            <div style={{fontFamily: ui, fontSize: 22, fontWeight: 600, color: ink, marginTop: 12}}>{c.name}</div>
            <div style={{fontFamily: ui, fontSize: 14, color: mute, marginTop: 2}}>{c.sub}</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14, height: 40}}>
              {c.pre && <span style={{fontFamily: ui, fontSize: 14, color: mute}}>{c.pre}</span>}
              <span style={{fontFamily: ui, fontSize: 30, fontWeight: 600, color: ink}}>{c.price}</span>
              <span style={{fontFamily: ui, fontSize: 11.5, color: mute, whiteSpace: 'pre-line', lineHeight: 1.25}}>{c.unit}</span>
            </div>
            <div
              style={{
                marginTop: 12,
                height: 42,
                borderRadius: 9,
                background: c.btnDark ? (hover === i ? '#3A3936' : ink) : '#F2F1EC',
                color: c.btnDark ? '#fff' : ink,
                fontFamily: ui,
                fontSize: 15,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: hover === i ? 'scale(1.02)' : 'none',
              }}
            >
              {c.btn}
            </div>
            {!onboard && i > 0 && <div style={{textAlign: 'center', fontFamily: ui, fontSize: 12, color: mute, marginTop: 6}}>No commitment · Cancel anytime</div>}
            <div style={{height: 1, background: '#ECEAE3', margin: '18px 0 14px'}} />
            {c.head && <div style={{fontFamily: ui, fontSize: 13.5, color: mute, marginBottom: 10}}>{c.head}</div>}
            {c.feats.map((f, k) => {
              const hl = i === 1 && !onboard && (k === 3 || k === 4) ? featGlow : 0;
              return (
                <div key={f} style={{position: 'relative'}}>
                  {hl > 0 && <div style={{position: 'absolute', left: -6, top: -3, width: (PLAN.cardW - 36) * hl, height: 24, background: C.sunPale, borderRadius: 5}} />}
                  <div style={{position: 'relative'}}>
                    <Check>{f}</Check>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 810, top: 772, transform: 'translateX(-50%)', fontFamily: ui, fontSize: 12, color: mute, whiteSpace: 'nowrap'}}>
        *Usage limits apply. Prices and plans are subject to change at Anthropic&apos;s discretion.
      </div>
    </div>
  );
};

// ───────── 引导：桌面版 / 第一次对话前 / 名字 / 工作 ─────────
const Center: React.FC<{children: React.ReactNode; title: string; sub: string; top?: number}> = ({children, title, sub, top = 230}) => (
  <div style={{position: 'relative', width: PW, height: PH, background: '#fff'}}>
    <div style={{position: 'absolute', left: 810, top: 40, transform: 'translateX(-50%)'}}>
      <Logo size={26} />
    </div>
    <div style={{position: 'absolute', left: 810, top, transform: 'translateX(-50%)', fontFamily: serif, fontSize: 38, color: ink, whiteSpace: 'nowrap', letterSpacing: -0.5}}>{title}</div>
    <div style={{position: 'absolute', left: 810, top: top + 56, transform: 'translateX(-50%)', fontFamily: ui, fontSize: 15, color: mute, whiteSpace: 'nowrap'}}>{sub}</div>
    {children}
  </div>
);

export const DESK = {skip: {x: 810, y: 690}};
export const ClaudeDesktop: React.FC<{skipHover?: number}> = ({skipHover = 0}) => (
  <Center title="Get the most out of Claude on your desktop" sub="With the desktop app, Claude can write code, work with your files, and automate tasks while you focus on other work." top={150}>
    <div style={{position: 'absolute', left: 810 - 230, top: 270, width: 460, height: 280, borderRadius: 20, background: '#F4F3EE', overflow: 'hidden', border: '1px solid #ECEAE3'}}>
      <div style={{position: 'absolute', left: 0, top: 150, width: 460, height: 130, background: '#E9E7E0'}} />
      {[0, 1, 2, 3, 4].map((k) => (
        <div
          key={k}
          style={{
            position: 'absolute',
            left: 28 + k * 86,
            top: 168,
            width: 70,
            height: 70,
            borderRadius: 18,
            background: k === 2 ? '#D97757' : ['#4A7BD0', '#2D2D2D', '', '#7C66D6', '#E8B33E'][k],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: k === 2 ? '0 10px 24px rgba(217,119,87,0.45)' : 'none',
            transform: k === 2 ? 'translateY(-10px)' : 'none',
          }}
        >
          {k === 2 && <Spark size={42} color="#fff" />}
        </div>
      ))}
      <div style={{position: 'absolute', left: 230, top: 110, transform: 'translateX(-50%)', background: '#2D2D2D', color: '#fff', fontFamily: ui, fontSize: 16, padding: '6px 14px', borderRadius: 8}}>Claude</div>
    </div>
    <BtnDark w={360} h={46} style={{position: 'absolute', left: 810 - 180, top: 600}}>
      <Icon name="window" size={16} color="#fff" /> Download for Windows
    </BtnDark>
    <div
      style={{
        position: 'absolute',
        left: 810,
        top: DESK.skip.y - 14,
        transform: 'translateX(-50%)',
        fontFamily: ui,
        fontSize: 16,
        color: ink,
        fontWeight: 500,
        padding: '4px 14px',
        borderRadius: 8,
        background: skipHover ? '#F2F1EC' : 'transparent',
      }}
    >
      Skip
    </div>
  </Center>
);

export const BEFORE = {cont: {x: 810, y: 640}, toggle: {x: 810 - 250 + 40, y: 430 + 168}};
export const ClaudeBefore: React.FC<{hover?: number}> = ({hover = 0}) => (
  <Center title="Before your first chat" sub="A few things to know, plus one setting to review" top={250}>
    <div style={{position: 'absolute', left: 810 - 250, top: 380, width: 500, borderRadius: 16, border: '1px solid #ECEAE3', padding: '18px 20px', boxSizing: 'border-box', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'}}>
      {[
        ['Ad-free chats:', "We won't show you ads or let advertisers influence what Claude says."],
        ['Built to help, not harm:', 'Automated safeguards protect your chats from violent, abusive, or deceptive content.'],
        ['Help improve our AI models:', 'Allow the use of your chats and coding sessions to train and improve Anthropic AI models. Change anytime in privacy settings.'],
      ].map(([b, s], k) => (
        <div key={k} style={{display: 'flex', gap: 14, marginBottom: k < 2 ? 14 : 0, alignItems: 'flex-start'}}>
          {k < 2 ? (
            <div style={{width: 30, height: 30, borderRadius: 15, background: '#F2F1EC', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5E5D58'}}>
              <Icon name={k === 0 ? 'shield' : 'user'} size={15} />
            </div>
          ) : (
            <div style={{width: 34, height: 20, borderRadius: 10, background: C.claudeBlue, flexShrink: 0, position: 'relative', marginTop: 4}}>
              <div style={{position: 'absolute', right: 2, top: 2, width: 16, height: 16, borderRadius: 8, background: '#fff'}} />
            </div>
          )}
          <div style={{fontFamily: ui, fontSize: 14, color: '#3D3C38', lineHeight: 1.5}}>
            <b style={{color: ink}}>{b}</b> {s}
          </div>
        </div>
      ))}
    </div>
    <BtnDark w={500} h={44} hover={hover} style={{position: 'absolute', left: 810 - 250, top: BEFORE.cont.y - 22}}>
      Continue
    </BtnDark>
  </Center>
);

export const NAME = {input: {x: 810, y: 380}, cont: {x: 810, y: 438}};
export const ClaudeName: React.FC<{name: string; caret?: boolean; hover?: number}> = ({name, caret, hover = 0}) => (
  <Center title="What's your name?" sub="So Claude knows what to call you." top={250}>
    <Input w={440} value={name} placeholder="Enter your name" focus caret={caret} center style={{position: 'absolute', left: 810 - 220, top: NAME.input.y - 23}} />
    <BtnDark w={440} h={44} hover={hover} disabled={!name} style={{position: 'absolute', left: 810 - 220, top: NAME.cont.y - 22}}>
      Continue
    </BtnDark>
  </Center>
);

export const ROLES = ['Product management', 'Software engineer', 'Engineering', 'Human resources', 'Finance', 'Marketing', 'Sales', 'Operations', 'Data science', 'Design', 'Scientist', 'Legal', 'Student'];
export const ROLE = {select: {x: 810, y: 352}, item: (k: number) => ({x: 810 - 120, y: 352 + 34 + 8 + k * 32 + 16}), later: {x: 810, y: 560}};
export const ClaudeRole: React.FC<{open?: number; hoverIdx?: number; picked?: string; laterHover?: number}> = ({open = 0, hoverIdx = -1, picked, laterHover = 0}) => (
  <Center title="What kind of work do you do?" sub="Pick a role so Claude can tailor your experience." top={220}>
    <div
      style={{
        position: 'absolute',
        left: 810 - 220,
        top: ROLE.select.y - 20,
        width: 440,
        height: 40,
        borderRadius: 9,
        border: open > 0 ? `2px solid ${C.claudeBlue}` : '1px solid #D9D6CC',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontFamily: ui,
        fontSize: 15,
        color: picked ? ink : '#A3A097',
      }}
    >
      <span style={{flex: 1}}>{picked ?? 'Select your role'}</span>
      <Icon name="chevDown" size={16} color="#5E5D58" />
    </div>
    {picked && (
      <div
        style={{
          position: 'absolute',
          left: 810,
          top: ROLE.later.y - 12,
          transform: 'translateX(-50%)',
          fontFamily: ui,
          fontSize: 15.5,
          fontWeight: 500,
          color: ink,
          padding: '4px 14px',
          borderRadius: 8,
          background: laterHover ? '#F2F1EC' : 'transparent',
        }}
      >
        Set up later
      </div>
    )}
    {open > 0 && (
      <div
        style={{
          position: 'absolute',
          left: 810 - 220,
          top: ROLE.select.y + 26,
          width: 440,
          height: 360,
          overflow: 'hidden',
          borderRadius: 10,
          border: '1px solid #E6E3D9',
          background: '#fff',
          boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
          padding: '8px 6px',
          boxSizing: 'border-box',
          opacity: open,
        }}
      >
        {ROLES.slice(2).map((r, k) => (
          <div
            key={r}
            style={{
              height: 32,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              fontFamily: ui,
              fontSize: 14.5,
              color: ink,
              background: k === hoverIdx ? '#EEEDE7' : 'transparent',
            }}
          >
            {r}
          </div>
        ))}
      </div>
    )}
  </Center>
);

// ───────── 对话界面 ─────────
export const SIDE = 280;
export const CHAT = {
  user: {x: 150, y: PH - 34}, // 左下角名字
  composer: {x: SIDE + (PW - SIDE) / 2, y: PH - 108},
  upgrade: {x: 760, y: 26},
};

export type Msg = {who: 'me' | 'claude'; text: string};

export const ClaudeChat: React.FC<{
  name: string;
  plan: 'Free' | 'Pro';
  zh?: boolean;
  draft?: string;
  caret?: boolean;
  msgs?: Msg[];
  thinking?: boolean;
  userHover?: number;
  planGlow?: number;
  sendHover?: number;
}> = ({name, plan, zh = false, draft = '', caret, msgs = [], thinking, userHover = 0, planGlow = 0}) => {
  const L = zh
    ? {nw: '新建', sr: '搜索', pj: '项目', af: 'Artifacts', cd: '代码', cu: '自定义', chats: '最近使用', first: '你和 Claude 的第一次对话', all: '查看全部', ph: '今天我能帮你做些什么？', foot: 'Claude 是 AI，可能会出错，请核对回答。'}
    : {nw: 'New', sr: 'Search', pj: 'Projects', af: 'Artifacts', cd: 'Code', cu: 'Customize', chats: 'Chats and tasks', first: 'Your first chat with Claude', all: 'View all', ph: msgs.length ? 'Write a message…' : "Tell Claude what you're working on", foot: 'Claude is AI and can make mistakes. Please double-check responses.'};
  return (
    <div style={{position: 'relative', width: PW, height: PH, background: '#fff', fontFamily: ui}}>
      {/* 侧栏 */}
      <div style={{position: 'absolute', left: 0, top: 0, width: SIDE, height: PH, background: '#F8F8F6', borderRight: '1px solid #ECEAE3'}}>
        <div style={{position: 'absolute', left: 18, top: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#3D3C38'}}>
          <Icon name="panel" size={18} />
          <div style={{fontFamily: serif, fontSize: 22, color: ink}}>Claude</div>
        </div>
        {[
          ['plus', L.nw],
          ['search', L.sr],
          ['folder', L.pj],
          ['shapes', L.af],
          ['code', L.cd],
          ['briefcase', L.cu],
        ].map(([ic, t], k) => (
          <div key={t} style={{position: 'absolute', left: 14, top: 62 + k * 34, width: SIDE - 28, height: 30, display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px', fontSize: 14.5, color: '#2F2E2A'}}>
            <Icon name={ic} size={16} />
            <span style={{flex: 1}}>{t}</span>
            {k === 4 && plan === 'Free' && <span style={{fontSize: 12, color: C.claudeBlue}}>Upgrade</span>}
          </div>
        ))}
        <div style={{position: 'absolute', left: 20, top: 286, fontSize: 12.5, color: mute}}>{L.chats}</div>
        <div style={{position: 'absolute', left: 12, top: 312, width: SIDE - 24, height: 32, borderRadius: 8, background: '#ECEBE6', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 14, color: ink}}>{L.first}</div>
        <div style={{position: 'absolute', left: 20, top: 356, fontSize: 13, color: mute}}>{L.all}</div>
        {/* 左下：名字和档位 */}
        <div style={{position: 'absolute', left: 0, top: PH - 66, width: SIDE, height: 1, background: '#ECEAE3'}} />
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: PH - 56,
            width: SIDE - 20,
            height: 44,
            borderRadius: 10,
            background: userHover ? '#ECEBE6' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 10px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{width: 28, height: 28, borderRadius: 14, background: '#E3E1D9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#3D3C38', fontFamily: F.zh}}>
            {Array.from(name)[0]}
          </div>
          <span style={{fontSize: 15, color: ink, fontFamily: F.sans}}>{name}</span>
          <span
            style={{
              fontSize: 14,
              color: plan === 'Pro' ? '#fff' : mute,
              background: plan === 'Pro' ? `rgba(217,119,87,${0.85 + 0.15 * planGlow})` : 'transparent',
              borderRadius: 6,
              padding: plan === 'Pro' ? '1px 7px' : 0,
              fontWeight: plan === 'Pro' ? 700 : 400,
              boxShadow: planGlow > 0 ? `0 0 0 ${6 * planGlow}px rgba(217,119,87,0.22)` : 'none',
            }}
          >
            {plan === 'Pro' ? 'Pro' : '· Free'}
          </span>
          <Icon name="chevDown" size={14} color={mute} />
        </div>
      </div>
      {/* 顶栏 */}
      <div style={{position: 'absolute', left: SIDE + 16, top: 16, fontSize: 14, color: '#2F2E2A', display: 'flex', alignItems: 'center', gap: 6}}>
        {L.first} <Icon name="chevDown" size={14} />
      </div>
      {plan === 'Free' && !zh && (
        <div style={{position: 'absolute', left: CHAT.upgrade.x, top: 16, fontSize: 13.5, color: mute, display: 'flex', gap: 6, alignItems: 'center'}}>
          Free plan · <span style={{color: C.claudeBlue, textDecoration: 'underline'}}>Upgrade</span> <Icon name="x" size={12} />
        </div>
      )}
      <div style={{position: 'absolute', right: 20, top: 16, fontSize: 14, color: '#2F2E2A', display: 'flex', alignItems: 'center', gap: 6}}>
        <Icon name="share" size={14} /> {zh ? '分享' : 'Share'}
      </div>
      {/* 内容 */}
      <div style={{position: 'absolute', left: SIDE + 230, top: 64, width: 760}}>
        {/* 欢迎语是对话内容，切界面语言不会跟着变 */}
        <div style={{fontFamily: serif, fontSize: 21, fontWeight: 700, color: ink}}>{`Welcome, ${name}! I'm Claude.`}</div>
        <div style={{fontFamily: serif, fontSize: 17, color: '#2F2E2A', marginTop: 8, lineHeight: 1.55}}>
          Bring me anything—a tough problem, a half-formed idea, something you need to write. We&apos;ll figure it out together.
        </div>
        <div style={{fontFamily: serif, fontSize: 17, color: '#2F2E2A', marginTop: 10}}>Where do you want to start?</div>
        {msgs.length === 0 && (
          <div style={{marginTop: 18}}>
            <Spark size={28} color={C.claudeSpark} />
          </div>
        )}
        {msgs.map((m, k) =>
          m.who === 'me' ? (
            <div key={k} style={{display: 'flex', justifyContent: 'flex-end', marginTop: 26}}>
              <div style={{background: '#F0EEE6', borderRadius: 14, padding: '10px 16px', fontSize: 16.5, color: ink, fontFamily: F.sans, maxWidth: 520}}>{m.text}</div>
            </div>
          ) : (
            <div key={k} style={{marginTop: 22, fontFamily: serif, fontSize: 17.5, color: ink, lineHeight: 1.6}}>
              {m.text}
              {k === msgs.length - 1 && thinking && <span style={{display: 'inline-block', marginLeft: 6, verticalAlign: 'middle'}}><Spark size={18} color={C.claudeSpark} /></span>}
            </div>
          ),
        )}
      </div>
      {/* 输入框 */}
      <div
        style={{
          position: 'absolute',
          left: SIDE + (PW - SIDE) / 2 - 380,
          top: PH - 150,
          width: 760,
          height: 84,
          borderRadius: 20,
          border: '1px solid #E3E0D6',
          background: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{position: 'absolute', left: 20, top: 16, fontSize: 16.5, color: draft ? ink : '#A3A097', fontFamily: F.sans}}>
          {draft || L.ph}
          <Caret on={caret} h={19} />
        </div>
        <div style={{position: 'absolute', left: 16, top: 50, color: '#5E5D58'}}>
          <Icon name="plus" size={18} />
        </div>
        <div style={{position: 'absolute', right: 58, top: 50, color: '#5E5D58'}}>
          <Icon name="mic" size={17} />
        </div>
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 44,
            width: 32,
            height: 32,
            borderRadius: 9,
            background: draft ? C.claudeSpark : '#F2F1EC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrowUp" size={17} color={draft ? '#fff' : '#9C998F'} sw={2.4} />
        </div>
      </div>
      <div style={{position: 'absolute', left: SIDE + (PW - SIDE) / 2 - 380, top: PH - 56, width: 760, display: 'flex', fontSize: 12.5, color: mute}}>
        <span style={{flex: 1}}>{L.foot}</span>
        <span>Sonnet 5.5 · Medium</span>
      </div>
    </div>
  );
};

/** 左下角名字弹出的菜单 */
export const MENU_ITEMS_EN = ['Settings', 'Language', 'Get help', 'Upgrade plan', 'Get apps and extensions', 'Learn more', 'Log out'];
export const MENU_ITEMS_ZH = ['设置', '语言', '获取帮助', '升级套餐', '获取应用和扩展', '了解更多', '退出登录'];
const MENU_ICONS = ['settings', 'globe', 'help', 'upgrade', 'download', 'info', 'logout'];
export const MENU = {x: 12, w: 300, top: PH - 66 - 8 - 330, item: (k: number) => ({x: 12 + 90, y: PH - 66 - 8 - 330 + 44 + k * 38 + (k >= 3 ? 10 : 0) + (k >= 6 ? 10 : 0) + 19})};
export const UserMenu: React.FC<{vis: number; email: string; zh?: boolean; hover?: number; sub?: number; subHover?: number}> = ({vis, email, zh, hover = -1, sub = 0, subHover = -1}) => {
  if (vis <= 0) return null;
  const items = zh ? MENU_ITEMS_ZH : MENU_ITEMS_EN;
  return (
    <div
      style={{
        position: 'absolute',
        left: MENU.x,
        top: MENU.top,
        width: MENU.w,
        borderRadius: 14,
        background: '#fff',
        border: '1px solid #E6E3D9',
        boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
        padding: '10px 8px',
        boxSizing: 'border-box',
        opacity: vis,
        transform: `translateY(${(1 - vis) * 10}px)`,
        fontFamily: zh ? F.zh : ui,
      }}
    >
      <div style={{fontSize: 13, color: mute, padding: '4px 10px 10px', fontFamily: ui}}>{email}</div>
      {items.map((it, k) => (
        <React.Fragment key={it}>
          {(k === 3 || k === 6) && <div style={{height: 1, background: '#ECEAE3', margin: '5px 6px'}} />}
          <div
            style={{
              height: 38,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '0 10px',
              fontSize: 15,
              color: ink,
              background: k === hover ? '#F0EEE8' : 'transparent',
            }}
          >
            <Icon name={MENU_ICONS[k]} size={16} color="#3D3C38" />
            <span style={{flex: 1}}>{it}</span>
            {k === 0 && <span style={{fontSize: 12, color: mute, fontFamily: ui}}>Ctrl+Shift+,</span>}
            {(k === 1 || k === 5) && <Icon name="chevRight" size={14} color={mute} />}
          </div>
        </React.Fragment>
      ))}
      {sub > 0 && (
        <div
          style={{
            position: 'absolute',
            left: MENU.w + 6,
            top: 44 + 38 - 8,
            width: 210,
            borderRadius: 12,
            background: '#fff',
            border: '1px solid #E6E3D9',
            boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
            padding: 8,
            boxSizing: 'border-box',
            opacity: sub,
          }}
        >
          {['English', '中文（普通话）'].map((l, k) => (
            <div
              key={l}
              style={{
                height: 38,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                fontSize: 15,
                fontFamily: k ? F.zh : ui,
                color: ink,
                background: k === subHover ? '#F0EEE8' : 'transparent',
                gap: 8,
              }}
            >
              <span style={{flex: 1}}>{l}</span>
              {k === 0 && <Icon name="check" size={14} color={mute} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export const SUBMENU_ITEM = (k: number) => ({x: MENU.x + MENU.w + 6 + 90, y: MENU.top + 44 + 38 - 8 + 8 + k * 38 + 19});

// ───────── 付款页 ─────────
export const PAY = {
  monthly: {x: 245 + 110, y: 140 + 64},
  annual: {x: 245 + 240 + 110, y: 140 + 64},
  radioM: {x: 270, y: 165},
  name: {x: 475, y: 375},
  country: {x: 475, y: 435},
  addr: {x: 475, y: 495},
  city: {x: 335, y: 555},
  card: {x: 475, y: 665},
  exp: {x: 356, y: 725},
  cvc: {x: 594, y: 725},
  sumX: 760,
  total: {x: 760 + 18, y: 290, w: 404, h: 32},
  agree: {x: 794, y: 416},
  subscribe: {x: 980, y: 518},
};

type PayState = {
  plan: 'monthly' | 'annual';
  monthlyGlow?: number;
  annualGlow?: number;
  name?: string;
  country?: string;
  addr1?: string;
  city?: string;
  state?: string;
  zip?: string;
  cardNo?: string;
  exp?: string;
  cvc?: string;
  focus?: string;
  caret?: boolean;
  agreed?: number;
  subHover?: number;
  totalGlow?: number;
  busy?: boolean;
  scroll?: number;
};

const Field: React.FC<{label: string; value?: string; ph: string; focus?: boolean; caret?: boolean; w: number; chev?: boolean; right?: React.ReactNode}> = ({
  label,
  value,
  ph,
  focus,
  caret,
  w,
  chev,
  right,
}) => (
  <div style={{width: w}}>
    <div style={{fontFamily: ui, fontSize: 13.5, color: '#2F2E2A', marginBottom: 6}}>{label}</div>
    <div
      style={{
        height: 38,
        borderRadius: 8,
        border: focus ? `2px solid ${C.claudeBlue}` : '1px solid #E0DDD3',
        background: '#fff',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        padding: '0 11px',
        fontFamily: ui,
        fontSize: 14.5,
        color: ink,
        boxShadow: focus ? '0 0 0 3px rgba(44,107,214,0.14)' : 'none',
        gap: 6,
      }}
    >
      <span style={{flex: 1, whiteSpace: 'nowrap'}}>
        {value ? value : <span style={{color: '#A3A097'}}>{ph}</span>}
        <Caret on={caret && focus} h={17} />
      </span>
      {chev && <Icon name="chevDown" size={14} color="#5E5D58" />}
      {right}
    </div>
  </div>
);

const CardLogos: React.FC = () => (
  <div style={{display: 'flex', gap: 3}}>
    {['#1A1F71', '#EB001B', '#2E77BC', '#F0A400'].map((c, k) => (
      <div key={k} style={{width: 22, height: 14, borderRadius: 3, background: c, opacity: 0.85}} />
    ))}
  </div>
);

export const ClaudeCheckout: React.FC<PayState> = (s) => {
  const opt = (on: boolean, title: string, price: string, note: string, glow = 0, save = false) => (
    <div
      style={{
        position: 'relative',
        width: 220,
        height: 128,
        borderRadius: 12,
        border: on ? `2px solid ${C.claudeBlue}` : '1px solid #E0DDD3',
        background: on ? '#F4F7FD' : '#fff',
        padding: '16px 16px',
        boxSizing: 'border-box',
        boxShadow: glow > 0 ? `0 0 0 ${6 * glow}px rgba(229,104,63,${0.25 * glow})` : 'none',
        fontFamily: ui,
      }}
    >
      <div style={{width: 18, height: 18, borderRadius: 9, border: on ? `5px solid ${C.claudeBlue}` : '1.5px solid #A3A097', boxSizing: 'border-box'}} />
      {save && <div style={{position: 'absolute', right: 12, top: 12, fontSize: 12, color: C.claudeBlue, background: '#E8EFFC', borderRadius: 6, padding: '2px 7px'}}>Save 17%</div>}
      <div style={{fontSize: 14, color: '#2F2E2A', marginTop: 12}}>{title}</div>
      <div style={{fontSize: 15.5, color: ink, fontWeight: 600, marginTop: 6}}>{price}</div>
      <div style={{fontSize: 13, color: mute, marginTop: 2}}>{note}</div>
    </div>
  );
  const sc = s.scroll ?? 0;
  return (
    <div style={{position: 'relative', width: PW, height: PH, background: '#fff', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: -sc, width: PW}}>
        <div style={{position: 'absolute', left: 30, top: 22, color: '#3D3C38'}}>
          <Icon name="arrowLeft" size={20} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 80, fontFamily: ui, fontSize: 24, fontWeight: 600, color: ink}}>Configure your plan</div>
        <div style={{position: 'absolute', left: 245, top: 140, display: 'flex', gap: 20}}>
          {opt(s.plan === 'monthly', 'Pro monthly', 'USD 20.00', 'Billed monthly', s.monthlyGlow)}
          {opt(s.plan === 'annual', 'Pro annual', 'USD 200.00', 'Billed yearly', s.annualGlow, true)}
        </div>
        <div style={{position: 'absolute', left: 245, top: 300, fontFamily: ui, fontSize: 15, fontWeight: 600, color: ink}}>Billing information</div>
        <div style={{position: 'absolute', left: 245, top: 330}}>
          <Field label="Full name" value={s.name} ph="" w={460} focus={s.focus === 'name'} caret={s.caret} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 390}}>
          <Field label="Country or region" value={s.country ?? 'United States'} ph="" w={460} chev focus={s.focus === 'country'} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 450}}>
          <Field label="Address line 1" value={s.addr1} ph="" w={460} focus={s.focus === 'addr'} caret={s.caret} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 510, display: 'flex', gap: 16}}>
          <Field label="City" value={s.city} ph="" w={180} focus={s.focus === 'city'} caret={s.caret} />
          <Field label="State" value={s.state} ph="" w={140} chev />
          <Field label="ZIP code" value={s.zip} ph="" w={108} focus={s.focus === 'zip'} caret={s.caret} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 590, fontFamily: ui, fontSize: 15, fontWeight: 600, color: ink}}>Payment method</div>
        <div style={{position: 'absolute', left: 245, top: 620}}>
          <Field label="Card number" value={s.cardNo} ph="1234 1234 1234 1234" w={460} focus={s.focus === 'card'} caret={s.caret} right={<CardLogos />} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 680, display: 'flex', gap: 16}}>
          <Field label="Expiration date" value={s.exp} ph="MM / YY" w={222} focus={s.focus === 'exp'} caret={s.caret} />
          <Field label="Security code" value={s.cvc} ph="CVC" w={222} focus={s.focus === 'cvc'} caret={s.caret} />
        </div>
        <div style={{position: 'absolute', left: 245, top: 748, display: 'flex', gap: 8, alignItems: 'center', fontFamily: ui, fontSize: 13.5, color: '#2F2E2A'}}>
          <div style={{width: 15, height: 15, borderRadius: 4, border: '1.5px solid #B9B6AC'}} /> Save payment details for future purchases
        </div>
      </div>
      {/* 右侧：订单 */}
      <div
        style={{
          position: 'absolute',
          left: PAY.sumX,
          top: 140 - sc * 0.0,
          width: 440,
          height: 430,
          borderRadius: 18,
          border: '1px solid #E6E3D9',
          background: '#fff',
          boxShadow: '0 6px 26px rgba(0,0,0,0.07)',
          padding: '24px 26px',
          boxSizing: 'border-box',
          fontFamily: ui,
        }}
      >
        <div style={{fontFamily: serif, fontSize: 26, color: ink}}>Pro plan</div>
        {[
          ['Pro monthly', '$20.00'],
          ['Subtotal', '$20.00'],
          ['Tax', '$0.00'],
        ].map(([a, b]) => (
          <div key={a} style={{display: 'flex', fontSize: 13.5, color: mute, marginTop: 10}}>
            <span style={{flex: 1}}>{a}</span>
            <span>{b}</span>
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            fontSize: 15,
            color: ink,
            fontWeight: 600,
            marginTop: 12,
            padding: '6px 8px',
            marginLeft: -8,
            marginRight: -8,
            borderRadius: 8,
            background: (s.totalGlow ?? 0) > 0 ? `rgba(245,192,74,${0.45 * (s.totalGlow ?? 0)})` : 'transparent',
          }}
        >
          <span style={{flex: 1}}>Total due today</span>
          <span>$20.00</span>
        </div>
        <div style={{marginTop: 14, border: '1px solid #ECEAE3', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#3D3C38', display: 'flex', gap: 8, lineHeight: 1.5}}>
          <Icon name="info" size={14} color="#5E5D58" style={{marginTop: 2}} />
          Your subscription will auto-renew on 12/9/2026. You will be charged $20.00/month.
        </div>
        <div style={{marginTop: 14, display: 'flex', gap: 10, fontSize: 12.5, color: '#3D3C38', lineHeight: 1.5}}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              flexShrink: 0,
              marginTop: 2,
              border: (s.agreed ?? 0) > 0.5 ? 'none' : '1.5px solid #B9B6AC',
              background: (s.agreed ?? 0) > 0.5 ? C.claudeBlue : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {(s.agreed ?? 0) > 0.5 && <Icon name="check" size={11} color="#fff" sw={3.4} />}
          </div>
          <div>
            You agree that Anthropic will charge your card in the amount above now and on a recurring monthly basis until you cancel in accordance with our <span style={{color: '#2F5DB8'}}>terms</span>. You can cancel at any time in your account settings.
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            height: 40,
            borderRadius: 9,
            background: (s.agreed ?? 0) > 0.5 ? ((s.subHover ?? 0) > 0 ? '#3A3936' : ink) : '#ECEAE3',
            color: (s.agreed ?? 0) > 0.5 ? '#fff' : '#B5B2A8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {s.busy ? <div style={{width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff'}} /> : 'Subscribe'}
        </div>
      </div>
    </div>
  );
};

/** 付款处理中 */
export const ClaudeProcessing: React.FC<{spin: number}> = ({spin}) => (
  <div style={{position: 'relative', width: PW, height: PH, background: '#fff'}}>
    {[
      [245, 90, 200, 22],
      [245, 140, 460, 120],
      [245, 300, 460, 200],
      [245, 540, 460, 120],
      [760, 140, 440, 300],
    ].map(([x, y, w, h], k) => (
      <div key={k} style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 12, background: '#F5F4F0'}} />
    ))}
    <div style={{position: 'absolute', left: 810, top: 360, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
      <svg width="54" height="54" viewBox="0 0 54 54" style={{transform: `rotate(${spin}deg)`}}>
        <circle cx="27" cy="27" r="22" fill="none" stroke="#E6E3D9" strokeWidth="4" />
        <path d="M27 5a22 22 0 0 1 22 22" fill="none" stroke="#3D3C38" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div style={{fontFamily: ui, fontSize: 16, color: '#3D3C38'}}>Processing payment</div>
    </div>
  </div>
);

// ───────── 设置 · 账单（中文界面；英文版换成英文） ─────────
export const SET = {
  w: 1100,
  h: 560,
  x: (PW - 1100) / 2,
  y: 60,
  billingNav: {x: (PW - 1100) / 2 + 14 + 100, y: 60 + 58 + 90 + 3 * 42 + 18},
  plan: {x: (PW - 1100) / 2 + 278, y: 60 + 70, w: 790, h: 80},
  inv: {x: (PW - 1100) / 2 + 278, y: 60 + 330, w: 790, h: 120},
  cancel: {x: (PW - 1100) / 2 + 288 + 770 - 34, y: 60 + 541},
};
export const SettingsBilling: React.FC<{vis: number; tab: 'general' | 'billing'; zh: boolean; navHover?: number; planGlow?: number; invGlow?: number; cancelGlow?: number}> = ({
  vis,
  tab,
  zh,
  navHover = 0,
  planGlow = 0,
  invGlow = 0,
  cancelGlow = 0,
}) => {
  if (vis <= 0) return null;
  const nav = zh
    ? ['常规', '账户', '隐私', '账单', '使用情况', '功能', '记忆', 'Claude Code', 'Claude in Chrome']
    : ['General', 'Account', 'Privacy', 'Billing', 'Usage', 'Capabilities', 'Memory', 'Claude Code', 'Claude in Chrome'];
  const icons = ['settings', 'user', 'shield', 'card', 'clock', 'briefcase', 'bookOpen', 'code', 'globe'];
  const T = zh
    ? {
        title: '设置',
        search: '搜索',
        pref: '偏好',
        plan: 'Pro 套餐',
        renew: '您的订阅将于 2026年12月9日 自动续费。',
        adjust: '调整套餐',
        pay: '付款',
        payNote: '您可以添加一张备用卡，以防默认付款方式被拒付。',
        add: '添加付款方式',
        exp: '有效期至 12/2030',
        def: '默认',
        upd: '更新',
        inv: '发票',
        cols: ['日期', '总计', '状态', '操作'],
        row: ['2026年11月9日', '$20', '已付款', '下载 PDF'],
        cancelT: '取消订阅',
        cancelL: '取消套餐',
        cancelB: '取消',
      }
    : {
        title: 'Settings',
        search: 'Search',
        pref: 'Preferences',
        plan: 'Pro plan',
        renew: 'Your subscription will auto-renew on Dec 9, 2026.',
        adjust: 'Adjust plan',
        pay: 'Payment',
        payNote: 'You can add a backup card in case your default payment method is declined.',
        add: 'Add payment method',
        exp: 'Expires 12/2030',
        def: 'Default',
        upd: 'Update',
        inv: 'Invoices',
        cols: ['Date', 'Total', 'Status', 'Actions'],
        row: ['Nov 9, 2026', '$20', 'Paid', 'Download PDF'],
        cancelT: 'Cancellation',
        cancelL: 'Cancel plan',
        cancelB: 'Cancel',
      };
  const fz = zh ? F.zh : ui;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, background: `rgba(20,20,19,${0.35 * vis})`}} />
      <div
        style={{
          position: 'absolute',
          left: SET.x,
          top: SET.y,
          width: SET.w,
          height: SET.h,
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
          opacity: vis,
          transform: `scale(${0.96 + 0.04 * vis})`,
          overflow: 'hidden',
          fontFamily: fz,
          color: ink,
        }}
      >
        <div style={{position: 'absolute', left: 24, top: 18, fontSize: 18, fontWeight: 600}}>{T.title}</div>
        <div style={{position: 'absolute', right: 22, top: 18}}>
          <Icon name="x" size={20} />
        </div>
        <div style={{position: 'absolute', left: 0, top: 58, width: SET.w, height: 1, background: '#ECEAE3'}} />
        <div style={{position: 'absolute', left: 0, top: 58, width: 248, height: SET.h - 58, borderRight: '1px solid #ECEAE3'}}>
          <div style={{position: 'absolute', left: 18, top: 16, width: 212, height: 34, borderRadius: 9, border: '1px solid #E6E3D9', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', color: mute, fontSize: 14}}>
            <Icon name="search" size={15} /> {T.search}
          </div>
          <div style={{position: 'absolute', left: 22, top: 66, fontSize: 12.5, color: mute}}>{T.pref}</div>
          {nav.map((n, k) => {
            const on = (tab === 'billing' && k === 3) || (tab === 'general' && k === 0);
            return (
              <div
                key={n}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: 90 + k * 42,
                  width: 220,
                  height: 36,
                  borderRadius: 8,
                  background: on ? '#EEEDE7' : k === 3 && navHover > 0 ? '#F4F3EF' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '0 12px',
                  fontSize: 15,
                }}
              >
                <Icon name={icons[k]} size={16} color="#3D3C38" />
                {n}
              </div>
            );
          })}
        </div>
        {tab === 'billing' ? (
          <div style={{position: 'absolute', left: 288, top: 80, width: SET.w - 330}}>
            <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 18, padding: 10, margin: -10, borderRadius: 12, background: planGlow > 0 ? `rgba(245,192,74,${0.3 * planGlow})` : 'transparent'}}>
              <Sprout n={2} />
              <div style={{flex: 1}}>
                <div style={{fontSize: 17, fontWeight: 700}}>{T.plan}</div>
                <div style={{fontSize: 14, color: mute, marginTop: 4}}>{T.renew}</div>
              </div>
              <div style={{height: 34, borderRadius: 9, background: '#F2F1EC', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14.5}}>{T.adjust}</div>
            </div>
            <div style={{marginTop: 40, display: 'flex', alignItems: 'center'}}>
              <div style={{flex: 1}}>
                <div style={{fontSize: 16, fontWeight: 700}}>{T.pay}</div>
                <div style={{fontSize: 13.5, color: mute, marginTop: 4}}>{T.payNote}</div>
              </div>
              <div style={{height: 34, borderRadius: 9, background: '#F2F1EC', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14.5}}>{T.add}</div>
            </div>
            <div style={{marginTop: 22, display: 'flex', alignItems: 'center'}}>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontFamily: ui}}>
                  <div style={{width: 30, height: 20, borderRadius: 4, background: '#1A1F71', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>VISA</div>
                  Visa •••• 4242
                  <span style={{fontSize: 12.5, color: C.claudeBlue, background: '#E8EFFC', borderRadius: 6, padding: '1px 7px', fontFamily: fz}}>{T.def}</span>
                </div>
                <div style={{fontSize: 13.5, color: mute, marginTop: 6}}>{T.exp}</div>
              </div>
              <div style={{height: 34, borderRadius: 9, background: '#F2F1EC', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14.5}}>{T.upd}</div>
            </div>
            <div style={{position: 'relative', marginTop: 40, padding: 10, margin: '40px -10px 0', borderRadius: 12, background: invGlow > 0 ? `rgba(245,192,74,${0.3 * invGlow})` : 'transparent'}}>
              <div style={{fontSize: 16, fontWeight: 700}}>{T.inv}</div>
              <div style={{display: 'flex', fontSize: 14, color: mute, marginTop: 16}}>
                {T.cols.map((c, k) => (
                  <div key={c} style={{width: [300, 130, 130, 160][k]}}>
                    {c}
                  </div>
                ))}
              </div>
              <div style={{display: 'flex', fontSize: 14.5, marginTop: 12}}>
                {T.row.map((c, k) => (
                  <div key={c} style={{width: [300, 130, 130, 160][k], color: k === 3 ? C.claudeBlue : ink, textDecoration: k === 3 ? 'underline' : 'none'}}>
                    {c}
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginTop: 46, fontSize: 16, fontWeight: 700}}>{T.cancelT}</div>
            <div style={{marginTop: 14, display: 'flex', alignItems: 'center'}}>
              <div style={{flex: 1, fontSize: 15}}>{T.cancelL}</div>
              <div
                style={{
                  height: 34,
                  borderRadius: 9,
                  background: '#FBE3E1',
                  color: '#B42318',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 14.5,
                  fontWeight: 600,
                  boxShadow: cancelGlow > 0 ? `0 0 0 ${6 * cancelGlow}px rgba(180,35,24,0.15)` : 'none',
                }}
              >
                {T.cancelB}
              </div>
            </div>
          </div>
        ) : (
          <div style={{position: 'absolute', left: 288, top: 80, width: SET.w - 330}}>
            <div style={{fontSize: 16, fontWeight: 700}}>{zh ? '外观' : 'Appearance'}</div>
            {(zh ? ['主题', '界面字体', '回复字体', '对话记录文字大小'] : ['Theme', 'Interface font', 'Response font', 'Chat font size']).map((r) => (
              <div key={r} style={{display: 'flex', fontSize: 14.5, marginTop: 24, color: '#2F2E2A'}}>
                <span style={{flex: 1}}>{r}</span>
                <span style={{color: mute}}>—</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
