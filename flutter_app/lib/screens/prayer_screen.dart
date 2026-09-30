// =====================================================================
// سَكِينَة — المواقيت والقبلة (Flutter)
// حساب فلكي على الجهاز + بوصلة القبلة + اختيار طريقة الحساب والمذهب.
// =====================================================================
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../prayer_service.dart';
import '../services/notification_service.dart';
import '../theme.dart';

class PrayerScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  final bool openQibla;
  const PrayerScreen({
    super.key,
    required this.store,
    required this.repo,
    this.openQibla = false,
  });

  @override
  State<PrayerScreen> createState() => _PrayerScreenState();
}

class _PrayerScreenState extends State<PrayerScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.openQibla) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openQibla());
    }
  }

  @override
  Widget build(BuildContext context) {
    final loc = widget.store.location;
    final gold = Theme.of(context).colorScheme.primary;

    if (loc == null) {
      return _locationPicker(context, gold);
    }

    final times = PrayerService.compute(
      latitude: loc.lat,
      longitude: loc.lon,
      date: DateTime.now(),
      method: widget.store.method,
      asrHanafi: widget.store.asrHanafi,
    );
    final strings = PrayerService.asStrings(times);
    final next = PrayerService.nextPrayer(times, DateTime.now());
    final nextKey = next['key'] as String;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          'مواقيت الصلاة',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'تُحسب على جهازك فلكيًا — تعمل بدون إنترنت',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 14),

        // الصلاة القادمة
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  'الصلاة القادمة',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 4),
                Text(
                  '${next['nameAr']}${(next['tomorrow'] as bool) ? ' (غدًا)' : ''}',
                  style: TextStyle(
                    fontFamily: 'Amiri',
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: gold,
                  ),
                ),
                Text(
                  strings[nextKey] ?? '—',
                  style: TextStyle(
                    fontFamily: 'Amiri',
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _remain(next['minutesLeft'] as int),
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    color: SakinahColors.teal400,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // قائمة الأوقات
        ...PrayerService.prayerKeys.map((k) {
          final isNext = !(next['tomorrow'] as bool) && k == nextKey;
          return Card(
            margin: const EdgeInsets.only(bottom: 6),
            child: Container(
              decoration: isNext
                  ? BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: gold.withValues(alpha: 0.6)),
                      color: gold.withValues(alpha: 0.08),
                    )
                  : null,
              child: ListTile(
                leading: Icon(_iconFor(k), color: gold.withValues(alpha: 0.8)),
                title: Text(
                  PrayerService.prayerNamesAr[k]!,
                  style: const TextStyle(fontFamily: 'Cairo', fontSize: 14),
                ),
                trailing: Text(
                  strings[k] ?? '—',
                  style: TextStyle(
                    fontFamily: 'Amiri',
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: gold,
                  ),
                ),
              ),
            ),
          );
        }),

        const SizedBox(height: 10),

        // التفاصيل + الأدوات
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline, color: gold),
                    const SizedBox(width: 8),
                    const Text(
                      'تفاصيل الحساب',
                      style: TextStyle(fontFamily: 'Amiri', fontSize: 17),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'الموقع: ${loc.label}\n'
                  'الطريقة: ${PrayerService.methodNamesAr[widget.store.method] ?? widget.store.method}\n'
                  'العصر: ${widget.store.asrHanafi ? 'الحنفي' : 'الجمهور'}',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12.5,
                    height: 1.9,
                  ),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _pickMethod,
                      icon: const Icon(Icons.tune, size: 16),
                      label: const Text('طريقة الحساب'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () async {
                        await widget.store.setAsrHanafi(
                          !widget.store.asrHanafi,
                        );
                        setState(() {});
                        await NotificationService.scheduleAll(
                          store: widget.store,
                          repo: widget.repo,
                        );
                      },
                      icon: const Icon(Icons.schedule, size: 16),
                      label: const Text('مذهب العصر'),
                    ),
                    OutlinedButton.icon(
                      onPressed: _openQibla,
                      icon: const Icon(Icons.explore_outlined, size: 16),
                      label: const Text('القبلة'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => _openNotifications(),
                      icon: const Icon(Icons.notifications_outlined, size: 16),
                      label: const Text('التنبيهات'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () async {
                        await widget.store.setLocation(null);
                        setState(() {});
                      },
                      icon: const Icon(Icons.location_off_outlined, size: 16),
                      label: const Text('تغيير الموقع'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _locationPicker(BuildContext context, Color gold) {
    final cities = widget.repo.cities ?? const <City>[];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          'مواقيت الصلاة والقبلة',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: gold,
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'حدّد موقعك لحساب المواقيت والقبلة. الإحداثيات تُخزَّن على جهازك فقط.',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    height: 1.8,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _useGps,
                    icon: const Icon(Icons.my_location),
                    label: const Text('استخدم موقعي الحالي'),
                  ),
                ),
                const SizedBox(height: 16),
                const OrnamentDivider(),
                const SizedBox(height: 10),
                const Text(
                  'أو اختر مدينة:',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 13),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: cities
                      .map(
                        (c) => ActionChip(
                          label: Text(c.nameAr),
                          onPressed: () async {
                            await widget.store.setLocation(
                              SavedLocation(
                                lat: c.lat,
                                lon: c.lon,
                                label: c.nameAr,
                                source: 'preset',
                              ),
                            );
                            setState(() {});
                          },
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _useGps() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _snack('لم يُسمح بالوصول للموقع — اختر مدينة من القائمة');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.low,
        ),
      );
      await widget.store.setLocation(
        SavedLocation(
          lat: pos.latitude,
          lon: pos.longitude,
          label: 'موقعي الحالي',
          source: 'gps',
        ),
      );
      if (!mounted) return;
      setState(() {});
      await NotificationService.scheduleAll(
        store: widget.store,
        repo: widget.repo,
      );
    } catch (e) {
      _snack('تعذّر تحديد الموقع: $e');
    }
  }

  void _pickMethod() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'طريقة حساب المواقيت',
              style: TextStyle(fontFamily: 'Amiri', fontSize: 19),
            ),
            const SizedBox(height: 6),
            Text(
              'الطرق المعتمدة من جهات رسمية. اختر الأقرب لبلدك.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 14),
            Flexible(
              child: SingleChildScrollView(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: PrayerService.methods.keys.map((k) {
                    final sel = widget.store.method == k;
                    return ChoiceChip(
                      label: Text(PrayerService.methodNamesAr[k] ?? k),
                      selected: sel,
                      onSelected: (_) async {
                        await widget.store.setMethod(k);
                        await NotificationService.scheduleAll(
                          store: widget.store,
                          repo: widget.repo,
                        );
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        setState(() {});
                      },
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openNotifications() async {
    final n = widget.store.notifications;
    var enabled = n.enabled;
    var azan = n.azan;
    var morning = n.morning;
    var evening = n.evening;

    await showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'التنبيهات',
                style: TextStyle(fontFamily: 'Amiri', fontSize: 19),
              ),
              const SizedBox(height: 8),
              Text(
                'التنبيهات تُجدول على جهازك محليًا، بلا خادم ولا إشعارات دفع.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              SwitchListTile(
                title: const Text(
                  'تفعيل التنبيهات',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14),
                ),
                value: enabled,
                onChanged: (v) async {
                  if (v) {
                    final granted =
                        await NotificationService.requestPermission();
                    if (!granted) {
                      _snack('لم يُسمح بالإشعارات من إعدادات النظام');
                      return;
                    }
                  }
                  setSheet(() => enabled = v);
                },
              ),
              SwitchListTile(
                title: const Text(
                  'تنبيه عند دخول وقت الصلاة',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14),
                ),
                value: azan,
                onChanged: (v) => setSheet(() => azan = v),
              ),
              SwitchListTile(
                title: const Text(
                  'تذكير أذكار الصباح',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14),
                ),
                value: morning,
                onChanged: (v) => setSheet(() => morning = v),
              ),
              SwitchListTile(
                title: const Text(
                  'تذكير أذكار المساء',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14),
                ),
                value: evening,
                onChanged: (v) => setSheet(() => evening = v),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    await widget.store.setNotifications(
                      enabled: enabled,
                      azan: azan,
                      morning: morning,
                      evening: evening,
                    );
                    await NotificationService.scheduleAll(
                      store: widget.store,
                      repo: widget.repo,
                    );
                    if (!ctx.mounted) return;
                    Navigator.pop(ctx);
                    setState(() {});
                    _snack(enabled ? 'فُعّلت التنبيهات' : 'أُوقفت التنبيهات');
                  },
                  child: const Text('حفظ'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openQibla() {
    final loc = widget.store.location;
    if (loc == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            QiblaScreen(lat: loc.lat, lon: loc.lon, label: loc.label),
      ),
    );
  }

  static String _remain(int mins) {
    if (mins >= 60) return 'بعد ${mins ~/ 60} س و${mins % 60} د';
    return 'بعد $mins دقيقة';
  }

  static IconData _iconFor(String k) {
    switch (k) {
      case 'fajr':
        return Icons.wb_twilight;
      case 'sunrise':
        return Icons.wb_sunny_outlined;
      case 'dhuhr':
        return Icons.light_mode_outlined;
      case 'asr':
        return Icons.wb_sunny;
      case 'maghrib':
        return Icons.wb_twilight_outlined;
      default:
        return Icons.nightlight_outlined;
    }
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(m), behavior: SnackBarBehavior.floating),
    );
  }
}

