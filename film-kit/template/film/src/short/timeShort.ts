// 竖屏短版的时间表读取层（timing_short.json 由 .\film.cmd voice short 生成）。
// 接口和 lib/time.ts 一样，只是读的是短版那份表；找不到 id / 标记就直接报错，
// 免得画面默默跑到 0 秒去。
import data from '../timing_short.json';

type Sub = {s: number; e: number; t: string};
type Item = {
  kind: 'line' | 'bubble' | 'sting';
  id: string;
  ch: string;
  start: number;
  end: number;
  text?: string;
  pose?: string;
  cues?: Record<string, number>;
  subs?: Sub[];
};
type Timing = {total: number; chapters: {id: string; start: number; first: number; end: number}[]; items: Item[]};

const D = data as unknown as Timing;

export const FPS = 60;
export const W = 1080;
export const H = 1920;

export const TOTAL_S = () => D.total;
export const SHORT_FRAMES = (fps: number) => Math.ceil(D.total * fps);

const byId = (id: string) => {
  const it = D.items.find((x) => x.id === id);
  if (!it) throw new Error(`timing_short 里没有 ${id}`);
  return it;
};
/** 句子起止（秒） */
export const S = (id: string) => byId(id).start;
export const E = (id: string) => byId(id).end;
/** 句子里 {标记} 的时刻（秒） */
export const C = (id: string, cue: string) => {
  const v = byId(id).cues?.[cue];
  if (v === undefined) throw new Error(`${id} 里没有标记 {${cue}}`);
  return v;
};
export const chapter = (id: string) => {
  const c = D.chapters.find((x) => x.id === id);
  if (!c) throw new Error(`短版时间表里没有章节 ${id}`);
  return c;
};
export const items = () => D.items;
export const bubbles = () => D.items.filter((x) => x.kind === 'bubble');
export const lines = () => D.items.filter((x) => x.kind === 'line');
export const allSubs = () => D.items.flatMap((x) => (x.kind === 'line' ? x.subs ?? [] : []));
