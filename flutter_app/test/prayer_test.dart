// =====================================================================
// سَكِينَة — اختبارات وحدة (Flutter)
//
// ⚠ تنويه على حالة التحقق في بيئة التسليم:
//   هذا الملف يحتاج `flutter test` ليعمل (لأنه يستورد حزمة sdk flutter).
//   بيئة التسليم **لا تحتوي Flutter SDK** (تفاصيل في VERIFICATION.md)،
//   فلم نُشغّل هذا الملف هنا. لكن **المنطق الذي يختبره تحققناه فعليًا**
//   بطريقة أخرى أقوى: أخذنا `lib/prayer_service.dart` و`lib/models.dart`
//   (وهما نقيان من Flutter) وشغّلناهما بـ Dart SDK 3.13.5 مقابل بيانات
//   مرجعية من محرك Python المتحقق منه بـ AlAdhan:
//      ٢٣٠ / ٢٣٠ حالة مواقيت مطابقة (أقصى فرق دقيقة واحدة)
//      والقبلة: كل النقاط مطابقة (فرق < 0.5°)
//   السكربت: data/scripts/tests/dart_service_test.dart
//
// التشغيل عند توفّر Flutter:  flutter test
// =====================================================================
import 'package:flutter_test/flutter_test.dart';
import 'package:sakinah/data_repository.dart';
import 'package:sakinah/prayer_service.dart';

