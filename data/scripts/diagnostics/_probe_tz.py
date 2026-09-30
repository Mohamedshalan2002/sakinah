# -*- coding: utf-8 -*-
"""تجربة سريعة بعد إصلاح المنطقة الزمنية."""
import json
import sys
import urllib.parse
import urllib.request
from datetime import date

sys.path.insert(0, "data/scripts")
import prayer_engine as PE  # noqa: E402
import verify_prayer as VP  # noqa: E402

city = {"nameAr": "القاهرة", "lat": 30.0444, "lon": 31.2357}
on = date(2026, 9, 30)
ref, meta = VP.fetch_aladhan(city["lat"], city["lon"], on, 5, 0)
tz = meta.get("timezone")
off = VP.tz_offset_for(tz, on)
print("timezone:", tz, "offset:", off)
ours = PE.compute_times(city["lat"], city["lon"], on, "EGYPT", 1, off)
print()
for rk, ok_ in zip(VP.KEYS, VP.OUR_KEYS):
    mv = VP.to_minutes(ref.get(rk))
    ov = VP.to_minutes(ours["times"].get(ok_))
    d = ov - mv
    while d > 720:
        d -= 1440
    while d < -720:
        d += 1440
    print(f"  {rk:8s} ref={mv} ours={ov} diff={d:+d} دقيقة")
