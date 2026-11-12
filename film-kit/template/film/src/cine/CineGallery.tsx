// 镜头包陈列片：每个镜头组件演一遍，用的是中性的示例界面（一个虚构的浅色「仓储看板」，素材在 public/cine-demo）。
// 手册里每张镜头卡的「陈列秒数」就是这里的秒数。出图：.\film.cmd stills CineGallery 2.5 12 33
// 这个文件本身也是一份能照抄的用法样例；整部片子怎么搭，看范例片工程。
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import capJson from './demo/cap.json';
import {
  CapPage, Fill, Finish, Float, Label, Lens, Lockup, Note, Pages, Pointer, Press, Reel, ReelShot, Ring, Roll, Scan, Screen, Stage, Statement, Take, TypeWindow,
  creep, cut, el, floatHeight, makeTheme, mixPose, pagesTrack, run, shot, slice, track, union,
} from './index';

const CAP = capJson as unknown as {pages: Record<string, CapPage>; palette: Record<string, string>};
const P = CAP.pages.board;
const T = makeTheme(CAP.palette);

// 每一节的起止秒数（手册的总表照这个写）
export const SECTIONS = {
  take: [0, 5],
  presets: [5, 12],
  float: [12, 17],
  form: [17, 23],
  scan: [23, 28],
  roll: [28, 33],
  typeWindow: [33, 40],
  pages: [40, 46],
  reel: [46, 53],
  statement: [53, 60],
  lockup: [60, 67],
} as const;
export const CINE_GALLERY_SECONDS = 67;

const kpis = union(el(P, 'kpis', 0), el(P, 'kpis', 1));
const rows = union(el(P, 'rows', 0), el(P, 'rows', 3));
const chips = [0, 1, 2, 3].map((i) => el(P, 'chips', i));
const form = union(el(P, 'name'), el(P, 'dest'), el(P, 'submit'));

const Tag: React.FC<{t: number; t0: number; text: string}> = ({t, t0, text}) => <Label t={t} t0={t0} theme={T} index="CINE" text={text} corner="br" />;

// 0  标准镜头 Take：从左侧斜看 + 右侧大字
const S_Take: React.FC<{t: number}> = ({t}) => (
  <Take t={t} theme={T} page={P} cam={creep(shot('fromLeft', {look: kpis, fill: 0.5, at: [0.3, 0.48]}), t, 0, 5)} hero={kpis} focus={el(P, 'kpis', 0)} aperture={0.3} say={{t0: 0.4, layout: 'right', lines: ['每一件货，', '都有去处。']}} label={{index: '01', text: 'TAKE', corner: 'tr'}} over={<Tag t={t} t0={0.3} text="TAKE · FROMLEFT" />} />
);

// 5  六个机位：平视 → 俯拍 → 右侧斜看 → 贴面 → 退开
const POSES = [
  {name: 'FRONT', pose: shot('front', {look: kpis, fill: 0.7})},
  {name: 'TOP', pose: shot('top', {look: union(...chips), fill: 0.6})},
  {name: 'FROMRIGHT', pose: shot('fromRight', {look: form, fill: 0.34})},
  {name: 'GRAZE', pose: shot('graze', {look: el(P, 'rows', 0), fill: 0.9})},
  {name: 'WIDE', pose: shot('wide', {look: rows, fill: 0.5})},
];
const S_Presets: React.FC<{t: number}> = ({t}) => {
  const a = SECTIONS.presets[0];
  const step = 1.4;
  const pose = track(t, POSES.flatMap((p, i) => [{at: a + i * step, pose: p.pose}, {at: a + i * step + 0.75, pose: p.pose}]));
  const i = Math.min(POSES.length - 1, Math.max(0, Math.floor((t - a + 0.3) / step)));
  return (
    <AbsoluteFill>
      <Stage theme={T} />
      <Lens pose={pose} aperture={0.35}>
        <Screen page={P} pose={pose} theme={T} />
      </Lens>
      <Tag t={t} t0={a} text={`SHOT · ${POSES[i].name}`} />
      <Finish theme={T} />
    </AbsoluteFill>
  );
};

