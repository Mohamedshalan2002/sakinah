// =====================================================================
// سَكِينَة — الإعدادات (Flutter)
// المظهر، الموقع والمواقيت، التنبيهات، الصوت (مصدر يحدده المستخدم)،
// الخصوصية، والبيانات (تصدير/تصفير) + شاشة عن التطبيق.
// =====================================================================
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../prayer_service.dart';
import '../services/notification_service.dart';
import '../theme.dart';

class SettingsScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  const SettingsScreen({super.key, required this.store, required this.repo});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _audioCtrl;

  @override
  void initState() {
    super.initState();
    _audioCtrl = TextEditingController(text: widget.store.audioBaseUrl);
  }

  @override
  void dispose() {
    _audioCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final loc = widget.store.location;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'الإعدادات',
          style: TextStyle(fontFamily: 'Amiri', fontSize: 20, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          // ── المظهر ──
          _card(context, Icons.palette_outlined, 'المظهر', [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await widget.store.setTheme('dark');
                      setState(() {});
                    },
                    icon: const Icon(Icons.dark_mode_outlined, size: 16),
                    label: const Text('ليلي'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await widget.store.setTheme('light');
                      setState(() {});
                    },
                    icon: const Icon(Icons.light_mode_outlined, size: 16),
                    label: const Text('نهاري'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'حجم الخط: ${(widget.store.fontScale * 100).round()}٪',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [0.9, 1.0, 1.1, 1.25].map((s) {
                final sel = (widget.store.fontScale - s).abs() < 0.001;
                return ChoiceChip(
                  label: Text('${(s * 100).round()}٪'),
                  selected: sel,
                  onSelected: (_) async {
                    await widget.store.setFontScale(s);
                    setState(() {});
                  },
                );
              }).toList(),
            ),
          ]),

          // ── الموقع والمواقيت ──
          _card(context, Icons.location_on_outlined, 'الموقع والمواقيت', [
            Text(
              loc == null
                  ? 'لم يُحدَّد موقع بعد.'
                  : 'الموقع: ${loc.label}\n'
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
                  onPressed: () async {
                    await widget.store.setLocation(null);
                    if (!mounted) return;
                    setState(() {});
                    Navigator.pop(context);
                  },
                  icon: const Icon(Icons.location_off_outlined, size: 16),
                  label: const Text('تغيير الموقع'),
                ),
                OutlinedButton.icon(
                  onPressed: _pickMethod,
                  icon: const Icon(Icons.tune, size: 16),
                  label: const Text('طريقة الحساب'),
                ),
                OutlinedButton.icon(
                  onPressed: () async {
                    await widget.store.setAsrHanafi(!widget.store.asrHanafi);
                    setState(() {});
                  },
                  icon: const Icon(Icons.schedule, size: 16),
                  label: const Text('مذهب العصر'),
                ),
              ],
            ),
          ]),

          // ── التنبيهات ──
          _card(context, Icons.notifications_outlined, 'التنبيهات', [
            Text(
              'التنبيهات تُجدول محليًا على جهازك (بلا خادم وبلا إشعارات دفع). '
              'التفعيل الحالي: ${widget.store.notifications.enabled ? 'مفعّلة' : 'موقوفة'}.',
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12.5,
                height: 1.9,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final granted = await NotificationService.requestPermission();
                  if (!granted) {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('لم يُسمح بالإشعارات من إعدادات النظام'),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                    return;
                  }
                  await widget.store.setNotifications(enabled: true);
                  await NotificationService.scheduleAll(
                    store: widget.store,
                    repo: widget.repo,
                  );
                  if (!mounted) return;
                  setState(() {});
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('فُعّلت التنبيهات'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                icon: const Icon(Icons.notifications_active_outlined, size: 16),
                label: const Text('تفعيل التنبيهات'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: () async {
                  await NotificationService.showNow(
                    'سَكِينَة',
                    'هذا تنبيه تجريبي — الإذن يعمل بنجاح',
                  );
                },
                icon: const Icon(Icons.science_outlined, size: 16),
                label: const Text('تجربة تنبيه الآن'),
              ),
            ),
          ]),

          // ── الصوت ──
          _card(context, Icons.play_circle_outline, 'الصوت (اختياري)', [
            Text(
              'التطبيق لا يحتوي تسجيلات محميّة. تُنزّل التلاوة عند الطلب من مصدر تحدّده أنت. '
              'اتركه فارغًا إن لم تكن تحتاجه.',
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12.5,
                height: 1.9,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _audioCtrl,
              decoration: InputDecoration(
                hintText: 'https://… رابط حزمة الصوت',
                hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 12.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () async {
                  await widget.store.setAudioBaseUrl(_audioCtrl.text.trim());
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('حُفظ مصدر الصوت'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                child: const Text('حفظ المصدر'),
              ),
            ),
          ]),

          // ── الخصوصية ──
          _card(context, Icons.shield_outlined, 'الخصوصية', [
            const Text(
              '• لا إعلانات، لا تتبّع، لا تحليلات.\n'
              '• بياناتك (القراءة، الأذكار، الوِرد) على جهازك فقط.\n'
              '• الموقع يُستخدم لحساب المواقيت محليًا ولا يُرسل لأي جهة.\n'
              '• لا حساب ولا تسجيل دخول.',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 12.5, height: 2),
            ),
          ]),

          // ── البيانات ──
          _card(context, Icons.folder_outlined, 'بياناتك', [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () async {
                    final json = const JsonEncoder.withIndent('  ')
                        .convert(widget.store.exportAll());
                    await Share.share(
                      json,
                      subject: 'نسخة سَكِينَة الاحتياطية',
                    );
                  },
                  icon: const Icon(Icons.upload_outlined, size: 16),
                  label: const Text('تصدير نسخة'),
                ),
                OutlinedButton.icon(
                  onPressed: _confirmReset,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: SakinahColors.rose400,
                  ),
                  icon: const Icon(Icons.delete_outline, size: 16),
                  label: const Text('تصفير كل شيء'),
                ),
              ],
            ),
          ]),

          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: Icon(Icons.info_outline, color: gold),
              title: const Text(
                'عن «سَكِينَة» والمصادر',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w600,
                ),
              ),
              trailing: const Icon(Icons.chevron_left),
              onTap: () => Navigator.of(context)
                  .push(MaterialPageRoute(builder: (_) => const AboutScreen())),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(
    BuildContext context,
    IconData icon,
    String title,
    List<Widget> children,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(fontFamily: 'Amiri', fontSize: 17),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
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
            const SizedBox(height: 14),
            Flexible(
              child: SingleChildScrollView(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: PrayerService.methods.keys.map((k) {
                    return ChoiceChip(
                      label: Text(PrayerService.methodNamesAr[k] ?? k),
                      selected: widget.store.method == k,
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

  Future<void> _confirmReset() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'تصفير كل البيانات',
          style: TextStyle(fontFamily: 'Amiri'),
        ),
        content: const Text(
          'سيُحذف كل شيء: الوِرد، الاستمرارية، العلامات، آخر موضع قراءة، والموقع. '
          'لا يمكن التراجع.',
          style: TextStyle(fontFamily: 'Cairo', fontSize: 13, height: 1.8),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('نعم، صفّر'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await widget.store.resetAll();
    await NotificationService.cancelAll();
    if (!mounted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('صُفّرت البيانات'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

// =====================================================================
// عن التطبيق
// =====================================================================
class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'عن «سَكِينَة»',
          style: TextStyle(fontFamily: 'Amiri', fontSize: 20, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          Center(
            child: SizedBox(
              width: 80,
              height: 80,
              child: CustomPaint(
                painter: Star8Painter(color: gold, strokeWidth: 1.6),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              'سَكِينَة',
              style: TextStyle(
                fontFamily: 'Amiri',
                fontSize: 34,
                fontWeight: FontWeight.w700,
                color: gold,
              ),
            ),
          ),
          const SizedBox(height: 6),
          const Center(child: OrnamentDivider()),
          const SizedBox(height: 16),

          _block(
            context,
            'الفكرة',
            'تطبيق يجمع ما يحتاجه المسلم يوميًا في مكان واحد: مصحف كامل يعمل أوفلاين، '
                'أذكار وأدعية بمصادرها، مواقيت صلاة وقبلة محسوبة على جهازك، وِرد واستمرارية، '
                'وأسماء الله الحسنى — بلا إعلانات وبلا تتبّع.',
          ),

          _block(
            context,
            'وعد الخصوصية',
            '• بلا إعلانات: لا بانرات ولا اشتراكات ولا ترويج.\n'
                '• بلا تتبّع: لا تحليلات ولا معرّفات ولا كوكيز إعلانية.\n'
                '• بلا حساب: كل شيء على جهازك، ويعمل بدون إنترنت.\n'
                '• بلا تسجيلات محميّة: أي صوت يُنزَّل من مصدر تحدده أنت.',
          ),

          _block(
            context,
            'المصادر',
            'نص القرآن: برواية حفص عن عاصم (الرسم العثماني)، مع تحقّق بمصدرين مستقلّين '
                '— صفر اختلاف في الحروف والحركات في ٦٢٣٦ آية.\n\n'
                'الأذكار: «حصن المسلم من أذكار الكتاب والسنة» — سعيد بن علي بن وهف القحطاني.\n\n'
                'الأسماء الحسنى: «شرح أسماء الله الحسنى في ضوء الكتاب والسنة» — القحطاني '
                '(ترخيص MIT).\n\n'
                'الخطوط: Amiri و Cairo و Noto Naskh (تراخيص OFL مفتوحة).',
          ),

          _block(
            context,
            'ملاحظة أمانة',
            'الأذكار المعلّمة بـ«يحتاج مراجعة تخريج» مأخوذة من مصدر شعبي لا يذكر رقم '
                'الحديث لكل ذكر. لم نُكمل التخريج من عندنا. للنشر العام يُراجَع مع جهة '
                'علمية معتمدة.',
          ),

          _block(
            context,
            'محرك المواقيت',
            'المواقيت تُحسب فلكيًا على جهازك بلا اتصال. طرق الحساب المدعومة معتمدة من '
                'جهات رسمية، واتجاه القبلة محسوب بصيغة الدائرة الكبرى إلى إحداثيات الكعبة. '
                'محرك نسخة الويب تحقّق مقابل مرجع مستقل: ٥٢٨/٥٢٨ اختبار داخل ٣ دقائق، '
                'والقبلة بصفر فرق.',
          ),

          const SizedBox(height: 8),
          Center(
            child: Text(
              'الإصدار 1.0 · يعمل بدون إنترنت',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _block(BuildContext context, String title, String body) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontFamily: 'Amiri',
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              body,
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 12.5,
                height: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
