// =====================================================================
// سَكِينَة — السبحة والوِرد والاستمرارية (Flutter)
// =====================================================================
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../theme.dart';

class RitualsScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  const RitualsScreen({super.key, required this.store, required this.repo});

  @override
  State<RitualsScreen> createState() => _RitualsScreenState();
}

class _RitualsScreenState extends State<RitualsScreen> {
  static const _phrases = [
    (text: 'سُبْحَانَ اللَّهِ', target: 33),
    (text: 'الْحَمْدُ لِلَّهِ', target: 33),
    (text: 'اللَّهُ أَكْبَرُ', target: 34),
    (text: 'لَا إِلَهَ إِلَّا اللَّهُ', target: 100),
    (text: 'أَسْتَغْفِرُ اللَّهَ', target: 100),
    (text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 100),
    (text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100),
  ];

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final t = widget.store.tasbih;
    final wirdDone = widget.store.wirdDoneToday;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          'السبحة والوِرد',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'عدّاد ذِكر بسيط + وِرد يومي وسلسلة استمرارية',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 16),

        // ── السبحة ──
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              children: [
                GestureDetector(
                  onTap: _bump,
                  child: SizedBox(
                    width: 230,
                    height: 230,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CustomPaint(
                          size: const Size(230, 230),
                          painter: _TasbihPainter(
                            count: t.count,
                            target: t.target,
                            gold: gold,
                            dim: gold.withValues(alpha: 0.32),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${t.count}',
                              style: TextStyle(
                                fontFamily: 'Amiri',
                                fontSize: 54,
                                fontWeight: FontWeight.w700,
                                height: 1.05,
                                color: gold,
                              ),
                            ),
                            Text(
                              'من ${t.target}',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  t.phrase,
                  style: const TextStyle(fontFamily: 'NotoNaskh', fontSize: 17),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _bump,
                    child: const Text('اضغط للعدّ'),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () async {
                    await widget.store.setTasbih(count: 0);
                    setState(() {});
                  },
                  icon: const Icon(Icons.restart_alt, size: 18),
                  label: const Text('تصفير'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // اختيار الذكر
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.touch_app_outlined, color: gold, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'اختر الذكر والهدف',
                      style: TextStyle(fontFamily: 'Amiri', fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _phrases.map((p) {
                    final sel = t.phrase == p.text;
                    return ChoiceChip(
                      label: Text('${p.text} · ${p.target}'),
                      selected: sel,
                      onSelected: (_) async {
                        await widget.store.setTasbih(
                          phrase: p.text,
                          target: p.target,
                          count: 0,
                        );
                        setState(() {});
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // ── الوِرد ──
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, color: gold, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'وِرد اليوم',
                      style: TextStyle(fontFamily: 'Amiri', fontSize: 17),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _stat(context, '${widget.store.streak}', 'أيام متتابعة'),
                    _stat(context, '${widget.store.wirdDays.length}', 'إجمالي'),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: wirdDone
                      ? OutlinedButton.icon(
                          onPressed: () async {
                            await widget.store.toggleWirdToday();
                            setState(() {});
                          },
                          icon: const Icon(Icons.check_circle, size: 18),
                          label: const Text('أكملت وِرد اليوم ✔'),
                        )
                      : FilledButton.icon(
                          onPressed: () async {
                            await widget.store.toggleWirdToday();
                            HapticFeedback.mediumImpact();
                            setState(() {});
                          },
                          icon: const Icon(Icons.check, size: 18),
                          label: const Text('أكملت وِرد اليوم'),
                        ),
                ),
                const SizedBox(height: 16),
                _monthGrid(context),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // مكوّنات الوِرد
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.checklist_outlined, color: gold, size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      'مكوّنات مقترحة',
                      style: TextStyle(fontFamily: 'Amiri', fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  '• أذكار الصباح أو المساء\n'
                  '• وِرد قراءة من المصحف\n'
                  '• تسبيح ١٠٠ مرة\n'
                  '• استغفار',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    height: 2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _bump() async {
    final t = widget.store.tasbih;
    final next = t.count + 1;
    await widget.store.setTasbih(count: next);
    if (next % t.target == 0) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.selectionClick();
    }
    if (!mounted) return;
    setState(() {});
    if (next % t.target == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('أكملت ${t.target} مرة'),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    }
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
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: gold,
            ),
          ),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }

  Widget _monthGrid(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final days = widget.store.wirdDays;
    final now = DateTime.now();
    final cells = <Widget>[];
    for (var i = 29; i >= 0; i--) {
      final d = now.subtract(Duration(days: i));
      final key = LocalStore.dayKey(d);
      final done = days.contains(key);
      cells.add(
        Container(
          decoration: BoxDecoration(
            color: done ? gold.withValues(alpha: 0.30) : null,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: i == 0 ? gold : gold.withValues(alpha: 0.22),
              width: i == 0 ? 2 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            '${d.day}',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 10,
              color: done ? gold : Theme.of(context).textTheme.bodySmall?.color,
            ),
          ),
        ),
      );
    }
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 10,
      mainAxisSpacing: 5,
      crossAxisSpacing: 5,
      children: cells,
    );
  }
}

/// رسم السبحة: حبات موزّعة على دائرة، الممتلئة بالذهبي حسب العدّ.
class _TasbihPainter extends CustomPainter {
  final int count;
  final int target;
  final Color gold;
  final Color dim;
  _TasbihPainter({
    required this.count,
    required this.target,
    required this.gold,
    required this.dim,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final r = size.shortestSide / 2 - 10;
    final beads = target.clamp(1, 60);
    var filled = ((count % target) / target * beads).round();
    if (count > 0 && count % target == 0) filled = beads;

    canvas.drawCircle(
      c,
      r,
      Paint()
        ..color = dim.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );

    for (var i = 0; i < beads; i++) {
      final ang = (-90 + (360 / beads) * i) * math.pi / 180;
      final p = Offset(c.dx + r * math.cos(ang), c.dy + r * math.sin(ang));
      final on = i < filled;
      canvas.drawCircle(p, on ? 4.6 : 3.1, Paint()..color = on ? gold : dim);
    }
  }

  @override
  bool shouldRepaint(covariant _TasbihPainter old) =>
      old.count != count || old.target != target || old.gold != gold;
}
