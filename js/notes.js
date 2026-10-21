(function (global) {
  function render() {
    var list = XGStorage.getNotes();
    var limit = XGStorage.notesLimit() + ((XGStorage.getMembership().extraNotes) || 0);
    document.getElementById('nt-quota').textContent = '已用 ' + list.length + ' / ' + limit;
    document.getElementById('nt-badge').innerHTML = XGCommon.memberBadgeHtml();
    var box = document.getElementById('nt-list');
    if (!list.length) {
      box.innerHTML = '<div class="empty">暂无笔记。可用「事实/假设/验证/结果」四格写复盘。</div>';
      return;
    }
    box.innerHTML = list.map(function (it, i) {
      return '<div class="list-item"><div><strong>' + (it.symbol || '（无标的）') + '</strong> ' +
        '<span class="tiny">' + (it.createdAt || '') + '</span><br>' +
        '<span class="tiny">事实：' + (it.fact || '—') + '</span><br>' +
        '<span class="tiny">假设：' + (it.hypo || '—') + '</span><br>' +
        '<span class="tiny">计划：' + (it.plan || '—') + '</span><br>' +
        '<span class="tiny">结果：' + (it.result || '—') + '</span></div>' +
        '<button class="btn ghost" type="button" data-i="' + i + '">删除</button></div>';
    }).join('');
    box.querySelectorAll('button[data-i]').forEach(function (btn) {
      btn.onclick = function () {
        var arr = XGStorage.getNotes();
        arr.splice(+btn.getAttribute('data-i'), 1);
        XGStorage.setNotes(arr);
        render();
      };
    });
  }
  function init() {
    document.getElementById('nt-add').onclick = function () {
      var err = document.getElementById('nt-err');
      err.textContent = '';
      var list = XGStorage.getNotes();
      var limit = XGStorage.notesLimit() + ((XGStorage.getMembership().extraNotes) || 0);
      if (list.length >= limit) {
        err.textContent = '笔记条数已达上限，请开通工具会员或笔记扩容包。';
        setTimeout(function () { location.href = 'pay.html'; }, 800);
        return;
      }
      var fact = (document.getElementById('nt-fact').value || '').trim();
      if (!fact && !(document.getElementById('nt-hypo').value || '').trim()) {
        err.textContent = '请至少填写事实或假设';
        return;
      }
      list.unshift({
        id: 'n' + Date.now(),
        symbol: (document.getElementById('nt-symbol').value || '').trim(),
        fact: fact,
        hypo: (document.getElementById('nt-hypo').value || '').trim(),
        plan: (document.getElementById('nt-plan').value || '').trim(),
        result: (document.getElementById('nt-result').value || '').trim(),
        createdAt: new Date().toISOString()
      });
      XGStorage.setNotes(list);
      ['nt-symbol','nt-fact','nt-hypo','nt-plan','nt-result'].forEach(function (id) {
        document.getElementById(id).value = '';
      });
      render();
    };
    render();
  }
  global.XGNotes = { init: init, render: render };
})(window);
