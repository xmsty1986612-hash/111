(function (global) {
  var API_URL = 'http://127.0.0.1:8310/api/oa_daily';
  var MOCK_URL = 'mock/oa_daily_pack.json';

  function isMember() {
    return typeof XGStorage !== 'undefined' && XGStorage.isMember();
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
      '<p class="muted tiny">游客只看到角。开通日包会员可打开完整温度卡、板块全表与快讯汇编——仍止于板块与事实，不含个股买卖建议。</p>' +
      '<div class="row-actions">' +
      '<a class="btn primary" href="pricing.html">打开完整日包</a>' +
      '<a class="btn" href="account.html">我有兑换码</a>' +
      '</div></div>';
  }

  /* —— 免费 teaser —— */
  function renderMarketTempTeaser(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var amt = b.amount_wanyi != null ? (b.amount_wanyi + ' 万亿') :
      (b.amount_yi != null ? (XGCommon.fmtNum(b.amount_yi) + ' 亿') : '—');
    return statusBadge(b.status) +
      '<span class="badge">游客精简</span>' +
      '<span class="tiny">截止 ' + (b.as_of || '') + '</span>' +
      '<div class="grid2" style="margin-top:10px">' +
      '<div class="tile"><div class="k">涨 / 跌家数</div><div class="v">' +
        XGCommon.fmtNum(b.up_count) + ' / ' + XGCommon.fmtNum(b.down_count) + '</div></div>' +
      '<div class="tile"><div class="k">成交额</div><div class="v">' + amt +
        ' <span class="tiny">(' + (b.volume_band || '—') + ')</span></div></div>' +
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
      var dir = r.inflow_yi == null ? '—' :
        (Number(r.inflow_yi) >= 0 ? '↑' : '↓');
      var inflow = r.inflow_yi == null ? '—' : (r.inflow_yi + ' 亿');
      return '<tr><td>' + r.rank + '</td><td>' + (r.industry || '') +
        '</td><td>' + dir + ' ' + inflow + '</td></tr>';
    }).join('');
    var rest = Math.max(0, (b.rows || []).length - 3);
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
      '<p class="tiny">只到板块名与粗方向，默认不展示成分个股。</p>';
  }

  function renderMoodTeaser(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var tip = '';
    if (b.read_tips && b.read_tips.length) tip = b.read_tips[0];
    else tip = '先对照温度与 Top3 板块，把「我认为资金在往哪类板块」写成自己的笔记假设——不写个股买卖。';
    return statusBadge(b.status) +
      '<span class="badge">情绪一句</span>' +
      '<p style="font-size:1.05rem;margin:10px 0">' + (b.one_liner || b.fallback || '—') + '</p>' +
      '<div class="read-tip"><div class="k">今日怎么读</div><p class="muted" style="margin:4px 0 0">' + tip + '</p></div>' +
      '<p class="tiny" style="margin-top:8px">快讯全日列表在完整日包。描述性语句，非买卖指令。</p>';
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
      '<p class="tiny">只读描述，不构成操作建议。</p>';
  }

  function renderFundFull(b) {
    if (!b || b.status === 'missing') return renderMissing(b && b.reason);
    var rows = (b.rows || []).map(function (r) {
      var inflow = r.inflow_yi == null ? '—' : r.inflow_yi + ' 亿';
      return '<tr><td>' + r.rank + '</td><td>' + (r.industry || '') + '</td><td>' + XGCommon.fmtNum(r.n) +
        '</td><td>' + inflow + '</td></tr>';
    }).join('');
    var tips = (b.read_tips || []).map(function (t) { return '<li>' + t + '</li>'; }).join('');
    return statusBadge(b.status) +
      '<span class="badge ok">日包完整</span>' +
      '<span class="tiny">' + (b.title || '资金异动板块参考') + ' · ' + (b.as_of || '') + '</span>' +
      (rows
        ? '<table class="data" style="margin-top:10px"><thead><tr><th>#</th><th>板块</th><th>异动家数</th><th>净流入(亿)</th></tr></thead><tbody>' +
          rows + '</tbody></table>'
        : '<p class="muted">今日无达标板块统计。</p>') +
      '<p class="tiny">口径：n_stocks=' + XGCommon.fmtNum(b.n_stocks) +
      ' · unlabeled=' + XGCommon.fmtNum(b.n_unlabeled) +
      ' · sectors=' + XGCommon.fmtNum(b.n_sectors) + '（默认不展示成分个股）</p>' +
      (tips ? '<ul class="tiny">' + tips + '</ul>' : '') +
      '<p class="tiny muted">连榜轨迹（近5日上榜）· 即将开放</p>';
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
    var blocks = pack.blocks || {};
    var order = pack.render_order || ['market_temp', 'fund_sector', 'news_mood'];
    var elMeta = document.getElementById('pack-meta');
    if (elMeta) {
      elMeta.innerHTML =
        statusBadge(meta.source_status) +
        '<strong>交易日 ' + (meta.trade_date || '—') + '</strong> · 截止 ' + (meta.as_of || '—') +
        '<br><span class="tiny">生成 ' + (meta.generated_at || '—') + ' · schema ' + (pack.schema || '') +
        ' · 数据源 ' + (from || '—') +
        ' · ' + (member ? '日包会员 · 全量' : '游客 · 精简 teaser') + '</span>' +
        '<p class="tiny" style="margin-top:6px">' + (meta.disclaimer || '') + '</p>';
    }
    var badge = document.getElementById('pack-tier-badge');
    if (badge) {
      badge.textContent = member ? '日包会员' : '游客精简';
      badge.className = 'badge ' + (member ? 'ok' : 'partial');
    }

    var map = member
      ? {
          market_temp: { title: '市场温度 · 完整卡', render: renderMarketTempFull },
          fund_sector: { title: '资金异动 · 板块全表', render: renderFundFull },
          news_mood: { title: '快讯汇编与情绪', render: renderMoodFull }
        }
      : {
          market_temp: { title: '市场温度 · 精简', render: renderMarketTempTeaser },
          fund_sector: { title: '资金异动 · Top3', render: renderFundTeaser },
          news_mood: { title: '情绪一句', render: renderMoodTeaser }
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
      wall.innerHTML = '<h2>完整日包</h2>' + memberWall('温度全文 · 板块全表 · 快讯汇编已锁定');
      root.appendChild(wall);
    }

    var cta = document.getElementById('pack-cta');
    if (cta) {
      if (member) {
        cta.innerHTML =
          '<div class="card">' +
          '<h2>开包完成</h2>' +
          '<p class="muted">把假设写进自己的笔记；连榜轨迹即将开放。</p>' +
          '<div class="row-actions">' +
          '<a class="btn primary" href="notes.html">写复盘笔记</a>' +
          '<a class="btn" href="watchlist.html">管理自选</a>' +
          '</div></div>';
      } else {
        cta.innerHTML =
          '<div class="card">' +
          '<h2>打开完整日包 / 深观察</h2>' +
          '<p class="muted">游客只看到角。完整板块资金表、深层卡与快讯汇编在日包会员里——不含个股买卖建议。</p>' +
          '<div class="row-actions">' +
          '<a class="btn primary" href="pricing.html">打开完整日包</a>' +
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
          '）。请用本地 HTTP 服务打开；API 需 dz918 面板 8310 且允许跨域，否则会自动回退 mock。</div>';
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
    fetchJson(API_URL)
      .then(function (pack) {
        renderPack(pack, 'api:8310');
      })
      .catch(function () {
        return fromMock();
      })
      .catch(fail);
  }

  global.XGToday = { load: load, renderPack: renderPack, API_URL: API_URL, MOCK_URL: MOCK_URL };
})(window);
