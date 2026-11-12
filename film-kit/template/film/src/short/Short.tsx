import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Probe} from '../kit/probe';
import {Paper} from '../kit/overlay';
import {clamp} from '../lib/anim';
import {C as K, F} from '../lib/theme';
import type {Ev} from '../kit/sfx';
import {CheckList, EndCard, Flow, Hook, Terminal, checkListSfx, endCardSfx, flowSfx, hookSfx, terminalSfx} from '../blocks';
import {C, E, S, TOTAL_S, allSubs, bubbles} from './timeShort';

// ═════════ 竖屏短版（1080×1920） ═════════
//
// 结构：钩子 → 证据 → 要点 → 去哪看完整的。
//   s1 {hook}{redo}     两句痛点砸出来（Hook 竖屏）
//   s2 {proof}{cmd}     终端敲出 .\film.cmd all short —— 这条短片就是这么出来的（Terminal 竖屏）
//   s3 {mark}{sync}     稿子 → 时间表 → 画面，竖排流程图（Flow 竖屏）
//   s4 {resume}{probe}  两条打勾（CheckList 竖屏）
//   s5 {more}{group}    片尾卡：群号；气泡 q1 由片尾卡里的小咸鱼说出来（EndCard 竖屏）
//
// 和正片的三个区别：
//   1. 时间一律从 ./timeShort 取（短版自己的时间表），不能拿正片的 lib/time 对点。
//   2. 所有积木都传 vertical：版面按竖屏安全区排（内容在 y 240–1480，左右各留 80）。
//   3. 没有 Film.tsx 帮忙叠字幕和气泡，字幕（SubsV）和气泡都在这个文件里自己画。
// 每一段的 t1 都设成「下一句开口前 0.15 秒」：上一块淡出（0.3 秒）和下一块弹出刚好交接，不叠在一起。

export const SHORT_FRAMES = (fps: number) => Math.ceil(TOTAL_S() * fps);

/** 竖屏字幕：放在内容安全区下面（y 1510 起），字号放大到手机上能读 */
const SubsV: React.FC<{t: number}> = ({t}) => {
  const s = allSubs().find((x) => t >= x.s - 0.04 && t < x.e + 0.06);
  if (!s) return null;
  const v = Math.min(clamp((t - (s.s - 0.04)) / 0.08), clamp((s.e + 0.06 - t) / 0.08));
  return (
    <div data-probe="subtitle" style={{position: 'absolute', left: 60, right: 60, top: 1510, display: 'flex', justifyContent: 'center', zIndex: 40}}>
      <div style={{maxWidth: 960, background: 'rgba(35,40,66,0.94)', color: '#fff', fontFamily: F.zh, fontWeight: 800, fontSize: 52, lineHeight: 1.3, padding: '12px 32px 14px', borderRadius: 18, textAlign: 'center', opacity: v}}>
        {s.t}
      </div>
    </div>
  );
};

// ───────── 每段一个 props 函数（画面和音效共用） ─────────
const hook = () => ({
  t0: S('s1') - 0.1,
  t1: S('s2') - 0.15,
  lines: [
    {at: C('s1', 'hook'), text: '改一句*稿子*'},
    {at: C('s1', 'redo'), text: '全片都要*返工*？'},
  ],
  vertical: true,
});

const term = () => ({
  t0: C('s2', 'proof') - 0.05,
  t1: S('s3') - 0.15,
  // 只有三行输出，窗口给 640 高就够，不然一大片空黑
  h: 640,
  cwd: 'D:\\work\\新片',
  lines: [
    {at: C('s2', 'cmd'), cmd: '.\\film.cmd all short', cps: 18},
    // 输出排在命令敲完之后：20 个字 ÷ 18 字/秒 ≈ 1.1 秒
    {at: C('s2', 'cmd') + 1.2, out: '✓ 配音  ✓ 渲染  ✓ 混音', tone: 'ok' as const},
    {at: C('s2', 'cmd') + 1.5, out: '✓ 成片体检  通过', tone: 'ok' as const},
  ],
  vertical: true,
});

const flow = () => ({
  t0: S('s3') - 0.1,
  t1: S('s4') - 0.15,
  title: '标记自己对上',
  nodes: [
    {id: 'script', at: C('s3', 'mark'), text: '稿子带标记', icon: 'fileText'},
    {id: 'table', at: C('s3', 'mark') + 0.35, text: '时间表', sub: '标记 → 秒数', icon: 'clock'},
    {id: 'scene', at: C('s3', 'sync'), text: '画面按时出场', icon: 'play'},
  ],
  path: [
    {at: C('s3', 'mark') + 0.2, id: 'script'},
    {at: C('s3', 'sync') - 0.3, id: 'table'},
    {at: C('s3', 'sync') + 0.3, id: 'scene'},
  ],
  vertical: true,
});

const checks = () => ({
  t0: S('s4') - 0.1,
  t1: S('s5') - 0.15,
  title: '片场替你盯着',
  items: [
    {at: C('s4', 'resume'), text: '渲染断了接着跑'},
    {at: C('s4', 'probe'), text: '字出框自动报'},
  ],
  vertical: true,
});

/** 片尾卡：气泡 q1 的文字和时刻都从时间表取，交给片尾卡里的小咸鱼说 */
const endCard = () => {
  const q = bubbles().find((b) => b.id === 'q1');
  return {
    t0: C('s5', 'more') - 0.05,
    group: '123456789',
    groupNote: '有问题来群里问',
    tripleAt: C('s5', 'group') + 0.4,
    made: '本视频由 Claude 制作',
    mascot: 'victory' as const,
    say: q?.text ?? '下期见！',
    sayAt: q?.start ?? E('s5'),
    vertical: true,
  };
};

export type ShortProps = {probe?: boolean};

export const ShortFilm: React.FC<ShortProps> = ({probe = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: K.paper, overflow: 'hidden'}}>
      <Paper t={t} />
      <Hook t={t} {...hook()} />
      <Terminal t={t} {...term()} />
      <Flow t={t} {...flow()} />
      <CheckList t={t} {...checks()} />
      <EndCard t={t} {...endCard()} />
      <SubsV t={t} />
      {probe && <Probe />}
    </AbsoluteFill>
  );
};

/** 短版音效清单：每块积木的音效函数展开 */
export const shortSfx = (): Ev[] => [...hookSfx(hook()), ...terminalSfx(term()), ...flowSfx(flow()), ...checkListSfx(checks()), ...endCardSfx(endCard())];
