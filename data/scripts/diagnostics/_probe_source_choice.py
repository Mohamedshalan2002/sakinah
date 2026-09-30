# -*- coding: utf-8 -*-
"""تحديد المصدر الأنسب للنشر: قياس المسافات الداخلية وحدود الكلمات.

السؤال الحاسم: من الأصح في حدود الكلمات، A أم B، ولماذا؟
نستخدم C كمصدر ثالث للحكم (مع تطبيع المسافات التزيينية حول العلامات الصغيرة
التي يفصلها C بمسافات).
"""
import sys
import json
import re
import unicodedata

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

# علامات يفصلها C بمسافات (علامات الوقف الصغيرة ونحوها)
SMALL = r"\u06D6-\u06ED\u08D4-\u08E1"


def norm_c(t):
    """إزالة المسافات المحيطة بالعلامات الصغيرة التي يفصلها C."""
    t = re.sub(r"\s+(?=[" + SMALL + r"])", "", t)
    t = re.sub(r"(?<=[" + SMALL + r"])\s+", "", t)
    return t


def wc(t):
    return len([w for w in t.split() if w.strip()])


keys = sorted(a)
dBC = [k for k in keys if wc(b[k]) != wc(norm_c(c[k]))]
dAC = [k for k in keys if wc(a[k]) != wc(norm_c(c[k]))]
dAB = [k for k in keys if wc(a[k]) != wc(b[k])]
print("عدد الكلمات (بعد تطبيع C):")
print(f"  B vs C(مطبّع): {len(dBC)} اختلاف")
print(f"  A vs C(مطبّع): {len(dAC)} اختلاف")
print(f"  A vs B       : {len(dAB)} اختلاف")

# هل المسافات الزائدة في A هي 'علامة ثم مسافة ثم حرف'؟
MARK_SPACE_LETTER = re.compile(r"[\u064B-\u065F\u0670\u06D6-\u06ED\u08E3-\u08FF] (?=[\u0621-\u064A])")
countA = sum(1 for k in keys if MARK_SPACE_LETTER.search(a[k]))
countB = sum(1 for k in keys if MARK_SPACE_LETTER.search(b[k]))
countC = sum(1 for k in keys if MARK_SPACE_LETTER.search(norm_c(c[k])))
print()
print("آيات فيها النمط [علامة + مسافة + حرف]:")
print(f"  A: {countA} | B: {countB} | C(مطبّع): {countC}")

# مقارنة B و C في عدد الكلمات: أيهما أدق؟ نعرض أمثلة الاختلاف
print()
print("أمثلة اختلاف B vs C(مطبّع):")
for k in dBC[:6]:
    print(f"  {k}  B={wc(b[k])} C={wc(norm_c(c[k]))}")
    print("     B:", b[k][:110])
    print("     C:", norm_c(c[k])[:110])
