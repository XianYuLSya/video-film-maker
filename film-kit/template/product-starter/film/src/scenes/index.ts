import type {Scene} from './common';
import {FilmScene} from './Film';

export type {Scene};

// 产品片整部是一卷（一个整屏自管的场景），镜头在 shots\ 里。
export const SCENES: Scene[] = [FilmScene];
