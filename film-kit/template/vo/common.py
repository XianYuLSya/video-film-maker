"""片场公用：读 film.json、跑外部命令、读写时间表、中文报错。

三条约定（全部子命令都照这个来）：
1. 作品根目录 = film.py 所在目录（本文件是 作品根\\vo\\common.py），跟当前工作目录无关。
2. 外部命令一律用列表传参，不拼 shell 字符串；跑的时候打印真实命令行和耗时。
3. 出错一律抛 KitError，中文写清「哪一步、为什么、怎么续跑」，由 film.py 统一打出来、退出码非 0。
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ───────── 路径 ─────────
WORK = Path(__file__).resolve().parents[1]      # 作品根
FILM = WORK / 'film'                            # Remotion 工程
# 曲库目录不写死在代码里：film.json 的 music.dir，没写就用片场的 local\bgm\（见 bgm_dir）。
# 配乐、音效、通用片头片尾都不随片场分发，各人放进片场的 local\（清单见片场根目录的 素材自备.md）。
SR = 48000                                       # 全链路采样率，统一 48k
ASSETS_DOC = '片场根目录的 素材自备.md'


def kit_root() -> Path | None:
    """片场根目录（film-kit）。作品的 film\\node_modules 是指到片场 node_modules 的目录联接，顺着它找；
    模板本身就在片场里，往上一层就是。找不到返回 None。"""
    cands = []
    nm = WORK / 'film' / 'node_modules'
    if nm.exists():
        cands.append(Path(os.path.realpath(nm)).parent)
    cands.append(WORK.parent)
    for c in cands:
        if (c / 'tools' / 'new_film.py').exists():
            return c
    return None


def kit_local() -> dict:
    """片场的本机配置 kit.local.json（不进仓库；样例 kit.local.example.json）。没有就是空表。"""
    kit = kit_root()
    f = kit / 'kit.local.json' if kit else None
    if not f or not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding='utf-8-sig'))
    except json.JSONDecodeError as ex:
        die(f'kit.local.json 不是合法 JSON：第 {ex.lineno} 行第 {ex.colno} 列 —— {ex.msg}', f'改 {f}')

# ───────── 内置曲目表 ─────────
# 键 → (文件名, 一拍多少秒, 第一拍在第几秒)。这三首是以前实测过拍长的；别的曲子没测过，
# 只能「整首铺满」用，不能对小节（脚本会说出来，不会静默放错）。
BUILTIN_TRACKS = {
    'cat': ('cat-walk.mp3', 0.46154, 0.152),
    'tonight': ('tonight-hiphop.mp3', 0.57147, 0.236),
    'house': ('house-vibez.mp3', 0.49179, 0.220),
}

MARK = re.compile(r'\{([a-zA-Z0-9_]+)\}')

# ───────── film.json 缺省值 ─────────
# 每个字段的含义写在 film.json 里的 "_说明" 键，这里只放兜底值。
DEFAULTS = {
    'name': None,
    'outDir': None,
    'versions': ['zh', 'short'],
    'videos': {'zh': None, 'short': None},
    'srts': {'zh': '字幕_中文.srt', 'short': '字幕_短版_中文.srt'},
    'comps': {'zh': 'FilmZh', 'short': 'ShortZh'},
    'sfxComps': {'zh': 'SfxList', 'short': 'SfxListShort'},
    'voice': {
        'zh': {'voice': 'zh-CN-XiaoyiNeural', 'rate': '-3%'},
        'short': {'voice': 'zh-CN-XiaoyiNeural', 'rate': '-3%'},
    },
    'say': [],
    'submax': {'zh': 17, 'short': 12},
    'pacing': {
        'gap': 0.34,
        'chapterGap': 0.75,
        'leadLine': 0.55,
        'leadBubble': 1.0,
        'bubbleGap': 0.15,
        'tail': 0.5,
    },
    'stings': True,
    'music': {
        'default': 'cat',
        'dir': '',
        'grid': None,
        'tracks': {},
        'segments': [],
        'duck': {'speak': -15.0, 'gap': -8.0, 'bubble': -6.0, 'sting': -12.0, 'open': -3.0},
        'openUp': [],
        'fadeIn': 0.4,
        'fadeOut': 1.6,
        'level': -16.0,
    },
    'render': {
        'chunk': 3000,
        'concurrency': 4,
        'retryConcurrency': 2,
        'crf': 17,
        'timeout': 120000,
        'gl': 'angle',
        'browser': '',
    },
    'dirs': {'build': 'build', 'review': 'review'},
    'expect': {
        'zh': {'width': 1920, 'height': 1080, 'fps': 60},
        'short': {'width': 1080, 'height': 1920, 'fps': 60},
    },
    'audio': {'lufs': -14.0, 'lufsTol': 1.0, 'truePeak': -1.5, 'alsoNoMusic': False},
    'subtitle': {'maxWidth': {'zh': 17, 'short': 12}, 'maxLines': 1},
}


class KitError(Exception):
    """片场里能预期的失败：带一句中文说明和一句续跑提示。"""

    def __init__(self, msg: str, hint: str = ''):
        super().__init__(msg)
        self.msg = msg
        self.hint = hint


# ───────── 输出 ─────────
def setup_stdout():
    """控制台/重定向都按 UTF-8 输出，避免中文变问号。"""
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass


def head(text: str):
    print(f'\n=== {text} ===', flush=True)


def log(text: str):
    print(f'  {text}', flush=True)


def warn(text: str):
    print(f'  [注意] {text}', flush=True)


def die(msg: str, hint: str = ''):
    raise KitError(msg, hint)


def fmt_sec(t: float) -> str:
    """12.34 → 0:12.3"""
    t = max(0.0, float(t))
    return f'{int(t // 60)}:{t % 60:04.1f}'


# ───────── 配置 ─────────
def deep_merge(base, over):
    out = dict(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load() -> dict:
    """读作品根目录的 film.json，套上默认值。

    用 utf-8-sig 读：PowerShell 的 Set-Content -Encoding UTF8 会写出带 BOM 的文件，
    标准 utf-8 解码留着那个 \\ufeff，json.loads 直接报「Expecting value: line 1 column 1」。
    """
    f = WORK / 'film.json'
    if not f.exists():
        die(f'作品根目录没有 film.json：{f}', '从片场模板拷一份 film.json，填好 name 和 outDir。')
    try:
        raw = json.loads(f.read_text(encoding='utf-8-sig'))
    except json.JSONDecodeError as ex:
        die(f'film.json 不是合法 JSON：第 {ex.lineno} 行第 {ex.colno} 列 —— {ex.msg}',
            '用 JSON 校验器改一遍；中文标点、多一个逗号都会报这个。')
    cfg = deep_merge(DEFAULTS, {k: v for k, v in raw.items() if not k.startswith('_')})
    cfg['name'] = cfg.get('name') or WORK.name
    od = Path(cfg.get('outDir') or (Path('成品') / cfg['name']))
    cfg['outDir'] = str(od if od.is_absolute() else WORK / od)   # 相对路径按作品根算
    cfg['_path'] = str(f)
    return cfg


def versions(cfg: dict) -> list[str]:
    """这部片子做哪几版：film.json 的 versions（默认 zh + short，写成 ["zh"] 就是不做短版）。
    lint / status / all 和各子命令都按它来，没开的版本不处理、不打印。"""
    raw = cfg.get('versions')
    if raw is None:
        return ['zh', 'short']
    if isinstance(raw, str):
        raw = [raw]
    if not isinstance(raw, (list, tuple)):
        die(f'film.json 的 versions 看不懂：{raw}', '写成 ["zh"] 或 ["zh", "short"]（正片 / 竖屏短版）。')
    want = {str(x).strip() for x in raw}
    keep = [k for k in ('zh', 'short') if k in want]
    bad = sorted(want - {'zh', 'short', ''})
    if bad:
        die(f'film.json 的 versions 里有不认识的键：{"、".join(bad)}',
            '只认 zh（正片）和 short（竖屏短版）。')
    if not keep:
        die(f'film.json 的 versions 是空的（{raw}）', '写上 ["zh"]（只做正片）或 ["zh", "short"]（两版都做）。')
    return keep


def check_key(key: str, cfg: dict | None = None) -> str:
    if key not in ('zh', 'short'):
        die(f'不认识的键「{key}」', '只有 zh（正片）和 short（竖屏短版）两种。')
    if cfg is not None and key not in versions(cfg):
        name = {'zh': '正片', 'short': '短版'}[key]
        die(f'这部片子的 film.json 没有开{name}',
            f'要出{name}，就在 film.json 的 versions 里加上 "{key}"（现在是 {versions(cfg)}）；'
            f'不做就不用跑 {key}。')
    return key


def scalar_for(cfg: dict, key: str, name: str):
    """取 cfg[name] 里给这个键的值（可以写成 {"zh": x, "short": y}，也可以写成一个值给两边用）。"""
    table = cfg.get(name)
    if isinstance(table, dict) and key in table:
        return table[key]
    return table


def profile(cfg: dict, key: str, name: str) -> dict:
    """取 cfg[name]：同级写的是公共值，zh / short 两个键里写的是各自覆盖值。"""
    table = cfg.get(name) or {}
    if not isinstance(table, dict):
        return {}
    base = {k: v for k, v in table.items() if not (isinstance(v, dict) and k in ('zh', 'short'))}
    own = table.get(key)
    if isinstance(own, dict):
        base.update(own)
    return base


def build_dir(cfg: dict) -> Path:
    d = Path(cfg['dirs']['build'])
    return d if d.is_absolute() else WORK / d


def review_dir(cfg: dict) -> Path:
    d = Path(cfg['dirs']['review'])
    return d if d.is_absolute() else WORK / d


def out_dir(cfg: dict) -> Path:
    return Path(cfg['outDir'])


# ───────── 文件 ─────────
BOM = b'\xef\xbb\xbf'


def has_bom(path: Path) -> bool:
    """这个文件是不是带 UTF-8 BOM（PowerShell 的 Set-Content -Encoding UTF8 会写 BOM）。"""
    try:
        with open(Path(path), 'rb') as f:
            return f.read(3) == BOM
    except OSError:
        return False


def read_json(path: Path, what: str = ''):
    """读 JSON。一律用 utf-8-sig：带 BOM 也能读（手改过、PowerShell 存过的文件不至于直接崩）。"""
    path = Path(path)
    if not path.exists():
        die(f'找不到{what or "文件"}：{path}', '先跑上一步（例如 .\\film.cmd voice zh）。')
    try:
        return json.loads(path.read_text(encoding='utf-8-sig'))
    except json.JSONDecodeError as ex:
        die(f'{what or path.name} 不是合法 JSON：第 {ex.lineno} 行 —— {ex.msg}'
            + ('（这个文件带 UTF-8 BOM，片场能读，但建议存成无 BOM）' if has_bom(path) else ''))
    except UnicodeDecodeError:
        die(f'{what or path.name} 不是 UTF-8 编码：{path}', '用 UTF-8 重新保存。')


def write_json(path: Path, data):
    """写 JSON。一定不带 BOM：Remotion 直接 import 时间表 JSON，BOM 会在打包/解析时出问题。"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')


