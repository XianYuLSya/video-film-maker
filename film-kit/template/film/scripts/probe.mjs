// 排版体检：在若干个时间点各渲染一帧（顺手把图丢到临时目录，用完就删），
// 让画面里的 <Probe/>（kit/probe.tsx）把每个文字块的位置/字号/透明度打成一行 console.log('PROBE:...')、
// 把每个模拟窗口（data-probe="skip" 元素本身）的矩形打成一行 console.log('PROBE-BOX:...')，
// 这里用 renderStill 的 onBrowserLog 收回来，按下面的规则判，结果写成 JSON 交给 film.py。
//
// 用法：node scripts/probe.mjs --comp FilmZh --plan plan.json --out out.json --tmp 临时目录
//                            --width 1920 --height 1080 --sub-top 940 [--sub-bottom 1630]
//
// 规则（阈值都在下面 MIN_FONT 那几个常量里）：
//   出画      可见文字矩形超出画布 2px 以上                        → 错误
//   压字幕    可见文字和字幕（data-probe="subtitle"）相交            → 错误
//   字太小    实际显示字号 < 22 → 错误；22–26 → 提醒
//   文字重叠  两个互不为祖先后代的可见文字矩形，交叠超过较小者的 30%   → 提醒
//   被裁切    祖先 overflow:hidden 且文字超出它的可见范围             → 提醒
//   窗口压字幕条 模拟窗口（data-probe="skip" 元素本身）的外接矩形和字幕条相交 → 提醒
//
// 整屏自管的场景（Scene.bare）：那一刻外壳不画字幕条，画面里的 <Probe/> 会多打一行
// PROBE-BARE:1，这时「压字幕」「窗口压字幕条」两条都不判（没有字幕条了，判了全是误报）；
// 出画 / 字太小 / 文字重叠 / 被裁切四条照旧。
//
// 两条关于模拟界面的豁免/规则（试用时「窗口里的界面文字被画面边缘裁掉」一轮报了 72 条，
// 全是这个：模拟界面内部的小字本来就不是正文，窗口推近时被边缘裁掉是画面设计，不是错）：
//   - data-probe="skip" 子树里的文字：不报「出画」「被裁切」「字太小」「文字重叠」；
//     「压字幕」照报 —— 窗口里的字真的压在字幕底下，观众就是看不见。
//   - 但窗口本身（外框）要盯：它可见时如果压到字幕条，整块界面都会被字幕盖住，报一条提醒。
//     字幕条当前没显示时按固定区域算（--sub-top / --sub-bottom，由 film.py 按版本传）。
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const MIN_FONT = 22;
const WARN_FONT = 26;
const EDGE_TOL = 2;
const OVERLAP_RATIO = 0.3;
const VISIBLE_OPACITY = 0.3;

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    opt[argv[i].slice(2)] = argv[i + 1];
    i++;
  }
}
const comp = opt.comp;
const planPath = opt.plan;
const outPath = opt.out || 'out/probe.json';
const tmpDir = opt.tmp || 'out/probe_tmp';
const W = Number(opt.width || 1920);
const H = Number(opt.height || 1080);
// 字幕条的固定区域（字幕当前没显示时按这个算「窗口压字幕条」）：不传就取画布下沿。
const SUB_TOP = opt['sub-top'] === undefined ? null : Number(opt['sub-top']);
const SUB_BOTTOM = opt['sub-bottom'] === undefined ? H : Number(opt['sub-bottom']);
const browserExecutable = process.env.FILM_BROWSER || undefined;
const browserOpts = browserExecutable ? {browserExecutable} : {};

// 这些清单都是 film.py 写的（无 BOM），但清单可能被人用 PowerShell 的 Set-Content 存过一遍（会带 BOM）；
// JSON.parse 见到 BOM 会直接抛「Unexpected token」，所以读的时候统一先剥掉。
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const plan = readJson(planPath);
fs.mkdirSync(tmpDir, {recursive: true});
fs.mkdirSync(path.dirname(path.resolve(outPath)), {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), onProgress: () => undefined});
// probe: true 必须在这里（selectComposition）就传进去：renderStill 会以这儿解析出的 props 为准，
// 只在 renderStill 里传 inputProps 的话，画面拿到的 probe 还是 false（实测踩过）。
const composition = await selectComposition({
  serveUrl,
  id: comp,
  inputProps: {probe: true},
  ...browserOpts,
  chromiumOptions: {gl: 'angle'},
});

const area = (r) => Math.max(0, r.w) * Math.max(0, r.h);
const inter = (a, b) => {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return {x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0)};
};
// 两个文字块是不是祖孙关系（kp 是 DOM 里的位置："0/1/3"）
const related = (a, b) => a.kp === b.kp || a.kp.startsWith(b.kp + '/') || b.kp.startsWith(a.kp + '/');

