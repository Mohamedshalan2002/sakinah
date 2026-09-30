# -*- coding: utf-8 -*-
import unicodedata


def info(cp):
    ch = chr(cp)
    try:
        name = unicodedata.name(ch)
    except ValueError:
        name = "<no name>"
    dec = unicodedata.decomposition(ch)
    nfkc = [hex(ord(c)) for c in unicodedata.normalize("NFKC", ch)]
    nfd = [hex(ord(c)) for c in unicodedata.normalize("NFD", ch)]
    return f"U+{cp:04X} {name} | decomp=[{dec}] | NFKC={nfkc} | NFD={nfd}"


print("=== canonical decomposition of key marks ===")
for cp in [0x08F0, 0x08F1, 0x08F2, 0x0657, 0x065E, 0x0656, 0x0654, 0x0623, 0x0627, 0x0622, 0x0625, 0x0671]:
    print(info(cp))

print()
print("=== NFC equivalence test for pairs ===")
pairs = [
    ("\u0627\u0654", "\u0623"),
    ("\u08F0", "\u0657"),
    ("\u08F1", "\u065E"),
    ("\u08F2", "\u0656"),
]
for x, y in pairs:
    nx = unicodedata.normalize("NFC", x)
    ny = unicodedata.normalize("NFC", y)
    print("  ", [hex(ord(c)) for c in x], "-> NFC", [hex(ord(c)) for c in nx],
          " vs ", [hex(ord(c)) for c in y], "->",
          [hex(ord(c)) for c in ny], " equal=", nx == ny)

print()
print("=== NFD (fully decomposed) equivalence test ===")
for x, y in pairs:
    nx = unicodedata.normalize("NFD", x)
    ny = unicodedata.normalize("NFD", y)
    print("  ", [hex(ord(c)) for c in nx], "==", [hex(ord(c)) for c in ny], "->", nx == ny)
