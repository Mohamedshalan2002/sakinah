// =====================================================================
// سَكِينَة — أدعية حسب الحالة (Flutter)
// تُنتقى من نفس بيانات الأذكار بترتيب تنظيمي، وكل دعاء بمرجعه.
// =====================================================================
import 'package:flutter/material.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../theme.dart';

class SituationsScreen extends StatelessWidget {
  final LocalStore store;
  final DataRepository repo;
  const SituationsScreen({super.key, required this.store, required this.repo});

  @override
  Widget build(BuildContext context) {
    final list = repo.situations ?? const <Situation>[];
    final gold = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'دعاء حسب حالك',
          style: TextStyle(fontFamily: 'Amiri', fontSize: 19, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            'اختر ما تمرّ به — تُعرض الأدعية المناسبة بمصادرها',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: list.length,
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 220,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.5,
            ),
            itemBuilder: (context, i) {
              final s = list[i];
              return Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) =>
                          SituationDetailScreen(situation: s, repo: repo),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(_icon(s.icon), color: gold, size: 22),
                        const SizedBox(height: 6),
                        Text(
                          s.titleAr,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          s.descAr,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontSize: 10.5, height: 1.5),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Icon(Icons.menu_book_outlined, color: gold),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'كل دعاء هنا مأخوذ من «حصن المسلم» بمرجعه — لا نصوص مُنشأة.',
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(height: 1.8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static IconData _icon(String key) {
    switch (key) {
      case 'cloud-rain':
        return Icons.cloud_outlined;
      case 'shield':
        return Icons.shield_outlined;
      case 'route':
        return Icons.route_outlined;
      case 'heart-pulse':
        return Icons.monitor_heart_outlined;
      case 'hand-heart':
        return Icons.volunteer_activism_outlined;
      case 'coins':
        return Icons.paid_outlined;
      case 'compass':
        return Icons.explore_outlined;
      case 'users':
        return Icons.groups_outlined;
      case 'sprout':
        return Icons.eco_outlined;
      case 'mosque':
        return Icons.mosque_outlined;
      default:
        return Icons.self_improvement_outlined;
    }
  }
}

class SituationDetailScreen extends StatelessWidget {
  final Situation situation;
  final DataRepository repo;
  const SituationDetailScreen({
    super.key,
    required this.situation,
    required this.repo,
  });

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final byId = <String, ZekrEntry>{
      for (final e in (repo.azkar?.entries ?? const <ZekrEntry>[])) e.id: e,
    };
    final entries = situation.entryIds
        .map((id) => byId[id])
        .whereType<ZekrEntry>()
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          situation.titleAr,
          style: TextStyle(fontFamily: 'Amiri', fontSize: 19, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            '${situation.descAr} — ${entries.length} دعاء من ${situation.categories.join(' · ')}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          if (entries.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'لا أدعية مسجلة لهذه الحالة.',
                  style: TextStyle(fontFamily: 'Cairo'),
                ),
              ),
            ),
          ...entries.map(
            (e) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      e.text,
                      style: const TextStyle(
                        fontFamily: 'NotoNaskh',
                        fontSize: 17,
                        height: 2.05,
                      ),
                    ),
                    if (e.hasFadl) ...[
                      const SizedBox(height: 8),
                      Text(
                        'الفضل: ${e.fadlAr}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          height: 1.75,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: gold.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            '${e.repeat}×',
                            style: TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 10.5,
                              color: gold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            e.titleAr,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(fontSize: 10.5),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'المرجع: ${e.refWork} — ${e.ref}',
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(fontSize: 10.5, height: 1.6),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
