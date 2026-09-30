/* ==========================================================================
   سَكِينَة — النواة: أدوات، هيكل الواجهة، التنقّل، الشاشة الرئيسية
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var App = {
    quranIndex: null,
    azkar: null,
    names: null,
    situations: null,
    cities: null,
    route: { name: 'home', params: {} },
    navStack: [],
    selectedAyah: null,
    repeatTimer: null,
    installPrompt: null,
    screens: {},
  };
  window.SakinahApp = App;

  /* ---------- أدوات ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    var inner = t.firstElementChild;
    inner.textContent = msg;
    t.style.display = 'flex';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.style.display = 'none'; }, 2600);
  }

  function fetchJSON(url) {
    return fetch(url, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error('تعذّر تحميل ' + url + ' (' + r.status + ')');
      return r.json();
    });
  }

  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* غير مدعوم */ }
  }

  function tzOffsetHours(d) { return -(d.getTimezoneOffset() / 60); }

  function formatRemain(mins) {
    if (mins === null || mins === undefined) return '';
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h > 0) return 'بعد ' + h + ' س و' + m + ' د';
    return 'بعد ' + m + ' دقيقة';
  }

  var AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  function arabicNum(n) {
    return String(n).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[+d]; });
  }

  function normalizeAr(s) {
    return String(s)
      .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08FF]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/[ىئ]/g, 'ي').replace(/ة/g, 'ه')
      .replace(/\s+/g, '');
  }

  function currentLocation() { return Store.get().location || null; }
  function locationTzOffset() { return tzOffsetHours(new Date()); }

  /* ---------- الهيكل ---------- */
  function buildShell() {
    var navItems = [
      { id: 'quran', label: 'المصحف', icon: 'quran' },
      { id: 'azkar', label: 'الأذكار', icon: 'list' },
      { id: 'tasbih', label: 'السبحة', icon: 'beads' },
      { id: 'prayer', label: 'المواقيت', icon: 'compass' },
      { id: 'wird', label: 'الوِرد', icon: 'fire' },
    ];

    $('#app').innerHTML =
      '<header class="app-header">' +
        '<div class="brand">' +
          '<span class="brand-mark">' + Icons.star8(30) + '</span>' +
          '<span class="brand-text">' +
            '<span class="brand-name">سَكِينَة</span>' +
            '<span class="brand-sub">QURAN · AZKAR · QIBLAH</span>' +
          '</span>' +
        '</div>' +
        '<div class="header-actions">' +
          '<button class="icon-btn" id="btn-notif" aria-label="التنبيهات">' + Icons.icon('bell') + '</button>' +
          '<button class="icon-btn" id="btn-theme" aria-label="تبديل الوضع">' + Icons.icon('sun') + '</button>' +
          '<button class="icon-btn" id="btn-settings" aria-label="الإعدادات">' + Icons.icon('settings') + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="pattern-strip" id="strip-top"></div>' +
      '<main class="app-main" id="main"></main>' +
      '<nav class="app-nav" id="nav">' +
        navItems.map(function (it) {
          return '<button class="nav-item" data-nav="' + it.id + '" aria-label="' + it.label + '">' +
            Icons.icon(it.icon) + '<span>' + it.label + '</span></button>';
        }).join('') +
      '</nav>' +
      '<div class="modal" id="modal"><div class="modal-panel" id="modal-panel"></div></div>' +
      '<div class="modal" id="toast" style="display:none;background:transparent;pointer-events:none">' +
        '<div style="margin:0 auto 100px;padding:10px 20px;background:var(--ink-900);border:1px solid var(--border-strong);' +
        'border-radius:999px;font-size:.86rem;color:var(--cream-100);box-shadow:var(--shadow)"></div>' +
      '</div>';

    $('#strip-top').style.backgroundImage = Icons.patternStrip();

    $('#nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]');
      if (b) navigate(b.getAttribute('data-nav'));
    });
    $('#btn-settings').addEventListener('click', function () { navigate('settings'); });
    $('#btn-theme').addEventListener('click', toggleTheme);
    $('#btn-notif').addEventListener('click', function () {
      navigate('prayer');
      setTimeout(function () { if (window.UI.openNotifications) window.UI.openNotifications(); }, 140);
    });
    $('#modal').addEventListener('click', function (e) {
      if (e.target.id === 'modal') closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function applyTheme() {
    var theme = Store.get().theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#faf7f0' : '#0d1b2a');
    var b = $('#btn-theme');
    if (b) b.innerHTML = Icons.icon(theme === 'light' ? 'moon' : 'sun');
  }

  function toggleTheme() {
    Store.set({ theme: Store.get().theme === 'light' ? 'dark' : 'light' });
    applyTheme();
  }

  function applyFontScale() {
    var s = Store.get().fontScale || 1;
    document.body.style.fontSize = (16 * s) + 'px';
  }

  function updateNotifBtn() {
    var on = Store.get().notifications.enabled;
    var b = $('#btn-notif');
    if (b) {
      b.innerHTML = Icons.icon(on ? 'bell' : 'bellOff');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ---------- التنقّل ---------- */
  function navigate(name, params, push) {
    if (!App.screens[name]) name = 'home';
    if (push !== false && App.route.name !== name) {
      App.navStack.push({ name: App.route.name, params: App.route.params });
    }
    App.route = { name: name, params: params || {} };
    render();
    // بعض البيئات (وحدات الاختبار أو المتصفحات القديمة) لا تنفّذ scrollTo
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      if (document.documentElement) document.documentElement.scrollTop = 0;
    }
  }

  function goBack() {
    var prev = App.navStack.pop();
    if (prev) { App.route = prev; render(); }
    else navigate('home', {}, false);
  }

  function render() {
    $$('.nav-item').forEach(function (b) {
      b.setAttribute('aria-current', b.getAttribute('data-nav') === App.route.name ? 'page' : 'false');
    });
    var main = $('#main');
    main.innerHTML = '';
    App.screens[App.route.name](main, App.route.params);
    updateNotifBtn();
  }

  /* ---------- المودال ---------- */
  function openModal(html, after) {
    var m = $('#modal'), p = $('#modal-panel');
    p.innerHTML = html;
    m.classList.add('is-open');
    p.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', closeModal);
    });
    if (after) after(p);
  }

  function closeModal() { $('#modal').classList.remove('is-open'); }

  /* ---------- الاستمرارية ---------- */
  function computeStreak() {
    var days = Store.get().wird.completedDays || {};
    var streak = 0;
    var d = new Date();
    if (!days[Store.todayKey()]) d.setDate(d.getDate() - 1);
    for (var i = 0; i < 400; i++) {
      var k = dayKey(d);
      if (days[k]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }

  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fillWeekGrid(grid) {
    if (!grid) return;
    var done = Store.get().wird.completedDays || {};
    var today = Store.todayKey();
    grid.innerHTML = '';
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var k = dayKey(d);
      grid.appendChild(el('div', 'day-cell' + (done[k] ? ' is-done' : '') + (k === today ? ' is-today' : ''),
        AR_DAYS[d.getDay()].slice(0, 1)));
    }
  }

  /*
   * بطاقة التاريخ الهجري وحالة الصيام لليوم.
   * تعتمد على جدول أم القرى المحلي — لا تحتاج إنترنت.
   */
  function hijriTodayCard(now) {
    if (!window.Hijri || !window.Hijri._state.loaded) return null;

    var h = window.Hijri.toHijri(now);
    if (!h) return null;
    var info = window.Hijri.fastingInfo(now);
    var ram = window.Hijri.ramadanStatus(now);

    var card = el('div', 'card');
    var html = '<div class="card-title">' + Icons.icon('calendarHeart') +
      'التاريخ الهجري</div>';

    // التاريخ نصًّا واضحًا (كان الرقم يضيع بصريًا داخل عنوان البطاقة)
    html += '<div class="hijri-date">' + arabicNum(h.day) + ' ' +
      esc(h.monthName) + ' ' + arabicNum(h.year) + ' هـ</div>';

    html += '<div class="ref-line" style="margin-top:4px">' +
      esc(window.Hijri.weekdayName(now)) + ' · اليوم ' + arabicNum(h.day) +
      ' من ' + esc(h.monthName) + ' (' + arabicNum(h.monthLength) + ' يومًا)' +
      ' · شهر ' + arabicNum(h.month) + ' من ١٢</div>';

    if (ram && ram.inRamadan) {
      html += '<div class="badge badge-verified" style="margin-top:10px">' +
        Icons.icon('moonStar') + 'اليوم ' + arabicNum(ram.dayOfRamadan) + ' من رَمَضان</div>';
    }

    // حالة الصيام اليوم
    if (info && info.isFastingDay) {
      var chips = info.reasons.map(function (r) {
        var isRmd = r.key === 'ramadan';
        return '<span class="badge ' + (isRmd ? 'badge-verified' : 'badge-gold') + '">' +
          Icons.icon('moonStar') + esc(r.titleAr) + '</span>';
      }).join(' ');
      html += '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' + chips + '</div>';
      html += '<div class="ref-line" style="margin-top:8px">' +
        esc(info.reasons[0].detailAr) + '</div>';
    } else {
      html += '<div class="ref-line" style="margin-top:10px">لا يوم صيام مسنون اليوم.</div>';
    }

    card.innerHTML = html;
    return card;
  }

  /*
   * بطاقة تذكير بأيام الصيام القادمة.
   *
   * مهم: نافذة زمنية قصيرة (أسبوع مثلًا) تُخفي أيام البيض لأنها تأتي في
   * منتصف الشهر الهجري فقط. لذلك نجمع نوعين من التذكير:
   *   ١) الأيام الأسبوعية القادمة (الإثنين/الخميس) — أقرب ٤ أيام.
   *   ٢) أيام البيض القادمة تحديدًا (١٣–١٥) — حتى لو بعد شهر كامل.
   * كان هذا نقصًا حقيقيًا في العرض: الحساب كان صحيحًا لكن القائمة لا
   * تُظهر أيام البيض إطلاقًا في معظم أيام الشهر.
   */
  function fastingUpcomingCard(now) {
    if (!window.Hijri || !window.Hijri._state.loaded) return null;

    var weekly = window.Hijri.upcomingFastingDays(now, 4).filter(function (u) {
      // نستبعد أي يوم بيض من القائمة الأسبوعية لتفادي التكرار
      return !u.reasons.some(function (r) { return r.key === 'white'; });
    });

    // أيام البيض القادمة (نبحث حتى ٧٠ يومًا لتغطية الشهر القادم)
    var whiteUpcoming = [];
    for (var i = 0; i < 70 && whiteUpcoming.length < 3; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      var info = window.Hijri.fastingInfo(d);
      if (!info) break;
      var isWhite = info.reasons.some(function (r) { return r.key === 'white'; });
      if (isWhite) {
        whiteUpcoming.push({
          date: d,
          hijri: info.hijri,
          weekday: window.Hijri.weekdayName(d),
          inDays: i,
        });
      }
    }

    var whenText = function (n) {
      if (n === 0) return 'اليوم';
      if (n === 1) return 'غدًا';
      return 'بعد ' + arabicNum(n) + ' يومًا';
    };

    var html = '<div class="card-title">' + Icons.icon('moonStar') +
      'أيام الصيام القادمة</div>';

    // قسم أيام البيض
    if (whiteUpcoming.length) {
      html += '<div class="fast-section">أيام البيض (١٣ · ١٤ · ١٥)</div>';
      html += whiteUpcoming.map(function (u) {
        return '<div class="fast-row">' +
          '<span class="badge badge-gold" style="min-width:78px;justify-content:center">' +
            esc(whenText(u.inDays)) + '</span>' +
          '<span class="fast-main">' + esc(u.weekday) + ' · ' +
            arabicNum(u.hijri.day) + ' ' + esc(u.hijri.monthName) + '</span>' +
          '<span class="ref-line">' + arabicNum(u.date.getDate()) + '/' +
            arabicNum(u.date.getMonth() + 1) + '</span>' +
        '</div>';
      }).join('');
    }

    // قسم الإثنين والخميس
    if (weekly.length) {
      html += '<div class="fast-section" style="margin-top:12px">الإثنين والخميس</div>';
      html += weekly.map(function (u) {
        var why = u.reasons.map(function (r) {
          if (r.key === 'monday') return 'الإثنين';
          if (r.key === 'thursday') return 'الخميس';
          if (r.key === 'ramadan') return 'رَمَضان';
          return r.titleAr;
        }).join(' + ');
        return '<div class="fast-row">' +
          '<span class="badge" style="min-width:78px;justify-content:center">' +
            esc(whenText(u.inDays)) + '</span>' +
          '<span class="fast-main">' + esc(u.weekday) + ' · ' +
            arabicNum(u.hijri.day) + ' ' + esc(u.hijri.monthName) + '</span>' +
          '<span class="ref-line">' + esc(why) + '</span>' +
        '</div>';
      }).join('');
    }

    // رمضان
    var ram = window.Hijri.ramadanStatus(now);
    if (ram && !ram.inRamadan && ram.daysUntilRamadan > 0 && ram.daysUntilRamadan <= 40) {
      html += '<div class="notice" style="margin-top:12px">' + Icons.icon('moonStar') +
        '<div>باقي ' + arabicNum(ram.daysUntilRamadan) + ' يومًا على شَهْر رَمَضان (' +
        arabicNum(ram.startDate.getDate()) + '/' + arabicNum(ram.startDate.getMonth() + 1) +
        ' بإذن الله).</div></div>';
    }

    html += '<div class="ref-line" style="margin-top:12px">أيام البيض: ١٣ و١٤ و١٥ من كل شهر هجري. ' +
      'الإثنين والخميس أسبوعيًا. التاريخ بتقويم أم القرى.</div>';

    var card = el('div', 'card');
    card.innerHTML = html;
    return card;
  }

  function streakCard() {
    var st = Store.get();
    var days = Object.keys(st.wird.completedDays || {}).length;
    var card = el('div', 'card');
    card.innerHTML =
      '<div class="card-title">' + Icons.icon('fire') + 'استمراريتك</div>' +
      '<div class="streak-row">' +
        '<div class="stat"><div class="stat-value">' + arabicNum(computeStreak()) + '</div><div class="stat-label">أيام متتابعة</div></div>' +
        '<div class="stat"><div class="stat-value">' + arabicNum(days) + '</div><div class="stat-label">إجمالي الأيام</div></div>' +
        '<div class="stat"><div class="stat-value">' + arabicNum(st.tasbih.count || 0) + '</div><div class="stat-label">تسبيحات</div></div>' +
      '</div>' +
      '<div class="week-grid" id="week-grid"></div>';
    setTimeout(function () { fillWeekGrid(card.querySelector('#week-grid')); }, 0);
    return card;
  }

  /* ---------- الشاشة الرئيسية ---------- */
  function renderHome(main) {
    var st = Store.get();
    var now = new Date();
    var hour = now.getHours();
    var greeting = hour < 12 ? 'صباح الخير' : (hour < 17 ? 'طاب نهارك' : 'طاب مساؤك');

    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', greeting));

    // التاريخ الميلادي والهجري
    var dateLine = AR_DAYS[now.getDay()] + ' · ' + arabicNum(now.getDate()) +
      ' / ' + arabicNum(now.getMonth() + 1) + ' / ' + arabicNum(now.getFullYear());
    wrap.appendChild(el('p', 'screen-sub', dateLine));

    // بطاقة التاريخ الهجري + حالة اليوم
    var hijriCard = hijriTodayCard(now);
    if (hijriCard) wrap.appendChild(hijriCard);

    if (App.installPrompt) {
      var ib = el('div', 'install-bar',
        '<span>' + Icons.icon('download') + '</span><span style="flex:1">ثبّت «سَكِينَة» على جهازك ليفتح بدون إنترنت.</span>');
      var btn = el('button', 'btn btn-primary', 'تثبيت');
      btn.addEventListener('click', function () {
        App.installPrompt.prompt();
        App.installPrompt = null;
        render();
      });
      ib.appendChild(btn);
      wrap.appendChild(ib);
    }

    // مواقيت مختصرة
    var loc = currentLocation();
    var timesCard = el('div', 'card');
    if (loc) {
      try {
        var t = Prayer.computeTimes(loc.lat, loc.lon, now, st.method, st.asrMadhab, locationTzOffset());
        var nx = Prayer.nextPrayer(t.times, now);
        timesCard.innerHTML =
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<div style="flex:1">' +
              '<div style="font-size:.76rem;color:var(--text-muted)">الصلاة القادمة</div>' +
              '<div style="font-family:var(--font-display);font-size:1.5rem;color:var(--gold-400)">' +
                nx.nameAr + ' · ' + t.times[nx.key] + '</div>' +
              '<div style="font-size:.78rem;color:var(--teal-400)">' + formatRemain(nx.minutesLeft) + '</div>' +
            '</div>' +
            '<button class="icon-btn" data-go="qibla" aria-label="القبلة">' + Icons.icon('compass') + '</button>' +
          '</div>';
      } catch (e) {
        timesCard.innerHTML = '<div class="ref-line">تعذّر حساب المواقيت.</div>';
      }
    } else {
      timesCard.innerHTML =
        '<div class="card-title">' + Icons.icon('location') + 'مواقيت الصلاة والقبلة</div>' +
        '<p class="ref-line" style="margin-bottom:12px">حدّد موقعك لحساب المواقيت والقبلة على جهازك (بدون إنترنت).</p>' +
        '<button class="btn btn-primary btn-block" data-go="prayer">تحديد الموقع</button>';
    }
    wrap.appendChild(timesCard);

    // متابعة القراءة
    if (st.lastRead && st.lastRead.surah) {
      var lr = el('div', 'card');
      lr.innerHTML =
        '<div class="card-title">' + Icons.icon('book') + 'متابعة القراءة</div>' +
        '<button class="tile" data-continue="1" style="border:none;background:transparent;padding:0">' +
          '<span class="tile-label">سورة ' + esc(window.Quran ? window.Quran.surahName(st.lastRead.surah) : st.lastRead.surah) +
            ' — الآية ' + arabicNum(st.lastRead.verse) + '</span>' +
          '<span class="tile-meta">اضغط للمتابعة من موضعك</span>' +
        '</button>';
      wrap.appendChild(lr);
    }

    wrap.appendChild(streakCard());

    // تذكير الصيام
    var fastCard = fastingUpcomingCard(now);
    if (fastCard) wrap.appendChild(fastCard);

    var quick = el('div', 'grid-auto');
    [
      { id: 'azkar', icon: 'sun', label: 'أذكار الصباح/المساء', meta: 'حسب وقت اليوم' },
      { id: 'names', icon: 'sparkle', label: 'أسماء الله الحسنى', meta: '٩٩ اسمًا بالشرح' },
      { id: 'situations', icon: 'handHeart', label: 'دعاء حسب حالك', meta: 'همّ · قلق · سفر' },
      { id: 'wird', icon: 'target', label: 'وِرد اليوم', meta: 'ختمة ومتابعة' },
    ].forEach(function (q) {
      var t = el('button', 'tile', Icons.icon(q.icon) +
        '<span class="tile-label">' + q.label + '</span><span class="tile-meta">' + q.meta + '</span>');
      t.addEventListener('click', function () { navigate(q.id); });
      quick.appendChild(t);
    });
    wrap.appendChild(quick);

    wrap.appendChild(el('div', 'notice', Icons.icon('shield') +
      '<div><strong>بلا إعلانات، بلا تتبّع.</strong><br>كل بياناتك وعبادتك محفوظة على جهازك فقط. لا نرسل شيئًا لأي خادم.</div>'));

    main.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]');
      if (g) { navigate(g.getAttribute('data-go')); return; }
      if (e.target.closest('[data-continue]')) {
        var lr2 = Store.get().lastRead;
        navigate('surah', { surah: lr2.surah, verse: lr2.verse });
      }
    });
  }

  /* ---------- التصدير ---------- */
  window.Core = {
    $: $, $$: $$, el: el, esc: esc, toast: toast, fetchJSON: fetchJSON,
    vibrate: vibrate, tzOffsetHours: tzOffsetHours, formatRemain: formatRemain,
    arabicNum: arabicNum, normalizeAr: normalizeAr, AR_DAYS: AR_DAYS,
    currentLocation: currentLocation, locationTzOffset: locationTzOffset,
    navigate: navigate, goBack: goBack, render: render,
    openModal: openModal, closeModal: closeModal,
    applyTheme: applyTheme, applyFontScale: applyFontScale, updateNotifBtn: updateNotifBtn,
    computeStreak: computeStreak, dayKey: dayKey, fillWeekGrid: fillWeekGrid, streakCard: streakCard,
    buildShell: buildShell, renderHome: renderHome,
  };
  App.screens.home = renderHome;
  window.UI = {};
})();
