# -*- coding: utf-8 -*-
"""فحص الفروق المتبقية في المستوى 2 وتصنيفها."""
import sys
import unicodedata
import difflib
from collections import Counter

sys.path.insert(0, "data/scripts")
import build_quran as B  # noqa: E402

a = B.load_source_a()
b = B.load_source_b()

diffkeys = []
for k in sorted(set(a) & set(b)):
    if B.signature(a[k]) != B.signature(b[k]):
        diffkeys.append(k)

print("level2 diff count:", len(diffkeys))

cats = Counter()
examples = {}
for k in diffkeys:
    sa, sb = B.signature(a[k]), B.signature(b[k])
    sm = difflib.SequenceMatcher(None, sa, sb)
    ops = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "equal":
            ops.append((tag, sa[i1:i2], sb[j1:j2]))
    # تصنيف: هل الفرق مجرد إعادة ترتيب لمجموعة نفس الأصناف؟
    if Counter(sa) == Counter(sb):
        cats["same-classes-reordered"] += 1
        key = "reorder"
    else:
        cats["different-class-multiset"] += 1
        key = "diff"
    if key not in examples:
        examples[key] = (k, ops)

for name, cnt in cats.most_common():
    print(f"  {name}: {cnt}")

print()
for key, (k, ops) in examples.items():
    print("=== example:", key, k, "surah", k[0], "verse", k[1])
    print("  A:", a[k][:200])
    print("  B:", b[k][:200])
    for tag, x, y in ops[:8]:
        print(f"   {tag}: A[{x}]  B[{y}]")

# توزيع الأصناف المسؤولة في الحالات "different-class-multiset"
print()
resid = Counter()
for k in diffkeys:
    sa, sb = B.signature(a[k]), B.signature(b[k])
    if Counter(sa) == Counter(sb):
        continue
    ca, cb = Counter(sa), Counter(sb)
    for name in set(ca) | set(cb):
        d = ca[name] - cb[name]
        if d:
            resid[(name, "A_extra" if d > 0 else "B_extra")] += abs(d)
for (name, side), n in resid.most_common(20):
    print(f"  {name} {side}: {n}")
