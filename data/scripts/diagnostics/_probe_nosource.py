# -*- coding: utf-8 -*-
"""فحص الأدلة بلا مصدر في المصدر الأصلي."""
import json

raw = json.load(open("data/raw/asma_allah.json", encoding="utf-8-sig"))
for it in raw:
    for key in ("quran_evidence", "hadith_evidence"):
        for ev in it.get(key) or []:
            if isinstance(ev, dict):
                text = (ev.get("text") or "").strip()
                src = (ev.get("source") or "").strip()
                if text and not src:
                    print(f"id={it['id']:3d} {it.get('name_arabic')} | {key}")
                    print(f"   keys={list(ev.keys())}")
                    print(f"   text={text[:150]}")
                    print(f"   full={json.dumps(ev, ensure_ascii=False)[:250]}")
                    print()
