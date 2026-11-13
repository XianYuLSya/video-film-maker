# 片场（film-kit）

一部片子一套工程，一条命令一个环节。稿子改了就重跑配音，画面不用动；
所有写死的东西（作品名、路径、念法、配乐、分段、并发）都在 `film.json` 里。

```
开新片      .venv\Scripts\python.exe tools\new_film.py <作品名>          （在片场根目录下跑）
开产品片    .venv\Scripts\python.exe tools\new_film.py <作品名> --kind product   （品牌片、发布片：无口播、按拍排时间）
跑完一部    .\film.cmd all zh
竖屏短版    .\film.cmd all short
看下一步    .\film.cmd status
```

文中 `<片场>` 指 film-kit 这个目录本身，`<workRoot>` / `<outRoot>` 是 `kit.local.json` 里写的工程根和成品根。

## 第一次装（新机器）

1. 装 Node.js（20 以上）、Python 3.11、FFmpeg（`ffmpeg`、`ffprobe` 要在 PATH 里）。
2. 在片场根目录：`npm install`（装 Remotion 运行时到 `node_modules\`），`python -m venv .venv`，`.venv\Scripts\python.exe -m pip install -r requirements.txt`。
3. 复制 `kit.local.example.json` 为 `kit.local.json`，改成自己的工程根、成品根、成片名前缀（都可以不写）。**系统盘小的话把 `tempDir` 指到别的盘的一个专用空目录**（比如片场下的 `.tmp`）：渲染用的浏览器每开一次，就在临时目录留一个 `puppeteer_dev_chrome_profile-*`，不会自己删，抽帧、量版面、分段渲染各开各的，几天能攒出几十 G。配了 `tempDir` 以后，渲染进程的临时文件都写到那里，片场每次开工清掉放了六小时以上的；不配就照旧写系统临时目录、也不清。
4. 照 [素材自备.md](素材自备.md) 把音效、配乐（和可选的片头片尾）放进 `local\`，再跑一次 `.venv\Scripts\python.exe tools\new_film.py --fill template` 把它们拷进模板。
5. 模板自己的 `film\node_modules` 要是指向片场 `node_modules` 的目录联接：`New-Item -ItemType Junction -Path "template\film\node_modules" -Target "<片场>\node_modules"`。

## 许可与第三方

- 片场自己的代码和文档：见仓库根目录的许可证。
- 随片场分发的第三方东西（字体、Lucide 图标路径）和要自己装的依赖（Remotion、edge-tts、FFmpeg……）：见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。两条要特别知道：
  - **Remotion 不是 OSI 定义的开源软件**，是源码可见、按自己的许可授权：个人和 3 人以内的团队免费（含商用），更大的公司要买 Company License。片场只把它当 `package.json` 依赖，不带它的代码。
  - **配音用的 edge-tts（LGPLv3）调用的是微软 Edge 朗读接口，不是公开的官方 API**，随时可能失效；要稳定或商用，换成正规 TTS 服务。
- 音效、配乐、片头片尾不随片场分发：见 [素材自备.md](素材自备.md)。
- `template\film\src\ui\` 里的产品界面示意和品牌图形：见 [TRADEMARKS.md](TRADEMARKS.md)。

---

## 目录地图

```
film-kit\
├─ .venv\                  片场唯一的 Python 环境（numpy / scipy / pillow / edge-tts）
├─ requirements.txt        上面那个环境的依赖清单
├─ node_modules\           片场唯一的 Remotion 运行时（所有作品共用，新片用目录联接指过来）
├─ assets\                 每部片子都一样、可以随片场分发的公共素材（fonts / tex / char，各带一份来源说明）
├─ local\                  自备素材，不随片场分发（sfx / bgm / intro.mp4 / outro.mp4），见 素材自备.md
├─ kit.local.json          本机配置（工程和成品放哪、成片名前缀、浏览器、渲染临时目录 tempDir），不进仓库；样例 kit.local.example.json
├─ .tmp\                   渲染临时目录（tempDir 指到这里时才有），不进仓库，片场自己按时间清
├─ tools\
│   ├─ new_film.py         开新片（--kind product 开产品片）
│   ├─ beat_probe.py       量一首曲子的拍长和第一拍；成片回测拍点
│   ├─ look_check.py       量一批静帧的亮度，拼「手机视角」小图
│   └─ sheet.py            拼图：全片连看、100% 裁切、左右并排
├─ template\               模板 = 一部能直接跑通的示范片（也是给助手抄的范文）
│   ├─ film.json           作品配置（带中文说明）
│   ├─ film.py             驱动脚本（子命令都在这儿）
│   ├─ film.cmd            入口：用片场的 Python 跑 film.py
│   ├─ vo\                 tts / music / sfx / mix / srt / check / art + common（公用）
│   ├─ film\               Remotion 工程：src（Root / Film / lib / kit / ui / blocks / scenes / short）、scripts、public
│   │   └─ node_modules → 目录联接，指到 film-kit\node_modules（模板自己也能直接渲）
│   ├─ review\             样本：final_zh\、final_short\ 是「合格长什么样」的审片帧
│   └─ build\              模板自己跑出来的中间文件（分段、缓存、日志）
└─ README.md               本文件
```

一部新片建在 `<workRoot>\<作品名>\`（`workRoot` 写在 `kit.local.json`，没写就是片场下的 `works\`），结构就是 `template\` 去掉 `assets`：

```
<作品名>\
├─ film.json       作品配置（name / outDir / 成片名 / 念法 / 配乐 / 渲染参数）
├─ film.py         ← 驱动，随片拷走
├─ film.cmd        ← .\film.cmd <子命令>
├─ 制作记录.md      边做边填：片子规格 / 事实表 / 未验证 / 分镜表 / 审片记录 / 版本与决定 / skill 与片场的问题
├─ vo\             声音链的各个脚本（只有 .py；也能单独跑：python vo\music.py zh）
├─ film\
│   ├─ node_modules → 目录联接，指到 film-kit\node_modules（不占额外空间）
│   ├─ public\      公共素材实拷（字体、音效、纸纹、角色、片头片尾）
│   ├─ scripts\     stills.mjs / sfxlist.mjs / probe.mjs
│   └─ src\         script.json / script_short.json / timing_*.json / Film.tsx / Root.tsx / lib / kit / ui / blocks / scenes / short
├─ build\          中间文件（可整个删）：人声 voice_*.wav、配乐 music_*.wav、混音 mix_*.wav、
│                  配音缓存 tts_cache\、分段 chunks_*\、音效清单与音效轨、日志 logs\
└─ review\         审片：<轮次>_<键>\（index.md、probe.md、抽帧）、check_<键>.md、clips\
```

新片建出来只有「示范稿 + 配套时间表」：可以直接 `review` 抽帧；第一次 `voice` 会重新合成全部句子（缓存是空的），这是正常的。

### 运行时只有一份（这条最容易踩）

- 全片场只有 `film-kit\node_modules`（1.2 GB 的 Remotion 运行时）。
- 作品的 `film\node_modules` 是**指向它的目录联接**（Junction），`tools\new_film.py` 会自动建并验证。
- 模板自己同理：`template\film\node_modules` 也是这种联接，所以**在模板里也能直接 lint / 抽帧 / 渲染**。
  万一它丢了，`film.py` 会沿作品根往上找 `node_modules`，仍然找得到片场根那份；但 `tsc` 和 `node`
  包解析还需要这个联接，重建一条最省事：
  `New-Item -ItemType Junction -Path "<作品>\film\node_modules" -Target "<片场>\node_modules"`
- `new_film.py` **不拷 node_modules**（也不会把联接拷坏）：它只拷 src / scripts / tsconfig / package.json / public，
  然后在目标里新建联接。拷过去以后不要往 `film\node_modules` 里装东西 —— 那是共享的那一份。

---

## 子命令

全部在作品根目录下跑，`<键>` 是 `zh`（正片，默认）或 `short`（竖屏短版）。
`short` 要看 `film.json` 的 `versions` 有没有开（默认开着）：写成 `["zh"]` 之后，`lint` / `status` / `all`
都不再管短版，跑 `.\film.cmd <命令> short` 会直接提示「这部片子的 film.json 没有开短版」。

| 命令 | 一句话 | 例子 |
|---|---|---|
| `lint` | 不渲染的稿子体检：id 重复、章节不存在、标记重名、句子太长、场景引用了不存在的句子/标记、没登记的英文数字；场景只查 `scenes\index.ts` 登记到的那些（登记不到的在 `scenes\` 里列一条提醒）；最后跑一遍 `tsc --noEmit` 抓类型错误 | `.\film.cmd lint` |
| `voice` | 配音 + 时间表；按文本缓存，只重合成变了的句子 | `.\film.cmd voice zh` |
| `stills` | 抽任意秒数的静帧。一次传几百个秒数也行：张数超过 50 会自动分批（`--batch` 改批大小，`0` = 不分批） | `.\film.cmd stills FilmZh 5 12.5 30`；150 张：`.\film.cmd stills FilmZh 0 0.1 0.2 … 14.9` |
| `review` | 按稿子自动选时间点抽帧 + 写 `index.md`（每张图列出秒数/章节/句/标记/字幕/原文）。另外还认 `--at` / `--every`（见下）。输出目录带版本后缀：`review\r1_zh\` | `.\film.cmd review zh --round r1` |
| `probe` | 自动排版体检：出画、压字幕、字太小、文字重叠、被裁切（不出图，量版面）。时间点取法和 review 一样（含垫片），同样认 `--at` / `--every`；结果写到 `review\r1_zh\probe.md` | `.\film.cmd probe zh --round r1` |
| `render` | 分段渲染无声画面；已渲好的段跳过，断了接着来。**它看不出画面代码改没改**：改了场景要么 `--fresh` 整片重渲，要么 `--from/--to` 重渲改过的那几秒；跳过的段比画面代码旧时会提醒 | `.\film.cmd render zh`；只重渲一段：`.\film.cmd render zh --from 12 --to 20`；整片重渲：`.\film.cmd render zh --fresh` |
| `audio` | 配乐 → 音效清单 → 音效轨 → 混音，结束打印响度和真峰值 | `.\film.cmd audio zh` |
| `mux` | 合成到成品目录（画面拷贝 + AAC 320k + faststart），同时写 SRT | `.\film.cmd mux zh` |
| `check` | 成片体检：解码、规格、时长对时间表、响度/真峰值、音轨不是静音、字幕条数/宽度，出表格和 `review\check_<键>.md` | `.\film.cmd check zh` |
| `art` | 把 `art\raw\` 的原图处理成片中素材（角色贴纸抠图 / 整张插画缩放） | `.\film.cmd art`；只处理几张：`.\film.cmd art fish_work` |
| `clip` | 切一段审看片段（给听不懂声音的助手用） | `.\film.cmd clip zh 12 30`；只要音频：`.\film.cmd clip zh 12 30 --audio-only` |
| `status` | 各步产物在不在、哪个比稿子旧、下一步该跑什么 | `.\film.cmd status` |
| `all` | `voice → lint → render → audio → mux → check`，任何一步失败就停 | `.\film.cmd all zh` |

`review` / `probe` 的 `--only cold,made` 只做指定章节（管的是**自动**取的那些点；`--at` / `--every`
点名的秒数不受它影响）。

### review / probe 怎么点名要看的秒数

| 参数 | 作用 |
|---|---|
| `--at 3`、`--at 3,8,12.5`、`--at 3 --at 8` | 在自动取的点之外，再抽这些秒数（可重复，也能逗号分隔） |
| `--every 0.15` | 按固定间隔取点，给「连续看运动用」——过场顺不顺、镜头推拉是否抖，就看这个 |
| `--from 5 --to 8` | 配合 `--every` 限定范围；不写就是全片 |

```powershell
.\film.cmd review zh --round r2 --every 0.15 --from 5 --to 8   # 5–8 秒每 0.15 秒一张（约 20 张）
.\film.cmd review zh --round r3 --at 12.5 --at 30,42           # 另外点名要看这几秒
.\film.cmd probe zh --round r2 --at 12.5                        # probe 认同样的参数
```

`--at` / `--every` 点名的点**不参与**「相邻不足 0.4 秒的合并」（不然 `--every 0.15` 会被合并规则吃光），
也不受 `--only` 影响；只有和自动点撞得极近（0.05 秒以内，等于同一帧）时才去重。清单和体检表开头会写一行
「另外指定：--every 0.15s（5–8s）」，方便事后核对这批图是怎么来的。

### 排版体检测什么（probe）

同一批时间点各渲一帧（图写到临时目录，用完就删），让 `kit\probe.tsx` 把每个文字块的实际矩形、
字号、透明度乘积量出来，再判：

- 出画：可见文字超出画布 2px 以上 → 错误
- 压字幕：可见文字和字幕条相交 → 错误
- 字太小：实际显示字号 < 22px → 错误；22–26px → 提醒
- 文字重叠：两块互不为祖孙的可见文字交叠超过较小者 30% → 提醒
- 被裁切：祖先 `overflow:hidden` 且文字超出它的可见范围 → 提醒
- 窗口压字幕条：模拟窗口（带 `data-probe="skip"` 的那个元素本身）可见时，它的外接矩形和字幕条
  相交 → 提醒「模拟窗口压到字幕区」，写明窗口矩形。字幕条当前没显示时按固定区域算：
  正片 y ≥ 940，短版按 `short\Short.tsx` 里字幕的 top 到 top+120（1510–1630）。
  同一个窗口不管报了哪几个时间点，都只列一条（写起止秒数）。
  铺满整个画布的 `skip` 元素（例如包 DemoMark 的那层 `inset:0` 外壳）不算窗口，不报这条。

几个约定（写场景时用得上）：

- 字幕条最外层带 `data-probe="subtitle"`（`kit\overlay.tsx`、`short\Short.tsx` 已经加了）。
- 模拟界面内部的小字不算数：窗口组件最外层加 `data-probe="skip"`（`ui\` 里的 Browser、FaWindow、
  CodexWin、ChatWin、DshWin、Term、TeamTable 已经加了）。自己新画模拟窗口时也加一个。
  `skip` 子树里的文字**豁免「出画」「被裁切」「字太小」「文字重叠」四条**——模拟界面不是正文，
  镜头推近时窗口里的文字被画面边缘裁掉、字比正文小，都是设计，不是排版错（试用时一轮报了 72 条，全是这个）；
  **「压字幕」照报**：窗口里的字真被字幕盖住，观众就是看不见。
- 窗口整块压到字幕区，不再靠里面的小字报「压字幕」，而是由上面那条「窗口压字幕条」一条提醒说清：
  报的是窗口外框的矩形，改的时候挪窗口，不是改里面的小字。
- 整屏自管的场景（`Scene.bare: true`，见下面「场景外壳画什么，bare 怎么用」）那一刻外壳没有字幕条，
  「压字幕」「窗口压字幕条」两条自动跳过，其余四条照量。
- 「示意画面」角标现在直接用积木库的 `blocks\DemoMark`（右上角），整块标了 `data-probe="skip"`：
  它是画面配件、不是正文，免得每轮都报它「字太小」。它字号是 24（落在体检的 22–26「字偏小」带里），
  要彻底干净得让积木库把 DemoMark 提到 26 以上 —— 这条已报给设计师，改了之后 Film.tsx 去掉那个 skip 即可。
- probe 的时间点故意避开换章过场：只取「标记后 0.9 秒、句末前 0.15 秒、气泡后 1.0 秒」，
  再加上**自己起名的垫片里每 1.0 秒一张**（无口播的品牌片就靠这一段）。
  过场好不好看交给 review 抽帧给人看。通用片头片尾（`intro` / `outro`）是视频素材，probe 不量。

`probe: true` 是通过 `selectComposition` 的 `inputProps` 传进去的（只在 `renderStill` 里传不生效，实测踩过）。

### 分段渲染为什么能续跑

- 每段渲到 `part_XXXXX.tmp.mp4`，渲完才改名成 `part_XXXXX.mp4`：中断不会留下看着像成品的一半文件。
- 重跑时逐段用 `ffprobe -count_packets` 核帧数，对得上就跳过、不对就删掉重渲；拼接前再核一遍。
- 时间表或分段参数变了，签名对不上，旧分段整体挪进 `build\chunks_<键>\stale_<时间>\`（不删），自动重渲，
  不会拿旧帧位凑今天的时间表。

---

## 场景外壳画什么，bare（整屏自管）怎么用

写场景时的默认前提：外壳 `film\src\Film.tsx` 统一画四样东西 —— 纸感底（`#F8F1E4` 底色加 `<Paper/>` 纸纹）、
底部烧录字幕条（`<Subtitles/>`）、小咸鱼无声气泡（`<BubbleSlots/>`）、右上角「示意画面」角标
（`blocks\DemoMark`，场景用 `demo(t)` 声明哪一时刻要）。场景自己只画正文。

