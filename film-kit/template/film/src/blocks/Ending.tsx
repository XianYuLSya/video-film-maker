import React from 'react';
import {clamp, lerp} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Spark} from '../ui/icons';
import {Icon, IconBox, IconName, Mark, MascotSay, Pose, Tag, Title} from './atoms';
import {C, F, FitText, HARD, Out, RED, fit, innerW, pop, stageOf, vis} from './core';

// ═════════ 风险提醒卡 · 回顾 · 片尾卡 · 制作说明卡 ═════════

export type WarnCardProps = {
  t0: number;
  t1?: number;
  /** caution：橙黄「注意」；danger：红色「风险」 */
  level?: 'caution' | 'danger';
  /** 一句重点 */
  title: string;
  /** 一两行说明 */
  lines?: string[];
  /** 左上角标签文字，缺省「注意」/「风险」 */
  label?: string;
  vertical?: boolean;
};

/** 风险提醒卡：橙色或红色的「注意」卡，一句重点加一两行说明，出来时抖两下 */
export const WarnCard: React.FC<WarnCardProps & {t: number}> = ({t, t0, t1, level = 'caution', title, lines = [], label, vertical}) => {
  const st = stageOf(vertical);
  const danger = level === 'danger';
  const col = danger ? RED : C.coral;
  const w = vertical ? innerW(st) : 1280;
  const band = vertical ? 0 : 200;
  const textW = w - band - 100;
  const tf = fit({text: title, maxW: textW, size: vertical ? 64 : 68, min: 40, maxLines: 2, font: 'smiley', who: '提醒标题'}, 1.15);
  const lf = lines.slice(0, 2).map((l) => fit({text: l, maxW: textW - 50, size: 34, min: 28, maxLines: 2, who: '提醒说明'}, 1.35));
  const topH = vertical ? 190 : 0;
  const h = Math.max(vertical ? 0 : 300, topH + 70 + tf.h + lf.reduce((a, f) => a + f.h + 18, lf.length ? 20 : 0) + 50);
  const x = st.cx - w / 2;
  const y = st.cy - h / 2;
  const p = pop(t, t0, 240, 13);
  const d = t - t0 - 0.15;
  const wig = d > 0 && d < 0.5 ? Math.sin(d * 40) * (1 - d / 0.5) * 2.5 : 0;
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${-1 + wig}deg) scale(${lerp(0.7, 1, clamp(p))})`, opacity: clamp(p * 2)}}>
        <div style={{position: 'absolute', inset: 0, background: '#fff', border: `6px solid ${C.ink}`, borderRadius: 32, boxShadow: HARD, overflow: 'hidden', boxSizing: 'border-box'}}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: vertical ? '100%' : band,
              height: vertical ? topH : '100%',
              background: `repeating-linear-gradient(-45deg, ${col} 0 26px, ${danger ? '#B9372C' : '#D45A33'} 26px 52px)`,
              borderRight: vertical ? undefined : `6px solid ${C.ink}`,
              borderBottom: vertical ? `6px solid ${C.ink}` : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div style={{width: 128, height: 128, borderRadius: 34, background: '#fff', border: `6px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${pop(t, t0 + 0.12, 300, 11)})`}}>
              <Icon name="alert" size={82} color={col} sw={2.6} />
            </div>
          </div>
          <div style={{position: 'absolute', left: band + 50, top: topH + 64, width: textW}}>
            <FitText text={title} maxW={textW} size={vertical ? 64 : 68} min={40} maxLines={2} font="smiley" lh={1.15} em={col} who="提醒标题" />
            {lines.slice(0, 2).map((l, i) => (
              <div key={i} style={{display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: i === 0 ? 24 : 14, opacity: vis(t, t0 + 0.35 + i * 0.2)}}>
                <div style={{width: 14, height: 14, borderRadius: 14, background: col, marginTop: 16, flexShrink: 0}} />
                <FitText text={l} maxW={textW - 50} size={34} min={28} maxLines={2} weight={700} color={C.ink2} lh={1.35} who="提醒说明" />
              </div>
            ))}
          </div>
        </div>
        <div style={{position: 'absolute', left: vertical ? 30 : band + 40, top: -32}}>
          <Tag text={label ?? (danger ? '风险' : '注意')} tone="ink" size={34} rot={-4} vis={pop(t, t0 + 0.1, 260, 13)} icon="alert" />
        </div>
      </div>
    </Out>
  );
};
export const warnCardSfx = (p: WarnCardProps): Ev[] => [
  {at: p.t0 + 0.02, k: 'popup', vol: 0.38},
  {at: p.t0 + 0.15, k: 'bass', vol: 0.28},
  ...(p.lines ?? []).slice(0, 2).map((_, i): Ev => ({at: p.t0 + 0.35 + i * 0.2, k: 'tap', vol: 0.22})),
];

// ───────── 回顾 ─────────
export type RecapProps = {
  t0: number;
  t1?: number;
  title?: string;
  /** 2–6 条要点 */
  items: {at: number; text: string; icon?: IconName}[];
  mascot?: Pose;
  vertical?: boolean;
};

/** 回顾：全片要点收成一屏，一条条打勾 */
export const Recap: React.FC<RecapProps & {t: number}> = ({t, t0, t1, title = '这期记住这几条', items, mascot, vertical}) => {
  const st = stageOf(vertical);
  const list = items.slice(0, 6);
  const n = list.length;
  const cols = !vertical && n >= 4 ? 2 : 1;
  const areaW = innerW(st) - (mascot && !vertical ? 380 : 0);
  const gap = 30;
  // 一列时最宽 1100 并居中，免得三五个字的要点躺在一条 1700 宽的长条里
  // 条宽随最长一条收紧：左边勾和图标约 chrome 宽，加最长文字的估宽，夹在 [640, 1100] 之间（竖屏一律占满宽）；
  // 不然三五个字的要点躺在一条固定宽的长条里，右边空一大截，像没写完
  const chrome = 60 + 70 + (list.some((x) => x.icon) ? 80 : 0);
  const maxCw = cols === 1 ? Math.min(1100, areaW) : (areaW - gap * (cols - 1)) / cols;
  const longest = Math.max(...list.map((it) => fit({text: it.text, maxW: maxCw - chrome, size: 38, min: 28, maxLines: 2}).w));
  const cw = cols === 1 && !vertical ? Math.min(maxCw, Math.max(640, longest + chrome + 60)) : maxCw;
  const gx = cols === 1 && !vertical ? st.left + (areaW - cw) / 2 : st.left;
  const textW = cw - chrome;
  const fs = list.map((it) => fit({text: it.text, maxW: textW, size: 38, min: 28, maxLines: 2, who: '回顾要点'}));
  const rows = Math.ceil(n / cols);
  const rowH = Math.max(110, ...fs.map((f) => f.h + 44));
  const titleH = 140;
  const avail = st.bottom - st.top - titleH;
  const gy = Math.min(gap, (avail - rows * rowH) / Math.max(1, rows - 1));
  const total = rows * rowH + gy * (rows - 1);
  const y0 = st.top + titleH + Math.max(0, (avail - total) / 2);
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: gx, top: st.top}}>
        <Title text={title} maxW={Math.max(cw, 640)} size={76} vis={pop(t, t0)} />
      </div>
      {list.map((it, i) => {
        if (t < it.at - 0.05) return null;
        const c = i % cols;
        const r = Math.floor(i / cols);
        const p = pop(t, it.at - 0.05, 230, 14);
        return (
          <div key={i} style={{position: 'absolute', left: gx + c * (cw + gap), top: y0 + r * (rowH + gy), width: cw, height: rowH, boxSizing: 'border-box', background: '#fff', border: `4px solid ${C.ink}`, borderRadius: 24, boxShadow: '0 7px 0 rgba(35,40,66,0.14)', display: 'flex', alignItems: 'center', gap: 22, padding: '0 28px', transform: `translateY(${(1 - clamp(p)) * 30}px) rotate(${i % 2 ? 0.6 : -0.6}deg)`, opacity: clamp(p * 2)}}>
            <Mark ok size={58} p={pop(t, it.at + 0.12, 300, 12)} />
            {it.icon && <IconBox name={it.icon} tone="sun" soft size={60} />}
            <FitText text={it.text} maxW={textW} size={38} min={28} maxLines={2} weight={900} who="回顾要点" />
          </div>
        );
      })}
      {mascot && <MascotSay t={t} t0={t0 + 0.3} pose={mascot} spot={vertical ? 'right-bottom' : 'right'} vertical={vertical} h={vertical ? 360 : 500} />}
    </Out>
  );
};
export const recapSfx = (p: RecapProps): Ev[] => [{at: p.t0 + 0.02, k: 'swoosh', vol: 0.22}, ...p.items.slice(0, 6).map((it): Ev => ({at: it.at + 0.12, k: 'ok', vol: 0.3}))];

// ───────── 片尾卡 ─────────
export type EndCardProps = {
  t0: number;
  t1?: number;
  /** QQ 群号（纯数字字符串）；不给就不画群卡 */
  group?: string;
  /** 群号下面一行：进群能干什么 */
  groupNote?: string;
  /** 一键三连出现的时刻，缺省 t0+1.2；给 null 不画 */
  tripleAt?: number | null;
  /** 署名，缺省「咸鱼凌生」 */
  author?: string;
  /** 制作说明短句，如「本视频由 Claude 制作」 */
  made?: string;
  /** 致谢行，如「感谢 小林 提供原片思路」 */
  thanks?: string;
  /** 署名和致谢出现的时刻，缺省 t0+0.8 */
  creditsAt?: number;
  mascot?: Pose;
  /** 小咸鱼的气泡，缺省「下期见！」 */
  say?: string;
  /** 气泡出现的时刻，缺省 t0+0.8（想让它说稿子里的无声气泡，就传那个气泡的 start） */
  sayAt?: number;
  vertical?: boolean;
};

const Coin: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 8l3 4 3-4M12 12v5M9.5 13.5h5" />
  </svg>
);

/** 片尾卡：QQ 群号大字、一键三连、署名、制作说明和致谢行 */
export const EndCard: React.FC<EndCardProps & {t: number}> = ({t, t0, t1, group, groupNote, tripleAt, author = '咸鱼凌生', made, thanks, creditsAt, mascot = 'wave', say = '下期见！', sayAt, vertical}) => {
  const st = stageOf(vertical);
  const ta = tripleAt === null ? undefined : tripleAt ?? t0 + 1.2;
  const ca = creditsAt ?? t0 + 0.8;
  const gw = vertical ? innerW(st) : 1080;
  const gx = vertical ? st.left : st.left;
  const gy = vertical ? st.top + 20 : st.top + 20;
  const gp = pop(t, t0, 190, 14);
  const noteF = groupNote ? fit({text: groupNote, maxW: gw - 160, size: 34, min: 26, maxLines: 2, who: '群卡说明'}) : null;
  const numSize = vertical ? 96 : 112;
  const groupH = group ? 70 + numSize * 1.05 + (noteF ? noteF.h + 26 : 0) + 60 : 0;
  const tripleY = gy + groupH + (vertical ? 60 : 50);
  const credits = [author, made, thanks].filter(Boolean) as string[];
  const credY = vertical ? tripleY + 300 : st.bottom - 34;
  const triple = [
    {icon: 'thumb', label: '点赞', col: '#FB7299'},
    {icon: 'coin', label: '投币', col: '#F5A623'},
    {icon: 'star', label: '收藏', col: '#F5C04A'},
  ];
  return (
    <Out t={t} t0={t0} t1={t1}>
      {group && (
        <div style={{position: 'absolute', left: gx, top: gy, width: gw, transform: `rotate(-1.2deg) scale(${lerp(0.7, 1, clamp(gp))})`, transformOrigin: '0% 0%', opacity: clamp(gp * 2)}}>
          <div style={{boxSizing: 'border-box', background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 34, padding: '34px 44px 38px', boxShadow: HARD}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
              <div style={{width: 112, height: 112, borderRadius: 30, background: '#12B7F5', border: `5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                <Icon name="qq" size={68} color="#fff" sw={2.2} />
              </div>
              <div>
                <div style={{fontFamily: F.zh, fontWeight: 900, fontSize: 40, lineHeight: 1.15, color: C.ink2, marginBottom: 8}}>QQ 群</div>
                <FitText text={group} maxW={gw - 260} size={numSize} min={60} font="ui" weight={900} color={C.ink} ls={3} lh={1.12} markup={false} style={{width: 'auto'}} who="群号" />
              </div>
            </div>
            {groupNote && (
              <div style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 14, opacity: vis(t, t0 + 0.4)}}>
                <Icon name="chat" size={38} color={C.mintDeep} sw={2.6} />
                <FitText text={groupNote} maxW={gw - 160} size={34} min={26} maxLines={2} weight={900} who="群卡说明" />
              </div>
            )}
          </div>
        </div>
      )}
      {ta !== undefined && t >= ta - 0.05 && (
        <div style={{position: 'absolute', left: vertical ? st.cx : gx + 20, top: tripleY, transform: vertical ? 'translateX(-50%)' : undefined, display: 'flex', alignItems: 'center', gap: vertical ? 30 : 36}}>
          {triple.map((x, i) => {
            const p = pop(t, ta + i * 0.15, 300, 12);
            return (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                <div style={{width: 104, height: 104, borderRadius: 104, background: '#fff', border: `5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: x.col, boxShadow: '0 6px 0 rgba(35,40,66,0.15)', transform: `scale(${clamp(p, 0, 1.2)})`}}>
                  {x.icon === 'coin' ? <Coin size={60} /> : <Icon name={x.icon} size={58} color={x.col} fill={x.icon === 'star' ? x.col : 'none'} sw={2.4} />}
                </div>
                <div style={{fontFamily: F.zh, fontWeight: 900, fontSize: 28, color: C.ink, opacity: clamp((p - 0.6) * 2.5)}}>{x.label}</div>
              </div>
            );
          })}
          <div style={{marginLeft: 16, transform: `rotate(-4deg) scale(${lerp(0.6, 1, clamp(pop(t, ta + 0.5, 280, 12), 0, 1.2))})`, opacity: clamp(pop(t, ta + 0.5, 280, 12) * 2), fontFamily: F.smiley, fontSize: 64, color: C.coral, whiteSpace: 'nowrap'}}>一键三连！</div>
        </div>
      )}
      {credits.length > 0 && t >= ca && (
        <div style={{position: 'absolute', left: st.left, top: credY, transform: 'translateY(-100%)', width: innerW(st), opacity: vis(t, ca)}}>
          <FitText text={credits.join('  ·  ')} maxW={vertical ? innerW(st) : innerW(st) - 420} size={30} min={24} maxLines={vertical ? 3 : 2} weight={700} color={C.ink2} markup={false} lh={1.35} who="片尾署名" />
        </div>
      )}
      <MascotSay t={t} t0={t0 + 0.4} pose={mascot} spot={vertical ? 'right-bottom' : 'right'} say={say} sayAt={sayAt ?? t0 + 0.8} vertical={vertical} h={vertical ? 360 : 540} />
    </Out>
  );
};
export const endCardSfx = (p: EndCardProps): Ev[] => {
  const ta = p.tripleAt === null ? undefined : p.tripleAt ?? p.t0 + 1.2;
  return [
    ...(p.group ? [{at: p.t0 + 0.03, k: 'pop' as const, vol: 0.4}] : []),
    {at: p.t0 + 0.45, k: 'swoosh', vol: 0.22},
    {at: (p.sayAt ?? p.t0 + 0.8) + 0.05, k: 'pop', vol: 0.32},
    ...(ta !== undefined ? ([0, 1, 2].map((i) => ({at: ta + i * 0.15, k: 'pop' as const, vol: 0.35})) as Ev[]).concat([{at: ta + 0.5, k: 'sparkle', vol: 0.35}]) : []),
  ];
};

// ───────── 制作说明卡 ─────────
export type MadeByProps = {
  t0: number;
  t1?: number;
  /** 主句，缺省「本视频由 Claude 制作」 */
  text?: string;
  /** 主句前的标：claude 画 Claude 的放射标，none 不画 */
  logo?: 'claude' | 'none';
  /** 分工几行：谁做了什么，每行可带出现时刻 */
  parts?: {at?: number; icon?: IconName; text: string}[];
  vertical?: boolean;
};

/** 制作说明卡：「本视频由 Claude 制作」短卡 + 分工几行 */
export const MadeBy: React.FC<MadeByProps & {t: number}> = ({t, t0, t1, text = '本视频由 Claude 制作', logo = 'claude', parts = [], vertical}) => {
  const st = stageOf(vertical);
  const w = vertical ? innerW(st) : 1300;
  const lw = logo === 'claude' ? 120 : 0;
  const tf = fit({text, maxW: w - 100 - lw, size: vertical ? 72 : 84, min: 48, maxLines: 2, font: 'smiley', who: '制作说明'}, 1.15);
  const ps = parts.slice(0, 4);
  const pf = ps.map((x) => fit({text: x.text, maxW: w - 120 - 80, size: 36, min: 28, maxLines: 1, who: '制作分工'}));
  const ph = pf.reduce((a, f) => a + Math.max(70, f.h + 20) + 16, 0);
  const cardH = 80 + tf.h;
  const total = cardH + (ps.length ? 50 + ph : 0);
  const y = st.cy - total / 2;
  const p = pop(t, t0, 190, 14);
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left: st.cx - w / 2, top: y, width: w, transform: `rotate(-1.5deg) scale(${lerp(0.7, 1, clamp(p))})`, opacity: clamp(p * 2)}}>
        <div style={{boxSizing: 'border-box', background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 32, boxShadow: HARD, padding: '38px 48px 42px', display: 'flex', alignItems: 'center', gap: 30, justifyContent: 'center'}}>
          {logo === 'claude' && <Spark size={96} color={C.claudeSpark} spin={(t - t0) * 20} />}
          <FitText text={text} maxW={w - 100 - lw} size={vertical ? 72 : 84} min={48} maxLines={2} font="smiley" lh={1.15} style={{width: 'auto'}} who="制作说明" />
        </div>
      </div>
      {ps.map((x, i) => {
        const at = x.at ?? t0 + 0.5 + i * 0.3;
        if (t < at) return null;
        const pp = pop(t, at, 240, 14);
        let yy = y + cardH + 50;
        for (let k = 0; k < i; k++) yy += Math.max(70, pf[k].h + 20) + 16;
        return (
          <div key={i} style={{position: 'absolute', left: st.cx - w / 2 + 60, top: yy, width: w - 120, display: 'flex', alignItems: 'center', gap: 20, opacity: clamp(pp * 2), transform: `translateX(${(1 - clamp(pp)) * -30}px)`}}>
            <IconBox name={x.icon ?? 'sparkles'} tone={i % 2 ? 'sky' : 'mint'} size={64} />
            <FitText text={x.text} maxW={w - 120 - 80} size={36} min={28} weight={800} color={C.ink} who="制作分工" />
          </div>
        );
      })}
    </Out>
  );
};
export const madeBySfx = (p: MadeByProps): Ev[] => [{at: p.t0 + 0.03, k: 'pop', vol: 0.4}, {at: p.t0 + 0.1, k: 'sparkle', vol: 0.28}, ...(p.parts ?? []).slice(0, 4).map((x, i): Ev => ({at: x.at ?? p.t0 + 0.5 + i * 0.3, k: 'tap', vol: 0.25}))];
