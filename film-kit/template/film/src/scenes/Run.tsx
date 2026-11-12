import React from 'react';
import type {Ev} from '../kit/sfx';
import {C, S, chapter} from '../lib/time';
import {
  ChapterBreak,
  ChapterTag,
  CheckList,
  PointNote,
  Stamp,
  Terminal,
  chapterBreakSfx,
  chapterTagSfx,
  checkListSfx,
  pointNoteSfx,
  stampSfx,
  terminalSfx,
  textW,
  vis,
} from '../blocks';
import type {Scene} from './common';
import {edge} from './common';

// ═════════ 第三章：一条命令出片（c1 c2 c3） ═════════
//
// 操作演示类的写法：模拟一个终端窗，命令逐字敲出、输出逐行出来，再用说明牌指着命令。
// 模拟界面要标「示意画面」：给 Scene 加 demo(t)，返回 0..1 的可见度，Film.tsx 会在角落画角标。
//
//   c1 {cmd}     终端敲出 .\film.cmd all zh，说明牌指着它「就这一条」
//   c1 {steps}   配音、体检、渲染、混音、合成、成片体检六行输出，一行行出来
//   c2 {resume}  一行黄字「上次断在第 2 段」，盖章「断点续跑」
//   c2 {skip}    「第 1 段已渲好，跳过」
//   c3 {review}  终端退场，换成核对清单「审片会查」，第一条打勾
//   c3 {probe}   后面三条依次打勾

const range = () => [chapter('c').start - 0.8, chapter('end').start] as const;

const brk = () => ({
  t0: chapter('c').start - 0.8,
  // 标题要能读 1.2 秒以上：过场时长 = 0.8 + (first - start) + 0.05，film.json 的 leadLine=1.2 时约 2.05 秒，标题停约 1.4 秒
  dur: chapter('c').first - chapter('c').start + 0.85,
  n: 3,
  title: '一条命令出片',
  sub: '配音、渲染、混音、合成、体检',
  icon: 'play',
});
const tag = () => ({t0: brk().t0 + brk().dur - 0.2, t1: chapter('end').start, text: '三 · 一条命令出片', n: 3});

const CWD = 'D:\\work\\新片';
const CMD = '.\\film.cmd all zh';
/** 终端窗高 640：一共 9 行输出，用不着占满整屏 */
const TERM_H = 640;

/** 终端：c3 开口时退场（t1），给核对清单让位 */
const term = () => {
  const ts = C('c1', 'steps');
  // 六步输出：从 {steps} 起每 0.4 秒一行。一句话里念不完六个词，就按画面节奏排，不硬对每个字
  const steps = ['✓ 配音  时间表已更新', '✓ 体检  0 个错误', '✓ 渲染  2 段', '✓ 混音  -14.0 LUFS', '✓ 合成  成品已写出', '✓ 成片体检  通过'];
  return {
    t0: chapter('c').first - 0.15,
    t1: S('c3') - 0.15,
    h: TERM_H,
    cwd: CWD,
    lines: [
      {at: C('c1', 'cmd'), cmd: CMD, cps: 16},
      ...steps.map((out, i) => ({at: ts + i * 0.4, out, tone: 'ok' as const})),
      {at: C('c2', 'resume'), out: '! 上次断在第 2 段', tone: 'warn' as const},
      {at: C('c2', 'skip'), out: '  第 1 段已渲好，跳过', tone: 'mute' as const},
    ],
  };
};

/**
 * 说明牌指着命令行的末尾。终端窗口的位置是积木自己排的：居中、宽 1400（左边 x=260），
 * 高 TERM_H、在安全区（y 150–915，共 765）里竖直居中；标题栏 56、上边距 18、行高 42，
 * 所以第一行文字的中线 y = 150 + (765 - TERM_H) / 2 + 56 + 18 + 21。
 * 文字从 x=290 开始，等宽字每个字 0.6 个字号宽，用 textW 估出命令末尾在哪，再往右让 36 像素别压字。
 * 命令敲完（16 字/秒）再出说明牌，所以 at = {cmd} + 字数 / 16 + 0.1。
 */
const note = () => {
  const lineEnd = 290 + textW(`PS ${CWD}> ${CMD}`, 28, 'mono');
  const lineY = 150 + (765 - TERM_H) / 2 + 56 + 18 + 21;
  return {at: C('c1', 'cmd') + Array.from(CMD).length / 16 + 0.1, t1: C('c1', 'steps') + 1.2, x: lineEnd + 36, y: lineY, dir: 'right' as const, gap: 60, text: '就这*一条*', num: 1};
};

const stamp = () => ({at: C('c2', 'resume') + 0.1, t1: S('c3') - 0.15, text: '断点续跑', tone: 'coral' as const, x: 1420, y: 700, size: 72, rot: -8});

/** 核对清单：c3 开口时出来；第一条对 {review}，后三条从 {probe} 起每 0.35 秒打一个勾 */
const checks = () => {
  const tp = C('c3', 'probe');
  return {
    t0: S('c3') - 0.05,
    title: '审片会查',
    items: [
      {at: C('c3', 'review'), text: '按标记自动抽帧', note: '每张图配上字幕和原文'},
      {at: tp, text: '字有没有出画'},
      {at: tp + 0.35, text: '有没有压到字幕'},
      {at: tp + 0.7, text: '字是不是太小'},
    ],
  };
};

const RunC: React.FC<{t: number}> = ({t}) => {
  const [a, b] = range();
  return (
    <div style={{position: 'absolute', inset: 0, opacity: edge(t, a, b)}}>
      <ChapterTag t={t} {...tag()} />
      <Terminal t={t} {...term()} />
      <PointNote t={t} {...note()} />
      <Stamp t={t} {...stamp()} />
      <CheckList t={t} {...checks()} />
      <ChapterBreak t={t} {...brk()} />
    </div>
  );
};

const sfx = (): Ev[] => [
  ...chapterBreakSfx(brk()),
  ...chapterTagSfx(tag()),
  ...terminalSfx(term()),
  ...pointNoteSfx(note()),
  ...stampSfx(stamp()),
  ...checkListSfx(checks()),
];

/** 「示意画面」角标：终端在画面上的那段时间亮着 */
const demo = (t: number) => vis(t, term().t0, term().t1);

export const RunScene: Scene = {id: 'c', range, C: RunC, sfx, demo};
