// =====================================================================
// سَكِينَة — طبقة البيانات: تحميل ملفات assets والوصول للمحتوى
// كل المحتوى مُضمَّن مع التطبيق، لا تحميل من شبكة، ولا خادم.
// =====================================================================
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'models.dart';

class DataRepository {
  QuranIndex? _index;
  final Map<int, List<Ayah>> _surahCache = {};
  AzkarData? _azkar;
  List<DivineName>? _names;
  List<Situation>? _situations;
  List<City>? _cities;

  QuranIndex? get index => _index;
  AzkarData? get azkar => _azkar;
  List<DivineName>? get names => _names;
  List<Situation>? get situations => _situations;
  List<City>? get cities => _cities;

  Future<Map<String, dynamic>> _loadJson(String path) async {
    final raw = await rootBundle.loadString(path);
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  /// تحميل كل ما يحتاجه التطبيق للفتح الأول.
  Future<void> preload() async {
    _index = QuranIndex.fromJson(
      await _loadJson('assets/data/quran_index.json'),
    );

    final azkarJson = await _loadJson('assets/data/azkar.json');
    final catJson = jsonDecode(
      await rootBundle.loadString('assets/data/azkar_categories.json'),
    ) as List;
    _azkar = AzkarData(
      entries: (azkarJson['entries'] as List)
          .map((e) => ZekrEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      categories: catJson
          .map((e) => AzkarCategory.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

    final namesJson = await _loadJson('assets/data/names99.json');
    _names = (namesJson['names'] as List)
        .map((e) => DivineName.fromJson(e as Map<String, dynamic>))
        .toList();

    final sitJson = await _loadJson('assets/data/situations.json');
    _situations = (sitJson['situations'] as List)
        .map((e) => Situation.fromJson(e as Map<String, dynamic>))
        .toList();

    final citiesJson = await _loadJson('assets/data/cities.json');
    _cities = (citiesJson['cities'] as List)
        .map((e) => City.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Ayah>> surah(int number) async {
    final cached = _surahCache[number];
    if (cached != null) return cached;
    final j = await _loadJson('assets/data/surah_$number.json');
    final verses = (j['verses'] as List)
        .map((e) => Ayah.fromJson(e as Map<String, dynamic>))
        .toList();
    _surahCache[number] = verses;
    return verses;
  }
}

// ---------------------------------------------------------------------
// أدوات نصية عربية: تطبيع للبحث والمقارنة
// ---------------------------------------------------------------------
class ArabicText {
  /// إزالة التشكيل والعلامات القرآنية وتوحيد الألف والياء والتاء.
  static String normalize(String s) {
    var t = s;
    // علامات التشكيل والعلامات القرآنية
    t = t.replaceAll(
      RegExp(r'[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08FF]'),
      '',
    );
    // توحيد الألف
    t = t.replaceAll(RegExp(r'[أإآٱ]'), 'ا');
    // توحيد الياء
    t = t.replaceAll(RegExp(r'[ىئ]'), 'ي');
    // التاء المربوطة
    t = t.replaceAll('ة', 'ه');
    // الهمزة المفردة تُحذف
    t = t.replaceAll('ء', '');
    // مسافات
    t = t.replaceAll(RegExp(r'\s+'), '');
    return t;
  }

  /// تحويل الأرقام إلى عربية-هندية للعرض.
  static String arabicDigits(Object n) {
    const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return n.toString().split('').map((c) {
      final i = int.tryParse(c);
      return i == null ? c : digits[i];
    }).join();
  }
}
