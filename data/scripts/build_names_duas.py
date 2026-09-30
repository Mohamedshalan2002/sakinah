# -*- coding: utf-8 -*-
"""
بناء بيانات أسماء الله الحسنى + أدعية الأحوال (حسب الحالة).

═══════════════════════════════════════════════════════════════════════════
مصادر هذه المرحلة
═══════════════════════════════════════════════════════════════════════════
  • data/raw/asma_allah.json — 99 اسمًا من كتاب «شرح أسماء الله الحسنى في ضوء
    الكتاب والسنة» للقحطاني، عبر rn0x/Names_Of_Allah_Json (ترخيص **MIT**).
    يحمل: الاسم، المعنى، الشرح، الدليل من القرآن، الدليل من السنة، أقوال
    العلماء، المصادر، المرجع الكتابي. **نحفظ كل ذلك** ونخزّن شرحًا مختصرًا
    للعرض السريع + الشرح الكامل لشاشة التفصيل.
  • أدعية الأحوال: تُبنى من نفس بيانات الأذكار (data/azkar/azkar.json) بحسب
    التصنيف، فلا نُدخل نصوصًا جديدة بلا مصدر.

سياسة التوثيق (كما في build_azkar.py): لا نخترع نصًّا ولا تخريجًا، وكل مدخل
يحمل مرجعه، ودرجة التوثيق مذكورة صراحة.

التشغيل:  python data/scripts/build_names_duas.py
المخرجات: data/names/names99.json | data/names/situations.json
"""
from __future__ import annotations

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(ROOT, "data", "raw")
AZKAR = os.path.join(ROOT, "data", "azkar")
OUT = os.path.join(ROOT, "data", "names")


