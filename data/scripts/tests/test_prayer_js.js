/* اختبار محرك المواقيت والقبلة في JavaScript مقابل نتائج Python المتحقق منها.
   يُشغّل بمحرك Node بلا متصفح: نُهيّئ كائن window وهميًا ونحمّل prayer.js. */
'use strict';
const fs = require('fs');
const path = require('path');

// ── بيئة وهمية بسيطة ──
global.window = global;
const PRAYER_JS = path.join(__dirname, '..', '..', '..', 'web', 'js', 'prayer.js');
const code = fs.readFileSync(PRAYER_JS, 'utf8');
const factory = new Function('window', code + '\nreturn window.Prayer;');
const Prayer = factory(global);

if (!Prayer) { console.error('FAIL: لم يُصدَّر Prayer'); process.exit(1); }

// ── نتائج مرجعية من محرك Python المتحقق منه (verify_prayer.py، AlAdhan) ──
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'js_cases.json'), 'utf8'));

let pass = 0, fail = 0;
const details = [];

for (const c of cases) {
  const on = new Date(c.date + 'T12:00:00');
  const r = Prayer.computeTimes(c.lat, c.lon, on, c.method, c.madhab, c.tz);
  const got = r.times;
  let worst = 0;
  const diffs = {};
  for (const k of Object.keys(c.expect)) {
    const a = got[k], b = c.expect[k];
    if (a === null || a === undefined) { diffs[k] = 'null'; worst = 99; continue; }
    const ma = Prayer.minutesOf(a), mb = Prayer.minutesOf(b);
    let d = ma - mb;
    while (d > 720) d -= 1440;
    while (d < -720) d += 1440;
    diffs[k] = d;
    worst = Math.max(worst, Math.abs(d));
  }
  const ok = worst <= 3;
  if (ok) pass++; else fail++;
  details.push({ case: `${c.city} ${c.date} ${c.method} madhab=${c.madhab}`, worst, diffs, got, expect: c.expect, ok });
}

console.log('=== اختبار محرك المواقيت JS مقابل Python (المتحقق منه بـ AlAdhan) ===');
console.log(`عدد الحالات: ${cases.length} | ناجحة (≤3 د): ${pass} | فاشلة: ${fail}`);
const bad = details.filter(d => !d.ok);
if (bad.length) {
  console.log('\n--- حالات فاشلة ---');
  bad.slice(0, 12).forEach(d => {
    console.log('  ' + d.case + '  worst=' + d.worst);
    console.log('     لنا(JS): ' + JSON.stringify(d.got));
    console.log('     Python  : ' + JSON.stringify(d.expect));
    console.log('     فروق    : ' + JSON.stringify(d.diffs));
  });
} else {
  console.log('كل الحالات داخل 3 دقائق. ✔');
}

// ── اختبار القبلة ──
console.log('\n=== اختبار القبلة ===');
const qiblaCases = cases.filter(c => c.qibla !== undefined);
let qfail = 0;
for (const c of qiblaCases) {
  const q = Prayer.qiblaDirection(c.lat, c.lon);
  const d = Math.abs(q.bearing - c.qibla);
  const ok = d < 0.05;
  if (!ok) qfail++;
  console.log(`  ${c.city}: JS=${q.bearing} Python=${c.qibla} فرق=${d.toFixed(4)}° ${ok ? '✔' : '✘'}`);
}
console.log(qfail ? `فشل ${qfail}` : 'كل القبلة مطابقة ✔');

process.exit(fail || qfail ? 1 : 0);
