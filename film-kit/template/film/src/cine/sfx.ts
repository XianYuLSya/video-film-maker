// 音效：每个带动作的组件都有一个同名加 Sfx 的函数，参数和组件一样（不含 t），返回音效事件。
// 做法和教程片积木一样：把组件的参数写成一个对象，画面和音效共用它，时刻就一定对得上。
//
// 这里只说「什么时刻、哪一类声音、多大声」，用的是片场 kit\sfx.tsx 里已有的类别名；
// 具体是哪个音频文件由片场的音效表决定（音效文件不随片场分发，各人放各人的）。
// 规矩：鼓点已经在打拍子了，音效只给画面上独有的动作；连着响的同类声音，音量一个比一个小。
// reelSfx（转场）在 Reel.tsx，lockupSfx（落款）在 Lockup.tsx。
import type {Ev} from '../kit/sfx';
import {ScanTarget, scanHits} from './Marks';

/** 落位：落地那一下轻轻一声。order 是第几个落的（从 0 数），越往后越轻 */
export const floatSfx = (o: {land: number; solid?: boolean}, order = 0): Ev[] => [{at: o.land, k: o.solid ? 'lock' : 'lockq', vol: Math.max(0.12, (o.solid ? 0.34 : 0.26) - order * 0.03)}];

/** 填上：打字是键盘声（和打字一样长），直接出现是一声轻的开关 */
export const fillSfx = (o: {at: number; text?: string; cps?: number}): Ev[] => (o.text !== undefined ? [{at: o.at, typing: Array.from(o.text).length / (o.cps ?? 6.5), vol: 0.22}] : [{at: o.at, k: 'tap', vol: 0.3}]);

/** 选中环亮起 */
export const ringSfx = (o: {t0: number}): Ev[] => [{at: o.t0, k: 'tap', vol: 0.3}];

/** 光标按下 */
export const pressSfx = (o: {at: number}): Ev[] => [{at: o.at, k: 'click', vol: 0.4}];

/** 扫描标注：扫描线出发一声，每框住一个轻轻一声（音量递减） */
export const scanSfx = (o: {t0: number; dur: number; targets: ScanTarget[]; pad?: number}): Ev[] => [
  {at: o.t0, k: 'scan', vol: 0.2},
  ...scanHits(o).map((at, i): Ev => ({at, k: 'lockq', vol: Math.max(0.12, 0.24 - i * 0.03)})),
];

/** 数字滚动：一组数字一起滚时只给一声 */
export const rollSfx = (o: {at: number}): Ev[] => [{at: o.at, k: 'sweep', vol: 0.16}];

/** 字里透界面：字出现是全片的重音；冲进字里是一声呼啸，冲到头那一下对在接管的时刻 */
export const typeWindowSfx = (o: {t0: number; through?: {at: number; dur?: number}}): Ev[] => [
  {at: o.t0, k: 'bass', vol: 0.4},
  {at: o.t0 + 0.05, k: 'zoom', vol: 0.2},
  ...(o.through ? [{at: o.through.at + (o.through.dur ?? 0.55), k: 'whoosh', vol: 0.36} as Ev] : []),
];

/** 蓄力：一声上升的呼啸，最响的地方对在 at（通常是下一个镜头切入的那一拍） */
export const riseSfx = (o: {at: number}): Ev[] => [{at: o.at, k: 'shimmer', vol: 0.24}];

/** 镜头自己的大动作（俯冲、甩开）：一声风 */
export const moveSfx = (o: {at: number}): Ev[] => [{at: o.at, k: 'air', vol: 0.26}];
