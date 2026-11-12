import React from 'react';
import type {Ev} from '../kit/sfx';
import {C, S, chapter, sting} from '../lib/time';
import {Hook, Roadmap, hookSfx, roadmapSfx} from '../blocks';
import type {Scene} from './common';
import {edge} from './common';

// ═════════ 开场：这期讲什么（稿子里的 h1 h2 h3） ═════════
//
// 每个场景文件都是同一个骨架，照抄就行：
//   1. range()    这一幕在成片里从几秒画到几秒
//   2. xxx()      每块积木一个「props 函数」：组件和音效共用同一份 props，时间只写一遍
//   3. 组件       最外层 div 用 edge() 做整幕淡入淡出，里面按图层顺序摆积木
//   4. sfx()      把每块积木的音效函数展开，交给混音
//   5. 导出 Scene，并在 scenes/index.ts 里登记
//
// 所有时间都从时间表取，不写死秒数（稿子改了重跑 .\film.cmd voice zh，画面自动跟着走）：
//   chapter('hook').start  这一章开始      S('h3')  h3 这句开始念    E('h1')  h1 念完
//   C('h1','a')            h1 里念到 {a} 那个词的瞬间
//
// 这一章的画面：
//   h1 {a}{b}{c}  三句痛点一句句砸出来（Hook 积木）
//   h2 {land}     痛点飞走，落到「一条命令出片」这句承诺
//   h3 {road}     换成「本期路线」，{s1}{s2}{s3} 三件事一项项点亮（Roadmap 积木）
//   之后是通用片头（sting intro），片头一进来这一幕就该结束。

/** 这一幕的范围：从片子开头，画到通用片头开始后 0.2 秒（片头视频盖在最上层，多画 0.2 秒避免露底） */
const range = () => [chapter('hook').start, sting('intro').start + 0.2] as const;

/** 开场钩子：t1 设在 h3 开始前 0.1 秒，让它先退场、路线图再进来，两块不叠 */
const hook = () => ({
  t0: chapter('hook').start,
  t1: S('h3') - 0.1,
  lines: [
    // 每条的 at 就是念到那个词的瞬间：字和声音同时砸下来
    {at: C('h1', 'a'), text: '剪片*累*'},
    {at: C('h1', 'b'), text: '配音*对不上*'},
    {at: C('h1', 'c'), text: '改一句，*全片返工*'},
  ],
  land: {at: C('h2', 'land'), text: '一条命令*出片*', sub: '咸鱼凌生的片场 film-kit'},
  mascot: 'point' as const,
});

/** 本期路线：t0 提前 0.05 秒 —— 积木的弹出动画要 0.05 秒才看得见，提前一点，字幕和画面才是「同时」出现 */
const road = () => ({
  t0: C('h3', 'road') - 0.05,
  title: '这期讲三件事',
  items: [
    {at: C('h3', 's1'), text: '稿子带标记', sub: '要出画面的词做记号', icon: 'fileText'},
    {at: C('h3', 's2'), text: '画面对标记', sub: '时间表替你对点', icon: 'clock'},
    {at: C('h3', 's3'), text: '一条命令出片', sub: '渲染、混音、体检全包', icon: 'play'},
  ],
});

const HookC: React.FC<{t: number}> = ({t}) => {
  const [a, b] = range();
  return (
    // edge：整幕开头 0.35 秒淡入、结尾 0.35 秒淡出。每个场景最外层都这么包
    <div style={{position: 'absolute', inset: 0, opacity: edge(t, a, b)}}>
      <Hook t={t} {...hook()} />
      {/* 路线图一直留到片头盖上来；它的 t1 不写，场景的 edge 会负责淡出 */}
      <Roadmap t={t} {...road()} />
    </div>
  );
};

const sfx = (): Ev[] => [...hookSfx(hook()), ...roadmapSfx(road())];

export const HookScene: Scene = {id: 'hook', range, C: HookC, sfx};

// 想让某块「念完这句就收」时，把它的 t1 设成那句的 E（比如 t1: E('h2')）。
