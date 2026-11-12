"""B 站公开数据抓取与粗分析（只用标准库）。

用法：
  python bili.py channel <mid> [--out 目录]
      自己频道：每条视频的播放、赞、币、藏、评、转、时长、发布日期、封面地址、简介开头
  python bili.py sample --kw 关键词 [--kw 关键词 ...] [--since 2025-11-01] [--orders click,totalrank] [--out 目录]
      同类样本：每个关键词按「最多播放」和「综合排序」各取第一页（20 条），只留 since 之后发布的，
      补 UP 主粉丝数，算播放/粉丝比、赞播比、藏播比、评播比，按时长分档和标题特征出中位数
  python bili.py voice <BV号> [<BV号> ...] [--words 区别,token,权限] [--out 目录]
      观众声音：弹幕全量 + 热评前 20 条，统计关键词出现次数，列高赞评论
  python bili.py hotword [--out 目录]
      B 站全站热搜词前 50，单列出 AI 相关的词
  python bili.py timing --from <sample 输出的 json> [...] [--top 150] [--dm 150] [--out 目录]
      发布时间（推荐用法）：从 sample 的样本里按播放挑视频，详情接口补精确发布时刻，
      再用弹幕的发送时间看目标观众几点在看（只算发布两天后的弹幕，每条视频等权）。不走搜索接口，请求少。
  python bili.py timing --kw 关键词 [--kw ...] --start 2026-10-12 --end 2026-10-26 [--fans 1500] [--dm 150] [--out 目录]
      全量模式：把时间窗里命中关键词的稿件按天全部列出来（不截断），按发布时段和星期比较播放；
      一个词一天就要十几页搜索，B 站很快会限流（HTTP 412），被限流就停下，存了进度，隔几小时重跑接着来

输出：<目录>/<子命令>_<时间>.json（原始行）、.csv（sample/channel）、.md（摘要）。默认目录是当前目录下的 bili_out。
接口说明：search/type 不带 cookie 会返回 -412，所以先访问首页并取 buvid3；遇到风控（-412/-352）会退避重试。
数据是抓取当时的快照；B 站不公开点击率，这里的比值都是替代指标，判读方法见 SKILL.md。
"""
import argparse
import csv
import datetime as dt
import http.cookiejar
import json
import re
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from pathlib import Path

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/138.0.0.0 Safari/537.36')
PAUSE = 0.35
SEARCH_PAUSE = 2.0

TITLE_FEATURES = {
    '含数字': r'\d',
    '保姆级': r'保姆',
    '教程': r'教程',
    '感叹号': r'[!！]',
    '问号': r'[?？]',
    '实测/对比': r'实测|测评|评测|对比|横评',
    '免费/白嫖': r'免费|白嫖',
    '开源': r'开源',
    '一键': r'一键',
    '夸张词': r'神器|封神|王炸|炸裂|逆天|杀疯|夯爆',
    '小白/零基础': r'小白|新手|零基础|普通人',
    '团队/员工/打工': r'团队|员工|公司|打工|老板',
    '方括号【】': r'【',
}
BUCKETS = [(0, 60, '<1分'), (60, 180, '1-3分'), (180, 360, '3-6分'), (360, 600, '6-10分'),
           (600, 1200, '10-20分'), (1200, 3600, '20-60分'), (3600, 10 ** 9, '>60分')]
BJ = dt.timezone(dt.timedelta(hours=8))
WEEK = '一二三四五六日'
# 判断一个词、一个标题是不是 AI 领域的（热搜、热榜里挑 AI 相关时用）
AI_RE = (r'AI|A\.I|人工智能|大模型|模型|智能体|Agent|GPT|OpenAI|Claude|Anthropic|Gemini|DeepSeek|大肥鱼|豆包|Kimi|通义|千问|'
         r'文心|智谱|元宝|Codex|Cursor|Copilot|Sora|Midjourney|可灵|即梦|机器人|算力|英伟达|芯片|AGI|LLM|数字人')


