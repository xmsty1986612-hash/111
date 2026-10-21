/* localStorage helpers — watchlist/notes/disclaimer/membership */
(function (global) {
  var PREFIX = 'xg_web_v1_';
  var FREE = { watchlist: 20, notes: 30 };

  function key(k) { return PREFIX + k; }

  function getJSON(k, fallback) {
    try {
      var raw = localStorage.getItem(key(k));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function setJSON(k, v) {
    localStorage.setItem(key(k), JSON.stringify(v));
  }

  function getDisclaimer() {
    return getJSON('disclaimer', null);
  }

  function setDisclaimer(version) {
    setJSON('disclaimer', {
      version: version || 'v1',
      agreedAt: new Date().toISOString()
    });
  }

  function hasAgreedDisclaimer() {
    var d = getDisclaimer();
    return !!(d && d.version);
  }

  function getWatchlist() {
    return getJSON('watchlist', []);
  }

  function setWatchlist(list) {
    setJSON('watchlist', list || []);
  }

  function getNotes() {
    return getJSON('notes', []);
  }

  function setNotes(list) {
    setJSON('notes', list || []);
  }

  function getMembership() {
    return getJSON('membership', {
      plan: 'free',
      periodEnd: null,
      redeemCodesUsed: []
    });
  }

  function setMembership(m) {
    setJSON('membership', m);
  }

  function isMember() {
    var m = getMembership();
    if (!m || m.plan === 'free') return false;
    if (!m.periodEnd) return true;
    return new Date(m.periodEnd).getTime() > Date.now();
  }

  function watchlistLimit() {
    return isMember() ? 200 : FREE.watchlist;
  }

  function notesLimit() {
    return isMember() ? 500 : FREE.notes;
  }

  function getOrders() {
    return getJSON('orders', []);
  }

  function addOrder(order) {
    var list = getOrders();
    list.unshift(order);
    setJSON('orders', list);
    return order;
  }

  function getRedeemPool() {
    /* demo codes: tool_month_demo / tool_year_demo / pack_quota_demo */
    return getJSON('redeem_pool', {
      tool_month_demo: { plan: 'tool_month', days: 30, label: '工具会员·月（演示）' },
      tool_year_demo: { plan: 'tool_year', days: 365, label: '工具会员·年（演示）' },
      pack_quota_demo: { plan: 'pack_quota', days: 0, label: '额度加油包（演示）', bumpNotes: 200, bumpWatch: 100 }
    });
  }

  function setRedeemPool(pool) {
    setJSON('redeem_pool', pool);
  }

  function redeemCode(code) {
    code = String(code || '').trim();
    var pool = getRedeemPool();
    var entry = pool[code];
    if (!entry) return { ok: false, msg: '兑换码无效' };
    var m = getMembership();
    m.redeemCodesUsed = m.redeemCodesUsed || [];
    if (m.redeemCodesUsed.indexOf(code) >= 0) {
      return { ok: false, msg: '该兑换码已使用' };
    }
    if (entry.plan === 'pack_quota') {
      m.extraWatch = (m.extraWatch || 0) + (entry.bumpWatch || 0);
      m.extraNotes = (m.extraNotes || 0) + (entry.bumpNotes || 0);
    } else {
      m.plan = entry.plan;
      var end = new Date();
      end.setDate(end.getDate() + (entry.days || 30));
      m.periodEnd = end.toISOString();
    }
    m.redeemCodesUsed.push(code);
    setMembership(m);
    return { ok: true, msg: '开通成功：' + (entry.label || entry.plan), membership: m };
  }

  /* admin: generate one-off code */
  function issueCode(plan, days, label) {
    var code = 'XG' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    var pool = getRedeemPool();
    pool[code] = { plan: plan, days: days || 30, label: label || plan };
    setRedeemPool(pool);
    return code;
  }

  global.XGStorage = {
    FREE: FREE,
    getJSON: getJSON,
    setJSON: setJSON,
    getDisclaimer: getDisclaimer,
    setDisclaimer: setDisclaimer,
    hasAgreedDisclaimer: hasAgreedDisclaimer,
    getWatchlist: getWatchlist,
    setWatchlist: setWatchlist,
    getNotes: getNotes,
    setNotes: setNotes,
    getMembership: getMembership,
    setMembership: setMembership,
    isMember: isMember,
    watchlistLimit: watchlistLimit,
    notesLimit: notesLimit,
    getOrders: getOrders,
    addOrder: addOrder,
    getRedeemPool: getRedeemPool,
    redeemCode: redeemCode,
    issueCode: issueCode
  };
})(window);
