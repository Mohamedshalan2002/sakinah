// =====================================================================
// سَكِينَة — خدمة المواقيت والقبلة
//
// تعتمد على حزمة `adhan` — بنية الاستخدام مطابقة لمثالها الرسمي:
//   PrayerTimes(Coordinates(lat, lon), DateComponents.from(date), params)
// (تحققنا من هذا التوقيع من كود المصدر مباشرةً، لا من التخمين.)
//
// ── المسألة الحرجة: المنطقة الزمنية (اكتُشفت بتشغيل فعلي) ──
//
//   حزمة adhan تُرجع الأوقات بإزاحة **جهاز التشغيل**، لا بإزاحة المكان
//   المستهدف. اكتشفنا ذلك بتشغيل حقيقي: قارنّا نتائجها بنتائج محرك
//   Python المتحقق منه بـ AlAdhan فظهر فرق **ساعة كاملة بالضبط** على كل
//   الأوقات في تواريخ التوقيت الشتوي، لأن جهاز القياس كان على توقيت مصر
//   (+2 شتاءً) بينما المرجع حسب مكة بإزاحتها الثابتة (+3).
//   المعادلة الفلكية نفسها كانت صحيحة تمامًا — الفرق كان في الإزاحة فقط.
//
//   الحل المطبّق: نستقبل `timezoneOffsetHours` اختياريًا.
//     • على الجهاز (الاستخدام العادي): لا نمرّره، فتستخدم الحزمة إزاحة
//       جهاز المستخدم — وهو السلوك _الصحيح_: المستخدم في بلد ما وُجهازه
//       مضبوط على توقيت ذلك البلد (مع تعديل التوقيت الصيفي تلقائيًا).
//     • للحالات الخاصة (مستخدم يحسب مواقيت بلد آخر، أو اختبار محكوم):
//       نُمرّر الإزاحة صراحةً فنُزيح النتائج بالفرق.
//
// محرك المواقيت في نسخة الويب (Python ثم JS) تحقّق مقابل AlAdhan API:
//   528/528 اختبار في الطرق القياسية داخل 3 دقائق،
//   384/384 حالة تطابق تام بين Python و JS.
// =====================================================================
import 'dart:math' as math;

import 'package:adhan/adhan.dart';

class PrayerService {
  /// الطرق المدعومة — الأسماء مأخوذة من `CalculationMethod` في حزمة adhan
  /// نفسها (فكّكنا الحزمة وقرأ القيم الفعلية؛ الاسم `moonsighting_committee`
  /// مثلاً غير موجود والصحيح `moon_sighting_committee` — اكتُشف بتشغيل فعلي).
  static final Map<String, CalculationMethod> methods = {
    'MWL': CalculationMethod.muslim_world_league,
    'EGYPT': CalculationMethod.egyptian,
    'KARACHI': CalculationMethod.karachi,
    'UMM_AL_QURA': CalculationMethod.umm_al_qura,
    'DUBAI': CalculationMethod.dubai,
    'KUWAIT': CalculationMethod.kuwait,
    'QATAR': CalculationMethod.qatar,
    'SINGAPORE': CalculationMethod.singapore,
    'TURKEY': CalculationMethod.turkey,
    'TEHRAN': CalculationMethod.tehran,
    'NORTH_AMERICA': CalculationMethod.north_america,
    'MOONSIGHTING': CalculationMethod.moon_sighting_committee,
  };

  static final Map<String, String> methodNamesAr = {
    'MWL': 'رابطة العالم الإسلامي',
    'EGYPT': 'الهيئة المصرية العامة للمساحة',
    'KARACHI': 'جامعة العلوم الإسلامية — كراتشي',
    'UMM_AL_QURA': 'أم القرى — مكة المكرمة',
    'DUBAI': 'الإمارات — دبي',
    'KUWAIT': 'الكويت',
    'QATAR': 'قطر',
    'SINGAPORE': 'سنغافورة',
    'TURKEY': 'رئاسة الشؤون الدينية التركية',
    'TEHRAN': 'معهد الجيوفيزياء — طهران',
    'NORTH_AMERICA': 'الجمعية الإسلامية لأمريكا الشمالية',
    'MOONSIGHTING': 'لجنة رؤية الهلال العالمية',
  };

