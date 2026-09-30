# -*- coding: utf-8 -*-
"""فحص أي الأذكار تحتوي نصًّا قرآنيًا وأي نسب تحقق."""
import json
import sys

sys.path.insert(0, "data/scripts")
import build_azkar as BA  # noqa: E402

d = json.load(open("data/azkar/azkar.json", encoding="utf-8"))
print("count:", d["count"])
matched = [e for e in d["entries"] if e["ref"].startswith("quran:")]
print("matched:", len(matched))
for e in matched:
    print("  ", e["id"], e["ref"], e["refStatus"], e["quranHits"])

q = BA.QuranIndex("data/quran")
# اختبر الإخلاص والمعوذتين والفاتحة
tests = {
    "الإخلاص": "قُلْ هُوَ اللَّهُ أَحَدٌ، اللَّهُ الصَّمَدُ، لَمْ يَلِدْ وَلَمْ يُولَدْ، وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
    "الفلق": "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ مِن شَرِّ مَا خَلَقَ",
    "الناس": "قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ",
    "الفاتحة": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَنِ الرَّحِيمِ مَالِكِ يَوْمِ الدِّينِ",
}
print()
for name, t in tests.items():
    hits = q.find_verse_span(t)
    print(f"{name}: {hits}")

# ابحث في الأذكار عن «قل هو الله أحد»
print()
for e in d["entries"]:
    if "قل هو" in e["text"] or "قُلْ هُوَ" in e["text"]:
        print("وجدنا الإخلاص في:", e["id"])
        print("  ", e["text"][:200])
        print("  hits:", q.find_verse_span(e["text"]))
        break
