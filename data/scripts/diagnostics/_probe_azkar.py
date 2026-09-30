# -*- coding: utf-8 -*-
"""تشخيص: الباب 132، ومطابقة القرآن، ودمج الفضل."""
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, "data/scripts")
import build_azkar as BA  # noqa: E402

h = BA.load("data/raw/hisn_muslim.json")
for seg in h["English"]:
    if seg["ID"] == 132:
        print("=== الباب 132:", seg["TITLE"])
        for it in seg["TEXT"]:
            print("  ID:", it.get("ID"))
            print("  ARABIC_TEXT repr:", repr(it.get("ARABIC_TEXT"))[:200])
            print("  keys:", list(it.keys()))
            print("  TRANSLATED_TEXT:", repr(it.get("TRANSLATED_TEXT"))[:150])

# اختبار مطابقة القرآن يدويًا على آية الكرسي
print()
q = BA.QuranIndex("data/quran")
sample = "أَعُوذُ بِاللَّهِ مِنَ الشَّيطَانِ الرَّجِيمِ ﴿اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ لاَ تَأْخُذُهُ سِنَةٌ وَلاَ نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الأَرْضِ﴾"
print("عيّنة:", sample[:80])
print("مطبّع:", BA.normalize_for_compare(sample)[:90])
hits = q.find_verse_span(sample)
print("نتائج المطابقة:", hits)

# هل آية الكرسي موجودة في الفهرس؟
target = BA.normalize_for_compare("اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ")
print()
print("هدف مطبّع:", target)
found = target in q.verses
print("الآية 2:255 موجودة كاملة؟", found)
for norm, sid, vid, orig in q.verse_list:
    if sid == 2 and vid == 255:
        print("  2:255 مطبّع (أول 90):", norm[:90])
        print("  مسافة:", len(norm))
        # أين يفترقان؟
        import difflib
        for i, (a, b) in enumerate(zip(norm, target)):
            if a != b:
                print(f"  أول اختلاف عند {i}: verse='{a}' target='{b}'")
                print("   verse :", norm[max(0,i-25):i+25])
                print("   target:", target[max(0,i-25):i+25])
                break
        break