深色底的品牌片、片头这类「整屏自己管」的场景，给 `Scene`（`scenes\common.tsx`）加 `bare: true`：

```tsx
// scenes\Open.tsx
import {AbsoluteFill} from 'remotion';
import {S, chapter, sting} from '../lib/time';
import type {Scene} from './common';

const range = () => [chapter('open').start, S('kicker') + 1.2] as const;

const OpenC: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: '#05070c'}}>…自己的底、自己的字，角标要就自己放…</AbsoluteFill>
);

export const OpenScene: Scene = {id: 'open', range, C: OpenC, sfx: () => [], bare: true};
```

生效规则（一句话：**有 bare 就全 bare**）：

- 当前时刻生效的场景（`t` 落在某个场景 `range()` 里）只要有一个 `bare: true`，外壳整屏让开：
  外层底色变纯黑 `#000`（由场景自己铺满）、不画 `<Paper/>`、不画烧录字幕条、不画气泡槽、
  不画「示意画面」角标（场景要的话自己放）。
- 相邻两幕一个 bare 一个不 bare、范围重叠淡入淡出时，按「有 bare 就全 bare」处理 —— 所以 bare 场景的
  `range()` 最好画到下一幕真正接上为止，中间那几帧宁可多黑一点，不要纸底穿帮。
