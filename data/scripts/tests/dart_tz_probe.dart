// تشخيص: هل الفرق كله ناتج عن المنطقة الزمنية أم عن الحساب؟
import 'package:adhan/adhan.dart';

void main() {
  print('المنطقة الزمنية للجهاز: ${DateTime.now().timeZoneName}');
  print('إزاحة الجهاز بالساعات: ${DateTime.now().timeZoneOffset.inMinutes / 60}');
  print('');

  // مكة: إزاحتها الحقيقية UTC+3 دائمًا (لا توقيت صيفي)
  // الجهاز لو في منطقة بتوقيت صيفي، adhan هيحسب بإزاحة الجهاز لا بإزاحة المدينة
  final params = CalculationMethod.umm_al_qura.getParameters();
  final t = PrayerTimes(
    Coordinates(21.4225, 39.8262),
    DateComponents.from(DateTime(2026, 12, 21)),
    params,
  );
  String f(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  print('مكة 2026-12-21 (أم القرى):');
  print('  فجر ${f(t.fajr)} شروق ${f(t.sunrise)} ظهر ${f(t.dhuhr)} عصر ${f(t.asr)} مغرب ${f(t.maghrib)} عشاء ${f(t.isha)}');
  print('  الإزاحة المستخدمة فعليًا: ${t.fajr.timeZoneOffset.inMinutes / 60} ساعة');
  print('');
  print('ملاحظة: المرجع Python استخدم إزاحة ثابتة +3 لمكة.');
  print('لو الجهاز عنده توقيت صيفي، يظهر فرق ساعة كامل - وهذا ليس خطأ في الحساب.');

  // اختبار: هل Qibla تعطي قيمة غير مستقرة قرب الكعبة؟
  print('');
  print('=== القبلة قرب الكعبة (نقطة نقطة رياضية غير معرّفة داخل الكعبة) ===');
  for (final c in [
    (city: 'مكة نفسها (داخل الكعبة)', lat: 21.4225, lon: 39.8262),
    (city: 'جدة (80 كم)', lat: 21.4858, lon: 39.1925),
    (city: 'المدينة (340 كم)', lat: 24.4686, lon: 39.6142),
    (city: 'الرياض (790 كم)', lat: 24.7136, lon: 46.6753),
    (city: 'القاهرة (1287 كم)', lat: 30.0444, lon: 31.2357),
  ]) {
    final q = Qibla(Coordinates(c.lat, c.lon));
    print('  ${c.city}: ${q.direction.toStringAsFixed(4)}°');
  }
}
