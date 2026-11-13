# video-film-maker

这是 B 站 UP 主咸鱼凌生频道做片子的一整套做法，写成了 AI 助手能照着做的 skill。装上以后，对 Claude、Codex 或 DeepSeek（大肥鱼）说一句「做一期视频」，它就按流程查流量、定标题封面、写稿、配音、用代码做动画画面、逐帧审片、出成片。

片子不录屏、不剪素材：口播稿、画面、声音全部由代码和命令生成。稿子里给要出画面的词打上标记，配音时拿到每个词的秒数，画面按标记对齐；改了稿子重跑配音和渲染，画面不用手调。

## 仓库里有什么

| 目录 | 是什么 |
|---|---|
| `skills/video-growth-research/` | **找流量、定包装**。用公开数据查 B站／抖音／YouTube／X 上什么选题、标题、封面、时长更吃播放，这一波的梗和梗里角色的通行形象，什么时候发，怎么不违规地把观众引进群。附 B站、YouTube、抖音三个抓取脚本（只用 Python 标准库），以及一个要借外部工具才跑得起来的 X 脚本。 |
| `skills/video-film-maker/` | **做片**。从派单到成片的流程：写口播稿、用积木库做动画画面、配音配乐音效、分段渲染、合成、逐帧审片、改片、出竖屏短版，以及给助手的派单模板。 |
| `film-kit/` | **片场**。一套 Remotion 运行时、二十多块整屏版式的积木库、一部能直接跑通的示范片模板，和一条命令一个环节的流水线（`film.cmd`）。所有片子共用这一份运行时。 |

两个 skill 里的本机位置都写成占位（`<工作区>`、`<片场>`、`<skill 目录>`、`<发布工具目录>`、`<用户目录>`），装好后换成自己的路径（各自的 `SKILL.md` 开头有对照表）。

有两样东西**不在这个仓库里**，是频道本机的工具，skill 里点到它们的地方都写明了「没有就手动做」：

- 一键发布工具（一次传 B站／抖音／YouTube／X）——没有它就在各平台后台手动上传，按 skill 里「文案」「定时」两段的规则填标题、简介、标签、发布时间。
- ASR 工具（转写参考素材用）——skill 里只留占位。

## 成片

