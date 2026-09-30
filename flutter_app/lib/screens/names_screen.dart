// =====================================================================
// سَكِينَة — أسماء الله الحسنى (Flutter)
// ٩٩ اسمًا مع المعنى والشرح والدليل من الكتاب والسنة، ومصدر كل دليل.
// =====================================================================
import 'package:flutter/material.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../theme.dart';

class NamesScreen extends StatelessWidget {
  final LocalStore store;
  final DataRepository repo;
  const NamesScreen({super.key, required this.store, required this.repo});

  @override
  Widget build(BuildContext context) {
    final names = repo.names ?? const <DivineName>[];
    final gold = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'أسماء الله الحسنى',
          style: TextStyle(fontFamily: 'Amiri', fontSize: 19, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Text(
            '٩٩ اسمًا — المعنى والدليل من الكتاب والسنة',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: names.length,
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 175,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.05,
            ),
            itemBuilder: (context, i) {
              final n = names[i];
              return Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => NameDetailScreen(name: n),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '${n.id}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontSize: 10),
                        ),
                        Text(
                          n.name,
                          style: TextStyle(
                            fontFamily: 'Amiri',
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: gold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          n.brief,
                          textAlign: TextAlign.center,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontSize: 10.5, height: 1.6),
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
                      'المصدر: «شرح أسماء الله الحسنى في ضوء الكتاب والسنة» — القحطاني '
                      '(ترخيص MIT). الشرح الكامل مع الأدلة والمصادر داخل كل اسم.',
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
}

class NameDetailScreen extends StatelessWidget {
  final DivineName name;
  const NameDetailScreen({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          name.name,
          style: TextStyle(fontFamily: 'Amiri', fontSize: 21, color: gold),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: gold.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: gold.withValues(alpha: 0.4)),
            ),
            child: Text(
              'الاسم ${name.id} من ٩٩',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: gold),
            ),
          ),
          const SizedBox(height: 16),

          _sectionTitle(context, 'المعنى'),
          Text(
            name.meaning,
            style: const TextStyle(
              fontFamily: 'NotoNaskh',
              fontSize: 17,
              height: 2.05,
            ),
          ),

          if (name.quranEvidence.isNotEmpty) ...[
            _sectionTitle(context, 'من القرآن'),
            ...name.quranEvidence.map((e) => _evidenceBlock(context, e, gold)),
          ],

          if (name.hadithEvidence.isNotEmpty) ...[
            _sectionTitle(context, 'من السنة'),
            ...name.hadithEvidence.map((e) => _evidenceBlock(context, e, gold)),
          ],

          if (name.explanation.isNotEmpty) ...[
            _sectionTitle(context, 'الشرح'),
            Text(
              name.explanation,
              style: const TextStyle(
                fontFamily: 'NotoNaskh',
                fontSize: 16,
                height: 2.05,
              ),
            ),
          ],

          if (name.scholarlyStatements.isNotEmpty) ...[
            _sectionTitle(context, 'من أقوال أهل العلم'),
            Text(
              name.scholarlyStatements,
              style: const TextStyle(
                fontFamily: 'NotoNaskh',
                fontSize: 15.5,
                height: 2,
              ),
            ),
          ],

          if (name.bookReference.isNotEmpty) ...[
            const SizedBox(height: 16),
            const OrnamentDivider(),
            const SizedBox(height: 12),
            Text(
              'المرجع: ${name.bookReference.replaceAll('\n', ' · ')}',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(height: 1.7),
            ),
          ],

          if (name.hasNoEvidenceInSource) ...[
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: gold),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'المصدر الأصلي لم يُرفق دليلًا خاصًّا لهذا الاسم. لم نُكمل من عندنا.',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12.5,
                          height: 1.8,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _sectionTitle(BuildContext context, String t) {
    return Padding(
      padding: const EdgeInsets.only(top: 20, bottom: 8),
      child: Text(
        t,
        style: TextStyle(
          fontFamily: 'Amiri',
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }

  Widget _evidenceBlock(BuildContext context, Evidence e, Color gold) {
    final unresolved = !e.hasSource;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(14),
        border: Border(
          right: BorderSide(
            color: unresolved
                ? SakinahColors.rose400
                : gold.withValues(alpha: 0.6),
            width: 3,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            e.text,
            style: const TextStyle(
              fontFamily: 'NotoNaskh',
              fontSize: 16,
              height: 1.95,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            unresolved
                ? '⚠ المصدر الأصلي لم يذكر مرجعًا لهذا الدليل'
                : '${e.source}${e.isInferred ? ' · مُتحقّق آليًا' : ''}',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 11,
              height: 1.6,
              color: unresolved ? SakinahColors.rose400 : gold,
            ),
          ),
        ],
      ),
    );
  }
}
