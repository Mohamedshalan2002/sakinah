/* ==========================================================================
   سَكِينَة — المصحف: التصفح، البحث، العلامات، تكرار الآية، الختمة
   ========================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  var App = window.SakinahApp;
  var $ = C.$, $$ = C.$$, el = C.el, esc = C.esc, arabicNum = C.arabicNum;

  function surahName(n) {
    if (!App.quranIndex) return 'سورة ' + n;
    var s = App.quranIndex.surahs.filter(function (x) { return x.number === n; })[0];
    return s ? s.arabicName.replace(/^سُوْرَةُ\s*/, '') : 'سورة ' + n;
  }

  var allVersesCache = null;
  function loadAllVerses() {
    if (allVersesCache) return Promise.resolve(allVersesCache);
    var promises = [];
    for (var i = 1; i <= 114; i++) promises.push(C.fetchJSON('data/quran/surah/' + i + '.json'));
    return Promise.all(promises).then(function (list) {
      var out = [];
      list.forEach(function (d) {
        d.verses.forEach(function (v) {
          out.push({ surah: d.surah, verse: v.v, text: v.t, norm: C.normalizeAr(v.t) });
        });
      });
      allVersesCache = out;
      return out;
    });
  }

  /* ---------- شاشة المصحف ---------- */
  function renderQuran(main) {
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'المصحف'));
    wrap.appendChild(el('p', 'screen-sub', 'نص عثماني · أوفلاين · تابع آخر موضع'));

    if (!App.quranIndex) {
      wrap.appendChild(el('div', 'loading', '<div class="spinner"></div><span>جارٍ تحميل فهرس المصحف…</span>'));
      main.appendChild(wrap);
      return;
    }

    var st = Store.get();
    if (st.lastRead && st.lastRead.surah) {
      var c = el('div', 'card');
      c.innerHTML = '<div class="card-title">' + Icons.icon('book') + 'متابعة القراءة</div>';
      var b = el('button', 'btn btn-primary btn-block',
        'سورة ' + esc(surahName(st.lastRead.surah)) + ' — الآية ' + arabicNum(st.lastRead.verse));
      b.addEventListener('click', function () {
        C.navigate('surah', { surah: st.lastRead.surah, verse: st.lastRead.verse });
      });
      c.appendChild(b);
      wrap.appendChild(c);
    }

    wrap.appendChild(khatmahCard());

    var searchCard = el('div', 'card');
    searchCard.innerHTML =
      '<div class="card-title">' + Icons.icon('search') + 'ابحث في المصحف</div>' +
      '<input id="q-search" type="search" placeholder="اكتب كلمة من آية…" ' +
        'style="width:100%;padding:11px 14px;border-radius:12px;border:1px solid var(--border);' +
        'background:var(--bg-sunken);color:var(--text-primary);font-family:var(--font-ui);font-size:.95rem">' +
      '<div id="q-results" style="margin-top:12px"></div>';
    wrap.appendChild(searchCard);

    var listCard = el('div', 'card');
    listCard.innerHTML = '<div class="card-title">' + Icons.icon('list') + 'السور — ' + arabicNum(114) + '</div>' +
      '<div id="surah-list" class="surah-list"></div>';
    wrap.appendChild(listCard);

    // العلامات المحفوظة
    var bm = (st.bookmarks || []);
    if (bm.length) {
      var bmCard = el('div', 'card');
      bmCard.innerHTML = '<div class="card-title">' + Icons.icon('bookmark') + 'علاماتي (' + arabicNum(bm.length) + ')</div>' +
        '<div id="bm-list"></div>';
      wrap.appendChild(bmCard);
    }

    main.appendChild(wrap);

    // قائمة السور
    var list = wrap.querySelector('#surah-list');
    App.quranIndex.surahs.forEach(function (s) {
      var item = el('button', 'surah-item',
        '<span class="surah-num">' + arabicNum(s.number) + '</span>' +
        '<span class="surah-info">' +
          '<span class="surah-name">' + esc(s.arabicName) + '</span>' +
          '<span class="surah-meta">' + esc(s.revelationAr) + ' · ' + arabicNum(s.verseCount) + ' آية</span>' +
        '</span>');
      item.addEventListener('click', function () { C.navigate('surah', { surah: s.number }); });
      list.appendChild(item);
    });

    // العلامات
    var bmList = wrap.querySelector('#bm-list');
    if (bmList) {
      bm.forEach(function (b) {
        var t = el('button', 'tile', '<span class="tile-label">' + esc(surahName(b.surah)) +
          ' — الآية ' + arabicNum(b.verse) + '</span>');
        t.addEventListener('click', function () { C.navigate('surah', { surah: b.surah, verse: b.verse }); });
        bmList.appendChild(t);
      });
    }

    // البحث
    var input = wrap.querySelector('#q-search');
    var results = wrap.querySelector('#q-results');
    var timer = null;

    function doSearch(q) {
      q = (q || '').trim();
      results.innerHTML = '';
      if (q.length < 3) {
        if (q.length) results.innerHTML = '<div class="ref-line">اكتب ٣ أحرف على الأقل.</div>';
        return;
      }
      if (allVersesCache) { runSearch(q); return; }
      results.innerHTML = '<div class="ref-line">البحث يحتاج تحميل نص المصحف كاملًا (أول مرة فقط)…</div>';
      loadAllVerses().then(function () {
        results.innerHTML = '';
        runSearch(q);
      }).catch(function () {
        results.innerHTML = '<div class="ref-line">تعذّر تحميل نص المصحف للبحث.</div>';
      });
    }

    function runSearch(q) {
      results.innerHTML = '';
      var norm = C.normalizeAr(q);
      var found = 0;
      var frag = document.createDocumentFragment();
      var hits = [];
      for (var i = 0; i < allVersesCache.length; i++) {
        if (allVersesCache[i].norm.indexOf(norm) !== -1) {
          hits.push(allVersesCache[i]);
          if (hits.length >= 40) break;
        }
      }
      found = hits.length;
      hits.forEach(function (item) {
        var r = el('button', 'tile',
          '<span class="tile-label">' + esc(surahName(item.surah)) + ' — الآية ' + arabicNum(item.verse) + '</span>' +
          '<span class="tile-meta" style="font-family:var(--font-body);font-size:.9rem">' + esc(item.text.slice(0, 110)) + '…</span>');
        r.addEventListener('click', function () { C.navigate('surah', { surah: item.surah, verse: item.verse }); });
        frag.appendChild(r);
      });
      if (!found) results.innerHTML = '<div class="ref-line">لا نتائج مطابقة.</div>';
      else {
        results.appendChild(el('div', 'ref-line', 'عدد النتائج المعروضة: ' + arabicNum(found)));
        results.appendChild(frag);
      }
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function () { doSearch(v); }, 340);
    });
  }

  function khatmahCard() {
    var st = Store.get();
    var page = st.khatmah.page || 1;
    var total = 604;
    var pct = Math.round((page / total) * 100);
    var card = el('div', 'card');
    card.innerHTML =
      '<div class="card-title">' + Icons.icon('target') + 'الختمة</div>' +
      '<div class="ref-line" style="margin-bottom:8px">متابعة الختمة عبر الصفحات (٦٠٤ صفحة).</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div style="display:flex;align-items:center;margin-top:10px;gap:10px">' +
        '<span class="ref-line">الصفحة ' + arabicNum(page) + ' من ' + arabicNum(total) + ' · ' + arabicNum(pct) + '٪</span>' +
        '<div style="margin-inline-start:auto;display:flex;gap:6px">' +
          '<button class="btn" data-khatmah="-" style="padding:5px 12px">−</button>' +
          '<button class="btn" data-khatmah="+" style="padding:5px 12px">+</button>' +
        '</div>' +
      '</div>';
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-khatmah]');
      if (!b) return;
      var k = Store.get().khatmah;
      var next = (k.page || 1) + (b.getAttribute('data-khatmah') === '+' ? 1 : -1);
      next = Math.max(1, Math.min(604, next));
      Store.set({ khatmah: { page: next, startDate: k.startDate || Store.todayKey() } });
      C.render();
    });
    return card;
  }

  /* ---------- شاشة السورة ---------- */
  function renderSurah(main, params) {
    var num = params.surah || 1;
    var wrap = el('div', 'screen is-active');

    var head = el('div', '');
    head.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<button class="icon-btn" data-back="1" aria-label="رجوع">' + Icons.icon('back') + '</button>' +
        '<div style="flex:1">' +
          '<h1 class="screen-title" style="font-size:1.34rem;margin:0">' + esc(surahName(num)) + '</h1>' +
          '<div class="ref-line" id="surah-sub">جارٍ التحميل…</div>' +
        '</div>' +
      '</div>';
    wrap.appendChild(head);

    var body = el('div', 'quran-reader');
    body.innerHTML = '<div class="loading"><div class="spinner"></div><span>جارٍ تحميل السورة…</span></div>';
    wrap.appendChild(body);
    main.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
    });

    C.fetchJSON('data/quran/surah/' + num + '.json').then(function (data) {
      var s = App.quranIndex ? App.quranIndex.surahs.filter(function (x) { return x.number === num; })[0] : null;
      head.querySelector('#surah-sub').textContent =
        (s ? s.revelationAr + ' · ' : '') + arabicNum(data.verses.length) + ' آية';

      body.innerHTML = '';
      if (num !== 1 && num !== 9) {
        body.appendChild(el('div', 'quran-bismillah', 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'));
      }

      data.verses.forEach(function (v) {
        var a = el('div', 'ayah');
        a.setAttribute('data-ayah', v.v);
        a.innerHTML = '<span>' + esc(v.t) + '</span> <span class="ayah-num">' + arabicNum(v.v) + '</span>';
        a.addEventListener('click', function () { selectAyah(num, v); });
        body.appendChild(a);
      });

      var toolbar = el('div', 'ayah-toolbar', '<span class="toolbar-label">اضغط آية للتحكم</span>');
      body.appendChild(toolbar);

      if (params.verse) {
        var target = body.querySelector('[data-ayah="' + params.verse + '"]');
        if (target) {
          target.classList.add('is-selected');
          App.selectedAyah = { surah: num, verse: params.verse };
          var found = data.verses.filter(function (x) { return x.v === params.verse; })[0];
          if (found) App.selectedAyah = { surah: num, verse: found.v, text: found.t };
          updateToolbar(toolbar, num, params.verse);
          setTimeout(function () { target.scrollIntoView({ block: 'center' }); }, 80);
        }
      }

      Store.set({ lastRead: { surah: num, verse: params.verse || 1, at: Date.now() } });
    }).catch(function (err) {
      body.innerHTML = '<div class="empty-state">' + Icons.icon('info') +
        '<div>تعذّر تحميل السورة: ' + esc(err.message) + '</div></div>';
    });
  }

  function selectAyah(surah, v) {
    $$('.ayah').forEach(function (n) { n.classList.remove('is-selected'); });
    var node = $('[data-ayah="' + v.v + '"]');
    if (node) node.classList.add('is-selected');
    App.selectedAyah = { surah: surah, verse: v.v, text: v.t, page: v.page, juz: v.juz };
    Store.set({ lastRead: { surah: surah, verse: v.v, at: Date.now() } });
    var tb = $('.ayah-toolbar');
    if (tb) updateToolbar(tb, surah, v.v);
  }

  function updateToolbar(tb, surah, verse) {
    var list = Store.get().bookmarks || [];
    var isMarked = list.some(function (b) { return b.surah === surah && b.verse === verse; });
    tb.innerHTML =
      '<span class="toolbar-label">الآية ' + arabicNum(verse) + '</span>' +
      '<button class="btn" data-act="repeat">' + Icons.icon('repeat') + 'تكرار</button>' +
      '<button class="btn" data-act="bookmark">' + Icons.icon(isMarked ? 'bookmarkFilled' : 'bookmark') +
        (isMarked ? 'محفوظة' : 'حفظ') + '</button>' +
      '<button class="btn" data-act="copy">' + Icons.icon('copy') + 'نسخ</button>' +
      '<button class="btn" data-act="goto">' + Icons.icon('book') + 'متابعة</button>';

    tb.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      var a = App.selectedAyah;
      if (!a) return;
      if (act === 'repeat') openRepeatDialog(a);
      else if (act === 'bookmark') toggleBookmark(a);
      else if (act === 'copy') copyAyah(a);
      else if (act === 'goto') {
        Store.set({ lastRead: { surah: a.surah, verse: a.verse, at: Date.now() } });
        C.toast('تم حفظ موضع المتابعة');
      }
    };
  }

  function toggleBookmark(a) {
    var list = (Store.get().bookmarks || []).slice();
    var i = -1;
    list.forEach(function (b, idx) { if (b.surah === a.surah && b.verse === a.verse) i = idx; });
    if (i >= 0) { list.splice(i, 1); C.toast('أُزيلت العلامة'); }
    else { list.push({ surah: a.surah, verse: a.verse, at: Date.now() }); C.toast('حُفظت العلامة'); }
    Store.replace('bookmarks', list);
    var tb = $('.ayah-toolbar');
    if (tb) updateToolbar(tb, a.surah, a.verse);
  }

  function copyAyah(a) {
    var text = (a.text || '') + ' — ' + surahName(a.surah) + '، الآية ' + a.verse;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { C.toast('نُسخت الآية'); },
        function () { C.toast('تعذّر النسخ'); });
    } else {
      C.toast('النسخ غير مدعوم في هذا المتصفح');
    }
  }

  function openRepeatDialog(a) {
    C.openModal(
      '<div class="modal-head"><h2>تكرار الآية للتحفيظ</h2>' +
      '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
      '<p class="ref-line" style="margin-bottom:14px">' + esc((a.text || '').slice(0, 130)) + '…</p>' +
      '<div class="btn-row" style="margin-bottom:14px">' +
        [3, 5, 7, 10, 20].map(function (n) {
          return '<button class="chip" data-rep="' + n + '">' + arabicNum(n) + ' مرات</button>';
        }).join('') +
      '</div>' +
      '<div id="repeat-status" class="ref-line"></div>' +
      '<button class="btn btn-block" data-close="1" style="margin-top:14px">إيقاف</button>',
      function (panel) {
        panel.querySelectorAll('[data-rep]').forEach(function (b) {
          b.addEventListener('click', function () {
            startRepeat(parseInt(b.getAttribute('data-rep'), 10), a.verse, panel);
          });
        });
      }
    );
  }

  function startRepeat(times, verse, panel) {
    clearInterval(App.repeatTimer);
    var left = times;
    var status = panel.querySelector('#repeat-status');
    function tick() {
      var node = $('[data-ayah="' + verse + '"]');
      if (left <= 0) {
        clearInterval(App.repeatTimer);
        if (status) status.textContent = 'اكتمل التكرار ✔';
        C.toast('اكتمل التكرار ' + arabicNum(times) + ' مرات');
        C.vibrate([30, 60, 30]);
        return;
      }
      if (status) status.textContent = 'متبقٍ: ' + arabicNum(left);
      left--;
      if (node) {
        node.classList.add('is-selected');
        setTimeout(function () { node.classList.remove('is-selected'); }, 440);
      }
      C.vibrate(18);
    }
    tick();
    App.repeatTimer = setInterval(tick, 2600);
  }

  window.Quran = { surahName: surahName, renderQuran: renderQuran, renderSurah: renderSurah, loadAllVerses: loadAllVerses };
  App.screens.quran = renderQuran;
  App.screens.surah = renderSurah;
})();
