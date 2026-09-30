// =====================================================================
// سَكِينَة — الشاشة الرئيسية + التنقّل السفلي
// =====================================================================
import 'package:flutter/material.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../prayer_service.dart';
import '../services/notification_service.dart';
import '../theme.dart';
import 'azkar_screen.dart';
import 'names_screen.dart';
import 'prayer_screen.dart';
import 'quran_screen.dart';
import 'rituals_screen.dart';
import 'settings_screen.dart';
import 'situations_screen.dart';

class HomeScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  const HomeScreen({super.key, required this.store, required this.repo});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  void _go(int i) => setState(() => _tab = i);

  void refresh() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      _Dashboard(
        store: widget.store,
        repo: widget.repo,
        onNavigate: _go,
        onRefresh: refresh,
      ),
      QuranScreen(store: widget.store, repo: widget.repo),
      AzkarScreen(store: widget.store, repo: widget.repo),
      PrayerScreen(store: widget.store, repo: widget.repo),
      RitualsScreen(store: widget.store, repo: widget.repo),
    ];

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _Header(
              store: widget.store,
              onSettings: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) =>
                        SettingsScreen(store: widget.store, repo: widget.repo),
                  ),
                );
                refresh();
              },
              onNotif: () => _go(3),
            ),
            OrnamentStrip(
              height: 20,
              color: Theme.of(context).colorScheme.primary
                  .withValues(alpha: 0.35),
            ),
            Expanded(
              child: IndexedStack(index: _tab, children: pages),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: _go,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'الرئيسية',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'المصحف',
          ),
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'الأذكار',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'المواقيت',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_fire_department_outlined),
            selectedIcon: Icon(Icons.local_fire_department),
            label: 'الوِرد',
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final LocalStore store;
  final VoidCallback onSettings;
  final VoidCallback onNotif;
  const _Header({
    required this.store,
    required this.onSettings,
    required this.onNotif,
  });

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final n = store.notifications;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          SizedBox(
            width: 30,
            height: 30,
            child: CustomPaint(painter: Star8Painter(color: gold)),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'سَكِينَة',
                style: TextStyle(
                  fontFamily: 'Amiri',
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  color: gold,
                ),
              ),
              Text(
                'QURAN · AZKAR · QIBLAH',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 8.5,
                  letterSpacing: 2,
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
              ),
            ],
          ),
          const Spacer(),
          IconButton(
            onPressed: onNotif,
            tooltip: 'التنبيهات',
            icon: Icon(
              n.enabled
                  ? Icons.notifications_active_outlined
                  : Icons.notifications_off_outlined,
              color: n.enabled ? gold : null,
            ),
          ),
          IconButton(
            onPressed: onSettings,
            tooltip: 'الإعدادات',
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
    );
  }
}

