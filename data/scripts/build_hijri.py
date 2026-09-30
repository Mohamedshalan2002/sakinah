# -*- coding: utf-8 -*-
"""
توليد جدول تحويل التاريخ الميلادي ↔ الهجري (تقويم أم القرى).

لماذا هذا السكربت:
  التطبيق يعمل أوفلاين بالكامل، فلا يمكنه الاعتماد على خادم لمعرفة التاريخ
  الهجري. ولا نريد تقويمًا حسابيًا تقريبيًا (كالذي يعطي فرقًا يومًا أو يومين
  عن التقويم الرسمي). لذلك نُجمّد جدول أم القرى الرسمي داخليًا.

المنهج:
  جدول أم القرى يعرّف كل شهر هجري بطول أيامه (29 أو 30). نستخرج لكل سنة
  هجرية 12 قيمة ثنائية، فنضغطها في سلسلة hex من 3 محارف لكل سنة (12 بت).
  النتيجة: ملف صغير جدًا يعمل بلا شبكة وبدقة أم القرى.

مثال على الترميز: 0xABC -> 1010 1011 1100
  البت الأعلى = الشهر الأول (محرم)… البت الأدنى = الشهر الثاني عشر.
  البت = 1 يعني 30 يومًا، و0 يعني 29 يومًا.

التشغيل: python data/scripts/build_hijri.py
المخرجات: web/data/hijri.json
"""
from __future__ import annotations

import json
import os
import sys

from hijri_converter import Gregorian, Hijri

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "web", "data", "hijri.json")

# نطاق التغطية: 70 سنة هجرية حول اليوم الحالي (كافٍ لعشرات السنين)
YEARS_BACK = 40
YEARS_FORWARD = 30

MONTH_NAMES_AR = [
    "مُحَرَّم", "صَفَر", "رَبيع الأوَّل", "رَبيع الآخِر",
    "جُمادى الأولى", "جُمادى الآخِرة", "رَجَب", "شَعْبان",
    "رَمَضان", "شَوَّال", "ذو القَعْدة", "ذو الحِجّة",
]

# المناسبات الإسلامية (شهر، يوم) — تُعلَن كتذكير لا كحكم
OCCASIONS = [
    {"m": 1, "d": 1, "titleAr": "رأس السنة الهجرية"},
    {"m": 1, "d": 10, "titleAr": "يوم عاشوراء"},
    {"m": 3, "d": 12, "titleAr": "المولد النبوي"},
    {"m": 7, "d": 27, "titleAr": "الإسراء والمعراج"},
    {"m": 8, "d": 15, "titleAr": "ليلة النصف من شعبان"},
    {"m": 9, "d": 1, "titleAr": "أول رَمَضان"},
    {"m": 9, "d": 27, "titleAr": "ليلة القدر (المرجّحة)"},
    {"m": 10, "d": 1, "titleAr": "عيد الفطر"},
    {"m": 12, "d": 9, "titleAr": "يوم عَرَفة"},
    {"m": 12, "d": 10, "titleAr": "عيد الأضحى"},
]


def main() -> int:
    today = Hijri.today()
    start_year = today.year - YEARS_BACK
    end_year = today.year + YEARS_FORWARD

    encoded = []
    table = {}
    warnings = []
    total_months = 0

    for y in range(start_year, end_year + 1):
        bits = 0
        months = []
        for m in range(1, 13):
            try:
                ml = Hijri(y, m, 1).month_length()
            except Exception as e:  # noqa: BLE001
                warnings.append(f"{y}-{m}: {e}")
                ml = 29
            if ml not in (29, 30):
                warnings.append(f"{y}-{m}: طول غير معتاد {ml}")
            months.append(ml)
            total_months += 1
            # البت الأعلى للشهر الأول
            bits = (bits << 1) | (1 if ml == 30 else 0)
        encoded.append(format(bits & 0xFFF, "03X"))
        table[str(y)] = months

    payload = {
        "generatedBy": "data/scripts/build_hijri.py",
        "calendar": "أم القرى (Umm al-Qura) عبر hijri-converter",
        "startYear": start_year,
        "endYear": end_year,
        # نقطة الإسناد: التاريخ الميلادي المقابل لأول يوم من سنة البداية
        # الهجرية. نحقنها في البيانات حتى يعمل التحويل أوفلاين بلا اعتماد
        # على دعم المتصفح لتقويم islamic-umalqura في Intl (غير متوفّر في كل
        # المتصفحات، وكان سيجعل التطبيق يفشل في متصفحات قديمة).
        "anchorGregorian": Hijri(start_year, 1, 1).to_gregorian().isoformat(),
        "anchorHijri": {"y": start_year, "m": 1, "d": 1},
        "monthNames": MONTH_NAMES_AR,
        "monthsHex": "".join(encoded),
        "occasions": OCCASIONS,
        "note": (
            "جدول أطوال الأشهر الهجرية وفق تقويم أم القرى الرسمي. "
            "كل 3 محارف hex تمثل سنة واحدة (12 بت = 12 شهرًا)، "
            "البت الأعلى للشهر الأول، والبت=1 يعني 30 يومًا. "
            "anchorGregorian هو أول يوم من anchorHijri."
        ),
        "checks": {
            "yearsCovered": end_year - start_year + 1,
            "monthsCovered": total_months,
            "hexLength": len("".join(encoded)),
            "hexLengthMatchesYears": len("".join(encoded)) == (end_year - start_year + 1) * 3,
        },
        "warnings": warnings,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size = os.path.getsize(OUT)
    print(f"[ok] جدول أم القرى: {start_year}..{end_year} "
          f"({payload['checks']['yearsCovered']} سنة / {total_months} شهرًا)")
    print(f"[ok] الحجم: {size} بايت")
    print(f"[ok] طول الـhex صحيح: {payload['checks']['hexLengthMatchesYears']}")
    if warnings:
        print(f"[!] تحذيرات: {len(warnings)}")
        for w in warnings[:5]:
            print("    " + w)
    else:
        print("[ok] لا تحذيرات")

    # ── تحقق ١: فك ترميز عام ونقارنته بالجدول الأصلي ──
    check_year = today.year
    idx = table[str(check_year)]
    bits = int(encoded[check_year - start_year], 16)
    decoded = []
    for i in range(12):
        decoded.append(30 if ((bits >> (11 - i)) & 1) else 29)
    hex_ok = decoded == idx
    print(f"[تحقق] فك ترميز عام {check_year}: "
          f"{'مطابق ✔' if hex_ok else 'غير مطابق ✘'}")

    # ── تحقق ٢: نقطة الإسناد تُعيد نفس التاريخ الذي طُلب ──
    anchor = payload["anchorGregorian"]
    back = Gregorian.fromisoformat(anchor).to_hijri()
    anchor_ok = (back.year, back.month, back.day) == (start_year, 1, 1)
    print(f"[تحقق] نقطة الإسناد {anchor} -> {back.year}/{back.month}/{back.day}: "
          f"{'مطابق ✔' if anchor_ok else 'غير مطابق ✘'}")

    return 0 if (hex_ok and anchor_ok and not warnings) else 1


if __name__ == "__main__":
    sys.exit(main())
