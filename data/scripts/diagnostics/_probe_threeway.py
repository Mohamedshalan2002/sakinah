# -*- coding: utf-8 -*-
"""مقارنة ثلاثية على مستوى الحروف فقط (بعد توحيد ترميز الهمزة/الألف/الياء)."""
import sys
import json
import re
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


def letters(t):
    """الحروف فقط + توحيد ترميزي موسّع (ألف/همزة/ياء/تاء مربوطة/هاء)."""
    t = unicodedata.normalize("NFD", t)
    out = []
    for ch in t:
        cat = unicodedata.category(ch)
        if cat.startswith("M") or cat == "Cf" or ch in " \t\u00a0":
            continue
        out.append(ch)
    t = "".join(out)
    t = re.sub("[\u060C\u061B\u061F\u06DD\u06DE\u06E9\uFD3E\uFD3F\u00AB\u00BB.،؛؟]", "", t)
    # توحيد: ألف بكل أشكالها
    t = re.sub("[\u0622\u0623\u0625\u0671\u0627]", "\u0627", t)
    # ياء بكل أشكالها (ى ئ ي)
    t = re.sub("[\u0649\u0626\u064A]", "\u064A", t)
    # هاء/تاء مربوطة
    t = re.sub("[\u0629\u0647]", "\u0647", t)
    # واو/همزة على واو
    t = re.sub("[\u0624\u0648]", "\u0648", t)
    # همزة مفردة -> تُحذف لأنها قد تكون ألفًا في مصدر وآخر
    t = t.replace("\u0621", "")
    return t


def wc(t):
    return len([w for w in t.split() if w.strip()])


keys = sorted(set(a) & set(b) & set(c))
print("keys:", len(keys))

d_ab = [k for k in keys if letters(a[k]) != letters(b[k])]
d_ac = [k for k in keys if letters(a[k]) != letters(c[k])]
d_bc = [k for k in keys if letters(b[k]) != letters(c[k])]
print(f"الحروف فقط | A vs B: {len(d_ab)} | A vs C: {len(d_ac)} | B vs C: {len(d_bc)}")

# عدد الكلمات
w_ab = sum(1 for k in keys if wc(a[k]) != wc(b[k]))
w_ac = sum(1 for k in keys if wc(a[k]) != wc(c[k]))
w_bc = sum(1 for k in keys if wc(b[k]) != wc(c[k]))
print(f"عدد الكلمات | A vs B: {w_ab} | A vs C: {w_ac} | B vs C: {w_bc}")

# بعد إزالة المسافات الزائفة في A: هل يطابق B في عدد الكلمات؟
# تعريف المسافة الزائفة: مسافة تسبقها علامة إضافية وتليها حرف داخل الكلمة،
# لكن مع استثناء حدود الكلمات الحقيقية => نستخدم B كمرجع للتشخيص هنا فقط.
fixed = dict(a)
for k in keys:
    # جرّب إزالة كل مسافة تسبقها علامة M* مباشرة
    cand = re.sub(r"(?<=[\u064B-\u065F\u0670\u06D6-\u06ED\u08E3-\u08FF])(?=[\u0621-\u064A])", "", a[k])
    if cand != a[k]:
        fixed[k] = cand

w_ab_fixed = sum(1 for k in keys if wc(fixed[k]) != wc(b[k]))
print(f"بعد شطب المسافة الزائفة في A | اختلاف عدد الكلمات vs B: {w_ab_fixed}")

print()
print("--- اختلافات B vs C في الحروف ---")
shown = 0
for k in d_bc[:8]:
    print(f"  {k}")
    print("     B:", b[k][:120])
    print("     C:", c[k][:120])
    shown += 1
    if shown >= 8:
        break