class _Dashboard extends StatelessWidget {
  final LocalStore store;
  final DataRepository repo;
  final ValueChanged<int> onNavigate;
  final VoidCallback onRefresh;
  const _Dashboard({
    required this.store,
    required this.repo,
    required this.onNavigate,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final hour = now.getHours();
    final greeting = hour < 12
        ? 'صباح الخير'
        : (hour < 17 ? 'طاب نهارك' : 'طاب مساؤك');
    final loc = store.location;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          greeting,
          style: Theme.of(context).textTheme.headlineMedium
              ?.copyWith(fontSize: 26),
        ),
        const SizedBox(height: 4),
        Text(_dateLine(now), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 16),

        // المواقيت / طلب الموقع
        if (loc == null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.location_on_outlined,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'مواقيت الصلاة والقبلة',
                        style: TextStyle(fontFamily: 'Amiri', fontSize: 17),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'حدّد موقعك لحساب المواقيت والقبلة على جهازك (بدون إنترنت).',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12.5,
                      height: 1.7,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => onNavigate(3),
                      child: const Text('تحديد الموقع'),
                    ),
                  ),
                ],
              ),
            ),
          )
        else
          _nextPrayerCard(context, loc),

        const SizedBox(height: 12),

        // متابعة القراءة
        if (store.lastRead != null)
          _continueCard(context, store.lastRead!, repo),

        const SizedBox(height: 12),
        _streakCard(context),

        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.85,
          children: [
            _quickTile(
              context,
              Icons.wb_sunny_outlined,
              'أذكار الصباح/المساء',
              'حسب وقت اليوم',
              () => onNavigate(2),
            ),
            _quickTile(
              context,
              Icons.auto_awesome_outlined,
              'أسماء الله الحسنى',
              '٩٩ اسمًا بالشرح',
              () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => NamesScreen(store: store, repo: repo),
                  ),
                );
              },
            ),
            _quickTile(
              context,
              Icons.volunteer_activism_outlined,
              'دعاء حسب حالك',
              'همّ · قلق · سفر',
              () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => SituationsScreen(store: store, repo: repo),
                  ),
                );
              },
            ),
            _quickTile(
              context,
              Icons.center_focus_strong_outlined,
              'السبحة والوِرد',
              'عدّاد واستمرارية',
              () => onNavigate(4),
            ),
          ],
        ),

        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(
                  Icons.shield_outlined,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'بلا إعلانات، بلا تتبّع. كل بياناتك على جهازك فقط.',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 12.5,
                      height: 1.7,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _nextPrayerCard(BuildContext context, SavedLocation loc) {
    final gold = Theme.of(context).colorScheme.primary;
    try {
      final times = PrayerService.compute(
        latitude: loc.lat,
        longitude: loc.lon,
        date: DateTime.now(),
        method: store.method,
        asrHanafi: store.asrHanafi,
      );
      final next = PrayerService.nextPrayer(times, DateTime.now());
      final when = next['time'] as DateTime?;
      final left = next['minutesLeft'] as int;
      final remain = left >= 60
          ? 'بعد ${left ~/ 60} س و${left % 60} د'
          : 'بعد $left دقيقة';

      return Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => onNavigate(3),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الصلاة القادمة',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${next['nameAr']} · ${_hhmm(when)}',
                        style: TextStyle(
                          fontFamily: 'Amiri',
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: gold,
                        ),
                      ),
                      Text(
                        remain,
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12.5,
                          color: SakinahColors.teal400,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => PrayerScreen(
                          store: store,
                          repo: repo,
                          openQibla: true,
                        ),
                      ),
                    );
                  },
                  tooltip: 'القبلة',
                  icon: const Icon(Icons.explore_outlined),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'تعذّر حساب المواقيت: $e',
            style: const TextStyle(fontFamily: 'Cairo', fontSize: 12.5),
          ),
        ),
      );
    }
  }

  Widget _continueCard(
    BuildContext context,
    ({int surah, int verse}) lr,
    DataRepository repo,
  ) {
    final meta = repo.index?.byNumber(lr.surah);
    return Card(
      child: ListTile(
        leading: Icon(
          Icons.book_outlined,
          color: Theme.of(context).colorScheme.primary,
        ),
        title: Text(
          'متابعة القراءة',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 17,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        subtitle: Text(
          'سورة ${meta?.shortName ?? lr.surah} — الآية ${lr.verse}',
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12.5),
        ),
        trailing: const Icon(Icons.chevron_left),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => SurahScreen(
                store: store,
                repo: repo,
                surah: lr.surah,
                initialVerse: lr.verse,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _streakCard(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final days = store.wirdDays.length;
    final t = store.tasbih;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.local_fire_department_outlined, color: gold),
                const SizedBox(width: 8),
                const Text(
                  'استمراريتك',
                  style: TextStyle(fontFamily: 'Amiri', fontSize: 17),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _stat(context, '${store.streak}', 'أيام متتابعة'),
                _stat(context, '$days', 'إجمالي الأيام'),
                _stat(context, '${t.count}', 'تسبيحات'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(BuildContext context, String value, String label) {
    final gold = Theme.of(context).colorScheme.primary;
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontFamily: 'Amiri',
              fontSize: 26,
              fontWeight: FontWeight.w700,
              color: gold,
            ),
          ),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }

  Widget _quickTile(
    BuildContext context,
    IconData icon,
    String title,
    String meta,
    VoidCallback onTap,
  ) {
    final gold = Theme.of(context).colorScheme.primary;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: gold, size: 20),
              const SizedBox(height: 6),
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w600,
                  fontSize: 12.5,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                meta,
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(fontSize: 10.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _hhmm(DateTime? d) {
    if (d == null) return '—';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  static String _dateLine(DateTime d) {
    const days = [
      'الأحد',
      'الإثنين',
      'الثلاثاء',
      'الأربعاء',
      'الخميس',
      'الجمعة',
      'السبت',
    ];
    return '${days[d.weekday % 7]} · ${d.day} / ${d.month}';
  }
}