def script_path(key: str) -> Path:
    return FILM / 'src' / ('script.json' if key == 'zh' else f'script_{key}.json')


def timing_path(key: str) -> Path:
    return FILM / 'src' / f'timing_{key}.json'


def voice_wav(cfg: dict, key: str) -> Path:
    """人声整轨。放 build/：Remotion 不读它，只有混音读，别让每部新片都带着几 MB 成品中间物。"""
    return build_dir(cfg) / f'voice_{key}.wav'


def music_wav(cfg: dict, key: str) -> Path:
    return build_dir(cfg) / f'music_{key}.wav'


def mix_wav(cfg: dict, key: str) -> Path:
    return build_dir(cfg) / f'mix_{key}.wav'


def tts_cache(cfg: dict) -> Path:
    """配音缓存（按念出来的文本哈希）。放 build/，开新片时不会被拷走。"""
    return build_dir(cfg) / 'tts_cache'


def silent_mp4(cfg: dict, key: str) -> Path:
    return build_dir(cfg) / f'film_{key}_silent.mp4'


def sfx_events(cfg: dict, key: str) -> Path:
    return build_dir(cfg) / f'sfx_events_{key}.json'


def sfx_wav(cfg: dict, key: str) -> Path:
    return build_dir(cfg) / f'sfx_{key}.wav'


