// =====================================================================
// سَكِينَة — المصحف (Flutter)
// قائمة السور، قارئ السورة، تظليل آية، تكرار للتحفيظ، علامات، ختمة.
// النص من نفس بيانات القرآن المتحقق منها بمصدرين (صفر اختلاف).
// =====================================================================
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data_repository.dart';
import '../local_store.dart';
import '../models.dart';
import '../theme.dart';

class QuranScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  const QuranScreen({super.key, required this.store, required this.repo});

  @override
  State<QuranScreen> createState() => _QuranScreenState();
}

class _QuranScreenState extends State<QuranScreen> {
  String _query = '';
  List<({int surah, int verse, String text})>? _searchResults;
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    final index = widget.repo.index;
    if (index == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final gold = Theme.of(context).colorScheme.primary;

    final filtered = _query.trim().isEmpty
        ? index.surahs
        : index.surahs
              .where(
                (s) =>
                    s.shortName.contains(_query.trim()) ||
                    s.latinName.toLowerCase().contains(
                      _query.trim().toLowerCase(),
                    ),
              )
              .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          'المصحف',
          style: TextStyle(
            fontFamily: 'Amiri',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: gold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'نص عثماني · أوفلاين · تابع آخر موضع',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 14),

        // متابعة القراءة
        if (widget.store.lastRead != null)
          Card(
            child: ListTile(
              leading: Icon(Icons.book_outlined, color: gold),
              title: const Text(
                'متابعة القراءة',
                style: TextStyle(fontFamily: 'Amiri', fontSize: 16),
              ),
              subtitle: Text(
                'سورة ${index.byNumber(widget.store.lastRead!.surah)?.shortName ?? widget.store.lastRead!.surah}'
                ' — الآية ${widget.store.lastRead!.verse}',
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 12),
              ),
              trailing: const Icon(Icons.chevron_left),
              onTap: () => _openSurah(
                widget.store.lastRead!.surah,
                initialVerse: widget.store.lastRead!.verse,
              ),
            ),
          ),

        const SizedBox(height: 12),
        _khatmahCard(context),

