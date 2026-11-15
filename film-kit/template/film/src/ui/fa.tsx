import React from 'react';
import {C, F, shadow} from '../lib/theme';
import {Icon, PlayGlyph, Spark} from './icons';

// FAswitch 窗口：按 3.1.10 发布源码（tool/worktrees/20261110-release-3110/web）还原，
// 底子是上一期照 3.0.0 录屏画的那套。数据都是示例。坐标：窗口左上角为原点
export const FA_W = 1620;
export const FA_H = 900;
export const SIDE_W = 76;
export const X0 = 116; // 内容左边

/** 睡觉的鱼（FAswitch 的标，照录屏手绘） */
export const SleepyFish: React.FC<{w?: number; color?: string}> = ({w = 44, color = '#3A3F4B'}) => (
  <svg width={w} height={w * 0.5} viewBox="0 0 88 44" style={{display: 'block'}}>
    <path
      d="M10 30c6-9 22-15 38-15 12 0 22 4 26 9 2 3 1 6-3 8-7 4-19 5-31 4-9-1-17-2-22-1-3 1-6 4-9 6-1-4 0-8 3-11z"
      fill="#fff"
      stroke={color}
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    <path d="M10 30c-3-1-6-4-7-7M10 30c-3 2-5 6-5 9" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M38 16c1-4 4-7 8-7 2 2 2 5 1 7" fill="#fff" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M60 25c2 1 4 1 6 0" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M73 6h5l-5 5h5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 3.1.10 侧栏：账号、供应商、本机接口、代理接入、客户端、帮助、设置（index.html 第 26–34 行）
const NAV = ['users', 'plug', 'server', 'route', 'window', 'help', 'settings'] as const;
export type Nav = (typeof NAV)[number];
export const NAV_Y: Record<Nav, number> = {users: 196, plug: 258, server: 320, route: 382, window: 444, help: 506, settings: 568};
export const NAV_LABEL: Record<Nav, string> = {users: '账号', plug: '供应商', server: '本机接口', route: '代理接入', window: '客户端', help: '帮助', settings: '设置'};

export const FaWindow: React.FC<{
  w?: number;
  h?: number;
  active: Nav;
  children: React.ReactNode;
  scrollY?: number;
  navHover?: Nav;
  overlay?: React.ReactNode; // 不随页面滚动的弹窗
}> = ({w = FA_W, h = FA_H, active, children, scrollY = 0, navHover, overlay}) => (
  <div
    data-probe="skip"
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: w,
      height: h,
      borderRadius: 14,
      overflow: 'hidden',
      background: C.faBg,
      boxShadow: shadow.window,
      border: '1px solid rgba(35,40,66,0.10)',
      fontFamily: F.zh,
      color: C.faInk,
    }}
  >
    {/* 侧栏 */}
    <div style={{position: 'absolute', left: 0, top: 0, width: SIDE_W, height: h, background: '#FAFAFB', borderRight: `1px solid ${C.faLine}`}}>
      <div style={{position: 'absolute', left: 16, top: 30}}>
        <SleepyFish w={44} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 108 - 13, width: SIDE_W, display: 'flex', justifyContent: 'center', color: '#5B6170'}}>
        <Icon name="bell" size={24} sw={1.9} />
      </div>
      <div style={{position: 'absolute', left: 18, top: 150, width: 40, height: 1, background: C.faLine}} />
      {NAV.map((n) => {
        const y = NAV_Y[n];
        const on = n === active;
        const hov = navHover === n;
        return (
          <div
            key={n}
            style={{
              position: 'absolute',
              left: 12,
              top: y - 26,
              width: 52,
              height: 52,
              borderRadius: 14,
              background: on ? '#E4F2EA' : hov ? '#EEF0F2' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: on ? C.faGreen : '#5B6170',
            }}
          >
            <Icon name={n} size={25} sw={1.9} />
          </div>
        );
      })}
      {/* 底部：交流群、支持开发者、版本 */}
      <div style={{position: 'absolute', left: 0, top: h - 168, width: SIDE_W, display: 'flex', justifyContent: 'center', color: '#5B6170'}}>
        <Icon name="qq" size={24} sw={1.8} />
      </div>
      <div style={{position: 'absolute', left: 0, top: h - 112, width: SIDE_W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#5B6170'}}>
        <Icon name="heart" size={22} sw={2} color="#D0607A" />
        <div style={{fontSize: 12.5, fontWeight: 600}}>支持开发者</div>
      </div>
      <div style={{position: 'absolute', left: 0, top: h - 44, width: SIDE_W, textAlign: 'center', fontSize: 13, color: C.faMuted, fontFamily: F.ui}}>v3.1.10</div>
    </div>
    {/* 窗口按钮 */}
    <div style={{position: 'absolute', right: 8, top: 10, display: 'flex', color: '#3C4043', zIndex: 5}}>
      {['minus', 'square', 'x'].map((n) => (
        <div key={n} style={{width: 50, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Icon name={n} size={n === 'square' ? 13 : 16} sw={1.6} />
        </div>
      ))}
    </div>
    <div style={{position: 'absolute', left: SIDE_W, top: 0, width: w - SIDE_W, height: h, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -SIDE_W, top: -scrollY, width: w}}>{children}</div>
    </div>
    {overlay}
  </div>
);

// ───────── 小部件 ─────────
export const Btn: React.FC<{children: React.ReactNode; dim?: boolean; green?: boolean; style?: React.CSSProperties; hover?: number}> = ({
  children,
  dim,
  green,
  style,
  hover = 0,
}) => (
  <div
    style={{
      height: 40,
      padding: '0 16px',
      borderRadius: 10,
      border: green ? 'none' : `1px solid ${C.faLine}`,
      background: green ? (hover ? '#237A4B' : C.faGreen) : hover ? '#F1F3F5' : '#fff',
      color: green ? '#fff' : dim ? '#9AA0A8' : C.faInk,
      fontWeight: 600,
      fontSize: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      ...style,
    }}
  >
    {children}
  </div>
);

const Card: React.FC<{x: number; y: number; w: number; h: number; children: React.ReactNode}> = ({x, y, w, h, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      background: '#fff',
      borderRadius: 16,
      border: `1px solid ${C.faLine}`,
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    }}
  >
    {children}
  </div>
);

const CardHead: React.FC<{icon: string; title: string; sub: string}> = ({icon, title, sub}) => (
  <div style={{position: 'absolute', left: 24, top: 22, display: 'flex', gap: 14, alignItems: 'center'}}>
    <div style={{width: 42, height: 42, borderRadius: 11, background: '#F2F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4B5160'}}>
      <Icon name={icon} size={21} />
    </div>
    <div>
      <div style={{fontSize: 20, fontWeight: 700}}>{title}</div>
      <div style={{fontSize: 15.5, color: C.faMuted, marginTop: 3}}>{sub}</div>
    </div>
  </div>
);

// ───────── 代理接入页 ─────────
const CARD1_H = 532;
const CARD2_Y = 182 + CARD1_H + 22;
export const PROXY = {
  card1Y: 182,
  card2Y: CARD2_Y,
  tabInstall: {x: X0 + 171, y: 118, w: 130, h: 40},
  nameInput: {x: X0 + 24, y: CARD2_Y + 122, w: FA_W - X0 - 40 - 48, h: 46},
  nodeSelect: {x: X0 + 24, y: CARD2_Y + 222, w: FA_W - X0 - 40 - 48 - 150, h: 46},
  bindBtn: {x: X0 + 24, y: CARD2_Y + 380, w: 156, h: 44},
  aiBtn: {x: X0 + 24 + 168, y: CARD2_Y + 380, w: 156, h: 44},
  statusLine: {x: X0 + 24, y: CARD2_Y + 478, w: 560, h: 24},
  clashRow: {x: X0 + 18, y: 182 + 92, w: FA_W - X0 - 40 - 36, h: 66},
};

export const NODES = ['美国 · 洛杉矶 01', '美国 · 洛杉矶 02', '美国 · 纽约 01', '美国 · 西雅图 01', '日本 · 东京 01', '新加坡 01'];

// 3.1.10 客户端清单：Clash Verge Rev、FlClash、Mihomo Party、Clash Nyanpasu、v2rayN（proxy_access.CLIENT_SPECS）
const CLIENTS = ['Clash Verge Rev', 'FlClash', 'Mihomo Party', 'Clash Nyanpasu', 'v2rayN'];
// proxy_onboarding.ACTION_LABELS
const ACTS = ['下载客户端', '安装客户端', '初始化基础配置', '导入你自带的节点/订阅', '选择节点并绑定档案'];

export const ProxyPage: React.FC<{
  name: string;
  nameFocus?: boolean;
  caret?: boolean;
  node?: string;
  nodeOpen?: number; // 下拉展开 0..1
  nodeHover?: number; // 悬停第几个
  detect?: number; // 「已发现」高亮 0..1
  found?: boolean; // 认没认出来（false 时整页都是「没发现」）
  bindHover?: number;
  aiHover?: number;
  installHover?: number;
  bound?: number; // 绑定成功 0..1
}> = ({name, nameFocus, caret, node, nodeOpen = 0, nodeHover = -1, detect = 0, found = true, bindHover = 0, aiHover = 0, installHover = 0, bound = 0}) => {
  const cw = FA_W - X0 - 40;
  return (
    <>
      <div style={{position: 'absolute', left: X0, top: 26, fontSize: 32, fontWeight: 800, letterSpacing: 1}}>代理接入</div>
      <div style={{position: 'absolute', left: X0, top: 76, fontSize: 17, color: C.faMuted}}>接入本机已有的代理，或先安装一个代理客户端</div>
      <div style={{position: 'absolute', left: X0, top: 114, height: 48, borderRadius: 13, background: '#ECEEF1', padding: 4, display: 'flex', gap: 4, boxSizing: 'border-box'}}>
        <div style={{height: 40, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', fontWeight: 700, fontSize: 17}}>
          <Icon name="link" size={17} /> 接入已有代理
        </div>
        <div
          style={{
            height: 40,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 18px',
            fontWeight: 600,
            fontSize: 17,
            color: installHover > 0 ? C.faGreen : '#4B5160',
            background: installHover > 0 ? `rgba(255,255,255,${0.8 * installHover})` : 'transparent',
          }}
        >
          <Icon name="download" size={17} /> 首次安装
        </div>
      </div>
      {/* 卡片一：本机代理客户端 */}
      <Card x={X0} y={PROXY.card1Y} w={cw} h={CARD1_H}>
        <CardHead icon="monitor" title="本机代理客户端" sub="自动识别正在运行的代理；节点和订阅由你自己准备" />
        <div
          style={{
            position: 'absolute',
            left: 18,
            top: 92,
            width: cw - 36,
            height: 66,
            borderRadius: 12,
            background: detect > 0 ? `rgba(43,138,87,${0.07 * detect})` : 'transparent',
            outline: detect > 0 ? `2px solid rgba(43,138,87,${0.55 * detect})` : 'none',
          }}
        />
        {CLIENTS.map((n, i) => {
          const ok = found && i === 0;
          const s = ok ? '已发现 · verified-download' : i === 0 ? '没发现 · verified-download · 当前不可用' : '没发现 · 能力待实测 · 当前不可用';
          return (
            <div
              key={n}
              style={{
                position: 'absolute',
                left: 24,
                top: 92 + i * 70,
                width: cw - 48,
                height: 66,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                borderBottom: i < CLIENTS.length - 1 ? `1px solid ${C.faLine}` : 'none',
              }}
            >
              <div style={{width: 38, height: 38, borderRadius: 10, background: '#F2F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B6170'}}>
                <Icon name="monitor" size={18} />
              </div>
              <div style={{width: 330}}>
                <div style={{fontSize: 17.5, fontWeight: 600, fontFamily: F.ui}}>{n}</div>
                <div style={{fontSize: 14.5, color: ok && detect > 0.5 ? C.faGreen : C.faMuted, marginTop: 2, fontWeight: ok && detect > 0.5 ? 700 : 400, whiteSpace: 'nowrap'}}>{s}</div>
              </div>
              <div style={{flex: 1}} />
              {ACTS.map((a) => (
                <Btn key={a} dim={!ok} style={{height: 36, fontSize: 14.5, padding: '0 12px'}}>
                  {a}
                </Btn>
              ))}
              <div style={{width: 84, fontSize: 15, fontWeight: 700, color: i === 0 || i === 4 ? C.faGreen : 'transparent', marginLeft: 4}}>官方下载页</div>
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 24, top: 452, fontSize: 16, fontWeight: 700}}>接入方式</div>
        <div style={{position: 'absolute', left: 24, top: 480, fontSize: 15, color: C.faMuted}}>用已在运行的 Mihomo 兼容客户端 · 直接填标准代理端点</div>
      </Card>
      {/* 卡片二：绑定代理并建档 */}
      <Card x={X0} y={PROXY.card2Y} w={cw} h={520}>
        <CardHead icon="layers" title="绑定代理并建档" sub="建档和绑定是同一步：起个名字，选一个节点，就建好了" />
        <div style={{position: 'absolute', left: 24, top: 96, fontSize: 16.5, fontWeight: 700}}>档案名</div>
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 122,
            width: cw - 48,
            height: 46,
            borderRadius: 11,
            border: nameFocus ? `2px solid ${C.faGreen}` : `1px solid ${C.faLine}`,
            background: '#fff',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 17,
            boxShadow: nameFocus ? '0 0 0 4px rgba(43,138,87,0.12)' : 'none',
          }}
        >
          {name ? <span>{name}</span> : <span style={{color: '#A0A6AE'}}>例如：日常工作</span>}
          {caret && <span style={{display: 'inline-block', width: 2, height: 22, background: C.faInk, marginLeft: 2}} />}
        </div>
        <div style={{position: 'absolute', left: 24, top: 194, fontSize: 16.5, fontWeight: 700}}>节点</div>
        <div
          style={{
            position: 'absolute',
            left: 24,
            top: 222,
            width: cw - 48 - 150,
            height: 46,
            borderRadius: 11,
            border: nodeOpen > 0 ? `2px solid ${C.faGreen}` : `1px solid ${C.faLine}`,
            background: '#fff',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 17,
            fontWeight: 600,
          }}
        >
          <span style={{flex: 1}}>{node ?? '选择节点'}</span>
          <Icon name="chevDown" size={18} />
        </div>
        <Btn style={{position: 'absolute', left: cw - 24 - 136, top: 222, height: 46, width: 136, justifyContent: 'center'}}>
          <Icon name="refresh" size={17} /> 重新读取
        </Btn>
        <div style={{position: 'absolute', left: 24, top: 288, fontSize: 15.5, color: C.faMuted}}>读到 24 个节点，选一个就行：端口程序自己挑，不用填。</div>
        <div style={{position: 'absolute', left: 24, top: 324, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8}}>
          <Icon name="link" size={16} /> 没有节点？手动填代理地址 <Icon name="chevRight" size={16} />
        </div>
        <Btn green hover={bindHover} style={{position: 'absolute', left: 24, top: 380, height: 44}}>
          <Icon name="check" size={18} sw={2.6} /> 绑定并建档
        </Btn>
        <Btn hover={aiHover} style={{position: 'absolute', left: 24 + 168, top: 380, height: 44}}>
          <Icon name="sparkles" size={18} /> 让 AI 帮我建
        </Btn>
        <div style={{position: 'absolute', left: 24, top: 444, fontSize: 15.5, color: C.faMuted}}>
          不会配也没关系：点「让 AI 帮我建」，把生成的一段话发给能操作这台电脑的 AI，它会帮你绑好代理。
        </div>
        <div style={{position: 'absolute', left: 24, top: 478, fontSize: 15.5, color: bound > 0.5 ? C.faGreen : C.faMuted, fontWeight: bound > 0.5 ? 700 : 400}}>
          {bound > 0.5 ? '已保存并绑定到档案' : '以上来自本机实际检测；正常运行的宿主 TUN 不会被改动。'}
        </div>
        {/* 节点下拉 */}
        {nodeOpen > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 274,
              width: cw - 48 - 150,
              borderRadius: 12,
              background: '#fff',
              border: `1px solid ${C.faLine}`,
              boxShadow: '0 18px 40px rgba(16,24,40,0.18)',
              padding: 6,
              boxSizing: 'border-box',
              opacity: nodeOpen,
              transform: `translateY(${(1 - nodeOpen) * -10}px)`,
              zIndex: 10,
            }}
          >
            {NODES.map((n, i) => (
              <div
                key={n}
                style={{
                  height: 44,
                  borderRadius: 9,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  fontSize: 17,
                  fontWeight: i === nodeHover ? 700 : 500,
                  background: i === nodeHover ? '#E4F2EA' : 'transparent',
                  color: i === nodeHover ? C.faGreen : C.faInk,
                  gap: 10,
                }}
              >
                <div style={{width: 8, height: 8, borderRadius: 8, background: i < 4 ? '#7DBB98' : '#C9CDD3'}} />
                {n}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

// ───────── AI 建档指南（弹窗，文字照 index.html 第 640–665 行） ─────────
export const GUIDE = {w: 760, h: 740};
export const AiGuide: React.FC<{vis: number; copyHover?: number; copied?: number; name: string; node: string}> = ({vis, copyHover = 0, copied = 0, name, node}) => {
  if (vis <= 0) return null;
  const x = (FA_W - GUIDE.w) / 2;
  const y = (FA_H - GUIDE.h) / 2;
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: FA_W, height: FA_H, background: `rgba(30,34,45,${0.42 * vis})`}} />
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: GUIDE.w,
          height: GUIDE.h,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
          opacity: vis,
          transform: `scale(${0.94 + 0.06 * vis})`,
          padding: '28px 30px',
          boxSizing: 'border-box',
          fontSize: 15.5,
          color: C.faInk,
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800}}>AI 建档指南</div>
        <div style={{fontSize: 17, fontWeight: 700, marginTop: 18}}>让能操作这台电脑的 AI 帮你配置代理并建档。</div>
        <div style={{color: C.faMuted, marginTop: 6, lineHeight: 1.55}}>档案负责代理、自动时区和浏览器环境模板；账号在档案内直接添加，各自使用独立浏览器数据，由本人登录。</div>
        <div style={{fontWeight: 700, marginTop: 18}}>档案名</div>
        <div style={{height: 42, borderRadius: 10, border: `1px solid ${C.faLine}`, marginTop: 8, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 16.5}}>{name}</div>
        <div style={{fontWeight: 700, marginTop: 14}}>节点（出口走哪一个）</div>
        <div style={{height: 42, borderRadius: 10, border: `1px solid ${C.faLine}`, marginTop: 8, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 16.5}}>
          <span style={{flex: 1}}>{node}</span>
          <Icon name="chevDown" size={16} />
        </div>
        <div style={{fontWeight: 700, marginTop: 14}}>出网方式</div>
        <div style={{height: 42, borderRadius: 10, border: `1px solid ${C.faLine}`, marginTop: 8, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 16.5}}>
          <span style={{flex: 1}}>代理（默认）</span>
          <Icon name="chevDown" size={16} />
        </div>
        <div style={{marginTop: 18, lineHeight: 1.65}}>
          <div>
            1. <b>填档案名，再选出网方式</b>：选代理就填节点；<b>端口不用你填</b>，程序会自己挑一个空闲端口并建好监听。
          </div>
          <div>
            2. <b>复制</b>下方的配置请求，粘贴给能操作这台电脑的 AI。
          </div>
          <div>
            3. <b>AI 建好后刷新档案</b>，在右上角选择档案并点「切换」。在账号卡「⋯ → 登录」由本人登录。
          </div>
        </div>
        <div style={{marginTop: 14, background: '#F5F6F8', borderRadius: 10, padding: '12px 14px', color: '#4B5160'}}>
          {copied > 0.5 ? '已复制，下一步：粘贴给能操作这台电脑的 AI —— 档案名和节点已经在请求里了。' : '复制后粘贴给能操作这台电脑的 AI，让它按你填的档案名和节点建档（端口由程序自己挑）。'}
        </div>
        <div style={{position: 'absolute', right: 30, bottom: 26, display: 'flex', gap: 12, alignItems: 'center'}}>
          <div style={{color: C.faGreen, fontWeight: 700, marginRight: 8}}>看教学视频</div>
          <Btn>关闭</Btn>
          <Btn>AI 完成后，刷新档案</Btn>
          <Btn green hover={copyHover}>复制配置请求给 AI</Btn>
        </div>
      </div>
    </>
  );
};
export const GUIDE_COPY = {x: (FA_W - GUIDE.w) / 2 + GUIDE.w - 30 - 92, y: (FA_H - GUIDE.h) / 2 + GUIDE.h - 26 - 20};

// ───────── 账号页 ─────────
export type FaRow = {
  kind: 'gpt' | 'claude';
  name: string;
  plan?: string; // 档位
  email?: string; // 没有就显示「未登录」
  usage?: number; // 0..1
  current?: boolean;
  glow?: number; // 刚登录好那一下的高亮
};

/** 账号卡「⋯」菜单（account-v10.js 第 1080–1090 行的顺序和文字） */
export type MenuItem = {label: string; icon: string; dim?: boolean; danger?: boolean} | 'sep';
export const rowMenu = (current: boolean, kind: 'gpt' | 'claude'): MenuItem[] => [
  {label: current ? '已是当前账号' : '切换到此账号', icon: 'swap', dim: current},
  {label: kind === 'gpt' ? '启动 Codex' : '启动 Claude', icon: 'playO'},
  {label: '登录…', icon: 'logIn'},
  {label: '改名…', icon: 'edit'},
  kind === 'gpt' ? {label: '测降智…', icon: 'activity'} : {label: '查 KYC 状态…', icon: 'shieldCheck'},
  'sep',
  {label: '清理缓存…', icon: 'eraser'},
  {label: '删除…', icon: 'trash', danger: true},
];
export const MENU_IDX = {login: 2};
const MENU_TOP = 80;
const MENU_ITEM_H = 44;
/** 菜单第 k 项（不数分隔线）的中心，相对账号行左上角 */
export const menuItemY = (k: number) => MENU_TOP + 6 + k * MENU_ITEM_H + MENU_ITEM_H / 2 + (k >= 5 ? 13 : 0);

export const ACC = {
  selector: {x: FA_W - 770, y: 24, w: 330, h: 48},
  switchBtn: {x: FA_W - 428, y: 24, w: 116, h: 48},
  tabGpt: {x: X0 + 6, y: 152, w: 118, h: 42},
  tabClaude: {x: X0 + 130, y: 152, w: 138, h: 42},
  addBtn: {x: FA_W - 196, y: 150, w: 120, h: 46},
  rowY: 220,
  rowH: 96,
  rowW: FA_W - X0 - 40,
  chipsY: 84,
};
/** 某一行右侧按钮的位置（窗口坐标）；banner 是行上方有提示条时整体下移的量 */
export const rowBtn = (i: number, which: 'globe' | 'play' | 'more' | 'current', banner = 0) => {
  const y = ACC.rowY + banner + i * (ACC.rowH + 14) + ACC.rowH / 2;
  const right = X0 + ACC.rowW;
  const x = {more: right - 46, globe: right - 104, play: right - 160, current: right - 252}[which];
  return {x, y};
};
export const BANNER_H = 62;

/** 顶栏胶囊的位置（窗口坐标，左、宽），给圈注用 */
export const CHIP_X = {region: X0, tz: X0 + 150, cons: X0 + 392, ip: X0 + 536, wb: X0 + 856};
export const CHIP_W = {region: 140, tz: 232, cons: 134, ip: 310, wb: 150};

const Chip: React.FC<{icon: string; children: React.ReactNode; tone?: 'ok' | 'wait' | 'plain'; glow?: number; w: number}> = ({icon, children, tone = 'plain', glow = 0, w}) => (
  <div
    style={{
      height: 36,
      width: w,
      boxSizing: 'border-box',
      borderRadius: 18,
      border: `1px solid ${tone === 'ok' ? 'rgba(43,138,87,0.35)' : C.faLine}`,
      background: tone === 'ok' ? `rgba(231,244,236,${0.6 + 0.4 * glow})` : '#fff',
      color: tone === 'wait' ? '#9AA0A8' : tone === 'ok' ? C.faGreen : '#3B414D',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 14px',
      fontSize: 16,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      boxShadow: glow > 0 ? `0 0 0 ${6 * glow}px rgba(43,138,87,${0.15 * glow})` : 'none',
    }}
  >
    <Icon name={icon} size={16} />
    {children}
  </div>
);

export const GptGlyph: React.FC<{size?: number}> = ({size = 22}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="#1F2328" strokeWidth="2" />
    <path d="M8 12a4 4 0 0 1 8 0" fill="none" stroke="#1F2328" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.6" fill="#1F2328" />
  </svg>
);

export type Banner = {kind: 'switch' | 'login' | 'done'; text: string; spin?: number};

export const AccountsPage: React.FC<{
  title: string;
  chips: 'none' | 'checking' | 'ok';
  okGlow?: number;
  ipGlow?: number;
  tab: 'gpt' | 'claude';
  rows: FaRow[];
  selectorText?: string;
  dropdown?: number; // 档案下拉 0..1
  dropHover?: number;
  banner?: Banner; // 行上方的提示条（切换中、登录中、登录完成）
  bannerVis?: number;
  switchHover?: number;
  rowGlow?: number;
  hoverBtn?: {row: number; which: 'globe' | 'play' | 'more'};
  moreMenu?: number;
  menuHover?: number;
  addHover?: number;
  tabHover?: 'gpt' | 'claude';
}> = ({title, chips, okGlow = 0, ipGlow = 0, tab, rows, selectorText = '选择档案', dropdown = 0, dropHover = -1, banner, bannerVis = 0, switchHover = 0, rowGlow = 0, hoverBtn, moreMenu = 0, menuHover = -1, addHover = 0, tabHover}) => {
  const tabs = [
    {id: 'gpt', label: 'GPT', n: 1, x: ACC.tabGpt},
    {id: 'claude', label: 'Claude', n: 1, x: ACC.tabClaude},
  ];
  const shift = BANNER_H * bannerVis;
  return (
    <>
      <div style={{position: 'absolute', left: X0, top: 26, fontSize: 32, fontWeight: 800}}>{title}</div>
      {chips !== 'none' && (
        <div style={{position: 'absolute', left: X0, top: ACC.chipsY, display: 'flex', gap: 10}}>
          <Chip icon="pin" w={CHIP_W.region}>美国·洛杉矶</Chip>
          <Chip icon="clock" w={CHIP_W.tz}>America/Los_Angeles</Chip>
          {chips === 'checking' ? (
            <Chip icon="shield" tone="wait" w={CHIP_W.cons}>
              一致性 …
            </Chip>
          ) : (
            <Chip icon="shieldCheck" tone="ok" glow={okGlow} w={CHIP_W.cons}>
              一致性 <b style={{marginLeft: 2}}>100</b>
            </Chip>
          )}
          {chips === 'checking' ? (
            <Chip icon="signal" tone="wait" w={CHIP_W.ip}>
              IP 检测中
            </Chip>
          ) : (
            <Chip icon="signal" tone="ok" glow={ipGlow} w={CHIP_W.ip}>
              IP <b style={{marginLeft: 2}}>92</b> 舒适 · 住宅 · 原生 · 低风险
            </Chip>
          )}
          <Chip icon="code" w={CHIP_W.wb}>
            工作浏览器 <Icon name="chevDown" size={14} />
          </Chip>
        </div>
      )}
      {/* 右上：选择档案、切换、管理档案 */}
      <div
        style={{
          position: 'absolute',
          left: ACC.selector.x,
          top: ACC.selector.y,
          width: ACC.selector.w,
          height: ACC.selector.h,
          borderRadius: 12,
          border: dropdown > 0 ? `2px solid ${C.faGreen}` : `1px solid ${C.faLine}`,
          background: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 16px',
          fontSize: 17,
          fontWeight: 700,
        }}
      >
        <Icon name="layers" size={18} />
        <span style={{flex: 1}}>{selectorText}</span>
        <Icon name={dropdown > 0 ? 'chevUp' : 'chevDown'} size={17} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: ACC.switchBtn.x,
          top: ACC.switchBtn.y,
          width: ACC.switchBtn.w,
          height: ACC.switchBtn.h,
          borderRadius: 12,
          background: switchHover > 0 ? '#237A4B' : selectorText !== title && selectorText !== '选择档案' ? C.faGreen : '#F1F2F4',
          color: switchHover > 0 || (selectorText !== title && selectorText !== '选择档案') ? '#fff' : '#A0A6AE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 17,
          fontWeight: 700,
          transform: switchHover > 0 ? 'scale(1.04)' : 'none',
        }}
      >
        <Icon name="swap" size={17} /> 切换
      </div>
      <div style={{position: 'absolute', left: ACC.switchBtn.x + ACC.switchBtn.w + 18, top: 36, color: '#4B5160'}}>
        <Icon name="sliders" size={22} />
      </div>
      {/* 标签 */}
      <div style={{position: 'absolute', left: X0, top: 146, height: 54, borderRadius: 14, background: '#ECEEF1', width: 280}} />
      {tabs.map((tb) => {
        const on = tb.id === tab;
        const hov = tabHover === tb.id && !on;
        return (
          <div
            key={tb.id}
            style={{
              position: 'absolute',
              left: tb.x.x,
              top: tb.x.y,
              width: tb.x.w,
              height: tb.x.h,
              borderRadius: 10,
              background: on ? '#fff' : hov ? 'rgba(255,255,255,0.6)' : 'transparent',
              boxShadow: on ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 18,
              fontWeight: 700,
              fontFamily: F.ui,
              color: on ? C.faInk : '#5B6170',
            }}
          >
            {tb.id === 'gpt' ? <GptGlyph size={20} /> : <Spark size={20} color="#2A2D33" />}
            {tb.label}
            <span style={{fontWeight: 500, color: C.faMuted}}>{tb.n}</span>
          </div>
        );
      })}
      {/* 工具 */}
      <div style={{position: 'absolute', left: FA_W - 380, top: 160, display: 'flex', gap: 30, color: '#4B5160'}}>
        <Icon name="search" size={21} />
        <Icon name="refresh" size={21} />
        <Icon name="archive" size={21} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: ACC.addBtn.x,
          top: ACC.addBtn.y,
          height: ACC.addBtn.h,
          borderRadius: 12,
          background: addHover > 0 ? '#237A4B' : C.faGreen,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          fontSize: 18,
          fontWeight: 700,
          transform: addHover > 0 ? 'scale(1.05)' : 'none',
        }}
      >
        <Icon name="plus" size={18} sw={2.6} /> 账号
      </div>
      {/* 提示条：切换中、登录中、登录完成 */}
      {banner && bannerVis > 0 && (
        <div
          style={{
            position: 'absolute',
            left: X0,
            top: 214,
            width: ACC.rowW,
            height: 48,
            borderRadius: 12,
            background: banner.kind === 'done' ? '#EAF5EE' : '#F1F3F5',
            border: `1px solid ${banner.kind === 'done' ? 'rgba(43,138,87,0.3)' : C.faLine}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 10px 0 18px',
            fontSize: 16.5,
            color: banner.kind === 'done' ? C.faGreen : '#3B414D',
            fontWeight: banner.kind === 'done' ? 700 : 500,
            opacity: bannerVis,
            boxSizing: 'border-box',
          }}
        >
          {banner.kind === 'done' ? (
            <Icon name="check" size={18} sw={2.8} />
          ) : (
            <div style={{width: 18, height: 18, borderRadius: '50%', border: '2.5px solid #C7CBD1', borderTopColor: C.faGreen, boxSizing: 'border-box', transform: `rotate(${banner.spin ?? 0}deg)`}} />
          )}
          <span style={{flex: 1}}>{banner.text}</span>
          {banner.kind === 'login' && <Btn style={{height: 34, fontSize: 14.5, padding: '0 12px'}}>取消登录</Btn>}
        </div>
      )}
      {/* 账号行 */}
      {rows.map((r, i) => {
        const y = ACC.rowY + shift + i * (ACC.rowH + 14);
        const hb = hoverBtn && hoverBtn.row === i ? hoverBtn.which : undefined;
        const g = r.glow ?? 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: X0,
              top: y,
              width: ACC.rowW,
              height: ACC.rowH,
              borderRadius: 16,
              background: g > 0 ? `rgba(234,245,238,${g})` : '#fff',
              border: `1px solid ${C.faLine}`,
              borderLeft: r.current ? `4px solid ${C.faGreen}` : `1px solid ${C.faLine}`,
              boxShadow: rowGlow > 0 ? `0 0 0 ${5 * rowGlow}px rgba(229,104,63,${0.22 * rowGlow})` : '0 1px 2px rgba(16,24,40,0.04)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 22,
                top: 20,
                width: 54,
                height: 54,
                borderRadius: 14,
                background: '#F2F3F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {r.kind === 'gpt' ? <GptGlyph size={28} /> : <Spark size={28} color="#2A2D33" />}
            </div>
            <div style={{position: 'absolute', left: 96, top: 20, display: 'flex', alignItems: 'center', gap: 10}}>
              <div style={{fontSize: 21, fontWeight: 800, fontFamily: F.ui}}>{r.name}</div>
              <div style={{height: 26, borderRadius: 8, background: '#F2F3F5', padding: '0 9px', display: 'flex', alignItems: 'center', fontSize: 14.5, fontWeight: 700, color: r.plan ? '#3B414D' : '#9AA0A8', fontFamily: F.ui}}>
                {r.plan ?? '档位未知'}
              </div>
            </div>
            {r.email ? (
              <div style={{position: 'absolute', left: 96, top: 54, fontSize: 16, color: C.faMuted, fontFamily: F.ui}}>{r.email}</div>
            ) : (
              <div style={{position: 'absolute', left: 96, top: 55, height: 24, borderRadius: 7, background: '#F2F3F5', padding: '0 9px', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600, color: '#8A9099'}}>未登录</div>
            )}
            {/* 用量 */}
            <div style={{position: 'absolute', left: 640, top: 36, display: 'flex', alignItems: 'center', gap: 16, fontSize: 15.5, color: '#5B6170', fontFamily: F.ui}}>
              {r.usage !== undefined ? (
                <>
                  <span style={{fontFamily: F.zh}}>1周</span>
                  <div style={{width: 200, height: 8, borderRadius: 8, background: '#ECEEF1', overflow: 'hidden'}}>
                    <div style={{width: `${r.usage * 100}%`, height: '100%', background: C.faGreen, borderRadius: 8}} />
                  </div>
                  <span style={{width: 44}}>{Math.round(r.usage * 100)}%</span>
                  <span>11/16 09:00</span>
                </>
              ) : (
                <div style={{height: 28, borderRadius: 8, background: '#F2F3F5', padding: '0 12px', display: 'flex', alignItems: 'center', color: '#9AA0A8', fontFamily: F.zh}}>额度 未获取</div>
              )}
            </div>
            {/* 右侧按钮 */}
            <div style={{position: 'absolute', right: 296, top: 36, color: '#9AA0A8'}}>
              <Icon name="refresh" size={19} />
            </div>
            {r.current && (
              <div
                style={{
                  position: 'absolute',
                  right: 206,
                  top: 28,
                  height: 40,
                  borderRadius: 12,
                  background: C.faGreenSoft,
                  color: C.faGreen,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 14px',
                  fontSize: 16.5,
                  fontWeight: 700,
                }}
              >
                <Icon name="check" size={16} sw={2.6} /> 当前
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                right: 138,
                top: 26,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: hb === 'play' ? '#237A4B' : C.faGreen,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: hb === 'play' ? 'scale(1.08)' : 'none',
              }}
            >
              <PlayGlyph size={18} />
            </div>
            <div
              style={{
                position: 'absolute',
                right: 82,
                top: 26,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: hb === 'globe' ? '#E4F2EA' : 'transparent',
                color: hb === 'globe' ? C.faGreen : '#3B414D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: hb === 'globe' ? 'scale(1.08)' : 'none',
              }}
            >
              <Icon name="globe" size={23} />
            </div>
            <div
              style={{
                position: 'absolute',
                right: 24,
                top: 26,
                width: 44,
                height: 44,
                borderRadius: 12,
                background: hb === 'more' ? '#EEF0F2' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3B414D',
              }}
            >
              <Icon name="more" size={22} sw={2.6} />
            </div>
            {moreMenu > 0 && i === 0 && (
              <div
                style={{
                  position: 'absolute',
                  right: 18,
                  top: MENU_TOP,
                  width: 210,
                  borderRadius: 12,
                  background: '#fff',
                  border: `1px solid ${C.faLine}`,
                  boxShadow: '0 16px 36px rgba(16,24,40,0.18)',
                  padding: 6,
                  opacity: moreMenu,
                  transform: `translateY(${(1 - moreMenu) * -8}px)`,
                  zIndex: 10,
                }}
              >
                {(() => {
                  let k = -1;
                  return rowMenu(!!r.current, r.kind).map((m, j) => {
                    if (m === 'sep') return <div key={`sep${j}`} style={{height: 1, margin: '6px 8px', background: C.faLine}} />;
                    k += 1;
                    const on = menuHover === k && !m.dim;
                    return (
                      <div
                        key={m.label}
                        style={{
                          height: MENU_ITEM_H,
                          borderRadius: 9,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '0 14px',
                          fontSize: 17,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: on ? '#E4F2EA' : 'transparent',
                          color: m.dim ? '#A3A8B0' : on ? C.faGreen : m.danger ? '#C23A28' : C.faInk,
                        }}
                      >
                        <Icon name={m.icon} size={17} />
                        {m.label}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        );
      })}
      {/* 档案下拉 */}
      {dropdown > 0 && (
        <div
          style={{
            position: 'absolute',
            left: ACC.selector.x,
            top: ACC.selector.y + ACC.selector.h + 8,
            width: ACC.selector.w,
            borderRadius: 14,
            background: '#fff',
            border: `1px solid ${C.faLine}`,
            boxShadow: '0 18px 40px rgba(16,24,40,0.18)',
            padding: 8,
            boxSizing: 'border-box',
            opacity: dropdown,
            transform: `translateY(${(1 - dropdown) * -10}px)`,
            zIndex: 20,
          }}
        >
          {[
            {n: '默认', cur: true},
            {n: '日常工作', cur: false},
          ].map((d, k) => (
            <div
              key={d.n}
              style={{
                height: 48,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 17.5,
                fontWeight: k === dropHover ? 700 : 500,
                background: k === dropHover ? '#E4F2EA' : 'transparent',
                color: k === dropHover ? C.faGreen : C.faInk,
              }}
            >
              <span style={{flex: 1}}>{d.n}</span>
              {d.cur && <span style={{fontSize: 13.5, color: '#9AA0A8', background: '#F2F3F5', borderRadius: 7, padding: '2px 8px'}}>当前</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
export const DROP_ITEM = (k: number) => ({x: ACC.selector.x + 80, y: ACC.selector.y + ACC.selector.h + 8 + 8 + k * 48 + 24});

/** 窗口底部的提示条：busy 带转圈，ok 带勾 */
export const FaToast: React.FC<{vis: number; text: string; kind: 'busy' | 'ok'; spin?: number}> = ({vis, text, kind, spin = 0}) => {
  if (vis <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: FA_W / 2,
        top: FA_H - 92,
        transform: `translate(-50%, ${(1 - vis) * 16}px)`,
        opacity: vis,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 46,
        borderRadius: 12,
        background: '#15191E',
        color: '#F4F6F8',
        padding: '0 20px',
        fontFamily: F.zh,
        fontSize: 17,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: '0 12px 30px rgba(16,24,40,0.28)',
        zIndex: 25,
      }}
    >
      {kind === 'busy' ? (
        <div style={{width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#4CC38A', boxSizing: 'border-box', transform: `rotate(${spin}deg)`}} />
      ) : (
        <Icon name="check" size={18} color="#4CC38A" sw={2.8} />
      )}
      {text}
    </div>
  );
};
