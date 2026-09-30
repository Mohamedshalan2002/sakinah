/* ==========================================================================
   اختبار محوّل التاريخ الهجري (web/js/hijri.js) مقابل تقويم أم القرى.
   نحمّل الملف الحقيقي في بيئة Node مع fetch وهمي من الملف على القرص،
   ثم نقارن مخرجاته مع حالات مرجعية مولّدة من مكتبة hijri-converter
   (نفسها التي ولّدت الجدول) — أي مقارنة بمرجع مستقل عن كود التطبيق.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const WEB = path.join(__dirname, '..', '..', '..', 'web');
const CASES = path.join(__dirname, 'hijri_cases.json');

global.window = global;

// fetch وهمي يقرأ من القرص
//
// ملاحظة مهمة: كود التطبيق لا يستدعي fetch مباشرةً، بل يستدعي
// Core.fetchJSON الذي يُرجع JSON **محلولًا** (أي fetch(url).then(r => r.json())).
// لذلك يجب أن يحاكي الـstub عقد fetchJSON نفسه لا عقد fetch الخام —
// وإلا قرأ المحوّل كائن الاستجابة بدل البيانات ورجع false صامتًا.
global.fetch = async (url) => {
  const clean = String(url).split('?')[0].replace(/^\/+/, '');
  const full = path.join(WEB, clean);
  if (!fs.existsSync(full)) return { ok: false, status: 404 };
  const text = fs.readFileSync(full, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text) };
};

// نحاكي Core.fetchJSON بالضبط كما في web/js/core.js
const fetchJSON = (url) => global.fetch(url).then((r) => {
  if (!r.ok) throw new Error('تعذّر تحميل ' + url + ' (' + r.status + ')');
  return r.json();
});

const code = fs.readFileSync(path.join(WEB, 'js', 'hijri.js'), 'utf8');
new Function('window', code + '\n')(global);
const Hijri = global.Hijri;

if (!Hijri) { console.error('FAIL: Hijri غير مصدَّر'); process.exit(1); }

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
}

(async () => {
  const loaded = await Hijri.load(fetchJSON);
  check('تحميل جدول أم القرى', loaded, loaded ? 'ناجح' : 'فشل');
  check('الفحص الذاتي لنقطة الإسناد', !!Hijri._state.selfCheckOk,
    'anchorG=' + (function () {
      var d = Hijri._state.anchorG;
      if (!d) return 'null';
      // نطبع بالتوقيت المحلي (لا UTC) لأن الإسناد محلي — toISOString كان
      // يُظهر اليوم السابق في المناطق الزمنية السالبة.
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    })());

  const cases = JSON.parse(fs.readFileSync(CASES, 'utf8'));

  // ── ١) ميلادي ← هجري ──
  let g2hOk = 0, g2hFail = 0;
  const g2hErrors = [];
  for (const c of cases.gregorianToHijri) {
    const [y, m, d] = c.g.split('-').map(Number);
    const h = Hijri.toHijri(new Date(y, m - 1, d));
    if (h && h.year === c.hy && h.month === c.hm && h.day === c.hd) {
      g2hOk++;
    } else {
      g2hFail++;
      g2hErrors.push(`${c.g}: توقعنا ${c.hy}/${c.hm}/${c.hd} وحصلنا ${h ? [h.year, h.month, h.day].join('/') : 'null'}`);
    }
  }
  check(`ميلادي ← هجري (${cases.gregorianToHijri.length} حالة)`, g2hFail === 0,
    `${g2hOk} ناجح / ${g2hFail} فاشل`);
  g2hErrors.slice(0, 8).forEach(e => console.log('      ' + e));

  // ── ٢) هجري ← ميلادي ──
  let h2gOk = 0, h2gFail = 0;
  const h2gErrors = [];
  for (const c of cases.hijriToGregorian) {
    const g = Hijri.toGregorian(c.hy, c.hm, c.hd);
    const got = g ? `${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, '0')}-${String(g.getDate()).padStart(2, '0')}` : 'null';
    if (got === c.g) h2gOk++;
    else { h2gFail++; h2gErrors.push(`${c.hy}/${c.hm}/${c.hd}: توقعنا ${c.g} وحصلنا ${got}`); }
  }
  check(`هجري ← ميلادي (${cases.hijriToGregorian.length} حالة)`, h2gFail === 0,
    `${h2gOk} ناجح / ${h2gFail} فاشل`);
  h2gErrors.slice(0, 8).forEach(e => console.log('      ' + e));

  // ── ٣) رحلة ذهاب وعودة (٣٦٠ يومًا) ──
  let rtOk = 0, rtFail = 0;
  const rtErrors = [];
  const start = new Date(2026, 0, 1);
  for (let i = 0; i < 360; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const h = Hijri.toHijri(d);
    if (!h) { rtFail++; continue; }
    const back = Hijri.toGregorian(h.year, h.month, h.day);
    if (back &&
        back.getFullYear() === d.getFullYear() &&
        back.getMonth() === d.getMonth() &&
        back.getDate() === d.getDate()) {
      rtOk++;
    } else {
      rtFail++;
      if (rtErrors.length < 5) {
        rtErrors.push(`${d.toDateString()} -> ${h.year}/${h.month}/${h.day} -> ${back ? back.toDateString() : 'null'}`);
      }
    }
  }
  check('رحلة ذهاب وعودة ٣٦٠ يومًا', rtFail === 0, `${rtOk} ناجح / ${rtFail} فاشل`);
  rtErrors.forEach(e => console.log('      ' + e));

  // ── ٤) أيام البيض لثلاثة أشهر ──
  let wdOk = 0, wdFail = 0;
  for (const w of cases.whiteDays) {
    const days = Hijri.whiteDays(w.hy, w.hm);
    const got = days.map(x =>
      `${x.date.getFullYear()}-${String(x.date.getMonth() + 1).padStart(2, '0')}-${String(x.date.getDate()).padStart(2, '0')}`);
    const exp = w.dates;
    if (JSON.stringify(got) === JSON.stringify(exp)) wdOk++;
    else { wdFail++; console.log(`      ${w.hy}/${w.hm}: توقعنا ${exp} وحصلنا ${got}`); }
  }
  check(`أيام البيض (${cases.whiteDays.length} شهرًا)`, wdFail === 0, `${wdOk} ناجح / ${wdFail} فاشل`);

  // ── ٥) منطق الصيام: الإثنين والخميس ──
  const mon = new Date(2026, 8, 28); // 28 سبتمبر 2026 = إثنين
  const thu = new Date(2026, 9, 1);  // 1 أكتوبر 2026 = خميس
  const sun = new Date(2026, 8, 27); // 27 سبتمبر 2026 = أحد
  check('الإثنين يُعرَّف كيوم صيام مستحب',
    Hijri.fastingInfo(mon).reasons.some(r => r.key === 'monday'),
    'يوم الأسبوع=' + Hijri.weekdayName(mon));
  check('الخميس يُعرَّف كيوم صيام مستحب',
    Hijri.fastingInfo(thu).reasons.some(r => r.key === 'thursday'),
    'يوم الأسبوع=' + Hijri.weekdayName(thu));
  check('الأحد ليس يوم صيام اعتيادي',
    !Hijri.fastingInfo(sun).reasons.some(r => r.key === 'monday' || r.key === 'thursday'),
    'يوم الأسبوع=' + Hijri.weekdayName(sun));

  // ── ٦) الأيام القادمة ──
  const upcoming = Hijri.upcomingFastingDays(new Date(2026, 8, 27), 5);
  check('قائمة الأيام القادمة للصيام', upcoming.length === 5, `${upcoming.length} يومًا`);
  const ordered = upcoming.every((u, i) => i === 0 || u.inDays > upcoming[i - 1].inDays);
  check('الأيام القادمة مرتبة زمنيًا', ordered, upcoming.map(u => u.inDays).join(', '));

  // ── ٧) رمضان ──
  const ram = Hijri.ramadanStatus(new Date(2026, 8, 30));
  check('حساب رمضان يعمل', !!ram, ram && ram.inRamadan ? `اليوم ${ram.dayOfRamadan} من رمضان` :
    `باقي ${ram ? ram.daysUntilRamadan : '?'} يومًا`);

  // ── ٨) المناسبات ──
  const occ = Hijri.occasionsForMonth(1448, 9);
  check('مناسبات رمضان موجودة', occ.length >= 2, occ.map(o => o.titleAr).join(' · '));

  // ── التقرير ──
  console.log('='.repeat(74));
  console.log('اختبار محوّل التاريخ الهجري مقابل تقويم أم القرى');
  console.log('='.repeat(74));
  let pass = 0, fail = 0;
  for (const r of results) {
    if (r.ok) { pass++; console.log('  PASS  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
    else { fail++; console.log('  FAIL  ' + r.name + (r.detail ? ' — ' + r.detail : '')); }
  }
  console.log('-'.repeat(74));
  console.log(`النتيجة: ${pass} ناجح / ${fail} فاشل من ${results.length}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('فشل الاختبار:', e); process.exit(1); });
