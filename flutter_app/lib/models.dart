// =====================================================================
// سَكِينَة — النماذج (Models)
// كل نموذج يطابق حقول ملفات JSON المُولَّدة في data/ والمتحقّق منها.
// =====================================================================
import 'dart:convert';

class SurahMeta {
  final int number;
  final String arabicName;
  final String latinName;
  final String revelationAr;
  final int verseCount;
  const SurahMeta({
    required this.number,
    required this.arabicName,
    required this.latinName,
    required this.revelationAr,
    required this.verseCount,
  });

  factory SurahMeta.fromJson(Map<String, dynamic> j) => SurahMeta(
    number: j['number'] as int,
    arabicName: j['arabicName'] as String,
    latinName: (j['latinName'] ?? '') as String,
    revelationAr: (j['revelationAr'] ?? '') as String,
    verseCount: j['verseCount'] as int,
  );

  /// اسم السورة بدون كلمة «سُوْرَةُ» — للعرض في العناوين.
  String get shortName => arabicName.replaceFirst(RegExp(r'^سُوْرَةُ\s*'), '');
}

class Ayah {
  final int number;
  final String text;
  final int? juz;
  final int? page;
  final bool sajda;
  const Ayah({
    required this.number,
    required this.text,
    this.juz,
    this.page,
    this.sajda = false,
  });

  factory Ayah.fromJson(Map<String, dynamic> j) => Ayah(
    number: j['v'] as int,
    text: j['t'] as String,
    juz: j['juz'] as int?,
    page: j['page'] as int?,
    sajda: (j['sajda'] ?? false) as bool,
  );
}

class QuranIndex {
  final int surahCount;
  final int verseCount;
  final List<SurahMeta> surahs;
  const QuranIndex({
    required this.surahCount,
    required this.verseCount,
    required this.surahs,
  });

  factory QuranIndex.fromJson(Map<String, dynamic> j) => QuranIndex(
    surahCount: j['surahCount'] as int,
    verseCount: j['verseCount'] as int,
    surahs: (j['surahs'] as List)
        .map((e) => SurahMeta.fromJson(e as Map<String, dynamic>))
        .toList(),
  );

  SurahMeta? byNumber(int n) {
    for (final s in surahs) {
      if (s.number == n) return s;
    }
    return null;
  }
}

/// نص الذكر/الدعاء مع مرجعه ودرجة توثيقه.
class ZekrEntry {
  final String id;
  final String cat;
  final String titleAr;
  final String text;
  final int repeat;
  final String ref;
  final String refStatus;
  final String refWork;
  final String fadlAr;

  const ZekrEntry({
    required this.id,
    required this.cat,
    required this.titleAr,
    required this.text,
    required this.repeat,
    required this.ref,
    required this.refStatus,
    required this.refWork,
    required this.fadlAr,
  });

  factory ZekrEntry.fromJson(Map<String, dynamic> j) => ZekrEntry(
    id: j['id'] as String,
    cat: j['cat'] as String,
    titleAr: (j['titleAr'] ?? '') as String,
    text: j['text'] as String,
    repeat: (j['repeat'] ?? 1) as int,
    ref: (j['ref'] ?? '') as String,
    refStatus: (j['refStatus'] ?? 'needs-review') as String,
    refWork: (j['refWork'] ?? '') as String,
    fadlAr: (j['fadlAr'] ?? '') as String,
  );

  bool get isVerifiedQuran => refStatus.startsWith('quran');
  bool get hasFadl => fadlAr.trim().isNotEmpty;
}

class AzkarCategory {
  final String id;
  final String titleAr;
  final int count;
  const AzkarCategory({
    required this.id,
    required this.titleAr,
    required this.count,
  });

  factory AzkarCategory.fromJson(Map<String, dynamic> j) => AzkarCategory(
    id: j['id'] as String,
    titleAr: j['titleAr'] as String,
    count: (j['count'] ?? 0) as int,
  );
}

class AzkarData {
  final List<ZekrEntry> entries;
  final List<AzkarCategory> categories;
  const AzkarData({required this.entries, required this.categories});
}

/// دليل (آية/حديث) مع مرجعه. refSource يوضّح هل المرجع من المصدر
/// أو استُنتج بالتحقق الآلي أو لم يوجد.
class Evidence {
  final String text;
  final String source;
  final String refSource;
  const Evidence({
    required this.text,
    required this.source,
    required this.refSource,
  });