def load_timing(key: str) -> dict:
    return read_json(timing_path(key), f'时间表 timing_{key}.json')


def load_script(key: str) -> dict:
    return read_json(script_path(key), f'口播稿 script{"" if key == "zh" else "_" + key}.json')


# ───────── 文字处理（tts 和 lint 共用，保证两边对「标记」「念法」的理解一致）─────────
def strip_marks(text: str):
    """去掉 {标记}，返回（念的正文, {标记名: 在正文里的字符位置}）。"""
    marks, out, pos, last = {}, [], 0, 0
    for m in MARK.finditer(text or ''):
        seg = text[last:m.start()]
        out.append(seg)
        pos += len(seg)
        marks[m.group(1)] = pos
        last = m.end()
    out.append((text or '')[last:])
    return ''.join(out), marks


def say_pairs(cfg: dict):
    """念法替换表：[["DSH","D S H"], ...]。也容许写成 [{"from":..,"to":..}]。"""
    out = []
    for it in cfg.get('say') or []:
        if isinstance(it, (list, tuple)) and len(it) == 2:
            out.append((str(it[0]), str(it[1])))
        elif isinstance(it, dict) and 'from' in it and 'to' in it:
            out.append((str(it['from']), str(it['to'])))
        else:
            die(f'film.json 的 say 里有一项看不懂：{it}', '写成 [["原文","念法"], ...]。')
    return out