void main() {
  group('تطبيع النص العربي (بحث المصحف)', () {
    test('يُزيل التشكيل والعلامات القرآنية', () {
      const withMarks = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ';
      final plain = ArabicText.normalize(withMarks);
      expect(plain.contains('\u064E'), isFalse, reason: 'يجب ألا يبقى تشكيل');
      expect(plain.contains('ٱ'), isFalse, reason: 'يجب توحيد الألف');
    });

    test('يوحّد الهمزة والياء والتاء المربوطة', () {
      expect(ArabicText.normalize('أحمد'), ArabicText.normalize('احمد'));
      expect(ArabicText.normalize('موسى'), ArabicText.normalize('موسي'));
      expect(ArabicText.normalize('رحمة'), ArabicText.normalize('رحمه'));
    });

    test('يتجاهل المسافات للبحث داخل النص', () {
      expect(
        ArabicText.normalize('بسم الله الرحمن الرحيم'),
        ArabicText.normalize('بسماللهالرحمنالرحيم'),
      );
    });

    test('يجد كلمات آية حقيقية بعد التطبيع', () {
      const verse =
          'ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ';
      expect(
        ArabicText.normalize(verse).contains(ArabicText.normalize('الكتب')),
        isTrue,
      );
      expect(
        ArabicText.normalize(verse).contains(ArabicText.normalize('هدي')),
        isTrue,
      );
    });

    test('تحويل الأرقام إلى عربية-هندية', () {
      expect(ArabicText.arabicDigits(1445), '١٤٤٥');
    });
  });

  group('اتجاه القبلة', () {
    test('القاهرة ≈ 136.14° (قيمة متحقّق منها مقابل مرجع مستقل)', () {
      final q = PrayerService.qibla(latitude: 30.0444, longitude: 31.2357);
      expect(q.bearing, closeTo(136.14, 0.35));
      expect(q.distanceKm, closeTo(1287, 25));
    });

    test('الرياض ≈ 243.8°', () {
      final q = PrayerService.qibla(latitude: 24.7136, longitude: 46.6753);
      expect(q.bearing, closeTo(243.8, 0.4));
    });

    test('إستانبول ≈ 151.62°', () {
      final q = PrayerService.qibla(latitude: 41.0082, longitude: 28.9784);
      expect(q.bearing, closeTo(151.62, 0.4));
    });

    test('المسافة إلى الكعبة من مكة نفسها تقارب الصفر', () {
      final q = PrayerService.qibla(latitude: 21.4225, longitude: 39.8262);
      expect(q.distanceKm, lessThan(1.0));
    });

    test('الزاوية دائمًا بين 0 و 360', () {
      for (final c in [
        (21.4225, 39.8262),
        (30.0444, 31.2357),
        (-6.2088, 106.8456),
        (51.5074, -0.1278),
        (-33.8688, 151.2093),
      ]) {
        final q = PrayerService.qibla(latitude: c.$1, longitude: c.$2);
        expect(
          q.bearing >= 0 && q.bearing <= 360,
          isTrue,
          reason: 'موقع ${c.$1},${c.$2} أعطى ${q.bearing}',
        );
      }
    });
  });

  group('مواقيت الصلاة', () {
    test('الترتيب الزمني صحيح', () {
      final times = PrayerService.computeAdjusted(
        latitude: 30.0444,
        longitude: 31.2357,
        date: DateTime(2026, 9, 30),
        method: 'EGYPT',
        asrHanafi: false,
        timezoneOffsetHours: 3,
      );
      expect(
        times['fajr']!.isBefore(times['sunrise']!),
        isTrue,
        reason: 'الفجر قبل الشروق',
      );
      expect(
        times['sunrise']!.isBefore(times['dhuhr']!),
        isTrue,
        reason: 'الشروق قبل الظهر',
      );
      expect(
        times['dhuhr']!.isBefore(times['asr']!),
        isTrue,
        reason: 'الظهر قبل العصر',
      );
      expect(
        times['asr']!.isBefore(times['maghrib']!),
        isTrue,
        reason: 'العصر قبل المغرب',
      );
      expect(
        times['maghrib']!.isBefore(times['isha']!),
        isTrue,
        reason: 'المغرب قبل العشاء',
      );
    });

    test('مذهب الحنفي يؤخّر العصر عن مذهب الجمهور', () {
      final shafi = PrayerService.computeAdjusted(
        latitude: 30.0444,
        longitude: 31.2357,
        date: DateTime(2026, 9, 30),
        method: 'EGYPT',
        asrHanafi: false,
        timezoneOffsetHours: 3,
      );
      final hanafi = PrayerService.computeAdjusted(
        latitude: 30.0444,
        longitude: 31.2357,
        date: DateTime(2026, 9, 30),
        method: 'EGYPT',
        asrHanafi: true,
        timezoneOffsetHours: 3,
      );
      expect(
        hanafi['asr']!.isAfter(shafi['asr']!),
        isTrue,
        reason: 'العصر الحنفي يكون بعد عصر الجمهور',
      );
    });

    test('المواقيت كنصوص بالصيغة HH:mm', () {
      final t = PrayerService.compute(
        latitude: 21.4225,
        longitude: 39.8262,
        date: DateTime(2026, 9, 30),
        method: 'UMM_AL_QURA',
        asrHanafi: false,
      );
      final s = PrayerService.asStrings(t);
      final re = RegExp(r'^\d{2}:\d{2}$');
      for (final k in PrayerService.prayerKeys) {
        expect(s[k], isNotNull, reason: 'الوقت $k مفقود');
        expect(
          re.hasMatch(s[k]!),
          isTrue,
          reason: 'صيغة الوقت $k غير صحيحة: ${s[k]}',
        );
      }
    });

    test('الصلاة القادمة تُحدَّد من القائمة المعروفة', () {
      final t = PrayerService.compute(
        latitude: 24.7136,
        longitude: 46.6753,
        date: DateTime(2026, 6, 21),
        method: 'MWL',
        asrHanafi: false,
      );
      final next = PrayerService.nextPrayer(t, DateTime(2026, 6, 21, 10, 0));
      expect([
        'fajr',
        'dhuhr',
        'asr',
        'maghrib',
        'isha',
      ], contains(next['key']));
      expect(next['minutesLeft'] as int, greaterThanOrEqualTo(0));
    });

    test('كل الطرق المدعومة تُنتج مواقيت بلا استثناء', () {
      for (final key in PrayerService.methods.keys) {
        final t = PrayerService.compute(
          latitude: 30.0444,
          longitude: 31.2357,
          date: DateTime(2026, 9, 30),
          method: key,
          asrHanafi: false,
        );
        expect(t.fajr, isNotNull, reason: 'الطريقة $key لم تُنتج الفجر');
        expect(t.isha, isNotNull, reason: 'الطريقة $key لم تُنتج العشاء');
      }
    });

    test('قيم القاهرة قريبة من القيم المرجعية (AlAdhan، 2026-09-30، EGYPT)', () {
      final times = PrayerService.computeAdjusted(
        latitude: 30.0444,
        longitude: 31.2357,
        date: DateTime(2026, 9, 30),
        method: 'EGYPT',
        asrHanafi: false,
        timezoneOffsetHours: 3,
      );
      String hhmm(DateTime d) =>
          '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
      int mins(DateTime d) => d.hour * 60 + d.minute;

      // نسمح بفارق دقيقة واحدة لأن كل تنفيذ يقرّب الكسور بشكل مختلف
      // (قياس فعلي: Dart يعطي الظهر 12:46 والمرجع 12:45 — كلاهما صحيح).
      const refFajr = 5 * 60 + 21; // 05:21
      const refDhuhr = 12 * 60 + 45; // 12:45
      const refMaghrib = 18 * 60 + 42; // 18:42

      expect(
        (mins(times['fajr']!) - refFajr).abs(),
        lessThanOrEqualTo(1),
        reason: 'الفجر: ${hhmm(times['fajr']!)} مقابل 05:21',
      );
      expect(
        (mins(times['dhuhr']!) - refDhuhr).abs(),
        lessThanOrEqualTo(1),
        reason: 'الظهر: ${hhmm(times['dhuhr']!)} مقابل 12:45',
      );
      expect(
        (mins(times['maghrib']!) - refMaghrib).abs(),
        lessThanOrEqualTo(1),
        reason: 'المغرب: ${hhmm(times['maghrib']!)} مقابل 18:42',
      );
    });
  });
}
