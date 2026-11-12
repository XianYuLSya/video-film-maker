// 一次打包，按清单出多张静帧（review / stills 都用它）。
//
// 用法一（片场驱动 film.py 用的，推荐）：
//   node scripts/stills.mjs --comp FilmZh --out <目录> --plan <plan.json>
//   plan.json： [{"sec": 12.5, "name": "0012.50_c1.png"}]
// 用法二（手工抽几张）：
//   node scripts/stills.mjs FilmZh <目录> 12.5 30
//
// 渲染用的浏览器：环境变量 FILM_BROWSER 给了就用它，没给就交给 Remotion 自己找。
//
// 失败怎么处理（这条是踩出来的）：
//   - 单张失败重试一次，还失败就记下来、**继续渲后面的**。老写法是直接 throw，一张坏帧
//     就把整批剩下的几十张全丢了，而 film.py 那边只打「命令失败（退出码 1）」，看着像没报错。
//   - 全部跑完再总结：出了几张、失败几张、每一张失败的原始报错（打 full stack）。
//   - 有失败就退出码 3，一张没失败退出码 0；脚本自己崩（打包/取合成失败）退出码 1，
//     并且先打一行「✗ 抽帧失败：」再打栈 —— 保证任何时候都有可读的报错。
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = {};
const rest = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    opt[argv[i].slice(2)] = argv[i + 1];
    i++;
  } else {
    rest.push(argv[i]);
  }
}

const errText = (e) => String((e && (e.stack || e.message)) || e);

async function main() {
  let comp = opt.comp;
  let outDir = opt.out;
  let plan = [];
  if (opt.plan) {
    // 清单是 film.py 写的，但可能被人用 Set-Content 存过一遍（带 BOM）；JSON.parse 见 BOM 会抛，先剥掉
    let raw;
    try {
      raw = fs.readFileSync(opt.plan, 'utf8').replace(/^\uFEFF/, '');
    } catch (e) {
      throw new Error(`读不到清单 ${opt.plan}：${errText(e)}`);
    }
    try {
      plan = JSON.parse(raw);
    } catch (e) {
      throw new Error(`清单 ${opt.plan} 不是合法 JSON：${errText(e)}`);
    }
  } else {
    // 老写法：stills.mjs <合成名> <目录> <秒> <秒> ...
    comp = rest[0];
    outDir = rest[1];
    plan = rest.slice(2).map((s) => ({sec: Number(s), name: `${comp}_${String(Number(s).toFixed(2)).padStart(7, '0')}.png`}));
  }
  if (!comp || !outDir || !plan.length) {
    console.error('用法：node scripts/stills.mjs --comp <合成名> --out <目录> --plan <清单.json>  或  node scripts/stills.mjs <合成名> <目录> <秒> ...');
    process.exit(1);
  }

  const browserExecutable = process.env.FILM_BROWSER || undefined;
  const browserOpts = browserExecutable ? {browserExecutable} : {};
  fs.mkdirSync(outDir, {recursive: true});
  console.log(`打包 Remotion 工程（${plan.length} 张待渲）…`);
  const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), onProgress: () => undefined});
  const composition = await selectComposition({serveUrl, id: comp, ...browserOpts, chromiumOptions: {gl: 'angle'}});
  const total = composition.durationInFrames;
  const t0 = Date.now();
  const failed = [];
  // 画面代码在浏览器里打的提醒（「[镜头包] …」「[积木] …」：参数越界、文字放不下之类）收回来，最后一起打。
  // 不收的话它们只在浏览器控制台里，抽帧的人永远看不到。
  const hints = new Map();
  const onBrowserLog = (log) => {
    const msg = String(log.text ?? '');
    if (/^\[(镜头包|积木)\]/.test(msg)) hints.set(msg, (hints.get(msg) ?? 0) + 1);
  };
  for (const item of plan) {
    const sec = Number(item.sec);
    if (!Number.isFinite(sec)) {
      failed.push({sec: item.sec, name: item.name, msg: '秒数不是数字'});
      console.error('FAIL', item.sec, '秒数不是数字，跳过');
      continue;
    }
    const name = item.name || `${comp}_${String(sec.toFixed(2)).padStart(7, '0')}.png`;
    const frame = Math.max(0, Math.min(total - 1, Math.round(sec * composition.fps)));
    const output = path.join(outDir, String(name));
    // 单帧重试一次：机器很紧时偶尔会等 React 渲染超时（"timeout 33000ms exceeded"）。
    let done = false;
    let lastErr = '';
    for (let attempt = 0; attempt < 2 && !done; attempt++) {
      try {
        await renderStill({
          composition,
          serveUrl,
          frame,
          output,
          ...browserOpts,
          chromiumOptions: {gl: 'angle'},
          scale: 1,
          timeoutInMilliseconds: 60000,
          onBrowserLog,
        });
        done = true;
      } catch (e) {
        lastErr = errText(e);
        if (attempt === 0) console.log(`${sec}s 这一帧失败，重试一次：${lastErr.slice(0, 160)}`);
      }
    }
    if (done) {
      console.log('ok', sec, '→', output);
    } else {
      // 不 throw：一张坏帧不该带走整批。记下来，最后一起报。
      failed.push({sec, name, msg: lastErr.slice(0, 500)});
      console.error(`FAIL ${sec}s → ${name}`);
      console.error(lastErr);
    }
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (hints.size) {
    console.log(`画面代码的提醒（${hints.size} 条，改完再往下做）：`);
    for (const m of hints.keys()) console.log(`  ! ${m}`);
  }
  if (failed.length) {
    console.log(`出图 ${plan.length - failed.length}/${plan.length} 张，失败 ${failed.length} 张（渲染 ${dt}s）`);
    console.error(`✗ ${failed.length} 张没出图（渲染 ${dt}s）：`);
    for (const f of failed) console.error(`  - ${f.sec}s  ${f.name}  ${f.msg}`);
    process.exit(3);
  }
  console.log(`出图 ${plan.length}/${plan.length} 张（渲染 ${dt}s）`);
  process.exit(0);
}

try {
  await main();
} catch (e) {
  console.error('✗ 抽帧失败：', errText(e));
  process.exit(1);
}
