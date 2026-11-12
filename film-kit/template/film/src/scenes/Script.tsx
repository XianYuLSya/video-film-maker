import React from 'react';
import type {Ev} from '../kit/sfx';
import {C, bubble, chapter} from '../lib/time';
import {CardRow, ChapterBreak, ChapterTag, cardRowSfx, chapterBreakSfx, chapterTagSfx} from '../blocks';
import type {Scene} from './common';
import {edge} from './common';

// ═════════ 第一章：稿子带标记（a1 a2 + 气泡 q1） ═════════
//
// 骨架和 Hook.tsx 一样：range → props 函数 → 组件 → sfx → 导出。
//
// 这一章的画面：
//   换章过场（ChapterBreak）  章节开始前 0.8 秒推进来，第一句开口时刚好推走；标题要能读 1.2 秒以上
//   章节牌（ChapterTag）      过场推走时出现在左上角，整章常驻
//   卡片排（CardRow）         四张卡，念到哪个词哪张卡弹出：
//       a1 {line} 口播句   a1 {mark} 标记   a2 {bubble} 气泡   a2 {sting} 片头片尾
//   气泡 q1（无声）           小咸鱼从左下角探出来说「就这么简单？」——它由 Film.tsx 统一画，
//                            场景只负责让位：卡片在气泡出现前整体缩小、移到顶上（shrinkAt）。

/** 范围：从过场开始（章节开始前 0.8 秒），画到下一章开始。下一章的过场会盖在上面，所以两幕重叠一点没关系 */
const range = () => [chapter('a').start - 0.8, chapter('b').start] as const;

/**
 * 换章过场的时间：
 *   chapter('a').start  是上一段结束后再留 chapterGap（film.json，现为 0.9 秒）的那一刻
 *   chapter('a').first  是这一章第一句开口的时刻（start 之后再留 leadLine，现为 1.2 秒）
 * 过场从 start 前 0.8 秒推进来，持续到 first 后 0.05 秒推走 —— 推走那一下正好接上第一句。
 * 标题要能读 1.2 秒以上：推入、推出各 0.35 秒，标题停的时间 ≈ dur - 0.7，所以 dur 至少 1.9 秒，
 * 也就是 leadLine 至少 1.05 秒。把 film.json 的 leadLine 调小，标题就读不完了（积木会在控制台报警）。
 */
const brk = () => ({
  t0: chapter('a').start - 0.8,
  // 标题要能读 1.2 秒以上：过场时长 = 0.8 + (first - start) + 0.05，film.json 的 leadLine=1.2 时约 2.05 秒，标题停约 1.4 秒
  dur: chapter('a').first - chapter('a').start + 0.85,
  n: 1,
  title: '稿子带标记',
  sub: '要出画面的词，前面做个记号',
  icon: 'fileText',
});
/** 章节牌在过场推走前 0.2 秒出来，推走时已经站稳 */
const tag = () => ({t0: brk().t0 + brk().dur - 0.2, t1: chapter('b').start, text: '一 · 稿子带标记', n: 1});

const cards = () => ({
  t0: chapter('a').first - 0.1,
  title: '稿子里写什么',
  items: [
    {at: C('a1', 'line'), title: '口播句', desc: '一句一条，有 id 和章节', icon: 'chat', tone: 'sky' as const},
    {at: C('a1', 'mark'), title: '{标记}', desc: '念到这个词，画面就出来', icon: 'pin', tone: 'coral' as const, badge: '对点'},
    {at: C('a2', 'bubble'), title: '无声气泡', desc: '小咸鱼说一句，不念', icon: 'sparkles', tone: 'sun' as const},
    {at: C('a2', 'sting'), title: '片头片尾', desc: '频道通用，写一行就有', icon: 'play', tone: 'mint' as const},
  ],
  // 气泡开始前 0.6 秒开始缩（缩完要 0.6 秒），小咸鱼探出来时下半屏已经空了
  shrinkAt: bubble('q1').start - 0.6,
});

const ScriptC: React.FC<{t: number}> = ({t}) => {
  const [a, b] = range();
  return (
    <div style={{position: 'absolute', inset: 0, opacity: edge(t, a, b)}}>
      <ChapterTag t={t} {...tag()} />
      <CardRow t={t} {...cards()} />
      {/* 过场放最后：图层在最上面，推进来时盖住一切 */}
      <ChapterBreak t={t} {...brk()} />
    </div>
  );
};

const sfx = (): Ev[] => [...chapterBreakSfx(brk()), ...chapterTagSfx(tag()), ...cardRowSfx(cards())];

export const ScriptScene: Scene = {id: 'a', range, C: ScriptC, sfx};
