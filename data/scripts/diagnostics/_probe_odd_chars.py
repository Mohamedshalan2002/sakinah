# -*- coding: utf-8 -*-
"""الأحرف الشاذة في نص العرض + الكلمات المفردة الثلاث."""
import sys
import unicodedata

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

d = B.load_source_b()
b = B.load_source_a()

for ch, name in (("\u2009", "THIN SPACE"), ("\u00a0", "NBSP"), ("\u0640", "TATWEEL"),
                 ("\ufeff", "BOM"), ("\u06de", "END OF AYAH")):
    hits = [k for k, v in d.items() if ch in v]
    print(f"{name} (U+{ord(ch):04X}): {len(hits)} آية" + (f" -> {hits[:6]}" if hits else ""))

print()
print("=== الكلمات ذات الحرف الواحد في نص العرض ===")
for k in sorted(d):
    for w in d[k].split():
        core = [c for c in w if not unicodedata.category(c).startswith("M")]
        if len(core) == 1:
            print(f"  {k}: '{w}'  | الآية: {d[k][:80]}")

print()
print("=== أمثلة تطويل (U+0640) في نص العرض ===")
n = 0
for k in sorted(d):
    if "\u0640" in d[k]:
        i = d[k].index("\u0640")
        print(f"  {k}: ...{d[k][max(0,i-14):i+14]}...")
        n += 1
        if n >= 5:
            break
print("إجمالي الآيات التي فيها تطويل:", sum(1 for v in d.values() if "\u0640" in v))
