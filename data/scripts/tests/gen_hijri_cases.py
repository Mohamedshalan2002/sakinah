# -*- coding: utf-8 -*-
"""
توليد حالات اختبار لمحوّل التاريخ الهجري في JS.

الحالات مُولّدة من مكتبة hijri-converter (تقويم أم القرى) — أي أن المرجع
_مستقل_ عن كود التطبيق. بهذا نقيس: هل محوّلنا في JS يعطي نفس نتيجة أم القرى؟
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta

from hijri_converter import Gregorian, Hijri

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "hijri_cases.json")


def main() -> int:
    g2h = []
    # توزيع الحالات على مواسم مختلفة وسنوات مختلفة
    starts = [date(2026, 1, 1), date(2026, 9, 30), date(2027, 3, 15),
              date(2025, 6, 1), date(2028, 11, 20)]
    for s in starts:
        for i in range(0, 60, 3):
            d = s + timedelta(days=i)
            h = Gregorian(d.year, d.month, d.day).to_hijri()
            g2h.append({
                "g": d.isoformat(),
                "hy": h.year, "hm": h.month, "hd": h.day,
                "monthName": h.month_name(),
            })

    h2g = []
    for hy in (1445, 1447, 1448, 1450, 1452):
        for hm in (1, 3, 6, 9, 12):
            for hd in (1, 13, 15, 27, 29):
                try:
                    g = Hijri(hy, hm, hd).to_gregorian()
                except Exception:
                    continue
                h2g.append({"hy": hy, "hm": hm, "hd": hd, "g": g.isoformat()})

    white = []
    for (hy, hm) in [(1448, 1), (1448, 9), (1447, 12), (1449, 3), (1448, 7)]:
        dates = []
        for hd in (13, 14, 15):
            dates.append(Hijri(hy, hm, hd).to_gregorian().isoformat())
        white.append({"hy": hy, "hm": hm, "dates": dates})

    payload = {
        "generatedBy": "data/scripts/tests/gen_hijri_cases.py",
        "reference": "hijri-converter (تقويم أم القرى)",
        "gregorianToHijri": g2h,
        "hijriToGregorian": h2g,
        "whiteDays": white,
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)

    print(f"[ok] {len(g2h)} حالة ميلادي→هجري")
    print(f"[ok] {len(h2g)} حالة هجري→ميلادي")
    print(f"[ok] {len(white)} شهرًا لأيام البيض")
    print(f"[ok] مكتوب في {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