class Bili:
    def __init__(self, env_proxy=False):
        self.env_proxy = env_proxy
        self.refresh()

    def refresh(self):
        """取一份访客 cookie（buvid3），和浏览器第一次打开 B 站一样。"""
        self.jar = http.cookiejar.CookieJar()
        # 默认直连：从 FAswitch 打开的会话带着 http(s)_proxy 指向档案端口，那个端口不一定放行 B 站，握手会失败
        handlers = [urllib.request.HTTPCookieProcessor(self.jar)]
        if not self.env_proxy:
            handlers.insert(0, urllib.request.ProxyHandler({}))
        self.op = urllib.request.build_opener(*handlers)
        self._raw('https://www.bilibili.com/')
        if not any(c.name == 'buvid3' for c in self.jar):
            spi = self.get('https://api.bilibili.com/x/frontend/finger/spi')
            for name, key in (('buvid3', 'b_3'), ('buvid4', 'b_4')):
                val = (spi.get('data') or {}).get(key)
                if val:
                    self.jar.set_cookie(http.cookiejar.Cookie(
                        0, name, val, None, False, '.bilibili.com', True, True, '/', True,
                        False, None, False, None, None, {}))

    def _raw(self, url):
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': 'https://www.bilibili.com/',
                                                   'Accept-Encoding': 'identity'})
        with self.op.open(req, timeout=20) as r:
            data = r.read()
            if r.headers.get('Content-Encoding') == 'deflate':
                data = zlib.decompress(data, -zlib.MAX_WBITS)
            return data

    def get(self, url, params=None, pause=PAUSE):
        if params:
            url += ('&' if '?' in url else '?') + urllib.parse.urlencode(params)
        j = {}
        for attempt in range(7):
            try:
                j = json.loads(self._raw(url).decode('utf-8'))
            except urllib.error.HTTPError as ex:
                # 请求太密被限流（HTTP 412）：只等待，不换身份硬闯；等三轮还不行就停下，进度已存盘，过段时间重跑同一条命令接着来
                if ex.code != 412 or attempt >= 3:
                    raise
                wait = 60 * 2 ** attempt
                print(f'  被限流（HTTP 412），等 {wait} 秒再试', flush=True)
                time.sleep(wait)
                continue
            except Exception:  # 网络抖动
                if attempt >= 4:
                    raise
                time.sleep(1.5 * (attempt + 1))
                continue
            if j.get('code') in (-412, -352, -509):  # 接口层风控，退避
                time.sleep(3 * (attempt + 1))
                continue
            time.sleep(pause)
            return j
        return j

    def view(self, bvid):
        return self.get('https://api.bilibili.com/x/web-interface/view', {'bvid': bvid}).get('data') or {}

    def fans(self, mid):
        d = self.get('https://api.bilibili.com/x/relation/stat', {'vmid': mid}).get('data')
        return d.get('follower') if d else None

    def search_page(self, kw, order, page=1, t0=None, t1=None):
        p = {'search_type': 'video', 'keyword': kw, 'order': order, 'page': page}
        if t0 is not None:  # 发布时间范围（含两端的 unix 秒）
            p.update(pubtime_begin_s=t0, pubtime_end_s=t1)
        # 搜索接口限流最严：0.35 秒一页连翻一百多页就会被 412，所以每页隔 2 秒
        return self.get('https://api.bilibili.com/x/web-interface/search/type', p, pause=SEARCH_PAUSE).get('data') or {}

    def search(self, kw, order):
        return self.search_page(kw, order).get('result') or []

    def danmaku_times(self, cid):
        """弹幕的发送时间（unix 秒），取自 <d p="..."> 的第 5 个字段"""
        xml = self._raw(f'https://api.bilibili.com/x/v1/dm/list.so?oid={cid}').decode('utf-8', 'replace')
        time.sleep(PAUSE)
        return [int(p.split(',')[4]) for p in re.findall(r'<d p="([^"]+)"', xml) if p.count(',') >= 4]

    def archives(self, mid):
        out, pn = [], 1
        while True:
            j = self.get('https://api.bilibili.com/x/series/recArchivesByKeywords',
                         {'mid': mid, 'keywords': '', 'ps': 50, 'pn': pn})
            arcs = (j.get('data') or {}).get('archives') or []
            out += arcs
            if len(arcs) < 50:
                return out
            pn += 1

    def danmaku(self, cid):
        xml = self._raw(f'https://api.bilibili.com/x/v1/dm/list.so?oid={cid}').decode('utf-8', 'replace')
        time.sleep(PAUSE)
        return [re.sub(r'&[a-z]+;', '', m) for m in re.findall(r'<d [^>]*>([^<]*)</d>', xml)]

    def hot_comments(self, aid, n=20):
        j = self.get('https://api.bilibili.com/x/v2/reply', {'type': 1, 'oid': aid, 'sort': 1, 'ps': n, 'pn': 1})
        reps = (j.get('data') or {}).get('replies') or []
        return [{'like': r.get('like', 0), 'text': r['content']['message'].replace('\n', ' ')} for r in reps]


