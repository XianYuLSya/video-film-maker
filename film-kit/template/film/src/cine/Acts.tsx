// 元素级的戏：让界面上的某个元素自己演。全部放在 <Screen> 里面，用页面坐标。
// 动作本身就是论点——东西落回槽位、选中亮一圈、按钮被按下，比任何一句旁白都直接。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp} from '../lib/anim';
import {Rect} from './cam';
import {flash, go, press, run, safe} from './motion';
import {lightGradient, useScreen} from './Screen';
import {alpha, luma} from './theme';

/** 选中环：元素被选中、被点亮的那一圈产品色。t0 亮起，之后留一圈淡的（keep） */
export const Ring: React.FC<{t: number; t0: number; rect: Rect; radius?: number; color?: string; keep?: number}> = ({t, t0, rect, radius = 9, color, keep = 0.5}) => {
  const {theme} = useScreen('Ring');
  if (t < t0) return null;
  const c = color ?? theme.accent;
  const p = run(t, t0, 0.35, 'settle');
  const glow = Math.max(clamp(keep), flash(t, t0, 0.08, 0.9));
  const pad = 3 + (1 - p) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x - pad,
        top: rect.y - pad,
        width: rect.w + pad * 2,
        height: rect.h + pad * 2,
        borderRadius: radius + pad,
        opacity: p,
        boxShadow: `0 0 0 1.6px ${alpha(c, 0.55 + 0.4 * glow)}, 0 0 ${10 + 14 * glow}px ${alpha(c, 0.18 + 0.3 * glow)}, inset 0 0 ${8 + 10 * glow}px ${alpha(c, 0.06 + 0.1 * glow)}`,
        pointerEvents: 'none',
      }}
    />
  );
};

/** 光标：从 from 滑到 to，在 clickAt 按下。坐标是页面 px（光标尖的位置） */
export const Pointer: React.FC<{t: number; t0: number; from: {x: number; y: number}; to: {x: number; y: number}; move?: number; clickAt?: number; size?: number}> = ({t, t0, from, to, move = 0.8, clickAt, size = 22}) => {
  useScreen('Pointer');
  if (t < t0 - 0.2) return null;
  const x = go(t, t0, t0 + move, from.x, to.x, 'glide');
  const y = go(t, t0, t0 + move, from.y, to.y, 'glide');
  const down = clickAt === undefined ? 0 : flash(t, clickAt - 0.06, 0.06, 0.16);
  const ripple = clickAt === undefined ? 0 : press(t - clickAt);
  return (
    <>
      {clickAt !== undefined && t >= clickAt && ripple < 0.995 && (
        <div style={{position: 'absolute', left: x - 18, top: y - 18, width: 36, height: 36, borderRadius: 18, border: '1.5px solid rgba(255,255,255,0.7)', opacity: 1 - ripple, transform: `translateZ(4px) scale(${0.4 + 0.9 * ripple})`}} />
      )}
      <svg width={size} height={size * 1.36} viewBox="0 0 22 30" style={{position: 'absolute', left: x, top: y, opacity: clamp((t - (t0 - 0.2)) / 0.2), transform: `translateZ(16px) scale(${1 - 0.1 * down})`, transformOrigin: '2px 2px', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.55))'}}>
        <path d="M2.2 1.8v21.6l5.3-5 3.7 8.6 3.6-1.6-3.7-8.4h7.3z" fill="#fff" stroke="#14171a" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** 按钮被按下：亮一下。盖在按钮原位 */
export const Press: React.FC<{t: number; at: number; rect: Rect; radius?: number}> = ({t, at, rect, radius = 8}) => {
  const {theme} = useScreen('Press');
  const k = flash(t, at, 0.06, 0.4);
  if (k <= 0.001) return null;
  return <div style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: radius, background: alpha('#ffffff', 0.24 * k), boxShadow: `0 0 ${26 * k}px ${alpha(theme.accent, 0.6 * k)}`, pointerEvents: 'none'}} />;
};

/** Float 在 t 时刻离屏面多高（页面 px）。给 <Lens lift> 用：主角悬着的时候焦点跟着它 */
export const floatHeight = (t: number, o: {land: number; fall?: number; height?: number}) => (1 - run(t, o.land - (o.fall ?? 0.62), o.fall ?? 0.62, 'fall')) * (o.height ?? 20);

