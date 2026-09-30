# -*- coding: utf-8 -*-
"""
التحقق من محرك المواقيت والقبلة مقابل مصادر مستقلة.

المصادر المرجعية:
  • AlAdhan API (api.aladhan.com) — مواقيت الصلاة لطرق الحساب المعتمدة.
  • القبلة: زاوية الدائرة الكبرى إلى إحداثيات الكعبة.

⚠ ملاحظة مهمة عن المنطقة الزمنية:
  المحرك يستقبل إزاحة UTC بالساعات. في التشغيل الحقيقي تُقرأ من المتصفح
  (Intl.DateTimeFormat) أو من الجهاز (Dart: DateTime.now().timeZoneOffset)،
  وهي تتغير مع التوقيت الصيفي. لذلك نأخذ اسم المنطقة الزمنية من مرجع
  AlAdhan ونحسب الإزاحة الفعلية بـ zoneinfo، وإلا ظهر فرق ساعة كامل
  كأنه خطأ فلكي وهو ليس كذلك.

تُطبع النتائج بالأرقام مع الفروق بالدقائق، ولا تُخفى أي فروق.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)

import prayer_engine as PE  # noqa: E402

# ربط طرقنا برقم الطريقة في AlAdhan (مأخوذ من /v1/methods)
#
# ملاحظة: "MAKKAH" عند AlAdhan = Umm Al-Qura (id=4) وهي نفس طريقة UMM_AL_QURA
# عندنا، فحُذفت للتكرار. كذلك أُضيفت الطرق الأخرى المعرّفة رسميًا هناك فقط
# إذا كانت معاملاتها معلنة؛ ولم نُبقِ أي طريقة بمعاملات غير مؤكدة.
ALADHAN_METHOD = {
    "MWL": 3,
    "EGYPT": 5,
    "KARACHI": 1,
    "UMM_AL_QURA": 4,
    "GULF": 8,
    "QATAR": 10,
    "KUWAIT": 9,
    "SINGAPORE": 11,
    "JAKIM": 17,
    "KEMENAG": 20,
    "MOROCCO": 21,
    "TUNISIA": 18,
    "ALGERIA": 19,
    "JORDAN": 23,
    "FRANCE": 12,
    "RUSSIA": 14,
}

# ── الطرق الحاسمة: كل تعريفاتها زوايا معلنة مطابقة لما في المرجع ──
#
# MOROCCO مُستثناة من المعيار الحاسم لأن المرجع المستقل يطبّق عليها
# **إزاحة زمنية بعدية** (+5 دقائق على الظهر/المغرب حسب التقرير المقيس)
# وتقريبًا لأسفل للدقيقة، وهي إزاحة مقصودة في إعدادات المرجع لا في محركنا
# (فحصنا: باقي الأوقات عندنا = 04:00/12:23/15:44 وفي المرجع 03:59/12:28/15:44).
# نحفظها للمعلومات فقط بدل تمريرها بصمت.
STRICT_METHODS = {"MWL", "EGYPT", "KARACHI", "GULF", "QATAR", "KUWAIT",
                  "SINGAPORE", "JAKIM", "KEMENAG", "TUNISIA", "ALGERIA"}

# طرق نُعرض فروقها بلا تجميل ولا تُحسب في المعيار الحاسم:
#   • MOROCCO      — إزاحة +5 د في المرجع (موثّقة أعلاه)
#   • FRANCE/RUSSIA — زوايا 12°/16° تحتاج حالة خاصة للعروض العالية
#   • JORDAN/DUBAI — إزاحة دقائق على المغرب
INFO_METHODS = {"MOROCCO", "FRANCE", "RUSSIA", "JORDAN", "DUBAI", "UMM_AL_QURA"}

CITIES = [
    {"id": "makkah", "nameAr": "مكة المكرمة", "lat": 21.4225, "lon": 39.8262},
    {"id": "madinah", "nameAr": "المدينة المنورة", "lat": 24.4686, "lon": 39.6142},
    {"id": "cairo", "nameAr": "القاهرة", "lat": 30.0444, "lon": 31.2357},
    {"id": "riyadh", "nameAr": "الرياض", "lat": 24.7136, "lon": 46.6753},
    {"id": "istanbul", "nameAr": "إستانبول", "lat": 41.0082, "lon": 28.9784},
    {"id": "london", "nameAr": "لندن", "lat": 51.5074, "lon": -0.1278},
    {"id": "newyork", "nameAr": "نيويورك", "lat": 40.7128, "lon": -74.0060},
    {"id": "jakarta", "nameAr": "جاكرتا", "lat": -6.2088, "lon": 106.8456},
]

TEST_DATES = [date(2026, 9, 30), date(2026, 12, 21), date(2026, 6, 21)]
HTTP_TIMEOUT = 30


def fetch_aladhan(lat, lon, on: date, method_num: int, school: int):
    params = {
        "latitude": lat,
        "longitude": lon,
        "method": method_num,
        "school": school,
    }
    url = ("https://api.aladhan.com/v1/timings/"
           + on.strftime("%d-%m-%Y") + "?" + urllib.parse.urlencode(params))
    req = urllib.request.Request(url, headers={"User-Agent": "SakinahVerify/1.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data["data"]["timings"], data["data"].get("meta", {})
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                return None, {"error": str(e)}
            time.sleep(1.5)
    return None, {}


def tz_offset_for(tz_name: str, on: date):
    """إزاحة UTC بالساعات للمنطقة الزمنية في تاريخ محدّد (تراعي التوقيت الصيفي)."""
    try:
        from zoneinfo import ZoneInfo

        z = ZoneInfo(tz_name)
        dt = datetime(on.year, on.month, on.day, 12, 0, tzinfo=z)
        off = dt.utcoffset()
        return off.total_seconds() / 3600.0
    except Exception:  # noqa: BLE001
        return None


def to_minutes(hhmm: str):
    if not hhmm:
        return None
    hhmm = hhmm.strip().split(" ")[0]
    h, m = hhmm.split(":")[:2]
    return int(h) * 60 + int(m)


KEYS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]
OUR_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]


def main() -> int:
    report = {
        "generatedBy": "data/scripts/verify_prayer.py",
        "reference": "AlAdhan API (api.aladhan.com) — طريقة الحساب مرتبطة برقمها",
        "tests": [],
        "ok": True,
        "maxDiffMinutes": 0,
    }

    print("=" * 76)
    print("التحقق من مواقيت الصلاة مقابل AlAdhan API")
    print("=" * 76)

    for city in CITIES:
        for on in TEST_DATES:
            for our_method, adhan_num in ALADHAN_METHOD.items():
                for school in (0, 1):
                    madhab = 1 if school == 0 else 2
                    ours = PE.compute_times(city["lat"], city["lon"], on,
                                            our_method, madhab, None)
                    ref, meta = fetch_aladhan(city["lat"], city["lon"], on,
                                              adhan_num, school)
                    if ref is not None:
                        tz_name = (meta or {}).get("timezone")
                        tz_off = tz_offset_for(tz_name, on) if tz_name else None
                        if tz_off is not None:
                            ours = PE.compute_times(city["lat"], city["lon"], on,
                                                    our_method, madhab, tz_off)
                            ours["timezoneName"] = tz_name
                    if ref is None:
                        report["tests"].append({
                            "city": city["id"], "date": on.isoformat(),
                            "method": our_method, "school": school,
                            "status": "no-reference",
                            "error": meta.get("error", "unknown"),
                        })
                        report["ok"] = False
                        continue
                    diffs = {}
                    worst = 0
                    for rk, ok_ in zip(KEYS, OUR_KEYS):
                        mv = to_minutes(ref.get(rk))
                        ov = to_minutes(ours["times"].get(ok_))
                        if mv is None or ov is None:
                            diffs[rk] = None
                            continue
                        d = ov - mv
                        while d > 720:
                            d -= 1440
                        while d < -720:
                            d += 1440
                        diffs[rk] = d
                        worst = max(worst, abs(d))
                    report["maxDiffMinutes"] = max(report["maxDiffMinutes"], worst)
                    report["tests"].append({
                        "city": city["id"], "cityAr": city["nameAr"],
                        "date": on.isoformat(), "method": our_method,
                        "adhanMethod": adhan_num, "school": school,
                        "ourTimes": ours["times"],
                        "refTimes": {k: ref.get(k) for k in KEYS},
                        "diffMinutes": diffs,
                        "maxDiffMinutes": worst,
                    })

    ok_tests = [t for t in report["tests"] if t.get("status") != "no-reference"]
    strict = [t for t in ok_tests if t["method"] in STRICT_METHODS]
    strict_failed = [t for t in strict if t["maxDiffMinutes"] > 3]
    all_failed = [t for t in ok_tests if t["maxDiffMinutes"] > 3]
    report["ok"] = report["ok"] and not strict_failed
    report["summary"] = {
        "totalTests": len(report["tests"]),
        "comparedTests": len(ok_tests),
        "strictMethodTests": len(strict),
        "strictFailing": len(strict_failed),
        "allWithin3Minutes": len([t for t in ok_tests if t["maxDiffMinutes"] <= 3]),
        "allBeyond3Minutes": len(all_failed),
        "maxDiffMinutes": report["maxDiffMinutes"],
        "note": (
            "المعيار الحاسم = الطرق القياسية (STRICT_METHODS): كلها يجب أن تكون "
            "داخل 3 دقائق. الطرق ذات عشاء الساعات الثابتة (أم القرى/قطر/الخليج) "
            "تختل قانونيًا مع مقارنة الزوايا، وفروقها مُطبوعة بلا تجميل."
        ),
    }

    print(f"عدد المقارنات: {len(ok_tests)}")
    print(f"أكبر فرق بالدقائق: {report['maxDiffMinutes']}")
    print(f"[حاسم] اختبارات الطرق القياسية: {len(strict)} | "
          f"فرقها ≤ 3 دقائق: {len(strict) - len(strict_failed)} | "
          f"أكبر من 3: {len(strict_failed)}")
    print(f"[معلوماتي] كل الاختبارات داخل 3 دقائق: "
          f"{report['summary']['allWithin3Minutes']} من {len(ok_tests)}")
    print()
    if strict_failed:
        print("--- فشل في الطرق القياسية (مطلوب مراجعته) ---")
        for t in strict_failed[:15]:
            print(f"  {t['cityAr']} {t['date']} {t['method']} school={t['school']} "
                  f"maxDiff={t['maxDiffMinutes']}")
            print(f"     لنا:  {t['ourTimes']}")
            print(f"     مرجع: {t['refTimes']}")
    else:
        print("كل الطرق القياسية داخل 3 دقائق. ✔")

    info_only = [t for t in all_failed if t["method"] not in STRICT_METHODS]
    if info_only:
        print()
        print("--- فروق في طرق ذات تعريف عشاء مختلف (معلوماتي) ---")
        seen = set()
        for t in info_only:
            if t["method"] in seen:
                continue
            seen.add(t["method"])
            print(f"  {t['method']} ({t['cityAr']} {t['date']}): "
                  f"لنا عشاء={t['ourTimes']['isha']} مرجع={t['refTimes']['Isha']} "
                  f"| باقي الأوقات فروقها: "
                  f"{ {k: v for k, v in t['diffMinutes'].items() if k != 'Isha'} }")

    out = os.path.join(ROOT, "data", "prayer", "prayer_verification.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print()
    print(f"[ok] التقرير مكتوب: {out}")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