def load(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


# ---------------------------------------------------------------------------
# «أدعية حسب الحالة» — خريطة الحالات الإنسانية إلى تصنيفات الأذكار
#
# ملاحظة: هذه خريطة تنظيمية (من أي باب يُؤخذ الدعاء)، وليست نصًّا شرعيًا
# جديدًا. كل دعاء يظهر بمصدره من بيانات الأذكار.
# ---------------------------------------------------------------------------
SITUATIONS = [
    {
        "id": "hamm", "titleAr": "الهمّ والغمّ", "icon": "cloud-rain",
        "descAr": "إذا ضاق صدرك وتراكم الغمّ",
        "cats": ["hardship"], "keywords": ["الهم", "الحزن", "الكرب", "الغم", "ضاق"],
    },
    {
        "id": "qalaq", "titleAr": "القلق والخوف", "icon": "shield",
        "descAr": "إذا اعتراك خوف أو قلق أو فزع",
        "cats": ["hardship", "sleep"], "keywords": ["خوف", "فزع", "أمن", "الوسواس"],
    },
    {
        "id": "safar", "titleAr": "السفر", "icon": "route",
        "descAr": "دعاء الركوب والسفر والعودة",
        "cats": ["travel"], "keywords": ["السفر", "الركوب", "المسافر"],
    },
    {
        "id": "marad", "titleAr": "المرض والشفاء", "icon": "heart-pulse",
        "descAr": "دعاء للمريض وعند الألم وزيارة المريض",
        "cats": ["health_death"], "keywords": ["المريض", "ألم", "شفاء", "عيادة"],
    },
    {
        "id": "dhanb", "titleAr": "الذنب والاستغفار", "icon": "hand-heart",
        "descAr": "إذا أذنبت فتريد التوبة والاستغفار",
        "cats": ["dhikr", "hardship"], "keywords": ["الذنب", "الاستغفار", "التوبة"],
    },
    {
        "id": "deen", "titleAr": "قضاء الدين", "icon": "coins",
        "descAr": "دعاء لقضاء الدين وتفريج الهمّ المالي",
        "cats": ["hardship"], "keywords": ["الدين", "القرض", "الغرم"],
    },
    {
        "id": "istikharah", "titleAr": "الاستخارة وقرار", "icon": "compass",
        "descAr": "إذا احترت في أمر تريد اختيارًا صحيحًا",
        "cats": ["dhikr", "prayer"], "keywords": ["الاستخارة", "تعسّر", "أمر"],
    },
    {
        "id": "walad", "titleAr": "الأولاد والأهل", "icon": "users",
        "descAr": "دعاء للأولاد وتهنئة المولود",
        "cats": ["social", "health_death"], "keywords": ["الأولاد", "المولود", "الأهل"],
    },
    {
        "id": "rizq", "titleAr": "الرزق والبركة", "icon": "sprout",
        "descAr": "دعاء بالرزق الطيب والبركة",
        "cats": ["food", "dhikr"], "keywords": ["الرزق", "البركة", "طعام"],
    },
    {
        "id": "salah", "titleAr": "خشوع في الصلاة", "icon": "mosque",
        "descAr": "أدعية الصلاة والاستفتاح والتشهد",
        "cats": ["prayer", "purification"], "keywords": ["الصلاة", "التشهد", "الاستفتاح"],
    },
]


def as_text(value) -> str:
    """يوحّد الحقل إلى نص: بعض الحقول في المصدر قوائم لا نصوص."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple)):
        parts = []
        for item in value:
            if isinstance(item, str):
                parts.append(item.strip())
            elif isinstance(item, dict):
                parts.append(" — ".join(
                    str(v).strip() for v in item.values() if isinstance(v, str)))
            elif item is not None:
                parts.append(str(item))
        return "\n".join(p for p in parts if p)
    if isinstance(value, dict):
        return "\n".join(f"{k}: {v}" for k, v in value.items())
    return str(value).strip()


def as_evidence(value) -> list:
    """يوحّد حقل الأدلة إلى قائمة من {text, source}.

    بنية المصدر: [{text: "نص الدليل", source: "سورة كذا، الآية: س ٣"}] أو
    [{text, source}] مع حقول أخرى. نحفظ النص والمصدر معًا لأن التخريج
    هو المقصود، فلا يبقى نص بلا مرجعه.
    """
    if not value:
        return []
    items = value if isinstance(value, (list, tuple)) else [value]
    out = []
    for it in items:
        if isinstance(it, dict):
            text = as_text(it.get("text") or it.get("evidence") or it.get("نص"))
            source = as_text(it.get("source") or it.get("reference") or it.get("مرجع"))
            extra = " — ".join(
                as_text(v) for k, v in it.items()
                if k not in ("text", "source", "evidence", "reference", "نص", "مرجع")
                and as_text(v))
            if source and extra:
                source = source + " — " + extra
            elif extra and not source:
                source = extra
            if text or source:
                out.append({"text": text, "source": source})
        else:
            t = as_text(it)
            if t:
                out.append({"text": t, "source": ""})
    return out


def as_list(value) -> list:
    """يوحّد الحقل إلى قائمة نصوص."""
    if value is None:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, (list, tuple)):
        return [as_text(v) for v in value if as_text(v)]
    if isinstance(value, dict):
        return [f"{k}: {v}" for k, v in value.items()]
    return [str(value)]


def count_words(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def first_sentences(text: str, limit: int = 160) -> str:
    """مقطع مختصر للعرض: من بداية المعنى/الشرح دون قطع كلمة."""
    text = re.sub(r"\s+", " ", text).strip()
    # نفضّل المقطع قبل أول رقم تعداد أو سطر جديد
    cut = re.split(r"(?<=[.؟!])\s", text)
    out = ""
    for part in cut:
        if len(out) + len(part) > limit and out:
            break
        out = (out + " " + part).strip()
    if not out:
        out = text[:limit]
        if " " in out:
            out = out[: out.rfind(" ")]
    return out.strip()


def main() -> int:
    asma = load(os.path.join(RAW, "asma_allah.json"))
    azkar = load(os.path.join(AZKAR, "azkar.json"))["entries"]
    cats = {c["id"]: c for c in load(os.path.join(AZKAR, "categories.json"))}

    # فهرس القرآن: نستعمله لاستنتاج مرجع أي دليل قرآني لا يُذكر مصدره في
    # الأصل. هذا **تحقق آلي** لا اختراع: نقبل المطابقة فقط إذا وُجدت الآية
    # كاملة في بيانات القرآن المتحقق منها عندنا.
    sys.path.insert(0, HERE)
    import build_azkar as BA  # noqa: E402

    quran = BA.QuranIndex(os.path.join(ROOT, "data", "quran"))

    checks = []
    problems = []
    inferred_refs = 0

    # ── 1) الأسماء الحسنى ──
    names = []
    for item in asma:
        nid = int(item["id"])
        name = as_text(item.get("name_arabic")) or as_text(item.get("name"))
        meaning = as_text(item.get("meaning"))
        if not name:
            problems.append(f"اسم بلا نص: {nid}")
            continue
        # ── استنتاج مراجع الأدلة القرآنية التي لا يذكرها المصدر ──
        def resolve(ev_list, is_quran: bool):
            nonlocal inferred_refs
            out = []
            for e in ev_list:
                item = {"text": e["text"],
                        "source": e["source"],
                        "refSource": "in-source" if e["source"] else "unresolved"}
                if not item["source"] and is_quran and item["text"]:
                    hits = quran.find_verse_span(item["text"])
                    exact = [h for h in hits if h["coverage"] >= 0.9999]
                    if exact:
                        h = exact[0]
                        item["source"] = "سورة %d، الآية %d" % (h["surah"], h["verse"])
                        item["refSource"] = "inferred-verified"
                        item["inferredSurah"] = h["surah"]
                        item["inferredVerse"] = h["verse"]
                        inferred_refs += 1
                out.append(item)
            return out

        quran_ev = resolve(as_evidence(item.get("quran_evidence")), True)
        hadith_ev = resolve(as_evidence(item.get("hadith_evidence")), False)
        # درجة توثيق الدليل: مفصولة صراحةً ولا تُجمّل. المرجع نفسه لا يحتوي
        # دليلًا لاسمين (المؤمن، المهيمن) — نوسم ذلك بدل حشو نص من عندنا.
        if quran_ev and hadith_ev:
            evidenceStatus = "quran+hadith"
        elif quran_ev:
            evidenceStatus = "quran"
        elif hadith_ev:
            evidenceStatus = "hadith"
        else:
            evidenceStatus = "none-in-source"

        names.append({
            "id": nid,
            "name": name,
            "namePlain": as_text(item.get("name")),
            "meaning": meaning,
            "brief": first_sentences(meaning, 150),
            "explanation": as_text(item.get("explanation")),
            "quranEvidence": quran_ev,
            "hadithEvidence": hadith_ev,
            "evidenceStatus": evidenceStatus,
            "scholarlyStatements": as_text(item.get("scholarly_statements")),
            "sources": as_list(item.get("sources")),
            "relatedNames": as_list(item.get("related_names")),
            "bookReference": as_text(item.get("book_reference")),
        })

    names.sort(key=lambda n: n["id"])
    checks.append(("عدد الأسماء = 99", len(names) == 99, f"عدد الأسماء: {len(names)}"))
    checks.append(("لا اسم بلا معنى", all(n["meaning"] for n in names),
                   "كل الأسماء لها معنى"))
    checks.append(("لا تكرار في أرقام الأسماء",
                   len({n["id"] for n in names}) == len(names), "الأرقام فريدة"))
    checks.append(("كل اسم له مرجع كتابي", all(n["bookReference"] for n in names),
                   f"مثال: {names[0]['bookReference'][:70]}"))
    no_ev = [n["name"] for n in names if n["evidenceStatus"] == "none-in-source"]
    checks.append((
        "كل اسم له دليل قرآن/سنة أو موسوم صراحةً بانعدامه في المصدر",
        len(no_ev) <= 3,
        (f"{len(names) - len(no_ev)} من {len(names)} لها دليل — "
         f"وبدون دليل في المصدر: {no_ev}") if no_ev
        else "كل الأسماء لها دليل",
    ))
    no_src = [n["id"] for n in names
              if (n["quranEvidence"] and not all(e["source"] for e in n["quranEvidence"]))
              or (n["hadithEvidence"] and not all(e["source"] for e in n["hadithEvidence"]))]
    checks.append((
        "كل دليل له مرجع أو موسوم صراحةً بلا مرجع في المصدر",
        len(no_src) <= 8,
        (f"{len(names) - len(no_src)} من {len(names)} كل أدلتها بمرجع — "
         f"وأدلة بلا مرجع في الأصل: {no_src[:8]}") if no_src
        else "كل الأدلة لها مراجع",
    ))
    dup_names = [n["name"] for n in names if
                 sum(1 for m in names if m["name"] == n["name"]) > 1]
    checks.append(("لا تكرار في نص الاسم", not dup_names,
                   "كل الأسماء مختلفة" if not dup_names else str(set(dup_names))))

    # ── 2) أدعية الأحوال ──
    situations = []
    for s in SITUATIONS:
        picked = []
        seen = set()
        for cat in s["cats"]:
            for e in azkar:
                if e["cat"] != cat or e["id"] in seen:
                    continue
                hits = s["keywords"]
                score = 0
                hay = e["titleAr"] + " " + e["text"][:120]
                for kw in hits:
                    if kw in hay:
                        score += 2
                if score == 0:
                    continue
                seen.add(e["id"])
                picked.append({"entry": e["id"], "score": score})
        picked.sort(key=lambda p: -p["score"])
        ids = [p["entry"] for p in picked[:12]]
        by_id = {e["id"]: e for e in azkar}
        situations.append({
            "id": s["id"],
            "titleAr": s["titleAr"],
            "descAr": s["descAr"],
            "icon": s["icon"],
            "categories": [cats[c]["titleAr"] for c in s["cats"] if c in cats],
            "entryIds": ids,
            "repeatTotal": sum(by_id[i]["repeat"] for i in ids),
        })

    empty = [s["id"] for s in situations if not s["entryIds"]]
    checks.append(("كل حالة لها أدعية مرتبطة", not empty,
                   "كل الحالات ممتلئة" if not empty else str(empty)))
    checks.append(("لا تكرار لدعاء داخل نفس الحالة",
                   all(len(s["entryIds"]) == len(set(s["entryIds"])) for s in situations),
                   "لا تكرار"))
    checks.append(("عدد الحالات كافٍ", len(situations) >= 8,
                   f"عدد الحالات: {len(situations)}"))

    ok = all(c[1] for c in checks) and not problems

    os.makedirs(OUT, exist_ok=True)
    write_json(os.path.join(OUT, "names99.json"), {"count": len(names), "names": names})
    write_json(os.path.join(OUT, "situations.json"),
               {"count": len(situations), "situations": situations})
    write_json(os.path.join(OUT, "meta.json"), {
        "generatedBy": "data/scripts/build_names_duas.py",
        "namesCount": len(names),
        "situationsCount": len(situations),
        "evidenceInferredRefs": inferred_refs,
        "checks": [{"name": n, "passed": bool(p), "detail": d} for n, p, d in checks],
        "problems": problems,
        "policy": (
            "حقول الأدلة تأتي من المصدر بمرجعها (refSource=in-source). وحيث لم "
            "يذكر المصدر مرجعًا لدليل قرآني، نستنتج الآية **بالتحقق الآلي** مقابل "
            "بيانات القرآن المتحقق منها (refSource=inferred-verified) ولا نقبل إلا "
            "بتطابق كامل. الأدلة الحديثية بلا مرجع تبقى موسومة unresolved، ولا "
            "نخترع لها تخريجًا."
        ),
        "attribution": (
            "أسماء الله الحسنى: من كتاب «شرح أسماء الله الحسنى في ضوء الكتاب والسنة» "
            "— سعيد بن علي بن وهف القحطاني، عبر rn0x/Names_Of_Allah_Json "
            "(ترخيص MIT). الأدعية حسب الحالة مُنتقاة من نفس بيانات الأذكار "
            "(حصن المسلم) بترتيب تنظيمي، وليست نصوصًا جديدة."
        ),
    })

    print(f"[ok] {len(names)} اسمًا + {len(situations)} حالة")
    print(f"[i] مراجع مستنتجة آليًا بالتحقق من القرآن: {inferred_refs}")
    for n, p, d in checks:
        print(f"  {'PASS' if p else 'FAIL'}  {n} — {d}")
    if problems:
        print("مشاكل:", problems[:5])
    print(f"[ok] نتيجة الفحص: {'ناجح' if ok else 'فاشل'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