def say_text(cfg: dict, text: str) -> str:
    for a, b in say_pairs(cfg):
        text = text.replace(a, b)
    return text


def zh_len(text: str) -> float:
    """按显示宽度估字数：汉字算 1，英文字母/数字算 0.55。"""
    s, _ = strip_marks(text)
    return sum(0.55 if ord(ch) < 128 else 1 for ch in s)


# ───────── 跑外部命令 ─────────
_TEMP_SWEPT = False


def kit_temp() -> str:
    """片场自己的临时目录（kit.local.json 的 tempDir）；没配就返回空串，照旧用系统临时目录。

    渲染用的浏览器每开一次，就在临时目录留一个 puppeteer_dev_chrome_profile-*，进程被杀或崩了就不会删，
    抽帧、量版面、分段渲染各开各的，几天能在系统盘攒出几十 G。指到这里以后，每次开工顺手清掉放了
    六小时以上的（这个目录只归片场用，所以整目录按时间清）。"""
    global _TEMP_SWEPT
    d = str(kit_local().get('tempDir') or '').strip()
    if not d:
        return ''
    try:
        os.makedirs(d, exist_ok=True)
    except OSError:
        return ''
    if not _TEMP_SWEPT:
        _TEMP_SWEPT = True
        cutoff = time.time() - 6 * 3600
        try:
            for e in os.scandir(d):
                try:
                    if e.stat(follow_symlinks=False).st_mtime >= cutoff:
                        continue
                    if e.is_dir(follow_symlinks=False):
                        shutil.rmtree(e.path, ignore_errors=True)
                    else:
                        os.remove(e.path)
                except OSError:
                    pass
        except OSError:
            pass
    return d


def _env(extra=None) -> dict:
    env = os.environ.copy()
    env['PYTHONIOENCODING'] = 'utf-8'
    env['PYTHONUTF8'] = '1'
    tmp = kit_temp()
    if tmp:
        env['TEMP'] = env['TMP'] = env['TMPDIR'] = tmp
    for k, v in (extra or {}).items():
        if v is None:
            env.pop(k, None)
        else:
            env[str(k)] = str(v)
    return env


def show_cmd(cmd) -> str:
    return subprocess.list2cmdline([str(c) for c in cmd])


def tail(text: str, n: int = 12) -> str:
    lines = [x for x in (text or '').splitlines() if x.strip()]
    return '\n'.join(lines[-n:])


