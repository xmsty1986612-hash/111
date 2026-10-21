(function (global) {
  function applyPlanLocal(plan, code) {
    var m = XGStorage.getMembership();
    m.redeemCodesUsed = m.redeemCodesUsed || [];
    if (code && m.redeemCodesUsed.indexOf(code) >= 0) {
      return { ok: false, msg: '该兑换码已在本机使用' };
    }
    if (plan.plan === 'pack_quota' || plan.plan === 'pack_expand') {
      m.extraWatch = (m.extraWatch || 0) + (plan.bumpWatch || 0);
      m.extraNotes = (m.extraNotes || 0) + (plan.bumpNotes || 0);
    } else if (plan.plan === 'pack_export') {
      m.extraExport = (m.extraExport || 0) + (plan.bumpExport || 1);
    } else {
      m.plan = plan.plan;
      var end = new Date();
      end.setDate(end.getDate() + (plan.days || 30));
      m.periodEnd = end.toISOString();
    }
    if (code) m.redeemCodesUsed.push(code);
    XGStorage.setMembership(m);
    return { ok: true, msg: '开通成功：' + (plan.label || plan.plan), membership: m };
  }

  function render() {
    var m = XGStorage.getMembership();
    var el = document.getElementById('acc-status');
    var member = XGStorage.isMember();
    el.innerHTML =
      '<p>' + XGCommon.memberBadgeHtml() + '</p>' +
      '<div class="grid2">' +
      '<div class="tile"><div class="k">计划</div><div class="v">' + (m.plan || 'free') + '</div></div>' +
      '<div class="tile"><div class="k">有效期至</div><div class="v" style="font-size:14px">' +
      (m.periodEnd ? new Date(m.periodEnd).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + ' Asia/Shanghai' : (member ? '—' : '未开通')) +
      '</div></div></div>' +
      '<p class="tiny" style="margin-top:8px">自选上限 ' + (XGStorage.watchlistLimit() + (m.extraWatch || 0)) +
      ' · 笔记上限 ' + (XGStorage.notesLimit() + (m.extraNotes || 0)) + '</p>';
    var orders = XGStorage.getOrders();
    var box = document.getElementById('acc-orders');
    if (!orders.length) {
      box.innerHTML = '<p class="muted">暂无本地订单记录。</p>';
    } else {
      box.innerHTML = '<table class="data"><thead><tr><th>订单号</th><th>SKU</th><th>金额</th><th>状态</th></tr></thead><tbody>' +
        orders.map(function (o) {
          return '<tr><td>' + o.id + '</td><td>' + o.sku + '</td><td>¥' + o.amount + '</td><td>' + o.status + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
  }

  function init() {
    document.getElementById('acc-redeem').onclick = function () {
      var code = (document.getElementById('acc-code').value || '').trim();
      var msgEl = document.getElementById('acc-msg');
      if (!code) { msgEl.textContent = '请输入兑换码'; return; }
      msgEl.textContent = '兑换中…';
      fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      }).then(function (r) {
        return r.json().then(function (j) { return { httpOk: r.ok, j: j }; });
      }).then(function (res) {
        if (res.httpOk && res.j && res.j.ok && res.j.plan) {
          var local = applyPlanLocal(res.j.plan, code);
          msgEl.textContent = local.ok ? (res.j.msg || local.msg) : local.msg;
          render();
          return;
        }
        throw new Error((res.j && res.j.error) || 'api_fail');
      }).catch(function () {
        var r = XGStorage.redeemCode(code);
        msgEl.textContent = r.msg + (r.ok ? '' : '（已回退本地兑换池）');
        render();
      });
    };
    render();
  }
  global.XGAccount = { init: init, render: render };
})(window);
