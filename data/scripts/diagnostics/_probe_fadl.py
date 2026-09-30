# -*- coding: utf-8 -*-
"""تشخيص دمج الفضل: مقارنة نص حصن المسلم مع نص muslimKit."""
import sys

sys.path.insert(0, "data/scripts")
import build_azkar as BA  # noqa: E402

sabah = BA.load("data/raw/azkar_sabah.json")
print("عنوان:", sabah["title"], "| عدد:", len(sabah["content"]))

h = BA.load("data/raw/hisn_muslim.json")
seg = [s for s in h["English"] if s["ID"] == 27][0]

for i, item in enumerate(seg["TEXT"][:4]):
    hn = BA.normalize_for_compare(item["ARABIC_TEXT"])
    print(f"-- hisn[{i}] norm (أول 70): {hn[:70]}")

print()
for i, item in enumerate(sabah["content"][:4]):
    zk = BA.normalize_for_compare(item["zekr"])
    print(f"-- sabah[{i}] norm (أول 70): {zk[:70]}")
    print(f"     bless: {item['bless'][:80]}")

# اختبار التقاطع
print()
for i, item in enumerate(sabah["content"]):
    zk = BA.normalize_for_compare(item["zekr"])
    for j, hit in enumerate(seg["TEXT"]):
        hn = BA.normalize_for_compare(hit["ARABIC_TEXT"])
        # أول 40 حرفًا من كل منهما
        if len(zk) > 40 and len(hn) > 40:
            common = 0
            for a, b in zip(zk, hn):
                if a != b:
                    break
                common += 1
            if common > 30:
                print(f"  sabah[{i}] vs hisn[27:{j}] بادئة مشتركة={common}")
                print(f"     sabah: {zk[:90]}")
                print(f"     hisn : {hn[:90]}")
                break
