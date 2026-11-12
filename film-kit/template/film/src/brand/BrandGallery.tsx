import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {SfxTrack} from '../kit/sfx';
import type {Ev} from '../kit/sfx';
import {
  BE,
  BF,
  Camera,
  CornerMarks,
  DUR,
  Depth,
  Disc,
  DrawPaths,
  EndFrame,
  FA,
  FISH_RATIO,
  FishMark,
  Focus,
  Grid,
  Iris,
  Kicker,
  Lanes,
  LightSweep,
  Lockup,
  MarkFn,
  Orbit,
  Reveal,
  Rule,
  Stage,
  SweepText,
  THEMES,
  Theme,
  Tile,
  Title,
  Arrange,
  alpha,
  arrangeSfx,
  clamp,
  discSfx,
  drawPathsSfx,
  endFrameSfx,
  faNight,
  faPaper,
  fishMarkFn,
  fishMarkSfx,
  focusSfx,
  gridSlots,
  irisSfx,
  lanesSfx,
  lightSweepSfx,
  lockupSfx,
  makeTheme,
  mix,
  orbitSfx,
  prog,
  revealSfx,
  sweepTextSfx,
  win,
} from './index';

// 品牌片风格包陈列片：每个组件演示 4–6 秒，左上角小字标组件名和所在秒数。
// 前面用和任何品牌都无关的中性示例（证明它不只给 FAswitch 用），最后是一段 19.4 秒的 FAswitch 品牌片样稿。
// 每一段也是最小用法的样例：props 怎么填、时间怎么错开、音效函数怎么接。

type Seg = {name: string; dur: number; v: (t: number, s: number) => React.ReactNode; sfx?: (s: number) => Ev[]; label?: boolean; paper?: boolean};

const G = THEMES.graphite;
const I = THEMES.ivory;

// 中性示例的图形：一个圆环加一道波（虚构品牌 Northwind）
const NW_VIEW = '0 0 200 200';
const NW = [
  {d: 'M100,22 A78,78 0 1,1 99.9,22', weight: 1.6},
  {d: 'M50,116 C70,82 90,82 100,100 S130,118 150,84', weight: 0.8},
];
const nwMark: MarkFn = ({t, at, height, color}) => (
  <DrawPaths t={t} at={at} dur={1.6} strokes={NW} viewBox={NW_VIEW} width={height} color={color} lineWidth={9} />
);

// ───────── FAswitch 品牌片样稿（19.38 秒 = 7 小节，配乐 g-eazy-nba-type 一拍 0.6922 秒） ─────────
export const FA_BEAT = 0.6922;
export const FA_BAR = FA_BEAT * 4;
export const FA_SAMPLE_SECONDS = FA_BAR * 7;
const bar = (n: number) => n * FA_BAR;
const MOON = {cx: 960, cy: 520, r: 240};
const FISH_W = 580;
const FA_LANES = [
  {label: '账号', note: '各自登录'},
  {label: '代理', note: '档案固定出口'},
  {label: '时区', note: '跟着档案走'},
];
// 理顺后：三条轨道占画面中间一大半（y 250–810）；缠绕时：放开到比画面还宽，线会出画
const LANES_BOX = {x: 300, y: 250, w: 1220, h: 560};
const LANES_TANGLE = {x: -160, y: 250, w: 2240, h: 580};
const FISH_INK = '#F7F2E8'; // 月光里的鱼线：比夜里的纸色再亮一点

