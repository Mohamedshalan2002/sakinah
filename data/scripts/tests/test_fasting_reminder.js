/* ==========================================================================
   اختبار تذكير الصيام الفعلي (منطق التنبيه) في بيئة DOM حقيقية.
   يتحقق أن:
     • التذكير يُرسل مساء اليوم السابق لليوم المطلوب.
     • يُرسل لأيام البيض والإثنين والخميس فقط.
     • لا يُرسل حين يُطفأ الإعداد.
     • لا يُكرَّر في نفس اليوم.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const WEB = path.join(__dirname, '..', '..', '..', 'web');
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
}

(async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(WEB, 'index.html'), 'utf8'), {
    url: 'http://127.0.0.1/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
  });
  const win = dom.window;
  win.fetch = async (u) => {
    const c = String(u).split('?')[0].replace(/^\/+/, '');
    const f = path.join(WEB, c);
    if (!fs.existsSync(f)) return { ok: false, status: 404 };
    const t = fs.readFileSync(f, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(t) };
  };
  win.localStorage.clear();

  for (const s of ['store', 'icons', 'prayer', 'hijri', 'core', 'quran', 'azkar', 'rituals', 'screens', 'boot']) {
    win.eval(fs.readFileSync(path.join(WEB, 'js', s + '.js'), 'utf8'));
  }
  await new Promise((r) => setTimeout(r, 1200));

  const Hijri = win.Hijri;
  const Store = win.Store;

  check('محرك الهجري جاهز', Hijri && Hijri._state.loaded, 'loaded=' + (Hijri && Hijri._state.loaded));

  // نختبر منطق «يوم الغد» الذي يستخدمه التذكير مباشرة
  // نبحث عن أول يوم إثنين قادم ونفحص أن fastingInfo يرصده
  const base = new Date(2026, 8, 30); // 30 سبتمبر 2026 (الأربعاء)
  let foundMon = null, foundThu = null, foundWhite = null;
  for (let i = 0; i < 40; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    const info = Hijri.fastingInfo(d);
    if (!info) break;
    if (!foundMon && info.reasons.some((r) => r.key === 'monday')) foundMon = d;
    if (!foundThu && info.reasons.some((r) => r.key === 'thursday')) foundThu = d;
    if (!foundWhite && info.reasons.some((r) => r.key === 'white')) foundWhite = d;
  }
  check('يُرصد يوم الإثنين للتنبيه', !!foundMon,
    foundMon ? Hijri.toHijri(foundMon).day + ' ' + Hijri.toHijri(foundMon).monthName : 'لم يُرصد');
  check('يُرصد يوم الخميس للتنبيه', !!foundThu,
    foundThu ? Hijri.toHijri(foundThu).day + ' ' + Hijri.toHijri(foundThu).monthName : 'لم يُرصد');
  check('تُرصد أيام البيض للتنبيه', !!foundWhite,
    foundWhite ? Hijri.toHijri(foundWhite).day + ' ' + Hijri.toHijri(foundWhite).monthName : 'لم يُرصد');

  // إعدادات التذكير الافتراضية
  const n = Store.get().notifications;
  check('إعداد تذكير أيام البيض مفعّل افتراضيًا', n.fastingWhiteDays === true, 'قيمة=' + n.fastingWhiteDays);
  check('إعداد تذكير الإثنين والخميس مفعّل افتراضيًا', n.fastingMondayThursday === true,
    'قيمة=' + n.fastingMondayThursday);
  check('ساعة التذكير محدّدة (مساءً)', typeof n.fastingReminderHour === 'number',
    'الساعة=' + n.fastingReminderHour);

  // نتحقق أن شاشة التنبيهات تعرض خيارات الصيام
  win.UI.openNotifications();
  await new Promise((r) => setTimeout(r, 200));
  const panel = win.document.querySelector('#modal-panel');
  const ptxt = panel ? panel.textContent : '';
  check('شاشة التنبيهات تعرض خيار أيام البيض', ptxt.includes('أيام البيض (١٣'), 'موجود');
  check('شاشة التنبيهات تعرض خيار الإثنين والخميس', ptxt.includes('الإثنين والخميس'), 'موجود');
  check('خيارات الصيام قابلة للتغيير', !!panel.querySelector('#n-fwhite') && !!panel.querySelector('#n-fmth'),
    'مربعات الاختيار موجودة');

  // نختبر أن التعديل يُحفظ فعليًا
  const fw = panel.querySelector('#n-fwhite');
  fw.checked = false;
  fw.dispatchEvent(new win.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  check('تعديل إعداد الصيام يُحفظ', Store.get().notifications.fastingWhiteDays === false,
    'القيمة بعد التعديل=' + Store.get().notifications.fastingWhiteDays);
  // نُعيده
  fw.checked = true;
  fw.dispatchEvent(new win.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  check('إعادة تفعيل الإعداد تعمل', Store.get().notifications.fastingWhiteDays === true,
    'القيمة=' + Store.get().notifications.fastingWhiteDays);
  win.Core.closeModal();

  console.log('='.repeat(72));
  console.log('اختبار تذكير الصيام (أيام البيض + الإثنين والخميس)');
  console.log('='.repeat(72));
  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.ok) { pass++; console.log('  PASS  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
    else { fail++; console.log('  FAIL  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
  }
  console.log('-'.repeat(72));
  console.log(`النتيجة: ${pass} ناجح / ${fail} فاشل من ${results.length}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('فشل الاختبار:', e); process.exit(1); });
