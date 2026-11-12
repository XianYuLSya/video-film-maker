// 全片时间：一律用「成片秒数」。口播句子和 {标记} 的时刻来自 vo/tts.py 生成的 timing_zh.json（这期只做中文版）
import zh from '../timing_zh.json';

export type Lang = 'zh';
export const FPS = 60;
export const W = 1920;
export const H = 1080;

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
type Timing = {lang: string; total: number; chapters: {id: string; start: number; first: number; end: number}[]; items: Item[]; grid?: {track: string; beat: number; origin: number}};

const DATA = zh as unknown as Timing;
export const setLang = (_l: Lang) => undefined;
export const lang = (): Lang => 'zh';
export const isZh = () => true;
/** 按语言取文字（只有中文版，留着接口方便沿用旧代码） */
export const tr = (zhText: string, _enText?: string) => zhText;

export const TOTAL = () => DATA.total;

const byId = (id: string) => {
  const it = DATA.items.find((x) => x.id === id);
  if (!it) throw new Error(`timing 里没有 ${id}`);
  return it;
};
/** 句子开始、结束（秒） */
export const S = (id: string) => byId(id).start;
export const E = (id: string) => byId(id).end;
/** 句子里 {标记} 的时刻（秒） */
export const C = (id: string, cue: string) => {
  const it = byId(id);
  const v = it.cues?.[cue];
  if (v === undefined) throw new Error(`${id} 里没有标记 {${cue}}`);
  return v;
};
export const chapter = (id: string) => {
  const c = DATA.chapters.find((x) => x.id === id);
  if (!c) throw new Error(`没有章节 ${id}`);
  return c;
};
export const items = () => DATA.items;
export const sting = (id: string) => {
  const it = DATA.items.find((x) => x.kind === 'sting' && x.id === id);
  if (!it) throw new Error(`没有 ${id}`);
  return it;
};
export const bubble = (id: string) => {
  const it = DATA.items.find((x) => x.kind === 'bubble' && x.id === id);
  if (!it) throw new Error(`没有气泡 ${id}`);
  return it;
};
export const allSubs = () => DATA.items.flatMap((x) => (x.kind === 'line' ? x.subs ?? [] : []));
export const bubbles = () => DATA.items.filter((x) => x.kind === 'bubble');
export const lines = () => DATA.items.filter((x) => x.kind === 'line');

/** 拍子网格（按拍排时间的片子才有）：film.json 写了 music.grid，voice 时算好写进时间表。
 *  beat 是一拍多少秒，origin 是第 0 拍在成片第几秒。画面里一般不直接用它，用 cine 的 B(拍号)。 */
export const grid = () => DATA.grid ?? null;
