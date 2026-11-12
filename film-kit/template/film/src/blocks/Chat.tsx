import React from 'react';
import {blink, clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Icon, Spark} from '../ui/icons';
import {C, F, FitText, Out, Slot, fit, innerW, pop, revealedLines, slotBox, stageOf} from './core';

// ═════════ 聊天窗 ═════════

export type ChatMsg =
  /** 我发的：typeFrom 起在输入框里打字，at 时发出 */
  | {at: number; from: 'me'; text: string; typeFrom?: number}
  /** 对方回的：thinkFrom 起显示「正在输入」三个点，at 时开始逐字流出（stream=false 则整段出现） */
  | {at: number; from: 'ai'; text: string; thinkFrom?: number; stream?: boolean; name?: string}
  /** 工具调用卡：at 出现（转圈），done 时打勾 */
  | {at: number; from: 'tool'; text: string; done?: number; doneText?: string}
  /** 文件卡 */
  | {at: number; from: 'file'; name: string; size?: string; mine?: boolean}
  /** 居中的灰色小字（系统提示） */
  | {at: number; from: 'note'; text: string};

export type ChatSkin = 'claude' | 'chatgpt' | 'qq' | 'plain';
export type ChatBoxProps = {
  t0: number;
  t1?: number;
  /** 配色：像 Claude / 像 ChatGPT / 像 QQ 群 / 频道纸感 */
  skin?: ChatSkin;
  /** 窗口标题 */
  title?: string;
  msgs: ChatMsg[];
  /** 对方的名字（QQ 和纸感皮肤会显示） */
  aiName?: string;
  slot?: Slot;
  vertical?: boolean;
};

type SkinDef = {bg: string; head: string; line: string; ink: string; mute: string; meBg: string; meInk: string; aiBg?: string; accent: string; name: string; placeholder: string; bubbleAi: boolean};
const SKIN: Record<ChatSkin, SkinDef> = {
  claude: {bg: C.claudeBg, head: C.claudeBg, line: C.claudeLine, ink: C.claudeInk, mute: C.claudeMuted, meBg: '#EFEDE6', meInk: C.claudeInk, accent: C.claudeSpark, name: 'Claude', placeholder: '回复 Claude…', bubbleAi: false},
  chatgpt: {bg: '#FFFFFF', head: '#FFFFFF', line: '#ECECEC', ink: '#0D0D0D', mute: '#8F8F8F', meBg: '#F1F1F1', meInk: '#0D0D0D', accent: '#0D0D0D', name: 'ChatGPT', placeholder: '询问任何问题', bubbleAi: false},
  qq: {bg: '#F2F3F5', head: '#FFFFFF', line: '#E5E6EB', ink: '#1F2329', mute: '#8A8F99', meBg: '#0099FF', meInk: '#FFFFFF', aiBg: '#FFFFFF', accent: '#0099FF', name: '群友', placeholder: '', bubbleAi: true},
  plain: {bg: C.paper, head: '#FFFFFF', line: 'rgba(35,40,66,0.15)', ink: C.ink, mute: C.muted, meBg: C.coralPale, meInk: C.ink, aiBg: '#FFFFFF', accent: C.coral, name: '助手', placeholder: '说点什么…', bubbleAi: true},
};

const SIZE = 30;
const LH = 1.45;

