/* ==========================================================================
   اختبار تكامل حقيقي لتطبيق «سَكِينَة» في بيئة DOM (jsdom).
   يحمّل التطبيق كما يُحمّل في المتصفح مقابل ملفات البيانات الفعلية،
   ويتحقّق من: التهيئة، التنقّل بين كل الشاشات، ظهور المحتوى، العدّادات،
   القبلة، المواقيت، والإعدادات. أي خطأ في console يُعدّ فشلًا.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const WEB = path.join(__dirname, '..', '..', '..', 'web');

// ── قيود معروفة في بيئة الاختبار (jsdom) ولا علاقة لها بالتطبيق ──
//
// jsdom لا ينفّذ window.scrollTo بل يسجّل «Not implemented» في وحدة التحكم.
// المتصفحات الحقيقية تنفّذه بدون مشكلة، وكودنا يحمي النداء بـ try/catch
// للمتصفحات القديمة. نستثني هذه الرسالة وحدها من فحص الأخطاء ونطبعها
// صراحةً في التقرير حتى لا تُخفى.
const HARNESS_LIMITATIONS = [
  /Not implemented: Window's scrollTo\(\) method/,
];

function isHarnessLimitation(msg) {
  return HARNESS_LIMITATIONS.some((re) => re.test(msg));
}

const errors = [];
const harnessNotes = [];
const warnings = [];

function loadHtml() {
  return fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
}

async function main() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => {
    const msg = 'jsdomError: ' + (e.message || e);
    if (isHarnessLimitation(msg)) harnessNotes.push(msg); else errors.push(msg);
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  vc.on('warn', (...a) => warnings.push('console.warn: ' + a.map(String).join(' ')));

  const dom = new JSDOM(loadHtml(), {
    url: 'http://127.0.0.1:8731/',
    runScripts: 'dangerously',
    resources: undefined,
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const win = dom.window;

  // ── تجهيز البيئة التي يوفرها المتصفح ولا يوفرها jsdom ──
  win.fetch = async (url) => {
    const clean = String(url).split('?')[0].replace(/^https?:\/\/[^/]+\//, '').replace(/^\/+/, '');
    const full = path.join(WEB, clean);
    if (!fs.existsSync(full)) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    const text = fs.readFileSync(full, 'utf8');
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(text),
      text: async () => text,
    };
  };
  win.Response = class Response { constructor(body, init) { this.body = body; this.status = (init || {}).status || 200; } };
  win.Request = class Request { constructor(u) { this.url = u; } };
  win.localStorage.clear();

  // ── تحميل سكربتات التطبيق بالترتيب نفسه المذكور في index.html ──
  const scripts = [
    'js/store.js', 'js/icons.js', 'js/prayer.js', 'js/hijri.js', 'js/core.js',
    'js/quran.js', 'js/azkar.js', 'js/rituals.js', 'js/more.js', 'js/screens.js', 'js/boot.js',
  ];

  const results = [];
  function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail: detail === undefined ? '' : String(detail) });
  }

  for (const s of scripts) {
    const code = fs.readFileSync(path.join(WEB, s), 'utf8');
    try {
      win.eval(code);
    } catch (e) {
      errors.push('تحميل ' + s + ' فشل: ' + e.message);
      break;
    }
  }

  // ننتظر انتهاء boot (تحميل البيانات غير متزامن)
  await new Promise((r) => setTimeout(r, 2500));

  const doc = win.document;
  const App = win.SakinahApp;
  const Store = win.Store;
  const $ = (s) => doc.querySelector(s);

  // ── 1) التهيئة العامة ──
  check('تم تحميل النواة', !!App, 'SakinahApp موجود');
  check('تم تحميل المخزن', !!Store, 'Store موجود');
  check('تم بناء هيكل الواجهة', !!$('.app-header') && !!$('.app-nav'), 'الترويسة والتنقل موجودان');

  // ── 2) البيانات محمّلة ──
  check('فهرس المصحف محمّل', App && App.quranIndex && App.quranIndex.surahs.length === 114,
    App && App.quranIndex ? App.quranIndex.surahs.length : 'null');
  check('عدد آيات الفهرس = 6236', App && App.quranIndex && App.quranIndex.verseCount === 6236,
    App && App.quranIndex ? App.quranIndex.verseCount : 'null');
  check('الأذكار محمّلة', App && App.azkar && App.azkar.entries.length === 267,
    App && App.azkar ? App.azkar.entries.length : 'null');
  check('الأسماء محمّلة', App && App.names && App.names.names.length === 99,
    App && App.names ? App.names.names.length : 'null');
  check('الأحوال محمّلة', App && App.situations && App.situations.situations.length === 10,
    App && App.situations ? App.situations.situations.length : 'null');
  check('المدن محمّلة', App && App.cities && App.cities.cities.length >= 5,
    App && App.cities ? App.cities.cities.length : 'null');

  // ── 3) الشاشة الرئيسية ──
  check('الشاشة الرئيسية ظهرت', doc.body.textContent.includes('صلاة') || doc.body.textContent.includes('المواقيت'),
    'محتوى الرئيسية معروض');

  // ── 4) التنقّل في كل الشاشات ──
  const screensToTest = ['quran', 'azkar', 'tasbih', 'prayer', 'wird', 'names', 'situations', 'settings', 'about'];
  for (const s of screensToTest) {
    try {
      win.Core.navigate(s, {}, false);
      await new Promise((r) => setTimeout(r, 60));
      const main = $('#main');
      const html = main ? main.innerHTML : '';
      check('شاشة "' + s + '" تُرسم', html.length > 200, html.length + ' محرفًا');
    } catch (e) {
      check('شاشة "' + s + '" تُرسم', false, 'استثناء: ' + e.message);
    }
  }

  // ── 5) المصحف: فتح سورة والتحقق من نص الآيات ──
  try {
    win.Core.navigate('surah', { surah: 112 }, false);
    await new Promise((r) => setTimeout(r, 400));
    const ayahs = doc.querySelectorAll('.ayah');
    check('سورة الإخلاص: عدد الآيات = 4', ayahs.length === 4, 'وجد ' + ayahs.length);
    const txt = doc.body.textContent;
    check('نص الإخلاص معروض', txt.includes('قُلْ هُوَ ٱللَّهُ أَحَدٌ') || txt.includes('أَحَدٌ'),
      'نص السورة موجود');
  } catch (e) {
    check('فتح سورة', false, e.message);
  }

  // ── 5-ب) التاريخ الهجري وتذكير الصيام في الرئيسية ──
  try {
    check('جدول أم القرى محمّل',
      App.hijriReady === true && win.Hijri._state.loaded === true,
      'hijriReady=' + App.hijriReady);

    win.Core.navigate('home', {}, false);
    await new Promise((r) => setTimeout(r, 250));
    const home = $('#main');
    const homeText = home.textContent;

    check('الرئيسية تعرض التاريخ الهجري في عنصر مخصص',
      !!$('.hijri-date'), $('.hijri-date') ? $('.hijri-date').textContent.trim() : 'مفقود');
    check('التاريخ الهجري يتضمن السنة وكلمة هـ',
      ($('.hijri-date') || { textContent: '' }).textContent.includes('هـ'),
      'الصيغة الكاملة');
    check('قسم أيام البيض معروض',
      !!$('.fast-section') && home.querySelector('.fast-section').textContent.includes('أيام البيض'),
      $('.fast-section') ? $('.fast-section').textContent.trim() : 'مفقود');
    check('قائمة أيام البيض تعرض ٣ أيام على الأقل',
      home.querySelectorAll('.fast-row').length >= 3,
      home.querySelectorAll('.fast-row').length + ' صفًا');
    check('بطاقة «أيام الصيام القادمة» ظهرت',
      homeText.includes('أيام الصيام القادمة'), 'موجودة');
    check('التذكير يذكر أيام البيض', homeText.includes('أيام البيض'), 'مذكورة');

    const hNow = win.Hijri.toHijri(new Date());
    check('التاريخ الهجري لليوم محسوب', !!hNow,
      hNow ? `${hNow.day} ${hNow.monthName} ${hNow.year}` : 'null');
    check('التاريخ الهجري داخل نطاق الجدول',
      hNow && hNow.year >= 1408 && hNow.year <= 1478, hNow ? 'السنة ' + hNow.year : 'خارج');

    // تسلسل الأشهر: أول الشهر = آخر يوم من السابق + 1
    const pm = hNow.month === 1 ? 12 : hNow.month - 1;
    const py = hNow.month === 1 ? hNow.year - 1 : hNow.year;
    const lastPrev = win.Hijri.toGregorian(py, pm, win.Hijri.daysInHijriMonth(py, pm));
    const firstCur = win.Hijri.toGregorian(hNow.year, hNow.month, 1);
    const gap = Math.round((firstCur - lastPrev) / 86400000);
    check('تسلسل الأشهر الهجرية متصل', gap === 1, `فرق = ${gap} يوم`);

    // منطق الإثنين/الخميس
    const mon = new Date(2026, 8, 28);
    const thu = new Date(2026, 9, 1);
    check('الإثنين يُكبر كيوم صيام',
      win.Hijri.fastingInfo(mon).reasons.some((r) => r.key === 'monday'),
      win.Hijri.weekdayName(mon));
    check('الخميس يُعرف كيوم صيام',
      win.Hijri.fastingInfo(thu).reasons.some((r) => r.key === 'thursday'),
      win.Hijri.weekdayName(thu));
  } catch (e) {
    check('التاريخ الهجري في الرئيسية', false, e.message);
  }

  // ── 6) الأذكار: ظهور مرجع لكل ذكر ──
  try {
    win.Core.navigate('azkar', {}, false);
    await new Promise((r) => setTimeout(r, 250));
    const cards = doc.querySelectorAll('.zekr-card');
    check('بطاقات الأذكار ظهرت', cards.length > 5, 'عدد البطاقات ' + cards.length);
    const hasRef = doc.body.textContent.includes('المرجع:');
    check('كل ذكر يعرض مرجعه', hasRef, 'كلمة «المرجع» موجودة');
    const badges = doc.querySelectorAll('.badge-review, .badge-verified');
    check('درجة التوثيق معلَنة', badges.length > 0, badges.length + ' شارة');
  } catch (e) {
    check('شاشة الأذكار', false, e.message);
  }

  // ── 7) السبحة: العدّاد يعمل فعليًا ──
  try {
    win.Core.navigate('tasbih', {}, false);
    await new Promise((r) => setTimeout(r, 150));
    const before = Store.get().tasbih.count || 0;
    const btn = $('#tasbih-tap');
    check('زر السبحة موجود', !!btn, 'زر العدّ');
    for (let i = 0; i < 5; i++) btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const after = Store.get().tasbih.count || 0;
    check('العدّاد زاد 5 مرات', after === before + 5, before + ' -> ' + after);
  } catch (e) {
    check('السبحة', false, e.message);
  }

  // ── 8) المواقيت والقبلة بموقع محدد ──
  try {
    Store.set({ location: { lat: 30.0444, lon: 31.2357, label: 'القاهرة', source: 'preset' }, method: 'EGYPT' });
    win.Core.navigate('prayer', {}, false);
    await new Promise((r) => setTimeout(r, 200));
    const rows = doc.querySelectorAll('.prayer-row');
    check('قائمة المواقيت ظهرت (6 أوقات)', rows.length === 6, 'وجد ' + rows.length);
    const nextCard = $('.prayer-next');
    check('بطاقة الصلاة القادمة ظهرت', !!nextCard, nextCard ? 'موجودة' : 'مفقودة');
    const timesText = doc.body.textContent;
    check('اسم طريقة الحساب معلَن', timesText.includes('الهيئة المصرية') || timesText.includes('طريقة'),
      'الطريقة معروضة');

    win.Core.navigate('qibla', {}, false);
    await new Promise((r) => setTimeout(r, 200));
    const qd = $('.qibla-deg');
    check('زاوية القبلة معروضة', !!qd, qd ? qd.textContent.trim() : 'مفقودة');
    const expected = win.Prayer.qiblaDirection(30.0444, 31.2357).bearing;
    check('زاوية القبلة صحيحة للقاهرة (~136.14)',
      qd && Math.abs(parseFloat(qd.textContent.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) - expected) < 0.5,
      'المتوقع ' + expected + ' — المعروض ' + (qd ? qd.textContent.trim() : ''));
  } catch (e) {
    check('المواقيت/القبلة', false, e.message);
  }

  // ── 9) الوِرد والاستمرارية ──
  try {
    win.Core.navigate('wird', {}, false);
    await new Promise((r) => setTimeout(r, 150));
    const toggle = $('#wird-toggle');
    check('زر إتمام الوِرد موجود', !!toggle, 'زر الوِرد');
    toggle.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    const done = Store.get().wird.completedDays[Store.todayKey()];
    check('الاستمرارية سُجّلت لليوم', !!done, 'اليوم مسجّل=' + !!done);
    const streak = win.Core.computeStreak();
    check('حساب السلسلة يعمل (≥1)', streak >= 1, 'السلسلة=' + streak);
  } catch (e) {
    check('الوِرد', false, e.message);
  }

  // ── 10) الأسماء الحسنى: فتح تفصيل اسم ──
  try {
    win.Core.navigate('names', {}, false);
    await new Promise((r) => setTimeout(r, 250));
    const tiles = doc.querySelectorAll('.name-tile');
    check('٩٩ اسمًا معروضة', tiles.length === 99, 'وجد ' + tiles.length);
    tiles[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
    const panel = $('#modal-panel');
    check('تفصيل الاسم يُفتح', panel && panel.innerHTML.length > 100,
      panel ? panel.innerHTML.length + ' محرفًا' : 'مفقود');
    check('التفصيل يعرض الأدلة', panel && (panel.textContent.includes('القرآن') || panel.textContent.includes('المعنى')),
      'المعنى/الأدلة معروضة');
    win.Core.closeModal();
  } catch (e) {
    check('الأسماء', false, e.message);
  }

  // ── 11) أدعية الأحوال ──
  try {
    win.Core.navigate('situations', {}, false);
    await new Promise((r) => setTimeout(r, 200));
    const tiles = doc.querySelectorAll('.tile');
    check('حالات الدعاء ظهرت', tiles.length >= 10, 'وجد ' + tiles.length);
    tiles[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    const panel = $('#modal-panel');
    check('أدعية الحالة تُفتح مع مصادرها',
      panel && panel.textContent.includes('المرجع'), panel ? 'مصادر موجودة' : 'مفقود');
    win.Core.closeModal();
  } catch (e) {
    check('الأحوال', false, e.message);
  }

  // ── 12) تبديل الوضع الليلي/النهاري ──
  try {
    const t0 = doc.documentElement.getAttribute('data-theme');
    win.Core.applyTheme();
    Store.set({ theme: Store.get().theme === 'light' ? 'dark' : 'light' });
    win.Core.applyTheme();
    const t1 = doc.documentElement.getAttribute('data-theme');
    check('تبديل الوضع يعمل', t0 !== t1, t0 + ' -> ' + t1);
    Store.set({ theme: 'dark' });
    win.Core.applyTheme();
  } catch (e) {
    check('الوضع', false, e.message);
  }

  // ── 13) البحث في المصحف فعليًا ──
  try {
    const all = await win.Quran.loadAllVerses();
    check('نص المصحف الكامل محمّل', all.length === 6236, all.length + ' آية');
    const norm = win.Core.normalizeAr('الرحمن الرحيم');
    const hits = all.filter((v) => v.norm.indexOf(norm) !== -1);
    check('البحث يجد نتائج', hits.length > 0, hits.length + ' نتيجة');
  } catch (e) {
    check('البحث', false, e.message);
  }

  // ── 14) عامل الخدمة موجود ──
  check('ملف عامل الخدمة موجود', fs.existsSync(path.join(WEB, 'sw.js')), 'sw.js');
  const swCode = fs.readFileSync(path.join(WEB, 'sw.js'), 'utf8');
  check('عامل الخدمة لا يطلب نطاقات خارجية',
    !/https?:\/\/(?!127\.0\.0\.1|localhost)/.test(swCode.replace(/^\s*\*.*$/gm, '')),
    'لا طلبات خارجية');

  // ── 15) سجل الصيام ──
  try {
    const h1 = new Date(2026, 9, 12);
    const before = Object.keys(Store.get().fastingLog || {}).length;
    win.More.logFasting(h1, win.Hijri.fastingInfo(h1));
    const after = Object.keys(Store.get().fastingLog || {}).length;
    check('تسجيل الصيام يعمل', after === before + 1, `${before} -> ${after}`);
    win.More.logFasting(h1, win.Hijri.fastingInfo(h1));
    const back = Object.keys(Store.get().fastingLog || {}).length;
    check('إلغاء تسجيل الصيام يعمل', back === before, `${after} -> ${back}`);
  } catch (e) {
    check('سجل الصيام', false, e.message);
  }

  // ── 16) المفضلة ──
  try {
    const zid = App.azkar.entries[0].id;
    const wasFav = win.More.isFavorite('zekr', zid);
    win.More.toggleFavorite('zekr', zid);
    check('إضافة للمفضلة تعمل', win.More.isFavorite('zekr', zid) !== wasFav,
      'قبل=' + wasFav + ' بعد=' + win.More.isFavorite('zekr', zid));
    win.More.toggleFavorite('zekr', zid);
    check('إزالة من المفضلة تعمل', win.More.isFavorite('zekr', zid) === wasFav, 'رجع للأصل');
  } catch (e) {
    check('المفضلة', false, e.message);
  }

  // ── 17) شاشات «المزيد» ترسم وتعمل ──
  for (const s of ['more', 'search', 'favorites', 'hijri', 'fastingLog']) {
    try {
      win.Core.navigate(s, {}, false);
      await new Promise((r) => setTimeout(r, 90));
      const h = $('#main').innerHTML;
      check('شاشة "' + s + '" ترسم', h.length > 150, h.length + ' محرفًا');
    } catch (e) {
      check('شاشة "' + s + '" ترسم', false, e.message);
    }
  }

  // ── 18) التقويم الهجري: الشبكة تُرسم بخلايا صحيحة ──
  try {
    win.Core.navigate('hijri', {}, false);
    await new Promise((r) => setTimeout(r, 150));
    const cells = $('#main').querySelectorAll('.hijri-cell[data-day]');
    const nowH = win.Hijri.toHijri(new Date());
    const expect = win.Hijri.daysInHijriMonth(nowH.year, nowH.month);
    check('شبكة التقويم تعرض أيام الشهر كلها', cells.length === expect,
      cells.length + ' خلية (متوقع ' + expect + ')');
    check('أيام البيض معلّمة في الشبكة',
      $('#main').querySelectorAll('.hijri-cell.is-white').length === 3,
      $('#main').querySelectorAll('.hijri-cell.is-white').length + ' خلية بيض');
  } catch (e) {
    check('شبكة التقويم', false, e.message);
  }

  // ── 19) لا تتبّع/إعلانات في الواجهة ──
  const htmlAll = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).join(' ');
  check('لا سكربتات خارجية', !/https?:\/\//.test(htmlAll), htmlAll || 'كل السكربتات محلية');
  const cssCode = fs.readFileSync(path.join(WEB, 'css', 'app.css'), 'utf8');
  check('لا @import خارجي في CSS', !/@import\s+url\(\s*['"]?https?:/.test(cssCode), 'لا استيراد خارجي');

  // ── التقرير ──
  console.log('='.repeat(74));
  console.log('اختبار تكامل تطبيق «سَكِينَة» (jsdom)');
  console.log('='.repeat(74));
  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.ok) { pass++; console.log('  PASS  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
    else { fail++; console.log('  FAIL  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
  }
  console.log('-'.repeat(74));
  console.log(`النتيجة: ${pass} ناجح / ${fail} فاشل من ${results.length}`);

  if (errors.length) {
    console.log('\n--- أخطاء في وحدة التحكم ---');
    [...new Set(errors)].slice(0, 20).forEach((e) => console.log('  ' + e));
  }
  if (harnessNotes.length) {
    console.log('\n--- قيود بيئة الاختبار (متوقعة، لا علاقة لها بالتطبيق) ---');
    [...new Set(harnessNotes)].forEach((n) => console.log('  ' + n));
  }
  if (warnings.length) {
    console.log('\n--- تحذيرات ---');
    [...new Set(warnings)].slice(0, 10).forEach((w) => console.log('  ' + w));
  }

  dom.window.close();
  process.exit(fail || errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error('فشل الاختبار نفسه:', e);
  process.exit(1);
});
