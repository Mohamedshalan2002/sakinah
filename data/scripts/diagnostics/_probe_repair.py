# -*- coding: utf-8 -*-
"""هل يمكن إصلاح ترقيم كلمات A (الملك العام) ليصبح صحيحًا كـ B؟

إن نجح الإصلاح لكل الآيات، نسلّم نصًا من مصدر Unlicense بحدود كلمات صحيحة.
"""
import sys
import re

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

a = B.load_source_a()
b = B.load_source_b()

AR = "\u0621-\u064A\u066E-\u06D3\u0671-\u06D5"
MK = "\u064B-\u065F\u0670\u06D6-\u06ED\u08E3-\u08FF\u0610-\u061A"


def repair(t):
    """إزالة المسافات الواقعة بين علامة وحرف (داخل الكلمة)."""
    prev = None
    while prev != t:
        prev = t
        # مسافة تسبقها علامة وتليها حرف
        t = re.sub("(?<=[" + MK + "])[ ]+(?=[" + AR + "])", "", t)
    return t


def wc(t):
    return len(t.split())


keys = sorted(a)
fixed_ok = 0
still_diff = []
for k in keys:
    if wc(repair(a[k])) == wc(b[k]):
        fixed_ok += 1
    else:
        still_diff.append(k)

print(f"آيات أصبح ترقيم كلماتها مطابقًا لـ B بعد الإصلاح: {fixed_ok} / {len(keys)}")
print(f"آيات لم تُصلح: {len(still_diff)}")
for k in still_diff[:5]:
    print("  ", k)
    print("     A orig:", a[k][:120])
    print("     A fix :", repair(a[k])[:120])
    print("     B     :", b[k][:120])

# مقارنة أدق: هل كل كلمة في A بعد الإصلاح تساوي كلمة في B؟
same_words = 0
mismatch = []
for k in keys:
    wa = repair(a[k]).split()
    wb = b[k].split()
    if len(wa) == len(wb):
        same_words += 1
    else:
        mismatch.append((k, len(wa), len(wb), a[k], b[k]))
print()
print(f"آيات بعدد كلمات مطابق بعد الإصلاح: {same_words} / {len(keys)}")
print(f"لكن الكلمات نفسها مختلفة (تقسيم مختلف): {len(mismatch)}")
for k, la, lb, ta, tb in mismatch[:4]:
    print("  ", k, f"A={la} B={lb}")
    print("     A fix:", repair(ta)[:120])
    print("     B    :", tb[:120])
