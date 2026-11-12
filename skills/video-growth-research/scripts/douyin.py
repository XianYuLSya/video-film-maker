"""抖音热榜（只用标准库）。

用法：
  python douyin.py hot [--out 目录]
      取抖音网页版公开的热搜榜（douyin.com 首页右侧那份）：排名、词、热度、上榜时间，单列出 AI 相关的词。

抖音对脚本请求有限制，这个接口时有时无。拿不到就停在那里，换人用浏览器打开 https://www.douyin.com/hot 看；
不登录账号、不破解签名、不换身份重试。抖音的视频搜索和播放数据要登录或签名才能拿，这里不做，
需要时用浏览器看公开页面，或者看新榜、飞瓜这类榜单的公开页。
输出：<目录>/douyin_hot_<时间>.json / .md，默认目录 bili_out。数据是抓取当时的快照。
"""
import argparse
import datetime as dt
import http.cookiejar
import json
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bili import AI_RE, BJ, save  # noqa: E402

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/138.0.0.0 Safari/537.36')
HOT = ('https://www.douyin.com/aweme/v1/web/hot/search/list/'
       '?device_platform=webapp&aid=6383&channel=channel_pc_web&detail_list=1')


def cmd_hot(a):
    jar = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPCookieProcessor(jar))
    headers = {'User-Agent': UA, 'Referer': 'https://www.douyin.com/', 'Accept-Language': 'zh-CN,zh;q=0.9'}
    try:  # 先像浏览器一样打开首页
        op.open(urllib.request.Request('https://www.douyin.com/', headers=headers), timeout=20).read()
    except Exception:
        pass
    body = op.open(urllib.request.Request(HOT, headers=headers), timeout=20).read()
    try:
        data = json.loads(body).get('data') or {}
    except ValueError:
        print('抖音热榜这次没返回数据（抖音对脚本请求有限制）。请用浏览器打开 https://www.douyin.com/hot 看，或者过一会儿再试一次。')
        sys.exit(2)
    words = data.get('word_list') or []
    rows = [{'rank': w.get('position'), 'word': w.get('word'), 'hot': w.get('hot_value'),
             'since': dt.datetime.fromtimestamp(w['event_time'], BJ).strftime('%m-%d %H:%M') if w.get('event_time') else '',
             'ai': bool(re.search(AI_RE, w.get('word') or '', re.I))} for w in words]
    rising = [t.get('word') for t in (data.get('trending_list') or []) if t.get('word')]
    md = [f'# 抖音热榜（{dt.datetime.now(BJ):%Y-%m-%d %H:%M}，{len(rows)} 条）', '',
          'AI 相关：' + ('、'.join(r['word'] for r in rows if r['ai']) or '这一刻没有'), '']
    if rising:
        md += ['上升中：' + '、'.join(rising), '']
    md += ['| 排名 | 词 | 热度 | 上榜 |', '|---|---|---|---|']
    md += [f"| {r['rank']} | {'**' + r['word'] + '**' if r['ai'] else r['word']} | {r['hot']} | {r['since']} |" for r in rows]
    save(a.out, 'douyin_hot', rows, '\n'.join(md))


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    p = argparse.ArgumentParser(description='抖音热榜')
    p.add_argument('--out', type=Path, default=Path('bili_out'))
    sub = p.add_subparsers(dest='cmd', required=True)
    h = sub.add_parser('hot')
    h.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    a = p.parse_args()
    {'hot': cmd_hot}[a.cmd](a)


if __name__ == '__main__':
    main()
