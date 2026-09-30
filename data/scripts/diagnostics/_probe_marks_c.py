# -*- coding: utf-8 -*-
"""فحص علامات المصدر الثالث (alquran.cloud) وسؤال البسملة."""
import json
import unicodedata
from collections import Counter

CSMALL = "بِسْمِ"
b = json.load(open("data/raw/quran_risan.json", encoding="utf-8"))
c = json.load(open("data/raw/quran_alqurancloud.json", encoding="utf-8"))

bmap = {}
for s in b:
    for v in s["verses"]:
        bmap[(s["id"], v["id"])] = v["text"]

cmap = {}
for s in c["data"]["surahs"]:
    sid = int(s["number"])
    for ay in s["ayahs"]:
        cmap[(sid, int(ay["numberInSurah"]))] = ay["text"]

# 1) علامات C
cc = Counter()
for v in cmap.values():
    for ch in v:
        if unicodedata.category(ch).startswith("M"):
            cc[ch] += 1
print("=== علامات C (alquran.cloud) ===")
for ch, n in sorted(cc.items(), key=lambda x: -x[1]):
    try:
        nm = unicodedata.name(ch)
    except ValueError:
        nm = "?"
    print(f"  U+{ord(ch):04X} {n:8d}  {nm}")

# 2) البسملة
first = [k for k in bmap if k[1] == 1 and k[0] not in (1, 9)]
print()
print(f"عدد آيات (سورة,1) عدا الفاتحة والتوبة: {len(first)}")
nb = sum(1 for k in first if bmap[k].startswith("بِسۡمِ") or "بِسۡمِ" in bmap[k][:15])
nc = sum(1 for k in first if cmap.get(k, "").startswith("بِسْمِ"))
print(f"تبدأ بالبسملة في B: {nb}")
print(f"تبدأ بالبسملة في C: {nc}")
for k in sorted(first)[:3]:
    print("  ", k)
    print("     B:", bmap[k][:70])
    print("     C:", cmap.get(k, "")[:70])

# 3) الفاتحة: عدد آياتها في المصدرين
print()
print("الفاتحة في B:", [bmap[(1, i)][:40] for i in range(1, 8)])
print("الفاتحة في C:", [cmap[(1, i)][:40] for i in range(1, 8)])
