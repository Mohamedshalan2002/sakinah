# -*- coding: utf-8 -*-
"""اختبار سريع: مقارنة مدينة واحدة بطريقة واحدة، لطباعة الفروق بالتفصيل."""
import json
import sys
import urllib.parse
import urllib.request
from datetime import date

sys.path.insert(0, "data/scripts")
import prayer_engine as PE  # noqa: E402

city = {"nameAr": "القاهرة", "lat": 30.0444, "lon": 31.2357}
on = date(2026, 9, 30)

params = {"latitude": city["lat"], "longitude": city["lon"], "method": 5, "school": 0}
url = ("https://api.aladhan.com/v1/timings/" + on.strftime("%d-%m-%Y")
       + "?" + urllib.parse.urlencode(params))
req = urllib.request.Request(url, headers={"User-Agent": "SakinahVerify/1.0"})
with urllib.request.urlopen(req, timeout=30) as resp:
    data = json.loads(resp.read().decode("utf-8"))
ref = data["data"]["timings"]
print("meta:", json.dumps(data["data"].get("meta", {}), ensure_ascii=False)[:400])
print()
print("مرجع AlAdhan:")
for k in ("Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"):
    print(f"  {k:8s} {ref.get(k)}")
print()
ours = PE.compute_times(city["lat"], city["lon"], on, "EGYPT", 1, None)
print("محركنا:")
for k, v in ours["times"].items():
    print(f"  {k:8s} {v}")
print()
print("en الوقت المحلي المغرب عندنا:", ours["times"]["maghrib"], "| المرجع:", ref.get("Maghrib"))

# القبلة من AlAdhan
qurl = f"https://api.aladhan.com/v1/qibla/{city['lat']}/{city['lon']}"
with urllib.request.urlopen(urllib.request.Request(
        qurl, headers={"User-Agent": "SakinahVerify/1.0"}), timeout=30) as resp:
    qd = json.loads(resp.read().decode("utf-8"))
print()
print("قبلة المرجع:", qd["data"].get("direction"))
print("قبلتنا:", PE.qibla_direction(city["lat"], city["lon"]))