/** 样稿：r 是从样稿起点算的秒数 */
export const FaBrandSample: React.FC<{r: number}> = ({r}) => {
  const night = faNight;
  const irisAt = bar(5) - 0.95;
  const lanesAt = bar(2) - 0.83; // 第一条线在第 2 小节的第一拍落位，之后每拍一条
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* 夜：0 – 13.84 */}
      {r < bar(5) + 0.05 && (
        <Stage t={r} theme={night} light={prog(r, 0, 2.4, BE.soft)} grain={0.075}>
          <AbsoluteFill style={{opacity: prog(r, 0, 1.4, BE.soft)}}>
            <Camera t={r} t0={bar(3)} t1={bar(5)} from={{s: 1}} to={{s: 1.045, y: -6}}>
              <Depth d={0.4}>
                <Disc
                  t={r}
                  at={bar(3) - 0.4}
                  cx={MOON.cx}
                  cy={MOON.cy}
                  r={MOON.r}
                  color={mix(FA.night, FA.nightInk, 0.11)}
                  theme={night}
                  halo={1.5}
                  lift={{at: bar(3) + 2.2, amount: 0.05, dur: 1.6}}
                  rise={30}
                  dur={2.6}
                />
              </Depth>
              <Depth d={1}>
                {/* 缠绕时镜头贴得很近（1.12），理顺的过程中慢慢退到 1：乱有压迫感，理顺后整幅舒展开 */}
                <Camera t={r} t0={0} t1={bar(2) + 1.4} from={{s: 1.12, y: 10}} to={{s: 1}}>
                  <Depth d={1}>
                    <Lanes
                      t={r}
                      t0={0.4}
                      at={lanesAt}
                      theme={night}
                      lanes={FA_LANES}
                      box={LANES_BOX}
                      tangleBox={LANES_TANGLE}
                      depth={[1, 0.2, 0.62]}
                      labelW={230}
                      size={76}
                      noteSize={38}
                      lineWidth={2.2}
                      stagger={FA_BEAT}
                      dur={1.5}
                      chaos={1.1}
                      out={bar(3) - 0.2}
                    />
                  </Depth>
                </Camera>
                <div style={{position: 'absolute', left: MOON.cx - FISH_W / 2, top: MOON.cy - FISH_W / FISH_RATIO / 2}}>
                  <FishMark t={r} at={bar(3) + 0.35} width={FISH_W} color={FISH_INK} dur={2.3} glow={0.6} glint />
                </div>
              </Depth>
            </Camera>
          </AbsoluteFill>
        </Stage>
      )}
      {/* 纸：月亮扩成整页，13.84 起 */}
      <Iris t={r} at={irisAt} cx={MOON.cx} cy={MOON.cy} r0={MOON.r} dur={0.95}>
        <EndFrame
          t={r}
          at={bar(5)}
          theme={faPaper}
          mark={fishMarkFn({draw: false})}
          markRatio={FISH_RATIO}
          markFrom={{cx: MOON.cx, cy: MOON.cy, width: FISH_W}}
          name="FAswitch"
          tagline="账号、代理、时区，*各归各位*。"
          tagMark
          markScale={1.4}
          note="本机运行　·　互不串号"
          size={104}
          nameDelay={0.95}
          tagDelay={0.75}
          light={0.9}
        />
      </Iris>
    </AbsoluteFill>
  );
};
export const faBrandSampleSfx = (s: number): Ev[] => {
  const lanesAt = s + bar(2) - 0.83;
  return [
    ...lanesSfx({t0: s + 0.4, at: lanesAt, stagger: FA_BEAT, dur: 1.5, n: 3}),
    ...discSfx({at: s + bar(3) - 0.4}),
    ...fishMarkSfx({at: s + bar(3) + 0.35, dur: 2.3, glint: true}),
    ...irisSfx({at: s + bar(5) - 0.95, dur: 0.95}),
    ...endFrameSfx({at: s + bar(5), mark: fishMarkFn(), nameDelay: 0.95, tagDelay: 0.75, tagline: 'x'}),
  ];
};

// ───────── 小工具：主题样张、缓动曲线 ─────────
const Swatch: React.FC<{th: Theme; name: string; t: number; at: number}> = ({th, name, t, at}) => {
  const p = prog(t, at, DUR.long, BE.out);
  return (
    <div style={{position: 'relative', flex: 1, background: th.bg, overflow: 'hidden', opacity: clamp(p * 1.5)}}>
      <div style={{position: 'absolute', left: -200, top: -260, width: 900, height: 900, borderRadius: '50%', background: `radial-gradient(closest-side, ${th.pool[0]}, transparent)`}} />
      <div style={{position: 'absolute', left: 70, top: 300 + (1 - p) * 30}}>
        <div style={{fontFamily: BF.mono, fontSize: 18, letterSpacing: '0.16em', color: th.ink3}}>{name}</div>
        <div style={{fontFamily: BF.sans, fontSize: 92, fontWeight: 300, letterSpacing: '-0.03em', color: th.ink, marginTop: 18}}>Aa 标题</div>
        <div style={{fontFamily: BF.zh, fontSize: 30, fontWeight: 400, color: th.ink2, marginTop: 10}}>次一级的文字用 ink2</div>
        <div style={{fontFamily: BF.zh, fontSize: 22, color: th.ink3, marginTop: 8}}>注释用 ink3</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 40}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: th.accentInk}} />
          <div style={{width: 260, height: 1.5, background: th.line2}} />
        </div>
        <div style={{display: 'flex', gap: 10, marginTop: 34}}>
          {[th.bg, th.bg2, th.surface, th.ink, th.accent, th.accentInk].map((c, i) => (
            <div key={i} style={{width: 46, height: 46, borderRadius: 10, background: c, border: `1px solid ${th.line}`}} />
          ))}
        </div>
      </div>
    </div>
  );
};

