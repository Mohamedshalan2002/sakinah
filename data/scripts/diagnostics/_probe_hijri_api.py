# -*- coding: utf-8 -*-
"""تجربة API hijri-converter للتأكد من الأسماء الصحيحة."""
from hijri_converter import Gregorian, Hijri

h = Gregorian(2026, 9, 30).to_hijri()
print("type:", type(h).__name__)
print("dir:", [a for a in dir(h) if not a.startswith('_')])
print()
print("date tuple:", h.date())
print("year, month, day:", h.year, h.month, h.day)
print("month_name:", h.month_name())
print("is_valid:", h.is_valid())
print()
# أسماء الشهور العربية
for m in range(1, 13):
    print(m, Hijri(1447, m, 1).month_name())