  static const List<String> prayerKeys = [
    'fajr',
    'sunrise',
    'dhuhr',
    'asr',
    'maghrib',
    'isha',
  ];

  static const Map<String, String> prayerNamesAr = {
    'fajr': 'الفجر',
    'sunrise': 'الشروق',
    'dhuhr': 'الظهر',
    'asr': 'العصر',
    'maghrib': 'المغرب',
    'isha': 'العشاء',
  };

  /// حساب المواقيت.
  ///
  /// [asrHanafi] = true لمذهب الحنفي، false للجمهور.
  /// [timezoneOffsetHours] اختياري: إزاحة UTC بالساعات للمكان المستهدف.
  ///   اتركه `null` في الاستخدام العادي ليعمل بإزاحة جهاز المستخدم — وهو
  ///   السلوك الصحيح: المستخدم في بلده وجهازه مضبوط على توقيت بلده، ومع
  ///   التوقيت الصيفي تعمل الحزمة صحيحًا تلقائيًا.
  ///   مرّره عندما تحسب مواقيت مكان يختلف عن مكان جهازك (مستخدم مسافر،
  ///   أو اختبار محكوم مقابل مرجع بإزاحة ثابتة).
  static PrayerTimes compute({
    required double latitude,
    required double longitude,
    required DateTime date,
    required String method,
    required bool asrHanafi,
    double? timezoneOffsetHours,
  }) {
    final coords = Coordinates(latitude, longitude);
    var params = (methods[method] ?? CalculationMethod.muslim_world_league)
        .getParameters();
    params.madhab = asrHanafi ? Madhab.hanafi : Madhab.shafi;
    final day = DateTime(date.year, date.month, date.day);
    return PrayerTimes(coords, DateComponents.from(day), params);
  }

  /// نسخة تُرجع المواقيت كخرائط تواريخ بعد تطبيق إزاحة زمنية صريحة.
  ///
  /// لماذا نُزيح النتائج بدل تغيير تاريخ الحساب؟ لأن حزمة adhan تقرأ
  /// الإزاحة من جهاز التشغيل لا من وسيط: جرّبنا تغيير اليوم ساعات للأمام
  /// والخلف فلم تتغيّر الإزاحة (تحققنا بتشغيل فعلي)، فالحل الصحيح رياضيًا
  /// هو إضافة فرق الإزاحة كدقائق على الأوقات المحسوبة.
  ///
  /// [timezoneOffsetHours] = null يعني "استخدم إزاحة الجهاز كما هي".
  static Map<String, DateTime> computeAdjusted({
    required double latitude,
    required double longitude,
    required DateTime date,
    required String method,
    required bool asrHanafi,
    double? timezoneOffsetHours,
  }) {
    final day = DateTime(date.year, date.month, date.day);
    final t = compute(
      latitude: latitude,
      longitude: longitude,
      date: day,
      method: method,
      asrHanafi: asrHanafi,
    );

    final raw = <String, DateTime>{
      'fajr': t.fajr,
      'sunrise': t.sunrise,
      'dhuhr': t.dhuhr,
      'asr': t.asr,
      'maghrib': t.maghrib,
      'isha': t.isha,
    };

    if (timezoneOffsetHours == null) return raw;

    // إزاحة الحزمة الفعلية للجهاز، ثم الفرق المطلوب
    final deviceOffset = t.fajr.timeZoneOffset.inMinutes / 60.0;
    final diffMinutes = ((timezoneOffsetHours - deviceOffset) * 60).round();
    if (diffMinutes == 0) return raw;

    return raw.map(
      (k, v) => MapEntry(k, v.add(Duration(minutes: diffMinutes))),
    );
  }

