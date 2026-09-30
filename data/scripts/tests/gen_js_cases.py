# -*- coding: utf-8 -*-
"""
توليد حالات اختبار لمحرك المواقيت في JavaScript من محرك Python.

الهدف: إثبات أن محرك JS (المستخدم في تطبيق الويب) يُنتج نفس نتائج محرك
Python المتحقّق منه مقابل AlAdhan — أي أن الترجمة لم تُدخل أخطاء.
"""
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.abspath(os.path.join(HERE, ".."))
ROOT = os.path.abspath(os.path.join(SCRIPTS, "..", ".."))
sys.path.insert(0, SCRIPTS)

import prayer_engine as PE  # noqa: E402

CITIES = [
    {"id": "makkah", "lat": 21.4225, "lon": 39.8262, "tz": 3},
    {"id": "madinah", "lat": 24.4686, "lon": 39.6142, "tz": 3},
    {"id": "cairo", "lat": 30.0444, "lon": 31.2357, "tz": 3},
    {"id": "riyadh", "lat": 24.7136, "lon": 46.6753, "tz": 3},
    {"id": "istanbul", "lat": 41.0082, "lon": 28.9784, "tz": 3},
    {"id": "london", "lat": 51.5074, "lon": -0.1278, "tz": 1},
    {"id": "newyork", "lat": 40.7128, "lon": -74.0060, "tz": -4},
    {"id": "jakarta", "lat": -6.2088, "lon": 106.8456, "tz": 7},
]

DATES = [date(2026, 9, 30), date(2026, 12, 21), date(2026, 6, 21)]
METHODS = ["MWL", "EGYPT", "KARACHI", "UMM_AL_QURA", "TURKEY", "JAKARTA" if False else "KEMENAG"]
METHODS = ["MWL", "EGYPT", "KARACHI", "UMM_AL_QURA", "KEMENAG", "JORDAN", "TURKEY", "NORTH_AMERICA"]

KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]


def main() -> int:
    cases = []
    for c in CITIES:
        q = PE.qibla_direction(c["lat"], c["lon"])
        for d in DATES:
            for m in METHODS:
                for madhab in (1, 2):
                    r = PE.compute_times(c["lat"], c["lon"], d, m, madhab, c["tz"])
                    expect = {k: r["times"][k] for k in KEYS}
                    if any(v is None for v in expect.values()):
                        continue
                    cases.append({
                        "city": c["id"],
                        "lat": c["lat"],
                        "lon": c["lon"],
                        "tz": c["tz"],
                        "date": d.isoformat(),
                        "method": m,
                        "madhab": madhab,
                        "expect": expect,
                        "qibla": q["bearing"],
                    })
    out = os.path.join(HERE, "js_cases.json")
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(cases, f, ensure_ascii=False, indent=1)
    print(f"[ok] {len(cases)} حالة اختبار مكتوبة في {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
