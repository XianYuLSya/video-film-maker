"""开一部新片：把片场模板拷成一部能直接跑的新工程。

用法（任何目录下都行，<片场> 是 film-kit 目录）：
    <片场>\\.venv\\Scripts\\python.exe <片场>\\tools\\new_film.py <作品名>
    tools\\new_film.py <作品名> --from <模板目录> --out-root <工程根目录> --out-dir <成品目录>
    tools\\new_film.py <作品名> --kind product     产品片（品牌片、发布片）：无口播、按拍排时间、用 cine 镜头包
    tools\\new_film.py --fill <工程目录>            只把片场 local\\ 的自备素材（音效、片头片尾）拷进这部片子的 film\\public\\
                                                  （模板自己也一样：--fill <片场>\\template）

工程根目录和成品根目录读片场的本机配置 kit.local.json（workRoot / outRoot，样例 kit.local.example.json）；
没有这个文件时，工程建在 <片场>\\works\\<作品名>\\、成品放 <片场>\\成品\\<作品名>\\。

做的事：
1. 在 <工程根目录>\\<作品名>\\ 建工程（已存在就报错退出，不覆盖）
2. 拷模板的 film\\（src、scripts、tsconfig.json、package.json）、vo\\、film.py、film.cmd、film.json
   （public 里的公共素材实拷一份；片场 local\\ 里的自备素材——音效、片头片尾——也拷进 public）
3. node_modules 用目录联接（Junction）指到 film-kit\\node_modules —— 全片场只有一份运行时
4. 改 film.json 里的作品名、成品目录、成片名；film.cmd 里写上片场 Python 的位置
5. 验证 node 能 import remotion（联接可用），打印下一步
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]          # film-kit
DEFAULT_TEMPLATE = KIT / 'template'
SHARED_MODULES = KIT / 'node_modules'
LOCAL = KIT / 'local'                               # 自备素材（不随片场分发），见 素材自备.md
LOCAL_ITEMS = ('sfx', 'intro.mp4', 'outro.mp4')    # 拷进 film\public 的那几样（配乐不拷，music.dir 留空时直接读 local\bgm）
PY_LINE = 'if not defined PY set "PY=%~dp0..\\.venv\\Scripts\\python.exe"'


def kit_local() -> dict:
    """片场本机配置 kit.local.json（不进仓库）。"""
    f = KIT / 'kit.local.json'
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding='utf-8-sig'))
    except json.JSONDecodeError as ex:
        fail(f'kit.local.json 不是合法 JSON：第 {ex.lineno} 行第 {ex.colno} 列 —— {ex.msg}', f'改 {f}')


DEFAULT_ROOT = KIT / 'works'                       # 没有 kit.local.json 时的缺省
DEFAULT_OUT = KIT / '成品'

RECORD_MD = """# {name} · 制作记录

> 边做边写。一节一句话也行，缺的宁可空着，不要补想象中的内容。

## 片子规格

片名、成品文件名、时长、配乐编排（曲目 + 从第几小节）、接不接片头片尾 —— 一行说清这一版最后是什么规格。

## 事实表

稿子里每个事实一行：这条说法是从哪查来的（链接、原文、谁的确认都行）。查不到出处的别写进稿子，挪到「未验证」。

| 说什么 | 出处 |
|---|---|
| | |

## 未验证

查不到出处、这一版就没敢写进稿子的东西：是什么、为什么查不到、谁去补。

## 分镜表

一句一行：这句念什么、给了什么标记 → 画面上发生什么、用哪个积木。

| 句 | 念什么 | 标记 → 画面上发生什么 | 用什么积木 |
|---|---|---|---|
| | | | |

## 审片记录

每轮一段：probe 结果（几个错误、几个提醒，各是什么）、问题表、自查打分（几分、最差的三处是哪里）。

| 帧 | 问题 | 怎么改 | 状态 |
|---|---|---|---|
| | | | |

## 版本与决定

为什么这么取舍（改了什么、放弃了什么、为什么）。说不出理由的先别写。

## skill 与片场的问题

照文档做的时候遇到的没讲清、讲错、对不上的地方：哪一句文档、当时在做什么、实际是怎么回事。下一版改文档用。
"""


RECORD_PRODUCT_MD = """# {name} · 制作记录（产品片）

> 边做边写。一节一句话也行，缺的宁可空着，不要补想象中的内容。
> 流程和每一步的过关条件看 skill video-film-maker 的 references\\产品片\\总纲.md；镜头怎么写看 film\\src\\cine\\手册.md。

