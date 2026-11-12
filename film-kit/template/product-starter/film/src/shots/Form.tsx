// 镜头 2（第 8–16 拍）：新建调拨单。从右侧斜看表单，打字、选中、按下。
// 证明什么：建一张单只要两步。主角：单名和目的仓两个输入框加按钮。动作演的是「设定」。
import React from 'react';
import type {Ev} from '../kit/sfx';
import {B, Fill, Pointer, Press, Ring, Take, defineShot, el, fillSfx, pressSfx, ringSfx, shot, union} from '../cine';
import {PAGE, T} from './common';

const P = PAGE.board;
const name = el(P, 'name');
const dest = el(P, 'dest');
const submit = el(P, 'submit');
const hero = union(name, dest, submit);

const TYPE = {at: B(9), text: '周末补货'};
const PICK = {at: B(11)};
const CLICK = {at: B(14)};

const C: React.FC<{t: number}> = ({t}) => (
  <Take
    t={t}
    theme={T}
    page={P}
    plate="blank"
    cam={shot('fromRight', {look: hero, fill: 0.36, at: [0.68, 0.5]})}
    hero={hero}
    say={{t0: B(9), layout: 'left', lines: ['起个名字，', '选一个目的仓。']}}
    label={{index: '02', text: 'TRANSFER', t0: B(8) + 0.3}}
  >
    <Fill t={t} target={name} {...TYPE} />
    <Fill t={t} target={dest} {...PICK} />
    <Ring t={t} t0={PICK.at} rect={dest} />
    <Press t={t} at={CLICK.at} rect={submit} />
    <Pointer t={t} t0={B(12)} from={{x: dest.x + 240, y: dest.y + 60}} to={{x: submit.x + 80, y: submit.y + 22}} clickAt={CLICK.at} />
  </Take>
);

const sfx = (): Ev[] => [...fillSfx(TYPE), ...fillSfx(PICK), ...ringSfx({t0: PICK.at}), ...pressSfx(CLICK)];

export const Form = defineShot({id: 'form', from: B(8), to: B(16), C, sfx, enter: 'whipLeft'});
