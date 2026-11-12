import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Paper} from '../kit/overlay';
import {SfxTrack} from '../kit/sfx';
import type {Ev} from '../kit/sfx';
import {Icon} from '../ui/icons';
import {
  AppWindow,
  AppWindowProps,
  Arrow,
  BarChart,
  BigNumber,
  Burst,
  C,
  CardRow,
  ChapterBreak,
  ChapterTag,
  CharImg,
  ChatBox,
  CheckList,
  DemoMark,
  EndCard,
  F,
  Flow,
  Highlight,
  Hook,
  ImageShow,
  MadeBy,
  MascotSay,
  Meme,
  Phone,
  PhoneProps,
  PointNote,
  Recap,
  Roadmap,
  ShotWall,
  Stamp,
  StepList,
  Table,
  Tag,
  Terminal,
  TextShot,
  Timeline,
  TitleCard,
  Versus,
  WarnCard,
  aim,
  appLayout,
  appWindowSfx,
  barChartSfx,
  bigNumberSfx,
  burstSfx,
  cardRowSfx,
  chapterBreakSfx,
  chapterTagSfx,
  chatBoxSfx,
  checkListSfx,
  endCardSfx,
  flowSfx,
  highlightSfx,
  hookSfx,
  imageShowSfx,
  madeBySfx,
  mascotSaySfx,
  memeSfx,
  phoneLayout,
  phoneSfx,
  pointNoteSfx,
  recapSfx,
  roadmapSfx,
  shotWallSfx,
  stampSfx,
  stepListSfx,
  tableSfx,
  terminalSfx,
  timelineSfx,
  titleCardSfx,
  versusSfx,
  warnCardSfx,
} from './index';

// 积木陈列片：每块积木演示几秒，左上角小字标积木名和所在秒数，底部放一条示例字幕，证明积木不压字幕区。
// 这里的每一段也是「最小用法」的样例：props 怎么填、时间怎么错开、音效函数怎么接。

type Seg = {name: string; dur: number; cap: string; v: (t: number, s: number) => React.ReactNode; sfx?: (s: number) => Ev[]};

/** 一段：积木组件 + 按段起点生成 props 的函数 + 音效函数 */
function seg<P extends {t0: number}>(name: string, dur: number, cap: string, Comp: React.FC<P & {t: number}>, props: (s: number) => P, sfx?: (p: P) => Ev[]): Seg {
  return {name, dur, cap, v: (t, s) => <Comp t={t} {...props(s)} />, sfx: sfx ? (s) => sfx(props(s)) : undefined};
}

// ───────── 演示用的「图」：代码画的假网页、群聊截图 ─────────
const MockPage = (w: number, h: number) => {
  const k = w / 1600;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FAF9F5', fontFamily: F.zh}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 90 * k, background: '#fff', borderBottom: '2px solid #E6E3D9', display: 'flex', alignItems: 'center', padding: `0 ${40 * k}px`, gap: 20 * k}}>
        <div style={{width: 44 * k, height: 44 * k, borderRadius: 12 * k, background: C.claudeSpark}} />
        <div style={{fontSize: 34 * k, fontWeight: 700, color: C.claudeInk}}>设置</div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 90 * k, width: 340 * k, bottom: 0, background: '#F4F3EE', padding: 30 * k, boxSizing: 'border-box'}}>
        {['通用', '账号', '订阅', '隐私'].map((x, i) => (
          <div key={x} style={{height: 64 * k, borderRadius: 12 * k, background: i === 2 ? '#E8E6DD' : undefined, display: 'flex', alignItems: 'center', padding: `0 ${20 * k}px`, fontSize: 30 * k, color: C.claudeInk}}>{x}</div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 420 * k, top: 160 * k, fontSize: 52 * k, fontWeight: 800, color: C.claudeInk}}>订阅</div>
      <div style={{position: 'absolute', left: 420 * k, top: 250 * k, width: 1080 * k, height: 220 * k, border: '2px solid #E6E3D9', borderRadius: 20 * k, background: '#fff', padding: 36 * k, boxSizing: 'border-box'}}>
        <div style={{fontSize: 34 * k, fontWeight: 700, color: C.claudeInk}}>免费版</div>
        <div style={{fontSize: 26 * k, color: C.claudeMuted, marginTop: 12 * k}}>每天有使用上限</div>
      </div>
      <div style={{position: 'absolute', left: 1180 * k, top: 330 * k, width: 280 * k, height: 72 * k, borderRadius: 14 * k, background: C.claudeInk, color: '#fff', fontSize: 28 * k, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>升级到 Pro</div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{position: 'absolute', left: 420 * k, top: (540 + i * 80) * k, width: (900 - i * 180) * k, height: 26 * k, borderRadius: 13 * k, background: '#ECE9E0'}} />
      ))}
    </div>
  );
};
const shot = (lines: {who?: string; text: string; me?: boolean; likes?: number}[], kind: 'chat' | 'comment' = 'chat') => (w: number, h: number) => <TextShot lines={lines} w={w} h={h} kind={kind} />;

