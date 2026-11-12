"""量拍子：一首曲子一拍多长、第一拍在第几秒、能量怎么起伏。无口播的片子按拍排时间，先跑这个。

你听不到声音，所以全靠数：先从音频里算出「哪些时刻有东西响起来」（起音强度），
再找一个等间隔的网格，让它尽量多地压在这些时刻上。

用法（片场的 Python）：
    量一首曲子：
        film-kit\\.venv\\Scripts\\python.exe film-kit\\tools\\beat_probe.py <曲子.mp3> [--seconds 80] [--bpm 100-140]
      打印拍长、第一拍位置、每 4 小节的能量表，并给出可以直接贴进 film.json 的那一行。
      --seconds 只用开头这么多秒来量（默认 80）。整首一起量，后半段的微小漂移会把第一拍的位置拉偏；
                你的片子用曲子的哪一段，就量哪一段。
      --bpm     限定速度范围，默认 80–180。量出来是真实速度的一半或两倍时用它纠正。

    成片回测（渲染、合成之后）：
        … beat_probe.py --check <成片.mp4> --beat 0.483871 --origin 0 [--beats 2,13,32,72] [--fps 60]
      从成片的音轨里重新找鼓点，看它们离网格差多少毫秒；--beats 列出要单独看的拍号（重要动作所在的拍）。
      整体偏移超过 1 帧（60 帧的片子是 16.7 毫秒）就要查：配乐起点、编码造成的延迟、网格的 origin。

量出来的数是「数值上最合理的网格」，不是听感。曲子的气质、接缝顺不顺，仍然要交给人听。
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 22050
HOP = 128  # 约 5.8 毫秒一格，量相位够细


def decode(path: Path, seconds: float | None = None) -> np.ndarray:
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path), '-vn']
    if seconds:
        cmd += ['-t', str(seconds)]
    cmd += ['-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0 or not r.stdout:
        sys.exit('✗ 读不了音频（要装 ffmpeg）：' + r.stderr.decode('utf-8', 'replace')[-300:])
    return np.frombuffer(r.stdout, np.float32).astype(np.float64)


def onset_env(x: np.ndarray, low_only: bool = False) -> np.ndarray:
    """起音强度：每一格比上一格「多出来」多少能量。low_only 只看 150Hz 以下（底鼓）。"""
    n = 1024
    win = np.hanning(n)
    frames = 1 + (len(x) - n) // HOP
    idx = np.arange(n)[None, :] + HOP * np.arange(frames)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    if low_only:
        mag = mag[:, freqs < 150]
    else:
        # 合成十几个对数频带，各频带的增量加起来（响的频段不至于盖掉别的）
        edges = np.geomspace(40, 8000, 17)
        mag = np.stack([mag[:, (freqs >= a) & (freqs < b)].sum(axis=1) for a, b in zip(edges[:-1], edges[1:])], axis=1)
    logm = np.log1p(30 * mag / (mag.max() + 1e-9))
    flux = np.maximum(0, np.diff(logm, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    # 去掉缓慢变化的底，只留尖峰
    k = int(0.4 * SR / HOP)
    base = np.convolve(flux, np.ones(k) / k, mode='same')
    env = np.maximum(0, flux - base)
    return env / (env.max() + 1e-9)


def frame_t(i):
    return (np.asarray(i) * HOP + 512) / SR  # 取窗的中心


def comb_score(env: np.ndarray, beat: float, phase: float) -> float:
    """网格压在起音上的程度：网格每个点处的起音强度之和（线性插值）。"""
    t_end = frame_t(len(env) - 1)
    ts = np.arange(phase, t_end, beat)
    pos = (ts * SR - 512) / HOP
    pos = pos[(pos >= 0) & (pos < len(env) - 1)]
    lo = np.floor(pos).astype(int)
    w = pos - lo
    return float(((1 - w) * env[lo] + w * env[lo + 1]).mean())


def estimate(env: np.ndarray, bpm_lo: float, bpm_hi: float):
    """在速度范围里直接扫：哪个拍长、哪个起点的网格，压在起音上的最多。

    用底鼓的起音来扫（见 cmd_measure）：一拍一个底鼓的曲子，只有真实的拍长能让网格的每个点都压上；
    拍长错成 1.5 倍、0.75 倍的网格只能隔几个压上一个，分数低一半以上。全频段的起音不行——
    反拍上的镲会让 1.5 倍拍长的网格也拿到高分（实测把 124 量成过 82.7）。"""
    # 粗扫：每 0.25 拍/分一档
    best = (-1.0, 0.5, 0.0)
    for bpm in np.arange(bpm_lo, bpm_hi + 1e-6, 0.25):
        beat = 60 / bpm
        for phase in np.arange(0, beat, 0.008):
            s = comb_score(env, beat, phase)
            if s > best[0]:
                best = (s, beat, phase)
    # 细扫：在最好的那一档附近把拍长和起点扫细
    beat0 = best[1]
    for beat in np.linspace(beat0 * 0.994, beat0 * 1.006, 121):
        for phase in np.arange(0, beat, 0.003):
            s = comb_score(env, beat, phase)
            if s > best[0]:
                best = (s, beat, phase)
    return best[1], best[2]


def refine(env_low: np.ndarray, beat: float, phase: float):
    """用底鼓的起音做最小二乘：每个网格点附近找最强的起音，拟合 t = phase + k·beat。"""
    t_end = frame_t(len(env_low) - 1)
    ks, ts = [], []
    half = int(0.06 * SR / HOP)
    thr = np.percentile(env_low, 90) * 0.5
    for k in range(int((t_end - phase) / beat)):
        c = int(((phase + k * beat) * SR - 512) / HOP)
        a, b = max(0, c - half), min(len(env_low), c + half + 1)
        if b - a < 3:
            continue
        j = a + int(np.argmax(env_low[a:b]))
        if env_low[j] < thr:
            continue
        # 抛物线插值到格子之间
        if 0 < j < len(env_low) - 1:
            y0, y1, y2 = env_low[j - 1], env_low[j], env_low[j + 1]
            d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 - 1e-12)
        else:
            d = 0.0
        ks.append(k)
        ts.append(float(frame_t(j + d)))
    if len(ks) < 8:
        return beat, phase, 0, None
    ks, ts = np.array(ks), np.array(ts)
    A = np.stack([ks, np.ones_like(ks)], axis=1).astype(float)
    for _ in range(3):  # 去掉离群的点再拟合
        sol, *_ = np.linalg.lstsq(A, ts, rcond=None)
        res = ts - A @ sol
        keep = np.abs(res) < max(0.012, 2.5 * res.std())
        if keep.all():
            break
        A, ts, ks = A[keep], ts[keep], ks[keep]
    sol, *_ = np.linalg.lstsq(A, ts, rcond=None)
    res = ts - A @ sol
    return float(sol[0]), float(sol[1]), len(ks), float(np.sqrt((res ** 2).mean()))


def refine_phase(env_low: np.ndarray, beat: float, phase: float):
    """拍长固定，只求起点：网格点附近底鼓起音的平均位置。"""
    t_end = frame_t(len(env_low) - 1)
    half = int(0.06 * SR / HOP)
    thr = np.percentile(env_low, 90) * 0.5
    res = []
    for k in range(int((t_end - phase) / beat)):
        c = int(((phase + k * beat) * SR - 512) / HOP)
        a, b = max(0, c - half), min(len(env_low), c + half + 1)
        if b - a < 3:
            continue
        j = a + int(np.argmax(env_low[a:b]))
        if env_low[j] < thr:
            continue
        res.append(float(frame_t(j)) - (phase + k * beat))
    if len(res) < 8:
        return beat, phase, 0, None
    r = np.array(res)
    r = r[np.abs(r - np.median(r)) < max(0.012, 2.5 * r.std())]
    return beat, phase + float(r.mean()), len(r), float(r.std())


def energy_table(x: np.ndarray, beat: float, phase: float, group: int = 16):
    """每 group 拍（默认 4 小节）的音量，归一化到最响的那一段 = 1。"""
    out = []
    step = beat * group
    t = phase
    while (t + step) * SR <= len(x):
        seg = x[int(t * SR):int((t + step) * SR)]
        out.append(float(np.sqrt((seg ** 2).mean())))
        t += step
    arr = np.array(out)
    return arr / (arr.max() + 1e-12)


def cmd_measure(a):
    path = Path(a.file)
    lo, hi = (float(v) for v in a.bpm.split('-'))
    x = decode(path, a.seconds)
    env_low = onset_env(x, low_only=True)
    # 底鼓够多就用底鼓找网格；没有清楚的底鼓（原声、氛围类曲子）才退回全频段
    strong = int((env_low > 0.3).sum())
    beat, phase = estimate(env_low if strong >= 40 else onset_env(x), lo, hi)
    beat2, phase2, n, rms = refine(env_low, beat, phase)
    if n >= 8:
        beat, phase = beat2, phase2
    # 电子乐几乎都是整数速度：量出来离整数很近时，把拍长钉在整数上只重新拟合起点，
    # 偏差没有明显变大就采用整数（免得 0.02% 的误差在 80 拍之后累积成半帧）
    bpm_round = round(60 / beat)
    if n >= 8 and abs(60 / beat - bpm_round) < 0.08:
        fixed = 60 / bpm_round
        env_l = env_low
        best = (-1.0, phase)
        for ph in np.arange(phase - 0.03, phase + 0.03, 0.0005):
            s = comb_score(env_l, fixed, ph % fixed)
            if s > best[0]:
                best = (s, ph)
        _b, ph_fit, n2, rms2 = refine_phase(env_l, fixed, best[1])
        if rms2 is not None and rms is not None and rms2 <= rms * 1.2:
            print(f'（量到 {60 / beat:.3f} 拍/分，离整数 {bpm_round} 很近，按整数速度算：偏差 {rms * 1000:.1f} → {rms2 * 1000:.1f} 毫秒）')
            beat, phase, n, rms = fixed, ph_fit, n2, rms2
    phase = phase % beat
    full = decode(path, None)
    en = energy_table(full, beat, phase)
    print(f'曲子：{path.name}（用开头 {a.seconds:g} 秒量的）')
    print(f'速度：{60 / beat:.2f} 拍/分　一拍 {beat:.6f} 秒　一小节（4 拍）{beat * 4:.4f} 秒')
    print(f'第一拍在：{phase:.4f} 秒')
    if rms is not None:
        print(f'底鼓对上网格的有 {n} 个，平均偏差 {rms * 1000:.1f} 毫秒' + ('（偏差偏大，这首曲子的鼓点不太规整，慎用）' if rms > 0.02 else ''))
    else:
        print('底鼓太少，没法细调：这首曲子可能没有清楚的鼓点，不适合用来卡点')
    print('\n能量（每 16 拍一格，最响 = 1.00；找「第几拍进满」「第几拍回落」看这张表）：')
    for i, v in enumerate(en):
        bar = '█' * int(round(v * 30))
        print(f'  第 {i * 16:>4}–{i * 16 + 16:<4} 拍  {v:4.2f} {bar}')
    full_at = next((i * 16 for i, v in enumerate(en) if v >= 0.8), None)
    if full_at is not None:
        print(f'\n进满能量：大约第 {full_at} 拍（{phase + full_at * beat:.2f} 秒）。主陈述一般钉在这里。16 拍一格比较粗，前后再对着表细看')
    print('\n贴进 film.json 的 music.tracks：')
    print(f'  "{path.stem}": {{"file": "{path.name}", "beat": {beat:.6f}, "phase": {phase:.4f}}}')
    if a.json:
        Path(a.json).write_text(json.dumps({'file': path.name, 'bpm': 60 / beat, 'beat': beat, 'phase': phase, 'kicks': n, 'rms': rms, 'energy16': [round(float(v), 3) for v in en]}, ensure_ascii=False, indent=1), encoding='utf-8')
        print(f'数据 → {a.json}')


def cmd_check(a):
    x = decode(Path(a.check), None)
    env = onset_env(x, low_only=True)
    beat, origin = a.beat, a.origin
    total = len(x) / SR
    half = int(0.08 * SR / HOP)
    thr = np.percentile(env, 90) * 0.5

    def offset_at(k: float):
        c = int(((origin + k * beat) * SR - 512) / HOP)
        lo, hi = max(0, c - half), min(len(env), c + half + 1)
        if hi - lo < 3:
            return None
        j = lo + int(np.argmax(env[lo:hi]))
        if env[j] < thr:
            return None
        return float(frame_t(j)) - (origin + k * beat)

    offs = [o for k in range(int((total - origin) / beat)) if (o := offset_at(k)) is not None]
    if len(offs) < 6:
        sys.exit('✗ 成片音轨里找不到足够的鼓点：音轨是不是静音，或者 --beat / --origin 写错了')
    med = float(np.median(offs))
    frame = 1000 / a.fps
    print(f'成片：{Path(a.check).name}　网格：一拍 {beat:.6f} 秒，第 0 拍在 {origin:.4f} 秒')
    print(f'对上网格的鼓点 {len(offs)} 个，整体偏移（中位数）{med * 1000:+.1f} 毫秒 = {med * 1000 / frame:+.2f} 帧，'
          f'散布 {np.std(offs) * 1000:.1f} 毫秒')
    print('  ' + ('合格：整体偏移在 1 帧以内' if abs(med) * 1000 <= frame else '不合格：整体偏移超过 1 帧，查配乐起点 / 编码延迟 / music.grid 的 from'))
    if a.beats:
        print('点名的拍号：')
        for k in (float(v) for v in a.beats.split(',')):
            o = offset_at(k)
            print(f'  第 {k:g} 拍（{origin + k * beat:.3f} 秒）：' + ('这一拍没有明显的鼓点' if o is None else f'{o * 1000:+.1f} 毫秒 = {o * 1000 / frame:+.2f} 帧'))
    sys.exit(0 if abs(med) * 1000 <= frame else 2)


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    ap = argparse.ArgumentParser(description='量拍子 / 成片回测')
    ap.add_argument('file', nargs='?')
    ap.add_argument('--seconds', type=float, default=80)
    ap.add_argument('--bpm', default='80-180')
    ap.add_argument('--json', default='')
    ap.add_argument('--check', default='')
    ap.add_argument('--beat', type=float, default=0)
    ap.add_argument('--origin', type=float, default=0)
    ap.add_argument('--beats', default='')
    ap.add_argument('--fps', type=float, default=60)
    a = ap.parse_args()
    if a.check:
        if not a.beat:
            sys.exit('✗ 回测要给 --beat（一拍多少秒）和 --origin（第 0 拍在成片第几秒），都在时间表 timing_zh.json 的 grid 里')
        cmd_check(a)
    elif a.file:
        cmd_measure(a)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