/** 落位：元素先悬在界面上空，到点加速落回自己的槽位，落地的一瞬底边闪一道缝。
 *  「东西各就各位」就靠这个动作讲。要配一张把这些元素藏掉的底板（截图清单里的 plates）。
 *
 *  悬着的时候怎么让人看出它是悬着的：
 *    - 原位留一个虚线空槽（它要去的地方）；
 *    - 暗色界面上投影看不见，所以在槽位上铺一层它自己的柔光（像屏面被它照亮）；浅色界面改成投影；
 *    - 悬着的那块比屏面亮一档。
 *  贴面机位下，悬着的元素在画面上会往上移、盖住它上面那一行：所以上下紧挨的两行字
 *  抠成一整块（比如「名字 + 邮箱」），不要拆成两块先后落。 */
export const Float: React.FC<{
  t: number;
  /** 抠图记录：cut(page, key, i) */
  piece: {file: string; x: number; y: number; w: number; h: number};
  /** 落地的时刻；fall 是下落用时 */
  land: number;
  fall?: number;
  /** 悬浮高度（页面 px），8–48，默认 20。太低看不出悬着，太高落地像砸下来 */
  height?: number;
  /** 从什么时候开始出现（默认落地前 1.6 秒，从空中显形） */
  from?: number;
  /** 离开的时刻：到点离面飘走、淡掉（一组东西让位给另一组时用）。不写就一直留在原位 */
  leave?: number;
  /** 这一块是带底色的整块（一张卡、一整行）就写 true：槽位上画投影；不写就是文字、图标这类镂空的小件，槽位上画它自己的柔光 */
  solid?: boolean;
}> = ({t, piece, land, fall = 0.62, height = 20, from, leave, solid = false}) => {
  const {page, theme, exposure, light} = useScreen('Float');
  const start = from ?? land - 1.6;
  if (t < start) return null;
  const h = safe('Float', 'height', height, 8, 48);
  const shadow = solid || luma(theme.bg) > 0.5;
  const lift = 1 - run(t, land - fall, fall, 'fall'); // 1 = 悬着，0 = 落地
  const born = run(t, start, 0.35, 'ease') * (1 - (leave === undefined ? 0 : run(t, leave, 0.32, 'ease')));
  const gone = leave === undefined ? 0 : run(t, leave, 0.32, 'ease');
  if (gone >= 1) return null;
  const z = lift * h + gone * h * 2.6;
  const url = staticFile(`${page.dir}/${piece.file}`);
  const seam = flash(t, land, 0.05, 0.42);
  const seamW = run(t, land, 0.2, 'settle');
  const box: React.CSSProperties = {position: 'absolute', left: piece.x, top: piece.y, width: piece.w, height: piece.h};
  const up = `translateZ(${z.toFixed(3)}px)`;
  return (
    <>
      {lift > 0.02 && (
        <>
          <div style={{...box, left: piece.x + 3, top: piece.y + 3, width: piece.w - 6, height: piece.h - 6, borderRadius: 6, border: `1px dashed ${alpha(theme.accent, 0.5)}`, background: alpha(theme.accent, 0.045), opacity: born * clamp(lift * 3)}} />
          <Img
            src={url}
            style={{
              ...box,
              opacity: born * (shadow ? 0.62 : 0.4) * clamp(lift * 2.2),
              filter: shadow ? `brightness(0) blur(${(2 + z * 0.22).toFixed(2)}px)` : `brightness(1.8) saturate(1.3) blur(${(3 + z * 0.2).toFixed(2)}px)`,
              transform: shadow ? `translate(${(z * 0.1).toFixed(2)}px, ${(z * 0.2).toFixed(2)}px)` : undefined,
            }}
          />
        </>
      )}
      <Img src={url} style={{...box, opacity: born, transform: up, filter: `brightness(${(exposure * (1 + 0.2 * lift)).toFixed(3)}) contrast(1.06) saturate(1.12)`}} />
      {/* 和屏面受同一盏灯：把屏的受光面按这块的形状再盖一遍 */}
      {light.k > 0 && <div style={{...box, opacity: born, transform: up, background: lightGradient(light, piece.x, piece.y), WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%'}} />}
      {seam > 0.001 && (
        <div
          style={{
            position: 'absolute',
            left: piece.x + 4 + ((piece.w - 8) * (1 - seamW)) / 2,
            top: piece.y + piece.h - 4,
            width: (piece.w - 8) * seamW,
            height: 1.4,
            borderRadius: 1,
            opacity: seam,
            background: `linear-gradient(90deg, ${alpha(theme.accent, 0)}, ${theme.accent} 28%, ${theme.accentHi} 50%, ${theme.accent} 72%, ${alpha(theme.accent, 0)})`,
            boxShadow: `0 0 6px ${alpha(theme.accent, 0.7)}`,
          }}
        />
      )}
    </>
  );
};