## 片子规格

片名、成品文件名、时长、曲子和速度、有没有无配乐版 —— 一行说清这一版最后是什么规格。

## 产品简报

这条片子证明什么（一句话）：

| # | 卖点（官网原话） | 出处 |
|---|---|---|
| | | |

可以展示的界面状态：

不能露的信息（真实账号、IP、端口、密钥、第三方软件名……）：

## 文案

主陈述：

| 镜头 | 大字 | 副句 | 对应卖点 # |
|---|---|---|---|
| | | | |

## 节拍数据

曲子、一拍多少秒、第一拍在第几秒、第几拍进满、第几拍回落；数是怎么量的（tools\\beat_probe.py 的输出贴这里）。

## 分镜表（按拍号）

| # | 拍号（秒） | 证明什么 | 主角 | 动作演的是什么 | 机位 | 大字／副句 | 接下一镜头 | 音效 |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

## 取帧表

每一轮审片照着取：每个镜头的落定帧（--at）、每个主动作（--every 0.15）、每个接缝（--every 0.07）。

| 取什么 | 秒数 | 看什么 |
|---|---|---|
| | | |

## 风格帧评审

自评表、上级的回复原文、改了什么。**上级没有明确回复「通过」之前，不做整片。**

## 审片记录

每轮一段：probe 结果、亮度（tools\\look_check.py）、问题表、数数表。

| 帧 | 问题 | 怎么改 | 状态 |
|---|---|---|---|
| | | | |

| 数什么 | 规矩 | 这一版 |
|---|---|---|
| 镜头数、总时长 | 30–45 秒 7 到 8 个镜头 | |
| 主角不是真实界面的镜头数 | 只有落款 | |
| 亮场镜头数 | 不超过 1 | |
| 全屏级冲击的次数和拍号 | 不超过 3，隔开 | |
| 每句大字完全出现后的停留秒数 | 每句不少于 1.2 秒 | |
| 主陈述落定后的静止秒数 | 全片最长的一次静止 | |
| 落款全部落定后的静止秒数 | 不少于 2 秒 | |
| 用了几种主动作、几种转场，有没有重复 | 主动作不重复；转场不连用同一种 | |

## 判例自检报告

按 references\\产品片\\审美判例.md 的编号逐条写「过」或「不过（哪个镜头、哪一帧）」。

## 有意不照判例做的地方

哪一条、为什么、谁同意的。

## 未验证

曲子的气质；配乐接缝的听感；每条音效听不听得见；连续播放时快动作的观感；查不到出处的事实。

## 版本与决定

为什么这么取舍（改了什么、放弃了什么、为什么）。

## skill 与片场的问题

