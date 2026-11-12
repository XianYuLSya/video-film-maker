import React, {useEffect} from 'react';

// 排版体检的探针：只在合成收到 inputProps.probe === true 时挂载（平常渲染完全不受影响）。
// 它不画任何东西，只做两件事：
//   1. 字体就绪后把页面上每一块「自己直接含文字」的元素量一遍（文字实际占的矩形、计算字号、
//      整条祖先链的透明度乘积、是否在 data-probe="skip" 里、是否属于字幕、最近一层 overflow 裁剪框），
//      拼成一行 console.log('PROBE:' + JSON)。
//   2. 把每个带 data-probe="skip" 的元素本身（模拟窗口的外框）量一遍，拼成一行
//      console.log('PROBE-BOX:' + JSON) —— 用来判「这个窗口有没有压到字幕区」。
//      压在里面的小字已经由 skip 豁免，窗口本身却需要单独盯：它一整块压到字幕上，
//      底下每行字都会被字幕盖住。
//   3. 这一刻是不是「整屏自管」的场景（Scene.bare）：外壳这时候不画字幕条，
//      所以再多打一行 console.log('PROBE-BARE:1')，让 scripts/probe.mjs 跳过
//      「压字幕」和「窗口压字幕条」两条规则的判断。
// 判规则在 scripts/probe.mjs 里做，阈值可以一处改。
//
// 注意：这里故意不用 delayRender/requestAnimationFrame —— 渲染器抓帧时 rAF 不一定跑，
// 卡住 delayRender 会把整次渲染挂死。帧是固定的，晚一点量到的还是这一帧的版面。

type ProbeNode = {
  kp: string; // 元素在 DOM 里的位置（0/2/1 这种），用来判「谁是谁的祖先」
  x: number;
  y: number;
  w: number;
  h: number;
  size: number; // 实际显示的字号（文字矩形高度 ÷ 行数）
  text: string;
  op: number; // 整条祖先链的透明度乘积
  skip: boolean; // 在 data-probe="skip" 里（模拟界面内部的小字不算）
  sub: boolean; // 属于字幕
  clip: {x: number; y: number; w: number; h: number} | null; // 最近一层裁剪祖先的可见范围
};

/** 一个模拟窗口的外框（带 data-probe="skip" 的元素本身） */
type ProbeBox = {
  kp: string; // 同 ProbeNode.kp：DOM 里的位置，同一窗口在各个时间点上是同一个值，用来合并成一条
  x: number;
  y: number;
  w: number;
  h: number;
  op: number; // 整条祖先链的透明度乘积
  label: string; // 给人看的名字（类名/标签），报错时写清是哪个窗口
};

const keyPathOf = (el: Element, root: Element): string => {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== root) {
    const parent: Element | null = cur.parentElement;
    if (!parent) break;
    parts.unshift(String(Array.prototype.indexOf.call(parent.children, cur)));
    cur = parent;
  }
  return parts.join('/');
};

const opacityChain = (el: Element): number => {
  let o = 1;
  let cur: Element | null = el;
  while (cur) {
    const st = getComputedStyle(cur);
    if (st.display === 'none' || st.visibility === 'hidden') return 0;
    o *= parseFloat(st.opacity || '1');
    cur = cur.parentElement;
  }
  return o;
};

const labelOf = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
  return cls.length ? `${tag}.${cls.join('.')}` : tag;
};

/** 每个 data-probe="skip" 元素本身的矩形（只取最外层：嵌套的 skip 不重复报） */
const collectBoxes = (): ProbeBox[] => {
  const out: ProbeBox[] = [];
  for (const el of Array.from(document.body.querySelectorAll('[data-probe="skip"]'))) {
    if (el.closest('[data-probe="skip"]') !== el) continue;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0.5 || r.height <= 0.5) continue;
    out.push({
      kp: keyPathOf(el, document.body),
      x: Math.round(r.left * 10) / 10,
      y: Math.round(r.top * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      op: Math.round(Math.min(1, opacityChain(el)) * 100) / 100,
      label: labelOf(el),
    });
  }
  return out;
};

const collect = (): ProbeNode[] => {
  const out: ProbeNode[] = [];
  const root = document.body;

  const keyPath = (el: Element): string => keyPathOf(el, root);

  const opacityOf = (el: Element): number => opacityChain(el);

  const clipOf = (el: Element) => {
    let cur: Element | null = el.parentElement;
    while (cur) {
      const st = getComputedStyle(cur);
      if (st.overflow !== 'visible' || st.overflowX !== 'visible' || st.overflowY !== 'visible') {
        const r = cur.getBoundingClientRect();
        return {x: r.left, y: r.top, w: r.width, h: r.height};
      }
      cur = cur.parentElement;
    }
    return null;
  };

  // 只量「自己直接含非空文字节点」的元素：一块文字只报一次，不会被父子层重复计
  const hasOwnText = (el: Element) => {
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim()) return true;
    }
    return false;
  };

  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (!hasOwnText(el)) continue;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const x = Math.min(...rects.map((r) => r.left));
    const y = Math.min(...rects.map((r) => r.top));
    const w = Math.max(...rects.map((r) => r.right)) - x;
    const h = Math.max(...rects.map((r) => r.bottom)) - y;
    const fs = parseFloat(st.fontSize || '16');
    const lh = parseFloat(st.lineHeight) || fs * 1.3;
    const lines = Math.max(1, Math.round(h / lh));
    out.push({
      kp: keyPath(el),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      w: Math.round(w * 10) / 10,
      h: Math.round(h * 10) / 10,
      size: Math.round((h / lines) * 10) / 10,
      text: (el.textContent ?? '').trim().slice(0, 30),
      op: Math.round(Math.min(1, opacityOf(el)) * 100) / 100,
      skip: !!el.closest('[data-probe="skip"]'),
      sub: !!el.closest('[data-probe="subtitle"]'),
      clip: clipOf(el),
    });
  }
  return out;
};

/** bare：这一刻是「整屏自管」的场景（Film.tsx 传进来），外壳没有字幕条。 */
export const Probe: React.FC<{bare?: boolean}> = ({bare = false}) => {
  useEffect(() => {
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      if (bare) console.log('PROBE-BARE:1');
      try {
        console.log('PROBE:' + JSON.stringify(collect()));
      } catch (e) {
        console.log('PROBE:[]');
        console.error('排版体检采样失败', e);
      }
      try {
        console.log('PROBE-BOX:' + JSON.stringify(collectBoxes()));
      } catch (e) {
        console.log('PROBE-BOX:[]');
        console.error('排版体检量窗口失败', e);
      }
    };
    const fonts = (document as unknown as {fonts?: {ready?: Promise<unknown>}}).fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => setTimeout(send, 30)).catch(send);
    } else {
      setTimeout(send, 30);
    }
    const guard = setTimeout(send, 1500); // 兜底：字体 never ready 也要把当前版面报回来
    return () => clearTimeout(guard);
  }, []);
  return null;
};
