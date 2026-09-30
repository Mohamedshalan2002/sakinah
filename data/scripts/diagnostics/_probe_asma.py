# -*- coding: utf-8 -*-
"""فحص بنية ملف أسماء الله الحسنى."""
import json

d = json.load(open("data/raw/asma_allah.json", encoding="utf-8-sig"))
print("type:", type(d).__name__)
if isinstance(d, dict):
    print("keys:", list(d.keys())[:20])
    for k in list(d.keys())[:3]:
        print(f"  {k} -> {type(d[k]).__name__}")
        print("   ", json.dumps(d[k], ensure_ascii=False)[:500])
elif isinstance(d, list):
    print("len:", len(d))
    print("item0 keys:", list(d[0].keys()))
    print(json.dumps(d[0], ensure_ascii=False)[:900])