照文档做的时候遇到的没讲清、讲错、对不上的地方：哪一句文档、当时在做什么、实际是怎么回事。
"""


def log(s: str):
    print(f'  {s}', flush=True)


def setup_stdout():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass


def fail(msg: str, hint: str = ''):
    print(f'\n✗ {msg}', flush=True)
    if hint:
        print(f'  怎么办：{hint}', flush=True)
    sys.exit(2)


def link_modules(film_dir: Path):
    """用 PowerShell 建目录联接。cmd 的 mklink 在中文路径下会失败（argv 被打坏），PowerShell 稳。

    注意：模板里的 film\\node_modules 本身就是个指向 film-kit\\node_modules 的目录联接，
    拷贝模板时**不拷它**（上面只拷 src / scripts / tsconfig / package.json / public），
    这里统一重新建一个。1.2 GB 的运行时永远只有片场根那一份。
    """
    target = film_dir / 'node_modules'
    if target.exists():
        # 极少数情况下目标已经存在：确认它是不是指到片场运行时，不是就报错，别硬覆盖
        real = os.path.realpath(target)
        want = os.path.realpath(SHARED_MODULES)
        if real == want:
            log(f'film\\node_modules 已是指向片场运行时的联接，跳过：{real}')
            return
        fail(f'{target} 已存在，但指向 {real}，不是片场运行时',
             f'把它挪走（或改成 New-Item -ItemType Junction -Target "{SHARED_MODULES}"）后重跑。')
    if not SHARED_MODULES.exists():
        fail(f'片场运行时不存在：{SHARED_MODULES}',
             'film-kit\\node_modules 是全体作品共用的一份，先从旧片拷一份回来（或 npm install）。')
    cmd = ['powershell', '-NoProfile', '-NonInteractive', '-Command',
           f"New-Item -ItemType Junction -Path '{target}' -Target '{SHARED_MODULES}' | Out-Null"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0 or not target.exists():
        err = (r.stderr or b'').decode('utf-8', 'replace') or (r.stdout or b'').decode('utf-8', 'replace')
        fail(f'建目录联接失败：{target} → {SHARED_MODULES}\n{err.strip()[:400]}',
             f'手工执行：New-Item -ItemType Junction -Path "<新片>\\film\\node_modules" -Target "{SHARED_MODULES}"')


def fill_local(work: Path, quiet: bool = False) -> list[str]:
    """把片场 local\\ 的自备素材（音效、通用片头片尾）拷进 <work>\\film\\public\\。返回缺了哪几样。"""
    pub = work / 'film' / 'public'
    if not pub.exists():
        fail(f'{pub} 不存在', '--fill 要指到作品根目录（里面有 film\\public\\），或片场的 template。')
    missing = []
    for name in LOCAL_ITEMS:
        src = LOCAL / name
        if not src.exists():
            missing.append(name)
            continue
        if src.is_dir():
            shutil.copytree(src, pub / name, dirs_exist_ok=True)
        else:
            shutil.copy2(src, pub / name)
    if not quiet:
        got = [n for n in LOCAL_ITEMS if n not in missing]
        if got:
            log(f'自备素材已拷进 film\\public：{"、".join(got)}')
    if missing:
        log(f'注意：片场 local\\ 里没有 {"、".join(missing)}（这些不随片场分发）。'
            '缺音效时 audio 那一步会停；缺片头片尾时要么放自己的，要么在 film.json 写 "stings": false。'
            f'清单和来源见 {KIT / "素材自备.md"}')
    return missing


def set_python(dst: Path):
    """film.cmd 里默认找 <模板>\\..\\.venv（模板在片场里才成立）；新片在别处，改成片场 Python 的绝对路径。"""
    f = dst / 'film.cmd'
    py = KIT / '.venv' / 'Scripts' / 'python.exe'
    text = f.read_text(encoding='ascii', errors='strict') if f.exists() else ''
    if PY_LINE not in text:
        log('film.cmd 里没找到默认 Python 那一行，没改（跑之前可以设环境变量 FILM_PYTHON）')
        return
    if not str(py).isascii():
        log(f'注意：片场路径有非 ASCII 字符（{py}），film.cmd 只能写 ASCII，没改；跑之前设环境变量 FILM_PYTHON 指到它')
        return
    f.write_text(text.replace(PY_LINE, f'if not defined PY set "PY={py}"'), encoding='ascii')


def check_import(film_dir: Path) -> bool:
    """验证 film 目录里 node 真的能 import remotion（联接生效、版本对得上）。"""
    code = "import('remotion').then(m=>console.log('ok', typeof m.registerRoot)).catch(e=>{console.error(e.message);process.exit(1)})"
    r = subprocess.run(['node', '--eval', code], cwd=str(film_dir), capture_output=True)
    out = (r.stdout or b'').decode('utf-8', 'replace').strip()
    err = (r.stderr or b'').decode('utf-8', 'replace').strip()
    if r.returncode != 0:
        log(f'验证失败：{err.splitlines()[0] if err else "未知错误"}')
        return False
    log(f'验证通过：node 能从 film\\node_modules 载入 remotion（{out}）')
    return True


def main(argv=None):
    ap = argparse.ArgumentParser(description='开一部新片（拷片场模板）')
    ap.add_argument('name', nargs='?', default='', help='作品名，工程建在 <out-root>\\<作品名>')
    ap.add_argument('--from', dest='template', default=str(DEFAULT_TEMPLATE), help='模板目录（默认 film-kit\\template）')
    ap.add_argument('--out-root', default='', help='工程放哪（默认 kit.local.json 的 workRoot，没有就是 <片场>\\works）')
    ap.add_argument('--out-dir', default='', help='成品目录（默认 kit.local.json 的 outRoot\\<作品名>，没有就是 <片场>\\成品\\<作品名>）')
    ap.add_argument('--fill', default='', metavar='工程目录', help='只把片场 local\\ 的自备素材拷进这个工程的 film\\public\\，不开新片')
    ap.add_argument('--kind', default='tutorial', choices=['tutorial', 'product'],
                    help='片子类型：tutorial 教程片（默认，带口播）；product 产品片（品牌片、发布片：无口播、按拍排时间、用 cine 镜头包）')
    a = ap.parse_args(argv)
    if a.fill:
        return 1 if fill_local(Path(a.fill)) else 0
    if not a.name:
        ap.error('要给作品名（或用 --fill <工程目录> 只补自备素材）')
    local_cfg = kit_local()
    out_root = Path(a.out_root or local_cfg.get('workRoot') or DEFAULT_ROOT)
    out_base = Path(local_cfg.get('outRoot') or DEFAULT_OUT)
    prefix = str(local_cfg.get('filePrefix') or '')

    tpl = Path(a.template)
    if not (tpl / 'film.py').exists() or not (tpl / 'film').exists():
        fail(f'模板不完整：{tpl} 里应该有 film.py 和 film\\ 目录')
    dst = out_root / a.name
    if dst.exists():
        fail(f'目标目录已存在：{dst}', '换个名字，或先把旧工程挪走（片场不覆盖已有工程）。')

    out_dir = Path(a.out_dir) if a.out_dir else out_base / a.name
    print(f'开新片：{a.name}\n  工程 → {dst}\n  成品 → {out_dir}\n  模板 → {tpl}', flush=True)

    dst.mkdir(parents=True)
    # 1) 根目录的驱动
    for f in ('film.py', 'film.cmd'):
        shutil.copy2(tpl / f, dst / f)
    set_python(dst)
    # 2) film 工程（不含 public，public 单独实拷；不含 node_modules）
    film_dst = dst / 'film'
    film_dst.mkdir()
    shutil.copy2(tpl / 'film' / 'tsconfig.json', film_dst / 'tsconfig.json')
    shutil.copy2(tpl / 'film' / 'package.json', film_dst / 'package.json')
    for sub in ('src', 'scripts'):
        shutil.copytree(tpl / 'film' / sub, film_dst / sub)
    # 3) public：公共素材实拷（字体、音效、纸纹、角色、片头片尾）。
    #    不带 public\vo：那里面是上一部片子的人声，新片一跑 voice 会自己生成（现在也改到 build\ 了）。
    if (tpl / 'film' / 'public').exists():
        shutil.copytree(tpl / 'film' / 'public', film_dst / 'public', ignore=shutil.ignore_patterns('vo'))
    else:
        fail('模板里没有 film\\public（公共素材）')
    #    自备素材（音效、片头片尾）以片场 local\ 为准，再盖一遍
    fill_local(dst)
    # 4) vo 脚本：只拷 .py，不拷 __pycache__ / 配音缓存 / 任何 wav
    (dst / 'vo').mkdir()
    for f in sorted((tpl / 'vo').glob('*.py')):
        shutil.copy2(f, dst / 'vo' / f.name)
    # 5) node_modules 目录联接
    link_modules(film_dst)
    # 6) film.json：填好作品名、成品目录、成片名
    #    utf-8-sig 读：模板的 film.json 可能被人用 Set-Content -Encoding UTF8 存过（带 BOM）
    cfg = json.loads((tpl / 'film.json').read_text(encoding='utf-8-sig'))
    cfg['name'] = a.name
    cfg['outDir'] = str(out_dir)
    cfg['videos'] = {'zh': f'{prefix}{a.name.lstrip("_")}_1080p60.mp4',
                     'short': f'{prefix}{a.name.lstrip("_")}_竖屏短版_1080x1920.mp4'}
    product = a.kind == 'product'
    if product:
        # 产品片：只做正片、不要通用片头片尾、没有口播留白；时间按拍子排（先用内置记了拍长的 house 起步，
        # 定了曲子之后用 tools\\beat_probe.py 量出 beat / phase，写进 music.tracks 再改 grid）。
        cfg['versions'] = ['zh']
        cfg['videos'] = {'zh': f'{a.name.lstrip("_")}_1080p60.mp4', 'short': ''}
        cfg['stings'] = False
        cfg['pacing'] = {'gap': 0.34, 'chapterGap': 0, 'leadLine': 0, 'leadBubble': 0, 'bubbleGap': 0, 'tail': 0}
        mus = cfg.get('music') or {}
        mus.update({
            'default': 'house',
            'grid': {'track': 'house', 'from': 'sec:0'},
            'segments': [{'from': 'beat:0', 'track': 'house', 'bar': 0}],
            'duck': {'speak': -15.0, 'gap': 0.0, 'bubble': -6.0, 'sting': 0.0, 'open': 0.0},
            'openUp': [],
            'fadeIn': 0.05,
            'fadeOut': 2.0,
        })
        cfg['music'] = mus
        cfg['audio'] = {**(cfg.get('audio') or {}), 'alsoNoMusic': True}
    (dst / 'film.json').write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding='utf-8')
    log(f'film.json 已写好：name={a.name}，outDir={out_dir}')
    if product:
        # 起步工程：三个镜头的产品片骨架（用镜头包自带的示例界面），盖到工程上；教程片的示范场景挪到 _示范场景\\
        starter = tpl / 'product-starter'
        if not starter.exists():
            fail(f'模板里没有产品片起步工程：{starter}')
        keep = dst / '_示范场景'
        keep.mkdir()
        for f in sorted((film_dst / 'src' / 'scenes').glob('*.tsx')):
            if f.name != 'common.tsx':
                shutil.move(str(f), str(keep / f.name))
        shutil.copytree(starter, dst, dirs_exist_ok=True)
        if (tpl / 'cine-demo').exists():
            shutil.copytree(tpl / 'cine-demo', dst / 'cine-demo')
        log('已换成产品片起步工程：film\\src\\shots\\（三个镜头）、scenes\\Film.tsx、按拍的 script.json；截图清单的例子在 cine-demo\\')
    # 7) 制作记录：边做边填
    (dst / '制作记录.md').write_text((RECORD_PRODUCT_MD if product else RECORD_MD).format(name=a.name), encoding='utf-8')
    log('制作记录.md 已建好' + ('（产品片：产品简报 / 文案 / 节拍数据 / 分镜表 / 取帧表 / 风格帧评审 / 审片记录 / 判例自检 …）' if product
                         else '（片子规格 / 事实表 / 未验证 / 分镜表 / 审片记录 / 版本与决定 / skill 与片场的问题）'))

    ok = check_import(film_dst)
    # 体量只算实文件（node_modules 是目录联接，算进去会把共享运行时重复计一次）
    size = sum(p.stat().st_size for p in dst.rglob('*')
               if p.is_file() and 'node_modules' not in p.parts) / 1e6
    print(f'\n建好了：{dst}（{size:.0f} MB，node_modules 是指向片场运行时的目录联接，不占额外空间）', flush=True)
    if product:
        print('\n下一步（在新工程目录下；先读 film\\src\\cine\\手册.md）：', flush=True)
        print('  1. .\\film.cmd voice zh        算时间表和拍子网格（不联网；改了稿子、曲子都要重跑）', flush=True)
        print('  2. .\\film.cmd lint            体检（会提醒一句「场景里没有引用稿子」，产品片按拍取时间，可以不管）', flush=True)
        print('  3. .\\film.cmd review zh --round r1   抽帧看起步工程长什么样', flush=True)
        print('  4. 换成你的产品：写截图清单、截界面（手册「截界面」）→ 改 shots\\common.ts → 一个镜头一个文件地写', flush=True)
        print('  5. 定曲子：tools\\beat_probe.py 量拍子，写进 film.json 的 music.tracks 和 music.grid', flush=True)
        print('  6. .\\film.cmd render zh → audio zh → mux zh → check zh', flush=True)
        if not ok:
            print('\n注意：remotion 载入验证没过，先修 film\\node_modules 联接再跑。', flush=True)
            return 1
        return 0
    print('\n下一步（在新工程目录下）：', flush=True)
    print('  1. 改 film\\src\\script.json 和 film\\src\\scenes\\ —— 模板自带一部能直接跑通的示范片', flush=True)
    print('  2. .\\film.cmd lint            先体检稿子', flush=True)
    print('  3. .\\film.cmd all zh          配音→体检→渲染→混音→合成→成片体检（第一条命令就要联网）', flush=True)
    print('  4. .\\film.cmd review zh       出一轮审片图 + index.md', flush=True)
    print('  5. 竖屏短版：改 film\\src\\script_short.json 和 film\\src\\short\\Short.tsx，然后 .\\film.cmd all short', flush=True)
    print('  6. 边做边填 制作记录.md（片子规格 / 事实表 / 未验证 / 分镜表 / 审片记录 / 版本与决定 / skill 与片场的问题），交回时一起给', flush=True)
    if not ok:
        print('\n注意：remotion 载入验证没过，先修 film\\node_modules 联接再跑。', flush=True)
        return 1
    return 0


if __name__ == '__main__':
    setup_stdout()
    sys.exit(main())