const CURVES: [string, (p: number) => number][] = [
  ['BE.out 入场', BE.out],
  ['BE.move 位移', BE.move],
  ['BE.soft 透明度', BE.soft],
  ['BE.settle 归位', BE.settle],
  ['BE.in 退场', BE.in],
  ['BE.lift 唯一的过冲', BE.lift],
];
const Curves: React.FC<{t: number; s: number; th: Theme}> = ({t, s, th}) => {
  const r = t - s;
  return (
    <div style={{position: 'absolute', left: 190, top: 250, display: 'grid', gridTemplateColumns: 'repeat(3, 480px)', gap: '40px 40px'}}>
      {CURVES.map(([name, e], i) => {
        const ap = prog(r, 0.2 + i * 0.1, DUR.base, BE.out);
        const W0 = 400;
        const H0 = 150;
        const pts = Array.from({length: 61}, (_, k) => `${k ? 'L' : 'M'}${(k / 60) * W0},${H0 - e(k / 60) * H0}`).join(' ');
        const lp = clamp((r - 1.2 - i * 0.12) / 1.6);
        return (
          <div key={i} style={{opacity: ap, transform: `translateY(${(1 - ap) * 14}px)`}}>
            <div style={{fontFamily: BF.mono, fontSize: 20, letterSpacing: '0.08em', color: th.ink2, marginBottom: 18}}>{name}</div>
            <div style={{position: 'relative', height: H0 + 20}}>
              <svg width={W0 + 40} height={H0 + 30} style={{position: 'absolute', left: 0, top: 10, overflow: 'visible'}}>
                <line x1={0} x2={W0} y1={H0} y2={H0} stroke={th.line} />
                <line x1={0} x2={W0} y1={0} y2={0} stroke={th.line} strokeDasharray="3 5" />
                <path d={pts} fill="none" stroke={th.ink2} strokeWidth={2} pathLength={1} style={{strokeDasharray: `${ap} 2`}} />
                <circle cx={lp * W0} cy={H0 - e(lp) * H0} r={6} fill={th.accentInk} opacity={lp > 0 ? 1 : 0} />
              </svg>
              <div style={{position: 'absolute', left: W0 + 30, top: 10 + H0 - e(lp) * H0 - 10, width: 20, height: 20, borderRadius: 10, background: th.ink, opacity: lp > 0 ? 1 : 0.3}} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ───────── 各段 ─────────
const SEGS: Seg[] = [
  {
    name: 'Stage 舞台 · 深色（石墨）',
    dur: 4.5,
    v: (t, s) => (
      <Stage t={t} theme={G} light={prog(t, s, 2)}>
        <div style={{position: 'absolute', left: 160, top: 470}}>
          <Kicker t={t} at={s + 0.6} text="Stage · graphite" theme={G} />
          <div style={{marginTop: 26}}>
            <Title t={t} at={s + 0.9} kind="title" text="底、光、暗角、颗粒。" color={G.ink} />
          </div>
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.9}),
  },
  {
    name: 'Stage 舞台 · 浅色（象牙）',
    paper: true,
    dur: 4.5,
    v: (t, s) => (
      <Stage t={t} theme={I} light={prog(t, s, 2)}>
        <div style={{position: 'absolute', left: 160, top: 470}}>
          <Kicker t={t} at={s + 0.6} text="Stage · ivory" theme={I} />
          <div style={{marginTop: 26}}>
            <Title t={t} at={s + 0.9} kind="title" text="Quiet light, *warm paper.*" color={I.ink} accent={I.accentInk} />
          </div>
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.9}),
  },
  {
    name: 'makeTheme 一个主色出一整套',
    dur: 5,
    v: (t, s) => (
      <AbsoluteFill style={{display: 'flex', flexDirection: 'row'}}>
        <Swatch t={t} at={s + 0.1} th={makeTheme({mode: 'dark', accent: '#2B8A57'})} name="dark · #2B8A57" />
        <Swatch t={t} at={s + 0.3} th={makeTheme({mode: 'light', accent: '#3A5BD9'})} name="light · #3A5BD9" />
        <Swatch t={t} at={s + 0.5} th={makeTheme({mode: 'dark', accent: '#D9822B', bg: '#121012'})} name="dark · #D9822B" />
      </AbsoluteFill>
    ),
  },
  {
    name: 'BE 缓动（点 = 同一时刻的进度）',
    dur: 5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <Curves t={t} s={s} th={G} />
      </Stage>
    ),
  },
  {
    name: 'DrawPaths 描线（glow 微光 + glint 走光）',
    dur: 5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <div style={{position: 'absolute', left: 760, top: 340}}>
          <DrawPaths t={t} at={s + 0.4} dur={2} strokes={NW} viewBox={NW_VIEW} width={400} color={G.ink} lineWidth={7} glow glint />
        </div>
      </Stage>
    ),
    sfx: (s) => drawPathsSfx({at: s + 0.4, dur: 2, strokes: NW, glint: true}),
  },
  {
    name: 'Reveal mask 遮罩上滑（标题首选）',
    dur: 5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <div style={{position: 'absolute', left: 200, top: 360}}>
          <Title t={t} at={s + 0.4} kind="hero" text={'Designed for\nthe long run.'} color={G.ink} out={s + 4.3} />
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.4}),
  },
  {
    name: 'Reveal chars 逐字（短句、标语）',
    paper: true,
    dur: 5,
    v: (t, s) => (
      <Stage t={t} theme={I}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 440}}>
          <Title t={t} at={s + 0.4} kind="zhTitle" mode="chars" text="把复杂的事，*留给自己*。" color={I.ink} accent={I.accentInk} align="center" />
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.4, mode: 'chars'}),
  },
  {
    name: 'Reveal track 字距收拢（字标、英文大字）',
    dur: 4.5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 450}}>
          <Reveal t={t} at={s + 0.4} text="NORTHWIND" mode="track" size={120} weight={300} tracking="0.08em" color={G.ink} align="center" />
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.4, mode: 'track'}),
  },
  {
    name: 'Kicker + Title + Reveal fade + Rule 版式组合',
    paper: true,
    dur: 5.5,
    v: (t, s) => (
      <Stage t={t} theme={I}>
        <div style={{position: 'absolute', left: 200, top: 330}}>
          <Kicker t={t} at={s + 0.3} text="Chapter 02 · Workflow" theme={I} />
          <div style={{marginTop: 30}}>
            <Title t={t} at={s + 0.6} kind="title" text={'One place for\nevery decision.'} color={I.ink} />
          </div>
          <div style={{marginTop: 34, width: 760}}>
            <Reveal t={t} at={s + 1.5} text="所有决定留在一个地方：谁定的、为什么、什么时候。" mode="fade" size={30} weight={400} color={I.ink2} font={BF.zh} />
          </div>
        </div>
        <Rule t={t} at={s + 1.1} x={200} y={790} w={1520} theme={I} from="left" />
        <div style={{position: 'absolute', left: 200, top: 812}}>
          <Reveal t={t} at={s + 1.9} text="01 — 04" mode="fade" size={18} weight={500} tracking="0.18em" color={I.ink3} font={BF.mono} />
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.6}),
  },
  {
    name: 'Grid 网格 + CornerMarks 角标',
    dur: 5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <Grid t={t} at={s + 0.2} theme={G} />
        <Grid t={t} at={s + 0.2} theme={G} dots cols={16} rows={8} color={G.line2} />
        <CornerMarks t={t} at={s + 1.3} box={{x: 560, y: 340, w: 800, h: 400}} theme={G} color={G.ink2} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 480}}>
          <Title t={t} at={s + 1.8} kind="sub" mode="fade" text="Precision, by default." color={G.ink} align="center" />
        </div>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 1.8}),
  },
  {
    name: 'Orbit 轨道（各自运行、互不相交）',
    dur: 5.5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <Orbit t={t} at={s + 0.2} theme={G} cx={960} cy={540} radii={[170, 290, 410, 530]} accent={1} />
        <div style={{position: 'absolute', left: 940, top: 520, width: 40, height: 40, borderRadius: 20, background: G.ink, opacity: prog(t, s + 0.6, DUR.base)}} />
      </Stage>
    ),
    sfx: (s) => orbitSfx({at: s + 0.2}),
  },
  {
    name: 'Arrange 散落 → 归位（rowSlots / gridSlots）',
    paper: true,
    dur: 6,
    v: (t, s) => {
      const names = ['Research', 'Design', 'Build', 'Review', 'Ship', 'Learn'];
      return (
        <Stage t={t} theme={I}>
          <Arrange
            t={t}
            t0={s + 0.2}
            at={s + 2.0}
            theme={I}
            slots={gridSlots(6, 3, 340, 190, 30, 960, 540)}
            items={names.map((n, i) => ({w: 340, h: 190, render: (st) => <Tile theme={I} title={n} note={`0${i + 1}`} placed={st.placed} />}))}
          />
        </Stage>
      );
    },
    sfx: (s) => arrangeSfx({t0: s + 0.2, at: s + 2.0, n: 6}),
  },
  {
    name: 'Lanes 缠绕 → 平行轨道',
    dur: 6,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <Lanes
          t={t}
          t0={s + 0.2}
          at={s + 2.4}
          theme={G}
          lanes={[{label: 'Design', note: 'FIGMA'}, {label: 'Engineering', note: 'GITHUB'}, {label: 'Support', note: 'INBOX'}, {label: 'Finance', note: 'LEDGER'}]}
          labelW={420}
          size={60}
          noteSize={30}
          depth={[0.9, 0.3, 0.65, 0.15]}
          box={{x: 260, y: 220, w: 1260, h: 640}}
          tangleBox={{x: -120, y: 240, w: 2160, h: 600}}
        />
      </Stage>
    ),
    sfx: (s) => lanesSfx({t0: s + 0.2, at: s + 2.4, n: 4}),
  },
  {
    name: 'Camera + Depth 推拉与视差',
    dur: 5.5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <Camera t={t} t0={s} t1={s + 5.5} from={{s: 1, x: 30}} to={{s: 1.08, x: -40}}>
          <Depth d={0.3}>
            <Grid t={t} at={s - 2} theme={G} cols={12} rows={6} box={{x: 0, y: 0, w: 1920, h: 1080}} />
          </Depth>
          <Depth d={1}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 460}}>
              <Title t={t} at={s + 0.3} kind="title" text="Depth, not decoration." color={G.ink} align="center" />
            </div>
          </Depth>
          <Depth d={2.2}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{position: 'absolute', left: 300 + i * 340, top: 250 + (i % 2) * 520, width: 10, height: 10, borderRadius: 5, background: G.ink2}} />
            ))}
          </Depth>
        </Camera>
      </Stage>
    ),
    sfx: (s) => revealSfx({at: s + 0.3}),
  },
  {
    name: 'Focus 由虚到实',
    paper: true,
    dur: 4.5,
    v: (t, s) => (
      <Stage t={t} theme={I}>
        <Focus t={t} at={s + 0.3}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 400, textAlign: 'center', fontFamily: BF.sans, fontSize: 168, fontWeight: 200, letterSpacing: '-0.04em', color: I.ink}}>clarity</div>
        </Focus>
      </Stage>
    ),
    sfx: (s) => focusSfx({at: s + 0.3}),
  },
  {
    name: 'SweepText 字上光扫 + LightSweep 整屏柔光',
    dur: 4.5,
    v: (t, s) => (
      <Stage t={t} theme={G}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 430, display: 'flex', justifyContent: 'center', opacity: prog(t, s, 0.6)}}>
          <SweepText t={t} at={s + 0.8} text="Northwind" size={150} weight={500} color={mix(G.ink, G.bg, 0.25)} shine="#FFFFFF" />
        </div>
        <LightSweep t={t} at={s + 2.4} theme={G} />
      </Stage>
    ),
    sfx: (s) => [...sweepTextSfx({at: s + 0.8}), ...lightSweepSfx({at: s + 2.4})],
  },
  {
    name: 'Disc 圆盘 + Iris 圆形转场',
    dur: 5.5,
    v: (t, s) => (
      <>
        <Stage t={t} theme={G}>
          <Disc t={t} at={s + 0.2} cx={960} cy={540} r={200} color={mix(G.bg, G.ink, 0.1)} theme={G} />
        </Stage>
        <Iris t={t} at={s + 3} cx={960} cy={540} r0={200}>
          <Stage t={t} theme={I}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 470}}>
              <Title t={t} at={s + 3.6} kind="sub" mode="fade" text="The next scene grows out of the last shape." color={I.ink} align="center" />
            </div>
          </Stage>
        </Iris>
      </>
    ),
    sfx: (s) => [...discSfx({at: s + 0.2}), ...irisSfx({at: s + 3})],
  },
  {
    name: 'Lockup 标志锁定（guides = 安全留白）',
    paper: true,
    dur: 6,
    v: (t, s) => (
      <Stage t={t} theme={I}>
        <Lockup t={t} at={s + 0.3} theme={I} mark={nwMark} markRatio={1} name="Northwind" tagline="Software for slow, careful teams." size={104} guides />
      </Stage>
    ),
    sfx: (s) => lockupSfx({at: s + 0.3, mark: nwMark, tagline: 'x'}),
  },
  {
    name: 'EndFrame 最终定格（stack 布局 + note）',
    dur: 6,
    v: (t, s) => <EndFrame t={t} at={s + 0.3} theme={G} mark={nwMark} markRatio={1} name="Northwind" tagline="为慢而细的团队做的软件" layout="stack" size={88} note="NORTHWIND.EXAMPLE" />,
    sfx: (s) => endFrameSfx({at: s + 0.3, mark: nwMark, tagline: 'x'}),
  },
  {
    name: 'FAswitch · FishMark 徽标描线（照真徽标描）',
    paper: true,
    dur: 5,
    v: (t, s) => (
      <Stage t={t} theme={faPaper}>
        <div style={{position: 'absolute', left: 960 - 330, top: 540 - 330 / FISH_RATIO - 40}}>
          <FishMark t={t} at={s + 0.3} width={660} color={FA.ink} />
        </div>
      </Stage>
    ),
    sfx: (s) => fishMarkSfx({at: s + 0.3}),
  },
  {
    name: 'FAswitch 品牌片样稿 · 19.4s',
    dur: 2,
    v: (t, s) => (
      <Stage t={t} theme={faNight}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 500}}>
          <Reveal t={t} at={s + 0.2} text="FAswitch 品牌片样稿 · 7 小节 · 19.4 秒" mode="fade" size={30} weight={400} tracking="0.12em" color={faNight.ink2} font={BF.zh} align="center" out={s + 1.6} />
        </div>
      </Stage>
    ),
  },
  {name: 'FAswitch sample', dur: FA_SAMPLE_SECONDS, label: false, v: (t, s) => <FaBrandSample r={t - s} />, sfx: (s) => faBrandSampleSfx(s)},
];

