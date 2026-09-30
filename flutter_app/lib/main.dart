// =====================================================================
// سَكِينَة — تطبيق أندرويد (Flutter)
//
// يجمع نفس مزايا نسخة الويب:
//   • مصحف كامل أوفلاين (نفس بيانات القرآن المتحقق منها)
//   • أذكار وأدعية بمصادرها + أدعية حسب الحالة + أسماء الله الحسنى
//   • مواقيت صلاة وقبلة محسوبة على الجهاز
//   • سبحة ووِرد واستمرارية
//   • تنبيهات أذان وأذكار (flutter_local_notifications)
//   • بلا إعلانات، بلا تتبّع، بلا حساب
//
// التشغيل:  flutter pub get && flutter run
// بناء APK: flutter build apk --release
// =====================================================================
import 'package:flutter/material.dart';

import 'data_repository.dart';
import 'local_store.dart';
import 'theme.dart';
import 'screens/home_screen.dart';
import 'screens/onboarding_screen.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final repo = DataRepository();
  final store = await LocalStore.open();

  // تحميل بيانات التطبيق المُضمَّنة (محلية بالكامل)
  await repo.preload();

  await NotificationService.init(store);

  runApp(SakinahApp(repo: repo, store: store));
}

class SakinahApp extends StatefulWidget {
  final DataRepository repo;
  final LocalStore store;
  const SakinahApp({super.key, required this.repo, required this.store});

  @override
  State<SakinahApp> createState() => _SakinahAppState();
}

class _SakinahAppState extends State<SakinahApp> {
  late bool _showOnboarding;

  @override
  void initState() {
    super.initState();
    // نعرض شاشة الترحيب مرة واحدة فقط (تُحفظ محليًا)
    _showOnboarding = widget.store.location == null;
  }

  void _finishOnboarding() {
    setState(() => _showOnboarding = false);
  }

  @override
  Widget build(BuildContext context) {
    final isLight = widget.store.isLight;
    return MaterialApp(
      title: 'سَكِينَة',
      debugShowCheckedModeBanner: false,
      theme: isLight ? SakinahTheme.light() : SakinahTheme.dark(),
      locale: const Locale('ar'),
      builder: (context, child) {
        // فرض الاتجاه من اليمين لليسار مهما كانت إعدادات الجهاز
        return Directionality(textDirection: TextDirection.rtl, child: child!);
      },
      home: _showOnboarding
          ? OnboardingScreen(
              store: widget.store,
              repo: widget.repo,
              onDone: _finishOnboarding,
            )
          : HomeScreen(store: widget.store, repo: widget.repo),
    );
  }
}