// ───────── 横屏各段 ─────────
const SEGS: Seg[] = [
  seg('Hook 开场钩子', 6, '订阅总失败？卡被拒？这期一次讲清', Hook, (s) => ({
    t0: s,
    lines: [
      {at: s + 0.2, text: '绑卡总是*被拒*？'},
      {at: s + 1.0, text: '订阅到一半*卡住*？'},
      {at: s + 1.8, text: '刚开的号就被*封*了？'},
    ],
    land: {at: s + 3.0, text: '这期*一次*讲清楚', sub: '国内卡也能订 Claude Pro'},
    mascot: 'point' as const,
  }), hookSfx),
  seg('TitleCard 片名字卡', 5, '这期教你用国内卡订上 Claude Pro', TitleCard, (s) => ({t0: s + 0.1, title: '国内卡订 *Claude Pro*', sub: '从注册到付款，一步不落', kicker: 'AI 工具教程 · 第 7 期', mascot: 'wave' as const}), titleCardSfx),
  seg('Roadmap 本期路线', 6, '这期讲三件事 先说第二件', Roadmap, (s) => ({
    t0: s,
    items: [
      {at: s + 0.6, text: '注册账号', sub: '邮箱就够', icon: 'user'},
      {at: s + 1.3, text: '绑卡付款', sub: '国内卡也行', icon: 'card'},
      {at: s + 2.0, text: '防封小技巧', sub: '这三条别踩', icon: 'shield'},
    ],
    focus: [{at: s + 3.4, i: 1}],
  }), roadmapSfx),
  {
    name: 'ChapterBreak 换章过场 + ChapterTag 章节牌',
    dur: 5,
    cap: '先说第一件事 注册账号',
    v: (t, s) => (
      <>
        <ChapterTag t={t} t0={s + 1.6} text="第一步：注册账号" icon="user" />
        <ChapterBreak t={t} t0={s + 0.2} n={1} title="注册账号" sub="五分钟搞定，邮箱就够" icon="user" />
      </>
    ),
    sfx: (s) => [...chapterBreakSfx({t0: s + 0.2, n: 1, title: ''}), ...chapterTagSfx({t0: s + 1.6, text: ''})],
  },
  seg('CardRow 卡片排（到 4 秒整体缩小上移）', 6, '三种付款方式 各有各的坑', CardRow, (s) => ({
    t0: s,
    title: '三种付款方式',
    items: [
      {at: s + 0.5, title: '国内信用卡', desc: '最省事，部分卡会被拒', icon: 'card', tone: 'sky' as const, badge: '推荐'},
      {at: s + 1.1, title: '虚拟卡', desc: '成功率高，要先充值', icon: 'shieldCheck', tone: 'mint' as const, mark: 'ok' as const},
      {at: s + 1.7, title: '找人代充', desc: '便宜，但有封号风险', icon: 'alert', tone: 'coral' as const, mark: 'no' as const},
    ],
    shrinkAt: s + 4.0,
  }), cardRowSfx),
  seg('CardRow 卡片排 · 压力样例', 4, '故意填很长的字 看会不会破版', CardRow, (s) => ({
    t0: s,
    title: '这是一个故意写得特别特别长的卡片排标题，用来测试会不会压到右边的安全区',
    arrows: true,
    items: [
      {at: s + 0.3, title: '一个非常非常长的卡片标题测试换行和缩字', desc: '说明文字也故意写得很长很长，看看三行之内能不能放下，放不下就会被截断并且在开发时报警告', icon: 'card', badge: '这个角标也很长很长'},
      {at: s + 0.6, title: 'Google Play Store Subscription', desc: 'Supercalifragilisticexpialidocious 超长英文单词混排', icon: 'globe', mark: 'ok' as const},
      {at: s + 0.9, title: '短', desc: '短说明', icon: 'bolt'},
      {at: s + 1.2, title: '第四张卡也来凑热闹', desc: '四张卡并排时每张更窄', icon: 'star', tone: 'sun' as const},
    ],
  }), cardRowSfx),
  seg('Versus 左右对比', 5, '网页版和桌面版 差在哪', Versus, (s) => ({
    t0: s,
    kind: 'vs' as const,
    title: '网页版还是桌面版？',
    left: {at: s + 0.3, title: '网页版', icon: 'globe', items: [{text: '打开浏览器就能用'}, {text: '碰不到你电脑上的文件'}]},
    right: {at: s + 1.0, title: '桌面版', icon: 'monitor', items: [{text: '要装一个软件'}, {text: '能直接读写本地文件'}]},
    verdict: {at: s + 3.0, win: 'right' as const, text: '干活选它'},
  }), versusSfx),
  seg('Versus 错的对对的 · 压力样例', 5, '左边是错误做法 右边是正确做法', Versus, (s) => ({
    t0: s,
    kind: 'wrong-right' as const,
    left: {at: s + 0.2, title: '错误做法：一被拒就反复重试十几次', items: [{text: '同一张卡一小时内连续提交十几次，风控直接把卡和账号一起标记'}, {text: '换 IP 换到天荒地老'}, {text: '第三条'}, {text: '第四条也很长很长很长很长很长很长很长很长很长很长很长很长'}]},
    right: {at: s + 0.8, title: '正确做法', items: [{text: '先停下，等几个小时再试'}, {text: '换一张开通了外币支付的卡'}]},
    verdict: {at: s + 2.6, win: 'right' as const},
  }), versusSfx),
  seg('StepList 步骤清单', 6, '跟着点 四步就能订上', StepList, (s) => ({
    t0: s,
    title: '订阅四步走',
    steps: [
      {at: s + 0.6, text: '打开设置，点「订阅」', icon: 'settings'},
      {at: s + 1.6, text: '选 Pro 方案', sub: '按月付，随时能取消', icon: 'star'},
      {at: s + 2.6, text: '填卡号和账单地址', sub: '地址要和卡的开户地一致', icon: 'card'},
      {at: s + 3.6, text: '点确认，等扣款成功', icon: 'check'},
    ],
    doneAt: s + 4.8,
  }), stepListSfx),
  seg('StepList 步骤清单 · 压力样例（6 步、长字）', 4, '六步而且每步字都很长', StepList, (s) => ({
    t0: s,
    title: '一个非常长的步骤标题测试一下会不会压到右边的东西',
    steps: [
      {at: s + 0.2, text: '第一步的文字特别特别长，长到一行放不下需要换行显示才行', sub: '补充说明也很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长'},
      {at: s + 0.6, text: 'Install Node.js LTS from the official website'},
      {at: s + 1.0, text: '短'},
      {at: s + 1.4, text: '第四步', sub: '补充'},
      {at: s + 1.8, text: '第五步也来凑个热闹'},
      {at: s + 2.2, text: '第六步：全部做完以后重启电脑再打开一次看看'},
    ],
    slot: 'left' as const,
  }), stepListSfx),
  seg('CheckList 核对清单', 5, '付款前先对一遍这几条', CheckList, (s) => ({
    t0: s,
    title: '付款前对一遍',
    items: [
      {at: s + 0.8, text: '卡开通了外币支付', note: '没开的去银行 App 里开'},
      {at: s + 1.6, text: '账单地址和卡一致'},
      {at: s + 2.4, text: '一小时内反复提交', ok: false, note: '会被风控'},
      {at: s + 3.2, text: '网络出口稳定在同一个地区'},
    ],
  }), checkListSfx),
  seg('BigNumber 大数字', 5, '从注册到订阅 一共只要六步', BigNumber, (s) => ({t0: s + 0.1, value: 6, unit: '步', label: '从注册到订阅，一共只要这么多', note: '示例数字', mascot: 'victory' as const}), bigNumberSfx),
  seg('BarChart 对比条', 6, '同一道题 四家各用了多久', BarChart, (s) => ({
    t0: s,
    title: '同一道题，各用多久（秒）',
    rows: [
      {at: s + 0.4, name: 'Claude', value: 32, label: '32 秒', icon: 'sparkles', tone: 'coral' as const},
      {at: s + 0.8, name: 'GPT', value: 41, label: '41 秒', icon: 'bolt', tone: 'ink' as const},
      {at: s + 1.2, name: '大肥鱼 DeepSeek', value: 58, label: '58 秒', icon: 'chat', tone: 'sky' as const, note: '思考时间最长'},
      {at: s + 1.6, name: 'Gemini', value: 47, label: '47 秒', icon: 'star', tone: 'mint' as const},
    ],
    max: 60,
    hi: [{at: s + 3.2, i: 0}],
  }), barChartSfx),
  seg('Table 表格', 6, '三种方式放一张表里比', Table, (s) => ({
    t0: s,
    title: '三种付款方式对比',
    cols: [{title: '方式'}, {title: '月费'}, {title: '成功率'}, {title: '要海外卡'}, {title: '推荐'}],
    rows: [
      {at: s + 0.5, cells: ['国内信用卡', '约 ¥145', '中', '—', '✓']},
      {at: s + 1.0, cells: ['虚拟卡', '约 ¥150', '高', '—', '✓']},
      {at: s + 1.5, cells: ['找人代充', '约 ¥99', '高', '—', '✗']},
    ],
    hi: [{at: s + 2.8, r: 1, c: 2}, {at: s + 3.8, r: 2}],
  }), tableSfx),
  seg('Table 表格 · 压力样例', 4, '五列六行 每格都塞满字', Table, (s) => ({
    t0: s,
    cols: [{title: '一个很长很长的表头名字'}, {title: '第二列'}, {title: 'Third Column Header'}, {title: '第四列'}, {title: '第五列表头也很长'}],
    rows: [0, 1, 2, 3, 4, 5].map((i) => ({at: s + 0.2 + i * 0.25, cells: ['这一格的字特别特别长需要换行还放不下就截断', 'subscription', '中', '✓', '这一格也写得很长很长很长很长很长很长']})),
    hi: [{at: s + 2.2, r: 3, c: 4}],
  }), tableSfx),
  seg('Flow 流程图（横排 + 走到哪）', 6, '建档 切换 登录 使用 一路走下来', Flow, (s) => ({
    t0: s,
    title: '第一次用，只走一遍',
    nodes: [
      {id: 'a', at: s + 0.3, text: '建档', sub: '起个名字', icon: 'layers'},
      {id: 'b', at: s + 0.7, text: '切换', sub: '点一下档案', icon: 'swap'},
      {id: 'c', at: s + 1.1, text: '登录', sub: '本人登录', icon: 'logIn'},
      {id: 'd', at: s + 1.5, text: '开始使用', sub: '桌面版或浏览器', icon: 'play'},
    ],
    path: [{at: s + 2.2, id: 'a'}, {at: s + 3.0, id: 'b'}, {at: s + 3.8, id: 'c'}, {at: s + 4.6, id: 'd'}],
  }), flowSfx),
  seg('Flow 流程图（自由坐标 + 箭头字）', 5, '请求从你的电脑出去 走的是这条路', Flow, (s) => ({
    t0: s,
    layout: 'free' as const,
    nodes: [
      {id: 'pc', at: s + 0.2, text: '你的电脑', icon: 'monitor', x: 400, y: 380},
      {id: 'app', at: s + 0.6, text: 'Claude 桌面版', icon: 'sparkles', x: 960, y: 290},
      {id: 'port', at: s + 1.0, text: '独立端口', sub: '127.0.0.1:17901', icon: 'plug', x: 960, y: 760},
      {id: 'net', at: s + 1.4, text: '固定出口', sub: '美国 · 洛杉矶', icon: 'globe', x: 1520, y: 420},
    ],
    edges: [
      {from: 'pc', to: 'app'},
      {from: 'app', to: 'port', label: '只走这里'},
      {from: 'port', to: 'net'},
      {from: 'pc', to: 'net', dashed: true, at: s + 2.0},
    ],
    path: [{at: s + 2.6, id: 'app'}, {at: s + 3.2, id: 'port'}, {at: s + 3.8, id: 'net'}],
  }), flowSfx),
  seg('Timeline 时间线', 5, '一个号从注册到现在', Timeline, (s) => ({
    t0: s,
    title: '一个号的一周',
    points: [
      {at: s + 0.3, date: '第 1 天', text: '注册账号'},
      {at: s + 0.8, date: '第 2 天', text: '绑卡订阅 Pro', sub: '一次成功'},
      {at: s + 1.3, date: '第 4 天', text: '换了网络环境', tone: 'coral' as const},
      {at: s + 1.8, date: '第 5 天', text: '降智了', sub: '回答变短'},
      {at: s + 2.3, date: '第 7 天', text: '清场后恢复'},
    ],
    now: {at: s + 3.2, i: 4},
  }), timelineSfx),
  seg('ImageShow 图片展示（推近 + 圈出）', 6, '订阅入口在设置的这个位置', ImageShow, (s) => ({
    t0: s,
    render: MockPage,
    ratio: 16 / 9,
    tag: '示意截图',
    caption: '设置 → 订阅',
    zoom: [{at: s + 1.6, x: 0.8, y: 0.38, s: 2.2}, {at: s + 4.6, x: 0.5, y: 0.5, s: 1}],
    circles: [{at: s + 2.6, t1: s + 4.4, x: 0.73, y: 0.355, w: 0.19, h: 0.105, label: '点这里升级'}],
  }), imageShowSfx),
  seg('ShotWall 截图墙', 6, '看看群里出狱的', ShotWall, (s) => ({
    t0: s,
    title: '群友出狱现场',
    badge: '真实原话',
    shots: [
      {at: s + 0.5, ratio: 4 / 3, render: shot([{text: '出狱了！！！'}, {text: '活了活了'}]), label: '出狱'},
      {at: s + 1.0, ratio: 4 / 3, render: shot([{text: '感谢群主大大'}, {text: '降智恢复了', me: true}])},
      {at: s + 1.5, ratio: 16 / 10, render: shot([{text: '我恢复了三天了，就是用群主的工具'}]), label: '满血'},
      {at: s + 2.0, ratio: 4 / 3, render: shot([{who: '观众', text: '求出一期 Gemini 的教程！', likes: 128}], 'comment'), label: '评论', labelTone: 'coral' as const},
    ],
  }), shotWallSfx),
  seg('ChatBox 聊天窗（像 Claude）', 6, '让它直接给你写排查步骤', ChatBox, (s) => ({
    t0: s,
    skin: 'claude' as const,
    title: '订阅失败怎么办',
    msgs: [
      {at: s + 1.6, from: 'me' as const, text: '帮我写一段订阅失败的排查步骤', typeFrom: s + 0.4},
      {at: s + 2.6, from: 'ai' as const, thinkFrom: s + 1.9, text: '好的，按这个顺序查：一，看卡是否开通了外币支付；二，账单地址和卡的开户地是否一致；三，等几个小时换一张卡再试。'},
      {at: s + 4.6, from: 'tool' as const, text: 'web_search("订阅 卡被拒")', done: s + 5.3, doneText: '找到 6 条'},
    ],
  }), chatBoxSfx),
  seg('ChatBox 聊天窗（像 QQ 群）· 压力样例', 5, '群里的问答 长消息自动换行', ChatBox, (s) => ({
    t0: s,
    skin: 'qq' as const,
    title: '咸鱼凌生的群 (2000)',
    msgs: [
      {at: s + 0.3, from: 'ai' as const, name: '群友 A', text: '请问一下绑卡的时候一直提示“您的卡被拒绝”，已经换了三张卡了，招行、建行、中信都不行，到底是哪里出了问题啊？', stream: false},
      {at: s + 1.2, from: 'me' as const, text: '先别反复试，等几个小时'},
      {at: s + 1.9, from: 'file' as const, name: '订阅排查清单-2026版-最终版-真的最终版.pdf', size: '1.2 MB', mine: true},
      {at: s + 2.6, from: 'note' as const, text: '群友 A 已读'},
      {at: s + 3.0, from: 'ai' as const, name: '群友 A', text: 'Supercalifragilisticexpialidocious 好的谢谢！', stream: false},
    ],
  }), chatBoxSfx),
  seg('Terminal 终端窗', 6, '装好 Node 再装 Claude Code', Terminal, (s) => ({
    t0: s,
    cwd: 'C:\\Users\\you',
    lines: [
      {at: s + 0.4, cmd: 'node -v'},
      {at: s + 1.0, out: 'v22.11.0'},
      {at: s + 1.4, cmd: 'npm install -g @anthropic-ai/claude-code'},
      {at: s + 3.4, out: 'added 3 packages in 4s', tone: 'ok' as const},
      {at: s + 3.9, out: '提示：这一行故意写得很长很长，用来测试终端窗口的自动折行功能，会不会把文字挤到窗口外面去', tone: 'warn' as const},
      {at: s + 4.4, cmd: 'claude'},
    ],
  }), terminalSfx),
];

