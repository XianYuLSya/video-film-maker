"""混音：人声 + 配乐 + 音效 + 片头片尾原声，整体 -14 LUFS、真峰值 -1.5 dBTP 以下。

读：film/public/vo/voice_<键>.wav、vo/music_<键>.wav、build/sfx_<键>.wav、film/public/intro.mp4|outro.mp4
出：vo/mix_<键>.wav（24 bit）
片子没有通用片头片尾（短版、或 film.json 里 stings=false）时，自动跳过片头片尾原声。
"""
from __future__ import annotations

import re

import numpy as np

from vo import common as K


# 限幅先升到 192k 再做：采样点之间的峰值（真峰值）也压得住。只在 48k 上限幅时，配乐为主的片子
# （没有口播压着）真峰值会比采样峰值高出 2 dB，体检的「真峰值」那一项过不了。
def limiter(limit: float = 0.76) -> str:
    return f'aresample=192000,alimiter=limit={limit:.4f}:attack=2:release=60:level=disabled,aresample={K.SR}'


def _dec(path, ch=2, af=None):
    cmd = [K.which('ffmpeg'), '-v', 'error', '-i', str(path)]
    if af:
        cmd += ['-af', af]
    cmd += ['-f', 'f32le', '-ac', str(ch), '-ar', str(K.SR), '-']
    r = K.run(cmd, quiet=True)
    return np.frombuffer(r.stdout, np.float32).reshape(-1, ch).copy()


def _lufs(x: np.ndarray) -> float:
    # 音频必须从 stdin 喂进去（只写 -i - 不给数据，ffmpeg 读到 EOF，量出来当静音处理）
    r = K.run_stdin([K.which('ffmpeg'), '-v', 'info', '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-i', '-',
                     '-af', 'ebur128', '-f', 'null', '-'], x.astype(np.float32).tobytes(), quiet=True)
    tail = r.out[r.out.rfind('Integrated loudness'):] if 'Integrated loudness' in r.out else r.out
    m = re.search(r'I:\s*(-?\d+(?:\.\d+)?)\s*LUFS', tail)
    if not m:
        K.die('量不出响度（ffmpeg ebur128 没给结果）', f'ffmpeg 输出：{K.tail(r.out, 5)}')
    return float(m.group(1))


def nomusic_wav(cfg: dict, key: str):
    """无配乐混音的位置（film.json 的 audio.alsoNoMusic 打开时才有）。"""
    main = K.mix_wav(cfg, key)
    return main.with_name(f'{main.stem}_nomusic{main.suffix}')


