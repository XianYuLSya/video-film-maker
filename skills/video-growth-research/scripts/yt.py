"""YouTube 公开搜索页抓取与粗分析（只用标准库）。

用法：
  python yt.py search --kw 关键词 [--kw ...] [--when week|month|year|any] [--sort views|date|relevance]
                      [--subs 30] [--proxy auto|none|http://host:port] [--out 目录]
      每个关键词取搜索第一页（约 20 条），解析页面里的 ytInitialData：标题、观看数、发布了多久、时长、频道。
      算「日均观看」（观看数 / 发布天数，发布时间是「3 周前」这种相对说法，只能估）；
      --subs N 再去播放最高的 N 个频道页取订阅数，算观看/订阅比（找小频道爆款）。

网络：大陆直连打不开 YouTube。默认 --proxy auto 读 Windows 系统代理（和日常浏览器同一条路）；
不要用 FAswitch 档案端口（http(s)_proxy 指向的那个），它不一定放行 YouTube。
输出：<目录>/yt_<时间>.json / .csv / .md，默认目录 bili_out。数据是抓取当时的快照。
"""
import argparse
import base64
import datetime as dt
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bili import BJ, BUCKETS, cell, med, r2, save, secs  # noqa: E402

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/138.0.0.0 Safari/537.36')
WHEN = {'hour': 1, 'today': 2, 'week': 3, 'month': 4, 'year': 5, 'any': None}
SORT = {'relevance': None, 'date': 2, 'views': 3}
UNIT_DAYS = [('秒', 1 / 86400), ('分钟', 1 / 1440), ('小时', 1 / 24), ('天', 1), ('周', 7), ('个月', 30), ('年', 365),
             ('second', 1 / 86400), ('minute', 1 / 1440), ('hour', 1 / 24), ('day', 1), ('week', 7), ('month', 30), ('year', 365)]


def system_proxy():
    """Windows 系统代理（设置 → 网络 → 代理），没开就返回 None"""
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Internet Settings')
        if winreg.QueryValueEx(k, 'ProxyEnable')[0]:
            server = winreg.QueryValueEx(k, 'ProxyServer')[0]
            if '=' in server:  # 形如 http=host:port;https=host:port
                parts = dict(p.split('=', 1) for p in server.split(';') if '=' in p)
                server = parts.get('https') or parts.get('http') or ''
            return server if server.startswith('http') else f'http://{server}'
    except Exception:
        pass
    return None


def sp_param(sort, when):
    """搜索筛选参数：protobuf 再 base64。字段 1 = 排序；字段 2 = 筛选 {1 = 上传时间，2 = 类型（1 只要视频）}"""
    f = (bytes([0x08, when]) if when else b'') + bytes([0x10, 0x01])
    b = (bytes([0x08, sort]) if sort else b'') + bytes([0x12, len(f)]) + f
    return base64.b64encode(b).decode()


def num(text):
    """「57,782,285次观看」「1.2万位订阅者」「3.4M subscribers」→ 数字"""
    if not text:
        return None
    m = re.search(r'([\d][\d,.]*)\s*(万|亿|K|M|B)?', text.replace(' ', ' '))
    if not m:
        return 0 if ('无人' in text or 'No views' in text) else None
    v = float(m.group(1).replace(',', ''))
    return int(v * {'万': 1e4, '亿': 1e8, 'K': 1e3, 'M': 1e6, 'B': 1e9}.get(m.group(2), 1))


def age_days(text):
    """「7个月前」「3 weeks ago」「已直播 2 天」→ 大约多少天"""
    if not text:
        return None
    m = re.search(r'(\d+)\s*(秒|分钟|小时|天|周|个月|年|second|minute|hour|day|week|month|year)', text)
    if not m:
        return None
    return int(m.group(1)) * dict(UNIT_DAYS)[m.group(2)]


class YT:
    def __init__(self, proxy):
        handlers = [urllib.request.ProxyHandler({'http': proxy, 'https': proxy} if proxy else {})]
        self.op = urllib.request.build_opener(*handlers)

    def page(self, url):
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9'})
        for attempt in range(3):
            try:
                with self.op.open(req, timeout=30) as r:
                    html = r.read().decode('utf-8', 'replace')
                time.sleep(1.0)
                return html
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(3 * (attempt + 1))

    @staticmethod
    def initial_data(html):
        m = re.search(r'var ytInitialData = (\{.*?\});</script>', html, re.S)
        return json.loads(m.group(1)) if m else {}

    def search(self, kw, sort, when):
        url = 'https://www.youtube.com/results?' + urllib.parse.urlencode(
            {'search_query': kw, 'sp': sp_param(SORT[sort], WHEN[when])})
        out = []

        def walk(o):
            if isinstance(o, dict):
                v = o.get('videoRenderer')
                if v:
                    owner = (v.get('ownerText') or {}).get('runs') or [{}]
                    ep = ((owner[0].get('navigationEndpoint') or {}).get('browseEndpoint') or {})
                    out.append({
                        'id': v.get('videoId'),
                        'title': ''.join(r.get('text', '') for r in (v.get('title') or {}).get('runs', [])),
                        'views': num((v.get('viewCountText') or {}).get('simpleText')
                                     or ''.join(r.get('text', '') for r in (v.get('viewCountText') or {}).get('runs', []))),
                        'published': (v.get('publishedTimeText') or {}).get('simpleText'),
                        'sec': secs((v.get('lengthText') or {}).get('simpleText') or '0:0'),
                        'channel': ''.join(r.get('text', '') for r in owner),
                        'channel_url': ep.get('canonicalBaseUrl') or (f"/channel/{ep['browseId']}" if ep.get('browseId') else None),
                    })
                    return
                for x in o.values():
                    walk(x)
            elif isinstance(o, list):
                for x in o:
                    walk(x)

        walk(self.initial_data(self.page(url)))
        return out

    def subscribers(self, channel_url):
        html = self.page('https://www.youtube.com' + channel_url)
        m = re.search(r'"([\d][\d,.]*\s*(?:万|亿|K|M|B)?)\s*(?:位订阅者|subscribers)"', html)
        return num(m.group(1)) if m else None


