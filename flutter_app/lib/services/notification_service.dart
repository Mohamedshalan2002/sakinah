// =====================================================================
// سَكِينَة — خدمة التنبيهات (أذان + تذكير أذكار)
//
// تعمل محليًا بالكامل: كل الجدولة على الجهاز، بلا خادم وبلا دفع خارجي.
//
// ملاحظة مهمة عن الأذونات: على أندرويد 13+ يحتاج POST_NOTIFICATIONS،
// وعلى 12+ يحتاج SCHEDULE_EXACT_ALARM للتنبيهات الدقيقة. هذه الأذونات
// معلنة في AndroidManifest.xml، ويُطلب من المستخدم عند التفعيل.
// =====================================================================
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../data_repository.dart';
import '../local_store.dart';
import '../prayer_service.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static LocalStore? _store;

  /// معرّفات ثابتة للتنبيهات (نُلغي ثم نعيد الجدولة عند كل تحديث)
  static const _idAzanBase = 1000;
  static const _idAzkarMorning = 2001;
  static const _idAzkarEvening = 2002;

  static Future<void> init(LocalStore store) async {
    _store = store;

    tzdata.initializeTimeZones();
    // نستخدم توقيت الجهاز المحلي (يتعامل مع التوقيت الصيفي)
    try {
      tz.setLocalLocation(tz.getLocation(DateTime.now().timeZoneName));
    } catch (_) {
      // إن فشل التعرف على الاسم، نكمل بتوقيت UTC ولا نُسقط التطبيق
    }

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: (_) {},
    );
  }

  /// طلب إذن الإشعارات (يُنادى عند تفعيل المستخدم للتنبيهات).
  static Future<bool> requestPermission() async {
    if (Platform.isAndroid) {
      final impl = _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >();
      final granted = await impl?.requestNotificationsPermission();
      return granted ?? false;
    }
    if (Platform.isIOS) {
      final impl = _plugin
          .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin
          >();
      final granted = await impl?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
      return granted ?? false;
    }
    return false;
  }

  static const _channelAzan = AndroidNotificationDetails(
    'sakinah_azan',
    'تنبيه الأذان',
    channelDescription: 'تنبيه عند دخول وقت الصلاة',
    importance: Importance.high,
    priority: Priority.high,
    category: AndroidNotificationCategory.alarm,
  );

  static const _channelAzkar = AndroidNotificationDetails(
    'sakinah_azkar',
    'تذكير الأذكار',
    channelDescription: 'تذكير أذكار الصباح والمساء',
    importance: Importance.defaultImportance,
    priority: Priority.defaultPriority,
  );

  /// جدولة تنبيهات اليوم كاملًا: الأذان + تذكيرات الأذكار.
  ///
  /// تُستدعى عند: تفعيل التنبيهات، تغيير الموقع أو الطريقة، وعند إعادة فتح
  /// التطبيق (لضمان استمرار التنبيهات بعد إعادة تشغيل الجهاز).
  static Future<void> scheduleAll({
    required LocalStore store,
    required DataRepository repo,
  }) async {
    await cancelAll();
    final n = store.notifications;
    if (!n.enabled) return;

    final loc = store.location;
    if (loc != null && n.azan) {
      final times = PrayerService.compute(
        latitude: loc.lat,
        longitude: loc.lon,
        date: DateTime.now(),
        method: store.method,
        asrHanafi: store.asrHanafi,
      );
      final strings = PrayerService.asStrings(times);
      const keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      for (var i = 0; i < keys.length; i++) {
        final hhmm = strings[keys[i]];
        if (hhmm == null) continue;
        final parts = hhmm.split(':');
        final at = _todayAt(int.parse(parts[0]), int.parse(parts[1]));
        if (at.isBefore(DateTime.now())) continue;
        await _schedule(
          _idAzanBase + i,
          'حان وقت ${PrayerService.prayerNamesAr[keys[i]]}',
          'الله أكبر',
          at,
          _channelAzan,
        );
      }
    }

    if (n.morning) {
      await _schedule(
        _idAzkarMorning,
        'أذكار الصباح',
        'ابدأ يومك بالذكر',
        _todayAtFromString(n.morningTime),
        _channelAzkar,
      );
    }
    if (n.evening) {
      await _schedule(
        _idAzkarEvening,
        'أذكار المساء',
        'اختم يومك بالذكر',
        _todayAtFromString(n.eveningTime),
        _channelAzkar,
      );
    }
  }

  static DateTime _todayAt(int h, int m) {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, h, m);
  }

  static DateTime _todayAtFromString(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length != 2) return _todayAt(6, 30);
    final h = int.tryParse(parts[0]) ?? 6;
    final m = int.tryParse(parts[1]) ?? 30;
    var at = _todayAt(h, m);
    if (at.isBefore(DateTime.now())) at = at.add(const Duration(days: 1));
    return at;
  }

  static Future<void> _schedule(
    int id,
    String title,
    String body,
    DateTime when,
    AndroidNotificationDetails channel,
  ) async {
    try {
      await _plugin.zonedSchedule(
        id,
        title,
        body,
        tz.TZDateTime.from(when, tz.local),
        NotificationDetails(android: channel),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      );
    } catch (e) {
      debugPrint('تعذّر جدولة التنبيه $id: $e');
    }
  }

  static Future<void> cancelAll() => _plugin.cancelAll();

  /// اختبار فوري للتنبيه (يُستخدم من شاشة الإعدادات للتأكد أن الإذن يعمل).
  static Future<void> showNow(String title, String body) async {
    await _plugin.show(
      9999,
      title,
      body,
      const NotificationDetails(android: _channelAzkar),
    );
  }
}