def run(cmd, cwd=None, env=None, check=True, quiet=False, log_path=None, timeout=None,
        tail_lines: int = 12) -> subprocess.CompletedProcess:
    """跑一条外部命令：打印真实命令行，返回时打印耗时；失败抛 KitError（带最后几行输出）。

    tail_lines 是失败时带多少行输出：node 脚本报错时栈和「哪一帧」在最后几十行，
    film.py 的 _run_node 会把这里带的行数调大。
    """
    cmd = [str(c) for c in cmd]
    if not quiet:
        print('  $ ' + show_cmd(cmd), flush=True)
    t0 = time.time()
    kw = dict(cwd=str(cwd) if cwd else None, env=_env(env), timeout=timeout)
    if log_path:
        log_path = Path(log_path)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, 'wb') as f:
            r = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, **kw)
        r.out = log_path.read_text(encoding='utf-8', errors='replace') if log_path.exists() else ''
    else:
        r = subprocess.run(cmd, capture_output=True, **kw)
        r.out = (r.stdout or b'').decode('utf-8', 'replace') + (r.stderr or b'').decode('utf-8', 'replace')
    dt = time.time() - t0
    if not quiet:
        print(f'  → {dt:.1f}s', flush=True)
    if check and r.returncode != 0:
        raise KitError(f'命令失败（退出码 {r.returncode}，耗时 {dt:.1f}s）：{show_cmd(cmd)}\n'
                       f'{tail(r.out, tail_lines)}')
    return r


def run_stdin(cmd, data: bytes, quiet=False, check=True) -> subprocess.CompletedProcess:
    """把数据从 stdin 喂给外部命令（写 wav 用：不落临时文件，也不用拼 shell 管道）。"""
    cmd = [str(c) for c in cmd]
    if not quiet:
        print('  $ ' + show_cmd(cmd) + f'  （stdin {len(data) / 1e6:.1f} MB）', flush=True)
    t0 = time.time()
    r = subprocess.run(cmd, input=data, capture_output=True, env=_env())
    dt = time.time() - t0
    r.out = (r.stdout or b'').decode('utf-8', 'replace') + (r.stderr or b'').decode('utf-8', 'replace')
    if not quiet:
        print(f'  → {dt:.1f}s', flush=True)
    if check and r.returncode != 0:
        err = (r.stderr or b'').decode('utf-8', 'replace')
        raise KitError(f'命令失败（退出码 {r.returncode}）：{show_cmd(cmd)}\n{tail(err)}')
    return r


def which(name: str) -> str:
    p = shutil.which(name)
    if not p:
        die(f'找不到外部命令 {name}，请先装好并放进 PATH。')
    return p


def node() -> str:
    return which('node')


def node_modules_dirs():
    """候选 node_modules 目录：作品里的 film\\node_modules，再往上每一层（模板靠往上找到片场根那份）。"""
    out = [WORK / 'film' / 'node_modules']
    cur = WORK
    for _ in range(4):
        out.append(cur / 'node_modules')
        if cur.parent == cur:
            break
        cur = cur.parent
    return out


def find_in_node_modules(rel: str) -> Path | None:
    """在候选 node_modules 里找一个包内文件（rel 例如 '@remotion/cli/remotion-cli.js'）。"""
    for base in node_modules_dirs():
        p = base / rel
        if p.exists():
            return p
    return None


def remotion_cli() -> Path:
    """共享运行时里的 remotion 命令行入口（film-kit\\node_modules）。
    注意：入口是 @remotion/cli/remotion-cli.js，不是 dist/index.js —— 后者是库入口，
    直接 node 跑它什么也不做、退出码还是 0，很容易误判成渲染成功。"""
    p = find_in_node_modules('@remotion/cli/remotion-cli.js')
    if p:
        return p
    die('找不到 Remotion 运行时（@remotion/cli）',
        '片场里只有一份运行时：片场根目录的 node_modules（第一次用先在片场根目录 npm install）。'
        '作品里的 film\\node_modules 要是指向它的目录联接（New-Item -ItemType Junction），tools\\new_film.py 会自动建。')


def ffmpeg(*args, **kw):
    return run([which('ffmpeg'), *args], **kw)


def ffprobe_json(path, entries: str):
    r = run([which('ffprobe'), '-v', 'error', '-show_entries', entries, '-of', 'json', str(path)], quiet=True)
    try:
        return json.loads(r.stdout.decode('utf-8', 'replace'))
    except Exception:
        die(f'ffprobe 读不出信息：{path}')


def browser_exe(cfg: dict | None = None) -> str:
    """渲染用的浏览器，按顺序：film.json 的 render.browser → 环境变量 FILM_BROWSER →
    片场 kit.local.json 的 browser → 都没有就交给 Remotion 自己找（它会用 node_modules\\.remotion 里的）。"""
    cand = []
    if cfg:
        cand.append((cfg.get('render') or {}).get('browser') or '')
    cand.append(os.environ.get('FILM_BROWSER', ''))
    cand.append(str(kit_local().get('browser') or ''))
    for c in cand:
        if c and Path(c).exists():
            return str(c)
    return ''