/** 聊天窗：两人聊天气泡，打字、发出、对方回复，可插工具卡和文件卡 */
export const ChatBox: React.FC<ChatBoxProps & {t: number}> = ({t, t0, t1, skin = 'claude', title = '新对话', msgs, aiName, slot = 'center', vertical}) => {
  const st = stageOf(vertical);
  const S = SKIN[skin];
  const box = slotBox(slot, st, vertical ? innerW(st) : 1260);
  const w = box.w;
  const h = vertical ? Math.min(1180, st.bottom - st.top) : st.bottom - st.top + 10;
  const x = box.x;
  const y = vertical ? st.top + (st.bottom - st.top - h) / 2 : st.top - 10;
  const headH = 78;
  const inputH = 96;
  const padX = vertical ? 30 : 46;
  const colW = w - padX * 2;
  const viewH = h - headH - inputH - 40;
  const avatar = 50;
  const meMax = Math.min(colW * 0.76, 720);
  const aiTextW = S.bubbleAi ? Math.min(colW * 0.76, 720) - 44 : colW - avatar - 20;
  const name = aiName ?? S.name;
  // 排版
  type Placed = {m: ChatMsg | {from: 'think'; at: number}; top: number; h: number; p: number};
  const items: (ChatMsg | {from: 'think'; at: number})[] = [];
  for (const m of msgs) {
    if (m.from === 'ai' && m.thinkFrom !== undefined && t >= m.thinkFrom && t < m.at) items.push({from: 'think', at: m.thinkFrom});
    if (t >= m.at) items.push(m);
  }
  let yy = 20;
  const placed: Placed[] = items.map((m) => {
    let hh = 60;
    if (m.from === 'me') hh = fit({text: m.text, maxW: meMax - 44, size: SIZE, min: 26, maxLines: 6, who: '聊天', balance: false, keepSize: true}, LH).h + 30;
    else if (m.from === 'ai') {
      const f = fit({text: m.text, maxW: aiTextW, size: SIZE, min: 26, maxLines: 8, who: '聊天', balance: false, keepSize: true}, LH);
      const n = m.stream === false ? undefined : (t - m.at) * 30;
      hh = revealedLines(f, n) * f.size * LH + (S.bubbleAi ? 30 + 32 : 8);
    } else if (m.from === 'think') hh = S.bubbleAi ? 96 : 56;
    else if (m.from === 'tool') hh = 76;
    else if (m.from === 'file') hh = 104;
    else if (m.from === 'note') hh = 46;
    const p = prog(t, m.at, 0.3, ease.out);
    const top = yy;
    yy += (hh + 24) * p;
    return {m, top, h: hh, p};
  });
  const scroll = Math.max(0, yy - viewH);
  // 输入框
  const typing = msgs.find((m) => m.from === 'me' && m.typeFrom !== undefined && t >= m.typeFrom && t < m.at) as Extract<ChatMsg, {from: 'me'}> | undefined;
  let inputText = '';
  if (typing) {
    const n = Array.from(typing.text).length;
    const cps = Math.max(8, n / Math.max(0.3, typing.at - typing.typeFrom! - 0.25));
    inputText = Array.from(typing.text).slice(0, Math.floor((t - typing.typeFrom!) * cps)).join('');
  }
  const p = pop(t, t0, 190, 16);
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div data-probe="skip" style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `translateY(${(1 - clamp(p)) * 60}px) scale(${lerp(0.94, 1, clamp(p))})`, opacity: clamp(p * 2)}}>
        <div style={{position: 'absolute', inset: 0, background: S.bg, borderRadius: 24, overflow: 'hidden', border: `4px solid ${C.ink}`, boxShadow: '0 12px 0 rgba(35,40,66,0.12), 0 30px 60px rgba(35,40,66,0.18)'}}>
          {/* 标题栏 */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: headH, background: S.head, borderBottom: `2px solid ${S.line}`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px'}}>
            {skin === 'qq' ? <Icon name="chevLeft" size={34} color={S.ink} sw={2.4} /> : <Avatar skin={skin} size={40} />}
            <FitText text={title} maxW={w - 260} size={30} min={24} weight={700} color={S.ink} style={{width: 'auto'}} markup={false} />
            <div style={{flex: 1}} />
            <Icon name={skin === 'qq' ? 'menu' : 'more'} size={32} color={S.mute} sw={2.4} />
          </div>
          {/* 消息 */}
          <div style={{position: 'absolute', left: padX, top: headH + 10, width: colW, height: viewH, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: 0, top: -scroll, width: colW}}>
              {placed.map(({m, top, p: mp}, k) => (
                <div key={k} style={{position: 'absolute', left: 0, top, width: colW, opacity: mp, transform: `translateY(${(1 - mp) * 20}px)`}}>
                  <Msg t={t} m={m} S={S} skin={skin} colW={colW} meMax={meMax} aiTextW={aiTextW} name={name} />
                </div>
              ))}
            </div>
          </div>
          {/* 输入框 */}
          <div style={{position: 'absolute', left: padX, right: padX, bottom: 24, height: inputH - 20, borderRadius: 22, background: skin === 'qq' ? '#FFFFFF' : '#FFFFFF', border: `2px solid ${S.line}`, boxShadow: '0 4px 14px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', padding: '0 20px 0 26px', gap: 14}}>
            <div style={{flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: F.zh, fontSize: SIZE, color: inputText ? S.ink : '#B3B1A9', direction: 'rtl', textAlign: 'left'}}>
              <span style={{direction: 'ltr', unicodeBidi: 'bidi-override'}}>
                {inputText || S.placeholder}
                {typing && <span style={{display: 'inline-block', width: 3, height: SIZE, background: S.ink, marginLeft: 3, verticalAlign: 'middle', opacity: blink(t)}} />}
              </span>
            </div>
            <div style={{width: 50, height: 50, borderRadius: skin === 'chatgpt' ? 50 : 14, background: inputText ? S.accent : '#E3E1DA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <Icon name={skin === 'qq' ? 'send' : 'arrowUp'} size={28} color="#fff" sw={2.6} />
            </div>
          </div>
        </div>
      </div>
    </Out>
  );
};

const Avatar: React.FC<{skin: ChatSkin; size: number; me?: boolean}> = ({skin, size, me}) => {
  if (me || skin === 'qq' || skin === 'plain') {
    return (
      <div style={{width: size, height: size, borderRadius: size, background: me ? (skin === 'plain' ? C.coral : '#9BC4F0') : skin === 'plain' ? C.sky : '#D9D3C7', border: skin === 'plain' ? `3px solid ${C.ink}` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box'}}>
        <Icon name="user" size={size * 0.56} color="#fff" sw={2.6} />
      </div>
    );
  }
  if (skin === 'claude') return <Spark size={size} color={C.claudeSpark} />;
  return (
    <div style={{width: size, height: size, borderRadius: size, background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
      <Icon name="sparkles" size={size * 0.56} color="#fff" sw={2.2} />
    </div>
  );
};

const Msg: React.FC<{t: number; m: ChatMsg | {from: 'think'; at: number}; S: SkinDef; skin: ChatSkin; colW: number; meMax: number; aiTextW: number; name: string}> = ({t, m, S, skin, colW, meMax, aiTextW, name}) => {
  const border = skin === 'plain' ? `3px solid ${C.ink}` : undefined;
  if (m.from === 'me') {
    const f = fit({text: m.text, maxW: meMax - 44, size: SIZE, min: 26, maxLines: 6, who: '聊天', balance: false, keepSize: true}, LH);
    return (
      <div style={{display: 'flex', justifyContent: 'flex-end', gap: 14}}>
        <div style={{background: S.meBg, borderRadius: 22, padding: '15px 22px', border, boxSizing: 'border-box'}}>
          <FitText text={m.text} maxW={meMax - 44} size={SIZE} min={26} maxLines={6} weight={500} color={S.meInk} lh={LH} style={{width: f.w + 2}} markup={false} balance={false} keepSize />
        </div>
        {(skin === 'qq' || skin === 'plain') && <Avatar skin={skin} size={50} me />}
      </div>
    );
  }
  if (m.from === 'think') {
    const dots = [0, 1, 2].map((i) => 0.35 + 0.65 * Math.max(0, Math.sin(t * 7 - i * 0.9)));
    return (
      <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
        <Avatar skin={skin} size={50} />
        <div style={{display: 'flex', gap: 9, padding: S.bubbleAi ? '22px 26px' : '0 4px', background: S.bubbleAi ? S.aiBg : undefined, borderRadius: 22, border: S.bubbleAi ? border : undefined}}>
          {dots.map((o, i) => (
            <div key={i} style={{width: 14, height: 14, borderRadius: 14, background: S.mute, opacity: o}} />
          ))}
        </div>
      </div>
    );
  }
  if (m.from === 'ai') {
    const f = fit({text: m.text, maxW: aiTextW, size: SIZE, min: 26, maxLines: 8, who: '聊天', balance: false, keepSize: true}, LH);
    const n = m.stream === false ? undefined : (t - m.at) * 30;
    const body = <FitText text={m.text} maxW={aiTextW} size={SIZE} min={26} maxLines={8} weight={500} color={S.ink} lh={LH} reveal={n} style={{width: S.bubbleAi ? Math.min(aiTextW, f.w + 2) : aiTextW}} markup={false} balance={false} keepSize />;
    if (S.bubbleAi) {
      return (
        <div style={{display: 'flex', gap: 14, alignItems: 'flex-start'}}>
          <Avatar skin={skin} size={50} />
          <div>
            <div style={{fontFamily: F.zh, fontSize: 24, fontWeight: 600, color: S.mute, marginBottom: 6}}>{m.name ?? name}</div>
            <div style={{background: S.aiBg, borderRadius: 22, padding: '15px 22px', border}}>{body}</div>
          </div>
        </div>
      );
    }
    return (
      <div style={{display: 'flex', gap: 20, alignItems: 'flex-start'}}>
        <div style={{marginTop: 4}}>
          <Avatar skin={skin} size={44} />
        </div>
        {body}
      </div>
    );
  }
  if (m.from === 'tool') {
    const done = m.done !== undefined && t >= m.done;
    return (
      <div style={{marginLeft: S.bubbleAi ? 64 : 64, height: 70, boxSizing: 'border-box', border: `2px solid ${S.line}`, background: '#fff', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', width: Math.min(colW - 64, 760)}}>
        <Icon name="settings" size={28} color={S.mute} sw={2.2} />
        <FitText text={m.text} maxW={Math.min(colW - 64, 760) - 260} size={26} min={24} font="mono" weight={700} color={S.ink} style={{width: 'auto', flex: 1}} lh={1.2} />
        <div style={{flex: 1}} />
        {done ? (
          <div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.zh, fontSize: 24, fontWeight: 700, color: C.mintDeep, whiteSpace: 'nowrap'}}>
            <Icon name="check" size={26} color={C.mintDeep} sw={3} />
            {m.doneText ?? '完成'}
          </div>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.zh, fontSize: 24, color: S.mute, whiteSpace: 'nowrap'}}>
            <div style={{width: 22, height: 22, borderRadius: 22, border: `3px solid ${S.line}`, borderTopColor: S.accent, transform: `rotate(${t * 400}deg)`}} />
            运行中
          </div>
        )}
      </div>
    );
  }
  if (m.from === 'file') {
    const fw = Math.min(520, colW * 0.7);
    return (
      <div style={{display: 'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginLeft: m.mine ? 0 : 64, marginRight: m.mine && (skin === 'qq' || skin === 'plain') ? 64 : 0}}>
        <div style={{width: fw, height: 96, boxSizing: 'border-box', background: '#fff', border: skin === 'plain' ? `3px solid ${C.ink}` : `2px solid ${S.line}`, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px'}}>
          <div style={{width: 56, height: 64, borderRadius: 10, background: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
            <Icon name="fileText" size={32} color="#fff" sw={2.2} />
          </div>
          <div style={{minWidth: 0}}>
            <FitText text={m.name} maxW={fw - 140} size={28} min={24} weight={700} color={S.ink} markup={false} lh={1.2} />
            {m.size && <div style={{fontFamily: F.ui, fontSize: 22, color: S.mute, marginTop: 4}}>{m.size}</div>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{display: 'flex', justifyContent: 'center'}}>
      <div style={{background: 'rgba(0,0,0,0.06)', borderRadius: 12, padding: '6px 16px'}}>
        <FitText text={m.text} maxW={colW - 80} size={24} min={24} weight={600} color={S.mute} style={{width: 'auto'}} lh={1.3} markup={false} />
      </div>
    </div>
  );
};

export const chatBoxSfx = (p: ChatBoxProps): Ev[] => {
  const ev: Ev[] = [{at: p.t0 + 0.03, k: 'popup', vol: 0.3}];
  for (const m of p.msgs) {
    if (m.from === 'me') {
      if (m.typeFrom !== undefined) ev.push({at: m.typeFrom, typing: Math.max(0.3, m.at - m.typeFrom - 0.2), vol: 0.18});
      ev.push({at: m.at, k: 'msg', vol: 0.4});
    } else if (m.from === 'ai') ev.push({at: m.at, k: 'msg', vol: 0.32});
    else if (m.from === 'tool') {
      ev.push({at: m.at, k: 'tap', vol: 0.25});
      if (m.done !== undefined) ev.push({at: m.done, k: 'ok', vol: 0.28});
    } else ev.push({at: m.at, k: 'pop', vol: 0.28});
  }
  return ev;
};
