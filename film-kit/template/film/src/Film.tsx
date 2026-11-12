import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {DemoMark} from './blocks';
import {Probe} from './kit/probe';
import {BubbleSlots, Paper, Subtitles} from './kit/overlay';
import {Ev, SfxTrack} from './kit/sfx';
import {items} from './lib/time';
import {SCENES} from './scenes';

// 正片：纸底 + 各章场景 + 小咸鱼气泡 + 字幕 + 通用片头片尾。
// 场景自己不画面具和字幕，都在这儿统一叠加，顺序就是图层顺序（后面的画在上面）。
//
// 例外是「整屏自管」的场景（Scene.bare: true，深色底的品牌片用）：当前时刻生效的场景里
// 只要有一个 bare，外壳就整屏让开 —— 底色换成纯黑 #000、不画纸感底 <Paper/>、不画烧录字幕条
// <Subtitles/>、不画气泡槽 <BubbleSlots/>、不画「示意画面」角标，都由场景自己铺、自己放。
// SRT 字幕照常生成（vo/srt.py 不看这里），只是不烧进画面。
export type FilmProps = {lang?: string; audio?: 'none' | 'sfx'; probe?: boolean};

/** 音效清单：每个场景报自己的音效，这里合起来交给 scripts/sfxlist.mjs 导出 */
export const allSfx = (): Ev[] => SCENES.flatMap((s) => s.sfx());

/** 片头片尾在时间表里是可选的（短版和关掉通用片头片尾时就没有这段），所以用查的、不硬取 */
const findSting = (id: string) => items().find((x) => x.kind === 'sting' && x.id === id);

export const Film: React.FC<FilmProps> = ({audio = 'none', probe = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const intro = findSting('intro');
  const outro = findSting('outro');
  // 当前时刻生效的场景；一个都没有时也就没有 bare（裸黑底只在场景自己声明的时段出现）
  const active = SCENES.filter((s) => {
    const [a, b] = s.range();
    return t >= a && t < b;
  });
  // 整屏自管：有 bare 就全 bare（相邻两幕范围重叠淡入淡出时也按这个办，见 README）
  const bare = active.some((s) => !!s.bare);
  // 「示意画面」角标：哪一章在演示模拟界面，就在角落标一下（场景自己声明 demo(t)）。
  // 用积木库的 DemoMark（右上角，和 blocks 里的样子一致）；它是画面配件、不是正文，
  // 所以整块标 data-probe="skip"，别让排版体检反复报它「字太小」。
  // bare 的场景不画（场景要这个角标就自己放）。
  const demo = bare ? 0 : Math.max(0, ...active.map((s) => (s.demo ? s.demo(t) : 0)));
  return (
    <AbsoluteFill style={{background: bare ? '#000' : '#F8F1E4', overflow: 'hidden'}}>
      {!bare && <Paper t={t} />}
      {SCENES.map((s) => {
        const [a, b] = s.range();
        // 每幕单独包一层、而且自己成一个层叠上下文（isolation:isolate）：幕内积木的 zIndex
        // （章节牌 30、Flow 里的点 5、Roadmap 50…）只在自己这一幕里比大小，不会跑到外壳这一层
        // 跟别的幕抢 —— 这样后登记的幕永远画在前面的幕上面（scenes\index.ts 的约定），
        // bare 场景的黑底也才真能整块盖住上一幕，不会从缝里冒出上一幕的章节牌。
        return t >= a && t < b ? (
          <div key={s.id} style={{position: 'absolute', inset: 0, isolation: 'isolate'}}>
            <s.C t={t} />
          </div>
        ) : null;
      })}
      {!bare && <BubbleSlots t={t} />}
      {demo > 0.01 && (
        <div data-probe="skip" style={{position: 'absolute', inset: 0, opacity: Math.min(1, demo), pointerEvents: 'none'}}>
          <DemoMark />
        </div>
      )}
      {!bare && <Subtitles t={t} />}
      {intro && (
        <Sequence from={Math.round(intro.start * fps)} durationInFrames={Math.round((intro.end - intro.start) * fps)} layout="none">
          <AbsoluteFill>
            <OffthreadVideo src={staticFile('intro.mp4')} muted style={{width: '100%', height: '100%'}} />
          </AbsoluteFill>
        </Sequence>
      )}
      {outro && (
        <Sequence from={Math.round(outro.start * fps)} layout="none">
          <AbsoluteFill>
            <OffthreadVideo src={staticFile('outro.mp4')} muted style={{width: '100%', height: '100%'}} />
          </AbsoluteFill>
        </Sequence>
      )}
      {audio === 'sfx' && <SfxTrack events={allSfx()} />}
      {/* 把 bare 一起告诉探针：这一刻没有字幕条，「压字幕」「窗口压字幕条」两条规则要跳过 */}
      {probe && <Probe bare={bare} />}
    </AbsoluteFill>
  );
};