function judge(sec, nodes, boxes, bare) {
  const issues = [];
  const vis = nodes.filter((n) => n.op > VISIBLE_OPACITY && n.w > 0.5 && n.h > 0.5 && n.text);
  const subs = nodes.filter((n) => n.sub && n.w > 0.5 && n.h > 0.5);
  const touching = (a, b) => inter(a, b).w > 2 && inter(a, b).h > 2;
  for (const n of vis) {
    // 出画（模拟界面内部的字不算：窗口推近时界面被边缘裁掉是设计，不是排版错）
    if (!n.skip && (n.x < -EDGE_TOL || n.y < -EDGE_TOL || n.x + n.w > W + EDGE_TOL || n.y + n.h > H + EDGE_TOL)) {
      issues.push({sec, level: 'error', kind: '出画', text: n.text, rect: n});
      continue;
    }
    // 压字幕（字幕自己的子元素、同一块的父子不算）。模拟界面里的字照报：真压上是看不见的。
    // 整屏自管的场景没有字幕条，这条跳过。
    if (!n.sub && !bare) {
      const bad = subs.find((s) => !related(n, s) && touching(n, s));
      if (bad) issues.push({sec, level: 'error', kind: '压字幕', text: n.text, rect: n});
    }
    if (n.skip) continue; // 剩下三条都只针对画面正文
    // 字太小
    if (n.size < MIN_FONT) {
      issues.push({sec, level: 'error', kind: `字太小 ${Math.round(n.size)}px`, text: n.text, rect: n});
    } else if (n.size < WARN_FONT) {
      issues.push({sec, level: 'warn', kind: `字偏小 ${Math.round(n.size)}px`, text: n.text, rect: n});
    }
    // 被裁切
    if (n.clip && area(inter(n, n.clip)) < area(n) * 0.98) {
      issues.push({sec, level: 'warn', kind: '被裁切', text: n.text, rect: n});
    }
  }
  // 文字重叠（互不为祖先后代；模拟界面内部的字不算）
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i];
      const b = vis[j];
      if (related(a, b) || a.skip || b.skip) continue;
      const small = Math.min(area(a), area(b));
      if (small > 0 && area(inter(a, b)) / small > OVERLAP_RATIO) {
        issues.push({sec, level: 'warn', kind: '文字重叠', text: `${a.text} ↔ ${b.text}`, rect: a});
      }
    }
  }
  // 窗口压字幕条：模拟窗口的外框和字幕条相交（字幕没显示时按固定区域算）。
  // 里面每一行字都被 skip 豁免了，所以这里必须单独量一次外框，不然「整块界面压在字幕上」没人管。
  // key 用窗口在 DOM 里的位置：同一窗口在连续时间点上合并成一条（film.py 按 kind + key 合并）。
  // 整屏自管的场景没有字幕条，固定区域也不适用，整块跳过。
  if (boxes.length && !bare) {
    const zone = subs.length
      ? {
          x: Math.min(...subs.map((s) => s.x)),
          y: Math.min(...subs.map((s) => s.y)),
          w: Math.max(...subs.map((s) => s.x + s.w)) - Math.min(...subs.map((s) => s.x)),
          h: Math.max(...subs.map((s) => s.y + s.h)) - Math.min(...subs.map((s) => s.y)),
        }
      : SUB_TOP === null
        ? null // 字幕没显示、也不知道字幕条固定区域：这一帧没法判
        : {x: 0, y: SUB_TOP, w: W, h: Math.max(0, SUB_BOTTOM - SUB_TOP)};
    for (const b of boxes) {
      if (!zone || b.op <= VISIBLE_OPACITY) continue;
      // 整块铺满画布的 skip 元素多半是角标/装饰层的外壳（例如 Film.tsx 里包 DemoMark 的那层 inset:0），
      // 不是模拟窗口，别拿它报「窗口压字幕条」。
      if (b.w * b.h >= W * H * 0.9) continue;
      if (!touching(b, zone)) continue;
      issues.push({
        sec,
        level: 'warn',
        kind: '窗口压字幕条',
        text: '提醒：模拟窗口压到字幕区',
        key: `box:${b.kp}`,
        box: true,
        label: b.label,
        rect: {x: b.x, y: b.y, w: b.w, h: b.h},
        zone: {x: Math.round(zone.x), y: Math.round(zone.y), w: Math.round(zone.w), h: Math.round(zone.h)},
      });
    }
  }
  return issues;
}

const all = [];
let failed = 0;
for (const item of plan) {
  const sec = Number(item.sec);
  const frame = Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(sec * composition.fps)));
  const shot = path.join(tmpDir, `probe_${String(sec).replace('.', '_')}.png`);
  let nodes = [];
  let boxes = [];
  let bare = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    nodes = [];
    boxes = [];
    bare = false;
    try {
      await renderStill({
        composition,
        serveUrl,
        frame,
        output: shot,
        inputProps: {probe: true},
        ...browserOpts,
        chromiumOptions: {gl: 'angle'},
        scale: 1,
        timeoutInMilliseconds: 60000,
        onBrowserLog: (log) => {
          const msg = String(log.text ?? '');
          if (msg.startsWith('PROBE:')) {
            try {
              nodes = JSON.parse(msg.slice(6));
            } catch (e) {
              console.error('PROBE 数据解析失败：', e.message);
            }
          } else if (msg.startsWith('PROBE-BOX:')) {
            try {
              boxes = JSON.parse(msg.slice(10));
            } catch (e) {
              console.error('PROBE-BOX 数据解析失败：', e.message);
            }
          } else if (msg.startsWith('PROBE-BARE:')) {
            bare = msg.slice(11).trim() === '1'; // 整屏自管的场景：这一刻没有字幕条
          }
        },
      });
      break;
    } catch (e) {
      if (attempt === 1) {
        failed += 1;
        console.error('时间点', sec, '渲染失败：', String(e.message).slice(0, 200));
      } else {
        console.log(`${sec}s 渲染超时，重试一次`);
      }
    }
  }
  const issues = judge(sec, nodes, boxes, bare);
  console.log(`${sec.toFixed(2)}s  ${nodes.length} 个文字块 / ${boxes.length} 个模拟窗口${bare ? '（整屏自管，跳过字幕相关判定）' : ''}  ${issues.length} 个问题`);
  all.push(...issues);
}

fs.writeFileSync(outPath, JSON.stringify({comp, width: W, height: H, points: plan.length, failed, issues: all}, null, 1), 'utf8');
console.log('排版体检', comp, '→', outPath, `${all.length} 个问题${failed ? `，${failed} 个时间点没量到` : ''}`);
