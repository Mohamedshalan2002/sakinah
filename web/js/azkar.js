/* ==========================================================================
   سَكِينَة — الأذكار والأدعية: التصنيفات، العدّاد، مرجع كل ذكر
   ========================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  var App = window.SakinahApp;
  var $ = C.$, $$ = C.$$, el = C.el, esc = C.esc, arabicNum = C.arabicNum;

  function renderAzkar(main) {
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'الأذكار والأدعية'));
    wrap.appendChild(el('p', 'screen-sub', 'أذكار الصباح والمساء والنوم والصلاة — مع المرجع والفضل'));

    if (!App.azkar) {
      wrap.appendChild(el('div', 'loading', '<div class="spinner"></div><span>جارٍ تحميل الأذكار…</span>'));
      main.appendChild(wrap);
      return;
    }

    var hour = new Date().getHours();
    var isMorning = hour >= 4 && hour < 16;
    var cats = App.azkar.categories;

    var chipRow = el('div', 'chip-row');
    var allChip = el('button', 'chip', 'الكل');
    allChip.setAttribute('aria-pressed', 'true');
    chipRow.appendChild(allChip);
    cats.forEach(function (c) {
      var b = el('button', 'chip', c.titleAr + ' (' + arabicNum(c.count) + ')');
      b.setAttribute('data-cat', c.id);
      chipRow.appendChild(b);
    });
    wrap.appendChild(chipRow);

    wrap.appendChild(el('div', 'notice', Icons.icon('sun') +
      '<div><strong>' + (isMorning ? 'أذكار الصباح' : 'أذكار المساء') +
      '</strong> — تُعرض تلقائيًا حسب وقت اليوم.</div>'));

    // شريط الجلسة
    var sessionBar = el('div', 'card');
    sessionBar.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="flex:1">' +
          '<div style="font-size:.9rem;font-weight:600">جلسة الأذكار</div>' +
          '<div class="ref-line" id="sess-info">—</div>' +
        '</div>' +
        '<button class="btn btn-primary" id="sess-start">ابدأ الجلسة</button>' +
      '</div>';
    wrap.appendChild(sessionBar);

    var listWrap = el('div', '');
    wrap.appendChild(listWrap);
    main.appendChild(wrap);

    var state = { cat: null };
    var session = { ids: [], index: -1, active: false };

    function paint() {
      listWrap.innerHTML = '';
      var items = App.azkar.entries.slice();
      if (state.cat) {
        items = items.filter(function (e) { return e.cat === state.cat; });
      } else {
        items.sort(function (a, b) {
          var ra = a.cat === 'morning_evening' ? 0 : 1;
          var rb = b.cat === 'morning_evening' ? 0 : 1;
          return ra - rb;
        });
      }
      items.slice(0, 60).forEach(function (e) {
        listWrap.appendChild(zekrCard(e, function () { startSession(state.cat); }));
      });
      if (items.length > 60) {
        listWrap.appendChild(el('div', 'ref-line',
          'تُعرض ٦٠ من ' + arabicNum(items.length) + ' — استخدم التصنيفات لتضييق النتائج.'));
      }
      if (!items.length) {
        listWrap.appendChild(el('div', 'empty-state', Icons.icon('info') + '<div>لا أذكار في هذا التصنيف.</div>'));
      }
    }

    function updateSessionInfo() {
      var info = wrap.querySelector('#sess-info');
      if (!session.active) {
        info.textContent = 'اتّبع أذكارًا بالتتابع مع عدّاد لكل ذكر.';
        return;
      }
      info.textContent = 'الذكر ' + arabicNum(session.index + 1) + ' من ' + arabicNum(session.ids.length);
      var target = session.ids[session.index];
      var node = listWrap.querySelector('[data-zekr="' + target + '"]');
      if (node) {
        $$('.zekr-card', listWrap).forEach(function (n) { n.style.borderColor = ''; });
        node.style.borderColor = 'var(--gold-600)';
        node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    function startSession(cat) {
      var items = App.azkar.entries.filter(function (e) { return cat ? e.cat === cat : e.cat === 'morning_evening'; });
      session.ids = items.slice(0, 25).map(function (e) { return e.id; });
      session.index = 0;
      session.active = true;
      updateSessionInfo();
      C.toast('بدأت جلسة ' + arabicNum(session.ids.length) + ' ذكرًا');
    }

    chipRow.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      $$('.chip', chipRow).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      if (b) {
        state.cat = b.getAttribute('data-cat');
        b.setAttribute('aria-pressed', 'true');
      } else {
        state.cat = null;
        allChip.setAttribute('aria-pressed', 'true');
      }
      session.active = false;
      paint();
      updateSessionInfo();
    });

    sessionBar.querySelector('#sess-start').addEventListener('click', function () {
      if (session.active) {
        session.index++;
        if (session.index >= session.ids.length) {
          session.active = false;
          C.toast('اكتملت الجلسة ✔');
          vibrateDone();
        }
      } else {
        startSession(state.cat);
      }
      updateSessionInfo();
    });

    paint();
    updateSessionInfo();
  }

  function vibrateDone() { C.vibrate([40, 80, 40, 80, 40]); }

  function zekrCard(e, onSession) {
    var today = Store.todayKey();
    var prog = (Store.get().zekrProgress[e.id]) || { count: 0, day: '' };
    var count = prog.day === today ? prog.count : 0;
    var done = count >= e.repeat;

    var card = el('div', 'zekr-card');
    card.setAttribute('data-zekr', e.id);
    card.innerHTML =
      '<div class="zekr-text">' + esc(e.text) + '</div>' +
      (e.fadlAr ? '<div class="ref-line" style="border-inline-start:3px solid var(--gold-700);padding-inline-start:10px">' +
        '<strong>الفضل:</strong> ' + esc(e.fadlAr) + '</div>' : '') +
      '<div class="zekr-foot">' +
        '<span class="badge badge-gold">' + Icons.icon('repeat') + arabicNum(e.repeat) + '×</span>' +
        (e.refStatus === 'verified-quran'
          ? '<span class="badge badge-verified">' + Icons.icon('checkCircle') + 'نص قرآني متحقّق</span>'
          : (e.refStatus === 'quran-partial'
            ? '<span class="badge badge-verified">' + Icons.icon('checkCircle') + 'نص قرآني (تغطية جزئية)</span>'
            : '<span class="badge badge-review">' + Icons.icon('info') + 'يحتاج مراجعة تخريج</span>')) +
        '<div class="counter">' +
          '<span class="counter-value">' + arabicNum(count) + ' / ' + arabicNum(e.repeat) + '</span>' +
          '<button class="counter-btn' + (done ? ' is-done' : '') + '" data-inc="1" aria-label="عدّ">' +
            (done ? Icons.icon('check') : '+') +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ref-line"><strong>المرجع:</strong> ' + esc(e.refWork || '') + ' — ' + esc(e.ref) + '</div>';

    card.querySelector('[data-inc]').addEventListener('click', function () {
      var st = Store.get();
      var p = st.zekrProgress[e.id] || { count: 0, day: '' };
      var c = p.day === today ? p.count : 0;
      c = c >= e.repeat ? 0 : c + 1;
      var patch = {};
      patch[e.id] = { count: c, day: today };
      Store.set({ zekrProgress: patch });
      if (c >= e.repeat) {
        C.vibrate([25, 50, 25]);
        markZekrDone(e.id);
      }
      C.render();
    });
    return card;
  }

  function markZekrDone(id) {
    var today = Store.todayKey();
    var days = Object.assign({}, Store.get().zekrDoneDays || {});
    var arr = (days[today] || []).slice();
    if (arr.indexOf(id) === -1) arr.push(id);
    days[today] = arr;
    Store.replace('zekrDoneDays', days);
  }

  /* ---------- أدعية حسب الحالة ---------- */
  function renderSituations(main) {
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'دعاء حسب حالك'));
    wrap.appendChild(el('p', 'screen-sub', 'اختر ما تمرّ به — تُعرض الأدعية المناسبة بمصادرها'));

    if (!App.situations || !App.azkar) {
      wrap.appendChild(el('div', 'loading', '<div class="spinner"></div><span>جارٍ التحميل…</span>'));
      main.appendChild(wrap);
      return;
    }

    var grid = el('div', 'grid-auto');
    App.situations.situations.forEach(function (s) {
      var t = el('button', 'tile',
        Icons.icon(s.icon || 'handHeart') +
        '<span class="tile-label">' + esc(s.titleAr) + '</span>' +
        '<span class="tile-meta">' + esc(s.descAr) + '</span>');
      t.addEventListener('click', function () { openSituation(s); });
      grid.appendChild(t);
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('div', 'notice', Icons.icon('book') +
      '<div>كل دعاء هنا مأخوذ من «حصن المسلم» بمرجعه — لا نصوص مُنشأة.</div>'));
    main.appendChild(wrap);
  }

  function openSituation(s) {
    var byId = {};
    App.azkar.entries.forEach(function (e) { byId[e.id] = e; });
    var html = '<div class="modal-head"><h2>' + esc(s.titleAr) + '</h2>' +
      '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
      '<p class="ref-line" style="margin-bottom:14px">' + esc(s.descAr) + ' — ' +
      arabicNum(s.entryIds.length) + ' دعاء من ' + esc(s.categories.join(' · ')) + '</p>';

    if (!s.entryIds.length) {
      html += '<div class="empty-state">' + Icons.icon('info') + '<div>لا أدعية مسجلة لهذه الحالة.</div></div>';
    }
    s.entryIds.forEach(function (id) {
      var e = byId[id];
      if (!e) return;
      html += '<div class="zekr-card" style="margin-bottom:12px">' +
        '<div class="zekr-text">' + esc(e.text) + '</div>' +
        (e.fadlAr ? '<div class="ref-line"><strong>الفضل:</strong> ' + esc(e.fadlAr) + '</div>' : '') +
        '<div class="zekr-foot">' +
          '<span class="badge badge-gold">' + Icons.icon('repeat') + arabicNum(e.repeat) + '×</span>' +
          '<span class="badge">' + esc(e.titleAr) + '</span>' +
        '</div>' +
        '<div class="ref-line"><strong>المرجع:</strong> ' + esc(e.refWork || '') + ' — ' + esc(e.ref) + '</div>' +
      '</div>';
    });
    C.openModal(html);
  }

  /* ---------- أسماء الله الحسنى ---------- */
  function renderNames(main) {
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'أسماء الله الحسنى'));
    wrap.appendChild(el('p', 'screen-sub', '٩٩ اسمًا — المعنى والدليل من الكتاب والسنة'));

    if (!App.names) {
      wrap.appendChild(el('div', 'loading', '<div class="spinner"></div><span>جارٍ التحميل…</span>'));
      main.appendChild(wrap);
      return;
    }

    var grid = el('div', 'names-grid');
    App.names.names.forEach(function (n) {
      var t = el('button', 'name-tile',
        '<span class="n-idx">' + arabicNum(n.id) + '</span>' +
        '<span class="n-name">' + esc(n.name) + '</span>' +
        '<span class="n-brief">' + esc(n.brief) + '</span>');
      t.addEventListener('click', function () { openNameDetail(n); });
      grid.appendChild(t);
    });
    wrap.appendChild(grid);

    wrap.appendChild(el('div', 'notice', Icons.icon('book') +
      '<div>المصدر: «شرح أسماء الله الحسنى في ضوء الكتاب والسنة» — القحطاني (ترخيص MIT). ' +
      'الشرح الكامل مع الأدلة والمصادر داخل كل اسم.</div>'));
    main.appendChild(wrap);
  }

  function openNameDetail(n) {
    var html =
      '<div class="modal-head"><h2>' + esc(n.name) + '</h2>' +
      '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
      '<div class="badge badge-gold" style="margin-bottom:12px">الاسم ' + arabicNum(n.id) + ' من ٩٩</div>' +
      '<h3 style="color:var(--gold-400);font-size:1.05rem;margin:14px 0 6px">المعنى</h3>' +
      '<p style="font-family:var(--font-body);font-size:1.08rem;line-height:1.95">' + esc(n.meaning) + '</p>';

    if (n.quranEvidence && n.quranEvidence.length) {
      html += '<h3 style="color:var(--gold-400);font-size:1.05rem;margin:16px 0 8px">من القرآن</h3>';
      n.quranEvidence.forEach(function (e) {
        html += '<div class="evidence-block">' +
          '<div class="evidence-text">' + esc(e.text) + '</div>' +
          '<div class="evidence-src' + (e.source ? '' : ' is-unresolved') + '">' +
            (e.source ? esc(e.source) + (e.refSource === 'inferred-verified' ? ' · <em>مُتحقّق آليًا</em>' : '')
                      : '⚠ المصدر الأصلي لم يذكر مرجعًا لهذا الدليل') +
          '</div></div>';
      });
    }
    if (n.hadithEvidence && n.hadithEvidence.length) {
      html += '<h3 style="color:var(--gold-400);font-size:1.05rem;margin:16px 0 8px">من السنة</h3>';
      n.hadithEvidence.forEach(function (e) {
        html += '<div class="evidence-block">' +
          '<div class="evidence-text">' + esc(e.text) + '</div>' +
          '<div class="evidence-src' + (e.source ? '' : ' is-unresolved') + '">' +
            (e.source ? esc(e.source) : '⚠ المصدر الأصلي لم يذكر تخريجًا لهذا الحديث') +
          '</div></div>';
      });
    }
    if (n.explanation) {
      html += '<h3 style="color:var(--gold-400);font-size:1.05rem;margin:16px 0 6px">الشرح</h3>' +
        '<p style="font-family:var(--font-body);font-size:1rem;line-height:1.95;white-space:pre-line">' +
        esc(n.explanation) + '</p>';
    }
    if (n.bookReference) {
      html += '<div class="ornament-divider">' + Icons.star8(24) + '</div>' +
        '<div class="ref-line"><strong>المرجع:</strong> ' +
        esc(n.bookReference).replace(/\n/g, ' · ') + '</div>';
    }
    if (n.evidenceStatus === 'none-in-source') {
      html += '<div class="notice" style="margin-top:12px">' + Icons.icon('info') +
        '<div>المصدر الأصلي لم يُرفق دليلًا خاصًّا لهذا الاسم. لم نُكمل من عندنا.</div></div>';
    }
    C.openModal(html);
  }

  window.Azkar = {
    renderAzkar: renderAzkar, renderSituations: renderSituations,
    renderNames: renderNames, openSituation: openSituation,
  };
  App.screens.azkar = renderAzkar;
  App.screens.situations = renderSituations;
  App.screens.names = renderNames;
})();
