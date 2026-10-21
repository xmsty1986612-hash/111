/* shared nav, disclaimer gate, footer */
(function (global) {
  var PAGES = [
    { href: 'today.html', id: 'today', label: '今日复盘' },
    { href: 'watchlist.html', id: 'watchlist', label: '自选' },
    { href: 'notes.html', id: 'notes', label: '笔记' },
    { href: 'screener.html', id: 'screener', label: '筛选' },
    { href: 'pricing.html', id: 'pricing', label: '会员' },
    { href: 'account.html', id: 'account', label: '我的' },
    { href: 'legal.html', id: 'legal', label: '声明' }
  ];

  function currentPage() {
    var path = (location.pathname || '').split('/').pop() || 'index.html';
    if (path === 'index.html' || path === '') path = 'today.html';
    return path;
  }

  function renderChrome(activeId) {
    var disc = document.getElementById('disc-bar');
    if (disc) {
      disc.innerHTML =
        '本站提供市场事实汇编与个人记录，不构成投资建议，不荐股。投资有风险，决策自负。' +
        ' <a href="legal.html">完整声明</a>';
    }
    var nav = document.getElementById('site-nav');
    if (nav) {
      var cur = currentPage();
      var html = '<span class="brand">选股工具站</span>';
      PAGES.forEach(function (p) {
        var cls = (p.href === cur || p.id === activeId) ? 'active' : '';
        html += '<a class="' + cls + '" href="' + p.href + '">' + p.label + '</a>';
      });
      html += '<span class="spacer"></span>';
      html += '<a class="cta-pay" href="pricing.html">开通会员</a>';
      nav.innerHTML = html;
    }
    var foot = document.getElementById('site-footer');
    if (foot) {
      foot.innerHTML =
        '<p>收费为<strong>日更复盘包会员费</strong>（完整日包 / 深观察：全表、深卡、连榜与开包身份；笔记导出为附带），不是投顾服务费。</p>' +
        '<p>商品名：日更复盘包会员（副标深观察）、导出特权包、复盘本加页。禁止荐股/解盘/今日标的等表述。</p>' +
        '<p><a href="legal.html">免责与隐私</a> · <a href="pay.html">购买</a> · <a href="account.html">开通状态</a></p>';
    }
  }

  function gateDisclaimer(opts) {
    opts = opts || {};
    if (opts.skip) return true;
    if (typeof XGStorage === 'undefined') return true;
    if (XGStorage.hasAgreedDisclaimer()) return true;
    var cur = currentPage();
    if (cur === 'legal.html') return true;
    /* show blocking modal */
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.id = 'disclaimer-gate';
    mask.innerHTML =
      '<div class="modal">' +
      '<h2>使用前请阅读并同意</h2>' +
      '<p class="muted">本产品是筛选与记录工具，不提供证券投资咨询。条件命中与字段展示不构成投资建议；买卖决策自负，盈亏自担。我们不提供个股推荐、买卖点、目标价、仓位建议。</p>' +
      '<p class="muted">请阅读完整声明后再继续使用。</p>' +
      '<div class="row-actions">' +
      '<a class="btn primary" href="legal.html">去阅读并同意</a>' +
      '</div></div>';
    document.body.appendChild(mask);
    return false;
  }

  function pctClass(pct) {
    if (pct == null || isNaN(pct)) return '';
    return pct >= 0 ? 'up' : 'down';
  }

  function fmtPct(pct) {
    if (pct == null || isNaN(pct)) return '—';
    var n = Number(pct);
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function fmtNum(n) {
    if (n == null || n === '') return '—';
    return String(n);
  }

  function memberBadgeHtml() {
    if (typeof XGStorage === 'undefined') return '';
    if (XGStorage.isMember()) {
      var m = XGStorage.getMembership();
      return '<span class="tag-member">会员 · ' + (m.plan || '') + '</span>';
    }
    return '<span class="tag-free">免费额度</span>';
  }

  global.XGCommon = {
    renderChrome: renderChrome,
    gateDisclaimer: gateDisclaimer,
    pctClass: pctClass,
    fmtPct: fmtPct,
    fmtNum: fmtNum,
    memberBadgeHtml: memberBadgeHtml,
    currentPage: currentPage
  };
})(window);
