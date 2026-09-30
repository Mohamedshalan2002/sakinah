# -*- coding: utf-8 -*-
"""
محرك مواقيت الصلاة والقبلة — مبني على حسابات فلكية معيارية.

المرجع المعياري:
  Astronomical Algorithms (Jean Meeus, 2nd ed.) — زوايا الشمس وحساب
  خطوط الطول/العرض للشمس، وتعديلاتها.
  الصيغ القياسية لمواقيت الصلاة (كما في Adhan / PrayTimes):
    • زاوية الفجر والعشاء من الإدارة (أم القرى / رابطة العالم الإسلامي / إلخ)
    • وقت الظهر = الزوال الشمسي + تعديل الدقائق
    • العصر: ظل = (factor + tan|فرق الميل|)، factor=1 للجمهور و2 للحنفي

يُستخدم هذا الملف في نسخة الويب (منقولًا إلى JS) وفي مشروع Flutter
(عبر حزمة adhan) كمرجع للتحقق.

التحقق: data/scripts/verify_prayer.py يقارن النتائج بمصدر مستقل (AlAdhan API).
"""
from __future__ import annotations

import json
import math
import os
import sys
from datetime import date, datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "data", "prayer")

# ---------------------------------------------------------------------------
# طرق حساب المواقيت (الزوايا المعتمدة رسميًا)
# ---------------------------------------------------------------------------
METHODS = {
    "MWL": {                      # رابطة العالم الإسلامي
        "nameAr": "رابطة العالم الإسلامي",
        "fajr": 18.0, "isha": 17.0, "maghribMinutes": 0, "asr": 1,
    },
    "EGYPT": {                    # الهيئة المصرية العامة للمساحة
        "nameAr": "الهيئة المصرية العامة للمساحة",
        "fajr": 19.5, "isha": 17.5, "maghribMinutes": 0, "asr": 1,
    },
    "KARACHI": {                  # جامعة العلوم الإسلامية بكراتشي
        "nameAr": "جامعة العلوم الإسلامية — كراتشي",
        "fajr": 18.0, "isha": 18.0, "maghribMinutes": 0, "asr": 1,
    },
    "UMM_AL_QURA": {              # أم القرى بمكة المكرمة (المعتمد في AlAdhan id=4)
        "nameAr": "أم القرى — مكة المكرمة",
        "fajr": 18.5, "ishaMinutes": 90, "maghribMinutes": 0, "asr": 1,
    },
    "GULF": {                     # المنطقة الخليجية
        "nameAr": "المنطقة الخليجية",
        "fajr": 19.5, "ishaMinutes": 90, "maghribMinutes": 0, "asr": 1,
    },
    "QATAR": {
        "nameAr": "قطر",
        "fajr": 18.0, "ishaMinutes": 90, "maghribMinutes": 0, "asr": 1,
    },
    "KUWAIT": {
        "nameAr": "الكويت",
        "fajr": 18.0, "isha": 17.5, "maghribMinutes": 0, "asr": 1,
    },
    "SINGAPORE": {
        "nameAr": "سنغافورة (مجلس سنغافورة الإسلامي)",
        "fajr": 20.0, "isha": 18.0, "maghribMinutes": 0, "asr": 1,
    },
    "JAKIM": {
        "nameAr": "ماليزيا (جاكيم)",
        "fajr": 20.0, "isha": 18.0, "maghribMinutes": 0, "asr": 1,
    },
    "KEMENAG": {
        "nameAr": "إندونيسيا (وزارة الأديان)",
        "fajr": 20.0, "isha": 18.0, "maghribMinutes": 0, "asr": 1,
    },
    "MOROCCO": {
        "nameAr": "المغرب",
        "fajr": 19.0, "isha": 17.0, "maghribMinutes": 0, "asr": 1,
    },
    "TUNISIA": {
        "nameAr": "تونس",
        "fajr": 18.0, "isha": 18.0, "maghribMinutes": 0, "asr": 1,
    },
    "ALGERIA": {
        "nameAr": "الجزائر",
        "fajr": 18.0, "isha": 17.0, "maghribMinutes": 0, "asr": 1,
    },
    "JORDAN": {
        "nameAr": "الأردن (وزارة الأوقاف)",
        "fajr": 18.0, "isha": 18.0, "maghribMinutes": 5, "asr": 1,
    },
    "FRANCE": {
        "nameAr": "فرنسا (اتحاد المنظمات الإسلامية)",
        "fajr": 12.0, "isha": 12.0, "maghribMinutes": 0, "asr": 1,
    },
    "RUSSIA": {
        "nameAr": "روسيا (الإدارة الدينية)",
        "fajr": 16.0, "isha": 15.0, "maghribMinutes": 0, "asr": 1,
    },
    "TURKEY": {
        "nameAr": "رئاسة الشؤون الدينية التركية",
        "fajr": 18.0, "isha": 17.0, "maghribMinutes": 0, "asr": 1,
    },
    "NORTH_AMERICA": {
        "nameAr": "الجمعية الإسلامية لأمريكا الشمالية",
        "fajr": 15.0, "isha": 15.0, "maghribMinutes": 0, "asr": 1,
    },
    "DUBAI": {
        "nameAr": "الإمارات — دبي",
        "fajr": 18.2, "isha": 18.2, "maghribMinutes": 3, "asr": 1,
    },
}

