# -*- coding: utf-8 -*-
"""أي بنود muslimKit لم تُطابق؟ ولماذا؟"""
import sys
import json

sys.path.insert(0, "data/scripts")
import build_azkar as BA  # noqa: E402

entries = json.load(open("data/azkar/azkar.json", encoding="utf-8"))["entries"]

for file in ("azkar_sabah.json", "azkar_massa.json", "PostPrayer_azkar.json"):
    data = BA.load("data/raw/" + file)
    total = len(data["content"])
    matched = unmatched = 0
    print(f"=== {file} ({data['title']}) — {total} بندًا")
    for item in data["content"]:
        zwords = BA.normalize_words(item.get("zekr", ""))
        bless = (item.get("bless") or "").strip()
        if len(zwords) < 3 or not bless:
            continue
        zset = set(zwords)
        best = 0.0
        for e in entries:
            ewords = BA.normalize_words(e["text"])
            if not ewords:
                continue
            eset = set(ewords)
            shared = len(zset & eset) / max(1, len(zset))
            best = max(best, shared)
        if best >= 0.80:
            matched += 1
        else:
            unmatched += 1
            print(f"  [غير مطابق] أفضل تشابه={best:.2f}")
            print(f"     zekr : {item['zekr'][:110]}")
            print(f"     bless: {bless[:70]}")
    print(f"  --> مطابق: {matched} | غير مطابق: {unmatched}")
    print()