- SRT 字幕照常生成（`vo\srt.py` 不看这里），只是不烧进画面；要画面里有字，场景自己画。
  `check` 里「字幕条数 / 单条宽度」是量 SRT 文件的，不受 bare 影响。
- `probe`：「压字幕」「窗口压字幕条」两条在 bare 的时间点自动跳过（那一刻没有字幕条，判了全是误报）；
  出画 / 字太小 / 文字重叠 / 被裁切四条照旧量。
- 竖屏短版不用这个字段：`short\Short.tsx` 整个外壳是自己写的（纸底、字幕、气泡都是它自己摆的），本来就自管。
- 层叠：外壳现在给每一幕单独包一层、各自成一个层叠上下文（`isolation: isolate`）。所以幕内积木的
  `zIndex`（章节牌 30、Roadmap 50…）只在自己这一幕里比大小，**后登记的幕永远盖在前面的幕上面**
  （`scenes\index.ts` 的约定终于名副其实），bare 的黑底才能整块盖住上一幕、不会从缝里冒出上一幕的章节牌。
  反过来说：别指望用负 `zIndex` 把东西画到别的幕底下 —— 出了这一幕就管不着了。

## 时间怎么取（`lib\time.ts`）

`S('句id')` 这句开口、`E('句id')` 这句念完、`C('句id','标记')` 念到 `{标记}` 那一刻、
`chapter('章')` 一章、`sting('名字')` 垫片（`.start` / `.end`）、`bubble('名字')` 气泡。**一律不写死秒数。**

