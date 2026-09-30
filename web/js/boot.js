/* ==========================================================================
   سَكِينَة — التهيئة: تحميل البيانات، تسجيل عامل الخدمة، معالجة التثبيت
   ========================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  var App = window.SakinahApp;

  function boot() {
    Store.get();
    C.buildShell();
    C.applyTheme();
    C.applyFontScale();
    C.updateNotifBtn();
    if (window.UI && window.UI.scheduleNotifications) window.UI.scheduleNotifications();

    // تحميل كل البيانات المحلية بالتوازي (كلها من داخل حزمة التطبيق)
    var jobs = [
      C.fetchJSON('data/quran/index.json').then(function (d) { App.quranIndex = d; }),
      C.fetchJSON('data/azkar/azkar.json').then(function (d) {
        return C.fetchJSON('data/azkar/categories.json').then(function (c) {
          App.azkar = { entries: d.entries, categories: c };
        });
      }),
      C.fetchJSON('data/names/names99.json').then(function (d) { App.names = d; }),
      C.fetchJSON('data/names/situations.json').then(function (d) { App.situations = d; }),
      C.fetchJSON('data/cities.json').then(function (d) { App.cities = d; }),
      // التقويم الهجري (جدول أم القرى) — يعمل أوفلاين
      window.Hijri
        ? window.Hijri.load(C.fetchJSON).then(function (ok) { App.hijriReady = !!ok; })
        : Promise.resolve(),
    ];

    Promise.all(jobs).then(function () {
      C.navigate('home', {}, false);
    }).catch(function (err) {
      C.navigate('home', {}, false);
      C.toast('تعذّر تحميل بعض البيانات: ' + err.message);
    });

    // التثبيت على الجهاز
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      App.installPrompt = e;
      if (App.route.name === 'home') C.render();
    });

    // زر الرجوع
    window.addEventListener('popstate', function () {
      var m = document.getElementById('modal');
      if (m && m.classList.contains('is-open')) { C.closeModal(); return; }
      C.goBack();
    });

    // حفظ احتياطي عند مغادرة الصفحة
    window.addEventListener('pagehide', function () {
      try { localStorage.setItem('sakinah.v1', JSON.stringify(Store.get())); } catch (e) { /* ignore */ }
    });

    // العمل بدون إنترنت
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* يعمل بلا أوفلاين */ });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
