// =====================================================================
// سَكِينَة — شاشة الترحيب والتهيئة
// تُعرض مرة واحدة: تشرح الوعد (بلا إعلانات/تتبّع) وتطلب الموقع اختياريًا.
// =====================================================================
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../theme.dart';

class OnboardingScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  final VoidCallback onDone;
  const OnboardingScreen({
    super.key,
    required this.store,
    required this.repo,
    required this.onDone,
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 0;
  bool _busy = false;

  Future<void> _useGps() async {
    setState(() => _busy = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _snack('لم يُسمح بالوصول للموقع — يمكنك اختيار مدينة من القائمة');
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
      _snack('تم تحديد الموقع');
      widget.onDone();
    } catch (e) {
      _snack('تعذّر تحديد الموقع: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickCity(City c) async {
    await widget.store.setLocation(
      SavedLocation(lat: c.lat, lon: c.lon, label: c.nameAr, source: 'preset'),
    );
    widget.onDone();
  }

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(m), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cities = widget.repo.cities ?? const <City>[];
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            OrnamentStrip(
              color: Theme.of(context).colorScheme.primary
                  .withValues(alpha: 0.5),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _step == 0
                    ? _intro(context)
                    : _location(context, cities),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _intro(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const SizedBox(height: 24),
        SizedBox(
          width: 96,
          height: 96,
          child: CustomPaint(
            painter: Star8Painter(color: gold, strokeWidth: 1.8),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'سَكِينَة',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 44,
            fontWeight: FontWeight.w700,
            color: gold,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'QURAN · AZKAR · QIBLAH',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 11,
            letterSpacing: 2.4,
            color: Theme.of(context).textTheme.bodySmall?.color,
          ),
        ),
        const SizedBox(height: 28),
        const OrnamentDivider(),
        const SizedBox(height: 20),
        _feature(
          Icons.menu_book_outlined,
          'مصحف كامل أوفلاين',
          'نص عثماني كامل يفتح بدون إنترنت، مع متابعة آخر موضع وتكرار آية للتحفيظ.',
        ),
        _feature(
          Icons.compass_calibration_outlined,
          'مواقيت الصلاة والقبلة',
          'تُحسب فلكيًا على جهازك من موقعك، بلا حاجة لاتصال.',
        ),
        _feature(
          Icons.auto_stories_outlined,
          'أذكار وأدعية بمصادرها',
          'حصن المسلم كامل، وأدعية حسب حالتك، وأسماء الله الحسنى بشرحها.',
        ),
        _feature(
          Icons.local_fire_department_outlined,
          'وِرد واستمرارية',
          'وِرد يومي وسلسلة أيام وسبحة — تحفيز محترم بلا إزعاج.',
        ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(Icons.shield_outlined, color: gold),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'بلا إعلانات، بلا تتبّع، بلا حساب.\n'
                    'كل بياناتك وعبادتك محفوظة على جهازك فقط.',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      height: 1.8,
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: () => setState(() => _step = 1),
            child: const Text('متابعة'),
          ),
        ),
      ],
    );
  }

  Widget _feature(IconData icon, String title, String body) {
    final gold = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: gold, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12.5,
                    height: 1.7,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _location(BuildContext context, List<City> cities) {
    final gold = Theme.of(context).colorScheme.primary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        Text(
          'حدّد موقعك لحساب المواقيت والقبلة',
          style: TextStyle(fontFamily: 'Amiri', fontSize: 22, color: gold),
        ),
        const SizedBox(height: 8),
        Text(
          'الإحداثيات تُخزَّن على جهازك فقط ولا تُرسل لأي جهة. يمكنك تغييرها لاحقًا.',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 13,
            height: 1.8,
            color: Theme.of(context).textTheme.bodySmall?.color,
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: _busy ? null : _useGps,
            icon: _busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.my_location),
            label: const Text('استخدم موقعي الحالي'),
          ),
        ),
        const SizedBox(height: 18),
        const OrnamentDivider(),
        const SizedBox(height: 12),
        const Text(
          'أو اختر مدينة:',
          style: TextStyle(fontFamily: 'Cairo', fontSize: 13),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: cities
              .map(
                (c) => ActionChip(
                  label: Text(c.nameAr),
                  onPressed: () => _pickCity(c),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 24),
        Center(
          child: TextButton(
            onPressed: widget.onDone,
            child: const Text('تخطّي الآن'),
          ),
        ),
      ],
    );
  }
}
