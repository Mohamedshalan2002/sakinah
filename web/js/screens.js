/* ==========================================================================
   سَكِينَة — المواقيت والقبلة والتنبيهات والإعدادات
   ========================================================================== */
(function () {
  'use strict';
  var C = window.Core;
  var App = window.SakinahApp;
  var $ = C.$, $$ = C.$$, el = C.el, esc = C.esc, arabicNum = C.arabicNum;

  /* ---------- المواقيت ---------- */
  function renderPrayer(main) {
    var st = Store.get();
    var loc = C.currentLocation();
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('h1', 'screen-title', 'مواقيت الصلاة'));
    wrap.appendChild(el('p', 'screen-sub', 'تُحسب على جهازك فلكيًا — تعمل بدون إنترنت'));

    if (!loc) {
      var c = el('div', 'card');
      c.innerHTML =
        '<div class="card-title">' + Icons.icon('location') + 'حدّد موقعك</div>' +
        '<p class="ref-line">المواقيت والقبلة تُحسب من إحداثيات موقعك. نخزّنها على جهازك فقط.</p>' +
        '<button class="btn btn-primary btn-block" id="btn-locate" style="margin-bottom:12px">' +
          Icons.icon('location') + 'استخدم موقعي الحالي</button>' +
        '<div class="ornament-divider">' + Icons.star8(24) + '</div>' +
        '<div class="ref-line" style="margin-bottom:8px">أو اختر مدينة:</div>' +
        '<div id="city-list" class="chip-row" style="flex-wrap:wrap;overflow:visible"></div>';
      wrap.appendChild(c);
      main.appendChild(wrap);

      c.querySelector('#btn-locate').addEventListener('click', requestLocation);
      var cityList = c.querySelector('#city-list');
      (App.cities && App.cities.cities ? App.cities.cities : []).forEach(function (city) {
        var b = el('button', 'chip', city.nameAr);
        b.addEventListener('click', function () {
          Store.set({ location: { lat: city.lat, lon: city.lon, label: city.nameAr, source: 'preset' } });
          C.render();
        });
        cityList.appendChild(b);
      });
      return;
    }

    var now = new Date();
    var result = Prayer.computeTimes(loc.lat, loc.lon, now, st.method, st.asrMadhab, C.locationTzOffset());
    var nx = Prayer.nextPrayer(result.times, now);

    var nextCard = el('div', 'prayer-next');
    nextCard.innerHTML =
      '<div class="next-label">الصلاة القادمة</div>' +
      '<div class="next-name">' + nx.nameAr + (nx.tomorrow ? ' (غدًا)' : '') + '</div>' +
      '<div class="next-time">' + (result.times[nx.key] || '—') + '</div>' +
      '<div class="next-remain">' + C.formatRemain(nx.minutesLeft) + '</div>';
    wrap.appendChild(nextCard);

    var list = el('div', 'prayer-list');
    [
      { k: 'fajr', ic: 'sunrise' }, { k: 'sunrise', ic: 'sun' }, { k: 'dhuhr', ic: 'sun' },
      { k: 'asr', ic: 'sun' }, { k: 'maghrib', ic: 'sunset' }, { k: 'isha', ic: 'moon' },
    ].forEach(function (p) {
      var isNext = !nx.tomorrow && p.k === nx.key;
      var row = el('div', 'prayer-row' + (isNext ? ' is-next' : ''));
      row.innerHTML = '<span class="p-icon">' + Icons.icon(p.ic) + '</span>' +
        '<span class="p-name">' + Prayer.ARABIC_NAMES[p.k] + '</span>' +
        '<span class="p-time">' + (result.times[p.k] || '—') + '</span>';
      list.appendChild(row);
    });
    wrap.appendChild(list);

    var info = el('div', 'card');
    info.innerHTML =
      '<div class="card-title">' + Icons.icon('info') + 'تفاصيل الحساب</div>' +
      '<div class="ref-line" style="margin-bottom:12px">' +
        'الموقع: <strong>' + esc(loc.label || (loc.lat + ', ' + loc.lon)) + '</strong><br>' +
        'الطريقة: <strong>' + esc(result.methodNameAr) + '</strong><br>' +
        'العصر: <strong>' + (st.asrMadhab === 2 ? 'الحنفي' : 'الجمهور') + '</strong>' +
        (result.highLatFallback ? '<br>ملاحظة: طُبّقت قاعدة العروض العالية (زاوية الليل)' : '') +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn" data-method="1">تغيير الطريقة</button>' +
        '<button class="btn" data-asr="1">مذهب العصر</button>' +
        '<button class="btn" data-go="qibla">' + Icons.icon('compass') + 'القبلة</button>' +
        '<button class="btn" data-notif="1">' + Icons.icon('bell') + 'التنبيهات</button>' +
        '<button class="btn" data-changeloc="1">تغيير الموقع</button>' +
      '</div>';
    wrap.appendChild(info);

    main.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-method]')) return openMethodPicker();
      if (e.target.closest('[data-asr]')) {
        Store.set({ asrMadhab: Store.get().asrMadhab === 2 ? 1 : 2 });
        C.render();
        return;
      }
      var g = e.target.closest('[data-go]');
      if (g) return C.navigate(g.getAttribute('data-go'));
      if (e.target.closest('[data-notif]')) return openNotifications();
      if (e.target.closest('[data-changeloc]')) {
        Store.set({ location: null });
        C.render();
      }
    });
  }

  function openMethodPicker() {
    var keys = Object.keys(Prayer.METHODS);
    C.openModal(
      '<div class="modal-head"><h2>طريقة حساب المواقيت</h2>' +
      '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
      '<div class="ref-line" style="margin-bottom:12px">الطرق المعتمدة من جهات رسمية. اختر الأقرب لبلدك.</div>' +
      '<div class="chip-row" style="flex-wrap:wrap;overflow:visible">' +
        keys.map(function (k) {
          var on = Store.get().method === k;
          return '<button class="chip" data-m="' + k + '" aria-pressed="' + on + '">' +
            esc(Prayer.METHODS[k].nameAr) + '</button>';
        }).join('') +
      '</div>',
      function (panel) {
        panel.querySelectorAll('[data-m]').forEach(function (b) {
          b.addEventListener('click', function () {
            Store.set({ method: b.getAttribute('data-m') });
            C.closeModal();
            C.render();
          });
        });
      }
    );
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      C.toast('جهازك لا يدعم تحديد الموقع — اختر مدينة من القائمة');
      return;
    }
    C.toast('جارٍ تحديد موقعك…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      Store.set({
        location: {
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
          label: 'موقعي الحالي',
          source: 'gps',
        },
      });
      C.render();
      C.toast('تم تحديد الموقع');
    }, function (err) {
      C.toast('تعذّر تحديد الموقع (' + err.message + ') — اختر مدينة');
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  }

  /* ---------- القبلة ---------- */
  function renderQibla(main) {
    var loc = C.currentLocation();
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('div', '', '<button class="icon-btn" data-back="1" aria-label="رجوع">' +
      Icons.icon('back') + '</button>'));
    wrap.appendChild(el('h1', 'screen-title', 'اتجاه القبلة'));

    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
    });

    if (!loc) {
      wrap.appendChild(el('div', 'notice', Icons.icon('info') + '<div>حدّد موقعك أولًا من شاشة المواقيت.</div>'));
      var b = el('button', 'btn btn-primary btn-block', 'الذهاب للمواقيت');
      b.addEventListener('click', function () { C.navigate('prayer'); });
      wrap.appendChild(b);
      main.appendChild(wrap);
      return;
    }

    var q = Prayer.qiblaDirection(loc.lat, loc.lon);
    wrap.appendChild(el('p', 'screen-sub',
      'المسافة إلى الكعبة: ' + arabicNum(Math.round(q.distanceKm)) + ' كم'));

    var qWrap = el('div', 'qibla-wrap');
    qWrap.innerHTML =
      '<div class="qibla-dial">' +
        '<svg viewBox="0 0 260 260" aria-hidden="true">' +
          '<circle cx="130" cy="130" r="120" fill="none" stroke="rgba(198,162,101,0.18)" stroke-width="1.2"/>' +
          '<circle cx="130" cy="130" r="100" fill="none" stroke="rgba(198,162,101,0.12)" stroke-width="1"/>' +
          ticks() +
          '<g class="qibla-needle" id="qibla-needle" transform="rotate(' + q.bearing.toFixed(2) + ' 130 130)">' +
            '<polygon points="130,26 122,126 138,126" fill="#c6a265"/>' +
            '<polygon points="130,234 122,134 138,134" fill="rgba(198,162,101,0.28)"/>' +
          '</g>' +
          '<circle cx="130" cy="130" r="9" fill="#0d1b2a" stroke="#c6a265" stroke-width="2"/>' +
          '<text x="130" y="16" text-anchor="middle" fill="#cdc4b2" font-size="12" font-family="Cairo, sans-serif">ش</text>' +
          '<text x="130" y="254" text-anchor="middle" fill="#cdc4b2" font-size="12" font-family="Cairo, sans-serif">ج</text>' +
          '<text x="10" y="135" text-anchor="middle" fill="#cdc4b2" font-size="12" font-family="Cairo, sans-serif">غ</text>' +
          '<text x="250" y="135" text-anchor="middle" fill="#cdc4b2" font-size="12" font-family="Cairo, sans-serif">ق</text>' +
        '</svg>' +
      '</div>' +
      '<div class="qibla-readout">' +
        '<div class="qibla-deg">' + arabicNum(q.bearing.toFixed(1)) + '°</div>' +
        '<div class="ref-line">من الشمال باتجاه عقارب الساعة</div>' +
      '</div>' +
      '<p class="qibla-hint">وجّه أعلى الجهاز نحو الشمال، ثم اتّبع السهم الذهبي. ' +
        'إن كان جهازك يدعم البوصلة، اضغط الزر لتتبع حركتك تلقائيًا.</p>' +
      '<button class="btn btn-primary btn-block" id="btn-compass">تفعيل البوصلة</button>';

    wrap.appendChild(qWrap);
    main.appendChild(wrap);

    wrap.querySelector('#btn-compass').addEventListener('click', function () { enableCompass(q.bearing); });
  }

  function ticks() {
    var out = [];
    for (var a = 0; a < 360; a += 15) {
      var rad = (a - 90) * Math.PI / 180;
      var r1 = a % 45 === 0 ? 100 : 108;
      var x1 = 130 + r1 * Math.cos(rad), y1 = 130 + r1 * Math.sin(rad);
      var x2 = 130 + 118 * Math.cos(rad), y2 = 130 + 118 * Math.sin(rad);
      out.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) +
        '" y2="' + y2.toFixed(1) + '" stroke="rgba(198,162,101,' + (a % 45 === 0 ? 0.5 : 0.22) +
        ')" stroke-width="' + (a % 45 === 0 ? 1.6 : 0.8) + '"/>');
    }
    return out.join('');
  }

  function enableCompass(qiblaBearing) {
    function onOrient(e) {
      var heading = e.webkitCompassHeading !== undefined ? e.webkitCompassHeading
        : (e.alpha !== null && e.alpha !== undefined ? 360 - e.alpha : null);
      if (heading === null) return;
      var needle = document.getElementById('qibla-needle');
      if (needle) needle.setAttribute('transform',
        'rotate(' + (qiblaBearing - heading).toFixed(2) + ' 130 130)');
    }
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (state) {
        if (state === 'granted') {
          window.addEventListener('deviceorientationabsolute', onOrient, true);
          window.addEventListener('deviceorientation', onOrient, true);
          C.toast('البوصلة مفعّلة');
        } else C.toast('لم يُسمح باستخدام البوصلة');
      }).catch(function () { C.toast('تعذّر تفعيل البوصلة'); });
    } else if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
      C.toast('البوصلة مفعّلة — حرّك جهازك');
    } else {
      C.toast('جهازك لا يدعم البوصلة — استخدم الزاوية الرقمية');
    }
  }

  /* ---------- التنبيهات ---------- */
  function openNotifications() {
    var n = Store.get().notifications;
    C.openModal(
      '<div class="modal-head"><h2>التنبيهات</h2>' +
      '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
      '<div class="notice" style="margin-bottom:14px">' + Icons.icon('info') +
        '<div>التنبيهات داخل التطبيق تعمل وأنت فاتحه. للتنبيهات في الخلفية استخدم ' +
        'تطبيق أندرويد المرفق مع المشروع.</div></div>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">' +
        '<input type="checkbox" id="n-enabled" ' + (n.enabled ? 'checked' : '') +
        ' style="width:18px;height:18px"><span>تفعيل التنبيهات</span></label>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">' +
        '<input type="checkbox" id="n-azan" ' + (n.azan ? 'checked' : '') +
        ' style="width:18px;height:18px"><span>تنبيه عند دخول وقت الصلاة</span></label>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">' +
        '<input type="checkbox" id="n-am" ' + (n.azkarMorning ? 'checked' : '') +
        ' style="width:18px;height:18px"><span>تذكير أذكار الصباح</span></label>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">' +
        '<input type="checkbox" id="n-pm" ' + (n.azkarEvening ? 'checked' : '') +
        ' style="width:18px;height:18px"><span>تذكير أذكار المساء</span></label>' +
      '<div class="ornament-divider" style="margin:16px 0">' + Icons.star8(24) + '</div>' +
      '<div class="ref-line" style="margin-bottom:10px">تذكير الصيام</div>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">' +
        '<input type="checkbox" id="n-fwhite" ' + (n.fastingWhiteDays ? 'checked' : '') +
        ' style="width:18px;height:18px"><span>تنبيه بصيام أيام البيض (١٣ · ١٤ · ١٥)</span></label>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;cursor:pointer">' +
        '<input type="checkbox" id="n-fmth" ' + (n.fastingMondayThursday ? 'checked' : '') +
        ' style="width:18px;height:18px"><span>تنبيه بصيام الإثنين والخميس</span></label>' +
      '<div class="ref-line" style="margin-bottom:14px">يُرسل التنبيه مساء اليوم السابق حتى تستعد للصيام.</div>' +
      '<button class="btn btn-primary btn-block" id="n-ask">السماح بإشعارات النظام</button>',
      function (panel) {
        function save() {
          Store.set({
            notifications: {
              enabled: panel.querySelector('#n-enabled').checked,
              azan: panel.querySelector('#n-azan').checked,
              azkarMorning: panel.querySelector('#n-am').checked,
              azkarEvening: panel.querySelector('#n-pm').checked,
              fastingWhiteDays: panel.querySelector('#n-fwhite').checked,
              fastingMondayThursday: panel.querySelector('#n-fmth').checked,
            },
          });
          C.updateNotifBtn();
          scheduleNotifications();
        }
        ['#n-enabled', '#n-azan', '#n-am', '#n-pm', '#n-fwhite', '#n-fmth'].forEach(function (s) {
          panel.querySelector(s).addEventListener('change', save);
        });
        panel.querySelector('#n-ask').addEventListener('click', function () {
          if (!('Notification' in window)) { C.toast('جهازك لا يدعم إشعارات النظام'); return; }
          Notification.requestPermission().then(function (p) {
            C.toast(p === 'granted' ? 'تم السماح بالإشعارات' : 'لم يُسمح بالإشعارات');
          });
        });
      }
    );
  }

  var notifTimer = null;
  var fired = {};
  function scheduleNotifications() {
    clearInterval(notifTimer);
    if (!Store.get().notifications.enabled) return;
    notifTimer = setInterval(check, 30000);
  }

  function check() {
    var st = Store.get();
    if (!st.notifications.enabled) return;
    var now = new Date();
    var hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var loc = C.currentLocation();
    var today = Store.todayKey();

    function fire(key, title, body) {
      var stamp = today + ' ' + hhmm + ' ' + key;
      if (fired[key] === stamp) return;
      fired[key] = stamp;
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body: body, tag: key, icon: 'assets/icons/icon-192.png' });
        } catch (e) { /* ignore */ }
      }
      C.toast(title + ' — ' + body);
    }

    if (loc && st.notifications.azan) {
      var t = Prayer.computeTimes(loc.lat, loc.lon, now, st.method, st.asrMadhab, C.locationTzOffset());
      Object.keys(t.times).forEach(function (k) {
        if (k === 'sunrise' || k === 'midnight' || !t.times[k]) return;
        if (t.times[k] === hhmm) {
          fire('azan-' + k, 'حان وقت ' + Prayer.ARABIC_NAMES[k], 'الله أكبر');
        }
      });
    }
    if (st.notifications.azkarMorning && hhmm === st.notifications.azkarMorningTime) {
      fire('azkar-am', 'أذكار الصباح', 'ابدأ يومك بالذكر');
    }
    if (st.notifications.azkarEvening && hhmm === st.notifications.azkarEveningTime) {
      fire('azkar-pm', 'أذكار المساء', 'اختم يومك بالذكر');
    }

    // ── تذكير الصيام: يُرسل مساء اليوم السابق حتى يستعد المستخدم ──
    if ((st.notifications.fastingWhiteDays || st.notifications.fastingMondayThursday) &&
        window.Hijri && window.Hijri._state.loaded) {
      var targetHour = st.notifications.fastingReminderHour || 20;
      var nowHour = now.getHours();
      if (nowHour === targetHour) {
        // نفحص يوم الغد (لأن التذكير مساءً لصيام الغد)
        var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        var info = window.Hijri.fastingInfo(tomorrow);
        if (info && info.isFastingDay) {
          var wantWhite = st.notifications.fastingWhiteDays &&
            info.reasons.some(function (r) { return r.key === 'white'; });
          var wantWeekly = st.notifications.fastingMondayThursday &&
            info.reasons.some(function (r) { return r.key === 'monday' || r.key === 'thursday'; });
          var wantRamadan = st.notifications.fastingWhiteDays &&
            info.reasons.some(function (r) { return r.key === 'ramadan'; });

          if (wantWhite || wantWeekly || wantRamadan) {
            var why = info.reasons.map(function (r) { return r.titleAr; }).join(' و');
            fire('fasting-' + window.Core.dayKey(tomorrow),
              'تذكير صيام غدًا (' + info.weekday + ')',
              why + ' — ' + info.hijri.day + ' ' + info.hijri.monthName);
          }
        }
      }
    }
  }

  /* ---------- الإعدادات ---------- */
  function renderSettings(main) {
    var st = Store.get();
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('div', '', '<button class="icon-btn" data-back="1">' + Icons.icon('back') + '</button>'));
    wrap.appendChild(el('h1', 'screen-title', 'الإعدادات'));

    var look = el('div', 'card');
    look.innerHTML =
      '<div class="card-title">' + Icons.icon('palette') + 'المظهر</div>' +
      '<div class="btn-row" style="margin-bottom:14px">' +
        '<button class="btn" data-theme="dark">' + Icons.icon('moon') + 'ليلي</button>' +
        '<button class="btn" data-theme="light">' + Icons.icon('sun') + 'نهاري</button>' +
      '</div>' +
      '<div class="ref-line" style="margin-bottom:8px">حجم الخط: ' + arabicNum(Math.round(st.fontScale * 100)) + '٪</div>' +
      '<div class="btn-row">' +
        [0.9, 1, 1.1, 1.25].map(function (s) {
          return '<button class="chip" data-font="' + s + '"' +
            (Math.abs(st.fontScale - s) < 0.001 ? ' aria-pressed="true"' : '') + '>' +
            arabicNum(Math.round(s * 100)) + '٪</button>';
        }).join('') +
      '</div>';
    wrap.appendChild(look);

    var loc = C.currentLocation();
    var prayerCard = el('div', 'card');
    prayerCard.innerHTML =
      '<div class="card-title">' + Icons.icon('location') + 'الموقع والمواقيت</div>' +
      '<div class="ref-line" style="margin-bottom:12px">' +
        (loc
          ? 'الموقع: <strong>' + esc(loc.label) + '</strong><br>الطريقة: <strong>' +
            esc((Prayer.METHODS[st.method] || {}).nameAr || st.method) + '</strong><br>العصر: <strong>' +
            (st.asrMadhab === 2 ? 'الحنفي' : 'الجمهور') + '</strong>'
          : 'لم يُحدَّد موقع بعد.') +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn" data-act="loc">' + Icons.icon('location') + 'تحديد/تغيير الموقع</button>' +
        '<button class="btn" data-act="method">تغيير طريقة الحساب</button>' +
        '<button class="btn" data-act="notif">' + Icons.icon('bell') + 'التنبيهات</button>' +
      '</div>';
    wrap.appendChild(prayerCard);

    var audio = el('div', 'card');
    audio.innerHTML =
      '<div class="card-title">' + Icons.icon('play') + 'الصوت (اختياري)</div>' +
      '<div class="notice" style="margin-bottom:12px">' + Icons.icon('info') +
        '<div>التطبيق لا يحتوي تسجيلات محميّة. تُنزّل التلاوة عند الطلب من مصدر تحدّده أنت.</div></div>' +
      '<div class="ref-line" style="margin-bottom:8px">مصدر الصوت:</div>' +
      '<input id="audio-url" type="url" placeholder="https://… رابط حزمة الصوت" value="' +
        esc(st.audio.baseUrl) + '" style="width:100%;padding:11px 14px;border-radius:12px;' +
        'border:1px solid var(--border);background:var(--bg-sunken);color:var(--text-primary);' +
        'font-family:var(--font-ui);font-size:.88rem;margin-bottom:10px">' +
      '<button class="btn btn-block" data-act="save-audio">حفظ المصدر</button>';
    wrap.appendChild(audio);

    var priv = el('div', 'card');
    priv.innerHTML =
      '<div class="card-title">' + Icons.icon('shield') + 'الخصوصية</div>' +
      '<div class="ref-line" style="line-height:1.95">' +
        '• لا إعلانات، لا تتبّع، لا تحليلات.<br>' +
        '• بياناتك (القراءة، الأذكار، الوِرد) على جهازك فقط.<br>' +
        '• الموقع يُستخدم لحساب المواقيت محليًا ولا يُرسل لأي جهة.<br>' +
        '• لا حساب ولا تسجيل دخول.' +
      '</div>';
    wrap.appendChild(priv);

    var dataCard = el('div', 'card');
    dataCard.innerHTML =
      '<div class="card-title">' + Icons.icon('list') + 'بياناتك</div>' +
      '<div class="btn-row">' +
        '<button class="btn" data-act="export">تصدير نسخة احتياطية</button>' +
        '<button class="btn" data-act="import">استيراد</button>' +
        '<button class="btn" data-act="reset">' + Icons.icon('trash') + 'تصفير كل شيء</button>' +
      '</div>';
    wrap.appendChild(dataCard);

    var about = el('div', 'card');
    about.innerHTML = '<button class="btn btn-block" data-act="about">' +
      Icons.icon('info') + 'عن «سَكِينَة» والمصادر</button>';
    wrap.appendChild(about);

    main.appendChild(wrap);

    wrap.addEventListener('click', function (e) {
      var t = e.target.closest('[data-theme]');
      if (t) { Store.set({ theme: t.getAttribute('data-theme') }); C.applyTheme(); C.render(); return; }
      var f = e.target.closest('[data-font]');
      if (f) {
        Store.set({ fontScale: parseFloat(f.getAttribute('data-font')) });
        C.applyFontScale(); C.render(); return;
      }
      if (e.target.closest('[data-back]')) { C.goBack(); return; }
      var a = e.target.closest('[data-act]');
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'loc') { Store.set({ location: null }); C.navigate('prayer'); }
      else if (act === 'method') openMethodPicker();
      else if (act === 'notif') openNotifications();
      else if (act === 'save-audio') {
        Store.set({ audio: { baseUrl: wrap.querySelector('#audio-url').value.trim() } });
        C.toast('حُفظ مصدر الصوت');
      }
      else if (act === 'export') exportData();
      else if (act === 'import') importData();
      else if (act === 'reset') confirmReset();
      else if (act === 'about') C.navigate('about');
    });
  }

  function exportData() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'sakinah-backup-' + Store.todayKey() + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    C.toast('صُدّرت نسخة احتياطية');
  }

  function importData() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(reader.result);
          if (typeof obj !== 'object' || obj === null) throw new Error('bad');
          Store.set(obj);
          C.applyTheme(); C.applyFontScale(); C.render();
          C.toast('تم الاستيراد');
        } catch (err) { C.toast('ملف غير صالح'); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function confirmReset() {
    C.openModal(
      '<div class="modal-head"><h2>تصفير كل البيانات</h2>' +
      '<button class="icon-btn" data-close="1">' + Icons.icon('close') + '</button></div>' +
      '<div class="notice" style="margin-bottom:14px">' + Icons.icon('info') +
        '<div>سيُحذف كل شيء: الوِرد، الاستمرارية، العلامات، آخر موضع قراءة، والموقع. لا يمكن التراجع.</div></div>' +
      '<div class="btn-row">' +
        '<button class="btn" data-close="1">إلغاء</button>' +
        '<button class="btn btn-primary" id="do-reset">نعم، صفّر</button>' +
      '</div>',
      function (panel) {
        panel.querySelector('#do-reset').addEventListener('click', function () {
          Store.reset();
          C.applyTheme(); C.applyFontScale();
          C.closeModal();
          C.navigate('home');
          C.toast('صُفّرت البيانات');
        });
      }
    );
  }

  function renderAbout(main) {
    var wrap = el('div', 'screen is-active');
    wrap.appendChild(el('div', '', '<button class="icon-btn" data-back="1">' + Icons.icon('back') + '</button>'));
    wrap.appendChild(el('h1', 'screen-title', 'عن «سَكِينَة»'));

    wrap.appendChild(el('div', 'card',
      '<div class="card-title">' + Icons.icon('sparkle') + 'الفكرة</div>' +
      '<p class="ref-line" style="line-height:1.95">تطبيق يجمع ما يحتاجه المسلم يوميًا في مكان واحد: ' +
      'مصحف كامل يعمل أوفلاين، أذكار وأدعية بمصادرها، مواقيت صلاة وقبلة محسوبة على جهازك، ' +
      'وِرد واستمرارية، وأسماء الله الحسنى — بلا إعلانات وبلا تتبّع.</p>'));

    wrap.appendChild(el('div', 'card',
      '<div class="card-title">' + Icons.icon('lock') + 'وعد الخصوصية</div>' +
      '<div class="ref-line" style="line-height:1.95">' +
        '• <strong>بلا إعلانات.</strong> لا بانرات ولا اشتراكات ولا ترويج.<br>' +
        '• <strong>بلا تتبّع.</strong> لا تحليلات ولا معرّفات ولا كوكيز إعلانية.<br>' +
        '• <strong>بلا حساب.</strong> كل شيء على جهازك، ويعمل بدون إنترنت.<br>' +
        '• <strong>بلا تسجيلات محميّة.</strong> أي صوت يُنزَّل من مصدر تحدده أنت.' +
      '</div>'));

    wrap.appendChild(el('div', 'card',
      '<div class="card-title">' + Icons.icon('book') + 'المصادر</div>' +
      '<div class="ref-line" style="line-height:1.95">' +
        'نص القرآن: برواية حفص عن عاصم (الرسم العثماني)، مع تحقّق بمصدرين مستقلّين — صفر اختلاف في الحروف والحركات.<br>' +
        'الأذكار: «حصن المسلم» — القحطاني.<br>' +
        'الأسماء الحسنى: «شرح أسماء الله الحسنى» — القحطاني (ترخيص MIT).<br>' +
        'الخطوط: Amiri و Cairo و Noto Naskh (تراخيص OFL مفتوحة).' +
      '</div>'));

    wrap.appendChild(el('div', 'card',
      '<div class="card-title">' + Icons.icon('info') + 'ملاحظة أمانة</div>' +
      '<div class="notice">' + Icons.icon('info') +
        '<div>الأذكار المعلّمة بـ«يحتاج مراجعة تخريج» مأخوذة من مصدر شعبي لا يذكر رقم الحديث لكل ذكر. ' +
        'لم نُكمل التخريج من عندنا. للنشر العام يُراجَع مع جهة علمية معتمدة.</div></div>' +
      '<div class="ref-line" style="margin-top:12px">الإصدار 1.0 · يعمل بدون إنترنت</div>'));

    main.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-back]')) C.goBack();
    });
  }

  window.UI = {
    renderPrayer: renderPrayer, renderQibla: renderQibla, renderSettings: renderSettings,
    renderAbout: renderAbout, openNotifications: openNotifications,
    openMethodPicker: openMethodPicker, scheduleNotifications: scheduleNotifications,
  };
  App.screens.prayer = renderPrayer;
  App.screens.qibla = renderQibla;
  App.screens.settings = renderSettings;
  App.screens.about = renderAbout;
})();
