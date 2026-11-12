// 这部片子的公共件：坐标表和主题。所有镜头都从这里取界面和颜色。
//
// 起步工程用的是镜头包自带的示例界面（一个虚构的「仓储看板」）。换成你的产品时：
//   1. 写截图清单（照模板的 cine-demo\capture.json），跑 node film/scripts/capture.mjs <清单>，
//      让它把图写到 film\public\cap\、坐标表写到 film\src\cap.json；
//   2. 把下面第一行改成 import capJson from '../cap.json';
import capJson from '../cine/demo/cap.json';
import {CapPage, makeTheme} from '../cine';

const CAP = capJson as unknown as {pages: Record<string, CapPage>; palette: Record<string, string>};
export const PAGE = CAP.pages;
/** 主题：从界面自己的颜色生成 */
export const T = makeTheme(CAP.palette);
