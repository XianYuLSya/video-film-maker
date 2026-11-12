import type {Scene} from './common';
import {HookScene} from './Hook';
import {ScriptScene} from './Script';
import {SyncScene} from './Sync';
import {RunScene} from './Run';
import {EndScene} from './End';

export type {Scene};

// 各幕按时间顺序登记。数组顺序不决定播放时间（播放按各自的 range()），
// 但决定图层：范围重叠时，后面的画在上面 —— 所以下一章的换章过场能盖住上一章的结尾。
// 漏登记就不渲染。
export const SCENES: Scene[] = [HookScene, ScriptScene, SyncScene, RunScene, EndScene];