DEFAULT_METHOD = "MWL"

# مذهب العصر: 1 = الجمهور (الشافعي/المالكي/الحنبلي)، 2 = الحنفي
MIDNIGHT_MODE = 1

# ── قاعدة العروض العالية ──
#
# في الصيف عند خطوط العرض الكبيرة (لندن 51.5° وما فوق) قد لا تهبط الشمس تحت
# زاوية الفجر/العشاء إطلاقًا، فيرجع الحساب None. الحل المعياري (كما في
# PrayTimes وتنفيذه في AlAdhan تحت اسم ANGLE_BASED، وهو الافتراضي هناك):
#
#     الليل = من المغرب إلى شروق اليوم التالي
#     نصيب = (الزاوية / 60) × الليل
#     الفجر = الشروق − نصيب      |      العشاء = المغرب + نصيب
#
# تحققنا من المعادلة عدديًا بمثال لندن 2026-06-21: الليل = 441 دقيقة،
# نصيب = (15/60)×441 = 110.25 دقيقة → فجر 02:53 وعشاء 23:12، وهما
# الرقمآن المنشوران في المرجع المستقل. لذلك اعتمدنا هذه القاعدة.
HIGH_LAT_MODE = "angle_based"

ASR_FACTORS = {1: 1.0, 2: 2.0}

KAABA_LAT = 21.4224779
KAABA_LON = 39.8251832


# ---------------------------------------------------------------------------
# حسابات فلكية (Meeus)
# ---------------------------------------------------------------------------
def _julian_day(y: int, m: int, d: float) -> float:
    if m <= 2:
        y -= 1
        m += 12
    a = y // 100
    b = 2 - a + a // 4
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + b - 1524.5


def _sun_position(jd: float) -> tuple:
    """ميل الشمس (declination) ومعادلة الزمن (بالدقائق)."""
    d = jd - 2451545.0
    g = math.radians((357.529 + 0.98560028 * d) % 360)
    q = (280.459 + 0.98564736 * d) % 360
    L = math.radians((q + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)) % 360)

    e = math.radians(23.439 - 0.00000036 * d)
    decl = math.asin(math.sin(e) * math.sin(L))

    ra = math.degrees(math.atan2(math.cos(e) * math.sin(L), math.cos(L))) / 15.0
    ra = (ra + 24) % 24
    eqt = q / 15.0 - ra
    while eqt > 12:
        eqt -= 24
    while eqt < -12:
        eqt += 24
    return decl, eqt


def _mid_day(jd: float, tz_offset_hours: float, lon: float) -> float:
    """الزوال الشمسي (بالساعات) بتوقيت المنطقة."""
    _, eqt = _sun_position(jd)
    return 12.0 - eqt - lon / 15.0 + tz_offset_hours


def _sun_angle_time(jd: float, lat: float, angle: float, direction: int,
                    tz_offset_hours: float, lon: float) -> float | None:
    """الوقت الذي تكون فيه الشمس بزاوية معيّنة تحت الأفق.

    direction: -1 قبل الزوال (الفجر)، +1 بعده (العشاء/المغرب).
    """
    decl, _ = _sun_position(jd)
    noon = _mid_day(jd, tz_offset_hours, lon)
    phi = math.radians(lat)
    numerator = math.sin(math.radians(-angle)) - math.sin(phi) * math.sin(decl)
    denominator = math.cos(phi) * math.cos(decl)
    if denominator == 0:
        return None
    cos_val = numerator / denominator
    if cos_val < -1 or cos_val > 1:
        return None
    t = math.degrees(math.acos(cos_val)) / 15.0
    return noon + direction * t


