import React from 'react';
import type {Ev} from '../kit/sfx';
import {C, E, chapter} from '../lib/time';
import {ChapterBreak, ChapterTag, Flow, Stamp, chapterBreakSfx, chapterTagSfx, flowSfx, stampSfx} from '../blocks';
import type {Scene} from './common';
import {edge} from './common';

// ═════════ 第二章：画面对标记（b1 b2） ═════════
//
// 这一章用一张流程图讲清数据怎么走：稿子 → 配音 → 时间表 → 画面。
//   b1 {voice}   「稿子」「配音」两个节点出来，走到「配音」
//   b1 {table}   「时间表」出来，走到「时间表」
//   b2 {scene}   「画面」出来，走到「画面」
//   b2 {change}  盖章「不写死秒数」
// 流程图的 path 就是「当前走到哪」：当前节点橙色，走过的变绿，路过的箭头上有小点跑过去。

const range = () => [chapter('b').start - 0.8, chapter('c').start] as const;

const brk = () => ({
  t0: chapter('b').start - 0.8,
  // 标题要能读 1.2 秒以上：过场时长 = 0.8 + (first - start) + 0.05，film.json 的 leadLine=1.2 时约 2.05 秒，标题停约 1.4 秒
  dur: chapter('b').first - chapter('b').start + 0.85,
  n: 2,
  title: '画面对标记',
  sub: '配音时把每个标记的时刻记下来',
  icon: 'clock',
});
const tag = () => ({t0: brk().t0 + brk().dur - 0.2, t1: chapter('c').start, text: '二 · 画面对标记', n: 2});

const flow = () => {
  const tv = C('b1', 'voice');
  return {
    t0: chapter('b').first - 0.1,
    title: '配音出时间表，画面按表出场',
    nodes: [
      // 「稿子」比「配音」早 0.3 秒：先有稿子再有配音，两个节点错开才看得出先后
      {id: 'script', at: tv - 0.3, text: '稿子', sub: 'script.json', icon: 'fileText'},
      {id: 'voice', at: tv, text: '配音', sub: '念出每个标记', icon: 'mic'},
      {id: 'table', at: C('b1', 'table'), text: '时间表', sub: '标记 → 秒数', icon: 'clock'},
      {id: 'scene', at: C('b2', 'scene'), text: '画面', sub: '按标记出场', icon: 'play'},
    ],
    path: [
      {at: tv + 0.25, id: 'voice'},
      {at: C('b1', 'table') + 0.25, id: 'table'},
      {at: C('b2', 'scene') + 0.25, id: 'scene'},
    ],
  };
};

/** 章子：念到「改稿重配音」盖下去，b2 念完再留 0.6 秒就收（不拖到下一章过场） */
const stamp = () => ({at: C('b2', 'change'), t1: E('b2') + 0.6, text: '不写死秒数', tone: 'mint' as const, x: 960, y: 800, size: 72, rot: -6});

const SyncC: React.FC<{t: number}> = ({t}) => {
  const [a, b] = range();
  return (
    <div style={{position: 'absolute', inset: 0, opacity: edge(t, a, b)}}>
      <ChapterTag t={t} {...tag()} />
      <Flow t={t} {...flow()} />
      <Stamp t={t} {...stamp()} />
      <ChapterBreak t={t} {...brk()} />
    </div>
  );
};

const sfx = (): Ev[] => [...chapterBreakSfx(brk()), ...chapterTagSfx(tag()), ...flowSfx(flow()), ...stampSfx(stamp())];

export const SyncScene: Scene = {id: 'b', range, C: SyncC, sfx};
