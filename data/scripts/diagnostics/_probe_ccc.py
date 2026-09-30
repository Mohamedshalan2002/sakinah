# -*- coding: utf-8 -*-
"""سبب اختلاف ترتيب العلامات: قيم Combining Class (CCC) في Unicode."""
import unicodedata

for cp in [0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650, 0x0651, 0x0652,
           0x0656, 0x0657, 0x065E, 0x0670, 0x06E1, 0x08F0, 0x08F1, 0x08F2, 0x0654]:
    ch = chr(cp)
    try:
        name = unicodedata.name(ch)
    except ValueError:
        name = "?"
    print(f"U+{cp:04X} CCC={unicodedata.combining(ch):3d}  {name}")

print()
print("== إعادة الترتيب المعياري NFD على تسلسلين ==")
A = "\u064C\u0651"   # dammatan then shadda  (ترتيب A)
B = "\u0651\u064C"   # shadda then dammatan  (ترتيب B)
print("A raw:", [hex(ord(c)) for c in A], "-> NFD:", [hex(ord(c)) for c in unicodedata.normalize("NFD", A)])
print("B raw:", [hex(ord(c)) for c in B], "-> NFD:", [hex(ord(c)) for c in unicodedata.normalize("NFD", B)])
print("متساويان بعد NFD؟", unicodedata.normalize("NFD", A) == unicodedata.normalize("NFD", B))

print()
A2 = "\u08F1"  # open dammatan  (A)
B2 = "\u065E"  # fatha with two dots (B)
print("U+08F1 CCC =", unicodedata.combining("\u08F1"))
print("U+065E CCC =", unicodedata.combining("\u065E"))
print("U+0651 CCC =", unicodedata.combining("\u0651"))
