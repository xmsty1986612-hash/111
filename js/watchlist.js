(function (global) {
  function render() {
    var list = XGStorage.getWatchlist();
    var limit = XGStorage.watchlistLimit();
    var m = XGStorage.getMembership();
    var extra = m.extraWatch || 0;
    limit = limit + extra;
    document.getElementById('wl-quota').textContent = '已用 ' + list.length + ' / ' + limit;
    document.getElementById('wl-badge').innerHTML = XGCommon.memberBadgeHtml();
    var box = document.getElementById('wl-list');
    if (!list.length) {
      box.innerHTML = '<div class="empty">暂无自选。添加后仅本地保存。</div>';
      return;
    }
    box.innerHTML = list.map(function (it, i) {
      return '<div class="list-item"><div><strong>' + (it.code || '') + '</strong> ' +
        (it.name || '') + '<br><span class="tiny">' + (it.group || '默认') +
        (it.note ? ' · ' + it.note : '') + '</span></div>' +
        '<button class="btn ghost" type="button" data-i="' + i + '">删除</button></div>';
    }).join('');
    box.querySelectorAll('button[data-i]').forEach(function (btn) {
      btn.onclick = function () {
        var arr = XGStorage.getWatchlist();
        arr.splice(+btn.getAttribute('data-i'), 1);
        XGStorage.setWatchlist(arr);
        render();
      };
    });
  }
  function init() {
    document.getElementById('wl-add').onclick = function () {
      var err = document.getElementById('wl-err');
      err.textContent = '';
      var code = (document.getElementById('wl-code').value || '').trim();
      if (!code) { err.textContent = '请填写代码'; return; }
      var list = XGStorage.getWatchlist();
      var limit = XGStorage.watchlistLimit() + ((XGStorage.getMembership().extraWatch) || 0);
      if (list.length >= limit) {
        err.textContent = '已达免费/当前额度上限。请开通日更复盘包会员或加油包。';
        setTimeout(function () { location.href = 'pricing.html'; }, 800);
        return;
      }
      list.push({
        code: code,
        name: (document.getElementById('wl-name').value || '').trim(),
        group: (document.getElementById('wl-group').value || '默认').trim(),
        note: (document.getElementById('wl-note').value || '').trim(),
        createdAt: new Date().toISOString()
      });
      XGStorage.setWatchlist(list);
      document.getElementById('wl-code').value = '';
      document.getElementById('wl-name').value = '';
      document.getElementById('wl-note').value = '';
      render();
    };
    render();
  }
  global.XGWatchlist = { init: init, render: render };
})(window);
