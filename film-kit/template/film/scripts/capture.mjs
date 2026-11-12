// 截界面：把一个网页产品的真实界面截成「电影感产品片」要用的素材。
//
//   node film/scripts/capture.mjs <截图清单.json> [只截的页面id,逗号隔开]
//
// 一份清单出四样东西（都写到清单里 out 指的目录，默认 film/public/cap/）：
//   1. 整页高倍纹理      <页>.png            —— 放进三维舞台的那块「屏」
//   2. 底板              <页>@<底板名>.png   —— 把要做动画的元素藏掉后再截一张（元素离面、数字滚动时垫在下面）
//   3. 元素抠图（透明底） <页>.<键>.<序号>.png —— 能单独浮起来、飞进来的那一块
//   4. 坐标表            film/src/cap.json   —— 每个元素在页面里的位置、文字、字体、颜色；外加从界面取的色板
// 另外在清单旁边写一份「截图核对清单.md」：每页的全部可见文字 + 自动标出的可疑内容（IP、端口、邮箱、网址、禁用词）。
// **截完必须打开每张图肉眼看一遍**：假数据最容易在下拉框、提示文字里露馅，工具只能替你标出最常见的几类。
//
// 不依赖任何 npm 包：直接用本机已有的 chrome-headless-shell（和渲染用的是同一个）走调试协议。
// 浏览器从哪找：环境变量 FILM_BROWSER → 清单里的 browser → Remotion 下载的那个 → 本机片场共用的那个。
//
// 清单格式见 cine/手册.md「截界面」一节；最小例子：
// {
//   "entry": "ui/web/index.html",            // 本地网页入口（相对清单所在目录），或 "url": "http://127.0.0.1:5173/"
//   "inject": ["ui/demo-data.js"],           // 页面加载前注入的演示数据脚本（假后端 / 假接口）
//   "viewport": {"width": 1240, "height": 780},
//   "scale": 3,                              // 纹理倍率，三维镜头推近后字不糊就靠它；不要低于 2
//   "pages": [{
//     "id": "account",
//     "steps": [{"click": "#navAccount"}, {"wait": 600}],
//     "elements": {"rows": ".account-row", "chips": ".env-chip"},
//     "plates": [{"id": "empty", "hide": [".account-row-copy"]}],
//     "cutouts": [{"key": "chip", "sel": ".env-chip", "pad": 4}]
//   }]
// }
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// 浏览器从哪找（按顺序）：环境变量 FILM_BROWSER → 清单里的 browser → Remotion 自己下载到 node_modules/.remotion 的那个
// → 片场本机配置 kit.local.json 的 browser（和 vo/common.py 的 browser_exe 读的是同一项）。
const kitLocalBrowser = () => {
  // 作品的 film\node_modules 是指到片场 node_modules 的目录联接；模板在片场里，往上两层就是片场根
  const here = path.dirname(fileURLToPath(import.meta.url));
  const roots = [];
  try {
    roots.push(path.dirname(fs.realpathSync(path.join(here, '..', 'node_modules'))));
  } catch {}
  roots.push(path.join(here, '..', '..', '..'));
  for (const r of roots) {
    const f = path.join(r, 'kit.local.json');
    if (!fs.existsSync(f)) continue;
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')).browser || '';
    } catch {
      return '';
    }
  }
  return '';
};
const LOCAL_SHARED_BROWSER = kitLocalBrowser();
const findRemotionBrowser = () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(here, '..', 'node_modules', '.remotion', 'chrome-headless-shell');
  if (!fs.existsSync(root)) return '';
  const walk = (dir, depth) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (/^chrome-headless-shell(\.exe)?$/.test(name) && fs.statSync(full).isFile()) return full;
      if (depth < 3 && fs.statSync(full).isDirectory()) {
        const hit = walk(full, depth + 1);
        if (hit) return hit;
      }
    }
    return '';
  };
  return walk(root, 0);
};

const die = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (v) => Math.round(v * 10) / 10;

