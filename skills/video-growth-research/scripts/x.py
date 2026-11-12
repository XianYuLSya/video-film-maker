"""X（推特）热帖抓取：在用户默认 Chrome（已登录 X）里只读打开 X 搜索，拉高互动帖子做表。

注意：一键发布工具（publisher）不在本仓库。这个脚本依赖它里面的「一键发布助手」扩展通道和
publish / dev / recipes 几个模块，本仓库只保留做法；没有那个工具时这一步跑不了，改用浏览器
手动翻 X 的搜索页看公开数据。

用法（用一键发布工具的 Python 跑，它带着扩展通道）：
  <发布工具目录>\\social-auto-upload\\.venv\\Scripts\\python.exe scripts/x.py
      [--q "X 搜索式" ...] [--days 7] [--latest] [--account <账号>] [--scrolls 4] [--out 目录]
      [--publisher <一键发布工具目录>]      # 也可以设环境变量 PUBLISHER_DIR，二者都没给就报错

  不给 --q 就用默认两条：近 N 天中文 AI 高互动帖（min_faves:300）、中文 Claude 相关（min_faves:100）。
  搜索式就是 X 搜索框的写法：lang:zh 限中文，min_faves:N 至少 N 个赞，since:2026-11-04 起始日期（UTC），
  from:账号 只看某人。默认看「热门」页；--latest 看「最新」页，配 min_faves:50 能找到正在起量、适合去回复的新帖。
  --account 顺带记下自己账号的关注者数和最近几条帖子的观看数，用来复盘。

做法：借一键发布工具的「一键发布助手」扩展，在 Chrome 里开一个窗口（会弹到前台），只读页面，跑完自动关。
不点赞、不关注、不发帖。X 的页面不登录看不到搜索结果，所以只走用户自己的 Chrome，不另开浏览器。
输出：<目录>/x_<时间>.json / .md（默认目录 x_out），时间一律换成北京时间。数据是抓取当时的快照。
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

# 一键发布工具的目录（不在本仓库）：命令行 --publisher 或环境变量 PUBLISHER_DIR 给，没有默认值。
DEFAULT_PUBLISHER = ""

BJ = timezone(timedelta(hours=8))
ARTICLES = r"""(() => [...document.querySelectorAll('article[data-testid="tweet"]')].map(a => {
  const link = [...a.querySelectorAll('a[href*="/status/"]')].map(x => x.getAttribute('href')).find(h => /\/status\/\d+$/.test(h)) || '';
  const texts = [...a.querySelectorAll('[data-testid="tweetText"]')].map(e => e.innerText);
  const t = a.querySelector('time');
  const g = a.querySelector('[role="group"]');
  return {link, user: ((a.querySelector('[data-testid="User-Name"]') || {}).innerText || '').replace(/\n/g, ' '),
          time: t ? t.getAttribute('datetime') : '', text: (texts[0] || '').slice(0, 600), quoted: (texts[1] || '').slice(0, 200),
          metrics: g ? g.getAttribute('aria-label') || '' : '',
          photos: a.querySelectorAll('[data-testid="tweetPhoto"]').length,
          video: a.querySelectorAll('video, [data-testid="videoPlayer"], [data-testid="videoComponent"]').length};
}))()"""
METRIC = {"views": r"([\d,]+) (?:次观看|views?)", "likes": r"([\d,]+) (?:喜欢|likes?)",
          "reposts": r"([\d,]+) (?:次转帖|reposts?)", "replies": r"([\d,]+) (?:回复|repl(?:y|ies))",
          "bookmarks": r"([\d,]+) (?:书签|bookmarks?)"}


def parse(a: dict) -> dict:
    for k, pat in METRIC.items():
        m = re.search(pat, a.get("metrics", ""))
        a[k] = int(m.group(1).replace(",", "")) if m else 0
    a["media"] = "视频" if a["video"] else "图片" if a["photos"] else "纯文字"
    if a.get("time"):
        a["bj"] = datetime.fromisoformat(a["time"].replace("Z", "+00:00")).astimezone(BJ).strftime("%m-%d %H:%M")
    a["handle"] = (re.search(r"@\w+", a["user"]) or [""])[0]
    return a


def wait_for(tab, expr, timeout=25):
    end = time.time() + timeout
    while time.time() < end:
        if tab.try_eval(expr):
            return True
        time.sleep(1)
    return False


def collect(tab, url, scrolls):
    tab.cdp("Page.navigate", {"url": url})
    time.sleep(3)
    if not wait_for(tab, "document.querySelector('article[data-testid=\"tweet\"]')"):
        return []
    seen = {}
    for _ in range(scrolls + 1):
        for a in tab.try_eval(ARTICLES, []) or []:
            if a.get("link"):
                seen.setdefault(a["link"], a)
        tab.try_eval("window.scrollBy(0, 2200)")
        time.sleep(2.5)
    return [parse(a) for a in seen.values()]


def md_table(rows):
    out = ["| 北京时间 | 作者 | 观看 | 赞 | 收藏 | 形式 | 开头 |", "|---|---|---:|---:|---:|---|---|"]
    for a in rows:
        head = a["text"][:70].replace("\n", " / ").replace("|", "｜")
        out.append(f"| {a.get('bj', '')} | {a['handle']} | {a['views']:,} | {a['likes']:,} | {a['bookmarks']:,} | {a['media']} | "
                   f"[{head}](https://x.com{a['link']}) |")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--q", action="append")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--latest", action="store_true")
    ap.add_argument("--account")
    ap.add_argument("--scrolls", type=int, default=4)
    ap.add_argument("--out", default="x_out")
    ap.add_argument("--publisher", default=os.environ.get("PUBLISHER_DIR") or DEFAULT_PUBLISHER,
                    help="一键发布工具的目录（不在本仓库），也可以设环境变量 PUBLISHER_DIR")
    args = ap.parse_args()
    pub = Path(args.publisher) if args.publisher else None
    if pub is None or not pub.is_dir():
        sys.exit("没有一键发布工具：用 --publisher 或环境变量 PUBLISHER_DIR 指到它的目录"
                 "（这个工具不在本仓库，见文件开头的说明）")
    sys.path.insert(0, str(pub))
    try:
        import publish
        from dev import DevCtx
        from recipes.base import Tab
    except ImportError as e:
        sys.exit(f"这个目录里没有一键发布工具（导入失败：{e}）：{pub}")
    since = (datetime.now(timezone.utc) - timedelta(days=args.days)).strftime("%Y-%m-%d")
    queries = args.q or [
        f"(Claude OR Anthropic OR GPT OR OpenAI OR ChatGPT OR Codex OR Gemini OR DeepSeek OR AI) lang:zh min_faves:300 since:{since}",
        f"(Claude OR Anthropic OR Fable OR Opus) lang:zh min_faves:100 since:{since}",
    ]
    publish.ensure_server()
    publish.call("/api/dev/session", {"browser": "chrome"})
    ctx = DevCtx("chrome")
    info = ctx.call("open", url="https://x.com/home")
    tab = Tab(ctx, info["tabId"], info["windowId"])
    data = {"抓取时间": datetime.now(BJ).strftime("%Y-%m-%d %H:%M"), "搜索": {}}
    try:
        tab.cdp("Emulation.setFocusEmulationEnabled", {"enabled": True})
        time.sleep(3)
        if args.account:
            rows = collect(tab, f"https://x.com/{args.account}", 1)
            head = tab.try_eval("(document.querySelector('[data-testid=\"primaryColumn\"]') || document.body).innerText.slice(0, 600)") or ""
            m = re.search(r"([\d,.万]+)\s*(?:关注者|Followers)", head)
            data["账号"] = {"关注者": m.group(1) if m else "未读到", "最近帖子": rows}
        for q in queries:
            url = "https://x.com/search?" + urllib.parse.urlencode({"q": q, "src": "typed_query", "f": "live" if args.latest else "top"})
            data["搜索"][q] = collect(tab, url, args.scrolls)
            print(q, len(data["搜索"][q]), flush=True)
            time.sleep(2)
    finally:
        try:
            tab.close()
        finally:
            publish.call("/api/dev/session", {"browser": "chrome", "end": True})

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(BJ).strftime("%Y%m%d_%H%M")
    (out / f"x_{stamp}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = [f"# X 热帖 · 抓取于北京时间 {data['抓取时间']}", ""]
    if "账号" in data:
        lines += [f"## 自己账号 @{args.account}：关注者 {data['账号']['关注者']}", ""] + md_table(data["账号"]["最近帖子"]) + [""]
    allrows = {}
    for q, rows in data["搜索"].items():
        rows.sort(key=lambda a: -a["views"])
        allrows.update({a["link"]: a for a in rows})
        lines += [f"## `{q}`（{'最新' if args.latest else '热门'}，{len(rows)} 条）", ""] + md_table(rows) + [""]
    big = [a for a in allrows.values() if a["views"] >= 5000 and a.get("bj")]
    if big:
        hours = collections.Counter(int(a["bj"][6:8]) for a in big)
        media = collections.Counter(a["media"] for a in big)
        lines += [f"## 观看 ≥5000 的 {len(big)} 条", "",
                  "- 发帖时刻（北京时间，几点：条数）：" + "，".join(f"{h} 点：{n}" for h, n in sorted(hours.items())),
                  "- 形式：" + "，".join(f"{k} {v}" for k, v in media.most_common()), ""]
    (out / f"x_{stamp}.md").write_text("\n".join(lines), encoding="utf-8")
    print("写好了", out / f"x_{stamp}.md")


if __name__ == "__main__":
    main()
