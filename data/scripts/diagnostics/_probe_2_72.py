# -*- coding: utf-8 -*-
"""حكم المصدر الثالث على الآية 2:72 (الأثر الوحيد المتبقي)."""
import sys
import json
import unicodedata

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

b = B.load_source_b()  # display
a = B.load_source_a()  # cross

raw = json.load(open("data/raw/quran_alqurancloud.json", encoding="utf-8"))
c = {}
for s in raw["data"]["surahs"]:
    sid = int(s["number"])
    for ay in s["ayahs"]:
        c[(sid, int(ay["numberInSurah"]))] = ay["text"]

k = (2, 72)
print("display (B / risan):")
print("  ", b[k])
print("  codepoints:", " ".join("%04X" % ord(x) for x in b[k]))
print()
print("cross (A / fawaz):")
print("  ", a[k])
print("  codepoints:", " ".join("%04X" % ord(x) for x in a[k]))
print()
print("third source (C / alquran.cloud):")
print("  ", c[k])
print("  codepoints:", " ".join("%04X" % ord(x) for x in c[k]))
print()

# الجزء المسؤول
print("=== الجزء المسؤول: فَٱدّٰرَٰٔتُمۡ ===")
for name, t in (("B", b[k]), ("A", a[k]), ("C", c[k])):
    i = t.find("فَ")
    # ابحث عن النمط
    import re
    m = re.search("ف.{0,14}تُمۡ", t)
    frag = m.group(0) if m else "?"
    print(f"  {name}: {frag}")
    print(f"      codepoints: {' '.join('%04X' % ord(x) for x in frag)}")

print()
print("=== هل U+2009 و U+0640 في C؟ ===")
for name, t in (("B", b[k]), ("A", a[k]), ("C", c[k])):
    print(f"  {name}: U+2009={'YES' if chr(0x2009) in t else 'no'}  "
          f"U+0640={'YES' if chr(0x640) in t else 'no'}  "
          f"U+0670 count={t.count(chr(0x670))}")