// ---------- 读清单 ----------
const planPath = process.argv[2];
if (!planPath) die('用法：node film/scripts/capture.mjs <截图清单.json> [只截的页面id,逗号隔开]');
const only = process.argv[3] ? process.argv[3].split(',') : null;
let plan;
try {
  plan = JSON.parse(fs.readFileSync(planPath, 'utf8').replace(/^\uFEFF/, ''));
} catch (e) {
  die(`读不了清单 ${planPath}：${e.message}`);
}
const base = path.dirname(path.resolve(planPath));
const rel = (p) => (path.isAbsolute(p) ? p : path.resolve(base, p));
const outDir = rel(plan.out || 'film/public/cap');
const metaPath = rel(plan.meta || 'film/src/cap.json');
const scale = Number(plan.scale ?? 3);
const cutScale = Number(plan.cutScale ?? Math.max(scale, 4));
if (!(scale >= 2)) console.warn(`! scale=${scale} 太低：三维镜头推近后界面文字会糊，至少 2，推荐 3`);
const VP = {width: 1280, height: 800, ...(plan.viewport || {})};
const settle = Number(plan.settle ?? 1500);
const entryUrl = plan.url || (plan.entry ? pathToFileURL(rel(plan.entry)).href : null);
if (!entryUrl) die('清单里要有 entry（本地网页入口）或 url');
if (!Array.isArray(plan.pages) || !plan.pages.length) die('清单里没有 pages');
fs.mkdirSync(outDir, {recursive: true});
// 场景里用 staticFile('<dir>/<文件>') 取图，dir 是 out 相对 public 目录的那一段
const outParts = outDir.split(path.sep).flatMap((s) => s.split('/'));
const pubAt = outParts.lastIndexOf('public');
if (pubAt < 0) die(`out 必须在某个 public 目录里面（Remotion 只认 public 下的素材），现在是 ${outDir}`);
const dir = outParts.slice(pubAt + 1).join('/');

// ---------- 浏览器（调试协议，不用 puppeteer） ----------
const browserExe = [process.env.FILM_BROWSER, plan.browser, findRemotionBrowser(), LOCAL_SHARED_BROWSER].find((p) => p && fs.existsSync(p));
if (!browserExe) die('找不到 chrome-headless-shell：设环境变量 FILM_BROWSER 指到它，或在清单里写 browser（渲染用的那个浏览器就行）');
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cine-cap-'));
const chrome = spawn(
  browserExe,
  [
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-color-profile=srgb',
    '--font-render-hinting=none',
    '--disable-background-networking',
    'about:blank',
  ],
  {stdio: ['ignore', 'ignore', 'pipe']},
);
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const timer = setTimeout(() => reject(new Error('浏览器 15 秒内没有报出调试地址')), 15000);
  chrome.stderr.on('data', (d) => {
    buf += d.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) {
      clearTimeout(timer);
      resolve(m[1]);
    }
  });
  chrome.on('exit', (c) => reject(new Error(`浏览器提前退出（${c}）：${buf.slice(-300)}`)));
}).catch((e) => die(e.message));

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.addEventListener('open', res, {once: true});
  ws.addEventListener('error', () => rej(new Error('连不上浏览器调试口')), {once: true});
}).catch((e) => die(e.message));
let seq = 0;
const pending = new Map();
const listeners = new Set();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const {resolve, reject, method} = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
    else resolve(msg.result);
  } else if (msg.method) {
    for (const fn of listeners) fn(msg);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, {resolve, reject, method});
    ws.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
  });
const waitEvent = (name, sessionId, ms = 30000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      listeners.delete(fn);
      reject(new Error(`等 ${name} 超时`));
    }, ms);
    const fn = (msg) => {
      if (msg.method === name && (!sessionId || msg.sessionId === sessionId)) {
        clearTimeout(timer);
        listeners.delete(fn);
        resolve(msg.params);
      }
    };
    listeners.add(fn);
  });