def cmd_search(a):
    proxy = system_proxy() if a.proxy == 'auto' else (None if a.proxy == 'none' else a.proxy)
    yt = YT(proxy)
    rows = {}
    for kw in a.kw:
        try:
            got = yt.search(kw, a.sort, a.when)
        except Exception as ex:
            print(f'关键词「{kw}」失败：{ex}', flush=True)
            continue
        for v in got:
            r = rows.setdefault(v['id'], dict(v, kw=[]))
            if kw not in r['kw']:
                r['kw'].append(kw)
        print(f'关键词「{kw}」{len(got)} 条，累计 {len(rows)} 条', flush=True)
    R = list(rows.values())
    for r in R:
        r['kw'] = '、'.join(r['kw'])
        r['age_days'] = r2(age_days(r['published']), 1)
        r['per_day'] = int(r['views'] / max(r['age_days'], 1)) if r['views'] is not None and r['age_days'] else None
        r['url'] = f"https://www.youtube.com/watch?v={r['id']}"
    subs = {}
    if a.subs:
        for r in sorted(R, key=lambda r: -(r['views'] or 0)):
            if len(subs) >= a.subs:
                break
            if r['channel_url'] and r['channel_url'] not in subs:
                try:
                    subs[r['channel_url']] = yt.subscribers(r['channel_url'])
                except Exception:
                    subs[r['channel_url']] = None
    for r in R:
        s = subs.get(r['channel_url'])
        r['subs'] = s
        r['ratio'] = r2(r['views'] / s, 2) if s and r['views'] is not None else None
    md = [f"# YouTube 搜索样本（{dt.datetime.now(BJ).date()}，上传时间 {a.when}，排序 {a.sort}，{len(R)} 条）", '',
          f"关键词：{'、'.join(a.kw)}；代理：{proxy or '直连'}。观看数和发布时间来自搜索页，发布时间是相对说法，日均观看只是估算。", '',
          '## 日均观看前 20', '', '| 日均观看 | 观看 | 发布 | 时长 | 频道 | 订阅 | 观看/订阅 | 标题 |', '|---|---|---|---|---|---|---|---|']
    for r in sorted([r for r in R if r['per_day'] is not None], key=lambda r: -r['per_day'])[:20]:
        md.append(f"| {r['per_day']} | {r['views']} | {r['published']} | {r['sec']}s | {cell(r['channel'])} | {r['subs'] or '-'} | "
                  f"{r['ratio'] or '-'} | [{cell(r['title'])}]({r['url']}) |")
    if a.subs:
        md += ['', f'## 观看远超订阅（查了 {len(subs)} 个频道，按观看/订阅排序）', '',
               '| 观看/订阅 | 观看 | 订阅 | 发布 | 时长 | 频道 | 标题 |', '|---|---|---|---|---|---|---|']
        for r in sorted([r for r in R if r['ratio']], key=lambda r: -r['ratio'])[:15]:
            md.append(f"| {r['ratio']} | {r['views']} | {r['subs']} | {r['published']} | {r['sec']}s | {cell(r['channel'])} | [{cell(r['title'])}]({r['url']}) |")
    md += ['', '## 按时长（日均观看中位）', '', '| 时长 | 条数 | 日均观看中位 |', '|---|---|---|']
    for lo, hi, name in BUCKETS:
        s = [r for r in R if lo <= r['sec'] < hi]
        if s:
            md.append(f"| {name} | {len(s)} | {med([r['per_day'] for r in s])} |")
    save(a.out, 'yt', R, '\n'.join(md),
         ['id', 'title', 'channel', 'subs', 'views', 'ratio', 'per_day', 'published', 'age_days', 'sec', 'kw', 'url'])


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    p = argparse.ArgumentParser(description='YouTube 公开搜索页抓取与粗分析')
    p.add_argument('--out', type=Path, default=Path('bili_out'))
    p.add_argument('--proxy', default='auto', help='auto（读 Windows 系统代理）、none（直连）或 http://host:port')
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('search')
    s.add_argument('--kw', action='append', required=True)
    s.add_argument('--when', default='month', choices=list(WHEN))
    s.add_argument('--sort', default='views', choices=list(SORT))
    s.add_argument('--subs', type=int, default=0, help='去播放最高的 N 个频道页取订阅数')
    s.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    a = p.parse_args()
    {'search': cmd_search}[a.cmd](a)


if __name__ == '__main__':
    main()
