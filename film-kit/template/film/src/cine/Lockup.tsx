// 落款：全片最后几秒。应用图标 + 字标 + 一句标语 + 网址，落定后静止。
//
// 版式和时间是锁死的（下面的偏移都从 t0 算，t0 写一个拍点，是图标撑开的那一下，全片最重的一拍）：
//   t0 − 0.42   界面里的小徽标（可选）开始翻扁成一道竖线
//   t0          最薄处换成应用图标，撑开（小回弹，过冲 3% 以内）
//   t0 + 0.62   图标让到左边，字标逐字落定
//   t0 + 1.35   标语
//   t0 + 1.85   网址和一句附注
//   之后        静止。字标落定后至少留 1 秒，全部落定后至少留 2 秒，再结束
// 产品没有图标时不传 icon：只有字标，t0 那一下字标逐字落定、居中，标语和网址各提前 0.6 秒。
// 不做的事：徽标不晃、不眨眼、不做任何卡通预备动作。可爱的东西一动，前面攒的「精密」就散了。
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {H, W} from '../lib/time';
import {clamp} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {go, press, run, warn} from './motion';
import {textEm} from './Type';
import {CineTheme, alpha} from './theme';

export type LockupProps = {
  t: number;
  /** 图标撑开的时刻（写一个拍点） */
  t0: number;
  theme: CineTheme;
  /** 应用图标（public 下的路径，方的、带自己的底色和圆角）。产品没有图标就不传：只出字标，居中 */
  icon?: string;
  /** 字标：产品名 */
  word: string;
  /** 标语，一行。用 *星号* 包住要加重的几个字 */
  line: string;
  /** 网址 */
  url?: string;
  /** 网址旁边的一句附注（如「本机运行 · 免费使用」） */
  note?: string;
  /** 界面里的小徽标（public 下的路径，透明底的单色图形，会被染成浅色）：给了就先出它、再翻成应用图标，接上一个镜头 */
  mark?: string;
  /** 这一场结束的时刻：用来检查静止够不够久 */
  end?: number;
};

const ICON = 236;
const WORD = 150;