  factory Evidence.fromJson(Map<String, dynamic> j) => Evidence(
    text: (j['text'] ?? '') as String,
    source: (j['source'] ?? '') as String,
    refSource: (j['refSource'] ?? '') as String,
  );

  bool get hasSource => source.trim().isNotEmpty;
  bool get isInferred => refSource == 'inferred-verified';
}

class DivineName {
  final int id;
  final String name;
  final String meaning;
  final String brief;
  final String explanation;
  final List<Evidence> quranEvidence;
  final List<Evidence> hadithEvidence;
  final String scholarlyStatements;
  final List<String> sources;
  final String bookReference;
  final String evidenceStatus;

  const DivineName({
    required this.id,
    required this.name,
    required this.meaning,
    required this.brief,
    required this.explanation,
    required this.quranEvidence,
    required this.hadithEvidence,
    required this.scholarlyStatements,
    required this.sources,
    required this.bookReference,
    required this.evidenceStatus,
  });

  factory DivineName.fromJson(Map<String, dynamic> j) => DivineName(
    id: j['id'] as int,
    name: j['name'] as String,
    meaning: (j['meaning'] ?? '') as String,
    brief: (j['brief'] ?? '') as String,
    explanation: (j['explanation'] ?? '') as String,
    quranEvidence: ((j['quranEvidence'] ?? []) as List)
        .map((e) => Evidence.fromJson(e as Map<String, dynamic>))
        .toList(),
    hadithEvidence: ((j['hadithEvidence'] ?? []) as List)
        .map((e) => Evidence.fromJson(e as Map<String, dynamic>))
        .toList(),
    scholarlyStatements: (j['scholarlyStatements'] ?? '') as String,
    sources: ((j['sources'] ?? []) as List).map((e) => '$e').toList(),
    bookReference: (j['bookReference'] ?? '') as String,
    evidenceStatus: (j['evidenceStatus'] ?? '') as String,
  );

  bool get hasNoEvidenceInSource => evidenceStatus == 'none-in-source';
}

class Situation {
  final String id;
  final String titleAr;
  final String descAr;
  final String icon;
  final List<String> categories;
  final List<String> entryIds;
  const Situation({
    required this.id,
    required this.titleAr,
    required this.descAr,
    required this.icon,
    required this.categories,
    required this.entryIds,
  });

  factory Situation.fromJson(Map<String, dynamic> j) => Situation(
    id: j['id'] as String,
    titleAr: j['titleAr'] as String,
    descAr: (j['descAr'] ?? '') as String,
    icon: (j['icon'] ?? 'handHeart') as String,
    categories: ((j['categories'] ?? []) as List).map((e) => '$e').toList(),
    entryIds: ((j['entryIds'] ?? []) as List).map((e) => '$e').toList(),
  );
}

class City {
  final String id;
  final String nameAr;
  final double lat;
  final double lon;
  final double? tz;
  const City({
    required this.id,
    required this.nameAr,
    required this.lat,
    required this.lon,
    this.tz,
  });

  factory City.fromJson(Map<String, dynamic> j) => City(
    id: j['id'] as String,
    nameAr: j['nameAr'] as String,
    lat: (j['lat'] as num).toDouble(),
    lon: (j['lon'] as num).toDouble(),
    tz: (j['tz'] as num?)?.toDouble(),
  );
}

/// موقع المستخدم المحفوظ محليًا.
class SavedLocation {
  final double lat;
  final double lon;
  final String label;
  final String source; // gps | preset
  const SavedLocation({
    required this.lat,
    required this.lon,
    required this.label,
    required this.source,
  });

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lon': lon,
    'label': label,
    'source': source,
  };

  static SavedLocation? fromJsonString(String? s) {
    if (s == null || s.isEmpty) return null;
    try {
      final j = jsonDecode(s) as Map<String, dynamic>;
      return SavedLocation(
        lat: (j['lat'] as num).toDouble(),
        lon: (j['lon'] as num).toDouble(),
        label: (j['label'] ?? '') as String,
        source: (j['source'] ?? '') as String,
      );
    } catch (_) {
      return null;
    }
  }
}
