# -*- coding: utf-8 -*-
"""مقارنة المصادر الثلاثة: عدد الكلمات والفروق، لتحديد أصل مشكلة المسافات."""
import sys
import json
import unicodedata
from collections import Counter

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

a = B.load_source_a()
b = B.load_source_b()

raw = json.load(open("data/raw/quran_alqurancloud.json", encoding="utf-8"))
c = {}
for s in raw["data"]["surahs"]:
    sid = int(s["number"])
    for ay in s["ayahs"]:
        c[(sid, int(ay["numberInSurah"]))] = ay["text"]

print("A (fawaz):", len(a), "| B (risan):", len(b), "| C (alquran.cloud):", len(c))
print("keys equal:", set(a) == set(b) == set(c))
print()


def wc(t):
    return len(t.split())


diff_ab = sum(1 for k in a if wc(a[k]) != wc(b[k]))
diff_ac = sum(1 for k in a if wc(a[k]) != wc(c[k]))
diff_bc = sum(1 for k in b if wc(b[k]) != wc(c[k]))
print(f"اختلاف عدد الكلمات A vs B: {diff_ab}")
print(f"اختلاف عدد الكلمات A vs C: {diff_ac}")
print(f"اختلاف عدد الكلمات B vs C: {diff_bc}")
print()

# من يطابق من في عدد الكلمات؟
agree_bc = sum(1 for k in a if wc(b[k]) == wc(c[k]))
print(f"B و C متفقان في عدد الكلمات: {agree_bc} / {len(a)}")

# مستوى 3 (التوقيع القانوني) بين الثلاثة
def sig3(t):
    return B.canonicalSignature(t)

d_ab = sum(1 for k in a if sig3(a[k]) != sig3(b[k]))
d_ac = sum(1 for k in a if sig3(a[k]) != sig3(c[k]))
d_bc = sum(1 for k in a if sig3(b[k]) != sig3(c[k]))
print()
print(f"مستوى3 A vs B: {d_ab} | A vs C: {d_ac} | B vs C: {d_bc}")

print()
print("--- نماذج من A فيها مسافة داخل الكلمة ---")
import re
pat = re.compile(r"(?<=[\u064B-\u065F\u0670\u06D6-\u06ED\u08E3-\u08FF]) (?=[\u0621-\u064A])")
shown = 0
for k in sorted(a):
    if pat.search(a[k]) and wc(a[k]) != wc(b[k]):
        print(f"  {k}")
        print("     A:", a[k][:120])
        print("     B:", b[k][:120])
        print("     C:", c[k][:120])
        shown += 1
        if shown >= 6:
            break
