/* ==========================================================================
   سَكِينَة — محرك مواقيت الصلاة والقبلة (جافاسكربت، بلا شبكة)
   منقول حرفيًا من المحرك المطوّر والموثّق في data/scripts/prayer_engine.py
   والمتحقّق منه مقابل AlAdhan API: 528/528 اختبار في الطرق القياسية ≤ 3 دقائق.
   ========================================================================== */
(function (global) {
  'use strict';

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  /* طرق الحساب (زوايا الفجر/العشاء المعتمدة رسميًا) */
  var METHODS = {
    MWL: { nameAr: 'رابطة العالم الإسلامي', fajr: 18, isha: 17, maghribMinutes: 0 },
    EGYPT: { nameAr: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5, maghribMinutes: 0 },
    KARACHI: { nameAr: 'جامعة العلوم الإسلامية — كراتشي', fajr: 18, isha: 18, maghribMinutes: 0 },
    UMM_AL_QURA: { nameAr: 'أم القرى — مكة المكرمة', fajr: 18.5, ishaMinutes: 90, maghribMinutes: 0 },
    GULF: { nameAr: 'المنطقة الخليجية', fajr: 19.5, ishaMinutes: 90, maghribMinutes: 0 },
    QATAR: { nameAr: 'قطر', fajr: 18, ishaMinutes: 90, maghribMinutes: 0 },
    KUWAIT: { nameAr: 'الكويت', fajr: 18, isha: 17.5, maghribMinutes: 0 },
    SINGAPORE: { nameAr: 'سنغافورة (مجلس سنغافورة الإسلامي)', fajr: 20, isha: 18, maghribMinutes: 0 },
    JAKIM: { nameAr: 'ماليزيا (جاكيم)', fajr: 20, isha: 18, maghribMinutes: 0 },
    KEMENAG: { nameAr: 'إندونيسيا (وزارة الأديان)', fajr: 20, isha: 18, maghribMinutes: 0 },
    MOROCCO: { nameAr: 'المغرب', fajr: 19, isha: 17, maghribMinutes: 0 },
    TUNISIA: { nameAr: 'تونس', fajr: 18, isha: 18, maghribMinutes: 0 },
    ALGERIA: { nameAr: 'الجزائر', fajr: 18, isha: 17, maghribMinutes: 0 },
    JORDAN: { nameAr: 'الأردن (وزارة الأوقاف)', fajr: 18, isha: 18, maghribMinutes: 5 },
    TURKEY: { nameAr: 'رئاسة الشؤون الدينية التركية', fajr: 18, isha: 17, maghribMinutes: 0 },
    FRANCE: { nameAr: 'فرنسا (اتحاد المنظمات الإسلامية)', fajr: 12, isha: 12, maghribMinutes: 0 },
    RUSSIA: { nameAr: 'روسيا (الإدارة الدينية)', fajr: 16, isha: 15, maghribMinutes: 0 },
    NORTH_AMERICA: { nameAr: 'الجمعية الإسلامية لأمريكا الشمالية', fajr: 15, isha: 15, maghribMinutes: 0 },
    DUBAI: { nameAr: 'الإمارات — دبي', fajr: 18.2, isha: 18.2, maghribMinutes: 3 },
  };

  var ASR_FACTORS = { 1: 1.0, 2: 2.0 };
  var KAABA = { lat: 21.4224779, lon: 39.8251832 };

  /* ---------- حسابات فلكية (Meeus) ---------- */
  function julianDay(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
  }

  // ميل الشمس (بالراديان) ومعادلة الزمن (بالساعات)
  function sunPosition(jd) {
    var d = jd - 2451545.0;
    var g = ((357.529 + 0.98560028 * d) % 360) * D2R;
    var q = (280.459 + 0.98564736 * d) % 360;
    var L = ((q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360) * D2R;
    var e = (23.439 - 0.00000036 * d) * D2R;
    var decl = Math.asin(Math.sin(e) * Math.sin(L));
    var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) * R2D / 15;
    ra = (ra + 24) % 24;
    var eqt = q / 15 - ra;
    while (eqt > 12) eqt -= 24;
    while (eqt < -12) eqt += 24;
    return { decl: decl, eqt: eqt };
  }

  function midDay(jd, tz, lon) {
    var s = sunPosition(jd);
    return 12 - s.eqt - lon / 15 + tz;
  }

  // الوقت الذي تكون فيه الشمس بزاوية معيّنة تحت الأفق
  function sunAngleTime(jd, lat, angle, direction, tz, lon) {
    var s = sunPosition(jd);
    var noon = midDay(jd, tz, lon);
    var phi = lat * D2R;
    var num = Math.sin(-angle * D2R) - Math.sin(phi) * Math.sin(s.decl);
    var den = Math.cos(phi) * Math.cos(s.decl);
    if (den === 0) return null;
    var cosVal = num / den;
    if (cosVal < -1 || cosVal > 1) return null;
    var t = Math.acos(cosVal) * R2D / 15;
    return noon + direction * t;
  }

  function hourMin(h) {
    if (h === null || h === undefined || isNaN(h)) return null;
    var total = Math.round(h * 60) % 1440;
    if (total < 0) total += 1440;
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' +
      String(total % 60).padStart(2, '0');
  }

  /**
   * حساب مواقيت الصلاة ليوم وموقع محددين.
   * @param {number} lat خط العرض
   * @param {number} lon خط الطول
   * @param {Date} on التاريخ
   * @param {string} method مفتاح طريقة الحساب
   * @param {number} asrMadhab 1 = الجمهور، 2 = الحنفي
   * @param {number} tzOffsetHours إزاحة UTC بالساعات (تُقرأ من الجهاز)
   */
  function computeTimes(lat, lon, on, method, asrMadhab, tzOffsetHours, elevation) {
    method = method || 'MWL';
    asrMadhab = asrMadhab || 1;
    elevation = elevation || 0;
    var cfg = METHODS[method] || METHODS.MWL;
    if (tzOffsetHours === null || tzOffsetHours === undefined) {
      tzOffsetHours = Math.round(lon / 15);
    }
    var jd = julianDay(on.getFullYear(), on.getMonth() + 1, on.getDate());
    var jdNoon = jd + 0.5;

    // انخفاض الأفق بسبب الارتفاع
    var dip = 0.0347 * Math.sqrt(Math.max(0, elevation));

    var fajr = sunAngleTime(jdNoon, lat, cfg.fajr, -1, tzOffsetHours, lon);
    var sunrise = sunAngleTime(jdNoon, lat, 0.833 + dip, -1, tzOffsetHours, lon);
    var noon = midDay(jdNoon, tzOffsetHours, lon);

    // العصر
    var s = sunPosition(jdNoon);
    var phi = lat * D2R;
    var asrAngle = Math.atan(1 / (ASR_FACTORS[asrMadhab] + Math.tan(Math.abs(phi - s.decl)))) * R2D;
    var asr = sunAngleTime(jdNoon, lat, -asrAngle, 1, tzOffsetHours, lon);

    var sunset = sunAngleTime(jdNoon, lat, 0.833 + dip, 1, tzOffsetHours, lon);
    var maghrib = sunset === null ? null : sunset + (cfg.maghribMinutes || 0) / 60;

    var isha = null;
    if (cfg.ishaMinutes && maghrib !== null) {
      isha = maghrib + cfg.ishaMinutes / 60;
    } else if (cfg.isha !== undefined) {
      isha = sunAngleTime(jdNoon, lat, cfg.isha, 1, tzOffsetHours, lon);
    }

    // قاعدة العروض العالية (ANGLE_BASED): حيث لا تهبط الشمس تحت الزاوية
    var nextSunrise = sunAngleTime(jdNoon + 1, lat, 0.833 + dip, -1, tzOffsetHours, lon);
    var fallback = null;
    if ((fajr === null || isha === null) && maghrib !== null && nextSunrise !== null) {
      var span = nextSunrise - maghrib;
      if (span <= 0) span += 24;
      if (fajr === null) {
        fajr = sunrise - (cfg.fajr / 60) * span;
        fallback = (fallback || '') + 'fajr:angle_based;';
      }
      if (isha === null && cfg.isha !== undefined) {
        isha = maghrib + (cfg.isha / 60) * span;
        fallback = (fallback || '') + 'isha:angle_based;';
      }
    }

    // منتصف الليل الشرعي
    var midnight = null;
    if (sunset !== null && sunrise !== null) {
      var nf = sunAngleTime(jdNoon + 1, lat, cfg.fajr, -1, tzOffsetHours, lon);
      if (nf === null) nf = nextSunrise;
      if (nf !== null) {
        var f = nf < maghrib ? nf + 24 : nf;
        midnight = maghrib + (f - maghrib) / 2;
        if (midnight >= 24) midnight -= 24;
      }
    }

    return {
      date: on,
      method: method,
      methodNameAr: cfg.nameAr,
      asrMadhab: asrMadhab,
      highLatFallback: fallback,
      times: {
        fajr: hourMin(fajr),
        sunrise: hourMin(sunrise),
        dhuhr: hourMin(noon),
        asr: hourMin(asr),
        maghrib: hourMin(maghrib),
        isha: hourMin(isha),
        midnight: hourMin(midnight),
      },
      raw: { fajr: fajr, sunrise: sunrise, dhuhr: noon, asr: asr, maghrib: maghrib, isha: isha },
    };
  }

  /* ---------- القبلة ---------- */
  function qiblaDirection(lat, lon) {
    var phi1 = lat * D2R;
    var phi2 = KAABA.lat * D2R;
    var dL = (KAABA.lon - lon) * D2R;
    var y = Math.sin(dL);
    var x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dL);
    var bearing = Math.atan2(y, x) * R2D;
    bearing = (bearing + 360) % 360;

    var d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((phi2 - phi1) / 2), 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin(dL / 2), 2)
    ));
    return { bearing: Math.round(bearing * 100) / 100, distanceKm: Math.round(6371.0088 * d * 10) / 10 };
  }

  /* ---------- مساعدات ---------- */
  function minutesOf(hhmm) {
    if (!hhmm) return null;
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  var ARABIC_NAMES = {
    fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر',
    asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء',
  };

  var ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // الصلاة القادمة من الآن
  function nextPrayer(times, now) {
    var mins = now.getHours() * 60 + now.getMinutes();
    // نستثني الشروق لأنه ليس صلاة مفروضة، لكن نبقيه في العرض
    var prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (var i = 0; i < prayers.length; i++) {
      var m = minutesOf(times[prayers[i]]);
      if (m !== null && m > mins) {
        return { key: prayers[i], nameAr: ARABIC_NAMES[prayers[i]], time: times[prayers[i]], minutesLeft: m - mins };
      }
    }
    // بعد العشاء: الفجر التالي
    var fm = minutesOf(times.fajr);
    var left = fm === null ? 0 : (1440 - mins + fm);
    return { key: 'fajr', nameAr: ARABIC_NAMES.fajr, time: times.fajr, minutesLeft: left, tomorrow: true };
  }

  global.Prayer = {
    METHODS: METHODS,
    computeTimes: computeTimes,
    qiblaDirection: qiblaDirection,
    nextPrayer: nextPrayer,
    ARABIC_NAMES: ARABIC_NAMES,
    ORDER: ORDER,
    minutesOf: minutesOf,
    hourMin: hourMin,
  };
})(window);