- 介绍这套 skill 的那期视频，从查流量、写稿、做画面到审片都是大肥鱼（DeepSeek V4.1 Flash）照这套 skill 做的：[你熬夜剪的视频，凭什么输给 AI 做的？](https://www.bilibili.com/video/BV1EgWv6dEAP)（B 站，北京时间 2026-11-15 18:00 公开；YouTube：https://youtu.be/3bptzlOxnnI ）。
- 更早用这套做法做的片子也在同一个频道主页。

## 怎么装

前提：Node.js 20 以上、Python 3.11、FFmpeg（`ffmpeg`、`ffprobe` 都要在 PATH 里）。

下面按 Windows 的 PowerShell 写。macOS／Linux 只把 `.venv\Scripts\` 换成 `.venv/bin/`、反斜杠换成正斜杠，其余照旧 —— **未验证**：我只在 Windows 上装过。

```powershell
git clone https://github.com/XianYuLSya/video-film-maker.git
cd video-film-maker\film-kit

# 1. Remotion 运行时装到 film-kit\node_modules（所有片子共用这一份）
npm install

# 2. 片场自己的 Python 环境（numpy / scipy / pillow / edge-tts 等）
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt

# 3. 本机配置：工程根、成品根、成片名前缀、渲染浏览器、渲染临时目录（都可以不写）
#    系统盘小的话把 tempDir 指到别的盘的专用空目录：渲染浏览器留下的临时文件几天能攒几十 G
Copy-Item kit.local.example.json kit.local.json
```

**4. 自备音效、配乐和片头片尾。** 这三样是第三方素材和频道自己的片子，许可不允许随仓库再分发，所以仓库里没有。按 [`film-kit/素材自备.md`](film-kit/素材自备.md) 放齐——那里有 37 个音效逐个的文件名、Mixkit 原名和下载地址，五首配乐的曲名作者和来源，以及换替代品时要注意什么（比如打字声要 20 秒以上）：

```
film-kit\local\
├─ sfx\        37 个音效，文件名要和清单一致（画面代码按名字找）
├─ bgm\        配乐
├─ intro.mp4   通用片头（可选）
└─ outro.mp4   通用片尾（可选）
```

放好以后让模板也拿到一份：

```powershell
.venv\Scripts\python.exe tools\new_film.py --fill template
```

**5. 给模板建 Remotion 的目录联接**（一条 Junction，不占额外空间；`template\film\node_modules` 必须指到片场的 `node_modules`）：

```powershell
# 在 film-kit 目录里跑
New-Item -ItemType Junction -Path "template\film\node_modules" -Target (Resolve-Path "node_modules").Path
```

**6. 把两个 skill 装到助手的 skill 目录。** 把 `skills\video-film-maker\` 和 `skills\video-growth-research\` 整个目录拷进自己助手的 skills 目录（Claude Code、Codex、DSH 各家的位置不一样，看各自的文档）—— **未验证**：我只在自家助手上装过，没走过别人的机器。

装完先确认环境通了（不用联网、不用配音）：

```powershell
cd template
.\film.cmd lint
```

它会跑稿子体检和类型检查（`tsc --noEmit`）。我按上面这几步在这台机器上装了一遍，第一次跑的输出是：类型检查全过、五章时长和示范片对得上（正片 73.3 秒、短版 18.0 秒），只剩两条跟自备素材有关的提示——缺 `intro.mp4`／`outro.mp4`（1 个错误）和缺音效（1 条提醒）。这是正常的，仓库里不带自备素材；按第 4 步补齐后它们就没了。看到跟这两样无关的错误，才说明环境没装对。

## 怎么用

### 一、自己的 AI 直接照 skill 做

把 `video-film-maker` 装进助手，说「做一期视频」「把这个做成片子」或者「改一下那期视频」，它照 `SKILL.md` 的流程自己走：开片 → 写稿 → 配音 → 画面 → 审片 → 出片。选题、标题、封面方向、发布时间这些用 `video-growth-research`。

你要做的是三件事：定方向、看稿子节点、看成片。听感、连续动态、稿子里的事实，助手验不了（见下面「真实的限制」）。

### 二、「老板带大肥鱼」

主对话当 Boss，只定方向、看稿、验收，苦活交给几位 **DeepSeek（DSH）** 助手。照 [`skills/video-film-maker/references/派单模板.md`](skills/video-film-maker/references/派单模板.md) 派单：

1. **剪辑师**（持久会话）：写稿、配音、做画面、渲染、自己先审三轮，交「稿子节点」和「审片节点」。
2. **审片员**（另一个会话，独立）：按审片单逐张看帧、对着文档核事实，给「必须改」和「建议改」。
3. Boss 把审片意见转回剪辑师，成片交回来以后自己抽十张左右的帧看，把试听片段交给真人听。
4. 过关后写成品 README 和 `发布.json`，排期上传。

这套已经跑过几种片子：一部 91 秒的试片（一位剪辑师自审后中断，第二位照制作记录接手）、一部 6 分 55 秒九章的长片（三位审片员按章分着看 185 张帧），以及无口播的产品片。过程中看到的限制都写在下一节。

## 真实的限制

- **听感没人听过。** 只测了响度、真峰值、时长；念法对不对、配乐和人声比例合不合适、音画合不合拍，要人自己听。skill 要求交付时附试听片段，就是给这件事留的口子。
- **连续动态没人看过。** 验收靠抽帧，动画顺不顺、镜头晃不晃、过场接得干不干净，只有看整片才知道。
- **助手说「已改」不能直接信。** DeepSeek 的自评分和「已改」都出现过与实际不符：报告写已改、成片里没改；仓库名写错、文案漏字这类事实错，靠独立审片和 Boss 抽帧才抓得到。所以流程里必须有独立审片员 + 人工抽帧，自评只能当线索。
- **长任务会中断。** 助手的长任务断过几次（应用重启、系统只报「执行失败」）。对策是工程根的 `制作记录.md` 每步记一笔、`.\film.cmd status` 看产物新旧，断了另派一位照记录接手，不重做。交付报告超过 6 小时没送达会作废。
- **Remotion 不是 OSI 定义的开源软件。** 它是源码可见、按自己的许可授权：个人和 3 人以内的团队免费（含商用），更大的公司要买 Company License。本项目只把它当依赖，不带它的代码。
- **配音走 edge-tts，是非官方接口。** 它调用的是微软 Edge 的朗读接口，不是公开 API，随时可能失效，社区里常见 403 和限流；要稳定或商用，换成正规 TTS 服务。
- **新片是模板的冻结拷贝。** 片场以后的更新不会自动进已有的工程。
- **出图要有画图模型。** 角色、插画、封面是交给能画图的模型画的（本频道用 Codex 的 image_gen），DeepSeek 自己不出图；没有画图模型就只用片场自带的小咸鱼和积木库。

## 许可与第三方

- 本仓库自己的代码和文档：MIT，见 [LICENSE](LICENSE)。
- 随仓库分发的第三方东西（字体、Lucide 图标路径）和要自己装的依赖（Remotion、edge-tts、FFmpeg、React、TypeScript、numpy、scipy、Pillow 等）：逐条见 [`film-kit/THIRD_PARTY_NOTICES.md`](film-kit/THIRD_PARTY_NOTICES.md)。
- `film-kit/template/film/src/ui/` 里的产品界面示意和品牌图形：商标和著作权归各权利人，不在本项目许可内，见 [`film-kit/TRADEMARKS.md`](film-kit/TRADEMARKS.md)。
- 音效、配乐、通用片头片尾不随仓库分发，来源和替换办法见 [`film-kit/素材自备.md`](film-kit/素材自备.md)。
- 本频道片子里的大肥鱼参考的是画师 ZipZipPipe 的 DeepSeek 鲸鱼娘设计，片尾署名「角色设计参考 ZipZipPipe」。你借用社区角色时，照原设计者的要求来。

## 答疑

装不上、报错、用不明白，来 QQ 群 **259109974**，我常在群里回。
