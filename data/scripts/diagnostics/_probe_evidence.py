# -*- coding: utf-8 -*-
"""أي أسماء بلا دليل قرآن/سنة؟ وما شكل حقول الأدلة في المصدر؟"""
import json

raw = json.load(open("data/raw/asma_allah.json", encoding="utf-8-sig"))
print("=== حقول الأدلة في المصدر (عيّنة) ===")
for it in raw[:3]:
    print("id", it["id"], it["name"])
    for k in ("quran_evidence", "hadith_evidence"):
        v = it.get(k)
        print(f"  {k}: type={type(v).__name__} -> {json.dumps(v, ensure_ascii=False)[:180]}")

print()
print("=== أسماء بلا دليل (بعد التحويل) ===")
import sys
sys.path.insert(0, "data/scripts")
import build_names_duas as BN  # noqa: E402

missing = []
for it in raw:
    q = BN.as_text(it.get("quran_evidence"))
    h = BN.as_text(it.get("hadith_evidence"))
    if not q and not h:
        missing.append((it["id"], it.get("name_arabic"), type(it.get("quran_evidence")).__name__,
                        type(it.get("hadith_evidence")).__name__))
print("عدد الأسماء بلا دليل:", len(missing))
for m in missing[:15]:
    print("  ", m)

print()
print("=== توزيع أنواع الحقول ===")
from collections import Counter
cq = Counter(type(it.get("quran_evidence")).__name__ for it in raw)
ch = Counter(type(it.get("hadith_evidence")).__name__ for it in raw)
print("quran_evidence:", dict(cq))
print("hadith_evidence:", dict(ch))
