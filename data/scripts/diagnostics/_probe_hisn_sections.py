# -*- coding: utf-8 -*-
"""استكشاف أقسام حصن المسلم: العناوين وأحجام الأقسام."""
import json

h = json.load(open("data/raw/hisn_muslim.json", encoding="utf-8-sig"))
secs = h["English"]
print("عدد الأقسام:", len(secs))
print()
for s in secs:
    print("%4d | %2d | %s" % (s["ID"], len(s["TEXT"]), s["TITLE"]))
