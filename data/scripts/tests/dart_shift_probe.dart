// تشخيص دقيق لطريقة الإزاحة الزمنية.
import 'package:adhan/adhan.dart';

void main() {
  final params = CalculationMethod.umm_al_qura.getParameters();
  final coords = Coordinates(21.4225, 39.8262); // مكة

  String f(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  print('إزاحة جهاز التشغيل الآن: ${DateTime.now().timeZoneOffset.inMinutes / 60} س');
  print('إزاحة تاريخ 2026-12-21 على الجهاز: '
      '${DateTime(2026, 12, 21).timeZoneOffset.inMinutes / 60} س');
  print('');

  // الأساس: بدون أي إزاحة
  final base = PrayerTimes(coords, DateComponents.from(DateTime(2026, 12, 21)), params);
  print('بدون إزاحة:');
  print('  فجر ${f(base.fajr)} شروق ${f(base.sunrise)} ظهر ${f(base.dhuhr)} '
      'مغرب ${f(base.maghrib)} عشاء ${f(base.isha)}');
  print('  offset في الكائن: ${base.fajr.timeZoneOffset.inMinutes / 60} س');
  print('');

  // المرجع: مكة +3، والقيمة المتوقعة من Python هي فجر 05:32 شروق 06:54
  print('المتوقع (Python بإزاحة مكة +3): فجر 05:32 شروق 06:54');
  print('');

  // نجرّب عدة طرق للإزاحة
  for (final shift in [-3, -2, -1, 0, 1, 2, 3]) {
    final d = DateTime(2026, 12, 21).subtract(Duration(hours: shift));
    final t = PrayerTimes(coords, DateComponents.from(d), params);
    print('  طرح $shift ساعة من التاريخ: فجر ${f(t.fajr)} شروق ${f(t.sunrise)}');
  }
  print('');
  for (final shift in [-3, -2, -1, 0, 1, 2, 3]) {
    final d = DateTime(2026, 12, 21).add(Duration(hours: shift));
    final t = PrayerTimes(coords, DateComponents.from(d), params);
    print('  إضافة $shift ساعة للتاريخ: فجر ${f(t.fajr)} شروق ${f(t.sunrise)}');
  }
}
