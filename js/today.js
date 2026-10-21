(function (global) {
  var API_URL = 'http://127.0.0.1:8310/api/oa_daily';
  var MOCK_URL = 'mock/oa_daily_pack.json';

  function isMember() {
    return typeof XGStorage !== 'undefined' && XGStorage.isMember();
  }

  /* 展示层覆盖：与「可含个股名作市场事实」对齐，勿暗示免费层绝无个股名 */
  var CANON_READ_TIP =
    '先看温度与风格一句，再看板块 Top3；快讯可含个股名作市场事实（非买卖建议）。把「钱往哪类板块涌」写成自己的假设。';

  function sanitizeReadTip(tip) {
    if (!tip) return CANON_READ_TIP;
    var s = String(tip);
    if (/只到行业|默认不展示成分|不跟个股|板块榜只到|不含个股|不展示个股|成分个股/.test(s)) {
      return CANON_READ_TIP;
    }
    return s;
  }

  function sanitizeReadTips(list) {
    return (list || []).map(sanitizeReadTip);
  }

  function showDebugMeta() {
    try {
      var q = new URLSearchParams(location.search || '');
      return q.get('debug') === '1' || q.get('source') === 'mock' || q.get('source') === 'api';
    } catch (e) {
      return false;
    }
  }

  function statusBadge(st) {
    var cls = st === 'ok' ? 'ok' : (st === 'fail' ? 'fail' : 'partial');
    return '<span class="badge ' + cls + '">' + (st || '—') + '</span>';
  }

  function renderMissing(reason) {
    return '<div class="missing-block">数据暂缺' +
      (reason ? '：' + reason : '') +
      '。整块不展示，禁止用个股/荐股话术补位。</div>';
  }

  function memberWall(label) {
    return '<div class="member-wall">' +
      '<div class="member-wall-lock" aria-hidden="true">🔒</div>' +
      '<p class="member-wall-title">' + (label || '完整日包已锁定') + '</p>' +
      '<p class="muted tiny">上面是游客角。会员多：全板块表、资金细项、近几日反复上榜、全日快讯——仍止于事实；可含个股名作市场事实，非买卖建议。</p>' +
      '<div class="row-actions">' +
      '<a class="btn primary" href="pricing.html">看完整日包</a>' +
      '<a class="btn" href="account.html">我有兑换码</a>' +
      '</div></div>';
  }

  /* —— 免费 teaser —— */
  function renderMarketTempTeaser(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var amt = b.amount_wanyi != null ? (b.amount_wanyi + ' 万亿') :
      (b.amount_yi != null ? (XGCommon.fmtNum(b.amount_yi) + ' 亿') : '—');
    var volBand = b.volume_band
      ? ' <span class="tiny">(' + b.volume_band + ')</span>'
      : '';
    return statusBadge(b.status) +
      '<span class="badge">游客精简</span>' +
      '<span class="tiny">截止 ' + (b.as_of || '') + '</span>' +
      '<div class="grid2" style="margin-top:10px">' +
      '<div class="tile"><div class="k">涨 / 跌家数</div><div class="v">' +
        XGCommon.fmtNum(b.up_count) + ' / ' + XGCommon.fmtNum(b.down_count) + '</div></div>' +
      '<div class="tile"><div class="k">成交额</div><div class="v">' + amt + volBand + '</div></div>' +
      '<div class="tile"><div class="k">风格</div><div class="v" style="font-size:0.95rem">' +
        (b.style_label || '—') + '</div></div>' +
      '<div class="tile"><div class="k">情绪相位</div><div class="v" style="font-size:0.95rem">' +
        (b.phase_name || b.phase || '—') + '</div></div>' +
      '</div>' +
      '<p class="tiny" style="margin-top:8px">精简 4 个数，指数明细与涨停炸板等在完整日包。</p>';
  }

  function renderFundTeaser(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var rows = (b.rows || []).slice(0, 3);
    var html = rows.map(function (r) {
      var sig = r.signal;
      if (sig == null || sig === '') {
        if (r.inflow_yi != null) sig = Number(r.inflow_yi) >= 0 ? '↑' : '↓';
        else sig = '—';
      }
      return '<tr><td>' + r.rank + '</td><td>' + (r.industry || '') +
        '</td><td>' + sig + '</td></tr>';
    }).join('');
    var rest = 0;
    if (b.n_sectors_total != null) {
      rest = Math.max(0, Number(b.n_sectors_total) - rows.length);
    } else if (b.n_preview != null) {
      rest = Math.max(0, Number(b.n_preview) - rows.length);
      if (rest === 0 && (b.rows || []).length > rows.length) {
        rest = (b.rows || []).length - rows.length;
      }
    } else {
      rest = Math.max(0, (b.rows || []).length - rows.length);
    }
    return statusBadge(b.status) +
      '<span class="badge">Top3 预览</span>' +
      '<span class="tiny">' + (b.as_of || '') + '</span>' +
      (html
        ? '<table class="data" style="margin-top:10px"><thead><tr><th>#</th><th>板块</th><th>粗方向</th></tr></thead><tbody>' +
          html + '</tbody></table>'
        : '<p class="muted">今日无达标板块统计。</p>') +
      (rest > 0
        ? '<p class="tiny">另有 ' + rest + ' 个板块在完整日包全表中。</p>'
        : '') +
      '<p class="tiny">板块区只到板块名与粗方向；快讯可含个股名作市场事实，非买卖建议。</p>';
  }

  function renderMoodTeaser(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var tip = '';
    if (b.read_tips && b.read_tips.length) tip = sanitizeReadTip(b.read_tips[0]);
    else tip = CANON_READ_TIP;
    var newsTip = '';
    if (b.news_tip && b.news_tip.text) {
      newsTip =
        '<div class="read-tip" style="margin-top:10px">' +
        '<div class="k">一条值得停一秒</div>' +
        '<p style="margin:4px 0 0">' + b.news_tip.text + '</p>' +
        (b.news_tip.time ? '<p class="tiny muted" style="margin:4px 0 0">' + b.news_tip.time + ' · 事实汇编，非推荐</p>' : '') +
        '</div>';
    }
    return statusBadge(b.status) +
      '<span class="badge">情绪一句</span>' +
      '<p style="font-size:1.05rem;margin:10px 0">' + (b.one_liner || b.fallback || '—') + '</p>' +
      newsTip +
      '<div class="read-tip"><div class="k">今天怎么读</div><p class="muted" style="margin:4px 0 0">' + tip + '</p></div>' +
      '<p class="tiny" style="margin-top:8px">更多快讯在完整日包。描述性语句，非买卖指令；个股名仅作事实。</p>';
  }

  /* —— 会员全量 —— */
  function renderMarketTempFull(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var idx = (b.indices || []).map(function (i) {
      return '<div class="tile"><div class="k">' + (i.name || '') + '</div>' +
        '<div class="v ' + XGCommon.pctClass(i.pct) + '">' +
        XGCommon.fmtNum(i.price) + ' <span style="font-size:13px">' + XGCommon.fmtPct(i.pct) + '</span></div></div>';
    }).join('');
    return statusBadge(b.status) +
      '<span class="badge ok">日包完整</span>' +
      '<span class="tiny">截止 ' + (b.as_of || '') + '</span>' +
      '<div class="grid2" style="margin-top:10px">' + idx + '</div>' +
      '<div class="grid3" style="margin-top:10px">' +
      '<div class="tile"><div class="k">涨/跌家数</div><div class="v">' + XGCommon.fmtNum(b.up_count) + ' / ' + XGCommon.fmtNum(b.down_count) + '</div></div>' +
      '<div class="tile"><div class="k">涨停/炸板/跌停</div><div class="v">' + XGCommon.fmtNum(b.zt) + ' / ' + XGCommon.fmtNum(b.zb) + ' / ' + XGCommon.fmtNum(b.dt) + '</div></div>' +
      '<div class="tile"><div class="k">成交额</div><div class="v">' + (b.amount_wanyi != null ? b.amount_wanyi + ' 万亿' : XGCommon.fmtNum(b.amount_yi) + ' 亿') +
      ' <span class="tiny">(' + (b.volume_band || '未知') + ')</span></div></div>' +
      '</div>' +
      '<p class="muted" style="margin-top:10px">情绪相位：' + (b.phase_name || '—') +
      (b.temp_score != null ? '（' + b.temp_score + '分）' : '') +
      ' · 风格：' + (b.style_label || '—') + '</p>' +
      near5Html(b.near5_compare) +
      '<p class="tiny">只读描述，不构成操作建议。</p>';
  }

  function renderFundFull(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var rows = (b.rows || []).map(function (r) {
      var inflow = r.inflow_yi == null ? '—' : r.inflow_yi + ' 亿';
      return '<tr><td>' + r.rank + '</td><td>' + (r.industry || '') + '</td><td>' + XGCommon.fmtNum(r.n) +
        '</td><td>' + inflow + '</td></tr>';
    }).join('');
    var tips = sanitizeReadTips(b.read_tips).map(function (t) { return '<li>' + t + '</li>'; }).join('');
    var dimsNote = '';
    if (b.dims) {
      var ds = b.dims.status;
      if (ds === 'partial' || ds === 'missing' || ds === 'stub' || !ds) {
        dimsNote = '<p class="tiny muted">细项逐步补齐</p>';
      }
    }
    return statusBadge(b.status) +
      '<span class="badge ok">日包完整</span>' +
      '<span class="tiny">' + (b.title || '资金异动板块参考') + ' · ' + (b.as_of || '') + '</span>' +
      (rows
        ? '<table class="data" style="margin-top:10px"><thead><tr><th>#</th><th>板块</th><th>异动家数</th><th>净流入(亿)</th></tr></thead><tbody>' +
          rows + '</tbody></table>'
        : '<p class="muted">今日无达标板块统计。</p>') +
      '<p class="tiny">口径：n_stocks=' + XGCommon.fmtNum(b.n_stocks) +
      ' · unlabeled=' + XGCommon.fmtNum(b.n_unlabeled) +
      ' · sectors=' + XGCommon.fmtNum(b.n_sectors) + '（板块表不列成分股名单；快讯可含个股名作事实）</p>' +
      dimsNote +
      (tips ? '<ul class="tiny">' + tips + '</ul>' : '') +
      streakHtml(b.streak || b.lianbang || b.near5_streak);
  }

  function renderMoodFull(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var items = (b.items || []).map(function (it) {
      return '<li><span class="tiny">' + (it.time || '') + '</span> ' + (it.text || '') + '</li>';
    }).join('');
    return statusBadge(b.status) +
      '<span class="badge ok">日包完整</span>' +
      '<p style="font-size:1.05rem;margin:10px 0">' + (b.one_liner || b.fallback || '—') + '</p>' +
      (items ? '<ul>' + items + '</ul>' : '<p class="muted">快讯暂无</p>') +
      '<p class="tiny">来源 ' + (b.source || '—') + ' · 描述性语句，非买卖指令。</p>';
  }


  function near5Html(near5) {
    if (!near5) {
      return '<p class="tiny muted" style="margin-top:8px">近5日对比：积累中</p>';
    }
    var st = near5.status;
    var series = near5.series || [];
    if (st === 'missing' || st === 'stub' || st === 'partial' || !series.length || series.length < 2) {
      return '<p class="tiny muted" style="margin-top:8px">近5日对比：积累中</p>';
    }
    return '<p class="tiny muted" style="margin-top:8px">近5日对比已就绪（' + series.length + ' 日）</p>';
  }

  function streakHtml(streak) {
    if (!streak) {
      return '<p class="tiny muted">连榜轨迹（近5日上榜）：积累中</p>';
    }
    var st = streak.status;
    var rows = streak.rows || streak.items || streak.series || [];
    if (st === 'missing' || st === 'stub' || st === 'partial' || !rows.length) {
      return '<p class="tiny muted">连榜轨迹（近5日上榜）：积累中</p>';
    }
    return '<p class="tiny muted">连榜轨迹（近5日上榜）：已有 ' + rows.length + ' 条</p>';
  }

  function preferApi() {
    try {
      var q = new URLSearchParams(location.search || '');
      if (q.get('source') === 'mock') return false;
      if (q.get('source') === 'api') return true;
      if (localStorage.getItem('xg_oa_source') === 'api') return true;
    } catch (e) {}
    return true;
  }

  function renderPack(pack, from) {
    var member = isMember();
    var meta = pack.meta || {};
    var blocks = member
      ? (pack.full_pack || pack.blocks || {})
      : (pack.free_teaser || pack.blocks || {});
    var order = pack.render_order || ['market_temp', 'fund_sector', 'news_mood'];
    var elMeta = document.getElementById('pack-meta');
    if (elMeta) {
      var metaExtra = showDebugMeta()
        ? (' · 数据源 ' + (from || '—'))
        : '';
      elMeta.innerHTML =
        statusBadge(meta.source_status) +
        '<strong>交易日 ' + (meta.trade_date || '—') + '</strong> · 截止 ' + (meta.as_of || '—') +
        '<br><span class="tiny">生成 ' + (meta.generated_at || '—') + ' · schema ' + (pack.schema || '') +
        metaExtra +
        ' · ' + (member ? '日包会员 · 全量' : '游客 · 精简 teaser') + '</span>' +
        '<p class="tiny" style="margin-top:6px">' + (meta.disclaimer || '') + '</p>';
    }
    var badge = document.getElementById('pack-tier-badge');
    if (badge) {
      badge.textContent = member ? '日包会员' : '游客精简';
      badge.className = 'badge ' + (member ? 'ok' : 'partial');
    }

    function moodTeaserMerged(b) {
      var merged = {};
      var src = b || {};
      Object.keys(src).forEach(function (k) { merged[k] = src[k]; });
      if ((!merged.read_tips || !merged.read_tips.length) && blocks.read_tip) {
        merged.read_tips = [blocks.read_tip];
      }
      return renderMoodTeaser(merged);
    }

    var map = member
      ? {
          market_temp: { title: '市场温度 · 完整卡', render: renderMarketTempFull },
          fund_sector: { title: '资金异动 · 板块全表', render: renderFundFull },
          news_mood: { title: '快讯汇编与情绪', render: renderMoodFull }
        }
      : {
          market_temp: { title: '今日温度', render: renderMarketTempTeaser },
          fund_sector: { title: '钱往哪涌了（先看前三）', render: renderFundTeaser },
          news_mood: { title: '情绪一句 · 一条快讯', render: moodTeaserMerged }
        };

    var root = document.getElementById('pack-blocks');
    if (!root) return;
    root.innerHTML = '';
    order.forEach(function (k) {
      var conf = map[k];
      if (!conf) return;
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<h2>' + conf.title + '</h2><div>' + conf.render(blocks[k]) + '</div>';
      root.appendChild(card);
    });

    /* 非会员：完整区锁定卡 */
    if (!member) {
      var wall = document.createElement('div');
      wall.className = 'card';
      wall.innerHTML = '<h2>完整日包</h2>' + memberWall('温度全文 · 板块全表 · 更多快讯已锁定');
      root.appendChild(wall);
    }

    var cta = document.getElementById('pack-cta');
    if (cta) {
      if (member) {
        cta.innerHTML =
          '<div class="card">' +
          '<h2>开包完成</h2>' +
          '<p class="muted">把假设写进自己的笔记；近几日反复上榜等历史字段攒够再亮。</p>' +
          '<div class="row-actions">' +
          '<a class="btn primary" href="notes.html">写复盘笔记</a>' +
          '<a class="btn" href="watchlist.html">管理自选</a>' +
          '</div></div>';
      } else {
        cta.innerHTML =
          '<div class="card">' +
          '<h2>看完整日包</h2>' +
          '<p class="muted">上面是游客角：温度精简 · 板块前三 · 一条快讯。会员多：<strong>全板块表、资金细项、近几日反复上榜、全日快讯</strong>。</p>' +
          '<p class="tiny">可含个股名作市场事实，非买卖建议。</p>' +
          '<div class="row-actions">' +
          '<a class="btn primary" href="pricing.html">看完整日包</a>' +
          '<a class="btn" href="notes.html">先写一条笔记</a>' +
          '</div></div>';
      }
    }
  }

  function fetchJson(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function load() {
    var el = document.getElementById('pack-meta');
    function fail(err) {
      if (el) {
        el.innerHTML = '<div class="missing-block">无法加载日更包（' + (err && err.message ? err.message : err) +
          '）。请用本地 HTTP 服务打开；API 需面板 8310 且允许跨域，否则会自动回退本地日包。</div>';
      }
    }
    function fromMock() {
      return fetchJson(MOCK_URL).then(function (pack) {
        renderPack(pack, 'mock');
      });
    }
    if (!preferApi()) {
      fromMock().catch(fail);
      return;
    }
    var member = isMember();
    var viewUrl = API_URL + (member ? '?view=full' : '?view=free');
    var viewLabel = member ? 'api:8310?view=full' : 'api:8310?view=free';
    fetchJson(viewUrl)
      .then(function (pack) {
        renderPack(pack, viewLabel);
      })
      .catch(function () {
        return fetchJson(API_URL).then(function (pack) {
          renderPack(pack, 'api:8310');
        });
      })
      .catch(function () {
        return fromMock();
      })
      .catch(fail);
  }

  global.XGToday = { load: load, renderPack: renderPack, API_URL: API_URL, MOCK_URL: MOCK_URL };
})(window);
