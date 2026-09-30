// اختبار تشغيلي حقيقي: حساب مواقيت الصلاة والقبلة بحزمة adhan،
// ثم طباعة النتائج للمقارنة مع نتائج محرك Python المتحقق منه بـ AlAdhan.
//
// هذا يثبت أن كود Dart يعمل فعليًا، لا أنه صحيح الصياغة فقط.
import 'package:adhan/adhan.dart';

void main() {
  final cases = <({String city, double lat, double lon, String method})>[
    (city: 'القاهرة', lat: 30.0444, lon: 31.2357, method: 'EGYPT'),
    (city: 'مكة', lat: 21.4225, lon: 39.8262, method: 'UMM_AL_QURA'),
    (city: 'الرياض', lat: 24.7136, lon: 46.6753, method: 'MWL'),
    (city: 'إستانبول', lat: 41.0082, lon: 28.9784, method: 'TURKEY'),
    (city: 'لندن', lat: 51.5074, lon: -0.1278, method: 'MWL'),
  ];

  final methods = {
    'MWL': CalculationMethod.muslim_world_league,
    'EGYPT': CalculationMethod.egyptian,
    'UMM_AL_QURA': CalculationMethod.umm_al_qura,
    'TURKEY': CalculationMethod.turkey,
    'KARACHI': CalculationMethod.karachi,
  };

  print('=== مواقيت الصلاة (ٱنتاج حزمة adhan) ===');
  for (final c in cases) {
    final params = (methods[c.method] ?? CalculationMethod.muslim_world_league).getParameters();
    final t = PrayerTimes(
      Coordinates(c.lat, c.lon),
      DateComponents.from(DateTime(2026, 9, 30)),
      params,
    );
    String f(DateTime d) =>
        '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    print('${c.city} (${c.method}): فجر ${f(t.fajr)} شروق ${f(t.sunrise)} '
        'ظهر ${f(t.dhuhr)} عصر ${f(t.asr)} مغرب ${f(t.maghrib)} عشاء ${f(t.isha)}');
  }

  print('');
  print('=== مذهب العصر: الجمهور مقابل الحنفي (القاهرة) ===');
  for (final hanafi in [false, true]) {
    final params = CalculationMethod.egyptian.getParameters();
    params.madhab = hanafi ? Madhab.hanafi : Madhab.shafi;
    final t = PrayerTimes(
      Coordinates(30.0444, 31.2357),
      DateComponents.from(DateTime(2026, 9, 30)),
      params,
    );
    String f(DateTime d) => '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    print('${hanafi ? "الحنفي" : "الجمهور"}: العصر ${f(t.asr)}');
  }

  print('');
  print('=== اتجاه القبلة ===');
  for (final c in cases) {
    final q = Qibla(Coordinates(c.lat, c.lon));
    print('${c.city}: ${q.direction.toStringAsFixed(4)}°');
  }

  print('');
  print('=== فحص الترتيب الزمني ===');
  var ok = true;
  for (final c in cases) {
    final params = (methods[c.method] ?? CalculationMethod.muslim_world_league).getParameters();
    final t = PrayerTimes(
      Coordinates(c.lat, c.lon),
      DateComponents.from(DateTime(2026, 9, 30)),
      params,
    );
    final order = t.fajr.isBefore(t.sunrise) &&
        t.sunrise.isBefore(t.dhuhr) &&
        t.dhuhr.isBefore(t.asr) &&
        t.asr.isBefore(t.maghrib) &&
        t.maghrib.isBefore(t.isha);
    if (!order) {
      ok = false;
      print('  ✘ ${c.city}: الترتيب الزمني غير صحيح');
    }
  }
  print(ok ? '  ✔ كل المدن: الترتيب الزمني صحيح' : '  ✘ فشل في بعض المدن');
  print('');
  print('DONE');
}