// 12  落位 Float：一行悬着，落进槽位
const DROP = {land: 14.4, height: 26, solid: true};
const S_Float: React.FC<{t: number}> = ({t}) => {
  const hero = el(P, 'rows', 0);
  const pose = shot('graze', {look: slice(hero, 0, 0.5), fill: 0.6, at: [0.42, 0.55]});
  return (
    <AbsoluteFill>
      <Stage theme={T} keyAt={[0.5, 0.06]} />
      <Lens pose={pose} focus={slice(hero, 0, 0.5)} lift={floatHeight(t, DROP)} aperture={0.55}>
        <Screen page={P} plate="norows" pose={pose} theme={T}>
          <Float t={t} piece={cut(P, 'row', 0)} {...DROP} from={12} />
          <Float t={t} piece={cut(P, 'row', 1)} land={15.1} height={22} solid from={12} />
          <Float t={t} piece={cut(P, 'row', 2)} land={15.6} height={22} solid from={12} />
          <Float t={t} piece={cut(P, 'row', 3)} land={16.0} height={22} solid from={12} />
        </Screen>
      </Lens>
      <Tag t={t} t0={12.2} text="FLOAT" />
      <Finish theme={T} />
    </AbsoluteFill>
  );
};

// 17  表单：打字、选中、按下
const S_Form: React.FC<{t: number}> = ({t}) => (
  <Take t={t} theme={T} page={P} plate="blank" cam={shot('fromRight', {look: form, fill: 0.36, at: [0.68, 0.5]})} hero={form} say={{t0: 17.5, layout: 'left', lines: ['起个名字，', '选一个目的仓。']}} over={<Tag t={t} t0={17.2} text="FILL · RING · POINTER · PRESS" />}>
    <Fill t={t} at={18.2} target={el(P, 'name')} text="周末补货" />
    <Fill t={t} at={19.6} target={el(P, 'dest')} />
    <Ring t={t} t0={19.6} rect={el(P, 'dest')} />
    <Press t={t} at={21.4} rect={el(P, 'submit')} />
    <Pointer t={t} t0={20.3} from={{x: el(P, 'dest').x + 240, y: el(P, 'dest').y + 60}} to={{x: el(P, 'submit').x + 80, y: el(P, 'submit').y + 22}} clickAt={21.4} />
  </Take>
);

// 23  扫描标注
const SCAN = {t0: 24, dur: 2, targets: [{rect: chips[0], tag: 'STATE · 在线'}, {rect: chips[1], tag: 'SITE · 位置'}, {rect: chips[2], tag: 'STOCK · 盘点'}, {rect: chips[3], tag: 'SHIFT · 班次'}]};
const S_Scan: React.FC<{t: number}> = ({t}) => (
  <Take t={t} theme={T} page={P} cam={creep(shot('top', {look: union(...chips), fill: 0.62, at: [0.5, 0.34]}), t, 23, 28)} hero={union(...chips)} say={{t0: 24.4, layout: 'bottomLeft', size: 'm', lines: ['四项状态，', '逐项核对。']}} over={<Tag t={t} t0={23.2} text="SCAN" />}>
    <Scan t={t} {...SCAN} />
  </Take>
);

// 28  数字滚动
const S_Roll: React.FC<{t: number}> = ({t}) => (
  <Take t={t} theme={T} page={P} plate="novalues" cam={shot('front', {look: union(el(P, 'kpis', 0), el(P, 'kpis', 3)), fill: 0.86, at: [0.5, 0.42]})} hero={union(el(P, 'kpis', 0), el(P, 'kpis', 3))} aperture={0} spot={0.2} say={{t0: 28.6, layout: 'bottomLeft', size: 'm', lines: ['每个数字，|都是实时的。']}} over={<Tag t={t} t0={28.2} text="ROLL" />}>
    {P.elements.values.map((v, i) => (
      <Roll key={i} t={t} at={28.6 + i * 0.12} target={v} />
    ))}
  </Take>
);

// 33  字里透界面：出现 → 停住 → 冲进去，界面接管全屏
const WIN = {t0: 33, through: {at: 37.6, dur: 0.55, origin: [1100, 690] as [number, number]}};
const S_TypeWindow: React.FC<{t: number}> = ({t}) => {
  const drift = shot('front', {look: {x: 470 + (t - 33) * 5, y: 330}, zoom: 2.4});
  const end = shot('front', {look: rows, fill: 0.8});
  const pose = mixPose(drift, end, run(t, WIN.through.at, 0.65, 'glide'));
  return (
    <AbsoluteFill>
      {/* 示例界面是浅色的，所以舞台用暗场：反差来自舞台和界面相反。界面是深色时，舞台用亮场（env="light"），见范例片 */}
      <Stage theme={T} keyAt={[0.4, 0.06]} />
      <TypeWindow t={t} theme={T} lines={['一个仓库', '一张看板']} dim={0} {...WIN}>
        <AbsoluteFill style={{background: T.bg}}>
          <Screen page={P} pose={pose} theme={T} radius={0} rim={0} shadow={0} exposure={1} light={{k: 0}} />
        </AbsoluteFill>
      </TypeWindow>
      <Note t={t} t0={33.8} t1={WIN.through.at - 0.15} theme={T} text="字的笔画是窗口，*界面在字里面*。" />
      {t < WIN.through.at + 0.5 && <Finish theme={T} />}
    </AbsoluteFill>
  );
};

