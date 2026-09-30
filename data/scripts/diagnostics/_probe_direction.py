# -*- coding: utf-8 -*-
"""تأكيد اتجاه فرق الكلمات: هل A يقسّم أكثر دائمًا؟ وعدّ الشظايا المفردة."""
import sys
import re

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

a = B.load_source_a()
b = B.load_source_b()
keys = sorted(a)


def wc(t):
    return len(t.split())


more = equal = less = 0
for k in keys:
    wa, wb = wc(a[k]), wc(b[k])
    if wa > wb:
        more += 1
    elif wa == wb:
        equal += 1
    else:
        less += 1
print(f"A كلماتها أكثر من B: {more}")
print(f"متساويان          : {equal}")
print(f"A كلماتها أقل من B : {less}   <-- لو صفر فمعناه A يقسّم فقط ولا يدمج")

# الشظايا المفردة: كلمة من حرف واحد + علامات (مؤشر على تقسيم زائد)
def single_letter_words(t):
    n = 0
    for w in t.split():
        letters = [c for c in w if not __import__("unicodedata").category(c).startswith("M")]
        if len(letters) == 1:
            n += 1
    return n


tot_a = sum(single_letter_words(v) for v in a.values())
tot_b = sum(single_letter_words(v) for v in b.values())
print()
print(f"عدد الكلمات ذات الحرف الواحد (بعد إزالة العلامات) | A: {tot_a} | B: {tot_b}")

# أمثلة شظايا مفردة في A وليست في B
import unicodedata

shown = 0
for k in keys:
    wa = a[k].split()
    wb = b[k].split()
    if len(wa) > len(wb):
        for w in wa:
            letters = [c for c in w if not unicodedata.category(c).startswith("M")]
            if len(letters) == 1 and letters[0] in "ىا":
                print(f"  {k}: شظية A = '{w}'  | النص A: {a[k][:70]}")
                shown += 1
                break
    if shown >= 6:
        break