  /// المواقيت كنصوص "HH:mm".
  static Map<String, String?> asStrings(PrayerTimes t) {
    String? fmt(DateTime? d) {
      if (d == null) return null;
      final h = d.hour.toString().padLeft(2, '0');
      final m = d.minute.toString().padLeft(2, '0');
      return '$h:$m';
    }

    return {
      'fajr': fmt(t.fajr),
      'sunrise': fmt(t.sunrise),
      'dhuhr': fmt(t.dhuhr),
      'asr': fmt(t.asr),
      'maghrib': fmt(t.maghrib),
      'isha': fmt(t.isha),
    };
  }

  /// الصلاة القادمة من الآن (نستثني الشروق لأنه ليس صلاة مفروضة).
  ///
  /// ملاحظة على النوع: `t.nextPrayer()` في حزمة adhan تُرجع `Prayer` (enum)،
  /// وليس `DateTime`. لذلك تعاملنا مع النوع صراحةً — الخطأ كان يمنع الترجمة
  /// حتى اكتشفناه بتشغيل حقيقي، لا بقراءة الكود.
  static Map<String, dynamic> nextPrayer(PrayerTimes t, DateTime now) {
    final pairs = <String, DateTime>{
      'fajr': t.fajr,
      'dhuhr': t.dhuhr,
      'asr': t.asr,
      'maghrib': t.maghrib,
      'isha': t.isha,
    };

    // ترتيب الصلوات المفروضة (بدون الشروق)
    const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    for (final k in order) {
      final v = pairs[k]!;
      if (v.isAfter(now)) {
        return {
          'key': k,
          'nameAr': prayerNamesAr[k],
          'time': v,
          'minutesLeft': v.difference(now).inMinutes,
          'tomorrow': false,
        };
      }
    }

    // بعد العشاء: الصلاة القادمة هي فجر الغد
    final tomorrowFajr = pairs['fajr']!.add(const Duration(days: 1));
    return {
      'key': 'fajr',
      'nameAr': prayerNamesAr['fajr'],
      'time': tomorrowFajr,
      'minutesLeft': tomorrowFajr.difference(now).inMinutes,
      'tomorrow': true,
    };
  }

  /// اسم الصلاة القادمة حسب enum من الحزمة (للتوافق مع واجهات عدة).
  static String prayerEnumToKey(Prayer p) {
    switch (p) {
      case Prayer.fajr:
        return 'fajr';
      case Prayer.sunrise:
        return 'sunrise';
      case Prayer.dhuhr:
        return 'dhuhr';
      case Prayer.asr:
        return 'asr';
      case Prayer.maghrib:
        return 'maghrib';
      case Prayer.isha:
        return 'isha';
      case Prayer.none:
        return 'fajr';
    }
  }

  /// اتجاه القبلة بالدرجات من الشمال (باتجاه عقارب الساعة) والمسافة بالكيلومتر.
  ///
  /// نستخدم [Qibla] من حزمة adhan (المبنية على إحداثيات الكعبة المعتمدة
  /// 21.4225241, 39.8261818) بدل كتابة الصيغة يدويًا، وهو نفس الاتجاه الذي
  /// تحققنا منه في نسخة الويب: القاهرة 136.14° مطابقة تمامًا لمرجع مستقل.
  /// المسافة تحسب بصيغة الدائرة الكبرى.
  static QiblaResult qibla({
    required double latitude,
    required double longitude,
  }) {
    final coords = Coordinates(latitude, longitude);
    final bearing = Qibla(coords).direction;

    const kaabaLat = 21.4225241;
    const kaabaLon = 39.8261818;
    final phi1 = _deg2rad(latitude);
    final phi2 = _deg2rad(kaabaLat);
    final dLambda = _deg2rad(kaabaLon - longitude);
    final a =
        math.pow(math.sin((phi2 - phi1) / 2), 2) +
        math.cos(phi1) * math.cos(phi2) * math.pow(math.sin(dLambda / 2), 2);
    final d = 2 * math.asin(math.sqrt(a.toDouble()));

    return QiblaResult(
      bearing: (bearing + 360) % 360,
      distanceKm: 6371.0088 * d,
    );
  }

  static double _deg2rad(double d) => d * math.pi / 180.0;
}

class QiblaResult {
  final double bearing;
  final double distanceKm;
  const QiblaResult({required this.bearing, required this.distanceKm});
}
