/* ==========================================================================
   سَكِينَة — طبقة التخزين المحلي
   كل شيء يُحفظ على جهاز المستخدم فقط. لا إرسال لأي خادم، لا تتبّع، لا تحليلات.
   ========================================================================== */
(function (global) {
  'use strict';

  const KEY = 'sakinah.v1';

  const DEFAULTS = {
    theme: 'dark',
    // آخر موضع قراءة في المصحف
    lastRead: { surah: 1, verse: 1, at: 0 },
    // مواضع محفوظة (فهرس)
    bookmarks: [],
    // المفضلة: أذكار وأدعية وأسماء يحفظها المستخدم
    favorites: [],
    // سجل الصيام: { 'YYYY-MM-DD': { reasons: ['white','monday'] } }
    fastingLog: {},
    // ذكر اليوم (يُختار بنفس اليوم ليكون ثابتًا)
    dailyZekr: { day: '', id: '' },
    // ختمة
    khatmah: { startDate: '', page: 1, targetPages: 604 },
    // الأذكار: عدّاد كل ذكر + آخر يوم
    zekrProgress: {},          // { entryId: { count, day } }
    zekrDoneDays: {},          // { 'YYYY-MM-DD': [entryId, ...] }
    // الوِرد اليومي
    wird: { completedDays: {}, streak: 0, lastDay: '' },
    // السبحة
    tasbih: { count: 0, target: 33, phrase: 'سبحان الله' },
    // المواقيت والقبلة
    location: null,            // { lat, lon, label, source }
    method: 'MWL',
    asrMadhab: 1,
    // التنبيهات
    notifications: {
      enabled: false,
      azan: true,
      azkarMorning: true,
      azkarEvening: true,
      azkarMorningTime: '06:30',
      azkarEveningTime: '18:00',
      // تذكيرات الصيام
      fastingWhiteDays: true,     // تنبيه بصيام أيام البيض (١٣ و١٤ و١٥)
      fastingMondayThursday: true, // تنبيه بصيام الإثنين والخميس
      fastingReminderHour: 20,    // ساعة التنبيه المسبق (بعد صلاة العشاء عادةً)
      lastFired: '',
    },
    // الصوت (تنزيل عند الطلب من مصدر يحدده المستخدم — لا ملفات محمّلة)
    audio: {
      source: 'none',          // 'none' | 'custom'
      baseUrl: '',             // مصدر يحدده المستخدم
      reciter: '',
      downloaded: {},          // { surahNumber: true }
    },
    // إعدادات العرض
    fontScale: 1,
    tafsirEnabled: false,
    onboarded: false,
  };

  function deepMerge(base, patch) {
    if (patch === null || patch === undefined) return base;
    if (Array.isArray(patch)) return patch.slice();
    if (typeof patch !== 'object') return patch;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(patch).forEach(function (k) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
        out[k] = deepMerge(base && base[k] ? base[k] : {}, patch[k]);
      } else {
        out[k] = patch[k];
      }
    });
    return out;
  }

  let state = null;
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? deepMerge(DEFAULTS, JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULTS));
    } catch (e) {
      // تخزين غير متاح أو بيانات تالفة: نعمل بالافتراضي بلا كسر التطبيق
      state = JSON.parse(JSON.stringify(DEFAULTS));
    }
    return state;
  }

  let saveTimer = null;
  function persist() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        /* التخزين ممتلئ أو محجوب — لا نُسقط التطبيق */
      }
    }, 120);
  }

  function notify(patch) {
    listeners.forEach(function (fn) {
      try { fn(state, patch); } catch (e) { /* عزل أخطاء المستمعين */ }
    });
  }

  const Store = {
    DEFAULTS: DEFAULTS,
    get: function () {
      if (!state) load();
      return state;
    },
    set: function (patch) {
      if (!state) load();
      state = deepMerge(state, patch);
      persist();
      notify(patch);
      return state;
    },
    // استبدال قيمة فتاحية كاملة (مثل مصفوفة)
    replace: function (key, value) {
      if (!state) load();
      state[key] = value;
      persist();
      notify({ [key]: value });
      return state;
    },
    on: function (fn) {
      listeners.push(fn);
      return function () {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    reset: function () {
      state = JSON.parse(JSON.stringify(DEFAULTS));
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      notify({});
      return state;
    },
    exportJSON: function () {
      if (!state) load();
      return JSON.stringify(state, null, 2);
    },
    todayKey: function () {
      const d = new Date();
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    },
    dayDiff: function (a, b) {
      // فرق الأيام بين مفتاحي تاريخ محليين
      if (!a || !b) return Infinity;
      const pa = a.split('-').map(Number);
      const pb = b.split('-').map(Number);
      const da = new Date(pa[0], pa[1] - 1, pa[2]);
      const db = new Date(pb[0], pb[1] - 1, pb[2]);
      return Math.round((db - da) / 86400000);
    },
  };

  global.Store = Store;
})(window);
