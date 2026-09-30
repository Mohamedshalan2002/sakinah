// =====================================================================
// سَكِينَة — التخزين المحلي (بلا خادم، بلا حساب)
// كل شيء على جهاز المستخدم فقط. لا يتصل بأي خادم ولا يرسل شيئًا.
// =====================================================================
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class LocalStore {
  static const _kTheme = 'theme';
  static const _kLastRead = 'last_read';
  static const _kBookmarks = 'bookmarks';
  static const _kKhatmahPage = 'khatmah_page';
  static const _kZekrProgress = 'zekr_progress';
  static const _kWirdDays = 'wird_days';
  static const _kTasbih = 'tasbih';
  static const _kLocation = 'location';
  static const _kMethod = 'method';
  static const _kAsrHanafi = 'asr_hanafi';
  static const _kNotif = 'notifications';
  static const _kFontScale = 'font_scale';
  static const _kAudioBase = 'audio_base';

  final SharedPreferences _p;
  LocalStore(this._p);

  static Future<LocalStore> open() async {
    return LocalStore(await SharedPreferences.getInstance());
  }

  // ── المظهر ──
  String get theme => _p.getString(_kTheme) ?? 'dark';
  Future<void> setTheme(String v) => _p.setString(_kTheme, v);
  bool get isLight => theme == 'light';

  double get fontScale => _p.getDouble(_kFontScale) ?? 1.0;
  Future<void> setFontScale(double v) => _p.setDouble(_kFontScale, v);

  // ── آخر موضع قراءة ──
  ({int surah, int verse})? get lastRead {
    final raw = _p.getString(_kLastRead);
    if (raw == null) return null;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return (surah: j['surah'] as int, verse: j['verse'] as int);
    } catch (_) {
      return null;
    }
  }

  Future<void> setLastRead(int surah, int verse) =>
      _p.setString(_kLastRead, jsonEncode({'surah': surah, 'verse': verse}));

  // ── العلامات ──
  List<({int surah, int verse})> get bookmarks {
    final raw = _p.getString(_kBookmarks);
    if (raw == null) return [];
    try {
      return (jsonDecode(raw) as List)
          .map(
            (e) => (
              surah: (e as Map<String, dynamic>)['surah'] as int,
              verse: e['verse'] as int,
            ),
          )
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> toggleBookmark(int surah, int verse) async {
    final list = bookmarks.toList();
    final i = list.indexWhere((b) => b.surah == surah && b.verse == verse);
    if (i >= 0) {
      list.removeAt(i);
    } else {
      list.add((surah: surah, verse: verse));
    }
    await _p.setString(
      _kBookmarks,
      jsonEncode(
        list.map((b) => {'surah': b.surah, 'verse': b.verse}).toList(),
      ),
    );
  }

  bool isBookmarked(int surah, int verse) =>
      bookmarks.any((b) => b.surah == surah && b.verse == verse);

  // ── الختمة ──
  int get khatmahPage => _p.getInt(_kKhatmahPage) ?? 1;
  Future<void> setKhatmahPage(int v) =>
      _p.setInt(_kKhatmahPage, v.clamp(1, 604));

  // ── الأذكار: تقدّم اليوم ──
  Map<String, int> get zekrProgress {
    final raw = _p.getString(_kZekrProgress);
    if (raw == null) return {};
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      final today = todayKey();
      if (j['day'] != today) return {}; // نبدأ العدّ من جديد كل يوم
      return (j['items'] as Map<String, dynamic>).map(
        (k, v) => MapEntry(k, v as int),
      );
    } catch (_) {
      return {};
    }
  }

  Future<void> bumpZekr(String id, int max, int next) async {
    final items = zekrProgress;
    items[id] = next.clamp(0, max);
    await _p.setString(
      _kZekrProgress,
      jsonEncode({'day': todayKey(), 'items': items}),
    );
  }

  // ── الوِرد والاستمرارية ──
  Set<String> get wirdDays {
    final raw = _p.getStringList(_kWirdDays);
    return (raw ?? const <String>[]).toSet();
  }

  Future<void> toggleWirdToday() async {
    final days = wirdDays.toList();
    final t = todayKey();
    if (days.contains(t)) {
      days.remove(t);
    } else {
      days.add(t);
    }
    await _p.setStringList(_kWirdDays, days);
  }

  bool get wirdDoneToday => wirdDays.contains(todayKey());

  int get streak {
    final days = wirdDays;
    var count = 0;
    var d = DateTime.now();
    if (!days.contains(todayKey())) {
      d = d.subtract(const Duration(days: 1));
    }
    for (var i = 0; i < 400; i++) {
      if (days.contains(dayKey(d))) {
        count++;
        d = d.subtract(const Duration(days: 1));
      } else {
        break;
      }
    }
    return count;
  }

  // ── السبحة ──
  ({int count, int target, String phrase}) get tasbih {
    final raw = _p.getString(_kTasbih);
    if (raw == null) return (count: 0, target: 33, phrase: 'سُبْحَانَ اللَّهِ');
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return (
        count: (j['count'] ?? 0) as int,
        target: (j['target'] ?? 33) as int,
        phrase: (j['phrase'] ?? 'سُبْحَانَ اللَّهِ') as String,
      );
    } catch (_) {
      return (count: 0, target: 33, phrase: 'سُبْحَانَ اللَّهِ');
    }
  }

  Future<void> setTasbih({int? count, int? target, String? phrase}) async {
    final cur = tasbih;
    await _p.setString(
      _kTasbih,
      jsonEncode({
        'count': count ?? cur.count,
        'target': target ?? cur.target,
        'phrase': phrase ?? cur.phrase,
      }),
    );
  }

  // ── الموقع والمواقيت ──
  SavedLocation? get location =>
      SavedLocation.fromJsonString(_p.getString(_kLocation));
  Future<void> setLocation(SavedLocation? loc) async {
    if (loc == null) {
      await _p.remove(_kLocation);
    } else {
      await _p.setString(_kLocation, jsonEncode(loc.toJson()));
    }
  }

  String get method => _p.getString(_kMethod) ?? 'MWL';
  Future<void> setMethod(String v) => _p.setString(_kMethod, v);

  bool get asrHanafi => _p.getBool(_kAsrHanafi) ?? false;
  Future<void> setAsrHanafi(bool v) => _p.setBool(_kAsrHanafi, v);

  // ── التنبيهات ──
  ({
    bool enabled,
    bool azan,
    bool morning,
    bool evening,
    String morningTime,
    String eveningTime,
  })
  get notifications {
    final raw = _p.getString(_kNotif);
    if (raw == null) {
      return (
        enabled: false,
        azan: true,
        morning: true,
        evening: true,
        morningTime: '06:30',
        eveningTime: '18:00',
      );
    }
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return (
        enabled: (j['enabled'] ?? false) as bool,
        azan: (j['azan'] ?? true) as bool,
        morning: (j['morning'] ?? true) as bool,
        evening: (j['evening'] ?? true) as bool,
        morningTime: (j['morningTime'] ?? '06:30') as String,
        eveningTime: (j['eveningTime'] ?? '18:00') as String,
      );
    } catch (_) {
      return (
        enabled: false,
        azan: true,
        morning: true,
        evening: true,
        morningTime: '06:30',
        eveningTime: '18:00',
      );
    }
  }

  Future<void> setNotifications({
    bool? enabled,
    bool? azan,
    bool? morning,
    bool? evening,
    String? morningTime,
    String? eveningTime,
  }) async {
    final cur = notifications;
    await _p.setString(
      _kNotif,
      jsonEncode({
        'enabled': enabled ?? cur.enabled,
        'azan': azan ?? cur.azan,
        'morning': morning ?? cur.morning,
        'evening': evening ?? cur.evening,
        'morningTime': morningTime ?? cur.morningTime,
        'eveningTime': eveningTime ?? cur.eveningTime,
      }),
    );
  }

  // ── الصوت ──
  String get audioBaseUrl => _p.getString(_kAudioBase) ?? '';
  Future<void> setAudioBaseUrl(String v) => _p.setString(_kAudioBase, v);

  // ── التصدير/التصفير ──
  Future<void> resetAll() async {
    await _p.clear();
  }

  Map<String, dynamic> exportAll() => {
    'theme': theme,
    'fontScale': fontScale,
    'lastRead': _p.getString(_kLastRead),
    'bookmarks': _p.getString(_kBookmarks),
    'khatmahPage': khatmahPage,
    'zekrProgress': _p.getString(_kZekrProgress),
    'wirdDays': _p.getStringList(_kWirdDays),
    'tasbih': _p.getString(_kTasbih),
    'location': _p.getString(_kLocation),
    'method': method,
    'asrHanafi': asrHanafi,
    'notifications': _p.getString(_kNotif),
    'audioBaseUrl': audioBaseUrl,
  };

  // ── أدوات التواريخ ──
  static String todayKey() => dayKey(DateTime.now());

  static String dayKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