export const Lockup: React.FC<LockupProps> = ({t, t0, theme, icon, word, line, url, note, mark, end}) => {
  const bare = !icon; // 没有图标：只有字标
  const lead = bare ? 0.6 : 0; // 少了「图标撑开再让位」那一段，后面的都提前
  const settled = t0 + 2.3 - lead;
  if (end !== undefined && end - settled < 2) warn('Lockup', `落款全部落定后只停了 ${(end - settled).toFixed(1)} 秒，至少 2 秒。把这一场延长，或者把 t0 提前`);
  if (bare && mark) warn('Lockup', '给了 mark 没给 icon：小徽标翻扁以后没有东西接，不会画。要么两个都给，要么都不给');
  if (textEm(line.replace(/\*/g, '')) > 22) warn('Lockup', '标语太长，一行放不下，控制在 20 个字以内');
  const tFlat = t0 - 0.42;
  const tSlide = t0 + 0.62;
  const tWord = bare ? t0 : t0 + 0.78;
  const tLine = t0 + 1.35 - lead;
  const tUrl = t0 + 1.85 - lead;
  const pre = t < t0;
  // 翻扁：加速收成一道竖线；撑开：小回弹
  const flat = pre ? go(t, tFlat, t0, 1, 0.04, 'launch') : 0.04 + 0.96 * press(t - t0, 150, 19);
  const slide = run(t, tSlide, 0.7, 'glide');
  const wordW = textEm(word, -0.03) * WORD;
  const gap = 56;
  const groupW = bare ? wordW : ICON + gap + wordW;
  const wordLeft = W / 2 - groupW / 2 + (bare ? 0 : ICON + gap);
  const iconX = W / 2 + (-(groupW / 2) + ICON / 2) * slide;
  const iconScale = 1.42 - 0.42 * slide;
  const baseY = H / 2 - 64 * slide;
  const glow = pre ? 0 : Math.max(0.25, 1 - run(t, t0 + 0.1, 1.2, 'ease'));
  const creep = 1 + 0.018 * clamp((t - tWord) / 5); // 落定后极慢地推近，静止的画面也活着
  const parts = line.split('*');
  return (
    <AbsoluteFill style={{background: theme.void, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 50% 56% at 50% 48%, ${alpha(theme.paper, 0.07 + 0.07 * glow)} 0%, ${alpha(theme.paper, 0)} 72%),` +
            `radial-gradient(ellipse 62% 42% at 50% 108%, ${alpha(theme.accent, 0.1)} 0%, ${alpha(theme.accent, 0)} 72%),` +
            `linear-gradient(180deg, ${theme.stage} 0%, ${theme.void} 70%)`,
        }}
      />
      <AbsoluteFill style={{transform: `scale(${creep.toFixed(5)})`}}>
        {!bare && <div style={{position: 'absolute', left: iconX - ICON / 2, top: baseY - ICON / 2, width: ICON, height: ICON, transform: `scale(${iconScale.toFixed(4)}) scaleX(${flat.toFixed(4)})`}}>
          {pre ? (
            mark ? <Img src={staticFile(mark)} style={{position: 'absolute', left: -ICON * 0.3, top: -ICON * 0.3, width: ICON * 1.6, height: ICON * 1.6, opacity: 0.95, filter: 'brightness(0) invert(0.93)'}} /> : null
          ) : (
            <>
              <div style={{position: 'absolute', inset: 10, borderRadius: ICON * 0.22, boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 ${70 * glow}px ${alpha(theme.paper, 0.4 * glow)}`}} />
              <Img src={staticFile(icon!)} style={{position: 'absolute', inset: 0, width: ICON, height: ICON}} />
            </>
          )}
        </div>}
        <div style={{position: 'absolute', left: wordLeft, top: H / 2 - 64 - WORD * 0.6, height: WORD, display: 'flex', fontFamily: theme.font.cjk, fontWeight: 700, fontSize: WORD, letterSpacing: '-0.03em', lineHeight: 1, color: theme.text}}>
          {Array.from(word).map((ch, i) => {
            const p = run(t, tWord + i * 0.07, 0.45, 'settle');
            return (
              <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: clamp(p * 1.6), transform: `scale(${(1.7 - 0.7 * p).toFixed(4)})`, transformOrigin: '50% 90%', filter: p < 0.999 ? `blur(${((1 - p) * 13).toFixed(2)}px)` : undefined}}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{position: 'absolute', top: H / 2 + 108, width: W, textAlign: 'center', fontFamily: theme.font.cjk, fontWeight: 500, fontSize: 56, letterSpacing: '0.02em', color: theme.text2, whiteSpace: 'nowrap'}}>
          {parts.map((s, i) => {
            const p = run(t, tLine + i * 0.12, 0.6, 'settle');
            return (
              <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: p, transform: `translateY(${((1 - p) * 20).toFixed(2)}px)`, filter: p < 0.999 ? `blur(${((1 - p) * 9).toFixed(2)}px)` : undefined, color: i % 2 ? theme.text : undefined, fontWeight: i % 2 ? 750 : 500}}>
                {s}
              </span>
            );
          })}
        </div>
        {(url || note) && (
          <div style={{position: 'absolute', top: H / 2 + 214, width: W, textAlign: 'center', fontFamily: theme.font.mono, fontSize: 34, letterSpacing: '0.07em', color: theme.text3, opacity: run(t, tUrl, 0.5, 'settle'), whiteSpace: 'nowrap'}}>
            {url}
            {url && note && <span style={{margin: '0 22px', color: theme.line}}>|</span>}
            {note && <span style={{fontFamily: theme.font.cjk, letterSpacing: '0.04em'}}>{note}</span>}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** 落款的声音是一个句子：蓄力 → 撞击 → 余韵。撞击那一下和图标撑开是同一拍 */
export const lockupSfx = (o: {t0: number}): Ev[] => [
  {at: o.t0, k: 'whoosh', vol: 0.3},
  {at: o.t0, k: 'bass', vol: 0.42},
  {at: o.t0 + 0.08, k: 'zoom', vol: 0.22},
  {at: o.t0 + 1.0, k: 'shimmer', vol: 0.2},
];
