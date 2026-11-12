// App 图标和各 App 的示意界面（ChatGPT、Claude、中国银行）。不是真实截图，按钮文字照实际界面
import React from 'react';
import {clamp, spring} from '../lib/anim';
import {F} from '../lib/theme';
import {tr} from '../lib/time';
import {Icon, Spark} from './icons';

const UI = F.ui;
const SW = 440;
const SH = 940;
const abs = (x: number, y: number, w?: number, h?: number): React.CSSProperties => ({position: 'absolute', left: x, top: y, width: w, height: h});

// ───────── 标志 ─────────
/** 万事达：两个圆 */
export const McMark: React.FC<{h?: number}> = ({h = 24}) => {
  const r = h / 2;
  const w = h * 1.62;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block'}}>
      <defs>
        <clipPath id={`mcl${h}`}>
          <circle cx={r} cy={r} r={r} />
        </clipPath>
      </defs>
      <circle cx={r} cy={r} r={r} fill="#EB001B" />
      <circle cx={w - r} cy={r} r={r} fill="#F79E1B" />
      <circle cx={w - r} cy={r} r={r} fill="#FF5F00" clipPath={`url(#mcl${h})`} />
    </svg>
  );
};

export const VisaMark: React.FC<{h?: number; color?: string}> = ({h = 24, color = '#1A1F71'}) => (
  <div style={{fontFamily: F.sans, fontWeight: 900, fontStyle: 'italic', fontSize: h * 0.9, letterSpacing: h * 0.02, color, lineHeight: 1}}>VISA</div>
);

/** Google Play 的四色三角（示意） */
export const PlayMark: React.FC<{size?: number}> = ({size = 24}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
    <path d="M3.6 1.8 13.4 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1Z" fill="#00A0FF" />
    <path d="M16.9 8.5 13.4 12 3.6 1.8c.3-.2.8-.2 1.2 0l12.1 6.7Z" fill="#00D46C" />
    <path d="M16.9 15.5 4.8 22.2c-.4.2-.9.2-1.2 0L13.4 12l3.5 3.5Z" fill="#FF3A44" />
    <path d="m20.6 13.4-3.7 2.1-3.5-3.5 3.5-3.5 3.7 2.1c1 .6 1 2.2 0 2.8Z" fill="#FFC400" />
  </svg>
);

/** ChatGPT 风格图标：白底黑色绳结（简化） */
export const GptIcon: React.FC<{size?: number; plain?: boolean}> = ({size = 56, plain}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.24,
      background: '#fff',
      border: plain ? 'none' : '1px solid #E3E3E3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      flexShrink: 0,
    }}
  >
    <svg width={size * 0.66} height={size * 0.66} viewBox="-12 -12 24 24">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M-1.6 -9.6 C 3.6 -11.4 7.8 -7.6 6.6 -3.0 L 5.4 1.2" fill="none" stroke="#111" strokeWidth="2.1" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  </div>
);

