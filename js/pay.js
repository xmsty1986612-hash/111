(function (global) {
  var FEISHU_FORM_URL = 'FEISHU_FORM_URL_PLACEHOLDER';

  function orderId() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'XG' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) +
      Math.floor(Math.random() * 90 + 10);
  }

  function toast(text) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function copyOrderId(oid) {
    oid = oid || (document.getElementById('pay-order') && document.getElementById('pay-order').value) || '';
    if (!oid) { toast('暂无订单号'); return; }
    function ok() { toast('订单号已复制：' + oid); }
    function fail() {
      try {
        var inp = document.getElementById('pay-order');
        if (inp) { inp.focus(); inp.select(); document.execCommand('copy'); ok(); return; }
      } catch (e) {}
      toast('复制失败，请手动选中订单号');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(oid).then(ok).catch(fail);
    } else {
      fail();
    }
  }

  function enableCopy(oid) {
    var b1 = document.getElementById('pay-copy');
    var b2 = document.getElementById('pay-copy-2');
    if (b1) { b1.disabled = false; b1.onclick = function () { copyOrderId(oid); }; }
    if (b2) { b2.onclick = function () { copyOrderId(oid); }; }
  }

  function showPanel(amount, oid, msg) {
    document.getElementById('pay-amount').textContent = '¥' + amount;
    document.getElementById('pay-panel').style.display = 'block';
    document.getElementById('pay-msg').textContent = msg || '';
    var link = document.getElementById('pay-feishu-link');
    if (link) {
      link.href = FEISHU_FORM_URL;
      link.textContent = '打开飞书登记表（' + FEISHU_FORM_URL + '）';
    }
    enableCopy(oid);
  }

  function saveLocal(order) {
    if (typeof XGStorage !== 'undefined' && XGStorage.addOrder) {
      XGStorage.addOrder(order);
    }
  }

  /* 公网静态默认不上 API；仅本地 w1_server 时可选尝试，失败不挡复制/登记 */
  function tryApiOptional(payload) {
    if (location.protocol === 'file:') return Promise.resolve(null);
    return fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (res.ok && res.j && res.j.ok && res.j.order) return res.j.order;
      return null;
    }).catch(function () { return null; });
  }

  function init() {
    var q = new URLSearchParams(location.search || '');
    var sku = q.get('sku');
    if (sku) {
      var sel0 = document.getElementById('pay-sku');
      if (sel0 && sel0.querySelector('option[value="' + sku + '"]')) sel0.value = sku;
    }
    document.getElementById('pay-order').value = orderId();

    var copyBtn = document.getElementById('pay-copy');
    if (copyBtn) {
      copyBtn.disabled = false;
      copyBtn.onclick = function () {
        copyOrderId(document.getElementById('pay-order').value);
      };
    }

    document.getElementById('pay-gen').onclick = function () {
      var msgEl = document.getElementById('pay-msg');
      var wx = (document.getElementById('pay-wx').value || '').trim();
      if (!wx) { msgEl.textContent = '请填写微信号，便于开通联系'; return; }
      var sel = document.getElementById('pay-sku');
      var opt = sel.options[sel.selectedIndex];
      var amount = Number(opt.getAttribute('data-amount'));
      var oid = document.getElementById('pay-order').value || orderId();
      document.getElementById('pay-order').value = oid;
      var phone = (document.getElementById('pay-phone').value || '').trim();
      var payload = {
        id: oid,
        sku: sel.value,
        amount: amount,
        wx: wx,
        phone: phone,
        channel: 'lakala',
        status: 'pending_pay',
        createdAt: new Date().toISOString()
      };

      /* 静态优先：先落本机，立刻展示收款码 + 复制 + 飞书登记 */
      saveLocal(payload);
      showPanel(amount, oid,
        '订单已记在本机。请复制订单号 → 扫码付款（备注填订单号）→ 飞书登记。开通请到「我的」。');
      copyOrderId(oid);

      tryApiOptional(payload).then(function (serverOrder) {
        if (!serverOrder) return;
        document.getElementById('pay-order').value = serverOrder.id;
        saveLocal(serverOrder);
        showPanel(serverOrder.amount, serverOrder.id,
          '订单已同步本机服务端。请复制订单号并飞书登记；付款后到「我的」用兑换码开通。');
      });
    };
  }

  global.XGPay = { init: init, FEISHU_FORM_URL: FEISHU_FORM_URL };
})(window);
