# -*- coding: utf-8 -*-
"""سرد كل العلامات (Unicode M*) الموجودة فعليًا في المصدرين مع أسمائها."""
import sys
import unicodedata
from collections import Counter

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

a = B.load_source_a()
b = B.load_source_b()

ca, cb = Counter(), Counter()
for v in a.values():
    for ch in v:
        if unicodedata.category(ch).startswith("M"):
            ca[ch] += 1
for v in b.values():
    for ch in v:
        if unicodedata.category(ch).startswith("M"):
            cb[ch] += 1

allm = sorted(set(ca) | set(cb), key=ord)
print(f"{'codepoint':10s} {'A':>9s} {'B':>9s}  name")
for ch in allm:
    cp = ord(ch)
    try:
        name = unicodedata.name(ch)
    except ValueError:
        name = "<no name>"
    mapped = "OK" if cp in B.MARK_CLASS else "*** UNMAPPED ***"
    print(f"U+{cp:04X}  {ca[ch]:9d} {cb[ch]:9d}  {mapped:16s} {name}")
