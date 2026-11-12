// 一个标准镜头：一块屏 + 一个主角 + 最多一句大字。八成的镜头用它就够了，放上去就对。
//
// 它替你做的事：舞台、屏、景深、收尾层按对的顺序叠好；焦点和主光默认对着主角；
// 并且检查几件最容易出错的事（越界只提醒，不拦你）：
//   - 主角有没有跑到画面外、是不是太小（缩到手机上认不出）
//   - 大字有没有压在主角上
// 需要多块屏、亮场、字里透界面、落款时不用它，直接用 Stage / Screen / Lens / TypeWindow / Pages / Lockup 自己叠。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {H, W} from '../lib/time';
import {Pose, Rect, projectRect} from './cam';
import {Lens} from './Lens';
import {warn} from './motion';
import {CapPage, Screen, ScreenLight} from './Screen';
import {Finish, Stage, StageProps} from './Stage';
import {Label, LabelProps, Statement, StatementProps, statementBox} from './Type';
import {CineTheme} from './theme';

export type TakeProps = {
  t: number;
  theme: CineTheme;
  page: CapPage;
  plate?: string;
  /** 机位：shot(...) 的结果，或 track(...) 走出来的 */
  cam: Pose;
  /** 主角：界面上的哪一块（el(...) 或 union(...)）。焦点、主光都对着它 */
  hero: Rect;
  /** 主角离屏面的高度（它是悬着的元素时传 floatHeight(...)） */
  heroLift?: number;
  /** 焦点对在哪：默认就是主角。主角是并排的几块、想让其中一块最清楚时单独指定 */
  focus?: Rect;
  /** 大字陈述（不写就没有） */
  say?: Omit<StatementProps, 't' | 'theme' | 'env'>;
  /** 小标 */
  label?: Omit<LabelProps, 't' | 'theme' | 'env' | 't0'> & {t0?: number};
  /** 光圈 0–1（默认 0.5）和视线聚拢 0–1（默认 0.25） */
  aperture?: number;
  spot?: number;
  exposure?: number;
  /** 屏上的受光面：默认打在主角上，这里只调强弱和大小 */
  light?: Pick<ScreenLight, 'k' | 'r'> & {x?: number; y?: number};
  sheen?: number;
  stage?: Pick<StageProps, 'keyAt' | 'key' | 'bounce' | 'floor'>;
  /** 画在截图上、被屏裁住的东西（PlateFade） */
  inside?: React.ReactNode;
  /** 屏上的戏（Float、Fill、Ring、Scan…），页面坐标 */
  children?: React.ReactNode;
  /** 画面层的其他东西（画面坐标），画在大字之上、收尾层之下 */
  over?: React.ReactNode;
};

const overlap = (a: Rect, b: Rect) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

export const Take: React.FC<TakeProps> = ({t, theme, page, plate, cam, hero, heroLift = 0, focus, say, label, aperture = 0.5, spot = 0.25, exposure, light, sheen, stage, inside, children, over}) => {
  const who = `Take(${page.id})`;
  const hr = projectRect(cam, hero, heroLift);
  const frame = {x: 0, y: 0, w: W, h: H};
  const seen = overlap(hr, frame) / Math.max(1, hr.w * hr.h);
  if (seen < 0.6) warn(who, `主角只有 ${Math.round(seen * 100)}% 在画面里。检查机位的 look / at，或者 hero 写的是不是镜头看的那一块`);
  else if (hr.w < W * 0.1 && hr.h < H * 0.1) warn(who, `主角在画面上只有 ${Math.round(hr.w)}×${Math.round(hr.h)} 像素，缩到手机上认不出来。把机位的 fill 调大`);
  if (say && (say.t1 === undefined ? t >= say.t0 : t >= say.t0 && t < say.t1)) {
    const box = statementBox(say.layout ?? 'left', say.lines, say.size ?? 'l', say.sub);
    const hit = overlap(box, hr) / Math.max(1, Math.min(box.w * box.h, hr.w * hr.h));
    if (hit > 0.12) warn(who, `大字（${say.layout ?? 'left'}）压在主角上了。把主角挪到另一边（机位的 at），或者换一个版位`);
  }
  return (
    <AbsoluteFill>
      <Stage theme={theme} {...stage} />
      <Lens pose={cam} focus={focus ?? hero} lift={heroLift} aperture={aperture} spot={spot}>
        <Screen page={page} plate={plate} pose={cam} theme={theme} exposure={exposure} sheen={sheen} inside={inside} light={{x: light?.x ?? hero.x + hero.w / 2, y: light?.y ?? hero.y + hero.h / 2, k: light?.k ?? 1.2, r: light?.r}}>
          {children}
        </Screen>
      </Lens>
      {say && <Statement t={t} theme={theme} {...say} />}
      {label && <Label t={t} theme={theme} t0={label.t0 ?? (say ? say.t0 - 0.2 : 0)} {...label} />}
      {over}
      <Finish theme={theme} />
    </AbsoluteFill>
  );
};
