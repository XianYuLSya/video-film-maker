import React from 'react';
import {clamp} from '../lib/anim';
import {F} from '../lib/theme';
import {Icon} from './icons';

// Codex 桌面版示意（按本机 Codex 26.1103 安装包里的中文界面文字、往期录屏里的布局画；只画这一段要用的部分）
// 窗口 1620×900，坐标都是窗口内的
export const CX = {
  w: 1620,
  h: 900,
  bar: 34,
  rail: 46,
  side: 300, // 侧栏右边界
  newChat: {x: 60, y: 76, w: 226, h: 34},
  threadY0: 196, // 项目下第一条线程
  threadH: 32,
  avatar: {x: 24, y: 868},
  more: {x: 1548, y: 57}, // 线程右上角「⋯」
  menu: {x: 1330, y: 76, w: 236, rowH: 40},
  setNavY0: 120,
  setNavH: 32,
  rowDel: {x: 1418, y: 214}, // 已归档列表第一行「删除」中心
};

export const THREADS = ['整理周报', '重构登录页', '修复导出 bug'];
export const OLD = 1; // 降智过的那条
export const MENU = ['重命名聊天', '复制为 Markdown', '在新窗口中打开', '归档聊天'];
export const SET_NAV = ['常规', '通知', '导入', '个人资料', '外观', '账户', '已归档的聊天', '家长控制', '受信任联系人', '语音', '存储', '配置', '个性化', '键盘快捷键', '使用情况和计费', '数据管理'];
export const SET_ARCH = 6;

export const threadRow = (k: number) => ({x: 60, y: CX.threadY0 + k * CX.threadH, w: 226, h: 28});
export const menuRow = (k: number) => ({x: CX.menu.x + CX.menu.w / 2, y: CX.menu.y + 8 + k * CX.menu.rowH + CX.menu.rowH / 2});
export const setNavRow = (k: number) => ({x: 150, y: CX.setNavY0 + k * CX.setNavH + 14});

const ink = '#1F1F1F';
const mute = '#8A8A8A';
const line = '#E7E7E7';

export type Msg = {who: 'me' | 'ai'; text: string};

export type CodexState = {
  view: 'chat' | 'settings';
  sel?: number; // 选中的线程，-1 = 新聊天
  threadVis?: number[]; // 每条线程的高度占比（归档时收起）
  oldTag?: number; // 「降智过」标签可见度
  oldBan?: number; // 禁止再进
  title?: string;
  msgs?: Msg[];
  error?: number; // 容量上限提示
  retryHover?: number;
  retryBan?: number;
  empty?: number; // 新聊天空白页
  menu?: number; // 「⋯」菜单
  menuHover?: number;
  moreHover?: number;
  newHover?: number;
  userMenu?: number;
  userMenuHover?: number;
  navHover?: number;
  archRows?: number; // 已归档列表里那一条的可见度
  archPage?: number; // 右侧是不是「已归档的聊天」页
  delHover?: number;
  dialog?: number;
  dialogHover?: number;
  emptyArch?: number;
};

const Bar: React.FC = () => (
  <div style={{position: 'absolute', left: 0, top: 0, width: CX.w, height: CX.bar, display: 'flex', alignItems: 'center', gap: 22, padding: '0 16px', fontFamily: F.zh, fontSize: 14, color: '#6B6B6B', boxSizing: 'border-box', background: '#F7F7F7', borderBottom: `1px solid ${line}`}}>
    {['文件', '编辑', '查看', '帮助'].map((s) => (
      <span key={s}>{s}</span>
    ))}
    <div style={{flex: 1}} />
    {['minus', 'square', 'x'].map((n) => (
      <div key={n} style={{width: 36, display: 'flex', justifyContent: 'center'}}>
        <Icon name={n} size={n === 'square' ? 11 : 14} sw={1.6} color="#555" />
      </div>
    ))}
  </div>
);

const Rail: React.FC = () => (
  <div style={{position: 'absolute', left: 0, top: CX.bar, width: CX.rail, bottom: 0, background: '#EFEFEF', borderRight: `1px solid ${line}`}}>
    {['chat', 'clock', 'bookOpen', 'globe', 'more', 'code', 'shapes'].map((n, k) => (
      <div key={n} style={{position: 'absolute', left: 13, top: 22 + k * 46, opacity: 0.55}}>
        <Icon name={n} size={20} sw={1.8} color="#444" />
      </div>
    ))}
  </div>
);

