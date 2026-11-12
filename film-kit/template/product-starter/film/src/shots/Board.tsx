// 镜头 1（第 0–8 拍）：看板。从左侧斜看四枚指标卡，数字从 0 滚到位。
// 证明什么：数字是实时的。主角：上排左边两枚指标卡。动作演的是「统计」。
import React from 'react';
import type {Ev} from '../kit/sfx';
import {B, Roll, Take, creep, defineShot, el, rollSfx, shot, union} from '../cine';
import {PAGE, T} from './common';

const P = PAGE.board;
const hero = union(el(P, 'kpis', 0), el(P, 'kpis', 1));
const ROLL = {at: B(1)};

const C: React.FC<{t: number}> = ({t}) => (
  <Take
    t={t}
    theme={T}
    page={P}
    plate="novalues"
    cam={creep(shot('fromLeft', {look: hero, fill: 0.5, at: [0.3, 0.48]}), t, B(0), B(8))}
    hero={hero}
    focus={el(P, 'kpis', 0)}
    aperture={0.3}
    say={{t0: B(2), layout: 'right', lines: ['每一件货，', '都有去处。']}}
    label={{index: '01', text: 'BOARD', corner: 'tr', t0: B(0) + 0.3}}
  >
    {P.elements.values.map((v, i) => (
      <Roll key={i} t={t} at={ROLL.at + i * 0.1} target={v} />
    ))}
  </Take>
);

const sfx = (): Ev[] => rollSfx(ROLL);

export const Board = defineShot({id: 'board', from: B(0), to: B(8), C, sfx});
