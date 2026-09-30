# -*- coding: utf-8 -*-
"""لماذا لا تُطابق أي آية؟ فحص مطابقة مقطع آية الكرسي في باب 27."""
import sys
import difflib

sys.path.insert(0, "data/scripts")
import build_azkar as BA  # noqa: E402

h = BA.load("data/raw/hisn_muslim.json")
seg = [s for s in h["English"] if s["ID"] == 27][0]
item = seg["TEXT"][0]
text = item["ARABIC_TEXT"]
print("نص الذكر (أول 260):")
print(text[:260])
print()

q = BA.QuranIndex("data/quran")

# آية الكرسي 2:255
verse_raw = None
for norm, sid, vid, orig in q.verse_list:
    if (sid, vid) == (2, 255):
        verse_raw = (norm, orig)
        break
print("آية 2:255 (أصل):")
print(verse_raw[1][:260])
print()

flat = BA.normalize_for_compare(text)
vn = BA.normalize_for_compare(verse_raw[1])
print("مطبّع الذكر  (طول %d):" % len(flat))
print(flat[:300])
print()
print("مطبّع الآية  (طول %d):" % len(vn))
print(vn[:300])
print()
print("هل الآية سلسلة فرعية من الذكر؟", vn in flat)

# ابحث عن أطول بادئة مشتركة
sm = difflib.SequenceMatcher(None, flat, vn, autojunk=False)
blocks = sm.get_matching_blocks()
best = max(blocks, key=lambda b: b.size)
print()
print("أطول مقطع مشترك:")
print("  طول:", best.size)
print("  من الذكر:", flat[best.a:best.a + best.size][:200])
print("  من الآية:", vn[best.b:best.b + best.size][:200])

# أين يبدأ الاختلاف؟
print()
for i in range(min(len(flat), len(vn))):
    if flat[i] != vn[i]:
        print("أول اختلاف عند", i)
        print("  الذكر:", flat[max(0, i - 30):i + 30])
        print("  الآية:", vn[max(0, i - 30):i + 30])
        break