// 页面加载前先放进去的小工具：演示数据脚本可以直接用 window.cap.*
//   cap.api(known, fallback)   假后端对象：known 里有的方法返回演示数据，没有的记进 cap.unknown 并返回 fallback
//   cap.fetch(routes)          假接口：路径包含某个键就返回那份 JSON，其余请求照常
//   cap.freezeTime(iso)        把 Date.now() 钉在一个时刻（「3 小时后重置」这类相对时间每次截都一样）
const PRELUDE = `(() => {
  const unknown = new Set();
  const api = (known, fallback) => new Proxy({}, {
    get: (_, name) => (typeof name !== 'string' || name === 'then') ? undefined : async (...args) => {
      if (Object.prototype.hasOwnProperty.call(known, name)) {
        const v = known[name];
        return typeof v === 'function' ? v(...args) : v;
      }
      unknown.add(name);
      return typeof fallback === 'function' ? fallback(name, args) : (fallback === undefined ? {ok: true} : fallback);
    },
  });
  const fakeFetch = (routes) => {
    const real = window.fetch ? window.fetch.bind(window) : null;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      for (const key of Object.keys(routes)) {
        if (url.includes(key)) {
          const v = routes[key];
          const body = typeof v === 'function' ? v(url, init) : v;
          return new Response(JSON.stringify(body), {status: 200, headers: {'Content-Type': 'application/json'}});
        }
      }
      unknown.add('fetch ' + url);
      if (real) return real(input, init);
      throw new Error('没有这条假接口：' + url);
    };
  };
  const freezeTime = (iso) => {
    const fixed = new Date(iso).getTime();
    const RealDate = Date;
    class FakeDate extends RealDate {
      constructor(...a) { if (a.length) super(...a); else super(fixed); }
      static now() { return fixed; }
    }
    window.Date = FakeDate;
  };
  window.cap = {api, fetch: fakeFetch, freezeTime, unknown};
})();`;

const FREEZE_CSS =
  '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' +
  '::-webkit-scrollbar{display:none!important}';

const injectSrc = (plan.inject || []).map((p) => fs.readFileSync(rel(p), 'utf8')).join('\n;\n');

const openPage = async (vp, dpr) => {
  const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
  const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable');
  await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', {width: vp.width, height: vp.height, deviceScaleFactor: dpr, mobile: false});
  await S('Page.addScriptToEvaluateOnNewDocument', {source: `${PRELUDE}\n;${injectSrc}`});
  const errors = [];
  const onMsg = (msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(((d.exception && d.exception.description) || d.text || '').split('\n')[0].slice(0, 200));
    }
  };
  listeners.add(onMsg);
  const loaded = waitEvent('Page.loadEventFired', sessionId);
  await S('Page.navigate', {url: entryUrl});
  await loaded;
  await sleep(settle);
  const ev = async (expr, arg) => {
    const expression = arg === undefined ? `(${expr})()` : `(${expr})(${JSON.stringify(arg)})`;
    const r = await S('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(((d.exception && d.exception.description) || d.text || '页面里执行脚本失败').split('\n')[0]);
    }
    return r.result.value;
  };
  const addCss = (css) =>
    ev(
      (c) => {
        const s = document.createElement('style');
        s.setAttribute('data-cap', '1');
        s.textContent = c;
        document.head.appendChild(s);
        window.__capCss = (window.__capCss || 0) + 1;
        s.dataset.capId = String(window.__capCss);
        return s.dataset.capId;
      },
      css,
    );
  const dropCss = (id) => ev((i) => document.querySelector(`style[data-cap-id="${i}"]`)?.remove(), id);
  const shot = async (file, {clip, transparent} = {}) => {
    if (transparent) await S('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}});
    const params = {format: 'png', captureBeyondViewport: false};
    if (clip) params.clip = {...clip, scale: 1};
    const {data} = await S('Page.captureScreenshot', params);
    if (transparent) await S('Emulation.setDefaultBackgroundColorOverride', {});
    fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'));
  };
  const setDpr = (d, v = vp) => S('Emulation.setDeviceMetricsOverride', {width: v.width, height: v.height, deviceScaleFactor: d, mobile: false});
  const close = async () => {
    listeners.delete(onMsg);
    await send('Target.closeTarget', {targetId});
  };
  await addCss(FREEZE_CSS + (plan.css || ''));
  await ev(() => document.fonts.ready.then(() => true));
  return {ev, addCss, dropCss, shot, setDpr, close, errors};
};