def bgm_dir(cfg: dict) -> Path | None:
    """曲库目录：film.json 的 music.dir（相对路径按作品根算）；没写就用片场的 local\\bgm\\；都没有返回 None。"""
    d = str((cfg.get('music') or {}).get('dir') or '').strip()
    if not d:
        kit = kit_root()
        lib = kit / 'local' / 'bgm' if kit else None
        return lib if lib and lib.exists() else None
    p = Path(d)
    return p if p.is_absolute() else (WORK / p)


def sting_files_missing(items: list[dict]) -> list[str]:
    """稿子里用到的通用片头片尾（intro / outro）在 film\\public 里缺哪几个。"""
    want = [str(it['sting']) for it in items if it.get('sting') in ('intro', 'outro')]
    return [f'{w}.mp4' for w in dict.fromkeys(want) if not (FILM / 'public' / f'{w}.mp4').exists()]


def sting_hint() -> str:
    return ('通用片头片尾不随片场分发：把你自己的 intro.mp4 / outro.mp4 放进片场 local\\，'
            f'再跑 tools\\new_film.py --fill "{WORK}" 拷进来（见{ASSETS_DOC}）；'
            '不用片头片尾就在 film.json 写 "stings": false。')


def track_meta(cfg: dict, name: str):
    """曲目键 → (文件名或路径, 一拍秒数 或 None, 第一拍在文件里的秒数)。只查曲目表，不管文件在不在
    （排时间只要拍长；配乐那一步才真的要文件）。"""
    custom = ((cfg.get('music') or {}).get('tracks') or {}).get(name)
    if custom:
        if isinstance(custom, str):
            custom = {'file': custom}
        beat = custom.get('beat')
        return str(custom.get('file') or ''), (float(beat) if beat else None), float(custom.get('phase') or 0.0)
    if name in BUILTIN_TRACKS:
        file, beat, phase = BUILTIN_TRACKS[name]
        return file, float(beat), float(phase)
    die(f'配乐用了曲目「{name}」，但曲目表里没有它',
        f'在 film.json 的 music.tracks 里写 {{"{name}": {{"file": "文件名.mp3", "beat": 一拍秒数, "phase": 第一拍秒数}}}}；'
        f'内置记了拍长的只有：{"、".join(BUILTIN_TRACKS)}。')


def track_info(cfg: dict, name: str):
    """曲目键 → (文件路径, 一拍秒数 或 None, 第一拍在文件里的秒数)。

    曲目写在 film.json 的 music.tracks 里：{"曲名": {"file": "xxx.mp3", "beat": 0.4839, "phase": 0.0256}}。
    file 可以是绝对路径，也可以相对曲库目录（music.dir）或作品根。beat / phase 是量出来的拍长和第一拍位置
    （用 film-kit\tools\beat_probe.py 量）；不写 beat 的曲子只能整首铺，不能对小节、不能当拍子网格。
    内置的 cat / tonight / house 三首只是替你记着拍长，文件一样要在曲库目录里。"""
    custom = ((cfg.get('music') or {}).get('tracks') or {}).get(name)
    lib = bgm_dir(cfg)
    if custom:
        if isinstance(custom, str):
            custom = {'file': custom}
        file = str(custom.get('file') or '')
        beat = custom.get('beat')
        phase = float(custom.get('phase') or 0.0)
    elif name in BUILTIN_TRACKS:
        file, beat, phase = BUILTIN_TRACKS[name]
    else:
        die(f'配乐用了曲目「{name}」，但曲目表里没有它',
            f'在 film.json 的 music.tracks 里写 {{"{name}": {{"file": "文件名.mp3", "beat": 一拍秒数, "phase": 第一拍秒数}}}}；'
            f'内置记了拍长的只有：{"、".join(BUILTIN_TRACKS)}。')
    cands = []
    fp = Path(file)
    if fp.is_absolute():
        cands.append(fp)
    else:
        if lib:
            cands.append(lib / file)
        cands.append(WORK / file)
    for c in cands:
        if c.exists():
            return c, (float(beat) if beat else None), float(phase)
    where = '、'.join(str(c) for c in cands) or file
    die(f'找不到曲子「{name}」的文件：{where}',
        '配乐文件不随片场分发。把曲子放进片场的 local\\bgm\\（film.json 的 music.dir 留空时默认找这里），'
        f'或在 music.dir 写自己的曲库目录、在 music.tracks 里把 file 写成绝对路径。内置曲目的文件名和来源见{ASSETS_DOC}。'
        + ('' if lib else ' 现在 music.dir 是空的，片场 local\\bgm\\ 也不存在。'))