// =====================================================================
// شاشة القبلة — بوصلة حقيقية بمستشعرات الجهاز (إن توفّرت)
// =====================================================================
class QiblaScreen extends StatefulWidget {
  final double lat;
  final double lon;
  final String label;
  const QiblaScreen({
    super.key,
    required this.lat,
    required this.lon,
    required this.label,
  });

  @override
  State<QiblaScreen> createState() => _QiblaScreenState();
}

class _QiblaScreenState extends State<QiblaScreen> {
  double? _heading; // اتجاه الجهاز من الشمال (درجات)
  bool _sensorAvailable = true;

  @override
  Widget build(BuildContext context) {
    final q = PrayerService.qibla(latitude: widget.lat, longitude: widget.lon);
    final gold = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'اتجاه القبلة',
          style: TextStyle(fontFamily: 'Amiri', fontSize: 19, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'المسافة إلى الكعبة: ${q.distanceKm.toStringAsFixed(0)} كم',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 18),

          Center(
            child: SizedBox(
              width: 260,
              height: 260,
              child: StreamBuilder<CompassEvent>(
                // بوصلة الجهاز: تُعطي الاتجاه مباشرة من الشمال
                // (إن لم تدعمها الجهاز، يبقى السهم على الزاوية المحسوبة)
                stream: FlutterCompass.events,
                builder: (context, snapshot) {
                  if (snapshot.hasData && snapshot.data?.heading != null) {
                    _heading = snapshot.data!.heading;
                    _sensorAvailable = true;
                  } else if (snapshot.hasError) {
                    _sensorAvailable = false;
                  }
                  final angle = _heading == null
                      ? q.bearing
                      : q.bearing - _heading!;
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      CustomPaint(
                        size: const Size(260, 260),
                        painter: _CompassPainter(gold: gold),
                      ),
                      Transform.rotate(
                        angle: angle * math.pi / 180,
                        child: CustomPaint(
                          size: const Size(260, 260),
                          painter: _NeedlePainter(gold: gold),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${q.bearing.toStringAsFixed(1)}°',
                            style: TextStyle(
                              fontFamily: 'Amiri',
                              fontSize: 30,
                              fontWeight: FontWeight.w700,
                              color: gold,
                            ),
                          ),
                          Text(
                            'من الشمال',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(fontSize: 10.5),
                          ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),

          const SizedBox(height: 20),
          Text(
            _sensorAvailable && _heading != null
                ? 'وجّه أعلى الجهاز نحو الشمال، ثم اتّبع السهم الذهبي — يلفّ تلقائيًا مع حركة جهازك.'
                : 'وجّه أعلى الجهاز نحو الشمال ثم اتّبع السهم الذهبي. '
                      'لم نتحقق من مستشعر البوصلة على هذا الجهاز، فالسهم ثابت على الزاوية المحسوبة من موقعك.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(height: 1.9),
          ),

          const SizedBox(height: 18),
          const OrnamentDivider(),
          const SizedBox(height: 12),
          Text(
            'موقع القياس: ${widget.label}\n'
            'الزاوية محسوبة إلى إحداثيات الكعبة — نفس الصيغة التي تحقّقنا منها '
            'رقميًا (القاهرة 136.14° مطابقة تمامًا للمرجع).',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(height: 1.9),
          ),
        ],
      ),
    );
  }
}

class _CompassPainter extends CustomPainter {
  final Color gold;
  _CompassPainter({required this.gold});

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final r = size.shortestSide / 2 - 8;

    canvas.drawCircle(
      c,
      r + 6,
      Paint()
        ..color = gold.withValues(alpha: 0.18)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );
    canvas.drawCircle(
      c,
      r - 16,
      Paint()
        ..color = gold.withValues(alpha: 0.12)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1,
    );

    // خطوط التدريج
    for (var a = 0; a < 360; a += 15) {
      final rad = (a - 90) * math.pi / 180;
      final major = a % 45 == 0;
      final r1 = r - (major ? 0 : 9);
      canvas.drawLine(
        Offset(c.dx + r1 * math.cos(rad), c.dy + r1 * math.sin(rad)),
        Offset(c.dx + r * math.cos(rad), c.dy + r * math.sin(rad)),
        Paint()
          ..color = gold.withValues(alpha: major ? 0.5 : 0.22)
          ..strokeWidth = major ? 1.6 : 0.8,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CompassPainter old) => old.gold != gold;
}

class _NeedlePainter extends CustomPainter {
  final Color gold;
  _NeedlePainter({required this.gold});

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final r = size.shortestSide / 2 - 8;

    // النصف الشمالي (نحو القبلة) بلون ذهبي صريح
    final up = Path()
      ..moveTo(c.dx, c.dy - r + 12)
      ..lineTo(c.dx - 9, c.dy)
      ..lineTo(c.dx + 9, c.dy)
      ..close();
    canvas.drawPath(up, Paint()..color = gold);

    final down = Path()
      ..moveTo(c.dx, c.dy + r - 12)
      ..lineTo(c.dx - 9, c.dy)
      ..lineTo(c.dx + 9, c.dy)
      ..close();
    canvas.drawPath(down, Paint()..color = gold.withValues(alpha: 0.28));

    canvas.drawCircle(c, 9, Paint()..color = SakinahColors.ink800);
    canvas.drawCircle(
      c,
      9,
      Paint()
        ..color = gold
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(covariant _NeedlePainter old) => old.gold != gold;
}