- `chapter('章').start`：这一章的时间线起点（含换章留白 `chapterGap`）。
- `chapter('章').first`：**这一章第一个条目的开始时刻**。这一章如果以垫片（`sting`）或气泡（`bubble`）打头，
  它**不等于**第一句开口的时刻。要第一句开口就用那一句的 `S('句id')`。
  （时间表里 `chapters[].first` 就是「这一章排到的第一条 item 的 start」，见 `vo\tts.py`。）
- `chapter('章').end`：这一章最后一条的结束时刻。

## 产品片（品牌片、发布片）：按拍排时间、用 cine 镜头包

真实界面当主角的产品片有自己的一套镜头（`film\src\cine\`）和写法，**手册在 `template\film\src\cine\手册.md`**，这里只列片场为它多出来的东西：

- **开工程**：`new_film.py <作品名> --kind product`。建出来是一部能直接跑的三镜头起步工程（`film\src\shots\` 一个镜头一个文件，`scenes\Film.tsx` 接成一卷），`film.json`、`script.json`、`制作记录.md` 都是产品片的写法；教程片的示范场景挪在 `_示范场景\`。
- **拍子网格** `music.grid`：`{"track": "曲名", "from": "sec:0"}`，全片的拍子按这首曲子的拍长走。有了它，稿子里的垫片可以写 `"beats": 8`（占几拍）代替 `dur`，配乐段落的 `from` / `to` 可以写 `beat:64`，场景里用 `B(拍号)` 取时间。`voice` 会把网格写进时间表（`timing_zh.json` 的 `grid`）。
- **自己的曲子**：`music.tracks` 里写 `{"曲名": {"file": "xxx.mp3", "beat": 一拍秒数, "phase": 第一拍秒数}}`，`beat` / `phase` 用 `tools\beat_probe.py <曲子>` 量。写了 `beat` 的曲子可以对小节、可以当网格。
- **整片没有一句口播也能跑完全流程**（实测）：`voice` 不联网，只算时间表；人声轨是静音，混音时自动跳过它。
- **无配乐版**：`"audio": {"alsoNoMusic": true}`，`audio` 另出一条不带配乐的混音，`mux` 另合一条 `…_无配乐.mp4`。
- **截界面**：`node film/scripts/capture.mjs <清单.json>`，见手册「截界面」。
- **审片**：`tools\look_check.py`（亮度、手机视角）、`tools\sheet.py`（拼图、裁切、并排）、`tools\beat_probe.py --check`（成片回测拍点），见手册「审片工具」。转场进行中的那零点几秒不参加 `probe`（画面在飞，不算排版问题）。

## 无口播为主的片子（品牌动画、片头）

整片没有（或几乎没）口播时，稿子不是「句子」，而是「用垫片占时间 + 最后一两句口播」。做法：

```json
"chapters": [{"id": "open", "zh": "开场"}, {"id": "say", "zh": "落一句"}],
"items": [
  {"ch": "open", "sting": "open", "dur": 12},
  {"ch": "say",  "id": "kicker", "zh": "片场能做的，比你想的多。"}
]
```

- `{"sting": "open", "dur": 12}` 是**自己起名的垫片**：名字随便起（`open` / `logo` / `beat1`…），
  占 12 秒画面时间、不念任何东西。配乐段落里可以直接 `"from": "sting:open", "to": "sting:beat1"`。
- `film.json` 的 `stings: false` 只关通用片头片尾（id 为 `intro` / `outro` 那两条），自己起名的垫片
  不受影响 —— 品牌片就靠它撑时间，别担心被剔掉。`voice` 会把剔掉了哪两条打出来。
- 场景里的时间从垫片取：`const t0 = sting('open').start;` 之后全部写 `t0 + 偏移`，不要写绝对秒数。
  最后一句口播用 `S('kicker')` / `E('kicker')` / `C('kicker','标记')`。
- 偏移按配乐拍长算，落在小节线上画面才跟音乐同拍。内置三首（数字来自 `vo\common.py` 的 `BUILTIN_TRACKS`，
  配乐段落 `bar` / `sync` 用的也是这套）：

  | 曲目 | 一拍 | 一小节（4 拍） | 两小节（8 拍） | 第一拍在第几秒 | 速度 |
  |---|---|---|---|---|---|
  | `cat` | 0.4615s | 1.846s | 3.692s | 0.152s | ≈130 BPM |
  | `tonight` | 0.5715s | 2.286s | 4.572s | 0.236s | ≈105 BPM |
  | `house` | 0.4918s | 1.967s | 3.934s | 0.220s | ≈122 BPM |

  垫片时长取整小节最稳：`cat` 6 小节 = 11.08s、7 小节 = 12.92s；`tonight` 5 小节 = 11.43s、
  6 小节 = 13.72s；`house` 5 小节 = 9.84s、6 小节 = 11.80s。场景里的偏移也照小节写
  （例如 `t0 + 2 * 1.846`、`t0 + 3.692`）。
- 深色底、整屏自己管就用上一节的 `bare: true`；不写它，纸感底和烧录字幕条会盖在你的画面上。
- 只有一两句口播时，`pacing` 的 `gap` / `tail` 决定这句前后留多久，片尾想多留就把 `tail` 调大。

### 这种片子怎么审片（review / probe 取点规则）

整片几乎没有口播，只跟口播句走的时间点几乎取不到东西（19 秒的品牌片以前只量到 2 个点）。现在的规矩：

- **自己起名的垫片会自动取点**：每个 `sting`（id 不是 `intro` / `outro` 的那种）在它占的区间里
  **每 1.0 秒取一张、首尾各留 0.3 秒**（避开淡入淡出）；区间短于 2 秒的只取正中一张。
  12 秒的垫片 → 12 张。`review` 和 `probe` 都这么取。
- `index.md` 里这些行的「句」一列写成 `（垫片 open +3.0s）`，意思是**垫片开始后 3.0 秒**，
  对着分镜表上的偏移直接看，不用自己减。
- 通用片头片尾（`intro` / `outro`）不变：`review` 各抽一张（开始后 0.5 秒），`probe` 不量
  —— 那是视频素材，没有场景正文可检。
- 要盯某个具体时刻（logo 落位、字号跳变、卡点）就用 `--at 2.6,7.4` 点名；
  要看垫片里的运动连不连续就用 `--every 0.15 --from 1 --to 4`（会出几十张，审完删掉即可）。
- 垫片里的画面多是整屏自管（`bare: true`），probe 的「压字幕 / 窗口压字幕条」两条自动跳过，其余四条照量。
- 审片顺序建议：先看 `index.md` 里垫片那十几行（每 1 秒一张，能看清每个节拍的入场和停留），
  再 `probe` 确认垫片里字号/出框没问题，最后对着配乐拍长看接缝。

---

## film.json 字段

每片一份，UTF-8。带 `_说明*` 的键是说明，程序不读。

| 字段 | 作用 |
|---|---|
| `name` | 作品名 |
| `outDir` | 成品目录（绝对路径或相对作品根）。新片由 `new_film.py` 写成 `<outRoot>\<name>`；留空则是作品根的 `成品\<name>` |
| `versions` | 做哪几版：`["zh", "short"]`（默认）/ `["zh"]` 表示这部片子不做短版。关掉短版后 lint、status、all 都不处理、不打印 short，`.\film.cmd <命令> short` 会直接提示「这部片子的 film.json 没有开短版」 |
| `videos` | 每版的成片文件名（`zh` / `short`） |
| `srts` | 每版的字幕文件名 |
| `comps` | Remotion 合成名（`FilmZh` / `ShortZh`） |
| `sfxComps` | 导出音效清单用的合成名（`SfxList` / `SfxListShort`） |
| `voice` | 每版的音色和语速（默认 `zh-CN-XiaoyiNeural`、`-3%`） |
| `say` | 念法替换表 `[["DSH","D S H"], …]`，只影响念音，字幕仍按原文 |
| `submax` | 一条字幕的显示宽度上限（汉字 1、英文字母 0.55），短版要小 |
| `pacing` | 句间/换章/换章首句/气泡/片尾的留白秒数，`zh` `short` 可分别覆盖 |
| `stings` | 要不要通用片头片尾；`false` 时**只**剔掉稿子里 id 为 `intro` / `outro` 的两条垫片（`public/intro.mp4`、`outro.mp4`）。自己起名的垫片（`{"sting": "open", "dur": 12}`）不受影响，照常进时间表 |
| `music` | 配乐编排（见下）。`music.dir` 是曲库目录（配乐文件不随片场分发，各人放各人的；留空就用片场的 `local\bgm\`）；`music.grid` 是按拍排时间用的拍子网格（见「产品片」一节） |
| `render` | `chunk` 每段帧数、`concurrency` 并发、`retryConcurrency` 降级并发、`crf`、`timeout`、`gl`、`browser` |
| `dirs` | 中间文件目录 `build`（人声 / 配乐 / 混音 / 配音缓存 / 分段 / 日志）、审片目录 `review` |
| `expect` | 成片规格（宽高帧率），体检按它比 |
| `audio` | 混音目标：`lufs` / `lufsTol` / `truePeak`；`alsoNoMusic: true` 另出一条无配乐版 |

### 配乐一条一段，怎么写

最简，一首铺满全片：

```json
"music": {"default": "cat"}
```

分段，接缝落在小节线上：

```json
"music": {
  "segments": [
    {"from": "sec:0",          "to": "sting:intro", "track": "house", "bar": 0,  "loop": [0, 16]},
    {"from": "ch:a",           "track": "cat",   "bar": 16, "sync": "a1.mark", "loop": [16, 48]},
    {"from": "ch:end", "to": "sec:12.5", "track": "cat", "bar": 48}
  ],
  "duck": {"speak": -15, "gap": -8, "bubble": -6, "sting": -14, "open": -3},
  "openUp": ["bubble:q2"]
}
```

- `from` / `to` 写 `ch:章节` / `line:句子` / `sting:片头` / `bubble:气泡` / `sec:秒数`，也可以直接写数字；不写 `to` 就接下一段的 `from`，最后一段接到片尾。
- `bar` 从第几小节开始放；`sync` 写 `句子.标记`，让那个标记正好落在 `bar` 小节上；`loop` 是 `[起小节, 止小节]`。
- 内置记了拍长的只有 `cat` / `tonight` / `house`。别的曲子写 `"tracks": {"我的曲子": {"file": "xxx.mp3", "beat": 0.4839, "phase": 0.0256}}`：`beat`（一拍秒数）和 `phase`（第一拍在文件里的秒数）用 `tools\beat_probe.py` 量；不写 `beat` 就只能整首铺，不能对小节（脚本会提醒一句，不会静默放错）。
- `from` / `to` 还可以写 `beat:拍号`（要先在 `music.grid` 里定好拍子网格）。
- 曲库目录写在 `film.json` 的 `music.dir`（绝对路径，或相对作品根；留空就用片场的 `local\bgm\`）；`file` 也可以直接写绝对路径。**配乐和音效文件不随片场分发**，文件名和来源见 [素材自备.md](素材自备.md)；找不到文件时脚本会说清楚去哪配。

---

## 示范片在哪看（照着抄就这一套）

模板 `template\` 自带一部能直接跑通的示范片（正片五章约 70 秒 + 竖屏短版约 18 秒），新片建出来就是它。
内容会换，位置不变：

| 要看什么 | 文件 |
|---|---|
| 作品配置（先改这里） | `film.json`（每项都有 `_说明_*`） |
| 正片稿子 / 短版稿子 | `film\src\script.json`、`film\src\script_short.json` |
| 时间怎么取（S / E / C / chapter），场景顶部注释里写了「为什么这么取时间」 | `film\src\lib\time.ts` |
| 场景怎么登记、怎么被播 | `film\src\scenes\index.ts`、`film\src\Film.tsx` |
| 竖屏版式 + 竖屏时间表读取 | `film\src\short\Short.tsx`、`film\src\short\timeShort.ts` |
| 合成怎么注册（正片 / 短版 / 两个音效清单 / 陈列片） | `film\src\Root.tsx` |
| 声音链各步 | `vo\*.py`（`common.py` 是公用件） |
| 「合格长什么样」的样本帧 | `review\final_zh\`、`review\final_short\` |

五个场景，一个文件一幕，写法和用的积木：

| 场景文件 | 章 | 演示什么 | 主要积木 |
|---|---|---|---|
| `scenes\Hook.tsx` | hook 开场：这期讲什么 | 钩子 + 路线图：先抛问题，再把全片路线摆出来 | `Hook`、`Roadmap` |
| `scenes\Script.tsx` | a 一：稿子带标记 | 换章过场切进来 → 章节牌常驻 → 三张卡讲「稿子带标记」；带一个无声气泡 | `ChapterBreak`、`ChapterTag`、`CardRow` |
| `scenes\Sync.tsx` | b 二：画面对标记 | 流程图四节点依次点亮，最后盖章「不写死秒数」 | `ChapterBreak`、`ChapterTag`、`Flow`、`Stamp` |
| `scenes\Run.tsx` | c 三：一条命令出片 | 操作演示：终端逐字敲命令、六行输出逐行出、断点续跑盖章；这一幕带「示意画面」角标（`demo(t)`） | `ChapterBreak`、`ChapterTag`、`Terminal`、`CheckList`、`PointNote`、`Stamp` |
| `scenes\End.tsx` | end 收尾 | 三条要点逐条打勾 → 大号小咸鱼喊口号 → 片尾卡 → 通用片尾 | `Recap`、`EndCard` |

每个场景文件都是同一个骨架，抄就照这个顺序：`range()` 定这一幕时间 → 每块积木一个 props 函数 →
组件（最外层 `edge()` 淡入淡出）→ `sfx()` 展开音效 → 导出 `Scene`。

### 开自己的片子时，先把不用的示范场景挪走

示范场景是范文。开新片以后，用不上的那几个**移到工程根的 `_示范场景\`（不要删，留着对照写法）**，
并在 `scenes\index.ts` 里去掉对应的 import 和 `SCENES` 项。为什么建议移走：

- `lint` 只检查登记过的场景：从 `scenes\index.ts` 的 import 出发，递归跟 `./` 开头的相对 import
  （只在 `scenes\` 里），够不着的 .tsx 不查句子引用，只在最后列一条提醒
  「这些场景文件没有登记，不会进片子：…」。
- 类型检查（`tsc --noEmit`）仍然是全量，`src\` 下所有 .tsx 都会查。示范场景引用了新稿里没有的句 id 时
  它**不会报错** —— 实测 `S('a1')` / `C('a1','x')` 的参数就是普通字符串，类型上永远合法，缺句要到
  抽帧渲染才炸（`timing 里没有 a1`）。所以留着不影响，但建议移走，免得看场景文件时混淆。

照着改的顺序：

1. `film.json`：作品名、成品目录、成片名、念法表 `say`、配乐 `music`。
2. `film\src\script.json`：`chapters` 定章、`items` 一句一条、句子里放 `{标记}`。
3. `.\film.cmd lint`：稿子体检（含类型检查），有错先改。
4. `film\src\scenes\*.tsx` 写场景，在 `film\src\scenes\index.ts` 登记；时间一律从 `lib\time.ts` 取。
5. `.\film.cmd all zh` 出片；竖屏短版改 `script_short.json` + `short\Short.tsx` 后 `.\film.cmd all short`。
6. `.\film.cmd review zh --round r1` 抽帧，对着 `review\final_zh\` 比「合格长什么样」。

## 开新片 → 出成片（最短路径）

```powershell
# 1. 开工程（工程建在 kit.local.json 的 workRoot\新片名，成品目录是 outRoot\新片名）
& "<片场>\.venv\Scripts\python.exe" "<片场>\tools\new_film.py" 新片名

