# -*- coding: utf-8 -*-
"""
توليد أيقونات تطبيق «سَكِينَة» (زخرفة هندسية إسلامية بنجم ثماني).

كل الرسومات **مُولّدة برمجيًا** هنا: لا أصول محميّة ولا صور خارجية.
الألوان من هوية التطبيق (كحلي ليلي + ذهبي هادئ).
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "web", "assets", "icons")

INK = (13, 27, 42)          # كحلي ليلي
GOLD = (198, 162, 101)      # ذهبي هادئ
CREAM = (247, 243, 234)     # كريمي
GOLD_SOFT = (168, 138, 88)


def draw_star8(d, cx, cy, r, width, color):
    """نجمة ثمانية (مربعان متقاطعان) — أساس الزخرفة الإسلامية."""
    for rot in (0, 45):
        pts = []
        import math
        for k in range(4):
            a = math.radians(rot + 90 * k)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        pts.append(pts[0])
        d.line(pts, fill=color, width=width, joint="curve")


def make_icon(size: int, pad_ratio: float = 0.14) -> Image.Image:
    img = Image.new("RGBA", (size, size), INK + (255,))
    d = ImageDraw.Draw(img)

    # حلقة خارجية
    m = size * pad_ratio
    d.ellipse([m, m, size - m, size - m], outline=GOLD_SOFT + (255,),
              width=max(1, size // 90))

    # نجمتان ثمانيتان متداخلتان (زخرفة)
    cx = cy = size / 2
    draw_star8(d, cx, cy, size * 0.33, max(2, size // 48), GOLD + (255,))
    draw_star8(d, cx, cy, size * 0.42, max(1, size // 96), GOLD_SOFT + (255,))

    # قلب الزخرفة: دائرة كريمية
    r = size * 0.085
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CREAM + (255,))

    return img


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    sizes = [32, 96, 152, 167, 180, 192, 256, 384, 512, 1024]
    for s in sizes:
        img = make_icon(s)
        path = os.path.join(OUT, f"icon-{s}.png")
        img.save(path, "PNG", optimize=True)
        print(f"[ok] icon-{s}.png  ({os.path.getsize(path)} bytes)")

    # نسخة maskable (هوامش أوسع لدائرة الأمان)
    img = make_icon(512, pad_ratio=0.24)
    img.save(os.path.join(OUT, "maskable-512.png"), "PNG", optimize=True)
    print("[ok] maskable-512.png")

    # favicon
    make_icon(64).save(os.path.join(OUT, "favicon.png"), "PNG", optimize=True)
    print("[ok] favicon.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