def _asr_time(jd: float, lat: float, factor: float, tz_offset_hours: float,
              lon: float) -> float | None:
    """وقت العصر: عندما يكون ظل الشيء = (factor + tan|ميل الشمس - عرض المكان|)."""
    decl, _ = _sun_position(jd)
    noon = _mid_day(jd, tz_offset_hours, lon)
    phi = math.radians(lat)
    angle = math.atan(1.0 / (factor + math.tan(abs(phi - decl))))
    return _sun_angle_time(jd, lat, -math.degrees(angle), 1, tz_offset_hours, lon)


def _hour_min(h: float | None) -> str | None:
    if h is None:
        return None
    total = int(round(h * 60)) % (24 * 60)
    if total < 0:
        total += 24 * 60
    return "%02d:%02d" % (total // 60, total % 60)


def _high_lat_time(base: float, night_span: float, angle_deg: float,
                   direction: int) -> float:
    """قاعدة ANGLE_BASED للعروض العالية.

    direction = -1 للفجر (نرجع للخلف من الشروق)، +1 للعشاء (نتقدم من المغرب).
    """
    portion = (angle_deg / 60.0) * night_span
    return base + direction * portion


def compute_times(lat: float, lon: float, on: date, method: str = DEFAULT_METHOD,
                  asr_madhab: int = 1, tz_offset_hours: float | None = None,
                  elevation: float = 0.0) -> dict:
    """يحسب مواقيت الصلاة لموقع ويوم محددين (بدون شبكة)."""
    if method not in METHODS:
        raise ValueError(f"طريقة غير معروفة: {method}")
    cfg = METHODS[method]
    if tz_offset_hours is None:
        tz_offset_hours = round(lon / 15.0)

    jd = _julian_day(on.year, on.month, on.day)
    jd_noon = jd + 0.5  # منتصف اليوم بتوقيت UT تقريبًا

    dh = elevation / 1000.0
    # انخفاض الأفق الناتج عن الارتفاع (بالدرجات ≈ 0.0347*sqrt(h بالمتر))
    horizon_dip = 0.0347 * math.sqrt(max(0.0, elevation))

    imsak = _sun_angle_time(jd_noon, lat, 18.0, -1, tz_offset_hours, lon)
    fajr = _sun_angle_time(jd_noon, lat, cfg["fajr"], -1, tz_offset_hours, lon)
    sunrise = _sun_angle_time(jd_noon, lat, 0.833 + horizon_dip, -1, tz_offset_hours, lon)
    noon = _mid_day(jd_noon, tz_offset_hours, lon)

    # العصر: الزاوية المحسوبة بمعامل المذهب
    decl, _ = _sun_position(jd_noon)
    phi = math.radians(lat)
    asr_angle = math.degrees(math.atan(
        1.0 / (ASR_FACTORS[asr_madhab] + math.tan(abs(phi - decl)))))
    asr = _sun_angle_time(jd_noon, lat, -asr_angle, 1, tz_offset_hours, lon)

    sunset = _sun_angle_time(jd_noon, lat, 0.833 + horizon_dip, 1, tz_offset_hours, lon)
    maghrib = sunset + cfg.get("maghribMinutes", 0) / 60.0 if sunset else None

    isha = None
    if "ishaMinutes" in cfg and maghrib is not None:
        isha = maghrib + cfg["ishaMinutes"] / 60.0
    elif "isha" in cfg:
        isha = _sun_angle_time(jd_noon, lat, cfg["isha"], 1, tz_offset_hours, lon)

    # ── قاعدة العروض العالية (ANGLE_BASED) ──
    # الليل = من المغرب إلى شروق اليوم التالي؛ ونقيس النصيب عليه.
    next_sunrise = _sun_angle_time(jd_noon + 1, lat, 0.833 + horizon_dip, -1,
                                   tz_offset_hours, lon)
    fallback_used = None
    if (fajr is None or isha is None) and maghrib is not None and next_sunrise is not None:
        night_span = next_sunrise - maghrib
        if night_span <= 0:
            night_span += 24.0
        if fajr is None:
            fajr = _high_lat_time(sunrise, night_span, cfg["fajr"], -1)
            fallback_used = (fallback_used or "") + "fajr:" + HIGH_LAT_MODE + ";"
        if isha is None and "isha" in cfg:
            isha = _high_lat_time(maghrib, night_span, cfg["isha"], 1)
            fallback_used = (fallback_used or "") + "isha:" + HIGH_LAT_MODE + ";"

    midnight = None
    if sunset and sunrise:
        # منتصف الليل الشرعي: من المغرب إلى الفجر التالي
        next_fajr = _sun_angle_time(jd_noon + 1, lat, cfg["fajr"], -1,
                                    tz_offset_hours, lon)
        if next_fajr is None:
            next_fajr = next_sunrise
        if next_fajr is not None:
            f = next_fajr + 24.0 if next_fajr < maghrib else next_fajr
            midnight = maghrib + (f - maghrib) / 2.0
            if midnight >= 24:
                midnight -= 24

    return {
        "date": on.isoformat(),
        "latitude": lat,
        "longitude": lon,
        "elevation": elevation,
        "timezoneOffset": tz_offset_hours,
        "method": method,
        "methodNameAr": cfg["nameAr"],
        "asrMadhab": asr_madhab,
        "highLatFallback": fallback_used,
        "times": {
            "imsak": _hour_min(imsak),
            "fajr": _hour_min(fajr),
            "sunrise": _hour_min(sunrise),
            "dhuhr": _hour_min(noon),
            "asr": _hour_min(asr),
            "sunset": _hour_min(sunset),
            "maghrib": _hour_min(maghrib),
            "isha": _hour_min(isha),
            "midnight": _hour_min(midnight),
        },
    }


# ---------------------------------------------------------------------------
# القبلة
# ---------------------------------------------------------------------------
def qibla_direction(lat: float, lon: float) -> dict:
    """زاوية القبلة (بالدرجات من الشمال، باتجاه عقارب الساعة)."""
    phi1 = math.radians(lat)
    phi2 = math.radians(KAABA_LAT)
    d_lambda = math.radians(KAABA_LON - lon)
    y = math.sin(d_lambda)
    x = math.cos(phi1) * math.tan(phi2) - math.sin(phi1) * math.cos(d_lambda)
    bearing = math.degrees(math.atan2(y, x))
    bearing = (bearing + 360) % 360

    # المسافة الكبرى إلى الكعبة (كم)
    d = 2 * math.asin(math.sqrt(
        math.sin((phi2 - phi1) / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2))
    return {
        "bearing": round(bearing, 2),
        "distanceKm": round(6371.0088 * d, 1),
        "kaaba": {"latitude": KAABA_LAT, "longitude": KAABA_LON},
    }


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    # إنتاج جدول مرجعي لمكة والمدينة والقاهرة والرياض لعدة أيام (للاستخدام في الاختبار)
    cities = [
        {"id": "makkah", "nameAr": "مكة المكرمة", "lat": 21.4225, "lon": 39.8262, "tz": 3},
        {"id": "madinah", "nameAr": "المدينة المنورة", "lat": 24.4686, "lon": 39.6142, "tz": 3},
        {"id": "cairo", "nameAr": "القاهرة", "lat": 30.0444, "lon": 31.2357, "tz": 2},
        {"id": "riyadh", "nameAr": "الرياض", "lat": 24.7136, "lon": 46.6753, "tz": 3},
        {"id": "istanbul", "nameAr": "إستانبول", "lat": 41.0082, "lon": 28.9784, "tz": 3},
    ]
    out = {"methods": METHODS, "cities": []}
    for c in cities:
        q = qibla_direction(c["lat"], c["lon"])
        sample = compute_times(c["lat"], c["lon"], date(2026, 9, 30),
                               DEFAULT_METHOD, 1, c["tz"])
        out["cities"].append({**c, "qibla": q, "sample": sample["times"]})

    with open(os.path.join(OUT, "cities.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print("[ok] جدول المدن والقبلة مكتوب في data/prayer/cities.json")
    for c in out["cities"]:
        print(f"  {c['nameAr']}: قبلة {c['qibla']['bearing']}° "
              f"({c['qibla']['distanceKm']} كم) | "
              f"فجر {c['sample']['fajr']} ظهر {c['sample']['dhuhr']} "
              f"عصر {c['sample']['asr']} مغرب {c['sample']['maghrib']} "
              f"عشاء {c['sample']['isha']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