        const SizedBox(height: 12),
        // البحث
        TextField(
          onChanged: _onSearch,
          decoration: InputDecoration(
            hintText: 'ابحث في أسماء السور أو في نص المصحف…',
            hintStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            prefixIcon: const Icon(Icons.search),
            filled: true,
            fillColor: Theme.of(context).cardColor,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: gold.withValues(alpha: 0.24)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: gold.withValues(alpha: 0.24)),
            ),
          ),
        ),

        if (_searching) ...[
          const SizedBox(height: 14),
          if (_searchResults == null)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_searchResults!.isEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'لا نتائج مطابقة.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            )
          else
            ..._searchResults!
                .take(40)
                .map(
                  (r) => Card(
                    margin: const EdgeInsets.only(top: 8),
                    child: ListTile(
                      title: Text(
                        '${index.byNumber(r.surah)?.shortName ?? r.surah} — الآية ${r.verse}',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 13,
                        ),
                      ),
                      subtitle: Text(
                        '${r.text.substring(0, r.text.length.clamp(0, 110))}…',
                        style: const TextStyle(
                          fontFamily: 'NotoNaskh',
                          fontSize: 13,
                        ),
                      ),
                      onTap: () {
                        setState(() {
                          _searching = false;
                          _query = '';
                          _searchResults = null;
                        });
                        _openSurah(r.surah, initialVerse: r.verse);
                      },
                    ),
                  ),
                ),
        ],

        const SizedBox(height: 16),
        Row(
          children: [
            Icon(Icons.list, size: 18, color: gold),
            const SizedBox(width: 8),
            Text(
              'السور — ${index.surahs.length}',
              style: TextStyle(fontFamily: 'Amiri', fontSize: 17, color: gold),
            ),
          ],
        ),
        const SizedBox(height: 8),

        ...filtered.map(
          (s) => Card(
            margin: const EdgeInsets.only(bottom: 6),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                child: Text(
                  '${s.number}',
                  style: TextStyle(
                    fontFamily: 'Amiri',
                    fontSize: 14,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ),
              title: Text(
                s.arabicName,
                style: const TextStyle(fontFamily: 'Amiri', fontSize: 16),
              ),
              subtitle: Text(
                '${s.revelationAr} · ${s.verseCount} آية',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              trailing: const Icon(Icons.chevron_left, size: 18),
              onTap: () => _openSurah(s.number),
            ),
          ),
        ),
      ],
    );
  }

  void _openSurah(int n, {int? initialVerse}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SurahScreen(
          store: widget.store,
          repo: widget.repo,
          surah: n,
          initialVerse: initialVerse,
        ),
      ),
    );
  }

  Future<void> _onSearch(String q) async {
    setState(() {
      _query = q;
      if (q.trim().length < 3) {
        _searching = false;
        _searchResults = null;
      } else {
        _searching = true;
      }
    });
    if (q.trim().length < 3) return;

    // بحث في أسماء السور فوريًا (بلا تحميل)
    final index = widget.repo.index!;
    final nameHits = index.surahs
        .where((s) => s.shortName.contains(q.trim()))
        .map((s) => (surah: s.number, verse: 1, text: s.arabicName))
        .toList();

    // بحث في النص: نحمّل السور تدريجيًا لتجنّب تجميد الواجهة
    final norm = ArabicText.normalize(q);
    final results = <({int surah, int verse, String text})>[...nameHits];

    for (final s in index.surahs) {
      if (results.length >= 40) break;
      try {
        final verses = await widget.repo.surah(s.number);
        for (final v in verses) {
          if (results.length >= 40) break;
          if (ArabicText.normalize(v.text).contains(norm)) {
            results.add((surah: s.number, verse: v.number, text: v.text));
          }
        }
      } catch (_) {
        // نتجاوز السورة عند التعذّر ولا نُسقط البحث
      }
      if (!mounted) return;
      setState(() => _searchResults = results);
    }
    if (mounted) setState(() => _searchResults = results);
  }

  Widget _khatmahCard(BuildContext context) {
    final gold = Theme.of(context).colorScheme.primary;
    final page = widget.store.khatmahPage;
    const total = 604;
    final pct = (page / total).clamp(0.0, 1.0);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.center_focus_strong_outlined, color: gold),
                const SizedBox(width: 8),
                const Text(
                  'الختمة',
                  style: TextStyle(fontFamily: 'Amiri', fontSize: 17),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'متابعة الختمة عبر الصفحات (٦٠٤ صفحة).',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: pct,
                minHeight: 8,
                backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                color: gold,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(
                  'الصفحة $page من $total · ${(pct * 100).round()}٪',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const Spacer(),
                IconButton(
                  onPressed: () async {
                    await widget.store.setKhatmahPage(page - 1);
                    setState(() {});
                  },
                  icon: const Icon(Icons.remove),
                  visualDensity: VisualDensity.compact,
                ),
                IconButton(
                  onPressed: () async {
                    await widget.store.setKhatmahPage(page + 1);
                    setState(() {});
                  },
                  icon: const Icon(Icons.add),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// =====================================================================
// قارئ السورة
// =====================================================================
class SurahScreen extends StatefulWidget {
  final LocalStore store;
  final DataRepository repo;
  final int surah;
  final int? initialVerse;
  const SurahScreen({
    super.key,
    required this.store,
    required this.repo,
    required this.surah,
    this.initialVerse,
  });

  @override
  State<SurahScreen> createState() => _SurahScreenState();
}

class _SurahScreenState extends State<SurahScreen> {
  List<Ayah>? _verses;
  int? _selected;
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final verses = await widget.repo.surah(widget.surah);
    if (!mounted) return;
    setState(() {
      _verses = verses;
      _selected = widget.initialVerse;
    });
    if (widget.initialVerse != null) {
      await widget.store.setLastRead(widget.surah, widget.initialVerse!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final meta = widget.repo.index?.byNumber(widget.surah);
    final gold = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              meta?.arabicName ?? 'سورة ${widget.surah}',
              style: TextStyle(fontFamily: 'Amiri', fontSize: 18, color: gold),
            ),
            if (meta != null)
              Text(
                '${meta.revelationAr} · ${meta.verseCount} آية',
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(fontSize: 10.5),
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'علامة',
            onPressed: _selected == null ? null : _toggleBookmark,
            icon: Icon(
              _selected != null &&
                      widget.store.isBookmarked(widget.surah, _selected!)
                  ? Icons.bookmark
                  : Icons.bookmark_border,
            ),
          ),
          IconButton(
            tooltip: 'تكرار للتحفيظ',
            onPressed: _selected == null ? null : _openRepeat,
            icon: const Icon(Icons.repeat),
          ),
        ],
      ),
      body: _verses == null
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              itemCount:
                  _verses!.length +
                  (widget.surah == 1 || widget.surah == 9 ? 0 : 1),
              itemBuilder: (context, i) {
                final hasBismillah = !(widget.surah == 1 || widget.surah == 9);
                if (hasBismillah && i == 0) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    child: Text(
                      'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'AmiriQuran',
                        fontSize: 24,
                        color: gold,
                      ),
                    ),
                  );
                }
                final v = _verses![hasBismillah ? i - 1 : i];
                final isSel = _selected == v.number;
                return InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () async {
                    setState(() => _selected = v.number);
                    await widget.store.setLastRead(widget.surah, v.number);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSel ? gold.withValues(alpha: 0.14) : null,
                      borderRadius: BorderRadius.circular(14),
                      border: Border(
                        right: BorderSide(
                          color: isSel ? gold : Colors.transparent,
                          width: 3,
                        ),
                      ),
                    ),
                    child: RichText(
                      textDirection: TextDirection.rtl,
                      text: TextSpan(
                        style: TextStyle(
                          fontFamily: 'AmiriQuran',
                          fontSize: 25,
                          height: 2.2,
                          color: Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                        children: [
                          TextSpan(text: '${v.text} '),
                          WidgetSpan(
                            alignment: PlaceholderAlignment.middle,
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: Theme.of(context)
                                    .scaffoldBackgroundColor,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: gold.withValues(alpha: 0.4),
                                ),
                              ),
                              child: Text(
                                '${v.number}',
                                style: TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 10,
                                  color: gold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }

  Future<void> _toggleBookmark() async {
    await widget.store.toggleBookmark(widget.surah, _selected!);
    if (!mounted) return;
    setState(() {});
    final now = widget.store.isBookmarked(widget.surah, _selected!);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(now ? 'حُفظت العلامة' : 'أُزيلت العلامة'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _openRepeat() {
    final v = _verses!.firstWhere((a) => a.number == _selected);
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'تكرار الآية للتحفيظ',
              style: TextStyle(fontFamily: 'Amiri', fontSize: 19),
            ),
            const SizedBox(height: 10),
            Text(
              '${v.text.substring(0, v.text.length.clamp(0, 140))}…',
              style: const TextStyle(
                fontFamily: 'NotoNaskh',
                fontSize: 14,
                height: 1.8,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: [3, 5, 7, 10, 20]
                  .map(
                    (n) => ActionChip(
                      label: Text('$n مرات'),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _startRepeat(v, n);
                      },
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  void _startRepeat(Ayah v, int times) {
    var left = times;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text(
            'تكرار الآية',
            style: TextStyle(fontFamily: 'Amiri'),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'متبقٍ: $left',
                style: TextStyle(
                  fontFamily: 'Amiri',
                  fontSize: 22,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                v.text,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: 'AmiriQuran',
                  fontSize: 19,
                  height: 2,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                setState(() => _selected = null);
              },
              child: const Text('إيقاف'),
            ),
            FilledButton(
              onPressed: () {
                if (left <= 1) {
                  HapticFeedback.mediumImpact();
                  Navigator.pop(ctx);
                  setState(() => _selected = null);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('اكتمل التكرار $times مرات ✔'),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  return;
                }
                setDialogState(() => left--);
                HapticFeedback.selectionClick();
              },
              child: const Text('التكرار التالي'),
            ),
          ],
        ),
      ),
    );
  }
}