def secs(d):
    if isinstance(d, int):
        return d
    p = [int(x) for x in str(d).split(':')]
    return p[0] * 3600 + p[1] * 60 + p[2] if len(p) == 3 else p[0] * 60 + p[1]


def med(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def r2(x, n=2):
    return None if x is None else round(x, n)


def cell(s):
    """放进 Markdown 表格的文字：竖线换成全角，免得把表格撑坏"""
    return str(s).replace('|', '｜').replace('\n', ' ')


def day(ts):
    return dt.datetime.fromtimestamp(ts, BJ).strftime('%Y-%m-%d')


def save(out, name, rows, md, csv_fields=None):
    out.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(BJ).strftime('%Y%m%d_%H%M%S')
    base = out / f'{name}_{stamp}'
    base.with_suffix('.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    if csv_fields:
        with base.with_suffix('.csv').open('w', newline='', encoding='utf-8-sig') as f:
            w = csv.DictWriter(f, fieldnames=csv_fields, extrasaction='ignore')
            w.writeheader()
            w.writerows(rows)
    base.with_suffix('.md').write_text(md, encoding='utf-8')
    print(md)
    print(f'\n已写入：{base}.json / .md' + (' / .csv' if csv_fields else ''))


def cmd_channel(b, a):
    rows = []
    for arc in b.archives(a.mid):
        d = b.view(arc['bvid'])
        s = d.get('stat') or {}
        x = dt.datetime.fromtimestamp(d.get('pubdate', arc['pubdate']), BJ)
        rows.append({'bvid': arc['bvid'], 'title': d.get('title', arc.get('title')), 'pub': x.strftime('%Y-%m-%d'),
                     'time': x.strftime('%H:%M'), 'wd': WEEK[x.weekday()],
                     'sec': d.get('duration', arc.get('duration')), 'play': s.get('view'), 'like': s.get('like'),
                     'coin': s.get('coin'), 'fav': s.get('favorite'), 'reply': s.get('reply'), 'share': s.get('share'),
                     'w': (d.get('dimension') or {}).get('width'), 'h': (d.get('dimension') or {}).get('height'),
                     'pic': d.get('pic'), 'desc': (d.get('desc') or '')[:120].replace('\n', ' ')})
    fans = b.fans(a.mid)
    rows.sort(key=lambda r: -(r['play'] or 0))
    lines = [f'# 频道 {a.mid} 数据（{dt.datetime.now(BJ).date()}，粉丝 {fans}）', '',
             '| 播放 | 播放/粉丝 | 藏/播 | 评/播 | 时长 | 发布 | 标题 |', '|---|---|---|---|---|---|---|']
    for r in rows:
        p = r['play'] or 0
        lines.append(f"| {p} | {r2(p / fans, 1) if fans else '-'} | {r2((r['fav'] or 0) / p * 100, 1) if p else '-'}% | "
                     f"{r2((r['reply'] or 0) / p * 100, 2) if p else '-'}% | {r['sec']}s | {r['pub']} 周{r['wd']} {r['time']} | {cell(r['title'])} |")
    save(a.out, 'channel', rows, '\n'.join(lines),
         ['bvid', 'title', 'pub', 'time', 'wd', 'sec', 'play', 'like', 'coin', 'fav', 'reply', 'share', 'w', 'h', 'pic', 'desc'])


def cmd_sample(b, a):
    since = dt.datetime.strptime(a.since, '%Y-%m-%d').timestamp()
    rows = {}
    for kw in a.kw:
        for order in a.orders.split(','):
            for v in b.search(kw, order):
                if v.get('pubdate', 0) < since:
                    continue
                r = rows.setdefault(v['bvid'], {
                    'bvid': v['bvid'], 'title': re.sub(r'<[^>]+>', '', v['title']), 'author': v['author'], 'mid': v['mid'],
                    'play': v.get('play') or 0, 'like': v.get('like') or 0, 'fav': v.get('favorites') or 0,
                    'reply': v.get('review') or 0, 'dm': v.get('danmaku') or 0, 'sec': secs(v['duration']),
                    'pub': day(v['pubdate']), 'pic': 'https:' + v['pic'] if v['pic'].startswith('//') else v['pic'], 'kw': []})
                if kw not in r['kw']:
                    r['kw'].append(kw)
        print(f'关键词「{kw}」完成，累计 {len(rows)} 条', flush=True)
    fans = {}
    for r in rows.values():
        if r['mid'] not in fans:
            fans[r['mid']] = b.fans(r['mid'])
        f, p = fans[r['mid']], r['play']
        r['fans'] = f
        r['ratio'] = r2(p / f, 2) if f else None
        r['like_rate'] = r2(r['like'] / p * 100, 2) if p else None
        r['fav_rate'] = r2(r['fav'] / p * 100, 2) if p else None
        r['reply_rate'] = r2(r['reply'] / p * 100, 3) if p else None
        r['kw'] = '、'.join(r['kw'])
    R = list(rows.values())
    md = [f'# B 站同类样本（{dt.datetime.now(BJ).date()}，{a.since} 之后发布，{len(R)} 条）', '',
          f"关键词：{'、'.join(a.kw)}；排序：{a.orders}", '',
          f"整体中位数：播放 {med([r['play'] for r in R])}，播放/粉丝 {r2(med([r['ratio'] for r in R]))}，"
          f"赞播比 {r2(med([r['like_rate'] for r in R]))}%，藏播比 {r2(med([r['fav_rate'] for r in R]))}%", '',
          '## 按时长', '', '| 时长 | 条数 | 播放中位 | 播放/粉丝中位 | 赞播比中位 | 藏播比中位 |', '|---|---|---|---|---|---|']
    for lo, hi, name in BUCKETS:
        s = [r for r in R if lo <= r['sec'] < hi]
        if s:
            md.append(f"| {name} | {len(s)} | {med([r['play'] for r in s])} | {r2(med([r['ratio'] for r in s]))} | "
                      f"{r2(med([r['like_rate'] for r in s]))}% | {r2(med([r['fav_rate'] for r in s]))}% |")
    md += ['', '## 标题特征（有 / 没有，播放/粉丝中位；条数少于 5 不列）', '', '| 特征 | 条数 | 有 | 没有 |', '|---|---|---|---|']
    for name, pat in TITLE_FEATURES.items():
        w = [r['ratio'] for r in R if re.search(pat, r['title'])]
        wo = [r['ratio'] for r in R if not re.search(pat, r['title'])]
        if len([x for x in w if x is not None]) >= 5:
            md.append(f'| {name} | {len(w)} | {r2(med(w))} | {r2(med(wo))} |')
    md += ['', '## 播放远超粉丝（播放 ≥ 5000，按播放/粉丝排序前 30）', '',
           '| 播放/粉丝 | 播放 | 粉丝 | 赞播比 | 时长 | 发布 | 标题 | BV |', '|---|---|---|---|---|---|---|---|']
    for r in sorted([r for r in R if r['ratio'] and r['play'] >= 5000], key=lambda r: -r['ratio'])[:30]:
        md.append(f"| {r['ratio']} | {r['play']} | {r['fans']} | {r['like_rate']}% | {r['sec']}s | {r['pub']} | {cell(r['title'])} | {r['bvid']} |")
    md += ['', '## 绝对播放前 20', '', '| 播放 | 粉丝 | 播放/粉丝 | 时长 | 发布 | 标题 | BV |', '|---|---|---|---|---|---|---|']
    for r in sorted(R, key=lambda r: -r['play'])[:20]:
        md.append(f"| {r['play']} | {r['fans']} | {r['ratio']} | {r['sec']}s | {r['pub']} | {cell(r['title'])} | {r['bvid']} |")
    save(a.out, 'sample', R, '\n'.join(md),
         ['bvid', 'title', 'author', 'fans', 'play', 'ratio', 'like', 'like_rate', 'fav', 'fav_rate', 'reply', 'reply_rate',
          'dm', 'sec', 'pub', 'kw', 'pic'])


def list_window(b, kw, t0, t1):
    """列出 [t0, t1) 里发布、命中关键词的全部稿件：按发布时间倒序翻到底。
    一段超过接口上限（1000 条、50 页）就对半切开再列，免得只拿到这一段里最晚的几个小时。"""
    d = b.search_page(kw, 'pubdate', 1, t0, t1 - 1)
    if (d.get('numResults') or 0) >= 1000 and t1 - t0 > 2 * 3600:
        m = (t0 + t1) // 2
        return list_window(b, kw, t0, m) + list_window(b, kw, m, t1)
    out = list(d.get('result') or [])
    for pg in range(2, min(d.get('numPages') or 1, 50) + 1):
        out += b.search_page(kw, 'pubdate', pg, t0, t1 - 1).get('result') or []
    return out


def pct(n, total):
    return f'{n / total * 100:.1f}%' if total else '-'


def timing_from(b, a):
    """从 sample 输出的 json 里取视频，按播放挑前 --top 条，用详情接口补上精确的发布时刻（不走搜索接口，请求少）"""
    seen = {}
    for f in a.src:
        for r in json.loads(Path(f).read_text(encoding='utf-8')):
            if r.get('bvid') and r['bvid'] not in seen:
                seen[r['bvid']] = r
    # 详情存盘：被限流中断后重跑，已经取过的不再请求
    a.out.mkdir(parents=True, exist_ok=True)
    cache_path = a.out / 'timing_view_cache.json'
    cache = json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {}
    R = []
    for i, s in enumerate(sorted(seen.values(), key=lambda r: -(r.get('play') or 0))[:a.top], 1):
        if s['bvid'] not in cache:
            try:
                v = b.view(s['bvid'])  # 只存要用的字段，整条详情一条就几十 KB
                cache[s['bvid']] = {k: v.get(k) for k in ('title', 'pubdate', 'duration', 'cid', 'stat', 'owner')}
            except urllib.error.HTTPError as ex:
                print(f'取详情被限流（HTTP {ex.code}），先用已取到的 {len(R)} 条', flush=True)
                break
            if i % 20 == 0:
                cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding='utf-8')
        d = cache[s['bvid']]
        if not d.get('pubdate'):
            continue
        x = dt.datetime.fromtimestamp(d['pubdate'], BJ)
        st, own, f = d.get('stat') or {}, d.get('owner') or {}, s.get('fans')
        R.append({'bvid': s['bvid'], 'title': d.get('title'), 'author': own.get('name'), 'mid': own.get('mid'),
                  'play': st.get('view') or 0, 'like': st.get('like') or 0, 'fav': st.get('favorite') or 0,
                  'reply': st.get('reply') or 0, 'dm': st.get('danmaku') or 0, 'sec': d.get('duration') or 0,
                  'ts': d['pubdate'], 'pub': x.strftime('%Y-%m-%d %H:%M'), 'hour': x.hour, 'wd': x.weekday(),
                  'cid': d.get('cid'), 'fans': f, 'ratio': r2((st.get('view') or 0) / f, 2) if f else None,
                  'kw': s.get('kw', '')})
        if i % 50 == 0:
            print(f'详情取了 {i} 条', flush=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding='utf-8')
    desc = (f"来源：{'、'.join(Path(f).name for f in a.src)}，按播放挑前 {a.top} 条（取到 {len(R)} 条）。"
            '这是按播放挑出来的样本，发布时段的分布有选择偏差：只能看「爆款多发在几点」，不能当成「几点发更容易爆」')
    return R, desc, '样本'


def timing_enumerate(b, a):
    """按天把时间窗里命中关键词的稿件全部列出来。请求量大（一个词一天十几页），B 站搜索接口容易限流，只在小窗口用"""
    import random
    start = dt.datetime.strptime(a.start, '%Y-%m-%d').replace(tzinfo=BJ)
    end = dt.datetime.strptime(a.end, '%Y-%m-%d').replace(tzinfo=BJ)
    # 断点续抓：每列完一天、每查 100 位粉丝就存一次，中途被风控或断网，重跑同一条命令会接着来
    a.out.mkdir(parents=True, exist_ok=True)
    cache_path = a.out / f"timing_cache_{'+'.join(a.kw)}_{a.start}_{a.end}.json"
    cache = json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {}
    cache.setdefault('days', {})
    cache.setdefault('fans', {})

    def keep():
        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding='utf-8')

    rows, d0 = {}, start
    while d0 < end:
        key = f'{d0:%Y-%m-%d}'
        if key not in cache['days']:
            t0, t1 = int(d0.timestamp()), int((d0 + dt.timedelta(days=1)).timestamp())
            got = {}
            for kw in a.kw:
                for v in list_window(b, kw, t0, t1):
                    if not t0 <= v.get('pubdate', 0) < t1:
                        continue
                    x = dt.datetime.fromtimestamp(v['pubdate'], BJ)
                    r = got.setdefault(v['bvid'], {
                        'bvid': v['bvid'], 'title': re.sub(r'<[^>]+>', '', v['title']), 'author': v['author'], 'mid': v['mid'],
                        'play': v.get('play') or 0, 'like': v.get('like') or 0, 'fav': v.get('favorites') or 0,
                        'reply': v.get('review') or 0, 'dm': v.get('danmaku') or 0, 'sec': secs(v['duration']),
                        'ts': v['pubdate'], 'pub': x.strftime('%Y-%m-%d %H:%M'), 'hour': x.hour, 'wd': x.weekday(), 'kw': []})
                    if kw not in r['kw']:
                        r['kw'].append(kw)
            cache['days'][key] = list(got.values())
            keep()
        for r in cache['days'][key]:
            old = rows.get(r['bvid'])
            if old:
                old['kw'] = sorted(set(old['kw']) | set(r['kw']))
            else:
                rows[r['bvid']] = dict(r, kw=list(r['kw']))
        print(f'{key} 列完，累计 {len(rows)} 条', flush=True)
        d0 += dt.timedelta(days=1)
    R = list(rows.values())
    for r in R:
        r['kw'] = '、'.join(r['kw'])

    # 粉丝数：随机抽一部分 UP 主查（全查太慢），用来算播放/粉丝比
    mids = sorted({r['mid'] for r in R})
    random.Random(42).shuffle(mids)
    fans = cache['fans']
    for i, m in enumerate(mids[:a.fans], 1):
        if str(m) not in fans:
            fans[str(m)] = b.fans(m)
            if i % 100 == 0:
                keep()
        if i % 200 == 0:
            print(f'粉丝数查了 {i}/{min(a.fans, len(mids))}', flush=True)
    keep()
    for r in R:
        f = fans.get(str(r['mid']))
        r['fans'] = f
        r['ratio'] = r2(r['play'] / f, 2) if f else None
    desc = (f"关键词：{'、'.join(a.kw)}；{a.start} 起、{a.end} 前发布的稿件按天全部列出（不截断），"
            f"其中 {sum(1 for r in R if r['ratio'] is not None)} 条查了 UP 主粉丝数")
    return R, desc, '稿件'