def run(cfg: dict, key: str) -> dict:
    key = K.check_key(key, cfg)
    tm = K.load_timing(key)
    n = int((tm['total'] + 0.5) * K.SR)

    def fit(x):
        out = np.zeros((n, 2), np.float32)
        m = min(n, len(x))
        out[:m] = x[:m]
        return out

    voice_path = K.voice_wav(cfg, key)
    if not voice_path.exists():
        K.die(f'找不到人声：{voice_path}', '先跑 .\\film.cmd voice ' + key)
    # 人声：切掉 70Hz 以下、轻压缩，拉到 -16 LUFS（单声道放到两边）
    voice = _dec(voice_path, ch=2, af='highpass=f=70,acompressor=threshold=-20dB:ratio=2:attack=8:release=120:makeup=1')
    voice = fit(voice)
    # 整片没有口播（品牌片、产品片）时人声轨是静音：量不出响度，也不该拿它算增益
    if float(np.abs(voice).max()) > 1e-4:
        voice *= 10 ** ((-16 - _lufs(voice)) / 20)
    else:
        K.log('  这一版没有口播，人声轨是静音')

    music_path = K.music_wav(cfg, key)
    if music_path.exists():
        music = fit(_dec(music_path))
    else:
        K.warn('没有配乐轨，按无声处理（先跑 voice，再跑 audio）')
        music = np.zeros((n, 2), np.float32)
    music *= 10 ** (-3.0 / 20)  # 配乐整体再比人声低 3 dB

    sfx_path = K.sfx_wav(cfg, key)
    sfx = fit(_dec(sfx_path)) if sfx_path.exists() else np.zeros((n, 2), np.float32)
    sfx *= 10 ** (-1.0 / 20)

    # 片头片尾：原样放在时间表给的时刻（短版没有这两段）
    st = np.zeros((n, 2), np.float32)
    stings = {x['id']: x for x in tm['items'] if x['kind'] == 'sting'}
    for name, f in (('intro', 'intro.mp4'), ('outro', 'outro.mp4')):
        if name not in stings:
            continue
        p = K.FILM / 'public' / f
        if not p.exists():
            K.warn(f'时间表里有片头/片尾，但 film/public/{f} 不存在，跳过它的原声')
            continue
        x = _dec(p)
        a = int(round(stings[name]['start'] * K.SR))
        m = min(len(x), n - a)
        if m > 0:
            st[a:a + m] += x[:m] * 0.85

    mix = voice + music + sfx + st
    gain = 10 ** ((-14 - _lufs(mix)) / 20)
    mix *= gain
    if (cfg.get('audio') or {}).get('alsoNoMusic'):
        # 另出一条不带配乐的（人声 + 音效 + 片头片尾），用和正片同一个增益：换配乐、发到自带配乐的平台时用
        bare = (voice + sfx + st) * gain
        pre = K.build_dir(cfg) / f'mix_{key}_nomusic_pre.wav'
        pre.parent.mkdir(parents=True, exist_ok=True)
        K.run_stdin([K.which('ffmpeg'), '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-i', '-',
                     '-c:a', 'pcm_f32le', str(pre)], bare.astype(np.float32).tobytes())
    tmp = K.build_dir(cfg) / f'mix_{key}_pre.wav'
    tmp.parent.mkdir(parents=True, exist_ok=True)
    K.run_stdin([K.which('ffmpeg'), '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(K.SR), '-i', '-',
                 '-c:a', 'pcm_f32le', str(tmp)], mix.astype(np.float32).tobytes())
    out = K.mix_wav(cfg, key)
    # 成片是 AAC：编码之后真峰值还会再冒一点（配乐为主、没有口播压着的片子能冒 2 dB）。
    # 所以限幅之后试编一次 AAC 量真峰值，超了就把限幅的上限往下收，最多收三次。
    want_peak = float((cfg.get('audio') or {}).get('truePeak', -1.5))
    limit = 0.76
    probe = K.build_dir(cfg) / f'mix_{key}_probe.m4a'
    for attempt in range(4):
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-i', str(tmp),
               '-af', limiter(limit), '-c:a', 'pcm_s24le', str(out)], quiet=True)
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-i', str(out), '-c:a', 'aac', '-b:a', '320k', str(probe)], quiet=True)
        enc = K.audio_stats(probe)
        if enc['peak'] is None or enc['peak'] <= want_peak - 0.05 or attempt == 3:
            break
        over = enc['peak'] - (want_peak - 0.3)
        limit *= 10 ** (-over / 20)
        K.log(f'  编码后真峰值 {enc["peak"]:.1f} dBFS 超了，限幅上限收到 {limit:.3f} 再来')
    try:
        probe.unlink()
    except OSError:
        pass
    if (cfg.get('audio') or {}).get('alsoNoMusic'):
        K.run([K.which('ffmpeg'), '-v', 'error', '-y', '-i', str(K.build_dir(cfg) / f'mix_{key}_nomusic_pre.wav'),
               '-af', limiter(limit), '-c:a', 'pcm_s24le', str(nomusic_wav(cfg, key))], quiet=True)
        K.log(f'  另出无配乐混音：{nomusic_wav(cfg, key).name}')
    stats = K.audio_stats(out)
    K.log(f'混音 {key}：{n / K.SR:.2f}s，整体 {stats["lufs"]} LUFS，真峰值 {stats["peak"]} dBFS')
    K.log('  目标：整体 -14 LUFS，真峰值不高于 -1.5 dBTP')
    return {'out': str(out), **stats}


if __name__ == '__main__':
    import sys
    K.setup_stdout()
    cfg = K.load()
    run(cfg, sys.argv[1] if len(sys.argv) > 1 else 'zh')
