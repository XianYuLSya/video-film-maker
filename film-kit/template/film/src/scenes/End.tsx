import React from 'react';
import type {Ev} from '../kit/sfx';
import {C, E, S, chapter, sting} from '../lib/time';
import {EndCard, Recap, endCardSfx, recapSfx} from '../blocks';
import type {Scene} from './common';
import {edge} from './common';

// ═════════ 收尾（e1 + 气泡 q2 + e2 + 通用片尾） ═════════
//
//   e1 {recap}       回顾标题出来；{r1}{r2}{r3} 三条要点一条条打勾（Recap 积木）
//   q2（无声气泡）     大号小咸鱼从下面冒出来喊「懒鱼！开工！」——Film.tsx 统一画（id 是 q2 的气泡画成大号）。
//                    所以回顾在 e1 念完就退场，把画面让给它。
//   e2 {group}       片尾卡：QQ 群号大字；{like} 一键三连（EndCard 积木）
//   之后是通用片尾（sting outro），片尾视频一进来这一幕就结束。

/** 范围：章节开始前 0.5 秒（和上一章最后 0.5 秒交叠淡入），画到通用片尾开始后 0.15 秒 */
const range = () => [chapter('end').start - 0.5, sting('outro').start + 0.15] as const;

const recap = () => ({
  t0: C('e1', 'recap') - 0.05,
  // e1 一念完就退场（退场淡出 0.3 秒），紧接着就是气泡 q2，小咸鱼要占画面中间
  t1: E('e1'),
  title: '记住这三句',
  items: [
    {at: C('e1', 'r1'), text: '稿子带标记', icon: 'fileText'},
    {at: C('e1', 'r2'), text: '画面对标记', icon: 'clock'},
    {at: C('e1', 'r3'), text: '一条命令出片', icon: 'play'},
  ],
});

/** 片尾卡：e2 开口前 0.15 秒出来；群号、署名、致谢都是 props，不在积木里写死 */
const endCard = () => ({
  t0: S('e2') - 0.15,
  group: '123456789',
  groupNote: '想看更多 AI 工具教程，来群里聊',
  tripleAt: C('e2', 'like'),
  made: '本视频由 Claude 制作',
  thanks: 'film-kit 示范片',
  creditsAt: C('e2', 'group') + 0.6,
  say: '下期见！',
});

const EndC: React.FC<{t: number}> = ({t}) => {
  const [a, b] = range();
  return (
    <div style={{position: 'absolute', inset: 0, opacity: edge(t, a, b, 0.35, 0.3)}}>
      <Recap t={t} {...recap()} />
      <EndCard t={t} {...endCard()} />
    </div>
  );
};

const sfx = (): Ev[] => [...recapSfx(recap()), ...endCardSfx(endCard())];

export const EndScene: Scene = {id: 'end', range, C: EndC, sfx};
