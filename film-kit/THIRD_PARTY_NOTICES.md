# 第三方组件与许可

片场自己的代码和文档按仓库根目录的许可证授权。下面这些是别人的东西，各按各的许可。

## 随片场分发的

### 字体（SIL OFL 1.1）

`assets\fonts\` 里的 7 个字体（Noto Sans SC、Noto Serif SC、得意黑、站酷快乐体、Inter、JetBrains Mono），版权行和许可全文见 [assets/fonts/README.md](assets/fonts/README.md) 与 [assets/fonts/OFL.txt](assets/fonts/OFL.txt)。

### Lucide 图标路径（ISC）

`template\film\src\ui\icons.tsx` 里的通用线条图标，路径数据来自 [Lucide](https://lucide.dev)（核对版本 lucide-static 0.263.0），部分由本项目改写或组合。Lucide 的许可原文：

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

其中源自 Feather 的部分按 MIT 许可：

```
The MIT License (MIT)

Copyright (c) 2013-2023 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 不随片场分发、要自己装的

| 组件 | 用在哪 | 许可 | 要知道的 |
|---|---|---|---|
| [Remotion](https://www.remotion.dev) 4.0.536 及 `@remotion/*` | 渲染画面（`package.json` 依赖，`npm install` 装） | Remotion License：**源码可见，不是 OSI 定义的开源** | 个人、3 人以内的营利组织、非营利组织可以免费用（含商用）；超过 3 人的公司要买 Company License，由使用者按自己的情况判断。许可也不包括 H.264、AAC 等编解码专利。详见 https://www.remotion.dev/license |
| [edge-tts](https://github.com/rany2/edge-tts) 7.x | 配音（`requirements.txt` 依赖） | LGPLv3（其中 `srt_composer.py` 是 MIT） | 只当依赖装，不拷源码。它调用的是微软 Edge「大声朗读」的接口，**不是微软公开的官方 API**：没有授权文档，随时可能因协议变更失效或被限流。要稳定或商用，请换成正规的 TTS 服务（例如 Azure 语音服务）。 |
| [FFmpeg](https://ffmpeg.org) | 拼接、混音、合成、量响度（命令行调用） | LGPL 2.1+（启用 GPL 组件的构建是 GPL 2+） | 自己装好、放进 PATH；片场不带二进制 |
| React / React DOM 19 | 画面组件 | MIT | |
| TypeScript 5 | `lint` 的类型检查 | Apache-2.0 | |
| `@fontsource-variable/inter`、`@fontsource-variable/jetbrains-mono` | 字体来源 | OFL 1.1 | |
| numpy、scipy | 声音处理、纸纹理 | BSD-3-Clause | |
| Pillow | 抠图、拼图 | MIT-CMU（HPND） | |

## 参考过、没有拷代码的

镜头包 `template\film\src\cine\` 写的时候向 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)（Apache-2.0）学了方法和文档写法，哪几处思路同构写在 `template\film\src\cine\致谢与来源.md`。片场里没有它的代码。
