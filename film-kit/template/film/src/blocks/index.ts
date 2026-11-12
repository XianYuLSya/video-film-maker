// 积木库统一出口：场景里只从这里 import。用法见同目录「手册.md」。

// 地基
export {C, F, FitText, Out, SIZE, TONE, fit, fitH, innerW, plain, pop, slotBox, stageOf, textW, vis, warnOnce} from './core';
export type {Fit, FitOpts, FitTextProps, Font, Slot, Stage, Tone} from './core';

// 小件
export {Arrow, Burst, Card, CharImg, Circle, DemoMark, Highlight, Icon, IconBox, Mark, MascotSay, PointNote, SpeedLines, Stamp, Tag, Title, burstSfx, circleSfx, highlightSfx, mascotSaySfx, pointNoteSfx, stampSfx} from './atoms';
export type {ArrowProps, BurstProps, CardProps, CharImgProps, HighlightProps, IconName, MascotSayProps, MascotSpot, PointNoteProps, Pose, SpeedLinesProps, StampProps, TagProps, TitleProps} from './atoms';

// 整屏版式
export {Hook, TitleCard, hookSfx, titleCardSfx} from './Hook';
export type {HookLine, HookProps, TitleCardProps} from './Hook';
export {ChapterBreak, ChapterTag, Roadmap, chapterBreakSfx, chapterTagSfx, roadmapSfx} from './Roadmap';
export type {ChapterBreakProps, ChapterTagProps, RoadItem, RoadmapProps} from './Roadmap';
export {CardRow, cardRowSfx} from './CardRow';
export type {CardItem, CardRowProps} from './CardRow';
export {Versus, versusSfx} from './Versus';
export type {VersusProps, VsSide} from './Versus';
export {CheckList, StepList, checkListSfx, stepListSfx} from './Steps';
export type {CheckItem, CheckListProps, Step, StepListProps} from './Steps';
export {BigNumber, bigNumberSfx} from './BigNumber';
export type {BigNumberProps} from './BigNumber';
export {BarChart, barChartSfx} from './BarChart';
export type {BarChartProps, BarRow} from './BarChart';
export {Table, tableSfx} from './Table';
export type {TableCol, TableProps, TableRow} from './Table';
export {Flow, Timeline, flowSfx, timelineSfx} from './Flow';
export type {FlowEdge, FlowNode, FlowProps, TimePoint, TimelineProps} from './Flow';
export {ImageShow, Meme, ShotWall, TextShot, imageShowSfx, memeSfx, shotWallSfx} from './Picture';
export type {ImageShowProps, MemeProps, PicCircle, PicSrc, Shot, ShotWallProps, TextShotLine, TextShotProps, ZoomKey} from './Picture';
export {ChatBox, chatBoxSfx} from './Chat';
export type {ChatBoxProps, ChatMsg, ChatSkin} from './Chat';
export {Terminal, terminalSfx} from './Terminal';
export type {TermLine, TerminalProps} from './Terminal';
export {AppWindow, Phone, aim, appLayout, appWindowSfx, phoneLayout, phoneSfx} from './AppUI';
export type {AppWindowProps, Box, Dialog, PhoneProps, Toast, Widget} from './AppUI';
export {EndCard, MadeBy, Recap, WarnCard, endCardSfx, madeBySfx, recapSfx, warnCardSfx} from './Ending';
export type {EndCardProps, MadeByProps, RecapProps, WarnCardProps} from './Ending';