def beat_grid(cfg: dict):
    """全片的拍子网格：film.json 的 music.grid。没写返回 None。

    写法："grid": "曲名"  或  "grid": {"track": "曲名", "from": "sec:0"}。
    track 决定一拍多长；from 是第 0 拍落在成片的哪里（默认成片开头，可以写 sting:垫片名）。
    返回 (曲名, 一拍秒数, from 引用)。"""
    g = (cfg.get('music') or {}).get('grid')
    if not g:
        return None
    if isinstance(g, str):
        g = {'track': g}
    name = g.get('track')
    if not name:
        die('film.json 的 music.grid 没写 track（用哪首曲子的拍子）', '写成 "grid": {"track": "曲名", "from": "sec:0"}。')
    _file, beat, _phase = track_meta(cfg, name)
    if not beat:
        die(f'music.grid 用的曲子「{name}」没有拍长',
            f'先量出来：film-kit\\.venv\\Scripts\\python.exe film-kit\\tools\\beat_probe.py <曲子文件>，'
            f'再把 beat 和 phase 写进 film.json 的 music.tracks.{name}。')
    return str(name), float(beat), g.get('from', 'sec:0')


def audio_stats(path) -> dict:
    """整体响度 + 真峰值（ffmpeg ebur128 的 Summary）。"""
    r = run([which('ffmpeg'), '-v', 'info', '-i', str(path), '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
            quiet=True)
    text = r.out
    tail_txt = text[text.rfind('Summary'):] if 'Summary' in text else text
    out = {'lufs': None, 'peak': None}
    m = re.search(r'I:\s*(-?\d+(?:\.\d+)?)\s*LUFS', tail_txt)
    if m:
        out['lufs'] = float(m.group(1))
    m = re.search(r'Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS', tail_txt)
    if m:
        out['peak'] = float(m.group(1))
    out['text'] = ' '.join(tail_txt.split())
    return out


def decode_errors(path) -> str:
    """整片解码一遍，返回错误输出（空字符串=没报错）。"""
    r = run([which('ffmpeg'), '-v', 'error', '-i', str(path), '-f', 'null', '-'], quiet=True, check=False)
    txt = (r.stdout or b'').decode('utf-8', 'replace') + (r.stderr or b'').decode('utf-8', 'replace')
    return '\n'.join([x for x in txt.splitlines() if x.strip()][:20])


def video_info(path) -> dict:
    d = ffprobe_json(path, 'format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,'
                           'sample_rate,channels,nb_frames')
    v = next((s for s in d.get('streams', []) if s.get('codec_type') == 'video'), {})
    a = next((s for s in d.get('streams', []) if s.get('codec_type') == 'audio'), {})
    num, _, den = (v.get('r_frame_rate') or '0/1').partition('/')
    fps = (float(num) / float(den or 1)) if float(den or 1) else 0.0
    return {
        'duration': float(d.get('format', {}).get('duration') or 0),
        'size': int(d.get('format', {}).get('size') or 0),
        'vcodec': v.get('codec_name'),
        'acodec': a.get('codec_name'),
        'width': int(v.get('width') or 0),
        'height': int(v.get('height') or 0),
        'fps': fps,
        'sample_rate': a.get('sample_rate'),
        'channels': a.get('channels'),
    }


def frame_count(path) -> int:
    """数一段视频里真实的视频包数（分段渲染核验用）。"""
    r = run([which('ffprobe'), '-v', 'error', '-count_packets', '-select_streams', 'v:0',
             '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', str(path)], quiet=True, check=False)
    txt = (r.stdout or b'').decode('utf-8', 'replace').strip().splitlines()
    for line in txt:
        line = line.strip().strip(',')
        if line.isdigit():
            return int(line)
    return -1
