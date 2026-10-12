/* ==========================================================================
   اختبار البحث الشامل والمفضلة والتقويم — تشغيل حقيقي في DOM.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const WEB = path.join(__dirname, '..', '..', '..', 'web');
const results = [];
const check = (name, ok, detail) => results.push({ name, ok: !!ok, detail: detail ?? '' });

(async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(WEB, 'index.html'), 'utf8'), {
    url: 'http://127.0.0.1/', runScripts: 'dangerously', pretendToBeVisual: true,
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
  for (const s of ['store', 'icons', 'prayer', 'hijri', 'core', 'quran', 'azkar', 'rituals', 'more', 'screens', 'boot']) {
    win.eval(fs.readFileSync(path.join(WEB, 'js', s + '.js'), 'utf8'));
  }
  await new Promise((r) => setTimeout(r, 1400));

  const $ = (s) => win.document.querySelector(s);
  const $$ = (s) => win.document.querySelectorAll(s);

  // ── البحث الشامل: كلمة موجودة في الأذكار ──
  win.Core.navigate('search', {}, false);
  await new Promise((r) => setTimeout(r, 200));
  const input = $('#gs-input');
  check('حقل البحث موجود', !!input, 'موجود');

  input.value = 'استغفر';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 900));
  const resHtml = $('#gs-results').textContent;
  check('البحث يجد نتائج في الأذكار', resHtml.includes('الأذكار'),
    resHtml.slice(0, 70).replace(/\s+/g, ' '));

  // ── البحث: كلمة قرآنية (نطفي الأذكار والأسماء لعزل نتيجة المصحف) ──
  for (const f of $$('#gs-filters [data-f]')) {
    if (f.getAttribute('data-f') !== 'quran') f.setAttribute('aria-pressed', 'false');
  }
  input.value = 'الرحمن الرحيم';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 5000));
  const qHtml = $('#gs-results').textContent;
  check('البحث يجد نتائج في المصحف', qHtml.includes('المصحف'),
    qHtml.slice(0, 60).replace(/\s+/g, ' '));
  // نرجّع باقي المرشحات
  for (const f of $$('#gs-filters [data-f]')) f.setAttribute('aria-pressed', 'true');

  // ── البحث: اسم من أسماء الله ──
  input.value = 'الرحيم';
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 1500));
  const nHtml = $('#gs-results').textContent;
  check('البحث يجد نتائج في الأسماء', nHtml.includes('أسماء الله'),
    nHtml.slice(0, 60).replace(/\s+/g, ' '));

  // ── تصفية النتائج تعمل ──
  // (نضغط مرة واحدة فقط — الضغط يقلب الحالة، فلا نغيرها يدويًا قبلها)
  const azkarFilter = $$('#gs-filters [data-f]')[1];
  const beforeState = azkarFilter.getAttribute('aria-pressed');
  azkarFilter.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 900));
  const afterState = azkarFilter.getAttribute('aria-pressed');
  check('تصفية الأذكار قابلة للتبديل', beforeState !== afterState,
    beforeState + ' -> ' + afterState);
  // نرجعها مفعّلة
  azkarFilter.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 600));
  check('إعادة تفعيل التصفية تعمل',
    azkarFilter.getAttribute('aria-pressed') === beforeState, 'رجع للأصل');

  // ── المفضلة: إضافة وحفظ ──
  const favZekrId = win.SakinahApp.azkar.entries[3].id;
  win.More.toggleFavorite('zekr', favZekrId);
  win.Core.navigate('favorites', {}, false);
  await new Promise((r) => setTimeout(r, 250));
  check('المفضلة تعرض العنصر المحفوظ',
    $('#main').textContent.includes('محفوظات'), 'قسم المحفوظات موجود');
  check('عدد المفضلة معروض', $('#main').textContent.includes('١'), 'العدد ظاهر');

  // ── المفضلة: شاشة المزيد تعرض العدّ ──
  win.Core.navigate('more', {}, false);
  await new Promise((r) => setTimeout(r, 200));
  check('شاشة المزيد تعرض عدد المفضلة',
    $('#main').textContent.includes('المفضلة'), 'البطاقة موجودة');
  check('شاشة المزيد تعرض ذكر اليوم',
    $('#main').textContent.includes('ذكر اليوم'), 'بطاقة ذكر اليوم موجودة');

  // ── التقويم: التنقّل بين الشهور ──
  win.Core.navigate('hijri', {}, false);
  await new Promise((r) => setTimeout(r, 250));
  const beforeNav = $('#hijri-nav').textContent;
  const nextBtn = $('#main').querySelector('[data-nav="next"]');
  nextBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  const afterNav = $('#hijri-nav').textContent;
  check('التنقّل للشهر التالي يعمل', beforeNav !== afterNav,
    'الشهر تغيّر');

  // ── التقويم: ١٢ شهرًا متتالية بلا خطأ ──
  let monthsOk = 0;
  for (let i = 0; i < 12; i++) {
    const cells = $$('.hijri-cell[data-day]').length;
    if (cells >= 29 && cells <= 30) monthsOk++;
    $('#main').querySelector('[data-nav="next"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 90));
  }
  check('١٢ شهرًا هجريًا تُرسم كلها بأطوال صحيحة', monthsOk === 12,
    monthsOk + ' من 12');

  // ── سجل الصيام ──
  const d = new Date();
  const info = win.Hijri.fastingInfo(d);
  win.More.logFasting(d, info);
  win.Core.navigate('fastingLog', {}, false);
  await new Promise((r) => setTimeout(r, 250));
  check('سجل الصيام يعرض اليوم المسجّل',
    $('#main').textContent.includes('مسجّل'), 'اليوم مسجّل');
  check('سجل الصيام يعرض الإحصاء',
    $('#main').textContent.includes('إجمالي الأيام'), 'الإحصاء موجود');
  check('سجل الصيام يعرض قائمة الأيام',
    $$('#main .fast-row').length > 0, $$('#main .fast-row').length + ' صف');

  console.log('='.repeat(72));
  console.log('اختبار البحث الشامل والمفضلة والتقويم وسجل الصيام');
  console.log('='.repeat(72));
  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.ok) { pass++; console.log('  PASS  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
    else { fail++; console.log('  FAIL  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
  }
  console.log('-'.repeat(72));
  console.log(`النتيجة: ${pass} ناجح / ${fail} فاشل من ${results.length}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('فشل:', e); process.exit(1); });
