# -*- coding: utf-8 -*-
"""تحليل تقرير التحقق: توزيع الفروق وسبب الحالات الكبيرة."""
import json
import statistics
from collections import defaultdict

r = json.load(open("data/prayer/prayer_verification.json", encoding="utf-8"))
tests = [t for t in r["tests"] if t.get("status") != "no-reference"]
print("مقارنات:", len(tests), "| no-reference:", len(r["tests"]) - len(tests))
print()

by_method = defaultdict(list)
for t in tests:
    by_method[t["method"]].append(t["maxDiffMinutes"])

print("=== أقصى فرق لكل طريقة ===")
for m, ds in sorted(by_method.items(), key=lambda x: -max(x[1])):
    print(f"  {m:15s} n={len(ds):3d}  max={max(ds):3d}  mean={statistics.mean(ds):6.2f}")

print()
by_city = defaultdict(list)
for t in tests:
    by_city[t["city"]].append(t["maxDiffMinutes"])
print("=== أقصى فرق لكل مدينة ===")
for c, ds in sorted(by_city.items(), key=lambda x: -max(x[1])):
    print(f"  {c:12s} n={len(ds):3d}  max={max(ds):3d}  mean={statistics.mean(ds):6.2f}")

print()
print("=== أسوأ 10 حالات ===")
for t in sorted(tests, key=lambda x: -x["maxDiffMinutes"])[:10]:
    print(f"  {t['city']:10s} {t['date']} {t['method']:14s} school={t['school']} "
          f"max={t['maxDiffMinutes']}")
    print(f"     لنا : {t['ourTimes']}")
    print(f"     مرجع: {t['refTimes']}")
    print(f"     فروق: {t['diffMinutes']}")

print()
print("=== تفصيل الفروق لكل عنصر وقت (متوسط مطلق) ===")
per_key = defaultdict(list)
for t in tests:
    for k, d in t["diffMinutes"].items():
        if d is not None:
            per_key[k].append(abs(d))
for k, ds in sorted(per_key.items(), key=lambda x: -statistics.mean(x[1])):
    print(f"  {k:8s} n={len(ds):4d} mean={statistics.mean(ds):6.2f} max={max(ds)}")
