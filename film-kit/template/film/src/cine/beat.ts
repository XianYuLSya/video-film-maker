// 按拍子取时间。无口播的片子，时间的骨架是音乐：场景里写「第几拍」，不写秒。
//
// 拍子从哪来：film.json 的 music.grid 指定用哪首曲子的拍长、第 0 拍落在成片哪里；
// 跑 .\film.cmd voice 时算好写进时间表（timing_zh.json 的 grid），这里读出来。
// 所以改了曲子、改了拍长，重跑一次 voice，画面和配乐一起跟着走。
//
//   B(32)        第 32 拍在成片第几秒
//   beats(2)     2 拍有多长（秒）
//   B(30) + 0.1  第 30 拍之后 0.1 秒（细调可以加秒，但主要的时刻都该落在拍上）
import {grid} from '../lib/time';

const need = () => {
  const g = grid();
  if (!g) {
    throw new Error(
      '时间表里没有拍子网格。按拍排时间的片子要在 film.json 的 music 里写 "grid": {"track": "曲名", "from": "sec:0"}（曲名在 music.tracks 里要有 beat），然后重跑 .\\film.cmd voice',
    );
  }
  return g;
};

/** 第 n 拍在成片第几秒（n 可以是小数：B(31.5) 是第 31 拍和第 32 拍正中间） */
export const B = (n: number) => {
  const g = need();
  return g.origin + n * g.beat;
};
/** n 拍有多长（秒） */
export const beats = (n: number) => need().beat * n;
/** 第 n 小节的第一拍（4 拍一小节） */
export const bar = (n: number) => B(n * 4);
/** 成片第 t 秒是第几拍（审片时把秒数换回拍号用） */
export const beatAt = (t: number) => {
  const g = need();
  return (t - g.origin) / g.beat;
};
/** 每分钟多少拍 */
export const bpm = () => 60 / need().beat;