cd "<workRoot>\新片名"
```

2. 改 `film.json`（`name` / `outDir` / 成片名 / `say` 念法 / `music`）。
3. 写稿 `film\src\script.json`：`chapters` 定章，`items` 一句一条，句子里用 `{标记}` 给画面对点。
4. 写场景 `film\src\scenes\*.tsx`，在 `scenes\index.ts` 里登记；时间一律用 `lib/time.ts` 的
   `chapter('章')` / `S('句')` / `E('句')` / `C('句','标记')`，**不写死秒数**。
5. 跑：

```powershell
.\film.cmd lint            # 稿子体检（不用联网）
.\film.cmd all zh          # 配音→体检→渲染→混音→合成→成片体检（第一次要联网配音）
.\film.cmd review zh       # 审片图 + index.md，逐张对照
```

6. 竖屏短版：稿子 `film\src\script_short.json`、画面 `film\src\short\Short.tsx`（时间走 `short\timeShort.ts`），
   然后 `.\film.cmd all short`。

改稿之后只跑这一条就够：`.\film.cmd all zh`。只想重渲一段画面：`.\film.cmd render zh --from 12 --to 20`。

---

## 常见报错和处理

| 现象 | 原因 | 处理 |
|---|---|---|
| `✗ 找不到 Remotion 运行时（@remotion/cli）` | 作品里的 `film\node_modules` 目录联接没建好或被删了（模板里那条被人动过也会这样） | `New-Item -ItemType Junction -Path "<作品>\film\node_modules" -Target "<片场>\node_modules"`；**别用 cmd 的 mklink**，中文路径会把参数打坏 |
| `.cmd` 一跑就报 `'ilm.cmd' is not recognized` 一堆乱码 | `.cmd` 里写了中文，cmd.exe 按 OEM 码页读，多字节把批处理语法打坏了 | `film.cmd` 只能写 ASCII；中文交给 Python 打印 |
| 控制台中文变问号 | 码页不对 | 用 `.\film.cmd` 跑（它自带 `chcp 65001`）；直接敲 python 时先 `chcp 65001` 或设 `PYTHONIOENCODING=utf-8` |
| `✗ 配音失败（已重试 5 次）` | edge-tts 要联网 | 检查网络/代理后重跑，已合成的句子走缓存不会重来 |
| `配乐第 N 段写的是章节「x」，但稿子里没有这一章` | 稿子改了章名，`film.json` 的 `music.segments` 没跟着改 | 按提示里列出的现有章节改 `film.json`（这类错不再抛 KeyError，都会说清哪一段） |
| `语句「x」的章节是「y」，但稿子的 chapters 里没有它` | 稿子 `ch` 写错 | 改 `script.json` |
| `film.json` 报「不是合法 JSON：第 1 行第 1 列 —— Expecting value」（旧版才有） | 文件带 UTF-8 BOM：PowerShell 的 `Set-Content -Encoding UTF8` 会写 BOM，旧版按 `utf-8` 解码，BOM 变成第一个字符，JSON 直接解析失败 | 现在的 `film.py` / `vo\*.py` / `film\scripts\*.mjs` 读这些 JSON 一律用 `utf-8-sig`，带 BOM 也能跑；`lint` 会把带 BOM 的文件列出来。想干净就存成无 BOM（`Set-Content -Encoding utf8NoBOM`），`timing_*.json` 重跑 `.\film.cmd voice` 就会按无 BOM 重写（Remotion 打包和 `tsc` 实测都能读带 BOM 的 JSON，不是必须改） |
| `stings: false` 之后整片短了一大截 | 旧版把这版稿子里**所有**垫片（含自己起名的）一起剔掉了 | 已修：`false` 只剔 `intro` / `outro` 两条通用片头片尾，`voice` 会打印「去掉通用片头片尾：…；自己起名的垫片照常排：…」。片子还是短，就看那行有没有列错 |
| `C('句','标记')` 报「引用不存在的句子/标记」 | 画面引用了稿子里没有的东西 | `.\film.cmd lint` 会一次列全，改稿或改场景 |
| `第 x-y 帧渲染失败（已用并发 4 和 2 各试一次）` | 浏览器崩了/内存不够 | 直接重跑 `.\film.cmd render zh`，已渲好的段会跳过，只补这一段；日志在 `build\logs` |
| render 渲到一半进程被杀 | 会话结束/手动停 | 重跑同一条命令；段文件先写 `.tmp.mp4` 再改名，拼接前逐段核帧数，坏段自动删掉重渲 |
| `✗ 没有无声画面` / `没有混音` | 跳步了 | 按 `.\film.cmd status` 提示的顺序补 |
| `成片体检` 里「片长 vs 时间表」不过 | 渲染没渲完 / 时间表是旧的 | 重跑 `voice` + `render`；`status` 能看出谁比谁旧 |
| 响度差得多 | 混音没重跑（改了稿子但只跑了 render） | `.\film.cmd audio zh` 再 `mux` |
| 改了场景、重跑 `render`，成片里还是旧画面 | 分段只按时间表判断新旧，已渲好的段被跳过了（会打一行「跳过的 n 段是在画面代码最后一次改动之前渲的」） | `.\film.cmd render zh --fresh` 整片重渲，或 `--from/--to` 重渲改过的那几秒 |
| `stills` / `review` 打出 `[注意] [镜头包] …` 或 `[积木] …` | 画面代码在提醒参数越界、文字放不下之类（从浏览器里收回来的） | 照那一行说的改；产品片的提醒对照 `cine\手册.md`「防呆清单」 |
| 渲染「几秒就成功」但没产物 | 用 `@remotion/cli/dist/index.js`（库入口）去渲，它退 0 但什么也不做 | 用 `@remotion/cli/remotion-cli.js`（`vo\common.py` 已经这么调，别再改回去） |
| 配乐/混音的响度离谱（几十 dBFS） | ffmpeg 的 `-af ebur128 -i -` 没从 stdin 喂数据，量到的是空音频，归一化系数就飞了 | 用 `common.run_stdin()` 喂数据（music.py / mix.py 已改） |
| `probe` 一直报 0 个问题 | `probe: true` 只传给了 `renderStill`，没传给 `selectComposition`，画面里 `probe` 还是 false | 按 `scripts\probe.mjs` 现在的写法，两处都传 |
| `status` 说「人声比时间表旧」但其实刚跑完 | 同一轮里先写人声、后写时间表，mtime 差几毫秒 | 已有 2 秒容差，正常不会报；真报就是确实过期 |
| `lint` 报「类型检查 src\xxx.tsx:12 …」 | `lint` 最后跑了一遍 `tsc --noEmit`，场景/组件类型不通过 | 按「文件:行」改；这类错以前要等抽帧渲染才炸 |
| `probe` 报大量「字太小」/「被裁切」/「出画」 | 模拟界面内部的文字被当成正文在量 | 在那类窗口组件最外层加 `data-probe="skip"`（`ui\` 里的 Browser / FaWindow / CodexWin / ChatWin / DshWin / Term / TeamTable 已经加了）。加了之后这个子树里的文字就不再报这四条 |
| `probe` 报「窗口压字幕条」（提醒：模拟窗口压到字幕区） | 模拟窗口的外框压进了字幕区，窗口里的字会被字幕盖住 | 挪窗口或缩窗口（改窗口的 top/height），让外框底边离开字幕区（正片 y ≥ 940、短版 1510–1630）；这条只报一次，写明窗口矩形 |
| `probe` 报「压字幕」 | 画面文字压到了字幕条 | 挪画面元素；字幕条本身带 `data-probe="subtitle"` 标记 |
| `lint` 提醒「这些场景文件没有登记，不会进片子」 | `scenes\` 里有 .tsx 没在 `scenes\index.ts` 里 import（常见：还没换掉的示范场景） | 要用的就 import 并加进 `SCENES`；不用的移到工程根 `_示范场景\`（别删） |
| 跑 `.\film.cmd xxx short` 提示「这部片子的 film.json 没有开短版」 | `film.json` 的 `versions` 里没写 `short` | 不做短版就不用管；要做就把 `versions` 改成 `["zh", "short"]` |
| 复核 `index.md` 时想看原尺寸某帧 | 拼图看不清细节 | 直接打开 `review\<轮次>_<键>\<秒数>_<句>.png`，或 `.\film.cmd stills FilmZh <秒>` 重抽 |
| `stills` 一次传几十个秒数（71 个、150 个）时退出码 1、**什么报错都没有** | 那一批帧全在同一个 node 进程里渲，中间只要有一张失败（浏览器崩、内存紧、React 渲染超时）就把整批剩下的**全丢掉**；`film.py` 以前只把 node 输出的第一行（「命令失败（退出码 1…）」）当报错打出来，真正的错在后面几十行，看着就像没报错。分批 12 张能过、71 张崩，就是这个 | 已修：①`stills` / `review` 张数超过 50 自动分批（`--batch 20` 改批大小，`--batch 0` 不分批），一批崩了只影响那一批；②`stills.mjs` 单张失败重试一次后**继续渲后面的**，最后统一列出每一张失败的原始报错；③`film.py` 现在把 node 的报错原文整段打出来，出图数对不上直接报错退出（退出码非 0）。看到 `✗ 抽帧失败：` 或 `FAIL <秒数>` 就直接读下面那几行 node 原话 |
| node 偶发一步退出、`退出码 3221226505`（0xC0000409） | 机器进程很紧时 node/浏览器崩，不是脚本错 | 重跑那一步即可（review / probe / stills 已内置自动重试一次）；连续出现再查内存和 `render.concurrency`。图量大时用 `--batch` 调小每批张数 |
| 想同时做正片和短版的同一轮审片 | 目录会撞 | 不用管：输出目录自动带版本后缀（`review\r1_zh\`、`review\r1_short\`） |

### 两个容易忘的规矩

- **改稿子 = 时间表全变**：所有画面只能按 `chapter/S/E/C` 取时间，写死秒数的一律会错位（片名上的时间码、
  「下一章开始」这种边界、配乐分段，都要靠引用而不是数字）。
- **成品不覆盖**：`mux` 遇到同名文件会先改名成 `…_备份<时间戳>.mp4` 再写，所以想保版本就改 `videos` 里的名字，
  不要依赖覆盖。
