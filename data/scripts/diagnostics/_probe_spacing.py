# -*- coding: utf-8 -*-
"""قياس اختلاف مواضع المسافات/الكلمات بين المصدرين، والنمط المسبب.

المشكلة: بعض الآيات في A تحتوي نمط "علامة علوية + مسافة + حرف" داخل الكلمة
نفسها (مثل: هُدࣰ ى) وهذا يُعرض مكسورًا في الواجهة.
"""
import sys
import re
import unicodedata

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

a = B.load_source_a()
b = B.load_source_b()

MN_SPACE_LETTER = re.compile(r"(?<=[\u0300-\u06FF\u08E3-\u08FF]) (?=[\u0621-\u064A])")


def word_count(t):
    return len([w for w in t.split() if w.strip()])


wc_diff = []
for k in sorted(set(a) & set(b)):
    wa, wb = word_count(a[k]), word_count(b[k])
    if wa != wb:
        wc_diff.append((k, wa, wb))

print("آيات يختلف فيها عدد الكلمات:", len(wc_diff), "من", len(a))
for k, wa, wb in wc_diff[:12]:
    print(f"  {k}: A={wa} B={wb}")
    print("     A:", a[k][:150])
    print("     B:", b[k][:150])

# النمط: مسافة بعد علامة (Mn) مباشرة
pat = re.compile(r"(?<=[\u064B-\u065F\u0670\u06D6-\u06ED\u08E3-\u08FF]) ")
na = sum(1 for v in a.values() if pat.search(v))
nb = sum(1 for v in b.values() if pat.search(v))
print()
print("A: آيات فيها مسافة تلي علامة مباشرة:", na)
print("B: آيات فيها مسافة تلي علامة مباشرة:", nb)

# هل المسافة دائما خطأ؟ افحص: هل الحرف بعد المسافة يمكن أن يبدأ كلمة؟
# نتحقق بمقارنة عدد الكلمات في نفس الآية بين المصدرين.
same = [k for k in sorted(set(a) & set(b)) if word_count(a[k]) == word_count(b[k])]
print()
print("آيات عدد كلماتها متطابق:", len(same), "من", len(a))