const STARTS = SEGS.reduce<number[]>((a, sg, i) => [...a, i === 0 ? 0 : a[i - 1] + SEGS[i - 1].dur], []);
export const BRAND_GALLERY_SECONDS = STARTS[STARTS.length - 1] + SEGS[SEGS.length - 1].dur;
/** 每段的起点（秒），抽帧用 */
export const BRAND_GALLERY_INDEX = SEGS.map((sg, i) => ({name: sg.name, start: Math.round(STARTS[i] * 100) / 100, dur: sg.dur}));
export const brandGallerySfx = (): Ev[] => SEGS.flatMap((sg, i) => (sg.sfx ? sg.sfx(STARTS[i]) : []));

export const BrandGallery: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  let i = SEGS.length - 1;
  while (i > 0 && t < STARTS[i]) i--;
  const sg = SEGS[i];
  const s = STARTS[i];
  const dark = !sg.paper;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {sg.v(t, s)}
      {sg.label !== false && (
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 32,
            fontFamily: BF.mono,
            fontSize: 18,
            letterSpacing: '0.06em',
            color: dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)',
            opacity: win(t, s, s + sg.dur - 0.3, 0.3, 0.3),
          }}
        >
          {String(i + 1).padStart(2, '0')} · {sg.name} · {s.toFixed(1)}s
        </div>
      )}
      <SfxTrack events={brandGallerySfx()} />
    </AbsoluteFill>
  );
};

// 未使用的导入保护（alpha 留给使用者抄写时用）
void alpha;