const Avatar: React.FC<{hl?: number}> = ({hl = 0}) => (
  <div style={{position: 'absolute', left: CX.avatar.x - 14, top: CX.avatar.y - 14, width: 28, height: 28, borderRadius: 14, background: '#3F6FD6', color: '#fff', fontFamily: F.ui, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hl > 0 ? `0 0 0 ${4 * hl}px rgba(63,111,214,0.25)` : undefined}}>
    咸
  </div>
);

const Side: React.FC<{s: CodexState}> = ({s}) => {
  const vis = s.threadVis ?? THREADS.map(() => 1);
  let y = CX.threadY0;
  return (
    <div style={{position: 'absolute', left: CX.rail, top: CX.bar, width: CX.side - CX.rail, bottom: 0, background: '#F6F6F6', borderRight: `1px solid ${line}`, fontFamily: F.zh}}>
      <div style={{position: 'absolute', left: 16, top: 10, fontFamily: F.ui, fontWeight: 700, fontSize: 16, color: ink}}>Codex</div>
      <div style={{position: 'absolute', right: 14, top: 12, display: 'flex', gap: 12, opacity: 0.5}}>
        <Icon name="bell" size={15} sw={1.8} color="#444" />
        <Icon name="search" size={15} sw={1.8} color="#444" />
      </div>
      <div style={{position: 'absolute', left: CX.newChat.x - CX.rail, top: CX.newChat.y - CX.bar - 17, width: CX.newChat.w, height: CX.newChat.h, borderRadius: 8, background: s.newHover ? `rgba(0,0,0,${0.06 * s.newHover})` : 'transparent', display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', boxSizing: 'border-box', fontSize: 15, color: ink}}>
        <Icon name="pencil" size={15} sw={1.9} color="#333" /> 新聊天
      </div>
      <div style={{position: 'absolute', left: 16, top: 98, fontSize: 13, color: mute}}>项目</div>
      <div style={{position: 'absolute', left: 14, top: 120, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: ink}}>
        <Icon name="folder" size={15} sw={1.8} color="#444" /> 示例项目
      </div>
      {THREADS.map((name, k) => {
        const v = clamp(vis[k]);
        const top = y - CX.bar;
        y += CX.threadH * v;
        if (v <= 0.01) return null;
        const on = s.sel === k;
        const tag = k === OLD ? s.oldTag ?? 0 : 0;
        const ban = k === OLD ? s.oldBan ?? 0 : 0;
        return (
          <div key={name} style={{position: 'absolute', left: 14, top: top, width: CX.side - CX.rail - 28, height: 28 * v, overflow: 'hidden', opacity: v}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 8, background: on ? '#E6E6E6' : 'transparent'}} />
            <div style={{position: 'absolute', left: 24, top: 4, fontSize: 14.5, color: ban > 0.5 ? '#A0A0A0' : '#333', textDecoration: ban > 0.5 ? 'line-through' : undefined}}>{name}</div>
            {tag > 0 && (
              <div style={{position: 'absolute', right: 6, top: 4, height: 20, borderRadius: 6, background: '#E5683F', color: '#fff', fontSize: 12, fontWeight: 800, padding: '0 7px', lineHeight: '20px', opacity: tag, transform: `scale(${0.6 + 0.4 * tag})`}}>降智过</div>
            )}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 16, top: y - CX.bar + 22, fontSize: 13, color: mute}}>最近</div>
      {['调研竞品价格', '写一个小游戏'].map((n, k) => (
        <div key={n} style={{position: 'absolute', left: 38, top: y - CX.bar + 50 + k * 32, fontSize: 14.5, color: '#555'}}>
          {n}
        </div>
      ))}
    </div>
  );
};

const Composer: React.FC = () => (
  <div style={{position: 'absolute', left: 260, top: 760, width: 800, height: 96, borderRadius: 18, background: '#fff', border: `1px solid ${line}`, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', fontFamily: F.zh}}>
    <div style={{position: 'absolute', left: 20, top: 16, fontSize: 15, color: '#A8A8A8'}}>向 Codex 提问…</div>
    <div style={{position: 'absolute', left: 18, bottom: 14, opacity: 0.6}}>
      <Icon name="plus" size={18} sw={2} color="#333" />
    </div>
    <div style={{position: 'absolute', right: 60, bottom: 16, fontFamily: F.ui, fontSize: 13.5, color: '#666'}}>GPT-6.1 Sol 高</div>
    <div style={{position: 'absolute', right: 14, bottom: 10, width: 32, height: 32, borderRadius: 16, background: '#3F6FD6', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Icon name="arrowUp" size={17} sw={2.4} color="#fff" />
    </div>
  </div>
);

const Chat: React.FC<{s: CodexState}> = ({s}) => {
  const err = s.error ?? 0;
  const empty = s.empty ?? 0;
  return (
    <div style={{position: 'absolute', left: CX.side, top: CX.bar, right: 0, bottom: 0, background: '#FCFCFC', fontFamily: F.zh}}>
      {/* 线程标题栏 */}
      <div style={{position: 'absolute', left: 0, top: 0, right: 0, height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', fontSize: 15, color: ink, opacity: 1 - empty}}>
        <Icon name="folder" size={15} sw={1.8} color="#555" /> {s.title ?? ''}
      </div>
      <div style={{position: 'absolute', left: CX.more.x - CX.side - 17, top: CX.more.y - CX.bar - 15, width: 34, height: 30, borderRadius: 8, background: s.moreHover ? `rgba(0,0,0,${0.08 * s.moreHover})` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - empty}}>
        <Icon name="more" size={18} sw={2} color="#444" />
      </div>
      <div style={{position: 'absolute', right: 22, top: 13, opacity: 0.45 * (1 - empty)}}>
        <Icon name="panel" size={17} sw={1.8} color="#444" />
      </div>
      {/* 对话 */}
      <div style={{position: 'absolute', left: 230, top: 90, width: 860, opacity: 1 - empty}}>
        {(s.msgs ?? []).map((m, k) => (
          <div key={k} style={{display: 'flex', justifyContent: m.who === 'me' ? 'flex-end' : 'flex-start', marginBottom: 22}}>
            <div style={{maxWidth: 640, background: m.who === 'me' ? '#EFEFEF' : 'transparent', borderRadius: 18, padding: m.who === 'me' ? '10px 18px' : '2px 0', fontSize: 17, lineHeight: 1.6, color: '#2A2A2A'}}>{m.text}</div>
          </div>
        ))}
      </div>
      {err > 0 && (
        <div style={{position: 'absolute', left: 230, top: 250, width: 860, height: 80, boxSizing: 'border-box'}}>
          <div style={{opacity: clamp(err * 1.5), transform: `translateY(${(1 - err) * 14}px)`, borderRadius: 14, background: '#FDF1EE', border: '1px solid #F2C6BA', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14}}>
            <Icon name="alert" size={22} sw={2} color="#C2413A" />
            <div style={{flex: 1}}>
              <div style={{fontSize: 17, fontWeight: 700, color: '#8E2B22'}}>模型容量已达上限</div>
              <div style={{fontSize: 14.5, color: '#9A5A50', marginTop: 2}}>当前请求较多，请稍后重试。</div>
            </div>
            <div style={{position: 'relative', height: 36, borderRadius: 10, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, background: s.retryHover ? `rgba(194,65,58,${0.1 + 0.08 * s.retryHover})` : '#fff', border: '1px solid #E6B4A8', color: '#8E2B22'}}>
              <Icon name="rotateCcw" size={15} sw={2.2} color="#8E2B22" /> 重试
            </div>
          </div>
        </div>
      )}
      {/* 新聊天空白页 */}
      {empty > 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: empty}}>
          <div style={{width: 46, height: 46, margin: '0 auto', borderRadius: 23, border: '1.5px solid #BDBDBD', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <Icon name="code" size={20} sw={1.8} color="#777" />
          </div>
          <div style={{marginTop: 22, fontSize: 24, color: '#333'}}>我们应该在示例项目中做些什么？</div>
        </div>
      )}
      <Composer />
    </div>
  );
};

const Menu: React.FC<{vis: number; hover?: number}> = ({vis, hover = -1}) => {
  if (vis <= 0) return null;
  return (
    <div style={{position: 'absolute', left: CX.menu.x, top: CX.menu.y, width: CX.menu.w, padding: '8px 0', borderRadius: 14, background: '#fff', border: `1px solid ${line}`, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', opacity: clamp(vis * 1.6), transform: `scale(${0.94 + 0.06 * vis})`, transformOrigin: '90% 0%', fontFamily: F.zh, zIndex: 5}}>
      {MENU.map((m, k) => (
        <div key={m} style={{height: CX.menu.rowH, margin: '0 6px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', fontSize: 15, color: ink, background: hover === k ? '#F0F0F0' : 'transparent'}}>
          <Icon name={['pencil', 'copy', 'window', 'archive'][k]} size={16} sw={1.9} color="#444" />
          {m}
        </div>
      ))}
    </div>
  );
};

const UserMenu: React.FC<{vis: number; hover?: number}> = ({vis, hover = 0}) => {
  if (vis <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 12, top: CX.avatar.y - 120, width: 220, padding: '8px 0', borderRadius: 14, background: '#fff', border: `1px solid ${line}`, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', opacity: clamp(vis * 1.6), transform: `scale(${0.94 + 0.06 * vis})`, transformOrigin: '0% 100%', fontFamily: F.zh, zIndex: 5}}>
      <div style={{height: 38, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 13.5, color: mute}}>yourname@gmail.com</div>
      <div style={{height: 40, margin: '0 6px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', fontSize: 15, color: ink, background: hover ? `rgba(0,0,0,${0.06 * hover})` : 'transparent'}}>
        <Icon name="settings" size={16} sw={1.9} color="#444" /> 设置
      </div>
    </div>
  );
};

export const userMenuRow = () => ({x: 12 + 90, y: CX.avatar.y - 120 + 8 + 38 + 20});

const Settings: React.FC<{s: CodexState}> = ({s}) => {
  const page = s.archPage ?? 0;
  const row = s.archRows ?? 1;
  return (
    <>
      <div style={{position: 'absolute', left: CX.rail, top: CX.bar, width: CX.side - CX.rail, bottom: 0, background: '#F6F6F6', borderRight: `1px solid ${line}`, fontFamily: F.zh}}>
        <div style={{position: 'absolute', left: 14, top: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: ink}}>
          <Icon name="arrowLeft" size={15} sw={1.9} color="#444" /> 设置
        </div>
        <div style={{position: 'absolute', left: 14, top: 46, width: 226, height: 30, borderRadius: 8, background: '#EBEBEB', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', boxSizing: 'border-box', fontSize: 13.5, color: '#999'}}>
          <Icon name="search" size={13} sw={1.9} color="#999" /> 搜索
        </div>
        {SET_NAV.map((n, k) => {
          const on = (k === SET_ARCH && page > 0.5) || (k === 0 && page <= 0.5);
          const hv = k === SET_ARCH ? s.navHover ?? 0 : 0;
          return (
            <div key={n} style={{position: 'absolute', left: 12, top: CX.setNavY0 - CX.bar + k * CX.setNavH, width: 230, height: 28, borderRadius: 8, background: on ? '#E4E4E4' : hv ? `rgba(0,0,0,${0.05 * hv})` : 'transparent', display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', boxSizing: 'border-box', fontSize: 14, color: '#3A3A3A'}}>
              <Icon name={k === SET_ARCH ? 'archive' : ['settings', 'bell', 'download', 'user', 'sparkles', 'user', 'archive', 'shield', 'users', 'mic', 'folder', 'sliders', 'heart', 'bolt', 'chart', 'server'][k]} size={14} sw={1.9} color="#555" />
              {n}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: CX.side, top: CX.bar, right: 0, bottom: 0, background: '#FCFCFC', fontFamily: F.zh}}>
        {page < 1 && (
          <div style={{position: 'absolute', left: 140, top: 40, opacity: 1 - page}}>
            <div style={{fontSize: 26, fontWeight: 700, color: ink}}>常规</div>
            {[0, 1, 2, 3, 4].map((k) => (
              <div key={k} style={{marginTop: 26, width: 900, height: 52, borderBottom: `1px solid ${line}`, display: 'flex', alignItems: 'center'}}>
                <div style={{width: 160 + ((k * 53) % 90), height: 12, borderRadius: 6, background: '#E6E6E6'}} />
                <div style={{flex: 1}} />
                <div style={{width: 40, height: 22, borderRadius: 11, background: k % 2 ? '#DADADA' : '#3F6FD6'}} />
              </div>
            ))}
          </div>
        )}
        {page > 0 && (
          <div style={{position: 'absolute', left: 140, top: 40, width: 1000, opacity: page}}>
            <div style={{fontSize: 26, fontWeight: 700, color: ink}}>已归档的聊天</div>
            <div style={{marginTop: 20, width: 420, height: 38, borderRadius: 10, border: `1px solid ${line}`, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', boxSizing: 'border-box', fontSize: 14.5, color: '#A0A0A0'}}>
              <Icon name="search" size={15} sw={1.9} color="#A0A0A0" /> 搜索已归档的聊天
            </div>
            <div style={{position: 'relative', marginTop: 24, height: 58 * row, opacity: row, overflow: 'hidden'}}>
              <div style={{height: 58, borderRadius: 12, border: `1px solid ${line}`, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12}}>
                <Icon name="chat" size={17} sw={1.9} color="#555" />
                <div style={{fontSize: 16, color: ink}}>{THREADS[OLD]}</div>
                <div style={{fontSize: 13.5, color: mute}}>示例项目</div>
                <div style={{flex: 1}} />
                <div style={{height: 32, borderRadius: 8, border: `1px solid ${line}`, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14, color: '#444'}}>取消归档</div>
                <div style={{height: 32, borderRadius: 8, border: '1px solid #F0C2B9', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 14, color: '#C2413A', background: s.delHover ? `rgba(194,65,58,${0.1 * s.delHover})` : '#fff'}}>删除</div>
              </div>
            </div>
            {(s.emptyArch ?? 0) > 0 && <div style={{marginTop: 30, fontSize: 16, color: mute, opacity: s.emptyArch}}>暂无已归档的聊天</div>}
          </div>
        )}
      </div>
    </>
  );
};

const Dialog: React.FC<{vis: number; hover?: number}> = ({vis, hover = 0}) => {
  if (vis <= 0) return null;
  return (
    <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.28 * vis})`, zIndex: 8}}>
      <div style={{position: 'absolute', left: CX.w / 2 - 230, top: 300, width: 460, borderRadius: 18, background: '#fff', padding: '24px 26px 20px', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', opacity: clamp(vis * 1.5), transform: `scale(${0.92 + 0.08 * vis})`, fontFamily: F.zh}}>
        <div style={{fontSize: 19, fontWeight: 700, color: ink}}>删除已归档的聊天？</div>
        <div style={{marginTop: 10, fontSize: 15, lineHeight: 1.6, color: '#555'}}>此操作将永久删除该已归档聊天及其关联的侧边聊天</div>
        <div style={{marginTop: 22, display: 'flex', justifyContent: 'flex-end', gap: 10}}>
          <div style={{height: 36, borderRadius: 10, border: `1px solid ${line}`, padding: '0 18px', display: 'flex', alignItems: 'center', fontSize: 15, color: '#333'}}>取消</div>
          <div style={{height: 36, borderRadius: 10, padding: '0 18px', display: 'flex', alignItems: 'center', fontSize: 15, fontWeight: 700, color: '#fff', background: hover ? '#A9332D' : '#C2413A'}}>删除</div>
        </div>
      </div>
    </div>
  );
};
/** 确认框里「删除」按钮中心（窗口坐标） */
export const dialogDel = () => ({x: CX.w / 2 + 230 - 26 - 38, y: 300 + 24 + 27 + 10 + 24 + 22 + 18});
/** 已归档列表第一行「删除」中心（窗口坐标） */
/** 容量提示里「重试」按钮中心（窗口坐标） */
export const RETRY = {x: 1330, y: 324};
export const rowDel = () => ({x: 1396, y: 221});

export const CodexWin: React.FC<{s: CodexState}> = ({s}) => (
  <div data-probe="skip" style={{position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', background: '#FCFCFC', border: '1px solid rgba(35,40,66,0.14)', boxShadow: '0 2px 0 rgba(35,40,66,0.04), 0 18px 40px rgba(35,40,66,0.16), 0 50px 110px rgba(35,40,66,0.18)'}}>
    <Bar />
    <Rail />
    {s.view === 'chat' ? (
      <>
        <Side s={s} />
        <Chat s={s} />
        <Menu vis={s.menu ?? 0} hover={s.menuHover} />
      </>
    ) : (
      <Settings s={s} />
    )}
    <Avatar hl={s.userMenu} />
    <UserMenu vis={s.userMenu ?? 0} hover={s.userMenuHover} />
    <Dialog vis={s.dialog ?? 0} hover={s.dialogHover} />
  </div>
);