// 40  多页纵深
const S_Pages: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill>
    <Stage theme={T} keyAt={[0.55, 0]} key={1.5} bounce={1.4} floor={1} />
    <Pages theme={T} pages={[P, P, P, P]} view={pagesTrack(t, [{at: 40, view: {at: 0.3, dist: 640, yaw: -17, pitch: 3}}, {at: 45.5, view: {at: 1.2, dist: 1900, yaw: -11, pitch: 6}}])} />
    <Statement t={t} t0={41} theme={T} layout="bottomLeft" size="m" lines={['四个仓，|一套看板。']} />
    <Tag t={t} t0={40.2} text="PAGES" />
    <Finish theme={T} />
  </AbsoluteFill>
);

// 46  转场：甩镜 → 推进穿越 → 吞没硬切 → 硬切
const mini = (id: string, from: number, to: number, look: Parameters<typeof shot>[1]['look'], name: Parameters<typeof shot>[0], text: string, enter?: ReelShot['enter'], color?: string): ReelShot => ({
  id, from, to, enter, color,
  C: ({t}) => (
    <AbsoluteFill>
      <Stage theme={T} />
      <Screen page={P} pose={creep(shot(name, {look, fill: 0.5}), t, from, to)} theme={T} />
      <Tag t={t} t0={from - 1} text={text} />
      <Finish theme={T} />
    </AbsoluteFill>
  ),
});
const REEL: ReelShot[] = [
  mini('a', 46, 47.6, kpis, 'fromLeft', 'REEL · START'),
  mini('b', 47.6, 49.4, rows, 'fromRight', 'ENTER · WHIPLEFT', 'whipLeft'),
  mini('c', 49.4, 51.2, form, 'top', 'ENTER · PUSH', 'push'),
  mini('d', 51.2, 53, kpis, 'front', 'ENTER · FLOOD', 'flood', T.paper),
];
const S_Reel: React.FC<{t: number}> = ({t}) => <Reel t={t} shots={REEL} />;

// 53  大字：三种出场、五种版位
const S_Statement: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill>
    <Stage theme={T} />
    <Statement t={t} t0={53.2} t1={55.2} theme={T} layout="topLeft" size="m" lines={['出场 rise：', '浮上来。']} scrim={0} />
    <Statement t={t} t0={55.4} t1={57.4} theme={T} layout="center" size="l" enter="wipe" lines={['出场 wipe：', '从行底推上来。']} scrim={0} />
    <Statement t={t} t0={57.6} theme={T} layout="bottomLeft" size="xl" enter="cut" lines={['出场 cut：', '踩着拍子出现。']} sub="副句跟在后面，小一号。" scrim={0} />
    <Tag t={t} t0={53.1} text="STATEMENT" />
    <Finish theme={T} />
  </AbsoluteFill>
);

// 60  落款
const S_Lockup: React.FC<{t: number}> = ({t}) => <Lockup t={t} t0={61} end={67} theme={T} icon="cine-demo/icon.png" word="Cangku" line="每一件货，*都有去处*。" url="example.com" note="示例落款" />;

const PARTS: [keyof typeof SECTIONS, React.FC<{t: number}>][] = [
  ['take', S_Take], ['presets', S_Presets], ['float', S_Float], ['form', S_Form], ['scan', S_Scan], ['roll', S_Roll],
  ['typeWindow', S_TypeWindow], ['pages', S_Pages], ['reel', S_Reel], ['statement', S_Statement], ['lockup', S_Lockup],
];

export const CineGallery: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const hit = PARTS.find(([k]) => t >= SECTIONS[k][0] && t < SECTIONS[k][1]) ?? PARTS[PARTS.length - 1];
  const C = hit[1];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <C t={t} />
    </AbsoluteFill>
  );
};
