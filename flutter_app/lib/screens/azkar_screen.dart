// =====================================================================
// سَكِينَة — الأذكار (Flutter)
// تصنيفات + عدّاد لكل ذكر + الفضل + المرجع ودرجة التوثيق معلَنة.
// =====================================================================
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../theme.dart';

class AzkarScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  const AzkarScreen({super.key, required this.store, required this.repo});

  @override
  State<AzkarScreen> createState() => _AzkarScreenState();
}

class _AzkarScreenState extends State<AzkarScreen> {
  String? _cat;

  @override
  Widget build(BuildContext context) {
    final data = widget.repo.azkar;
    if (data == null) return const Center(child: CircularProgressIndicator());

    final gold = Theme.of(context).colorScheme.primary;
    final hour = DateTime.now().hour;
    final isMorning = hour >= 4 && hour < 16;

    var items = data.entries.toList();
    if (_cat != null) {
      items = items.where((e) => e.cat == _cat).toList();
    } else {
      // نقدّم أذكار الصباح/المساء أولًا افتراضيًا
      items.sort((a, b) {
        final ra = a.cat == 'morning_evening' ? 0 : 1;
        final rb = b.cat == 'morning_evening' ? 0 : 1;
        return ra.compareTo(rb);
      });
    }
    final shown = items.take(60).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          'الأذكار والأدعية',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'أذكار الصباح والمساء والنوم والصلاة — مع المرجع والفضل',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 14),

        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(
                  isMorning
                      ? Icons.wb_sunny_outlined
                      : Icons.nightlight_outlined,
                  color: gold,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    isMorning
                        ? 'أذكار الصباح — تُعرض تلقائيًا حسب وقت اليوم.'
                        : 'أذكار المساء — تُعرض تلقائيًا حسب وقت اليوم.',
                    style: const TextStyle(
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
        const SizedBox(height: 10),

        // شرائح التصنيفات
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              Padding(
                padding: const EdgeInsetsDirectional.only(end: 6),
                child: FilterChip(
                  label: const Text('الكل'),
                  selected: _cat == null,
                  onSelected: (_) => setState(() => _cat = null),
                ),
              ),
              ...data.categories.map(
                (c) => Padding(
                  padding: const EdgeInsetsDirectional.only(end: 6),
                  child: FilterChip(
                    label: Text('${c.titleAr} (${c.count})'),
                    selected: _cat == c.id,
                    onSelected: (_) => setState(() => _cat = c.id),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        ...shown.map(
          (e) => _ZekrCard(
            entry: e,
            store: widget.store,
            onChanged: () => setState(() {}),
          ),
        ),

        if (items.length > 60)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              'تُعرض ٦٠ من ${items.length} — استخدم التصنيفات لتضييق النتائج.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
      ],
    );
  }
}

class _ZekrCard extends StatefulWidget {
  final ZekrEntry entry;
  final LocalStore store;
  final VoidCallback onChanged;
  const _ZekrCard({
    required this.entry,
    required this.store,
    required this.onChanged,
  });

  @override
  State<_ZekrCard> createState() => _ZekrCardState();
}

class _ZekrCardState extends State<_ZekrCard> {
  bool _showFullFadl = false;

  @override
  Widget build(BuildContext context) {
    final e = widget.entry;
    final gold = Theme.of(context).colorScheme.primary;
    final count = widget.store.zekrProgress[e.id] ?? 0;
    final done = count >= e.repeat;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // النص
            Text(
              e.text,
              style: const TextStyle(
                fontFamily: 'NotoNaskh',
                fontSize: 17,
                height: 2.05,
              ),
            ),

            // الفضل
            if (e.hasFadl) ...[
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () => setState(() => _showFullFadl = !_showFullFadl),
                child: Container(
                  padding: const EdgeInsetsDirectional.fromSTEB(10, 8, 10, 8),
                  decoration: BoxDecoration(
                    border: Border(
                      right: BorderSide(
                        color: gold.withValues(alpha: 0.5),
                        width: 3,
                      ),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'الفضل: ${_showFullFadl ? e.fadlAr : (e.fadlAr.length > 90 ? '${e.fadlAr.substring(0, 90)}…' : e.fadlAr)}',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 12,
                          height: 1.75,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                      if (e.fadlAr.length > 90)
                        Text(
                          _showFullFadl ? 'طيّ' : 'المزيد',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            color: gold,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 10),

            // الشارات + العدّاد
            Row(
              children: [
                _badge(context, Icons.repeat, '${e.repeat}×', gold),
                const SizedBox(width: 6),
                _badge(
                  context,
                  e.isVerifiedQuran
                      ? Icons.verified_outlined
                      : Icons.info_outline,
                  e.isVerifiedQuran ? 'نص قرآني متحقّق' : 'يحتاج مراجعة تخريج',
                  e.isVerifiedQuran
                      ? SakinahColors.teal400
                      : SakinahColors.rose400,
                ),
                const Spacer(),
                Text(
                  '$count / ${e.repeat}',
                  style: TextStyle(
                    fontFamily: 'Amiri',
                    fontSize: 16,
                    color: gold,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 42,
                  height: 42,
                  child: Material(
                    color: done ? gold : gold.withValues(alpha: 0.14),
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () async {
                        final next = done ? 0 : count + 1;
                        await widget.store.bumpZekr(e.id, e.repeat, next);
                        if (next >= e.repeat) {
                          HapticFeedback.mediumImpact();
                        } else {
                          HapticFeedback.selectionClick();
                        }
                        widget.onChanged();
                      },
                      child: Icon(
                        done ? Icons.check : Icons.add,
                        size: 20,
                        color: done ? const Color(0xFF17222F) : gold,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),
            // المرجع — يُعرض دائمًا (التزام بوعد التوثيق)
            Text(
              'المرجع: ${e.refWork} — ${e.ref}',
              style: TextStyle(
                fontFamily: 'Cairo',
                fontSize: 10.5,
                color: Theme.of(context).textTheme.bodySmall?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(
    BuildContext context,
    IconData icon,
    String label,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: color),
          ),
        ],
      ),
    );
  }
}