// 软件窗口：光标点侧栏、开下拉、填卡号、拨开关、点确认
const winP = (s: number): AppWindowProps => ({
  t0: s,
  title: 'Claude 设置',
  icon: 'settings',
  sidebar: {items: [{text: '通用', icon: 'settings'}, {text: '账号', icon: 'user'}, {text: '订阅', icon: 'card'}, {text: '隐私', icon: 'shield'}], active: 0, activeAt: [{at: s + 1.0, i: 2}]},
  body: [
    {kind: 'title', text: '订阅与付款'},
    {kind: 'select', id: 'plan', label: '选择方案', value: 'Pro · 按月', options: ['Pro · 按月', 'Pro · 按年', 'Max · 按月'], openAt: s + 1.9, pickAt: s + 2.8, pick: 1},
    {kind: 'input', id: 'card', label: '卡号', placeholder: '输入卡号', value: '6222 0000 0000 0000', typeFrom: s + 3.3, typeTo: s + 4.3},
    {kind: 'toggle', id: 'auto', label: '自动续费', sub: '到期前一天提醒', on: true, flipAt: s + 4.8},
    {kind: 'row', children: [{kind: 'button', text: '取消', tone: 'plain'}, {kind: 'button', id: 'pay', text: '确认订阅', pressAt: s + 5.6}]},
  ],
  toast: {at: s + 5.9, text: '订阅成功'},
});
const winCursor = (s: number) => {
  const L = appLayout(winP(s));
  const plan = L.plan;
  return [
    {at: s, x: 1500, y: 860},
    aim(L, 'side.2', s + 1.0),
    aim(L, 'plan', s + 1.9),
    {at: s + 2.8, x: plan.cx, y: plan.y + plan.h + 6 + 68 + 34, click: true, hand: true},
    aim(L, 'card', s + 3.2),
    aim(L, 'auto', s + 4.8, {dx: L.auto.w / 2 - 42}),
    aim(L, 'pay', s + 5.6),
  ];
};

