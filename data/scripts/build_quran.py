# -*- coding: utf-8 -*-
"""
بناء بيانات القرآن الأوفلاين + التحقق بمصدرين مستقلّين.

═══════════════════════════════════════════════════════════════════════════
قرار اختيار المصدر — مبني على قياس، لا على افتراض
═══════════════════════════════════════════════════════════════════════════
قارنّا مصدرين مستقلّين لنفس النص (رواية حفص، الرسم العثماني):

  A) fawazahmed0/quran-api  (edition: ara-quranuthmanihaf، ترخيص Unlicense)
  B) risan/quran-json       (ترخيص CC-BY-SA-4.0)

النتائج المقيسة:
  • الحروف والحركات متطابقة تمامًا بين المصدرين: 0 اختلاف في 6236 آية
    (بعد توحيد ترميز الهمزة/الألف/الياء وتطبيع ترتيب العلامات بـ NFD).
  • **لكن المصدر A مكسور في حدود الكلمات**: يضع مسافة بين العلامة والحرف
    داخ الكلمة، فينتج 2418 «كلمة» من حرف واحد (مثل: هُدࣰ ى، نَارࣰ ا)،
    مقابل 3 فقط في المصدر B. واتجاه الفرق أحادي: A يقسّم 1736 آية إلى كلمات
    أكثر، ولا يدمج ولا آية واحدة.

القرار: **B هو نص العرض** (حدود كلمات سليمة)، و**A هو مصدر المقارنة**
(يثبت أن الحروف والحركات لم تُغيَّر). هذا مذكور في meta.json وVERIFICATION.md.

⚠ ملاحظة ترخيص (يلزم قرار المستخدم قبل النشر العام): نص العرض يأتي من مصدر
   بترخيص CC-BY-SA-4.0 (يلزم الإسناد والمشاركة بالمثل)، وليس من المصدر
   Unlicense. تفاصيل في data/SOURCES.md.

التشغيل:  python data/scripts/build_quran.py
المخرجات: data/quran/index.json | data/quran/surah/<n>.json | data/quran/meta.json
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "quran")

EXPECTED_SURAHS = 114
EXPECTED_VERSES = 6236

DISPLAY_SOURCE = "B"
CROSSCHECK_SOURCE = "A"

TATWEEL = "\u0640"
NOISE = re.compile(
    "[\u06DD\u06DE\u06E9\uFD3E\uFD3F\u00AB\u00BB\"'()\\[\\]{}.,:;!?\u060C\u061B\u061F\uFEFF]"
)

# ---------------------------------------------------------------------------
# خريطة أصناف العلامات — توحّد ترميز المصدرين إلى صنف واحد.
#
# اكتُشفت بالقياس: المصدر A يستخدم علامات الرسم العثماني الحديثة
# (U+08F0/08F1/08F2)، والمصدر B يستخدم المقابلة التقليدية
# (U+0657/065E/0656). هذه ليست تكافؤًا معياريًا في Unicode (تحققنا: لا
# decomposition لها)، فالخريطة ضرورية للمقارنة. أي علامة خارج الخريطة
# تُبلَّغ باسم UNMAPPED_* ويُعدّ الفحص فاشلًا.
# ---------------------------------------------------------------------------
MARK_CLASS = {
    0x064E: "fatha", 0x08E4: "fatha", 0x08E5: "fatha",
    0x064F: "damma", 0x08E6: "damma",
    0x0650: "kasra", 0x08E7: "kasra",
    0x064B: "fathatan", 0x08F0: "fathatan", 0x0657: "fathatan",
    0x064C: "dammatan", 0x08F1: "dammatan", 0x065E: "dammatan",
    0x064D: "kasratan", 0x08F2: "kasratan", 0x0656: "kasratan",
    0x0651: "shadda",
    0x0652: "sukun", 0x06E1: "sukun",
    0x0670: "superscript_alef",
    0x0653: "madda", 0x0654: "hamza_above", 0x0655: "hamza_below",
    0x065C: "dot_below",
    0x06D6: "small_high_sad_lam_alef", 0x06D7: "small_high_qaf_lam_alef",
    0x06D8: "small_high_meem", 0x06D9: "small_high_lam_alef",
    0x06DA: "small_high_jeem", 0x06DB: "small_high_three",
    0x06DC: "small_high_seen", 0x06DF: "small_high_rounded_zero",
    0x06E0: "small_high_round_zero", 0x06E2: "small_high_meem_isolated",
    0x06E3: "small_low_seen", 0x06E4: "small_high_madda",
    0x06E7: "small_high_yeh", 0x06E8: "small_high_noon",
    0x06EA: "empty_centre_low_stop", 0x06EB: "empty_centre_high_stop",
    0x06EC: "rounded_high_stop", 0x06ED: "small_low_meem",
}


def load(path: str):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def die(msg: str) -> None:
    print("[FATAL] " + msg)
    sys.exit(1)


# ---------------------------------------------------------------------------
# تطبيع ومقارنة
# ---------------------------------------------------------------------------
def _unifyLetters(text: str) -> str:
    """توحيد الحروف المتكافئة (للمقارنة فقط، لا يُخزَّن)."""
    for src, dst in (("\u0622", "\u0627"), ("\u0623", "\u0627"), ("\u0625", "\u0627"),
                     ("\u0671", "\u0627"), ("\u0624", "\u0648")):
        text = text.replace(src, dst)
    for src in ("\u0649", "\u0626", "\u064A"):
        text = text.replace(src, "\u064A")
    for src in ("\u0629", "\u0647"):
        text = text.replace(src, "\u0647")
    return text.replace("\u0621", "")


def lettersOnly(text: str) -> str:
    """L1: الحروف فقط، بلا مسافات ولا علامات (الهمزة موحّدة معياريًا بـ NFD).

    ملاحظة: نحذف كل أنواع الفراغ (U+0020, U+2009 الرقيقة, U+00A0) لأن
    اختلاف موضع الفراغ بين المصدرين سببه ترميزي بحت، وليس اختلاف نص.
    """
    text = unicodedata.normalize("NFD", text)
    out = [c for c in text
           if not c.isspace()
           and not unicodedata.category(c).startswith("M")
           and unicodedata.category(c) != "Cf" and c != TATWEEL]
    return _unifyLetters(NOISE.sub("", "".join(out)))


def canonicalSignature(text: str) -> str:
    """L3 (أقوى فحص): كل حرف + مجموعة أصناف علاماته، بترتيب العلامات المطبَّع.

    يتجاهل المسافات (لأن موضع المسافة يختلف بين المصدرين لأسباب ترميزية)،
    ويرتّب علامات الحرف الواحد لأن ترتيبها لا يغيّر النص المنطقي.
    """
    text = unicodedata.normalize("NFD", text)
    stack: list[list] = []
    for ch in text:
        if ch.isspace():
            continue
        cat = unicodedata.category(ch)
        if cat == "Cf" or ch == TATWEEL:
            continue
        if cat.startswith("M"):
            cls = MARK_CLASS.get(ord(ch), "UNMAPPED_U+%04X" % ord(ch))
            if not stack:
                stack.append(["\ufffd", []])
            stack[-1][1].append(cls)
            continue
        if NOISE.match(ch):
            continue
        stack.append([_unifyLetters(ch), []])
    return "".join(
        letter + ("{" + ",".join(sorted(marks)) + "}" if marks else "")
        for letter, marks in stack
    )


def wordCount(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def singleLetterWordCount(text: str) -> int:
    n = 0
    for w in text.split():
        core = [c for c in w if not unicodedata.category(c).startswith("M")]
        if len(core) == 1:
            n += 1
    return n


# ---------------------------------------------------------------------------
# تحميل المصادر
# ---------------------------------------------------------------------------
def load_source_a() -> dict:
    """fawazahmed0/quran-api: قائمة مسطّحة 6236 عنصرًا."""
    data = load(os.path.join(RAW, "quran_uthmani.json"))
    verses = data["quran"] if isinstance(data, dict) and "quran" in data else data
    return {(int(i["chapter"]), int(i["verse"])): i["text"] for i in verses}


def load_source_b() -> dict:
    """risan/quran-json: 114 سورة، كل سورة فيها verses."""
    data = load(os.path.join(RAW, "quran_risan.json"))
    out = {}
    for surah in data:
        sid = int(surah["id"])
        for v in surah["verses"]:
            out[(sid, int(v["id"]))] = v["text"]
    return out


def load_index_meta():
    """فهرس السور + الجزء/الصفحة/السجدة لكل آية (من fawaz info.json)."""
    info = load(os.path.join(RAW, "surahs_fawaz.json"))
    surahs, verse_meta = [], {}
    for ch in info["chapters"]:
        sid = int(ch["chapter"])
        verses = ch["verses"]
        surahs.append({
            "number": sid,
            "arabicName": ch["arabicname"],
            "latinName": ch["name"],
            "englishName": ch["englishname"],
            "revelation": "Meccan" if ch["revelation"] == "Mecca" else "Medinan",
            "revelationAr": "مكية" if ch["revelation"] == "Mecca" else "مدنية",
            "verseCount": len(verses),
        })
        for v in verses:
            verse_meta[(sid, int(v["verse"]))] = {
                "juz": int(v["juz"]),
                "page": int(v["page"]),
                "sajda": bool(v.get("sajda", False)),
            }
    surahs.sort(key=lambda s: s["number"])
    return surahs, verse_meta


# ---------------------------------------------------------------------------
# التحقق
# ---------------------------------------------------------------------------
def verify(display: dict, cross: dict, surahs: list) -> dict:
    report = {
        "displaySource": "B: risan/quran-json (CC-BY-SA-4.0, Tanzil-derived Uthmani text)",
        "crossCheckSource": "A: fawazahmed0/quran-api ara-quranuthmanihaf (Unlicense)",
        "checks": [],
        "ok": True,
        "findings": {},
    }

    def check(name, passed, detail):
        report["checks"].append({"name": name, "passed": bool(passed), "detail": detail})
        if not passed:
            report["ok"] = False

    checks = report["checks"]
    n = len(display)

    check("عدد السور = 114", len(surahs) == EXPECTED_SURAHS, f"فهرس السور: {len(surahs)}")
    check("عدد الآيات في نص العرض = 6236", n == EXPECTED_VERSES, f"نص العرض: {n} آية")
    check("عدد الآيات في مصدر المقارنة = 6236", len(cross) == EXPECTED_VERSES,
          f"مصدر المقارنة: {len(cross)} آية")
    check("نفس مجموعة المفاتيح (سورة/آية) في المصدرين", set(display) == set(cross),
          f"فقط في العرض: {len(set(display) - set(cross))} | "
          f"فقط في المقارنة: {len(set(cross) - set(display))}")
    check("لا ازدواج في المفاتيح", len(display) == len(set(display)), "المفاتيح فريدة")
    check("لا نص فارغ", all(v.strip() for v in display.values()), "كل الآيات غير فارغة")

    # عدد الآيات لكل سورة مطابق للفهرس
    bad = []
    for s in surahs:
        got = sum(1 for (sid, _) in display if sid == s["number"])
        if got != s["verseCount"]:
            bad.append({"surah": s["number"], "expected": s["verseCount"], "got": got})
    check("عدد الآيات لكل سورة مطابق للفهرس", not bad, "كل السور مطابقة" if not bad else str(bad))

    # مقارنة النص: الحروف، ثم التوقيع الكامل
    keys = sorted(set(display) & set(cross))
    l1 = [k for k in keys if lettersOnly(display[k]) != lettersOnly(cross[k])]
    l3 = [k for k in keys if canonicalSignature(display[k]) != canonicalSignature(cross[k])]
    check("تطابق الحروف مع مصدر المقارنة (مستوى 1)", not l1,
          f"آيات مختلفة في الحروف: {len(l1)} من {len(keys)}")
    check("تطابق الحروف والحركات مع مصدر المقارنة (مستوى 3)", not l3,
          f"آيات مختلفة: {len(l3)} من {len(keys)}")
    report["sampleDifferences"] = [
        {"surah": k[0], "verse": k[1], "display": display[k], "cross": cross[k]}
        for k in (l3 or l1)[:20]
    ]

    # كل العلامات مصنّفة
    unknown = set()
    for t in list(display.values()) + list(cross.values()):
        for ch in t:
            if unicodedata.category(ch).startswith("M") and ord(ch) not in MARK_CLASS:
                unknown.add("U+%04X" % ord(ch))
    check("لا علامات غير معروفة في خريطة الأصناف", not unknown,
          "كل العلامات مصنّفة" if not unknown else f"مجاهيل: {sorted(unknown)}")

    # ── نتيجة تشخيصية: عيب حدود الكلمات في المصدر A (سبب اختيار B للعرض) ──
    disp_single = sum(singleLetterWordCount(v) for v in display.values())
    cross_single = sum(singleLetterWordCount(v) for v in cross.values())
    splits = sum(1 for k in keys if wordCount(cross[k]) > wordCount(display[k]))
    merges = sum(1 for k in keys if wordCount(cross[k]) < wordCount(display[k]))
    report["findings"] = {
        "singleLetterWords": {"display": disp_single, "crossCheck": cross_single},
        "versesWhereCrossSplitsMore": splits,
        "versesWhereCrossMergesMore": merges,
        "note": (
            "المصدر A يضع مسافة بين العلامة والحرف داخل الكلمة فينتج كلمات مكسورة "
            "(مثل: هُدࣰ ى)؛ لذلك اختير B لنص العرض. الفرق أحادي الاتجاه: A يقسّم "
            "ولا يدمج أبدًا، وهو دليل على أنه عيب تنسيق لا اختلاف نص."
        ),
    }
    check(
        "نص العرض سليم في حدود الكلمات (الكلمات المفردة ضئيلة)",
        disp_single <= 10,
        f"كلمات من حرف واحد: نص العرض={disp_single} | مصدر المقارنة={cross_single}",
    )
    return report


# ---------------------------------------------------------------------------
# البناء
# ---------------------------------------------------------------------------
def write_json(path: str, obj) -> None:
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def build(display: dict, surahs: list, verse_meta: dict, report: dict) -> None:
    os.makedirs(OUT, exist_ok=True)
    surah_dir = os.path.join(OUT, "surah")
    os.makedirs(surah_dir, exist_ok=True)

    write_json(os.path.join(OUT, "index.json"), {
        "surahCount": len(surahs),
        "verseCount": len(display),
        "surahs": surahs,
    })

    per_surah = defaultdict(list)
    for (sid, vid) in display:
        per_surah[sid].append(vid)
    for sid in sorted(per_surah):
        verses = []
        for vid in sorted(per_surah[sid]):
            m = verse_meta.get((sid, vid), {})
            verses.append({
                "v": vid,
                "t": display[(sid, vid)],
                "juz": m.get("juz"),
                "page": m.get("page"),
                "sajda": m.get("sajda", False),
            })
        write_json(os.path.join(surah_dir, f"{sid}.json"), {"surah": sid, "verses": verses})

    write_json(os.path.join(OUT, "meta.json"), {
        "generatedBy": "data/scripts/build_quran.py",
        "surahCount": len(surahs),
        "verseCount": len(display),
        "displaySource": report["displaySource"],
        "crossCheckSource": report["crossCheckSource"],
        "verificationOk": report["ok"],
        "verificationSummary": {
            "lettersDiffCount": next(
                (c["detail"] for c in report["checks"] if "مستوى 1" in c["name"]), ""),
            "canonicalDiffCount": next(
                (c["detail"] for c in report["checks"] if "مستوى 3" in c["name"]), ""),
        },
        "findings": report["findings"],
        "checks": report["checks"],
        "attribution": (
            "نص القرآن الكريم برواية حفص عن عاصم (الرسم العثماني). "
            "نص العرض: risan/quran-json (CC-BY-SA-4.0، نص منسوب إلى مشروع Tanzil). "
            "المقارنة المرجعية: fawazahmed0/quran-api، إصدار ara-quranuthmanihaf (Unlicense). "
            "تحقق الفرق بين المصدرين: صفر اختلاف في الحروف والحركات بعد التطبيع."
        ),
    })
    write_json(os.path.join(ROOT, "data", "raw", "_verification_report.json"), report)

    print(f"[ok] بُني {len(surahs)} سورة / {len(display)} آية في data/quran")
    for c in report["checks"]:
        print(f"  {'PASS' if c['passed'] else 'FAIL'}  {c['name']} — {c['detail']}")
    print(f"[ok] نتيجة التحقق: {'ناجح' if report['ok'] else 'فاشل'}")


def main() -> int:
    for p in ("quran_uthmani.json", "quran_risan.json", "surahs_fawaz.json"):
        if not os.path.exists(os.path.join(RAW, p)):
            die(f"مصدر مفقود: data/raw/{p}")
    display = load_source_b()
    cross = load_source_a()
    surahs, verse_meta = load_index_meta()
    report = verify(display, cross, surahs)
    build(display, surahs, verse_meta, report)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