def cmd_timing(b, a):
    if a.src:
        R, desc, unit = timing_from(b, a)
    elif a.kw and a.start and a.end:
        R, desc, unit = timing_enumerate(b, a)
    else:
        sys.exit('timing 要给 --from <sample 输出的 json>，或者 --kw、--start、--end 三样')

    # 观众几点在看：播放最高的若干条视频的弹幕发送时间。只算发布两天后的弹幕（避开首发那波），每条视频等权。
    # 星期分布只用最近两个完整周（周一到周日），而且弹幕池要能覆盖到这两周的开头，否则会偏向最近几天。
    today = dt.datetime.now(BJ).replace(hour=0, minute=0, second=0, microsecond=0)
    w1 = today - dt.timedelta(days=today.weekday())
    w0 = w1 - dt.timedelta(days=14)
    t_w0, t_w1 = int(w0.timestamp()), int(w1.timestamp())
    dm_h, dm_w, n_h, n_w, n_dm = [0.0] * 24, [0.0] * 7, 0, 0, 0
    dm_stop = ''
    for r in sorted(R, key=lambda r: -r['play'])[:a.dm]:
        try:
            cid = r.get('cid') or (b.view(r['bvid']) or {}).get('cid')
            all_ts = b.danmaku_times(cid) if cid else []
        except urllib.error.HTTPError as ex:  # 被限流就停，用已经取到的弹幕出报告
            dm_stop = f'（取弹幕时被限流，HTTP {ex.code}，只用了前面取到的部分）'
            print('取弹幕被限流，停在这里，用已取到的部分出报告', flush=True)
            break
        if not all_ts:
            continue
        ts = [t for t in all_ts if t >= r['ts'] + 2 * 86400]
        if len(ts) >= 20:
            n_h += 1
            n_dm += len(ts)
            for t in ts:
                dm_h[dt.datetime.fromtimestamp(t, BJ).hour] += 1 / len(ts)
        tw = [t for t in ts if t_w0 <= t < t_w1]
        if len(tw) >= 20 and min(all_ts) <= t_w0:
            n_w += 1
            for t in tw:
                dm_w[dt.datetime.fromtimestamp(t, BJ).weekday()] += 1 / len(tw)
    dm_h = [x / n_h for x in dm_h] if n_h else dm_h
    dm_w = [x / n_w for x in dm_w] if n_w else dm_w

    def stats(s):
        withf = [r['ratio'] for r in s if r['ratio'] is not None]
        return (len(s), med([r['play'] for r in s]), pct(sum(1 for r in s if r['play'] >= 10000), len(s)),
                len(withf), r2(med(withf)))

    N = len(R)
    md = [f'# B 站发布时间（{dt.datetime.now(BJ).date()} 抓取，北京时间）', '',
          f"{desc}。{unit} {N} 条，整体播放中位 {med([r['play'] for r in R])}，破万占比 {pct(sum(1 for r in R if r['play'] >= 10000), N)}。", '',
          f'观众弹幕：播放最高的 {a.dm} 条里，{n_h} 条有足够的发布两天后弹幕（共 {n_dm} 条）用来算时段；'
          f'{n_w} 条的弹幕池覆盖 {w0:%m-%d} 到 {w1 - dt.timedelta(days=1):%m-%d} 两个完整周，用来算星期。每条视频等权。'
          f'「观众弹幕占比」说的是目标观众几点在看，和这些视频几点发的无关。{dm_stop}', '',
          '## 按发布时段（两小时一档）', '',
          f'| 时段 | {unit} | {unit}占比 | 播放中位 | 破万占比 | 有粉丝数 | 播放/粉丝中位 | 观众弹幕占比 |', '|---|---|---|---|---|---|---|---|']
    for h in range(0, 24, 2):
        n, mp, wan, nf, rt = stats([r for r in R if h <= r['hour'] < h + 2])
        md.append(f'| {h:02d}–{h + 2:02d} | {n} | {pct(n, N)} | {mp} | {wan} | {nf} | {rt} | {(dm_h[h] + dm_h[h + 1]) * 100:.1f}% |')
    md += ['', '## 按星期', '',
           f'| 星期 | {unit} | {unit}占比 | 播放中位 | 破万占比 | 有粉丝数 | 播放/粉丝中位 | 观众弹幕占比 |', '|---|---|---|---|---|---|---|---|']
    for w in range(7):
        n, mp, wan, nf, rt = stats([r for r in R if r['wd'] == w])
        md.append(f'| 周{WEEK[w]} | {n} | {pct(n, N)} | {mp} | {wan} | {nf} | {rt} | {dm_w[w] * 100:.1f}% |')
    md += ['', f'## 逐小时：{unit}发布和观众弹幕', '', f'| 小时 | {unit}占比 | 观众弹幕占比 |', '|---|---|---|']
    for h in range(24):
        md.append(f"| {h:02d} | {pct(sum(1 for r in R if r['hour'] == h), N)} | {dm_h[h] * 100:.1f}% |")
    md += ['', '## 播放远超粉丝的稿件发在几点（播放 ≥ 1 万，按播放/粉丝排序前 30）', '',
           '| 播放/粉丝 | 播放 | 粉丝 | 发布 | 时长 | 标题 | BV |', '|---|---|---|---|---|---|---|']
    for r in sorted([r for r in R if r['ratio'] and r['play'] >= 10000], key=lambda r: -r['ratio'])[:30]:
        md.append(f"| {r['ratio']} | {r['play']} | {r['fans']} | {r['pub'][5:]} 周{WEEK[r['wd']]} | {r['sec']}s | {cell(r['title'])} | {r['bvid']} |")
    save(a.out, 'timing', R, '\n'.join(md),
         ['bvid', 'title', 'author', 'mid', 'fans', 'play', 'ratio', 'like', 'fav', 'reply', 'dm', 'sec', 'pub', 'hour', 'wd', 'kw'])


