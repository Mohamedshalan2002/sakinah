/* ==========================================================================
   سَكِينَة — السبحة والوِرد اليومي والاستمرارية
   ========================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  var App = window.SakinahApp;
  var $ = C.$, $$ = C.$$, el = C.el, esc = C.esc, arabicNum = C.arabicNum;

  var PHRASES = [
    { text: 'سُبْحَانَ اللَّهِ', target: 33 },
    { text: 'الْحَمْدُ لِلَّهِ', target: 33 },
    { text: 'اللَّهُ أَكْبَرُ', target: 34 },
    { text: 'لَا إِلَهَ إِلَّا اللَّهُ', target: 100 },
    { text: 'أَسْتَغْفِرُ اللَّهَ', target: 100 },
    { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 100 },
    { text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100 },
  ];

  /* ---------- السبحة ---------- */
  function renderTasbih(main) {
    var st = Store.get();
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'السبحة'));
    wrap.appendChild(el('p', 'screen-sub', 'عدّاد ذِكر بسيط — خفيف وسريع'));

    var counterCard = el('div', 'card');
    counterCard.innerHTML =
      '<div class="tasbih-wrap">' +
        '<button class="tasbih-center" id="tasbih-center" aria-label="عدّ">' +
          '<div class="tasbih-ring">' +
            '<svg viewBox="0 0 250 250" aria-hidden="true" id="tasbih-svg"></svg>' +
            '<div style="text-align:center;z-index:1">' +
              '<div class="tasbih-count" id="tasbih-count">' + arabicNum(st.tasbih.count || 0) + '</div>' +
              '<div class="tasbih-target" id="tasbih-target">من ' + arabicNum(st.tasbih.target || 33) + '</div>' +
            '</div>' +
          '</div>' +
        '</button>' +
        '<div class="tasbih-hint" id="tasbih-phrase">' + esc(st.tasbih.phrase || PHRASES[0].text) + '</div>' +
      '</div>' +
      '<button class="tasbih-tap" id="tasbih-tap" style="margin-top:16px">اضغط للعدّ</button>' +
      '<div class="btn-row" style="margin-top:14px;justify-content:center">' +
        '<button class="btn" id="tasbih-reset">' + Icons.icon('trash') + 'تصفير</button>' +
      '</div>';
    wrap.appendChild(counterCard);

    var phCard = el('div', 'card');
    phCard.innerHTML = '<div class="card-title">' + Icons.icon('beads') + 'اختر الذكر والهدف</div>';
    var row = el('div', 'chip-row');
    PHRASES.forEach(function (p) {
      var b = el('button', 'chip', p.text + ' · ' + arabicNum(p.target));
      if (st.tasbih.phrase === p.text) b.setAttribute('aria-pressed', 'true');
      b.addEventListener('click', function () {
        Store.set({ tasbih: { phrase: p.text, target: p.target, count: 0 } });
        C.render();
      });
      row.appendChild(b);
    });
    phCard.appendChild(row);
    wrap.appendChild(phCard);

    var total = st.tasbih.count || 0;
    var statCard = el('div', 'card');
    statCard.innerHTML =
      '<div class="card-title">' + Icons.icon('star') + 'إحصاء</div>' +
      '<div class="streak-row">' +
        '<div class="stat"><div class="stat-value">' + arabicNum(total) + '</div><div class="stat-label">في الجلسة</div></div>' +
        '<div class="stat"><div class="stat-value">' +
          arabicNum(Math.floor(total / (st.tasbih.target || 33))) + '</div><div class="stat-label">دورات كاملة</div></div>' +
      '</div>' +
      '<div class="ref-line" style="margin-top:10px">التسبيح ذِكر مطلق، ولا يُشترط فيه عدد معيّن إلا ما ورد في السنة.</div>';
    wrap.appendChild(statCard);

    main.appendChild(wrap);
    drawRing(total, st.tasbih.target || 33);

    function bump() {
      var cur = (Store.get().tasbih.count || 0) + 1;
      var target = Store.get().tasbih.target || 33;
      Store.set({ tasbih: { count: cur } });
      var c = $('#tasbih-count');
      if (c) c.textContent = arabicNum(cur);
      drawRing(cur, target);
      C.vibrate(cur % target === 0 ? [40, 70, 40] : 16);
      if (cur % target === 0) C.toast('أكملت ' + arabicNum(target) + ' مرة');
    }

    $('#tasbih-center').addEventListener('click', bump);
    $('#tasbih-tap').addEventListener('click', bump);
    $('#tasbih-reset').addEventListener('click', function () {
      Store.set({ tasbih: { count: 0 } });
      C.render();
    });
  }

  function drawRing(count, target) {
    var svg = $('#tasbih-svg');
    if (!svg) return;
    var R = 112, cx = 125, cy = 125;
    var beads = Math.min(target, 60);
    var filled = target ? Math.round((count % target) / target * beads) : 0;
    if (count > 0 && count % target === 0) filled = beads;
    var parts = ['<circle cx="' + cx + '" cy="' + cy + '" r="' + R +
      '" fill="none" stroke="rgba(198,162,101,0.16)" stroke-width="1.2"/>'];
    for (var i = 0; i < beads; i++) {
      var ang = (-90 + (360 / beads) * i) * Math.PI / 180;
      var x = cx + R * Math.cos(ang);
      var y = cy + R * Math.sin(ang);
      parts.push('<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' +
        (i < filled ? 4.6 : 3.1) + '" fill="' +
        (i < filled ? '#c6a265' : 'rgba(198,162,101,0.32)') + '"/>');
    }
    svg.innerHTML = parts.join('');
  }

  /* ---------- الوِرد ---------- */
  function renderWird(main) {
    var st = Store.get();
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'وِرد اليوم'));
    wrap.appendChild(el('p', 'screen-sub', 'سلسلة بسيطة: أذكار + وِرد قراءة، بلا إشعارات مزعجة'));

    var today = Store.todayKey();
    var done = !!(st.wird.completedDays || {})[today];

    var card = el('div', 'card');
    card.innerHTML =
      '<div class="card-title">' + Icons.icon('calendar') + 'اليوم</div>' +
      '<div class="streak-row" style="margin-bottom:14px">' +
        '<div class="stat"><div class="stat-value">' + arabicNum(C.computeStreak()) +
          '</div><div class="stat-label">أيام متتابعة</div></div>' +
        '<div class="stat"><div class="stat-value">' +
          arabicNum(Object.keys(st.wird.completedDays || {}).length) +
          '</div><div class="stat-label">إجمالي</div></div>' +
      '</div>' +
      '<button class="btn ' + (done ? '' : 'btn-primary') + ' btn-block" id="wird-toggle">' +
        (done ? Icons.icon('checkCircle') + 'أكملت وِرد اليوم ✔' : Icons.icon('check') + 'أكملت وِرد اليوم') +
      '</button>' +
      '<div class="week-grid" id="wird-week" style="margin-top:16px"></div>';
    wrap.appendChild(card);

    var parts = el('div', 'card');
    parts.innerHTML =
      '<div class="card-title">' + Icons.icon('target') + 'مكوّنات الوِرد المقترحة</div>' +
      '<div class="grid-auto">' +
        [['أذكار الصباح أو المساء', 'azkar'], ['ورد قراءة من المصحف', 'quran'],
         ['تسبيح ١٠٠ مرة', 'tasbih'], ['دعاء حسب حالك', 'situations']]
          .map(function (p) {
            return '<button class="tile" data-part="' + p[1] + '">' + Icons.icon('check') +
              '<span class="tile-label">' + p[0] + '</span></button>';
          }).join('') +
      '</div>';
    wrap.appendChild(parts);

    var stat = el('div', 'card');
    stat.innerHTML = '<div class="card-title">' + Icons.icon('fire') + 'آخر ٣٠ يومًا</div>' +
      '<div id="month-grid" class="week-grid" style="grid-template-columns:repeat(10,1fr)"></div>';
    wrap.appendChild(stat);

    main.appendChild(wrap);
    C.fillWeekGrid(wrap.querySelector('#wird-week'));

    var mg = wrap.querySelector('#month-grid');
    var cd = st.wird.completedDays || {};
    for (var i = 29; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var k = C.dayKey(d);
      mg.appendChild(el('div', 'day-cell' + (cd[k] ? ' is-done' : '') + (i === 0 ? ' is-today' : ''),
        arabicNum(d.getDate())));
    }

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('#wird-toggle')) {
        var days = Object.assign({}, Store.get().wird.completedDays || {});
        if (days[today]) delete days[today];
        else { days[today] = true; C.vibrate([30, 60, 30]); }
        Store.set({ wird: { completedDays: days, lastDay: today } });
        C.render();
        return;
      }
      var p = e.target.closest('[data-part]');
      if (p) C.navigate(p.getAttribute('data-part'));
    });
  }

  window.Rituals = { renderTasbih: renderTasbih, renderWird: renderWird };
  App.screens.tasbih = renderTasbih;
  App.screens.wird = renderWird;
})();
