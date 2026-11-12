import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {FPS} from '../lib/time';

// 音效库：文件、能量峰在文件里的秒数、默认音量。播放时把峰对准画面上那一下。
// 音效文件不随片场分发（Mixkit 等第三方素材不许再分发）：各人放进片场 local/sfx/，开新片时拷到 public/sfx/。
// 文件名、原名和下载地址见片场根目录的 素材自备.md。
const LIB = {
  click: ['ui-click-tone', 0.0, 0.5],
  tap: ['switch-tap', 0.0, 0.32],
  select: ['ui-select-click', 0.0, 0.35],
  option: ['ui-option-select', 0.12, 0.22],
  pop: ['pop', 0.035, 0.28],
  msg: ['ui-message-pop', 0.055, 0.5],
  popup: ['ui-popup-dry', 0.13, 0.4],
  ok: ['ui-success-soft', 0.26, 0.3],
  chime: ['chime-crystal', 0.225, 0.32],
  confirm: ['ui-confirm-tone', 0.005, 0.22],
  key: ['typewriter-hit-soft', 0.14, 0.32],
  marker: ['marker-pen-line', 0.02, 0.28],
  swoosh: ['swoosh-quick', 0.275, 0.3],
  whoosh: ['whoosh-fast', 0.72, 0.32],
  soft: ['transition-soft', 0.45, 0.32],
  air: ['air-woosh-quick', 0.225, 0.26],
  sweep: ['sweep-short', 0.46, 0.4],
  page: ['paper-page-turn', 0.14, 0.9],
  slide: ['paper-slide', 0.355, 0.35],
  staple: ['paper-staple', 0.115, 0.22],
  lock: ['gear-lock-metallic', 0.225, 0.42],
  lockq: ['lock-quick', 0.01, 0.25],
  tick: ['clock-tick-single', 0.49, 0.9],
  knob: ['clock-knob-spin', 0.105, 1.0],
  sparkle: ['sparkle-touch', 0.475, 0.35],
  poof: ['sparkle-poof-hit', 0.09, 0.28],
  shimmer: ['shimmer-sparkle-sweep', 0.91, 0.26],
  stamp: ['hit-weak', 0.145, 0.45],
  zoom: ['impact-zoom-quick', 0.51, 0.25],
  bass: ['bass-hit-short', 0.085, 0.3],
  zin: ['ui-zoom-in', 0.425, 0.8],
  zout: ['ui-zoom-out', 0.32, 0.7],
  scan: ['data-scan', 0.125, 0.18],
  rewind: ['reel-rewind', 0.31, 0.22],
} as const;

export type SfxKind = keyof typeof LIB;
export type Ev = {at: number; k: SfxKind; vol?: number} | {at: number; typing: number; vol?: number};

/** 一条音效：at 是画面上那一下的成片秒数 */
const One: React.FC<{ev: Ev}> = ({ev}) => {
  if (!Number.isFinite(ev.at)) return null;
  if ('typing' in ev) {
    // 打字声：从键盘长样本里取一段，长度跟着打字时长，首尾淡入淡出
    const dur = Math.max(0.25, ev.typing);
    const from = Math.round(ev.at * FPS);
    const len = Math.round(dur * FPS);
    const v = ev.vol ?? 0.2;
    const offset = Math.round(((Math.abs(Math.sin(ev.at * 12.9898)) * 43758.5453) % 1) * 12 * FPS);
    return (
      <Sequence from={from} durationInFrames={len} layout="none">
        <Audio
          src={staticFile('sfx/keyboard.mp3')}
          trimBefore={offset}
          volume={(f) => v * Math.min(1, f / 6) * Math.min(1, (len - f) / 8)}
        />
      </Sequence>
    );
  }
  const [file, peak, v] = LIB[ev.k];
  const from = Math.max(0, Math.round((ev.at - peak) * FPS));
  return (
    <Sequence from={from} layout="none">
      <Audio src={staticFile(`sfx/${file}.mp3`)} volume={ev.vol ?? v} />
    </Sequence>
  );
};

export const SfxTrack: React.FC<{events: Ev[]}> = ({events}) => (
  <>
    {events.map((ev, i) => (
      <One key={i} ev={ev} />
    ))}
  </>
);