// ---------- 页面里跑的函数（都会被序列化后送进页面） ----------
const stepInPage = (st) => {
  const q = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error('找不到元素 ' + sel);
    return el;
  };
  const fire = (el, type) => el.dispatchEvent(new Event(type, {bubbles: true}));
  if (st.click) q(st.click).click();
  else if (st.fill) {
    const el = q(st.fill.sel);
    el.value = st.fill.value;
    if (!st.fill.silent) {
      fire(el, 'input');
      fire(el, 'change');
    }
  } else if (st.select) {
    const el = q(st.select.sel);
    const want = String(st.select.value);
    const i = [...el.options].findIndex((o) => o.value === want || o.textContent.trim() === want);
    if (i < 0) throw new Error(`下拉框 ${st.select.sel} 里没有「${want}」，现有：${[...el.options].map((o) => o.textContent.trim()).join(' / ')}`);
    el.selectedIndex = i;
    if (!st.select.silent) fire(el, 'change');
  } else if (st.text) q(st.text.sel).textContent = st.text.value;
  else if (st.scroll) {
    const el = st.scroll.sel ? q(st.scroll.sel) : document.scrollingElement;
    el.scrollTop = st.scroll.top || 0;
  } else if (st.eval) return (0, eval)(st.eval);
  return true;
};

const measureInPage = (map) => {
  const hex = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    const a = p.length > 3 ? p[3] : 1;
    return a < 1 ? `rgba(${p[0]},${p[1]},${p[2]},${a})` : `#${h(p[0])}${h(p[1])}${h(p[2])}`;
  };
  const out = {};
  for (const [key, sel] of Object.entries(map)) {
    out[key] = [...document.querySelectorAll(sel)]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      })
      .map((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const text = (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' ? e.value : e.tagName === 'SELECT' ? (e.selectedOptions[0]?.textContent ?? '') : e.innerText || '').trim().slice(0, 80);
        return {
          x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          text,
          fontSize: parseFloat(cs.fontSize), fontWeight: cs.fontWeight, fontFamily: cs.fontFamily,
          letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight,
          color: hex(cs.color), bg: hex(cs.backgroundColor), radius: parseFloat(cs.borderTopLeftRadius) || 0,
          padL: parseFloat(cs.paddingLeft) || 0, padT: parseFloat(cs.paddingTop) || 0,
        };
      });
  }
  return out;
};

const paletteInPage = (spec) => {
  const hex = (c) => {
    const s = String(c).trim();
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return s;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    const h = (v) => Math.round(v).toString(16).padStart(2, '0');
    return `#${h(p[0])}${h(p[1])}${h(p[2])}`;
  };
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const out = {};
  for (const [name, src] of Object.entries(spec)) {
    if (src.startsWith('var:')) {
      // 用一个临时元素把变量解析成最终颜色（变量里可能还套着别的变量、color-mix）
      probe.style.color = `var(${src.slice(4)})`;
      out[name] = hex(getComputedStyle(probe).color);
    } else {
      const [sel, prop] = src.split('|');
      const el = document.querySelector(sel);
      out[name] = el ? hex(getComputedStyle(el).getPropertyValue(prop || 'background-color')) : null;
    }
  }
  probe.remove();
  return out;
};

const contentInPage = () => {
  let right = 0;
  let bottom = 0;
  for (const e of document.body.querySelectorAll('*')) {
    if (e.children.length) continue;
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }
  return {right: Math.round(right), bottom: Math.round(bottom), text: document.body.innerText};
};