/** Claude 风格图标：赤陶底白色星芒 */
export const ClaudeIcon: React.FC<{size?: number}> = ({size = 56}) => (
  <div style={{width: size, height: size, borderRadius: size * 0.24, background: '#D97757', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
    <Spark size={size * 0.62} color="#FFF8F3" />
  </div>
);

/** 中国银行风格图标（示意） */
export const BocIcon: React.FC<{size?: number}> = ({size = 56}) => (
  <div style={{width: size, height: size, borderRadius: size * 0.24, background: '#B81C22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
    <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="#fff" strokeWidth="2.4" />
      <rect x="7.4" y="8.6" width="9.2" height="6.8" rx="1.4" fill="none" stroke="#fff" strokeWidth="2.2" />
      <path d="M12 2.8 V8.6 M12 15.4 V21.2" stroke="#fff" strokeWidth="2.4" />
    </svg>
  </div>
);

/** 别的 AI App（不画具体品牌） */
export const GenericApp: React.FC<{k: number; size?: number}> = ({k, size = 56}) => {
  const bgs = ['linear-gradient(135deg,#6C8CFF,#3F5BD8)', 'linear-gradient(135deg,#2BC48A,#13875C)', 'linear-gradient(135deg,#FFB547,#F07B2B)', 'linear-gradient(135deg,#B57BFF,#7A43E0)', 'linear-gradient(135deg,#4FC7E8,#1E8FB8)', 'linear-gradient(135deg,#FF7DA6,#D9416E)'];
  const glyph = [
    <circle key="a" cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="2.6" />,
    <path key="b" d="M4 14 Q8 6 12 12 T20 10" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />,
    <path key="c" d="M12 4 L14.2 9.8 L20 12 L14.2 14.2 L12 20 L9.8 14.2 L4 12 L9.8 9.8 Z" fill="#fff" />,
    <path key="d" d="M13 3 L6 13 H11 L10 21 L18 10 H13 Z" fill="#fff" />,
    <path key="e" d="M5 6 H19 M5 12 H15 M5 18 H11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />,
    <path key="f" d="M12 4 L20 12 L12 20 L4 12 Z" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />,
  ][k % 6];
  return (
    <div style={{width: size, height: size, borderRadius: size * 0.24, background: bgs[k % 6], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        {glyph}
      </svg>
    </div>
  );
};

// ───────── ChatGPT ─────────
export const GPT = {menu: {x: 36, y: 68}, getPlus: {x: SW / 2, y: 68}, upgrade: {x: SW / 2, y: 872}, drawerAcct: {x: 150, y: 874}};
export const GptHome: React.FC<{plus?: boolean; t: number}> = ({plus}) => (
  <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
    <div style={{...abs(20, 56)}}>
      <svg width="30" height="24" viewBox="0 0 30 24">
        <path d="M4 7 H26 M4 17 H18" stroke="#111" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
    {plus ? (
      <div style={{...abs(0, 54, SW), textAlign: 'center', fontFamily: UI, fontWeight: 600, fontSize: 19, color: '#111'}}>
        ChatGPT <span style={{color: '#7A6FF0'}}>Plus</span>
      </div>
    ) : (
      <div
        style={{
          ...abs(GPT.getPlus.x - 66, 50, 132, 38),
          borderRadius: 19,
          background: '#EEEBFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontFamily: UI,
          fontWeight: 600,
          fontSize: 15.5,
          color: '#5B4CD6',
        }}
      >
        <Icon name="sparkles" size={17} color="#5B4CD6" sw={2.2} />
        {tr('获取 Plus', 'Get Plus')}
      </div>
    )}
    <div style={{...abs(SW - 54, 56)}}>
      <Icon name="edit" size={24} color="#111" sw={2} />
    </div>
    <div style={{...abs(0, 420, SW), textAlign: 'center', fontFamily: UI, fontWeight: 600, fontSize: 25, color: '#111'}}>{tr('有什么可以帮忙的？', 'What can I help with?')}</div>
    <div style={{...abs(14, SH - 108, SW - 28, 64), borderRadius: 32, border: '1px solid #E3E3E3', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', background: '#fff'}}>
      <div style={{...abs(18, 19)}}>
        <Icon name="plus" size={24} color="#111" sw={2} />
      </div>
      <div style={{...abs(56, 20), fontFamily: UI, fontSize: 17, color: '#8E8E8E'}}>{tr('询问任何问题', 'Ask anything')}</div>
      <div style={{...abs(SW - 28 - 98, 18)}}>
        <Icon name="mic" size={24} color="#111" sw={2} />
      </div>
      <div style={{...abs(SW - 28 - 56, 12, 40, 40), borderRadius: 20, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <svg width="18" height="16" viewBox="0 0 18 16">
          <path d="M2 6 V10 M6 3 V13 M10 5 V11 M14 2 V14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  </div>
);

/** 侧栏：底部是当前登录的账号 */
export const GptDrawer: React.FC<{p: number; hi?: number}> = ({p, hi = 0}) => {
  if (p <= 0) return null;
  const w = 340;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.3 * p})`}} />
      <div style={{...abs(-w + w * p, 0, w, SH), background: '#F9F9F9'}}>
        <div style={{...abs(16, 50, w - 32, 44), borderRadius: 22, background: '#EDEDED', display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, boxSizing: 'border-box'}}>
          <Icon name="search" size={18} color="#777" sw={2.2} />
          <span style={{fontFamily: UI, fontSize: 15, color: '#777'}}>{tr('搜索', 'Search')}</span>
        </div>
        {[tr('新聊天', 'New chat'), tr('图片', 'Images'), tr('探索 GPT', 'Explore GPTs')].map((s, k) => (
          <div key={k} style={{...abs(26, 120 + k * 46), fontFamily: UI, fontSize: 16.5, color: '#111'}}>{s}</div>
        ))}
        <div style={{...abs(26, 270), fontFamily: UI, fontSize: 13.5, color: '#8E8E8E'}}>{tr('聊天记录', 'Chats')}</div>
        {[150, 210, 120, 180, 160].map((wd, k) => (
          <div key={k} style={{...abs(26, 306 + k * 44, wd, 12), borderRadius: 6, background: '#E2E2E2'}} />
        ))}
        <div style={{...abs(10, SH - 102, w - 20, 70), borderRadius: 16, background: hi ? `rgba(122,111,240,${0.16 * hi})` : 'transparent'}}>
          <div style={{...abs(14, 14, 42, 42), borderRadius: 21, background: '#7A6FF0', color: '#fff', fontFamily: UI, fontWeight: 600, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>XY</div>
          <div style={{...abs(68, 12), fontFamily: UI, fontWeight: 600, fontSize: 16, color: '#111'}}>Xiao Yu</div>
          <div style={{...abs(68, 36), fontFamily: UI, fontSize: 13.5, color: '#666'}}>yourname@gmail.com</div>
        </div>
      </div>
    </div>
  );
};

export const GptPlans: React.FC<{press?: number}> = ({press = 0}) => (
  <div style={{position: 'absolute', inset: 0, background: '#fff'}}>
    <div style={{...abs(22, 56)}}>
      <Icon name="x" size={26} color="#111" sw={2.2} />
    </div>
    <div style={{...abs(0, 128, SW), textAlign: 'center', fontFamily: UI, fontWeight: 700, fontSize: 30, color: '#111'}}>ChatGPT Plus</div>
    <div style={{...abs(40, 176, SW - 80), textAlign: 'center', fontFamily: UI, fontSize: 16, color: '#5D5D5D', lineHeight: 1.45}}>{tr('更高的使用额度，更强的模型', 'Higher limits and more capable models')}</div>
    <div style={{...abs(34, 254, SW - 68, 360), borderRadius: 22, border: '1px solid #E5E5E5'}}>
      {[tr('更高的消息和上传额度', 'More messages and uploads'), tr('更强的推理模型', 'More capable reasoning models'), tr('更多图片生成', 'More image generation'), tr('深度研究和智能体', 'Deep research and agents'), tr('抢先体验新功能', 'Early access to new features')].map((s, k) => (
        <div key={k} style={{...abs(22, 26 + k * 64), display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 26, height: 26, borderRadius: 13, background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name="check" size={16} color="#5B4CD6" sw={3} />
          </div>
          <div style={{fontFamily: UI, fontSize: 16.5, color: '#111', whiteSpace: 'nowrap'}}>{s}</div>
        </div>
      ))}
    </div>
    <div style={{...abs(34, 650, SW - 68), textAlign: 'center', fontFamily: UI, fontSize: 13.5, color: '#8E8E8E'}}>{tr('通过 Google Play 付款，可随时取消', 'Billed through Google Play. Cancel anytime.')}</div>
    <div
      style={{
        ...abs(24, GPT.upgrade.y - 28, SW - 48, 56),
        borderRadius: 28,
        background: '#111',
        color: '#fff',
        fontFamily: UI,
        fontWeight: 600,
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${1 - 0.04 * press})`,
      }}
    >
      {tr('升级至 Plus', 'Upgrade to Plus')}
    </div>
  </div>
);

// ───────── Claude ─────────
export const CL = {avatar: {x: SW - 44, y: 68}, pro: {x: SW / 2, y: 302}};
export const ClaudeHome: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: '#FAF9F5'}}>
    <div style={{...abs(20, 56)}}>
      <svg width="30" height="24" viewBox="0 0 30 24">
        <path d="M4 7 H26 M4 17 H18" stroke="#3D3929" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
    <div style={{...abs(CL.avatar.x - 19, CL.avatar.y - 19, 38, 38), borderRadius: 19, background: '#3D3929', color: '#FAF9F5', fontFamily: UI, fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>XY</div>
    <div style={{...abs(0, 360, SW), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
      <Spark size={44} color="#D97757" />
      <div style={{fontFamily: F.serif, fontWeight: 500, fontSize: 28, color: '#141413'}}>{tr('晚上好，Xiao Yu', 'Evening, Xiao Yu')}</div>
    </div>
    <div style={{...abs(14, SH - 132, SW - 28, 88), borderRadius: 22, border: '1px solid #E6E3D9', background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.05)'}}>
      <div style={{...abs(18, 14), fontFamily: UI, fontSize: 17, color: '#8A877E'}}>{tr('向 Claude 提问…', 'Ask Claude…')}</div>
      <div style={{...abs(16, 50)}}>
        <Icon name="plus" size={22} color="#3D3929" sw={2} />
      </div>
      <div style={{...abs(SW - 28 - 52, 44, 36, 36), borderRadius: 10, background: '#D97757', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name="arrowUp" size={18} color="#fff" sw={2.6} />
      </div>
    </div>
  </div>
);

export const ClaudeSettings: React.FC<{hi?: number; pro?: boolean}> = ({hi = 0, pro}) => (
  <div style={{position: 'absolute', inset: 0, background: '#FAF9F5'}}>
    <div style={{...abs(20, 54)}}>
      <Icon name="arrowLeft" size={26} color="#141413" sw={2.2} />
    </div>
    <div style={{...abs(66, 54), fontFamily: UI, fontWeight: 600, fontSize: 21, color: '#141413'}}>{tr('设置', 'Settings')}</div>
    <div style={{...abs(16, 112, SW - 32, 120), borderRadius: 18, background: '#fff', border: '1px solid #E6E3D9'}}>
      <div style={{...abs(16, 20, 48, 48), borderRadius: 24, background: '#3D3929', color: '#FAF9F5', fontFamily: UI, fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>XY</div>
      <div style={{...abs(78, 20), fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#141413'}}>Xiao Yu</div>
      <div style={{...abs(78, 46), fontFamily: UI, fontSize: 14, color: '#73726C'}}>yourname@gmail.com</div>
      <div style={{...abs(78, 76, pro ? 72 : 96, 26), borderRadius: 13, background: pro ? '#F5E9E2' : '#F0EEE6', fontFamily: UI, fontWeight: 600, fontSize: 13, color: pro ? '#B4552F' : '#73726C', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {pro ? 'Pro' : tr('免费套餐', 'Free plan')}
      </div>
    </div>
    <div style={{...abs(16, CL.pro.y - 34, SW - 32, 68), borderRadius: 18, background: pro ? '#E9F3EC' : hi ? `rgba(217,119,87,${0.12 + 0.12 * hi})` : '#F5E9E2', border: pro ? '1px solid #BFDCC8' : '1px solid #EBC9B8', display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 18, boxSizing: 'border-box'}}>
      {pro ? <Icon name="check" size={24} color="#2C8A5A" sw={3} /> : <Spark size={26} color="#D97757" />}
      <div style={{fontFamily: UI, fontWeight: 600, fontSize: 17.5, color: '#141413'}}>{pro ? tr('你的套餐：Claude Pro', 'Your plan: Claude Pro') : tr('升级到 Pro', 'Upgrade to Pro')}</div>
    </div>
    {[tr('个人资料', 'Profile'), tr('外观', 'Appearance'), tr('通知', 'Notifications'), tr('隐私', 'Privacy'), tr('退出登录', 'Log out')].map((s, k) => (
      <div key={k} style={{...abs(34, 368 + k * 58), fontFamily: UI, fontSize: 17, color: k === 4 ? '#B3261E' : '#141413'}}>{s}</div>
    ))}
  </div>
);

/** 升级页（示意）：选套餐，最底下是订阅按钮，点了弹 Google Play 付款页 */
export const CLP = {month: {x: SW / 2, y: 606}, year: {x: SW / 2, y: 690}, btn: {x: SW / 2, y: 872}};
export const ClaudePlans: React.FC<{sel?: number; press?: number}> = ({sel = 0, press = 0}) => (
  <div style={{position: 'absolute', inset: 0, background: '#FAF9F5'}}>
    <div style={{...abs(22, 56)}}>
      <Icon name="x" size={26} color="#141413" sw={2.2} />
    </div>
    <div style={{...abs(0, 112, SW), display: 'flex', justifyContent: 'center'}}>
      <Spark size={42} color="#D97757" />
    </div>
    <div style={{...abs(0, 166, SW), textAlign: 'center', fontFamily: F.serif, fontWeight: 500, fontSize: 31, color: '#141413'}}>Claude Pro</div>
    <div style={{...abs(40, 214, SW - 80), textAlign: 'center', fontFamily: UI, fontSize: 16, color: '#73726C'}}>{tr('更多用量，解锁更多功能', 'More usage, more features')}</div>
    <div style={{...abs(28, 262, SW - 56, 266), borderRadius: 20, background: '#fff', border: '1px solid #E6E3D9'}}>
      {[tr('比免费版更多的用量', 'More usage than Free'), tr('项目：整理对话和资料', 'Projects for chats and files'), tr('更多 Claude 模型', 'More Claude models'), tr('在终端里用 Claude Code', 'Claude Code in your terminal')].map((s, k) => (
        <div key={k} style={{...abs(20, 26 + k * 58), display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 26, height: 26, borderRadius: 13, background: '#F5E9E2', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name="check" size={16} color="#B4552F" sw={3} />
          </div>
          <div style={{fontFamily: UI, fontSize: 16.5, color: '#141413', whiteSpace: 'nowrap'}}>{s}</div>
        </div>
      ))}
    </div>
    {[
      {y: CLP.month.y, title: tr('按月', 'Monthly'), sub: tr('US$20.00/月', 'US$20.00/mo')},
      {y: CLP.year.y, title: tr('按年', 'Yearly'), sub: tr('一次付一年', 'Billed yearly')},
    ].map((r, k) => {
      const on = k === 0;
      return (
        <div key={k} style={{...abs(28, r.y - 34, SW - 56, 68), borderRadius: 16, background: '#fff', border: on ? '2px solid #D97757' : '1.5px solid #E6E3D9', boxSizing: 'border-box', boxShadow: on ? `0 0 0 ${5 * sel}px rgba(217,119,87,0.16)` : 'none'}}>
          <div style={{...abs(18, 22, 24, 24), borderRadius: 12, border: on ? '7px solid #D97757' : '2px solid #C9C5B9', boxSizing: 'border-box', background: '#fff'}} />
          <div style={{...abs(56, 12), fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#141413'}}>{r.title}</div>
          <div style={{...abs(56, 38), fontFamily: UI, fontSize: 14, color: '#73726C'}}>{r.sub}</div>
        </div>
      );
    })}
    <div style={{...abs(28, 784, SW - 56), textAlign: 'center', fontFamily: UI, fontSize: 13.5, color: '#8A877E'}}>{tr('通过 Google Play 付款，可随时取消', 'Billed through Google Play. Cancel anytime.')}</div>
    <div style={{...abs(24, CLP.btn.y - 28, SW - 48, 56), borderRadius: 14, background: '#D97757', color: '#fff', fontFamily: UI, fontWeight: 600, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - 0.04 * press})`}}>
      {tr('订阅', 'Subscribe')}
    </div>
  </div>
);

// ───────── 中国银行 App（示意） ─────────
export const BOC = {zone: {x: 20 + 80 * 3.5, y: 262}, book: {x: SW / 2, y: 470}, mc: {x: SW / 2, y: 330}, apply: {x: SW / 2, y: 872}};
export const BocHome: React.FC<{hi?: number}> = ({hi = 0}) => {
  const items = [
    tr('收支记录', 'Records'),
    tr('热门活动', 'Events'),
    tr('存款管理', 'Deposits'),
    tr('B站专区', 'Bilibili'),
    tr('贷款', 'Loans'),
    tr('养老金融', 'Pension'),
    tr('薪酬管家', 'Payroll'),
    tr('活钱宝', 'Savings'),
    tr('积利金', 'Gold'),
    tr('更多', 'More'),
  ];
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F5F5F5'}}>
      <div style={{...abs(0, 0, SW, 190), background: 'linear-gradient(160deg,#C8232B,#A3161D)'}} />
      <div style={{...abs(22, 52), display: 'flex', alignItems: 'center', gap: 10}}>
        <BocIcon size={34} />
        <div style={{fontFamily: F.zh, fontWeight: 800, fontSize: 21, color: '#fff'}}>{tr('中国银行', 'Bank of China')}</div>
      </div>
      <div style={{...abs(22, 104, SW - 44, 40), borderRadius: 20, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14, boxSizing: 'border-box'}}>
        <Icon name="search" size={18} color="#fff" sw={2.2} />
        <span style={{fontFamily: UI, fontSize: 14.5, color: 'rgba(255,255,255,0.85)'}}>{tr('搜索功能、活动', 'Search')}</span>
      </div>
      <div style={{...abs(12, 168, SW - 24, 210), borderRadius: 18, background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.06)'}} />
      {items.map((s, k) => {
        const col = k % 5;
        const row = Math.floor(k / 5);
        const cx = 20 + 80 * (col + 0.5);
        const cy = 210 + row * 96;
        const on = k === 3;
        return (
          <div key={k} style={{...abs(cx - 40, cy - 30, 80, 90), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
            <div style={{width: 42, height: 42, borderRadius: 14, background: on ? '#FFE3EC' : '#FFF1EE', border: on && hi ? `${2.5 * hi}px solid #FB7299` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'}}>
              {on ? (
                <span style={{fontFamily: UI, fontWeight: 900, fontSize: 15, color: '#FB7299'}}>B</span>
              ) : (
                <div style={{width: 18, height: 18, borderRadius: k % 2 ? 9 : 4, border: '2.4px solid #D23B32'}} />
              )}
            </div>
            <div style={{fontFamily: F.zh, fontSize: 13, color: '#333', whiteSpace: 'nowrap', fontWeight: on ? 700 : 400}}>{s}</div>
          </div>
        );
      })}
      <div style={{...abs(12, 396, SW - 24, 150), borderRadius: 18, background: '#fff'}}>
        <div style={{...abs(18, 18, 120, 14), borderRadius: 7, background: '#EAEAEA'}} />
        <div style={{...abs(18, 48, 260, 10), borderRadius: 5, background: '#F0F0F0'}} />
        <div style={{...abs(18, 70, 200, 10), borderRadius: 5, background: '#F0F0F0'}} />
      </div>
    </div>
  );
};

/** 联名卡（示意，不画官方卡面插画） */
export const CoCard: React.FC<{w?: number; tilt?: number; num?: string}> = ({w = 300, tilt = 0, num = '•••• 4444'}) => {
  const h = w * 0.63;
  const u = w / 100;
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        borderRadius: 6 * u,
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#4FC8C0 0%,#2FA7B8 45%,#2B7FB0 100%)',
        boxShadow: '0 10px 0 rgba(35,40,66,0.12), 0 20px 40px rgba(35,40,66,0.25)',
        border: `${0.9 * u}px solid #232842`,
        transform: `rotate(${tilt}deg)`,
        boxSizing: 'border-box',
      }}
    >
      <svg width={w} height={h} viewBox="0 0 100 63" style={{position: 'absolute', left: 0, top: 0}}>
        <path d="M-5 44 Q20 30 40 42 T85 36 T110 30 V70 H-5 Z" fill="rgba(255,255,255,0.22)" />
        <path d="M-5 52 Q25 40 50 50 T110 44 V70 H-5 Z" fill="rgba(251,114,153,0.45)" />
        <circle cx="78" cy="16" r="10" fill="rgba(255,255,255,0.18)" />
        <circle cx="86" cy="24" r="6" fill="rgba(255,255,255,0.14)" />
      </svg>
      <div style={{position: 'absolute', left: 6 * u, top: 5 * u, fontFamily: F.zh, fontWeight: 800, fontSize: 5.2 * u, color: '#fff', whiteSpace: 'nowrap'}}>{tr('中国银行 × B站', 'BOC × Bilibili')}</div>
      <div style={{position: 'absolute', left: 6 * u, top: 23 * u, width: 12 * u, height: 9 * u, borderRadius: 1.6 * u, background: 'linear-gradient(135deg,#F7D774,#D9A934)'}} />
      <div style={{position: 'absolute', left: 6 * u, bottom: 6 * u, fontFamily: F.mono, fontSize: 4.6 * u, color: '#fff', letterSpacing: 0.5 * u}}>{num}</div>
      <div style={{position: 'absolute', right: 5 * u, bottom: 5 * u}}>
        <McMark h={9 * u} />
      </div>
    </div>
  );
};

export const BocEvent: React.FC<{hi?: number}> = ({hi = 0}) => (
  <div style={{position: 'absolute', inset: 0, background: '#F5F5F5'}}>
    <div style={{...abs(20, 52)}}>
      <Icon name="arrowLeft" size={24} color="#222" sw={2.2} />
    </div>
    <div style={{...abs(0, 52, SW), textAlign: 'center', fontFamily: F.zh, fontWeight: 700, fontSize: 18, color: '#222'}}>{tr('B站专区', 'Bilibili Zone')}</div>
    <div style={{...abs(12, 100, SW - 24, 260), borderRadius: 20, background: 'linear-gradient(160deg,#E9FBF8,#CDEFF5)', overflow: 'hidden'}}>
      <div style={{...abs(22, 22), fontFamily: F.zh, fontWeight: 900, fontSize: 22, color: '#1C6E86'}}>{tr('联名借记卡', 'Co-branded debit card')}</div>
      <div style={{...abs(22, 56), fontFamily: F.zh, fontSize: 14, color: '#3E8597'}}>{tr('线上预约 · 网点领卡', 'Book online, pick up at a branch')}</div>
      <div style={{...abs(170, 92)}}>
        <CoCard w={220} tilt={-6} />
      </div>
    </div>
    <div style={{...abs(12, 380, SW - 24, 150), borderRadius: 20, background: '#fff'}}>
      <div style={{...abs(20, 18), fontFamily: F.zh, fontWeight: 800, fontSize: 18, color: '#222'}}>{tr('线上预约', 'Online Booking')}</div>
      <div style={{...abs(20, 48), fontFamily: F.zh, fontSize: 14, color: '#888'}}>{tr('线上选号 · 限时免费', 'Pick your card online')}</div>
      <div style={{...abs(20, BOC.book.y - 380 - 22, SW - 64, 44), borderRadius: 22, background: hi ? '#E23C64' : '#FB7299', color: '#fff', fontFamily: F.zh, fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        {tr('立即预约', 'Book now')}
      </div>
    </div>
  </div>
);

export const BocPick: React.FC<{sel?: number; press?: number}> = ({sel = 0, press = 0}) => (
  <div style={{position: 'absolute', inset: 0, background: '#F5F5F5'}}>
    <div style={{...abs(20, 52)}}>
      <Icon name="arrowLeft" size={24} color="#222" sw={2.2} />
    </div>
    <div style={{...abs(0, 52, SW), textAlign: 'center', fontFamily: F.zh, fontWeight: 700, fontSize: 18, color: '#222'}}>{tr('选择卡片版本', 'Choose a version')}</div>
    {[tr('联名借记 IC 卡（银联版）', 'Debit card (UnionPay)'), tr('联名借记 IC 卡（万事达版）', 'Debit card (Mastercard)')].map((s, k) => {
      const on = k === 1 && sel > 0;
      return (
        <div key={k} style={{...abs(16, 230 + k * 100 - 40, SW - 32, 80), borderRadius: 18, background: '#fff', border: on ? `2.5px solid #FB7299` : '1.5px solid #EAEAEA', boxSizing: 'border-box'}}>
          <div style={{...abs(20, 26), fontFamily: F.zh, fontWeight: on ? 800 : 500, fontSize: 16.5, color: '#222', whiteSpace: 'nowrap'}}>{s}</div>
          <div style={{...abs(SW - 32 - 50, 26, 26, 26), borderRadius: 13, border: on ? 'none' : '2px solid #CCC', background: on ? '#FB7299' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box'}}>
            {on && <Icon name="check" size={16} color="#fff" sw={3.2} />}
          </div>
        </div>
      );
    })}
    <div style={{...abs(16, BOC.apply.y - 26, SW - 32, 52), borderRadius: 26, background: '#D7263D', color: '#fff', fontFamily: F.zh, fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - 0.04 * press})`}}>
      {tr('立即申请', 'Apply now')}
    </div>
  </div>
);

export const _a = [clamp, spring, SH];
