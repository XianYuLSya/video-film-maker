// 整部片子是一卷：镜头按拍号接起来。每个镜头的起止、怎么进来，写在各自的文件里（shots\），这里只排顺序。
import React from 'react';
import {Reel, ReelShot, reelSfx} from '../cine';
import {TOTAL} from '../lib/time';
import {Board} from '../shots/Board';
import {End} from '../shots/End';
import {Form} from '../shots/Form';
import type {Scene} from './common';

export const SHOTS: ReelShot[] = [Board, Form, End];

export const FilmScene: Scene = {
  id: 'film',
  range: () => [0, TOTAL() + 1] as const,
  C: ({t}) => <Reel t={t} shots={SHOTS} />,
  sfx: () => reelSfx(SHOTS),
  bare: true, // 整屏自管：外壳不画纸底和字幕条
};
