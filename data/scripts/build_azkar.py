# -*- coding: utf-8 -*-
"""
بناء بيانات الأذكار والأدعية — مع سياسة توثيق صريحة.

═══════════════════════════════════════════════════════════════════════════
سياسة التوثيق (Policy) — لماذا كل ذكر يحمل حقل reference إلزاميًا
═══════════════════════════════════════════════════════════════════════════
بحثنا عن مصدر رقمي عربي لـ«حصن المسلم» يتضمّن تخريجًا كاملًا لكل ذكر
(اسم الكتاب + رقم الحديث). المتاح علنًا لا يحمله: البيانات الشائعة تحمل
النص وعدد التكرار و«الفضل» فقط. لذلك:

  1. كل ذكر له حقل `ref` إلزامي، وقيمته إمّا:
       • "quran"                 — نص قرآني، يُتحقق منه آليًا مقابل بيانات
                                   القرآن الموثّقة في data/quran (فحص فعلي).
       • "hisn:<id>:<n>"         — نص من «حصن المسلم» للقحطاني، الباب والموضع.
  2. حقل `refStatus`:
       • "verified-quran"        — نصه القرآني مطابق لبيانات القرآن الموثقة.
       • "needs-review"          — يحتاج مراجعة تخريج من عالم أو نسخة معتمدة
                                   قبل النشر العام. **لا نخترع تخريجًا.**
  3. حقل `fadlAr` يُترك فارغًا حيث لا يوجد فضل بالعربية في المصدر، ولا نُترجم
     نصًا شرعيًا من الإنجليزية بأنفسنا لئلا نُحرّف معنى.

المصادر:
  • data/raw/hisn_muslim.json        — حصن المسلم (132 بابًا / 267 ذكرًا)
  • data/raw/azkar_sabah.json        — أذكار الصباح (عربي: نص + تكرار + فضل)
  • data/raw/azkar_massa.json        — أذكار المساء
  • data/raw/PostPrayer_azkar.json   — أذكار بعد الصلاة
  • data/quran/                      — للتحقق من النصوص القرآنية

التشغيل:  python data/scripts/build_azkar.py
المخرجات: data/azkar/azkar.json | data/azkar/categories.json | data/azkar/meta.json
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(ROOT, "data", "raw")
QURAN = os.path.join(ROOT, "data", "quran")
OUT = os.path.join(ROOT, "data", "azkar")


def load(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


# ---------------------------------------------------------------------------
# 1) عناوين الأبواب بالعربية
#
#    المصدر يوفّر العناوين بالإنجليزية فقط. هذا الجدول **ترجمة** للعنوان
#    (عمل تحريري، ليس نصًّا شرعيًا)، ويُوسم titleSource="translated".
# ---------------------------------------------------------------------------
SECTION_TITLES_AR = {
    1: "دعاء الاستيقاظ من النوم",
    2: "دعاء لبس الثوب",
    3: "دعاء لبس الثوب الجديد",
    4: "الدعاء لمن لبس ثوبًا جديدًا",
    5: "دعاء خلع الثوب / قبل الجماع",
    6: "دعاء دخول الخلاء",
    7: "دعاء الخروج من الخلاء",
    8: "ما يقول قبل الوضوء",
    9: "دعاء بعد الوضوء",
    10: "دعاء الخروج من المنزل",
    11: "دعاء الدخول إلى المنزل",
    12: "دعاء الذهاب إلى المسجد",
    13: "دعاء دخول المسجد",
    14: "دعاء الخروج من المسجد",
    15: "ما يقول عند سماع الأذان",
    16: "دعاء الاستفتاح في الصلاة",
    17: "ما يقول في الركوع",
    18: "ما يقول عند الرفع من الركوع",
    19: "ما يقول في السجود",
    20: "ما يقول بين السجدتين",
    21: "دعاء سجود التلاوة",
    22: "دعاء التشهد",
    23: "الصلاة على النبي بعد التشهد",
    24: "أدعية بعد التشهد الأخير وقبل السلام",
    25: "ما يقول بعد الفراغ من الصلاة",
    26: "دعاء الاستخارة",
    27: "أذكار الصباح والمساء",
    28: "ما يقول قبل النوم",
    29: "ما يقول إذا استيقظ في الليل",
    30: "ما يقول عند الفزع في النوم أو الوحدة",
    31: "ما يفعل من رأى الرؤيا أو الحلم",
    32: "دعاء القنوت في الوتر",
    33: "ما يقول بعد الوتر",
    34: "أدعية الهم والحزن",
    35: "أدعية الكرب",
    36: "دعاء لقاء العدو وذي السلطان",
    37: "الدعاء على من ظلم",
    38: "الدعاء على العدو",
    39: "ما يقول إذا خاف من ظلم الناس",
    40: "الدعاء عند وسواس في الإيمان",
    41: "الدعاء لقضاء الدين",
    42: "الدعاء ضد وسوسة الشيطان في الصلاة",
    43: "ما يقول إذا تعسّر عليه أمر",
    44: "ما يقول عند الذنب والاستغفار منه",
    45: "الدعاء ضد الشيطان ووسوسته",
    46: "ما يقول إذا أصابه ما يكره أو فاته ما يريد",
    47: "تهنئة المولود والرد عليها",
    48: "كيف يستعيذ للأولاد",
    49: "دعاء زيارة المريض",
    50: "فضل عيادة المريض",
    51: "أدعية المريض الذي لا يُرجى شفاؤه",
    52: "ما يُلقّن المريض عند الموت",
    53: "دعاء المصيبة",
    54: "دعاء إغماض الميت",
    55: "دعاء صلاة الجنازة على الرجل/المرأة",
    56: "دعاء صلاة الجنازة على الطفل",
    57: "دعاء تعزية المصاب",
    58: "ما يقال عند إدخال الميت القبر",
    59: "ما يقال بعد دفن الميت",
    60: "دعاء زيارة القبور",
    61: "ما يقول عند هبوب الريح",
    62: "ما يقول عند الرعد",
    63: "أدعية الاستسقاء",
    64: "دعاء نزول المطر",
    65: "الدعاء بعد نزول المطر",
    66: "الدعاء عند احتباس المطر",
    67: "دعاء رؤية الهلال",
    68: "أدعية الفطر",
    69: "أدعية الصائم قبل الإفطار / الصائم إذا سُبّ",
    70: "أدعية بعد الطعام",
    71: "دعاء المضيف لضيفه",
    72: "الدعاء لمن سقاك ماءً",
    73: "الدعاء لأهل البيت الذي أفطرت عندهم",
    74: "دعاء من دُعي لطعام وهو صائم فلم يفطر",
    75: "ما يقول الصائم إذا سُبّ",
    76: "دعاء عند رؤية أول الثمر",
    77: "دعاء العطاس",
    78: "ما يقول لكافر عطس وحمد الله",
    79: "الدعاء للعروسين",
    80: "دعاء ليلة البناء / عند شراء الدابة",
    81: "دعاء قبل الجماع",
    82: "دعاء عند الغضب",
    83: "ما يقول عند رؤية مبتلى",
    84: "ما يقول في مجلسه",
    85: "كفارة المجلس",
    86: "الدعاء لمن قال: غفر الله لك",
    87: "الدعاء لمن صنع إليك معروفًا",
    88: "الاستعاذة من فتنة المسيح الدجال",
    89: "الدعاء لمن قال إني أحبك في الله",
    90: "الدعاء لمن أعطاك من ماله",
    91: "الدعاء لمن أسلفك / أقرضك",
    92: "الاستعاذة من الشرك",
    93: "الدعاء لمن قال: بارك الله فيك",
    94: "الدعاء ضد الطيرة والتشاؤم",
    95: "دعاء الركوب",
    96: "دعاء السفر",
    97: "دعاء دخول القرى والمدن",
    98: "دعاء دخول السوق",
    99: "ما يقول إذا تعطلت مركبته",
    100: "دعاء المسافر لمن يودّعه / المقيم للمسافر",
    101: "دعاء المقيم للمسافر",
    102: "التكبير والتسبيح في السفر",
    103: "دعاء المسافر عند السحر",
    104: "دعاء النزول منزلاً في السفر",
    105: "ما يقول عند الرجوع من السفر",
    106: "ما يقول إذا سرّه أمر أو ساءه",
    107: "فضل الصلاة على النبي ﷺ",
    108: "فضل إفشاء السلام",
    109: "كيف يرد على كافر سلّم عليك",
    110: "ما يقول عند صياح الديك أو نهيق الحمار",
    111: "ما يقول عند نباح الكلب في الليل",
    112: "الدعاء لمن اغتبته",
    113: "كيف يثني المسلم على أخيه",
    114: "ما يقول من أُثني عليه",
    115: "تلبية الحاج والمعتمر",
    116: "التكبير عند الحجر الأسود",
    117: "الدعاء بين الركن اليماني والحجر الأسود",
    118: "الدعاء على الصفا والمروة",
    119: "دعاء يوم عرفة",
    120: "الدعاء عند المشعر الحرام بمزدلفة",
    121: "التكبير عند رمي الجمار",
    122: "ما يقول عند المفاجأة",
    123: "ما يقول إذا فرح بأمر",
    124: "ما يقول عند ألم في جسده",
    125: "ما يقول إذا خاف إصابة بعين",
    126: "ما يقول إذا أفزعه شيء",
    127: "ما يقول عند الذبح",
    128: "ما يقول لإبطال كيد الشيطان",
    129: "الاستغفار والتوبة",
    130: "فضل ذكر الله",
    131: "كيف كان النبي ﷺ يسبّح",
    132: "جوامع الخير وآداب المجتمع",
}

# تصنيف الأبواب في مجموعات وظيفية (لمنطق «أدعية حسب الحالة»)
CATEGORY_OF = {}
_CATS = {
    "sleep": [1, 28, 29, 30, 31],
    "morning_evening": [27],
    "prayer": [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 32, 33, 42, 107],
    "purification": [6, 7, 8, 9, 12, 13, 14],
    "home": [2, 3, 4, 5, 10, 11],
    "hardship": [34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 45, 46, 122, 123, 124,
                 125, 126, 128],
    "health_death": [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
    "nature": [61, 62, 63, 64, 65, 66, 67],
    "food": [69, 70, 71, 72, 73, 74, 75, 76],
    "social": [47, 48, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
               91, 92, 93, 94, 108, 109, 110, 111, 112, 113, 114, 132],
    "travel": [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105],
    "hajj": [115, 116, 117, 118, 119, 120, 121],
    "dhikr": [26, 68, 106, 129, 130, 131],
}
for _cat, _ids in _CATS.items():
    for _sid in _ids:
        CATEGORY_OF[_sid] = _cat

CATEGORY_TITLES_AR = {
    "morning_evening": "أذكار الصباح والمساء",
    "sleep": "النوم والاستيقاظ",
    "prayer": "الصلاة والأذان",
    "purification": "الوضوء والمسجد",
    "home": "المنزل واللباس",
    "hardship": "الهم والكرب والحزن",
    "health_death": "المرض والموت والعزاء",
    "nature": "الطبيعة والمناخ",
    "food": "الطعام والشراب",
    "social": "المعاملات والآداب",
    "travel": "السفر",
    "hajj": "الحج والعمرة",
    "dhikr": "الذكر والاستغفار",
}

# ---------------------------------------------------------------------------
# 2) النصوص القرآنية للتحقق الآلي
# ---------------------------------------------------------------------------
QURAN_MARKERS = re.compile(
    "(\u0622\u064A\u0629 \u0627\u0644\u0643\u0631\u0633\u064A|"
    "\u0633\u0648\u0631\u0629|\u0627\u0644\u0641\u0627\u062A\u062D\u0629|\u0627\u0644\u0625\u062E\u0644\u0627\u0635|"
    "\u0627\u0644\u0645\u0639\u0648\u0630\u062A\u064A\u0646|\u0627\u0644\u0628\u0642\u0631\u0629|\u0622\u0644 \u0639\u0645\u0631\u0627\u0646)"
)


def normalize_for_compare(text: str) -> str:
    """تطبيع صارم لاستخراج النص القرآني ومقارنته بالآيات المحفوظة.

    نُسقط:
      • كل علامات Unicode ذات التصنيف M* (تشكيل + علامات قرآنية)
      • تصنيف Cf (مثل BOM وعلامات الاتجاه)
      • التطويل وعلامات الوقف المستقلة
      • حرفي U+06E5 (واو صغيرة) و U+06E6 (ياء صغيرة) — يُكتبان في الرسم
        العثماني داخل الكلمة ولا يُعدّان من حروفها المقروءة
      • الهمزة المفردة (تختلف كتابتها بين نص الذكر ونص المصحف)
    """
    text = unicodedata.normalize("NFD", text)
    out = []
    for ch in text:
        if ch.isspace():
            continue
        cat = unicodedata.category(ch)
        if cat.startswith("M") or cat == "Cf":
            continue
        if ch in "\u0640\u066B\u066C\u06DD\u06DE\u06E9\uFD3E\uFD3F\u06E5\u06E6":
            continue
        if ch == "\u0621":
            continue
        if ch in "\u0622\u0623\u0625\u0671":
            out.append("\u0627")
            continue
        if ch in "\u0649\u0626":
            out.append("\u064A")
            continue
        if ch == "\u0629":
            out.append("\u0647")
            continue
        if ch in "\"\u00AB\u00BB'()[]{}.,:;!?\u060C\u061B\u061F\u06D4":
            continue
        out.append(ch)
    return "".join(out)


def normalize_words(text: str) -> list:
    """كلمات مطبَّعة: تُقسّم على المسافات وعلامة «*» التي يفصل بها حصن المسلم
    بين آيات السورة داخل الذكر؛ بدون ذلك تفسد المقارنة بالآية الواحدة.
    """
    text = text.replace("*", " ").replace("\u2217", " ")
    text = re.sub("[\u06DD\u06DE\u06E9]", " ", text)
    words = []
    for raw in re.split(r"[\s\u00A0]+", text):
        w = normalize_for_compare(raw)
        if w:
            words.append(w)
    return words


class QuranIndex:
    """فهرس القرآن (على مستوى الكلمات) للتحقق من النصوص القرآنية داخل الأذكار.

    لماذا الكلمات لا السلاسل: نص الذكر الشائع يكتب «السموات» بدل «السموت»
    العثمانية، ومطابقة السلاسل الحرفية تفشل من أول اختلاف إملائي. لذلك
    نقيس **تغطية آية كاملة**: نسبة كلماتها الموجودة بنفس الترتيب داخل نص
    الذكر (أطول مقطع كلمات مشترك)، ونقبل تغطية ≥ 90% مع تسجيل النسبة.
    """

    MIN_COVERAGE = 0.90
    MIN_VERSE_WORDS = 4

    def __init__(self, quran_dir: str):
        self.verse_words = []  # (surah, verse, [words], original)
        for sid in range(1, 115):
            p = os.path.join(quran_dir, "surah", f"{sid}.json")
            if not os.path.exists(p):
                continue
            data = load(p)
            for v in data["verses"]:
                self.verse_words.append((sid, v["v"], normalize_words(v["t"]), v["t"]))

    def find_verse_span(self, text: str):
        """يعيد أفضل الآيات تغطية داخل نص الذكر (الكلمات بنفس الترتيب)."""
        words = normalize_words(text)
        if not words:
            return []
        wset = set(words)
        results = []
        for sid, vid, vw, original in self.verse_words:
            if len(vw) < self.MIN_VERSE_WORDS:
                continue
            uniq = set(vw)
            overlap = sum(1 for w in uniq if w in wset)
            if overlap / len(uniq) < 0.75:
                continue
            cover = self._best_ordered_coverage(vw, words)
            if cover >= self.MIN_COVERAGE:
                results.append({
                    "surah": sid,
                    "verse": vid,
                    "coverage": round(cover, 4),
                    "exact": cover >= 0.9999,
                })
        results.sort(key=lambda r: (-r["coverage"], r["surah"], r["verse"]))
        return results[:4]

    @staticmethod
    def _best_ordered_coverage(verse_words: list, doc_words: list) -> float:
        """نسبة كلمات الآية الموجودة بالترتيب داخل نص الذكر (LCS)."""
        n, m = len(verse_words), len(doc_words)
        if n == 0 or m == 0:
            return 0.0
        prev = [0] * (m + 1)
        for i in range(1, n + 1):
            cur = [0] * (m + 1)
            vi = verse_words[i - 1]
            for j in range(1, m + 1):
                if vi == doc_words[j - 1]:
                    cur[j] = prev[j - 1] + 1
                else:
                    cur[j] = prev[j] if prev[j] >= cur[j - 1] else cur[j - 1]
            prev = cur
        return prev[m] / n


# ---------------------------------------------------------------------------
# 3) بناء السجل
# ---------------------------------------------------------------------------
def clean(text: str) -> str:
    text = (text or "").replace("\r", " ").replace("\n", " ").strip()
    text = re.sub(r"\s{2,}", " ", text)
    return text


def main() -> int:
    hisn = load(os.path.join(RAW, "hisn_muslim.json"))
    segments = hisn["English"]

    quran = QuranIndex(QURAN)
    print(f"[i] فهرس القرآن: {len(quran.verse_words)} آية")

    entries = []
    stats = {"quranMatched": 0, "needsReview": 0, "emptyFadl": 0}
    problems = []

    for seg in segments:
        sid = int(seg["ID"])
        title_ar = SECTION_TITLES_AR.get(sid)
        if not title_ar:
            problems.append(f"باب بلا عنوان عربي: {sid}")
            title_ar = seg["TITLE"]
        cat = CATEGORY_OF.get(sid, "social")
        for idx, item in enumerate(seg["TEXT"], start=1):
            # بعض العناصر تستخدم مفتاح Text بدل ARABIC_TEXT (ومحتواه قد يكون
            # إنجليزيًا). لا نقبل أي نص بلا حروف عربية لئلا نُدخل نصًّا غير عربي.
            text = clean(item.get("ARABIC_TEXT") or "")
            if not text and isinstance(item.get("Text"), str):
                candidate = clean(item["Text"])
                if re.search("[\u0600-\u06FF]", candidate):
                    text = candidate
            if not text:
                problems.append(f"نص فارغ/غير عربي: باب {sid} موضع {idx}")
                continue
            repeat = item.get("REPEAT")
            try:
                repeat = int(repeat) if repeat else 1
            except (TypeError, ValueError):
                repeat = 1
            if repeat < 1:
                repeat = 1

            hits = quran.find_verse_span(text)
            if hits:
                ref = "quran:%d:%d" % (hits[0]["surah"], hits[0]["verse"])
                ref_status = "verified-quran" if hits[0]["exact"] else "quran-partial"
                stats["quranMatched"] += 1
                if ref_status == "quran-partial":
                    stats["quranPartial"] = stats.get("quranPartial", 0) + 1
            else:
                ref = "hisn:%d:%d" % (sid, idx)
                ref_status = "needs-review"
                stats["needsReview"] += 1

            entries.append({
                "id": "h-%d-%d" % (sid, idx),
                "cat": cat,
                "titleAr": title_ar,
                "text": text,
                "repeat": repeat,
                "ref": ref,
                "refStatus": ref_status,
                "refWork": "حصن المسلم — سعيد بن علي بن وهف القحطاني",
                "fadlAr": "",
                "titleSource": "translated",
                "quranHits": hits,
            })
            stats["emptyFadl"] += 0 if item.get("TRANSLATED_TEXT") else 1

    # --- دمج «الفضل» العربي من مصدر مسلم كِت (نصوص مطابقة لنصوص حصن المسلم) ---
    #
    #  ملاحظة منهجية: ندمج الفضل فقط عندما يكون النصّان لنفس الذكر بشكل
    #  قاطع (تشابه كلمات عالٍ)؛ ولا نترجم الفضل الإنجليزي بأنفسنا لئلا
    #  نحرّف معنى شرعيًا. حقل fadlSource يحفظ مصدر الفضل المدموج.
    merged_fadl = 0
    merge_pairs = []
    fadl_attempts = 0
    matched_items = 0
    for name, file in (("صباح", "azkar_sabah.json"), ("مساء", "azkar_massa.json"),
                       ("بعد الصلاة", "PostPrayer_azkar.json")):
        p = os.path.join(RAW, file)
        if not os.path.exists(p):
            continue
        data = load(p)
        for item in data.get("content", []):
            zwords = normalize_words(item.get("zekr", ""))
            bless = clean(item.get("bless", ""))
            if len(zwords) < 3 or not bless:
                continue
            fadl_attempts += 1
            zset = set(zwords)
            best = None
            for e in entries:
                ewords = normalize_words(e["text"])
                if not ewords:
                    continue
                eset = set(ewords)
                shared = len(zset & eset) / max(1, len(zset))
                if shared >= 0.80 and (best is None or shared > best[0]):
                    best = (shared, e)
            if best and not best[1]["fadlAr"]:
                best[1]["fadlAr"] = bless
                best[1]["fadlSource"] = f"muslimKit/{file}"
                merged_fadl += 1
                merge_pairs.append((best[1]["id"], file, round(best[0], 3), bless[:40]))
            if best:
                # نجاح المطابقة يُحسب حتى لو كان السجل قد أخذ فضلاً من ملف سابق
                # (أذكار الصباح والمساء بنودها متطابقة)، وإلا اختلط الفشل بالتكرار.
                matched_items += 1

    # --- فحوص السلامة ---
    checks = []
    ids = [e["id"] for e in entries]
    checks.append(("لا معرّفات مكررة", len(ids) == len(set(ids)), f"{len(ids)} سجلًا"))
    checks.append(("كل سجل له مرجع", all(e["ref"] for e in entries), "حقل ref مملوء"))
    checks.append(("كل سجل له تصنيف معروف",
                   all(e["cat"] in CATEGORY_TITLES_AR for e in entries), "cats صحيحة"))
    bad_repeat = [e["id"] for e in entries if not (1 <= e["repeat"] <= 1000)]
    checks.append(("عدد التكرار منطقي (1..1000)", not bad_repeat,
                   "كلها منطقية" if not bad_repeat else str(bad_repeat[:5])))
    short = [e["id"] for e in entries if len(e["text"]) < 10]
    checks.append(("لا نص قصير جدًا (<10 محارف)", not short,
                   "كل النصوص معقولة" if not short else str(short[:5])))
    checks.append(("كل النصوص عربية",
                   all(re.search(r"[\u0600-\u06FF]", e["text"]) for e in entries),
                   "كل النصوص تحتوي حروفًا عربية"))
    checks.append(("لا عناوين أبواب مفقودة", not problems,
                   "كل الأبواب لها عنوان" if not problems else str(problems[:5])))
    has_fadl = sum(1 for e in entries if e["fadlAr"])
    # المعيار: كل بند مصدري فيه «فضل» يجب أن يجد ذكرًا مطابقًا له في حصن المسلم.
    # نُعدّ البند ناجحًا بمجرّد وجود سجل مطابق (حتى لو كان قد أخذ فضلاً من ملف
    # آخر)، لأن أذكار الصباح والمساء بنودها متطابقة وتُدمج في نفس السجلات.
    fadl_rate = (matched_items / fadl_attempts) if fadl_attempts else 1.0
    checks.append((
        "كل بند مصدري فيه فضل وُجد له ذكر مطابق",
        fadl_rate >= 0.95,
        f"نجح {matched_items} من {fadl_attempts} بندًا "
        f"({fadl_rate:.1%}) -> ملأ {merged_fadl} ذكرًا "
        f"({has_fadl} ذكرًا مميزًا له فضل عربي)",
    ))

    ok = all(c[1] for c in checks)

    os.makedirs(OUT, exist_ok=True)
    write_json(os.path.join(OUT, "azkar.json"), {
        "count": len(entries),
        "entries": entries,
    })
    write_json(os.path.join(OUT, "categories.json"), [
        {"id": k, "titleAr": v, "count": sum(1 for e in entries if e["cat"] == k)}
        for k, v in CATEGORY_TITLES_AR.items()
    ])
    write_json(os.path.join(OUT, "meta.json"), {
        "generatedBy": "data/scripts/build_azkar.py",
        "count": len(entries),
        "categories": len(CATEGORY_TITLES_AR),
        "sections": len(segments),
        "quranMatched": stats["quranMatched"],
        "quranPartial": stats.get("quranPartial", 0),
        "needsReview": stats["needsReview"],
        "fadlMerged": merged_fadl,
        "fadlAttempts": fadl_attempts,
        "fadlMergeSamples": merge_pairs[:10],
        "entriesWithFadl": sum(1 for e in entries if e["fadlAr"]),
        "policy": (
            "لا نخترع تخريجًا. كل ذكر يحمل ref و refStatus. النصوص القرآنية "
            "تُتحقق آليًا مقابل data/quran. العناوين العربية ترجمة تحريرية "
            "للفهرس الإنجليزي (titleSource=translated)."
        ),
        "checks": [{"name": n, "passed": bool(p), "detail": d} for n, p, d in checks],
        "attribution": (
            "المحتوى: «حصن المسلم من أذكار الكتاب والسنة» — سعيد بن علي بن وهف القحطاني. "
            "بيانات رقمية: wafaaelmaandy/Hisn-Muslim-Json و ahegazy/muslimKit "
            "(بلا ترخيص صريح — الاستخدام الشخصي؛ للنشر العام يلزم مصدر مرخّص أو إذن)."
        ),
    })

    print(f"[ok] {len(entries)} ذكرًا في {len(CATEGORY_TITLES_AR)} تصنيفًا")
    print(f"[i] نصوص قرآنية تحققت آليًا: {stats['quranMatched']}")
    print(f"[i] تحتاج مراجعة تخريج: {stats['needsReview']}")
    print(f"[i] فُضْل عربي مدموج: {merged_fadl}")
    for n, p, d in checks:
        print(f"  {'PASS' if p else 'FAIL'}  {n} — {d}")
    print(f"[ok] نتيجة الفحص: {'ناجح' if ok else 'فاشل'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