const markCutInPage = ({sel, index}) => {
  const all = [...document.querySelectorAll(sel)].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  document.querySelectorAll('.__capKeep').forEach((e) => e.classList.remove('__capKeep'));
  if (index === -1) return all.length;
  const el = all[index];
  if (!el) return null;
  el.classList.add('__capKeep');
  const r = el.getBoundingClientRect();
  return {x: r.x, y: r.y, w: r.width, h: r.height, text: (el.innerText || '').trim().slice(0, 80)};
};
// 抠图：根元素设成不可见（可见性会往下继承），只把目标元素放开，再用透明底截。
// 不能写成「* 全部隐藏」：图标常用 <use> 引用别处的符号，那样会把符号本体也藏掉，抠出来的图标是空的。
const CUT_CSS = 'html{visibility:hidden!important}html,body{background:transparent!important}.__capKeep{visibility:visible!important}';

// ---------- 可疑内容 ----------
const scanText = (text) => {
  const hits = [];
  const allowMail = new Set((plan.allowEmails || []).map((s) => s.toLowerCase()));
  const add = (kind, list) => {
    for (const v of new Set(list)) hits.push(`${kind}：${v}`);
  };
  add('IP 地址', text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []);
  add('端口', text.match(/(?:localhost|[\w.-]+\.\w{2,}|\d{1,3}(?:\.\d{1,3}){3}):\d{2,5}\b/g) || []);
  add('邮箱', (text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).filter((m) => !allowMail.has(m.toLowerCase())));
  add('网址', (text.match(/https?:\/\/[^\s"'）)]+/g) || []).filter((u) => !(plan.allowUrls || []).some((a) => u.includes(a))));
  add('疑似密钥', text.match(/\b(?:sk|pk|ghp|xox[bap])[-_][A-Za-z0-9_-]{12,}\b/g) || []);
  for (const w of plan.forbid || []) if (text.toLowerCase().includes(String(w).toLowerCase())) hits.push(`禁用词：${w}`);
  return hits;
};

// ---------- 逐页截 ----------
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8').replace(/^\uFEFF/, '')) : {};
meta.pages = meta.pages || {};
const checkLines = ['# 截图核对清单', '', '每张图打开看一遍：假数据有没有露馅、有没有真实账号 / IP / 端口 / 第三方软件名。', ''];
let failed = 0;
let flagged = 0;

for (const pg of plan.pages) {
  if (only && !only.includes(pg.id)) continue;
  const vp = {...VP, ...(pg.viewport || {})};
  const dpr = Number(pg.scale ?? scale);
  let page;
  try {
    page = await openPage(vp, dpr);
    for (const st of pg.steps || []) {
      if (st.wait) await sleep(st.wait);
      else if (st.css) await page.addCss(st.css);
      else await page.ev(stepInPage, st);
    }
    await page.addCss(FREEZE_CSS);
    await sleep(pg.settle ?? 300);

    const files = {full: `${pg.id}.png`};
    await page.shot(files.full);
    const info = await page.ev(contentInPage);
    const elements = pg.elements ? await page.ev(measureInPage, pg.elements) : {};
    for (const [k, list] of Object.entries(elements)) if (!list.length) console.warn(`  ! ${pg.id}：elements.${k} 一个也没匹配到`);

    // 底板
    const plates = {};
    for (const pl of pg.plates || []) {
      const id = await page.addCss((pl.hide || []).map((s) => `${s}{visibility:hidden!important}`).join('') + (pl.css || ''));
      const file = `${pg.id}@${pl.id}.png`;
      await page.shot(file);
      await page.dropCss(id);
      plates[pl.id] = file;
    }

    // 抠图（可用更高倍率）
    const cuts = {};
    if ((pg.cutouts || []).length) {
      const cs = Number(pg.cutScale ?? cutScale);
      if (cs !== dpr) await page.setDpr(cs, vp);
      for (const c of pg.cutouts) {
        const pad = c.pad ?? 6;
        const n = await page.ev(markCutInPage, {sel: c.sel, index: -1});
        const idxs = c.index !== undefined ? [].concat(c.index) : [...Array(n).keys()];
        if (!idxs.length) console.warn(`  ! ${pg.id}：cutouts.${c.key}（${c.sel}）一个也没匹配到`);
        cuts[c.key] = [];
        for (const i of idxs) {
          const r = await page.ev(markCutInPage, {sel: c.sel, index: i});
          if (!r) {
            console.warn(`  ! ${pg.id}：cutouts.${c.key} 第 ${i} 个不存在`);
            continue;
          }
          const cssId = await page.addCss(CUT_CSS);
          const file = `${pg.id}.${c.key}.${i}.png`;
          const clip = {x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + pad * 2, height: r.h + pad * 2};
          await page.shot(file, {clip, transparent: true});
          await page.dropCss(cssId);
          cuts[c.key].push({file, x: r1(clip.x), y: r1(clip.y), w: r1(clip.width), h: r1(clip.height), text: r.text, scale: cs});
        }
      }
      await page.ev(markCutInPage, {sel: 'html', index: -1});
      if (cs !== dpr) await page.setDpr(dpr, vp);
    }

    const unknown = await page.ev(() => (window.cap ? [...window.cap.unknown] : []));
    meta.pages[pg.id] = {id: pg.id, dir, w: vp.width, h: vp.height, scale: dpr, file: files.full, plates, elements, cuts};

    // 体检：视口是不是比内容宽太多、可疑文字、页面报错、没接上的后端方法
    const hits = scanText(info.text);
    flagged += hits.length;
    const spare = vp.width - info.right;
    checkLines.push(`## ${pg.id}　${files.full}（${vp.width}×${vp.height} @${dpr}x）`, '');
    if (spare > vp.width * 0.18) {
      const tip = `内容只到 x=${info.right}，右边空了 ${spare}px：三维镜头里会有半边空屏，建议把这一页 viewport.width 收到 ${info.right + 40} 左右`;
      console.warn(`  ! ${pg.id}：${tip}`);
      checkLines.push(`- ⚠ ${tip}`);
    }
    for (const h of hits) checkLines.push(`- ⚠ 可疑内容 ${h}`);
    if (page.errors.length) checkLines.push(`- 页面脚本报错：${[...new Set(page.errors)].slice(0, 6).join('；')}`);
    if (unknown.length) checkLines.push(`- 演示数据没接上、用默认值顶替的后端方法：${unknown.join('、')}`);
    checkLines.push('', '可见文字：', '', '```', info.text.replace(/\n{2,}/g, '\n').trim(), '```', '');
    console.log(`ok ${pg.id}  整页 1 张 · 底板 ${Object.keys(plates).length} 张 · 抠图 ${Object.values(cuts).reduce((a, l) => a + l.length, 0)} 张${hits.length ? ` · 可疑内容 ${hits.length} 处` : ''}${unknown.length ? ` · 没接上的后端方法 ${unknown.length} 个` : ''}`);

    // 色板只取一次（第一页，或指定 palettePage 的那页）
    if (plan.palette && (!meta.palette || plan.palettePage === pg.id || (!plan.palettePage && pg === plan.pages[0]))) {
      meta.palette = await page.ev(paletteInPage, plan.palette);
    }
  } catch (e) {
    failed++;
    console.error(`FAIL ${pg.id}：${e.message}`);
    checkLines.push(`## ${pg.id}　失败：${e.message}`, '');
  } finally {
    if (page) await page.close().catch(() => undefined);
  }
}

fs.mkdirSync(path.dirname(metaPath), {recursive: true});
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));
const checkPath = path.join(base, '截图核对清单.md');
fs.writeFileSync(checkPath, checkLines.join('\n'));
console.log(`坐标表 → ${metaPath}`);
console.log(`核对清单 → ${checkPath}${flagged ? `（自动标出 ${flagged} 处可疑内容，先看这些）` : ''}`);
console.log('下一步：把每张图打开看一遍，再开始写镜头。');

ws.close();
chrome.kill();
await sleep(300);
try {
  fs.rmSync(profileDir, {recursive: true, force: true});
} catch {
  /* 临时目录删不掉不影响结果 */
}
process.exit(failed ? 3 : 0);