def cmd_hotword(b, a):
    j = b.get('https://s.search.bilibili.com/main/hotword', {'limit': 50})
    rows = [{'rank': i, 'word': w.get('show_name') or w.get('keyword'), 'keyword': w.get('keyword'),
             'heat': w.get('heat_score') or w.get('score'), 'ai': bool(re.search(AI_RE, w.get('keyword') or '', re.I))}
            for i, w in enumerate(j.get('list') or [], 1)]
    md = [f'# B 站热搜（{dt.datetime.now(BJ):%Y-%m-%d %H:%M}，{len(rows)} 条）', '',
          'AI 相关：' + ('、'.join(r['word'] for r in rows if r['ai']) or '这一刻没有'), '',
          '| 排名 | 词 | 热度 |', '|---|---|---|']
    md += [f"| {r['rank']} | {'**' + r['word'] + '**' if r['ai'] else r['word']} | {r['heat'] or '-'} |" for r in rows]
    save(a.out, 'hotword', rows, '\n'.join(md))


def cmd_voice(b, a):
    words = [w for w in a.words.split(',') if w]
    out, md = [], [f'# 观众声音（{dt.datetime.now(BJ).date()}）', '']
    for bv in a.bvid:
        d = b.view(bv)
        if not d:
            md.append(f'- {bv}：取不到详情')
            continue
        dms = b.danmaku(d['cid'])
        cms = b.hot_comments(d['aid'])
        counts = {w: sum(1 for x in dms if w.lower() in x.lower()) + sum(1 for c in cms if w.lower() in c['text'].lower())
                  for w in words}
        out.append({'bvid': bv, 'title': d['title'], 'play': d['stat']['view'], 'danmaku': dms, 'comments': cms, 'counts': counts})
        md += [f"## {d['title']}（{bv}，播放 {d['stat']['view']}，弹幕 {len(dms)} 条，热评 {len(cms)} 条）", '',
               '关键词次数：' + '，'.join(f'{w} {n}' for w, n in counts.items() if n) if any(counts.values()) else '关键词都没出现', '',
               '高赞评论：']
        md += [f"- [{c['like']}] {c['text'][:120]}" for c in sorted(cms, key=lambda c: -c['like'])[:8]]
        md.append('')
    save(a.out, 'voice', out, '\n'.join(md))


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8')
        except Exception:
            pass
    p = argparse.ArgumentParser(description='B 站公开数据抓取与粗分析')
    p.add_argument('--out', type=Path, default=Path('bili_out'))
    p.add_argument('--env-proxy', action='store_true', help='走环境变量里的代理（默认直连 B 站）')
    sub = p.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('channel')
    c.add_argument('mid')
    c.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    s = sub.add_parser('sample')
    s.add_argument('--kw', action='append', required=True)
    s.add_argument('--since', default=(dt.datetime.now(BJ).date() - dt.timedelta(days=365)).isoformat())
    s.add_argument('--orders', default='click,totalrank')
    s.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    v = sub.add_parser('voice')
    v.add_argument('bvid', nargs='+')
    v.add_argument('--words', default='区别,token,权限,广告,装不上,报错,多少钱,安全')
    v.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    hw = sub.add_parser('hotword')
    hw.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    t = sub.add_parser('timing')
    t.add_argument('--from', dest='src', nargs='+', help='推荐：sample 输出的 json（可以几份），从里面按播放挑视频，不走搜索接口')
    t.add_argument('--top', type=int, default=150, help='--from 时按播放挑多少条')
    t.add_argument('--kw', action='append', help='全量模式：关键词（请求量大，容易被限流，只在小窗口用）')
    t.add_argument('--start', help='全量模式：窗口第一天（北京时间），离今天至少两周，播放才基本稳定')
    t.add_argument('--end', help='全量模式：窗口结束日（不含这一天）')
    t.add_argument('--fans', type=int, default=1500, help='全量模式：随机查多少位 UP 主的粉丝数')
    t.add_argument('--dm', type=int, default=150, help='取播放最高的多少条视频看弹幕时间')
    t.add_argument('--out', type=Path, default=argparse.SUPPRESS)
    a = p.parse_args()
    b = Bili(env_proxy=a.env_proxy)
    {'channel': cmd_channel, 'sample': cmd_sample, 'voice': cmd_voice, 'timing': cmd_timing,
     'hotword': cmd_hotword}[a.cmd](b, a)


if __name__ == '__main__':
    main()
