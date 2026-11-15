import React from 'react';
import {clamp, ease, lerp, prog} from '../lib/anim';
import type {Ev} from '../kit/sfx';
import {Mascot} from '../kit/overlay';
import {CharImg, MascotSay, Pose, SpeedLines, Tag} from './atoms';
import {C, FitText, Out, Tone, fit, pop, stageOf, vis} from './core';

// ═════════ 开场钩子 · 片名字卡 ═════════

export type HookLine = {
  /** 念到这句的时刻 */
  at: number;
  /** 痛点短句，10 个字左右最好；用 *星号* 包住的字变珊瑚色 */
  text: string;
};
export type HookProps = {
  t0: number;
  t1?: number;
  /** 2–4 句痛点，一句句砸出来 */
  lines: HookLine[];
  /** 落点：片名或一句承诺。到 at 时前面的痛点收走，落点大字砸到正中 */
  land?: {at: number; text: string; sub?: string};
  /** 落点时右下角探出的角色 */
  mascot?: Pose;
  vertical?: boolean;
};

/** 开场钩子：观众痛点大字一条条砸出来，最后落到片名或一句承诺 */
export const Hook: React.FC<HookProps & {t: number}> = ({t, t0, t1, lines, land, mascot, vertical}) => {
  const st = stageOf(vertical);
  const n = Math.min(lines.length, 4);
  const maxW = (vertical ? 920 : 1460) - 80;
  const size = vertical ? 84 : 96;
  const fits = lines.slice(0, n).map((l) => fit({text: l.text, maxW, size, min: 56, maxLines: 2, font: 'smiley', who: '开场钩子'}, 1.15));
  const pad = 26;
  const gap = vertical ? 44 : 30;
  const hs = fits.map((f) => f.h + pad * 2);
  const total = hs.reduce((a, b) => a + b, 0) + gap * (n - 1);
  const avail = st.bottom - st.top - 20;
  const sc = Math.min(1, avail / total);
  let y = st.cy - (total * sc) / 2;
  // 落点前 0.25 秒，痛点卡往上飞走，落点出来时画面已经空了
  const landed = land ? prog(t, land.at - 0.25, 0.22, ease.in) : 0;
  // 每砸一下，整组抖一下
  let shake = 0;
  for (const l of lines) {
    const d = t - l.at;
    if (d >= 0 && d < 0.18) shake = Math.sin(d * 90) * (1 - d / 0.18) * 7;
  }
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${shake}px, ${shake * 0.4}px)`}}>
        {landed < 1 &&
          lines.slice(0, n).map((l, i) => {
            const f = fits[i];
            const top = y;
            y += (hs[i] + gap) * sc;
            if (t < l.at - 0.02) return null;
            const p = pop(t, l.at - 0.02, 320, 17);
            const rot = (i % 2 === 0 ? -2.2 : 1.8) * (vertical ? 0.7 : 1);
            const xOff = vertical ? 0 : i % 2 === 0 ? -70 : 70;
            const w = f.w + pad * 2 + 20;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: st.cx - w / 2 + xOff,
                  top,
                  width: w,
                  transformOrigin: '50% 0%',
                  transform: `translateY(${-landed * 160}px) scale(${sc * lerp(vertical ? 1.25 : 1.6, 1, clamp(p)) * (1 - 0.25 * landed)}) rotate(${rot}deg)`,
                  opacity: clamp(p * 3) * (1 - landed),
                }}
              >
                <div style={{background: '#fff', border: `5px solid ${C.ink}`, borderRadius: 26, padding: `${pad - 6}px ${pad + 10}px ${pad + 2}px`, boxShadow: '0 12px 0 rgba(35,40,66,0.14), 0 26px 50px rgba(35,40,66,0.16)'}}>
                  <FitText text={l.text} maxW={maxW} size={size} min={56} maxLines={2} font="smiley" align="center" lh={1.15} style={{width: f.w + 4}} />
                </div>
              </div>
            );
          })}
        {land && t >= land.at - 0.02 && <Land t={t} at={land.at} text={land.text} sub={land.sub} vertical={vertical} />}
      </div>
      {land && mascot && <MascotSay t={t} t0={land.at + 0.25} pose={mascot} spot="right-bottom" vertical={vertical} h={vertical ? 380 : 380} />}
    </Out>
  );
};

const Land: React.FC<{t: number; at: number; text: string; sub?: string; vertical?: boolean}> = ({t, at, text, sub, vertical}) => {
  const st = stageOf(vertical);
  const p = pop(t, at, 260, 14);
  const maxW = vertical ? 900 : 1500;
  const f = fit({text, maxW, size: vertical ? 120 : 150, min: 72, maxLines: 2, font: 'smiley', who: '开场落点'}, 1.12);
  const subV = sub ? clamp(pop(t, at + 0.35, 220, 15)) : 0;
  return (
    <>
      <SpeedLines t={t} vis={vis(t, at, undefined, 0.15) * 0.13} vertical={vertical} inner={vertical ? 420 : 480} cy={st.cy} />
      <div style={{position: 'absolute', left: st.cx, top: st.cy - (sub ? 50 : 0), transform: `translate(-50%,-50%) scale(${lerp(1.7, 1, clamp(p))})`, opacity: clamp(p * 3), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        <FitText text={text} maxW={maxW} size={vertical ? 120 : 150} min={72} maxLines={2} font="smiley" align="center" lh={1.12} style={{width: f.w + 6}} shadow={`0 8px 0 rgba(35,40,66,0.12)`} />
      </div>
      {sub && subV > 0 && (
        <div style={{position: 'absolute', left: st.cx, top: st.cy + f.h / 2 + 10, transform: 'translateX(-50%)'}}>
          <Tag text={sub} tone="ink" size={vertical ? 40 : 44} vis={subV} maxW={vertical ? 900 : 1400} rot={-1.5} />
        </div>
      )}
    </>
  );
};

export const hookSfx = (p: HookProps): Ev[] => [
  ...p.lines.slice(0, 4).map((l): Ev => ({at: l.at, k: 'stamp', vol: 0.45})),
  ...(p.land
    ? ([
        {at: p.land.at - 0.05, k: 'air', vol: 0.25},
        {at: p.land.at, k: 'bass', vol: 0.4},
        ...(p.land.sub ? [{at: p.land.at + 0.38, k: 'pop', vol: 0.32}] : []),
      ] as Ev[])
    : []),
];

// ───────── 片名字卡 ─────────
export type TitleCardProps = {
  t0: number;
  t1?: number;
  /** 片名，*星号* 包住的字变珊瑚色 */
  title: string;
  /** 副标题：一句话说这期能得到什么 */
  sub?: string;
  /** 片名上方的小标签，如「AI 工具教程 · 第 3 期」 */
  kicker?: string;
  /** 角色姿势（和 char 二选一） */
  mascot?: Pose;
  /** 角色图：public 下路径或三帧 */
  char?: {src?: string; frames?: string[]; h?: number};
  tone?: Tone;
  vertical?: boolean;
};

/** 片名字卡：大标题 + 副标题 + 吉祥物或角色 */
export const TitleCard: React.FC<TitleCardProps & {t: number}> = ({t, t0, t1, title, sub, kicker, mascot, char, vertical}) => {
  const st = stageOf(vertical);
  const hasArt = !!(mascot || char);
  const textW = vertical ? 920 : hasArt ? 1120 : 1500;
  const left = vertical ? st.cx - textW / 2 : hasArt ? st.left + 20 : st.cx - textW / 2;
  const align = vertical || !hasArt ? 'center' : 'left';
  const tf = fit({text: title, maxW: textW, size: vertical ? 120 : 132, min: 72, maxLines: 2, font: 'smiley', who: '片名'}, 1.12);
  const sf = sub ? fit({text: sub, maxW: textW, size: 44, min: 30, maxLines: 2, who: '片名副标题'}) : null;
  const kH = kicker ? 80 : 0;
  const blockH = kH + tf.h + 30 + (sf ? sf.h + 20 : 0);
  const artH = char?.h ?? (vertical ? 560 : 620);
  const top = vertical ? st.top + 40 : st.cy - blockH / 2 - 10;
  const pt = pop(t, t0 + 0.1, 200, 15);
  const markP = prog(t, t0 + 0.45, 0.4, ease.out);
  return (
    <Out t={t} t0={t0} t1={t1}>
      <div style={{position: 'absolute', left, top, width: textW, display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start'}}>
        {kicker && (
          <div style={{height: kH}}>
            <Tag text={kicker} tone="ink" size={30} vis={pop(t, t0, 220, 15)} rot={-2} maxW={textW} />
          </div>
        )}
        <div style={{position: 'relative', display: 'inline-block', transform: `scale(${lerp(0.82, 1, clamp(pt))})`, transformOrigin: align === 'center' ? '50% 50%' : '0% 50%', opacity: clamp(pt * 2)}}>
          <div style={{position: 'absolute', left: -10, right: -10, bottom: tf.size * 0.06, height: tf.size * 0.3, background: C.sun, opacity: 0.8, borderRadius: 8, transform: `skewX(-10deg) scaleX(${markP})`, transformOrigin: '0 50%'}} />
          <FitText text={title} maxW={textW} size={vertical ? 120 : 132} min={72} maxLines={2} font="smiley" align={align} lh={1.12} style={{position: 'relative', width: 'auto'}} />
        </div>
        {sub && sf && (
          <div style={{marginTop: 30, opacity: vis(t, t0 + 0.4), transform: `translateY(${(1 - clamp(pop(t, t0 + 0.4))) * 20}px)`}}>
            <FitText text={sub} maxW={textW} size={44} min={30} maxLines={2} weight={800} color={C.ink2} align={align} />
          </div>
        )}
      </div>
      {hasArt && (
        <div
          style={{
            position: 'absolute',
            left: vertical ? st.cx : 1500,
            top: vertical ? top + blockH + 60 : st.cy + 20,
            transform: `translate(-50%, ${vertical ? 0 : -50}%) translateY(${(1 - clamp(pop(t, t0 + 0.25, 170, 15))) * 300}px)`,
            opacity: vis(t, t0 + 0.25),
          }}
        >
          {char ? <CharImg t={t} h={artH} src={char.src} frames={char.frames} /> : null}
        </div>
      )}
      {mascot && !char && !vertical && <MascotSay t={t} t0={t0 + 0.25} pose={mascot} spot="right" h={600} />}
      {mascot && !char && vertical && (
        <div style={{position: 'absolute', left: st.cx, top: top + blockH + 80, transform: `translateX(-50%) translateY(${(1 - clamp(pop(t, t0 + 0.25, 170, 15))) * 300}px)`, opacity: vis(t, t0 + 0.25)}}>
          <Mascot pose={mascot} t={t} h={Math.min(640, st.bottom - (top + blockH + 80))} />
        </div>
      )}
    </Out>
  );
};

export const titleCardSfx = (p: TitleCardProps): Ev[] => [
  ...(p.kicker ? [{at: p.t0 + 0.02, k: 'pop' as const, vol: 0.3}] : []),
  {at: p.t0 + 0.12, k: 'zoom', vol: 0.3},
  {at: p.t0 + 0.47, k: 'marker', vol: 0.28},
  ...(p.mascot || p.char ? [{at: p.t0 + 0.3, k: 'swoosh' as const, vol: 0.22}] : []),
];
