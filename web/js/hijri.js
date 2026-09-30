/* ==========================================================================
   سَكِينَة — التقويم الهجري والمناسبات
   يعتمد على جدول أطوال أشهر أم القرى الرسمي (بيانات مُجمّدة في
   data/hijri.json) وليس على تقويم حسابي تقريبي — يعمل أوفلاين بدقة رسمية.
   ========================================================================== */
(function (global) {
  'use strict';

  var HJ = {
    loaded: false,
    startYear: 0,
    monthsHex: '',
    monthNames: [],
    occasions: [],
    // نقطة إسناد محسوبة عند التحميل: (تاريخ ميلادي) <-> (تاريخ هجري)
    anchorG: null,   // Date ميلادي عند بداية يوم الإسناد
    anchorH: null,   // {y, m, d}
  };

  var AR_MONTHS = [
    'مُحَرَّم', 'صَفَر', 'رَبيع الأوَّل', 'رَبيع الآخِر',
    'جُمادى الأولى', 'جُمادى الآخِرة', 'رَجَب', 'شَعْبان',
    'رَمَضان', 'شَوَّال', 'ذو القَعْدة', 'ذو الحِجّة',
  ];

  /** أطوال أشهر سنة هجرية من الجدول المضغوط. */
  function monthLengths(year) {
    var idx = year - HJ.startYear;
    if (idx < 0 || (idx * 3 + 3) > HJ.monthsHex.length) return null;
    var bits = parseInt(HJ.monthsHex.substr(idx * 3, 3), 16);
    var out = [];
    for (var i = 0; i < 12; i++) {
      out.push(((bits >> (11 - i)) & 1) ? 30 : 29);
    }
    return out;
  }

  function daysInHijriMonth(y, m) {
    var ml = monthLengths(y);
    if (!ml) return 30;
    return ml[m - 1];
  }

  function daysInHijriYear(y) {
    var ml = monthLengths(y);
    if (!ml) return 354;
    var s = 0;
    for (var i = 0; i < 12; i++) s += ml[i];
    return s;
  }

  /** عدد الأيام من بداية سنة هجرية معينة حتى تاريخ هجري (بأساس 0 لمحرم). */
  function dayOfHijriYear(y, m, d) {
    var ml = monthLengths(y);
    if (!ml) return 0;
    var s = 0;
    for (var i = 0; i < m - 1; i++) s += ml[i];
    return s + (d - 1);
  }

  /** بداية اليوم (بلا وقت) لتفادي مشاكل التوقيت الصيفي. */
  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * إنشاء تاريخ ميلادي من صيغة ISO (YYYY-MM-DD) بتوقيت محلي بلا وقت.
   * ملاحظة مهمة: لا نستخدم new Date('1987-08-25') لأن المتصفح يفسّر صيغة
   * ISO المجرّدة كـ UTC، فيظهر اليوم السابق في المناطق الزمنية السالبة
   * (وهو بالضبط ما ظهر أثناء الاختبار: 1987-08-24 بدل 1987-08-25).
   */
  function fromIsoLocal(iso) {
    var parts = String(iso).split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (x) { return isNaN(x); })) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(date, n) {
    var d = startOfDay(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function diffDays(a, b) {
    var ms = startOfDay(b).getTime() - startOfDay(a).getTime();
    return Math.round(ms / 86400000);
  }

  /** التاريخ الهجري من تاريخ ميلادي. */
  function toHijri(date) {
    if (!HJ.loaded || !HJ.anchorG || !HJ.anchorH) return null;
    var delta = diffDays(HJ.anchorG, date);
    var y = HJ.anchorH.year;
    var remaining = dayOfHijriYear(y, HJ.anchorH.month, HJ.anchorH.day) + delta;

    // نمشي سنينًا للخلف أو للأمام حسب الإشارة
    while (remaining < 0) {
      y -= 1;
      remaining += daysInHijriYear(y);
    }
    while (remaining >= daysInHijriYear(y)) {
      remaining -= daysInHijriYear(y);
      y += 1;
    }
    var m = 1;
    var ml = monthLengths(y);
    while (m <= 12) {
      var len = ml ? ml[m - 1] : 30;
      if (remaining < len) break;
      remaining -= len;
      m++;
    }
    if (m > 12) { m = 12; remaining = 29; }

    return {
      year: y,
      month: m,
      day: remaining + 1,
      monthName: (HJ.monthNames[m - 1] || AR_MONTHS[m - 1]),
      monthLength: ml ? ml[m - 1] : 30,
    };
  }

  /** تاريخ ميلادي من تاريخ هجري. */
  function toGregorian(hy, hm, hd) {
    if (!HJ.loaded || !HJ.anchorG || !HJ.anchorH) return null;
    var ay = HJ.anchorH.year;
    var am = HJ.anchorH.month;
    var ad = HJ.anchorH.day;
    var deltaY = hy - ay;
    var total = 0;
    if (deltaY > 0) {
      for (var y = ay; y < hy; y++) total += daysInHijriYear(y);
    } else if (deltaY < 0) {
      for (var y2 = hy; y2 < ay; y2++) total -= daysInHijriYear(y2);
    }
    total += dayOfHijriYear(hy, hm, hd) - dayOfHijriYear(ay, am, ad);
    return addDays(HJ.anchorG, total);
  }

  /** صيغة العرض: «١٣ رَمَضان ١٤٤٧». */
  function format(h, withYear) {
    if (!h) return '';
    var s = h.day + ' ' + h.monthName;
    if (withYear !== false) s += ' ' + h.year;
    return s;
  }

  /* ---------- المناسبات والصيام ---------- */

  /**
   * أيام البيض: ١٣ و١٤ و١٥ من كل شهر هجري.
   * تُعاد كتواريخ ميلادية للتحقق والمقارنة.
   */
  function whiteDays(hy, hm) {
    return [13, 14, 15].map(function (d) {
      return { hijriDay: d, date: toGregorian(hy, hm, d) };
    });
  }

  /**
   * هل التاريخ الميلادي يوم إثنين أو خميس؟
   * ملاحظة: اليوم يبدأ من غروب الشمس شرعًا، لكننا نعرض اليوم الميلادي
   * المبني على التقويم الجاري، ونذكر تنبيه «الصيام يبدأ من الفجر».
   */
  function weekdayName(date) {
    var names = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return names[date.getDay()];
  }

  function isMonday(date) { return date.getDay() === 1; }
  function isThursday(date) { return date.getDay() === 4; }

  /**
   * حالة الصيام لليوم الحالي: أيام البيض / الإثنين / الخميس / رمضان.
   * تُعاد كقائمة أسباب (قد تجتمع، مثل الخميس ١٣ من الشهر).
   */
  function fastingInfo(date) {
    var h = toHijri(date);
    if (!h) return null;
    var reasons = [];

    if (h.day === 13 || h.day === 14 || h.day === 15) {
      reasons.push({
        key: 'white',
        titleAr: 'من أيام البيض',
        detailAr: 'اليوم ' + h.day + ' من ' + h.monthName +
          ' — صيام أيام البيض (١٣ و١٤ و١٥)',
      });
    }
    if (isMonday(date)) {
      reasons.push({
        key: 'monday',
        titleAr: 'يوم الإثنين',
        detailAr: 'يُستحب صيام الإثنين',
      });
    }
    if (isThursday(date)) {
      reasons.push({
        key: 'thursday',
        titleAr: 'يوم الخميس',
        detailAr: 'يُستحب صيام الخميس',
      });
    }
    if (h.month === 9) {
      reasons.push({
        key: 'ramadan',
        titleAr: 'رَمَضان',
        detailAr: 'صيام الفرض — الشهر ' + h.day + ' من رَمَضان',
      });
    }

    return {
      hijri: h,
      weekday: weekdayName(date),
      reasons: reasons,
      isFastingDay: reasons.length > 0,
    };
  }

  /**
   * الأيام القادمة التي يُستحب صيامها (للتنبيه المسبق).
   * نفحص نافذة من الأيام ونُعيد أول عدد مطلوب.
   */
  function upcomingFastingDays(from, count) {
    var out = [];
    var limit = count || 6;
    for (var i = 0; i < 120 && out.length < limit; i++) {
      var d = addDays(from, i);
      var info = fastingInfo(d);
      if (!info) break;
      if (info.isFastingDay) {
        out.push({
          date: d,
          hijri: info.hijri,
          weekday: info.weekday,
          inDays: i,
          reasons: info.reasons,
        });
      }
    }
    return out;
  }

  /** مناسبات إسلامية في شهر هجري معيّن. */
  function occasionsForMonth(hy, hm) {
    return (HJ.occasions || []).filter(function (o) {
      return o.m === hm && hy >= HJ.startYear && hy <= HJ.startYear + (HJ.monthsHex.length / 3);
    }).map(function (o) {
      return {
        titleAr: o.titleAr,
        hijriDay: o.d,
        date: toGregorian(hy, hm, o.d),
      };
    });
  }

  /** رَمَضان: باقي الأيام حتى بدايته أو حتى نهايته. */
  function ramadanStatus(date) {
    var h = toHijri(date);
    if (!h) return null;
    if (h.month === 9) {
      return {
        inRamadan: true,
        dayOfRamadan: h.day,
        remainingInRamadan: daysInHijriMonth(h.year, 9) - h.day + 1,
      };
    }
    // نحسب حتى أول رمضان القادم
    var targetYear = h.month < 9 ? h.year : h.year + 1;
    var start = toGregorian(targetYear, 9, 1);
    if (!start) return null;
    return {
      inRamadan: false,
      daysUntilRamadan: diffDays(date, start),
      startDate: start,
      startHijriYear: targetYear,
    };
  }

  /** تحميل الجدول ثم ضبط نقطة الإسناد من البيانات نفسها. */
  function load(fetchJson) {
    return fetchJson('data/hijri.json').then(function (data) {
      HJ.startYear = data.startYear;
      HJ.endYear = data.endYear;
      HJ.monthsHex = data.monthsHex;
      HJ.monthNames = data.monthNames || AR_MONTHS;
      HJ.occasions = data.occasions || [];

      // نقطة الإسناد محقونة في البيانات (لا نعتمد على دعم المتصفح):
      // anchorGregorian هو التاريخ الميلادي المقابل لـ anchorHijri.
      var ag = data.anchorGregorian;
      var ah = data.anchorHijri;
      if (!ag || !ah) {
        HJ.loaded = false;
        return false;
      }
      var parts = String(ag).split('-').map(Number);
      if (parts.length !== 3 || parts.some(function (x) { return isNaN(x); })) {
        HJ.loaded = false;
        return false;
      }
      // نبني التاريخ بتوقيت محلي صريح (لا نمرّر صيغة ISO لنفس السبب أعلاه)
      HJ.anchorG = fromIsoLocal(ag);
      HJ.anchorH = { year: ah.y, month: ah.m, day: ah.d };
      HJ.loaded = true;

      // فحص ذاتي: هل يعيد الجدول نفس يوم الإسناد؟
      var back = toHijri(HJ.anchorG);
      HJ.selfCheckOk = !!back && back.year === ah.y && back.month === ah.m && back.day === ah.d;      return HJ.loaded && HJ.selfCheckOk;
    });
  }

  global.Hijri = {
    load: load,
    toHijri: toHijri,
    toGregorian: toGregorian,
    format: format,
    monthLengths: monthLengths,
    daysInHijriMonth: daysInHijriMonth,
    daysInHijriYear: daysInHijriYear,
    whiteDays: whiteDays,
    weekdayName: weekdayName,
    isMonday: isMonday,
    isThursday: isThursday,
    fastingInfo: fastingInfo,
    upcomingFastingDays: upcomingFastingDays,
    occasionsForMonth: occasionsForMonth,
    ramadanStatus: ramadanStatus,
    MONTH_NAMES: AR_MONTHS,
    _state: HJ,
  };
})(window);
