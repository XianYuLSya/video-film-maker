// 导出音效清单：把画面代码里登记的每一条音效（时刻、种类、音量）打成 JSON，
// 交给 vo/sfx.py 混成音效轨 —— 不用逐帧渲染声音，几秒钟就好。
//
// 用法：node scripts/sfxlist.mjs --comp SfxList --out <路径.json>
//      （不传 --out 就写到 build/sfx_events_<comp>.json 同级，方便手工试）
import {bundle} from '@remotion/bundler';
import {selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    opt[argv[i].slice(2)] = argv[i + 1];
    i++;
  }
}
const comp = opt.comp || 'SfxList';
const out = opt.out || 'out/sfx_events.json';
const browserExecutable = process.env.FILM_BROWSER || undefined;
const browserOpts = browserExecutable ? {browserExecutable} : {};

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), onProgress: () => undefined});
const composition = await selectComposition({
  serveUrl,
  id: comp,
  inputProps: {events: []},
  ...browserOpts,
  chromiumOptions: {gl: 'angle'},
});
fs.mkdirSync(path.dirname(path.resolve(out)), {recursive: true});
const events = composition.props.events ?? [];
fs.writeFileSync(out, JSON.stringify(events, null, 1), 'utf8');
console.log('音效清单', comp, '→', out, events.length, '条');
if (!events.length) {
  console.log('注意：这条清单是空的。检查 Film.tsx 的 allSfx()/shortSfx() 有没有把场景的 sfx() 合起来。');
}