// 手机：左边步骤、右边手机，手指点按
const phoneP = (s: number): PhoneProps => ({
  t0: s,
  title: 'Google Play',
  body: [
    {kind: 'title', text: '付款和订阅'},
    {kind: 'list', id: 'menu', items: [{text: '付款方式', icon: 'card'}, {text: '订阅', icon: 'refresh'}, {text: '预算和记录', icon: 'clock'}], hiAt: [{at: s + 1.6, i: 0}]},
    {kind: 'notice', text: '国内卡需开通外币支付', tone: 'warn'},
    {kind: 'button', id: 'add', text: '添加付款方式', icon: 'plus', pressAt: s + 3.4},
  ],
  dialog: {at: s + 3.8, title: '添加信用卡', text: '会先预授权 1 美元，随后退回', buttons: ['取消', '继续'], press: 1, pressAt: s + 5.0},
});
const phoneCursor = (s: number) => {
  const L = phoneLayout(phoneP(s));
  return [{at: s + 0.6, x: L.menu.cx + 80, y: L.menu.y + 300}, aim(L, 'menu', s + 1.6, {dy: -L.menu.h / 2 + 44}), aim(L, 'add', s + 3.4), aim(L, 'dialog.1', s + 5.0)];
};

SEGS.push(
  {
    name: 'AppWindow 软件窗口 + 光标 + 说明牌',
    dur: 7,
    cap: '点订阅 选方案 填卡号 点确认',
    v: (t, s) => {
      const L = appLayout(winP(s));
      return (
        <>
          <AppWindow t={t} {...winP(s)} cursor={winCursor(s)} />
          <PointNote t={t} at={s + 5.2} t1={s + 6.6} x={L.pay.cx} y={L.pay.y} dir="up" text="点 *确认订阅*" num={4} />
          <DemoMark />
        </>
      );
    },
    sfx: (s) => {
      const L = appLayout(winP(s));
      return [...appWindowSfx({...winP(s), cursor: winCursor(s)}), ...pointNoteSfx({at: s + 5.2})];
    },
  },
  {
    name: 'Phone 手机框 + StepList（slot=left）',
    dur: 7,
    cap: '手机上也一样 跟着点',
    v: (t, s) => (
      <>
        <StepList t={t} t0={s} slot="left" title="手机上加卡" steps={[{at: s + 1.4, text: '点「付款方式」'}, {at: s + 3.2, text: '点「添加付款方式」'}, {at: s + 4.8, text: '确认预授权', sub: '1 美元会退回'}]} doneAt={s + 5.6} />
        <Phone t={t} {...phoneP(s)} cursor={phoneCursor(s)} />
      </>
    ),
    sfx: (s) => [...phoneSfx({...phoneP(s), cursor: phoneCursor(s)}), ...stepListSfx({t0: s, steps: [{at: s + 1.4, text: ''}, {at: s + 3.2, text: ''}, {at: s + 4.8, text: ''}], doneAt: s + 5.6})],
  },
  seg('WarnCard 风险提醒卡', 5, '这一条一定要注意', WarnCard, (s) => ({t0: s + 0.2, level: 'danger' as const, title: '别找人*代充*', lines: ['代充用的多是盗刷卡，号随时会被封', '封了不退钱，聊天记录也一起没了']}), warnCardSfx),
  seg('WarnCard 风险提醒卡 · 压力样例', 4, '注意卡也塞满字', WarnCard, (s) => ({t0: s + 0.1, level: 'caution' as const, label: '一个比较长的标签', title: '这是一句非常非常非常长的重点提醒，长到两行都快放不下了看看会怎样处理', lines: ['第一行说明也故意写得很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长', '第二行']}), warnCardSfx),
  seg('Meme 梗图整活（半屏 + 爆炸气泡 + 盖章）', 5, '卡又被拒了 我真的会谢', Meme, (s) => ({
    t0: s,
    src: 'char/face_shock_c0.png',
    ratio: 1215 / 1180,
    layout: 'left' as const,
    text: '卡又被拒了？？',
    text2: '我真的会谢',
    at: s + 0.6,
    burst: {at: s + 1.6, text: '啊这'},
    stamp: {at: s + 2.6, text: '破防'},
  }), memeSfx),
  seg('Meme 梗图整活（铺满）', 4, '铺满版 字压在图上下沿', Meme, (s) => ({t0: s, render: MockPage, ratio: 16 / 9, text: '升级按钮*就在这*', text2: '找了半小时', at: s + 0.4, stamp: {at: s + 1.8, text: '就这？', tone: 'coral' as const}}), memeSfx),
  seg('Recap 回顾', 5, '最后回顾一下这期的要点', Recap, (s) => ({
    t0: s,
    items: [
      {at: s + 0.4, text: '卡要开通外币支付', icon: 'card'},
      {at: s + 0.9, text: '账单地址和卡一致', icon: 'idCard'},
      {at: s + 1.4, text: '被拒先停，别连着试', icon: 'clock'},
      {at: s + 1.9, text: '不找人代充', icon: 'ban'},
    ],
    mascot: 'victory' as const,
  }), recapSfx),
  seg('EndCard 片尾卡', 5, '不会的来群里问 下期见', EndCard, (s) => ({t0: s, group: '123456789', groupNote: '装不上、卡被拒，群里问', tripleAt: s + 1.4, made: '本视频由 Claude 制作', thanks: '感谢群友提供截图'}), endCardSfx),
  seg('EndCard 片尾卡 · 压力样例', 4, '署名和致谢都写很长', EndCard, (s) => ({t0: s, group: '123456789', groupNote: '这一行说明故意写得特别特别长，看看两行之内能不能放下，放不下就截断', author: '咸鱼凌生', made: '本视频由 Claude Opus 5.5 制作，调研派给四条大肥鱼，角色和封面交给 Codex', thanks: '感谢 小林、群友 A、群友 B、群友 C、群友 D 提供素材和建议', say: '下期见下期见下期见下期见'}), endCardSfx),
  seg('MadeBy 制作说明卡', 5, '这期视频是怎么做的', MadeBy, (s) => ({
    t0: s,
    parts: [
      {at: s + 0.8, icon: 'search', text: '调研：派给四条大肥鱼'},
      {at: s + 1.4, icon: 'camera', text: '角色和封面：交给 Codex'},
      {at: s + 2.0, icon: 'code', text: '画面和剪辑：Claude 写代码动画'},
    ],
  }), madeBySfx),
  {
    name: '小件：Highlight · Stamp · Burst · Tag · Arrow · PointNote · MascotSay · CharImg',
    dur: 6,
    cap: '小件可以随便往画面上加',
    v: (t, s) => (
      <>
        <div style={{position: 'absolute', left: 140, top: 190}}>
          <Highlight t={t} at={s + 0.4} text="荧光笔划过一行重点" size={56} />
        </div>
        <div style={{position: 'absolute', left: 140, top: 310, display: 'flex', gap: 24}}>
          <Tag text="推荐" tone="coral" vis={1} />
          <Tag text="免费" tone="mint" icon="check" />
          <Tag text="示意" tone="ink" solid={false} />
          <Tag text="新版本 *3.1*" tone="sky" />
        </div>
        <Stamp t={t} at={s + 1.2} text="不用关！" tone="mint" x={1240} y={640} size={72} />
        <Burst t={t} at={s + 1.8} text="啊这" x={820} y={560} />
        <Arrow x1={470} y1={800} x2={720} y2={660} p={Math.min(1, Math.max(0, (t - s - 2.2) / 0.5))} bend={0.2} />
        <div style={{position: 'absolute', left: 1060, top: 300, width: 200, height: 90, borderRadius: 18, background: C.sky, border: `4px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: F.zh, fontWeight: 900, fontSize: 32, gap: 10}}>
          <Icon name="download" size={30} color="#fff" sw={2.6} />
          下载
        </div>
        <PointNote t={t} at={s + 2.6} x={1160} y={390} dir="down" text="点 *下载*" sub="会跳到官网" num={1} />
        <div style={{position: 'absolute', left: 1500, top: 470}}>
          <CharImg t={t} h={300} frames={['char/think_c0.png', 'char/think_c1.png', 'char/think_c2.png']} />
        </div>
        <MascotSay t={t} t0={s + 3.2} pose="point" spot="left-bottom" say="就这么简单" />
      </>
    ),
    sfx: (s) => [...highlightSfx({at: s + 0.4}), ...stampSfx({at: s + 1.2}), ...burstSfx({at: s + 1.8}), ...pointNoteSfx({at: s + 2.6}), ...mascotSaySfx({t0: s + 3.2, say: 'x'})],
  },
);

const starts = (segs: Seg[]) => {
  let a = 0;
  return segs.map((g) => {
    const s = a;
    a += g.dur;
    return s;
  });
};
const START = starts(SEGS);
export const GALLERY_SECONDS = SEGS.reduce((a, g) => a + g.dur, 0);

const Label: React.FC<{name: string; s: number; vertical?: boolean}> = ({name, s, vertical}) => (
  <div style={{position: 'absolute', left: 14, top: vertical ? 14 : 6, fontFamily: F.ui, fontSize: 22, fontWeight: 700, color: 'rgba(35,40,66,0.55)', zIndex: 100, whiteSpace: 'nowrap'}}>
    {name} · {s}s
  </div>
);
/** 示例字幕（和成片字幕同样式同位置） */
const Cap: React.FC<{text: string; vertical?: boolean}> = ({text, vertical}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: vertical ? 300 : 30, display: 'flex', justifyContent: 'center', zIndex: 90}}>
    <div style={{maxWidth: vertical ? 960 : 1500, background: 'rgba(35,40,66,0.92)', color: '#fff', fontFamily: F.zh, fontWeight: 600, fontSize: vertical ? 48 : 40, letterSpacing: 1.5, lineHeight: 1.3, padding: '9px 28px 11px', borderRadius: 14, textAlign: 'center'}}>{text}</div>
  </div>
);

const Reel: React.FC<{segs: Seg[]; starts: number[]; vertical?: boolean}> = ({segs, starts: st, vertical}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  let i = st.findIndex((s, k) => t >= s && t < s + segs[k].dur);
  if (i < 0) i = segs.length - 1;
  const g = segs[i];
  const s = st[i];
  const events = React.useMemo(() => segs.flatMap((x, k) => (x.sfx ? x.sfx(st[k]) : [])), [segs, st]);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Paper t={t} />
      {g.v(t, s)}
      <Cap text={g.cap} vertical={vertical} />
      <Label name={g.name} s={s} vertical={vertical} />
      <SfxTrack events={events} />
    </AbsoluteFill>
  );
};

export const Gallery: React.FC = () => <Reel segs={SEGS} starts={START} />;

// ───────── 竖屏陈列片（1080×1920） ─────────
const SEGS_V: Seg[] = [
  seg('Hook 开场钩子（竖）', 6, '订阅总失败？这期一次讲清', Hook, (s) => ({...(SEGS_P.hook(s)), vertical: true}), hookSfx),
  seg('TitleCard 片名字卡（竖）', 5, '国内卡订 Claude Pro', TitleCard, (s) => ({t0: s + 0.1, title: '国内卡订 *Claude Pro*', sub: '从注册到付款，一步不落', kicker: 'AI 工具教程', mascot: 'wave' as const, vertical: true}), titleCardSfx),
  seg('Roadmap 本期路线（竖）', 5, '这期讲三件事', Roadmap, (s) => ({t0: s, vertical: true, items: [{at: s + 0.5, text: '注册账号', sub: '邮箱就够', icon: 'user'}, {at: s + 1.0, text: '绑卡付款', sub: '国内卡也行', icon: 'card'}, {at: s + 1.5, text: '防封小技巧', icon: 'shield'}], focus: [{at: s + 3, i: 2}]}), roadmapSfx),
  {
    name: 'ChapterBreak 换章过场（竖）',
    dur: 3,
    cap: '第二件事 绑卡付款',
    v: (t, s) => (
      <>
        <ChapterTag t={t} t0={s + 1.6} text="绑卡付款" n={2} vertical />
        <ChapterBreak t={t} t0={s + 0.1} n={2} title="绑卡付款" sub="国内卡也行" icon="card" vertical />
      </>
    ),
  },
  seg('BigNumber 大数字（竖）', 5, '一共只要六步', BigNumber, (s) => ({t0: s + 0.1, value: 6, unit: '步', label: '从注册到订阅，一共只要这么多', vertical: true}), bigNumberSfx),
  seg('StepList 步骤清单（竖）', 6, '跟着点 四步就能订上', StepList, (s) => ({t0: s, vertical: true, title: '订阅四步走', steps: [{at: s + 0.5, text: '打开设置，点「订阅」', icon: 'settings'}, {at: s + 1.4, text: '选 Pro 方案', sub: '按月付，随时能取消', icon: 'star'}, {at: s + 2.3, text: '填卡号和账单地址', sub: '地址要和卡的开户地一致', icon: 'card'}, {at: s + 3.2, text: '点确认，等扣款成功', icon: 'check'}], doneAt: s + 4.2}), stepListSfx),
  seg('CardRow 卡片排（竖着叠）', 5, '三种付款方式', CardRow, (s) => ({t0: s, vertical: true, title: '三种付款方式', items: [{at: s + 0.4, title: '国内信用卡', desc: '最省事，部分卡会被拒', icon: 'card', badge: '推荐'}, {at: s + 0.9, title: '虚拟卡', desc: '成功率高，要先充值', icon: 'shieldCheck', tone: 'mint' as const, mark: 'ok' as const}, {at: s + 1.4, title: '找人代充', desc: '便宜，但有封号风险，长文字压力测试一下会不会出框', icon: 'alert', tone: 'coral' as const, mark: 'no' as const}]}), cardRowSfx),
  seg('Versus 对比（竖）', 5, '网页版和桌面版', Versus, (s) => ({t0: s, vertical: true, title: '网页版还是桌面版？', left: {at: s + 0.3, title: '网页版', icon: 'globe', items: [{text: '打开浏览器就能用'}, {text: '碰不到电脑上的文件'}]}, right: {at: s + 0.9, title: '桌面版', icon: 'monitor', items: [{text: '要装一个软件'}, {text: '能直接读写本地文件'}]}, verdict: {at: s + 2.6, win: 'right' as const, text: '干活选它'}}), versusSfx),
  seg('CheckList 核对清单（竖）', 5, '付款前先对一遍', CheckList, (s) => ({t0: s, vertical: true, title: '付款前对一遍', items: [{at: s + 0.6, text: '卡开通了外币支付'}, {at: s + 1.2, text: '账单地址和卡一致'}, {at: s + 1.8, text: '一小时内反复提交', ok: false, note: '会被风控'}]}), checkListSfx),
  seg('BarChart 对比条（竖）', 5, '四家各用了多久', BarChart, (s) => ({t0: s, vertical: true, title: '同一道题用时', rows: [{at: s + 0.3, name: 'Claude', value: 32, label: '32 秒', tone: 'coral' as const}, {at: s + 0.6, name: 'GPT', value: 41, label: '41 秒', tone: 'ink' as const}, {at: s + 0.9, name: '大肥鱼', value: 58, label: '58 秒', tone: 'sky' as const}, {at: s + 1.2, name: 'Gemini', value: 47, label: '47 秒', tone: 'mint' as const}], max: 60, hi: [{at: s + 2.6, i: 0}]}), barChartSfx),
  seg('Table 表格（竖，3 列）', 5, '三种方式对比', Table, (s) => ({t0: s, vertical: true, title: '三种方式对比', cols: [{title: '方式'}, {title: '成功率'}, {title: '推荐'}], rows: [{at: s + 0.4, cells: ['国内信用卡', '中', '✓']}, {at: s + 0.8, cells: ['虚拟卡', '高', '✓']}, {at: s + 1.2, cells: ['找人代充', '高', '✗']}], hi: [{at: s + 2.4, r: 2}]}), tableSfx),
  seg('Flow 流程图（竖排）', 5, '第一次用 只走一遍', Flow, (s) => ({t0: s, vertical: true, title: '第一次用', nodes: [{id: 'a', at: s + 0.3, text: '建档', sub: '起个名字', icon: 'layers'}, {id: 'b', at: s + 0.6, text: '切换', icon: 'swap'}, {id: 'c', at: s + 0.9, text: '登录', sub: '本人登录', icon: 'logIn'}, {id: 'd', at: s + 1.2, text: '开始使用', icon: 'play'}], path: [{at: s + 2, id: 'a'}, {at: s + 2.6, id: 'b'}, {at: s + 3.2, id: 'c'}]}), flowSfx),
  seg('Timeline 时间线（竖）', 5, '一个号的一周', Timeline, (s) => ({t0: s, vertical: true, title: '一个号的一周', points: [{at: s + 0.3, date: '第 1 天', text: '注册账号'}, {at: s + 0.7, date: '第 2 天', text: '绑卡订阅 Pro'}, {at: s + 1.1, date: '第 5 天', text: '降智了', tone: 'coral' as const}, {at: s + 1.5, date: '第 7 天', text: '清场后恢复'}], now: {at: s + 2.6, i: 3}}), timelineSfx),
  seg('ImageShow 图片展示（竖）', 5, '订阅入口在这', ImageShow, (s) => ({t0: s, vertical: true, render: MockPage, ratio: 16 / 9, tag: '示意截图', caption: '设置 → 订阅', zoom: [{at: s + 1.4, x: 0.8, y: 0.38, s: 2}], circles: [{at: s + 2.4, x: 0.73, y: 0.355, w: 0.19, h: 0.105, label: '点这里'}]}), imageShowSfx),
  seg('ShotWall 截图墙（竖）', 5, '群友出狱现场', ShotWall, (s) => ({t0: s, vertical: true, title: '群友出狱现场', shots: [{at: s + 0.4, ratio: 4 / 3, render: shot([{text: '出狱了！！！'}, {text: '活了活了'}]), label: '出狱'}, {at: s + 0.9, ratio: 4 / 3, render: shot([{text: '感谢群主大大'}])}, {at: s + 1.4, ratio: 16 / 10, render: shot([{text: '我恢复了三天了，就是用群主的工具'}]), label: '满血'}]}), shotWallSfx),
  seg('ChatBox 聊天窗（竖）', 6, '让它直接写排查步骤', ChatBox, (s) => ({t0: s, vertical: true, skin: 'chatgpt' as const, title: '订阅失败怎么办', msgs: [{at: s + 1.5, from: 'me' as const, text: '帮我写一段订阅失败的排查步骤', typeFrom: s + 0.3}, {at: s + 2.4, from: 'ai' as const, thinkFrom: s + 1.8, text: '好的，按这个顺序查：一，看卡是否开通了外币支付；二，账单地址和卡的开户地是否一致；三，等几个小时换一张卡再试。'}]}), chatBoxSfx),
  seg('Terminal 终端窗（竖）', 5, '装 Claude Code', Terminal, (s) => ({t0: s, vertical: true, lines: [{at: s + 0.3, cmd: 'node -v'}, {at: s + 0.9, out: 'v22.11.0'}, {at: s + 1.2, cmd: 'npm install -g @anthropic-ai/claude-code'}, {at: s + 3.2, out: 'added 3 packages in 4s', tone: 'ok' as const}]}), terminalSfx),
  {
    name: 'Phone 手机框（竖）',
    dur: 6,
    cap: '手机上加卡',
    v: (t, s) => {
      const p = {...phoneP(s), vertical: true};
      const L = phoneLayout(p);
      return <Phone t={t} {...p} cursor={[{at: s + 0.6, x: L.menu.cx + 80, y: L.menu.y + 300}, aim(L, 'menu', s + 1.6, {dy: -L.menu.h / 2 + 44}), aim(L, 'add', s + 3.4), aim(L, 'dialog.1', s + 5.0)]} />;
    },
  },
  seg('WarnCard 风险提醒卡（竖）', 4, '别找人代充', WarnCard, (s) => ({t0: s + 0.1, vertical: true, level: 'danger' as const, title: '别找人*代充*', lines: ['代充用的多是盗刷卡，号随时会被封', '封了不退钱']}), warnCardSfx),
  seg('Meme 梗图（竖）', 4, '卡又被拒了', Meme, (s) => ({t0: s, vertical: true, src: 'char/face_shock_c0.png', ratio: 1215 / 1180, layout: 'left' as const, text: '卡又被拒了？？', text2: '我真的会谢', at: s + 0.4, burst: {at: s + 1.4, text: '啊这', x: 820, y: 380}}), memeSfx),
  seg('Recap 回顾（竖）', 5, '回顾一下', Recap, (s) => ({t0: s, vertical: true, items: [{at: s + 0.3, text: '卡要开通外币支付', icon: 'card'}, {at: s + 0.7, text: '账单地址和卡一致', icon: 'idCard'}, {at: s + 1.1, text: '被拒先停，别连着试', icon: 'clock'}, {at: s + 1.5, text: '不找人代充', icon: 'ban'}]}), recapSfx),
  seg('MadeBy 制作说明（竖）', 4, '这期视频怎么做的', MadeBy, (s) => ({t0: s, vertical: true, parts: [{at: s + 0.6, icon: 'search', text: '调研：四条大肥鱼'}, {at: s + 1.0, icon: 'camera', text: '角色和封面：Codex'}]}), madeBySfx),
  seg('EndCard 片尾卡（竖）', 5, '不会的来群里问', EndCard, (s) => ({t0: s, vertical: true, group: '123456789', groupNote: '装不上、卡被拒，群里问', tripleAt: s + 1.2, made: '本视频由 Claude 制作', thanks: '感谢群友提供截图'}), endCardSfx),
];
const SEGS_P = {
  hook: (s: number) => ({
    t0: s,
    lines: [
      {at: s + 0.2, text: '绑卡总是*被拒*？'},
      {at: s + 1.0, text: '订阅到一半*卡住*？'},
      {at: s + 1.8, text: '刚开的号就被*封*了？'},
    ],
    land: {at: s + 3.0, text: '这期*一次*讲清楚', sub: '国内卡也能订 Claude Pro'},
    mascot: 'point' as const,
  }),
};
const START_V = starts(SEGS_V);
export const GALLERY_V_SECONDS = SEGS_V.reduce((a, g) => a + g.dur, 0);
export const GalleryV: React.FC = () => <Reel segs={SEGS_V} starts={START_V} vertical />;
