/* ==========================================================================
   سَكِينَة — المزيد: بحث موحّد، المفضلة، التقويم الهجري، سجل الصيام
   ========================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  var App = window.SakinahApp;
  var $ = C.$, $$ = C.$$, el = C.el, esc = C.esc, arabicNum = C.arabicNum;

  /* ======================================================================
     شاشة «المزيد» — بوابة لكل الأدوات
     ====================================================================== */
  function renderMore(main) {
    var st = Store.get();
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'المزيد'));
    wrap.appendChild(el('p', 'screen-sub', 'أدوات ومراجع — كلها تعمل بدون إنترنت'));

    var grid = el('div', 'grid-auto');
    [
      { id: 'search', icon: 'search', label: 'البحث الشامل', meta: 'في المصحف والأذكار والأسماء' },
      { id: 'favorites', icon: 'star', label: 'المفضلة', meta: arabicNum((st.favorites || []).length) + ' محفوظًا' },
      { id: 'hijri', icon: 'calendarHeart', label: 'التقويم الهجري', meta: 'أم القرى · مناسبات' },
      { id: 'fastingLog', icon: 'moonStar', label: 'سجل الصيام', meta: arabicNum(Object.keys(st.fastingLog || {}).length) + ' يومًا' },
      { id: 'names', icon: 'sparkle', label: 'أسماء الله الحسنى', meta: '٩٩ اسمًا' },
      { id: 'situations', icon: 'handHeart', label: 'دعاء حسب حالك', meta: '١٠ حالات' },
      { id: 'tasbih', icon: 'beads', label: 'السبحة', meta: 'عدّاد ذِكر' },
      { id: 'wird', icon: 'fire', label: 'الوِرد', meta: 'استمرارية' },
      { id: 'about', icon: 'info', label: 'عن التطبيق', meta: 'المصادر والخصوصية' },
    ].forEach(function (q) {
      var t = el('button', 'tile', Icons.icon(q.icon) +
        '<span class="tile-label">' + esc(q.label) + '</span>' +
        '<span class="tile-meta">' + esc(q.meta) + '</span>');
      t.addEventListener('click', function () { C.navigate(q.id); });
      grid.appendChild(t);
    });
    wrap.appendChild(grid);

    // ذكر اليوم
    var daily = dailyZekrCard();
    if (daily) wrap.appendChild(daily);

    main.appendChild(wrap);
  }

  /** ذكر اليوم: يُختار مرة واحدة يوميًا من بيانات الأذكار. */
  function dailyZekrCard() {
    if (!App.azkar || !App.azkar.entries.length) return null;
    var st = Store.get();
    var today = Store.todayKey();
    var id = st.dailyZekr.id;
    if (st.dailyZekr.day !== today || !id) {
      // نختار ذكرًا ثابتًا لهذا اليوم (تجزئة بسيطة على التاريخ)
      var seed = today.split('-').join('');
      var n = 0;
      for (var i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) % 104729;
      var e = App.azkar.entries[n % App.azkar.entries.length];
      id = e.id;
      Store.set({ dailyZekr: { day: today, id: id } });
    }
    var entry = App.azkar.entries.filter(function (x) { return x.id === id; })[0];
    if (!entry) return null;

    var card = el('div', 'card');
    card.innerHTML =
      '<div class="card-title">' + Icons.icon('sparkle') + 'ذكر اليوم</div>' +
      '<div class="zekr-text">' + esc(entry.text) + '</div>' +      (entry.fadlAr ? '<div class="ref-line" style="margin-top:8px"><strong>الفضل:</strong> ' +
        esc(entry.fadlAr) + '</div>' : '') +
      '<div class="ref-line" style="margin-top:8px">' +
        '<strong>المرجع:</strong> ' + esc(entry.refWork || '') + ' — ' + esc(entry.ref) + '</div>' +
      '<div class="btn-row" style="margin-top:12px">' +
        '<button class="btn btn-primary" data-go-azkar="' + esc(entry.cat) + '">كل الأذكار</button>' +
      '</div>';
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go-azkar]');
      if (b) C.navigate('azkar');
    });
    return card;
  }

  /* ======================================================================
     البحث الشامل
     ====================================================================== */
  function renderSearch(main) {
    var wrap = el('div', 'screen is-active');
    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<button class="icon-btn" data-back="1" aria-label="رجوع">' + Icons.icon('back') + '</button>' +
        '<h1 class="screen-title" style="font-size:1.34rem;margin:0">البحث الشامل</h1>' +
      '</div>' +
      '<p class="screen-sub">ابحث في المصحف والأذكار والأسماء الحسنى معًا</p>' +
      '<input id="gs-input" type="search" placeholder="اكتب كلمة…" ' +
        'style="width:100%;padding:12px 16px;border-radius:14px;border:1px solid var(--border);' +
        'background:var(--bg-raised);color:var(--text-primary);font-family:var(--font-ui);font-size:1rem">' +
      '<div class="chip-row" style="margin-top:12px" id="gs-filters">' +
        '<button class="chip" data-f="quran" aria-pressed="true">المصحف</button>' +
        '<button class="chip" data-f="azkar" aria-pressed="true">الأذكار</button>' +
        '<button class="chip" data-f="names" aria-pressed="true">الأسماء</button>' +
      '</div>' +
      '<div id="gs-results"></div>';
    main.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
      var f = e.target.closest('[data-f]');
      if (f) {
        var on = f.getAttribute('aria-pressed') === 'true';
        f.setAttribute('aria-pressed', on ? 'false' : 'true');
        run(input.value);
      }
    });

    var input = wrap.querySelector('#gs-input');
    var results = wrap.querySelector('#gs-results');
    var timer = null;
    var verses = null;

    function active() {
      return $$('#gs-filters [data-f]')
        .filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })
        .map(function (b) { return b.getAttribute('data-f'); });
    }

    function run(q) {
      q = (q || '').trim();
      results.innerHTML = '';
      if (q.length < 3) {
        if (q.length) results.innerHTML = '<div class="ref-line">اكتب ٣ أحرف على الأقل.</div>';
        return;
      }
      var norm = C.normalizeAr(q);
      var on = active();
      var frag = document.createDocumentFragment();
      var count = 0;

      // الأذكار
      if (on.indexOf('azkar') !== -1 && App.azkar) {
        var zHits = App.azkar.entries.filter(function (e) {
          return C.normalizeAr(e.text).indexOf(norm) !== -1 ||
            C.normalizeAr(e.titleAr).indexOf(norm) !== -1;
        }).slice(0, 15);
        if (zHits.length) {
          frag.appendChild(el('div', 'search-group', 'الأذكار (' + arabicNum(zHits.length) + ')'));
          zHits.forEach(function (e) {
            var r = el('button', 'tile',
              '<span class="tile-label">' + esc(e.titleAr) + '</span>' +
              '<span class="tile-meta" style="font-family:var(--font-body);font-size:.92rem;line-height:1.8">' +
                esc(e.text.slice(0, 120)) + '…</span>' +
              '<span class="ref-line">' + esc(e.ref) + '</span>');
            r.addEventListener('click', function () { C.navigate('azkar'); });
            frag.appendChild(r);
          });
          count += zHits.length;
        }
      }

      // الأسماء
      if (on.indexOf('names') !== -1 && App.names) {
        var nHits = App.names.names.filter(function (n) {
          return C.normalizeAr(n.name).indexOf(norm) !== -1 ||
            C.normalizeAr(n.meaning).indexOf(norm) !== -1;
        }).slice(0, 12);
        if (nHits.length) {
          frag.appendChild(el('div', 'search-group', 'أسماء الله (' + arabicNum(nHits.length) + ')'));
          nHits.forEach(function (n) {
            var r = el('button', 'tile',
              '<span class="tile-label">' + esc(n.name) + '</span>' +
              '<span class="tile-meta">' + esc(n.brief) + '</span>');
            r.addEventListener('click', function () {
              C.navigate('names');
              setTimeout(function () { window.More.openName(n.id); }, 220);
            });
            frag.appendChild(r);
          });
          count += nHits.length;
        }
      }

      // المصحف: يحتاج تحميل النص (أثقل من غيره، فنجعله الأخير)
      if (on.indexOf('quran') !== -1) {
        results.appendChild(frag);
        frag = document.createDocumentFragment();
        results.appendChild(el('div', 'loading', '<div class="spinner"></div><span>جارٍ البحث في المصحف…</span>'));
        var loadPromise = verses ? Promise.resolve(verses) : window.Quran.loadAllVerses();
        loadPromise.then(function (all) {
          verses = all;
          var loading = results.querySelector('.loading');
          if (loading) loading.remove();
          var qHits = [];
          for (var i = 0; i < all.length && qHits.length < 25; i++) {
            if (all[i].norm.indexOf(norm) !== -1) qHits.push(all[i]);
          }
          if (qHits.length) {
            var grp = el('div', 'search-group', 'المصحف (' + arabicNum(qHits.length) + ')');
            frag.appendChild(grp);
            qHits.forEach(function (it) {
              var r = el('button', 'tile',
                '<span class="tile-label">' + esc(window.Quran.surahName(it.surah)) +
                  ' — الآية ' + arabicNum(it.verse) + '</span>' +
                '<span class="tile-meta" style="font-family:var(--font-body);font-size:.95rem;line-height:1.9">' +
                  esc(it.text.slice(0, 130)) + '…</span>');
              r.addEventListener('click', function () {
                C.navigate('surah', { surah: it.surah, verse: it.verse });
              });
              frag.appendChild(r);
            });
            results.appendChild(frag);
            count += qHits.length;
          }
        }).catch(function () {
          var loading = results.querySelector('.loading');
          if (loading) loading.textContent = 'تعذّر تحميل نص المصحف.';
        });
      } else {
        results.appendChild(frag);
      }

      if (count === 0 && on.indexOf('quran') === -1) {
        results.appendChild(el('div', 'ref-line', 'لا نتائج مطابقة.'));
      }
      // تنبيه بعدم وجود نتائج في المصحف بعد اكتمال تحميله
      if (on.indexOf('quran') !== -1) {
        loadPromise.then(function () {
          if (!results.querySelector('.search-group') && !results.querySelector('.loading')) {
            results.appendChild(el('div', 'ref-line', 'لا نتائج مطابقة.'));
          }
        });
      }
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { run(input.value); }, 330);
    });
    input.focus();
  }

  /* ======================================================================
     المفضلة
     ====================================================================== */
  function renderFavorites(main) {
    var st = Store.get();
    var wrap = el('div', 'screen is-active');
    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<button class="icon-btn" data-back="1" aria-label="رجوع">' + Icons.icon('back') + '</button>' +
        '<h1 class="screen-title" style="font-size:1.34rem;margin:0">المفضلة</h1>' +
      '</div>';
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
    });

    var favs = st.favorites || [];

    // آيات محفوظة
    if (st.bookmarks && st.bookmarks.length) {
      var bc = el('div', 'card');
      bc.innerHTML = '<div class="card-title">' + Icons.icon('bookmark') +
        'آيات محفوظة (' + arabicNum(st.bookmarks.length) + ')</div>';
      st.bookmarks.forEach(function (b) {
        var t = el('button', 'tile',
          '<span class="tile-label">' + esc(window.Quran ? window.Quran.surahName(b.surah) : b.surah) +
            ' — الآية ' + arabicNum(b.verse) + '</span>');
        t.addEventListener('click', function () {
          C.navigate('surah', { surah: b.surah, verse: b.verse });
        });
        bc.appendChild(t);
      });
      wrap.appendChild(bc);
    }

    // المفضلة العامة
    if (!favs.length && (!st.bookmarks || !st.bookmarks.length)) {
      wrap.appendChild(el('div', 'empty-state', Icons.icon('star') +
        '<div>لا مفضلة بعد.<br>اضغط النجمة على أي ذكر أو دعاء أو اسم لحفظه هنا.</div>'));
    } else if (favs.length) {
      var fc = el('div', 'card');
      fc.innerHTML = '<div class="card-title">' + Icons.icon('star') +
        'محفوظات (' + arabicNum(favs.length) + ')</div>';
      favs.forEach(function (f) {
        var node = renderFavorite(f);
        if (node) fc.appendChild(node);
      });
      wrap.appendChild(fc);
    }

    // زر تصدير المفضلة
    if (favs.length || (st.bookmarks || []).length) {
      var exp = el('div', 'card');
      exp.innerHTML = '<div class="btn-row">' +
        '<button class="btn btn-block" data-export="1">' + Icons.icon('download') +
        'تصدير المفضلة</button></div>';
      exp.addEventListener('click', function (e) {
        if (e.target.closest('[data-export]')) exportFavorites();
      });
      wrap.appendChild(exp);
    }

    main.appendChild(wrap);
  }

  function renderFavorite(f) {
    var text = '';
    var title = '';
    var type = '';
    if (f.type === 'zekr') {
      var e = (App.azkar ? App.azkar.entries : []).filter(function (x) { return x.id === f.id; })[0];
      if (!e) return null;
      text = e.text; title = e.titleAr; type = 'ذكر';
    } else if (f.type === 'name') {
      var n = (App.names ? App.names.names : []).filter(function (x) { return x.id === f.id; })[0];
      if (!n) return null;
      text = n.name + ' — ' + n.brief; title = 'اسم من أسماء الله'; type = 'اسم';
    } else {
      return null;
    }

    var row = el('button', 'tile',
      '<span class="tile-label">' + esc(title) + '</span>' +
      '<span class="tile-meta" style="font-family:var(--font-body);font-size:.95rem;line-height:1.9">' +
        esc(text.slice(0, 150)) + '…</span>' +
      '<span class="ref-line">' + type + '</span>');
    row.addEventListener('click', function () {
      if (f.type === 'zekr') C.navigate('azkar');
      else C.navigate('names');
    });
    return row;
  }

  function exportFavorites() {
    var st = Store.get();
    var lines = ['# مفضلة سَكِينَة', ''];
    (st.bookmarks || []).forEach(function (b) {
      lines.push('- ' + (window.Quran ? window.Quran.surahName(b.surah) : 'سورة ' + b.surah) +
        '، الآية ' + b.verse);
    });
    (st.favorites || []).forEach(function (f) {
      if (f.type === 'zekr') {
        var e = (App.azkar ? App.azkar.entries : []).filter(function (x) { return x.id === f.id; })[0];
        if (e) lines.push('- ' + e.text + '  [' + e.ref + ']');
      } else if (f.type === 'name') {
        var n = (App.names ? App.names.names : []).filter(function (x) { return x.id === f.id; })[0];
        if (n) lines.push('- ' + n.name + ': ' + n.meaning);
      }
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'sakinah-favorites-' + Store.todayKey() + '.txt';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    C.toast('صُدّرت المفضلة');
  }

  /** تبديل حفظ عنصر في المفضلة. */
  function toggleFavorite(type, id) {
    var st = Store.get();
    var list = (st.favorites || []).slice();
    var i = -1;
    list.forEach(function (f, idx) {
      if (f.type === type && f.id === id) i = idx;
    });
    if (i >= 0) { list.splice(i, 1); C.toast('أُزيل من المفضلة'); }
    else { list.push({ type: type, id: id, at: Date.now() }); C.toast('أُضيف للمفضلة'); }
    Store.replace('favorites', list);
    return i < 0;
  }

  function isFavorite(type, id) {
    return (Store.get().favorites || []).some(function (f) {
      return f.type === type && f.id === id;
    });
  }

  /** فتح تفصيل اسم من أسماء الله (يستخدمه البحث الشامل). */
  function openName(id) {
    if (!App.names || !window.Azkar || !window.Azkar.openNameDetail) return;
    var n = App.names.names.filter(function (x) { return x.id === id; })[0];
    if (n) window.Azkar.openNameDetail(n);
  }

  /* ======================================================================
     التقويم الهجري — عرض شهري
     ====================================================================== */
  function renderHijri(main, params) {
    var wrap = el('div', 'screen is-active');
    var st = Store.get();

    var now = new Date();
    var cur = window.Hijri ? window.Hijri.toHijri(now) : null;
    var view = {
      y: (params && params.y) || (cur ? cur.year : 1448),
      m: (params && params.m) || (cur ? cur.month : 1),
    };

    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<button class="icon-btn" data-back="1" aria-label="رجوع">' + Icons.icon('back') + '</button>' +
        '<h1 class="screen-title" style="font-size:1.34rem;margin:0">التقويم الهجري</h1>' +
      '</div>' +
      '<p class="screen-sub">تقويم أم القرى · مع المناسبات وأيام الصيام</p>';

    if (!window.Hijri || !window.Hijri._state.loaded) {
      wrap.appendChild(el('div', 'empty-state', Icons.icon('info') + '<div>التقويم غير محمّل.</div>'));
      main.appendChild(wrap);
      return;
    }

    var card = el('div', 'card');
    card.innerHTML = '<div id="hijri-nav"></div><div id="hijri-grid"></div><div id="hijri-occ"></div>';
    wrap.appendChild(card);
    main.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
    });

    function paint() {
      // شريط التنقّل
      card.querySelector('#hijri-nav').innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">' +
          '<button class="icon-btn" data-nav="prev" aria-label="الشهر السابق">' + Icons.icon('back') + '</button>' +
          '<div style="flex:1;text-align:center">' +
            '<div style="font-family:var(--font-display);font-size:1.3rem;color:var(--gold-400)">' +
              esc(window.Hijri.MONTH_NAMES[view.m - 1]) + ' ' + arabicNum(view.y) + ' هـ</div>' +
            '<div class="ref-line" id="hijri-range"></div>' +
          '</div>' +
          '<button class="icon-btn" data-nav="next" aria-label="الشهر التالي" style="transform:scaleX(-1)">' +
            Icons.icon('back') + '</button>' +
        '</div>';

      // نطاق الشهر بالميلادي
      var start = window.Hijri.toGregorian(view.y, view.m, 1);
      var len = window.Hijri.daysInHijriMonth(view.y, view.m);
      var end = window.Hijri.toGregorian(view.y, view.m, len);
      var rangeEl = card.querySelector('#hijri-range');
      if (start && end) {
        rangeEl.textContent = arabicNum(start.getDate()) + '/' + arabicNum(start.getMonth() + 1) +
          ' → ' + arabicNum(end.getDate()) + '/' + arabicNum(end.getMonth() + 1) +
          ' · ' + arabicNum(len) + ' يومًا';
      }

      // الشبكة: نضيف خلايا فراغ قبل أول يوم حسب يوم الأسبوع
      var grid = card.querySelector('#hijri-grid');
      var cells = [];
      // أيام الأسبوع (نبدأ من السبت كما في التقاويم العربية عادةً)
      var dows = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      cells.push('<div class="hijri-grid">');
      dows.forEach(function (d) {
        cells.push('<div class="hijri-dow">' + d.slice(0, 3) + '</div>');
      });

      var offset = start ? (start.getDay() + 1) % 7 : 0; // السبت = 0
      for (var k = 0; k < offset; k++) cells.push('<div class="hijri-cell is-empty"></div>');

      var todayKey = Store.todayKey();
      var fastingDays = 0;
      for (var d = 1; d <= len; d++) {
        var gdate = window.Hijri.toGregorian(view.y, view.m, d);
        var gkey = gdate ? C.dayKey(gdate) : '';
        var isToday = gkey === todayKey;
        var isWhite = d >= 13 && d <= 15;
        var isMonday = gdate && gdate.getDay() === 1;
        var isThursday = gdate && gdate.getDay() === 4;
        var isRamadan = view.m === 9;
        var isFasting = isWhite || isMonday || isThursday || isRamadan;
        if (isFasting) fastingDays++;

        var cls = 'hijri-cell';
        if (isToday) cls += ' is-today';
        if (isFasting) cls += ' is-fasting';
        if (isWhite) cls += ' is-white';

        var marks = '';
        if (isWhite) marks += '<span class="hijri-mark">بيض</span>';
        if (isRamadan) marks += '<span class="hijri-mark">صوم</span>';

        cells.push('<div class="' + cls + '" data-day="' + d + '">' +
          '<span class="hijri-daynum">' + arabicNum(d) + '</span>' +
          (gdate ? '<span class="hijri-gday">' + arabicNum(gdate.getDate()) + '/' +
            arabicNum(gdate.getMonth() + 1) + '</span>' : '') +
          marks +
        '</div>');
      }
      cells.push('</div>');
      grid.innerHTML = cells.join('');

      // المناسبات
      var occ = window.Hijri.occasionsForMonth(view.y, view.m);
      var occEl = card.querySelector('#hijri-occ');
      var occHtml = '';
      if (occ.length) {
        occHtml += '<div class="fast-section" style="margin-top:16px">المناسبات</div>';
        occ.forEach(function (o) {
          occHtml += '<div class="fast-row">' +
            '<span class="badge badge-gold" style="min-width:44px;justify-content:center">' +
              arabicNum(o.hijriDay) + '</span>' +
            '<span class="fast-main">' + esc(o.titleAr) + '</span>' +
            '<span class="ref-line">' + (o.date ? arabicNum(o.date.getDate()) + '/' +
              arabicNum(o.date.getMonth() + 1) : '') + '</span>' +
          '</div>';
        });
      }
      occHtml += '<div class="ref-line" style="margin-top:14px">' +
        'أيام الصيام هذا الشهر: ' + arabicNum(fastingDays) + ' يومًا. ' +
        'الخلايا الذهبية أيام البيض (١٣–١٥)، والمعلّمة أيام الإثنين والخميس.</div>';
      occEl.innerHTML = occHtml;

      // أحداث التنقّل
      card.querySelectorAll('[data-nav]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.getAttribute('data-nav') === 'next') {
            view.m++;
            if (view.m > 12) { view.m = 1; view.y++; }
          } else {
            view.m--;
            if (view.m < 1) { view.m = 12; view.y--; }
          }
          paint();
        });
      });

      // تفاصيل يوم عند الضغط
      card.querySelectorAll('.hijri-cell[data-day]').forEach(function (cellsel) {
        cellsel.addEventListener('click', function () {
          var d = parseInt(cellsel.getAttribute('data-day'), 10);
          var g = window.Hijri.toGregorian(view.y, view.m, d);
          if (!g) return;
          var info = window.Hijri.fastingInfo(g);
          var text = window.Hijri.format(info.hijri) + ' هـ\n' +
            window.Hijri.weekdayName(g) + ' · ' +
            g.getDate() + '/' + (g.getMonth() + 1) + '/' + g.getFullYear();
          if (info.isFastingDay) {
            text += '\n\n' + info.reasons.map(function (r) { return '• ' + r.detailAr; }).join('\n');
          } else {
            text += '\n\nلا يوم صيام مسنون.';
          }
          var occDay = occ.filter(function (o) { return o.hijriDay === d; });
          if (occDay.length) {
            text += '\n\nالمناسبة: ' + occDay.map(function (o) { return o.titleAr; }).join('، ');
          }

          C.openModal(
            '<div class="modal-head"><h2>' + arabicNum(d) + ' ' +
              esc(window.Hijri.MONTH_NAMES[view.m - 1]) + '</h2>' +
            '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
            '<div class="ref-line" style="white-space:pre-line;line-height:2">' + esc(text) + '</div>' +
            '<div class="btn-row" style="margin-top:16px">' +
              '<button class="btn btn-primary" data-goto="' + view.y + ',' + view.m + ',' + d + '">' +
              'تسجيل صيام هذا اليوم</button></div>',
            function (panel) {
              panel.querySelector('[data-goto]').addEventListener('click', function () {
                logFasting(g, info);
                C.closeModal();
              });
            }
          );
        });
      });
    }

    paint();
  }

  /* ======================================================================
     سجل الصيام
     ====================================================================== */
  function logFasting(date, info) {
    var log = Object.assign({}, Store.get().fastingLog || {});
    var key = C.dayKey(date);
    if (log[key]) {
      delete log[key];
      C.toast('أُزيل تسجيل الصيام');
    } else {
      log[key] = {
        reasons: (info && info.reasons ? info.reasons : []).map(function (r) { return r.key; }),
        hijri: info && info.hijri ? info.hijri.day + ' ' + info.hijri.monthName + ' ' + info.hijri.year : '',
      };
      C.toast('سُجّل صيام اليوم');
      C.vibrate([25, 50, 25]);
    }
    Store.replace('fastingLog', log);
  }

  function renderFastingLog(main) {
    var wrap = el('div', 'screen is-active');
    wrap.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<button class="icon-btn" data-back="1" aria-label="رجوع">' + Icons.icon('back') + '</button>' +
        '<h1 class="screen-title" style="font-size:1.34rem;margin:0">سجل الصيام</h1>' +
      '</div>' +
      '<p class="screen-sub">سجّل الأيام التي صمتها وتابع استمراريتك</p>';
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
    });

    var log = Store.get().fastingLog || {};
    var keys = Object.keys(log).sort().reverse();

    // إحصاءات
    var stat = el('div', 'card');
    var thisMonth = keys.filter(function (k) { return k.slice(0, 7) === Store.todayKey().slice(0, 7); }).length;

    // حساب السلسلة الحالية من الصيام
    var streak = 0;
    for (var i = 0; i < 400; i++) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var k = C.dayKey(d);
      if (log[k]) streak++;
      else if (i > 0) break;
      else if (i === 0) continue;
    }

    stat.innerHTML = '<div class="card-title">' + Icons.icon('moonStar') + 'ملخّص</div>' +
      '<div class="streak-row">' +
        '<div class="stat"><div class="stat-value">' + arabicNum(keys.length) +
          '</div><div class="stat-label">إجمالي الأيام</div></div>' +
        '<div class="stat"><div class="stat-value">' + arabicNum(thisMonth) +
          '</div><div class="stat-label">هذا الشهر</div></div>' +
        '<div class="stat"><div class="stat-value">' + arabicNum(streak) +
          '</div><div class="stat-label">متتابعة</div></div>' +
      '</div>';
    wrap.appendChild(stat);

    // تسجيل اليوم بضغطة
    var todayCard = el('div', 'card');
    var today = new Date();
    var tkey = Store.todayKey();
    var info = window.Hijri ? window.Hijri.fastingInfo(today) : null;
    var logged = !!log[tkey];
    todayCard.innerHTML = '<div class="card-title">' + Icons.icon('checkCircle') + 'اليوم</div>' +
      '<div class="ref-line" style="margin-bottom:12px">' +
        (info ? esc(window.Hijri.format(info.hijri)) + ' هـ · ' + esc(window.Hijri.weekdayName(today)) : '') +
        (info && info.isFastingDay
          ? '<br>' + esc(info.reasons.map(function (r) { return r.detailAr; }).join(' · '))
          : '<br>لا يوم صيام مسنون اليوم') +
      '</div>' +
      '<button class="btn ' + (logged ? '' : 'btn-primary') + ' btn-block">' +
        (logged ? Icons.icon('checkCircle') + 'مسجّل ✔' : Icons.icon('check') + 'تسجيل صيام اليوم') +
      '</button>';
    todayCard.querySelector('button').addEventListener('click', function () {
      logFasting(today, info);
      C.render();
    });
    wrap.appendChild(todayCard);

    // قائمة الأيام المسجّلة
    if (keys.length) {
      var list = el('div', 'card');
      list.innerHTML = '<div class="card-title">' + Icons.icon('calendar') +
        'الأيام المسجّلة (' + arabicNum(keys.length) + ')</div>';
      keys.slice(0, 60).forEach(function (k) {
        var v = log[k];
        var label = v.hijri ? v.hijri : k;
        var row = el('div', 'fast-row');
        row.innerHTML = '<span class="badge badge-gold" style="min-width:78px;justify-content:center">' +
            esc(k.slice(5)) + '</span>' +
          '<span class="fast-main">' + esc(label) + '</span>' +
          '<button class="icon-btn" data-del="' + esc(k) + '" aria-label="حذف" style="width:30px;height:30px">' +
            Icons.icon('close') + '</button>';
        list.appendChild(row);
      });
      list.addEventListener('click', function (e) {
        var b = e.target.closest('[data-del]');
        if (!b) return;
        var k = b.getAttribute('data-del');
        var lg = Object.assign({}, Store.get().fastingLog || {});
        delete lg[k];
        Store.replace('fastingLog', lg);
        C.render();
      });
      wrap.appendChild(list);
    } else {
      wrap.appendChild(el('div', 'empty-state', Icons.icon('moonStar') +
        '<div>لا أيام مسجّلة بعد.<br>سجّل صيامك من هنا أو من التقويم الهجري.</div>'));
    }

    main.appendChild(wrap);
  }

  window.More = {
    renderMore: renderMore,
    renderSearch: renderSearch,
    renderFavorites: renderFavorites,
    renderHijri: renderHijri,
    renderFastingLog: renderFastingLog,
    toggleFavorite: toggleFavorite,
    isFavorite: isFavorite,
    openName: openName,
    logFasting: logFasting,
  };
  App.screens.more = renderMore;
  App.screens.search = renderSearch;
  App.screens.favorites = renderFavorites;
  App.screens.hijri = renderHijri;
  App.screens.fastingLog = renderFastingLog;
})();
