// 镜头 3（第 16–28 拍）：落款。图标在第 17 拍撑开，字标、标语、网址依次落定，然后静止到片尾。
// 没有接上一个镜头的小徽标（mark）时，t0 紧跟着这个镜头的 from（晚一拍以内），不要让画面空着等。
import React from 'react';
import type {Ev} from '../kit/sfx';
import {B, Lockup, defineShot, lockupSfx} from '../cine';
import {T} from './common';

const LOCK = {t0: B(17)};

const C: React.FC<{t: number}> = ({t}) => (
  <Lockup t={t} {...LOCK} end={B(28)} theme={T} icon="cine-demo/icon.png" word="Cangku" line="每一件货，*都有去处*。" url="example.com" note="示例落款" />
);

const sfx = (): Ev[] => lockupSfx(LOCK);

export const End = defineShot({id: 'end', from: B(16), to: B(28), C, sfx, enter: 'push'});
