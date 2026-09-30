// =====================================================================
// سَكِينَة — الهوية البصرية (نفس نظام تصميم نسخة الويب)
// ألوان ليلية هادئة + ذهبي، خطوط نسخية، زخارف هندسية مرسومة برمجيًا.
// =====================================================================
import 'dart:math' as math;

import 'package:flutter/material.dart';

class SakinahColors {
  // الوضع الليلي
  static const ink900 = Color(0xFF08111C);
  static const ink850 = Color(0xFF0A1524);
  static const ink800 = Color(0xFF0D1B2A);
  static const ink750 = Color(0xFF102132);
  static const ink700 = Color(0xFF14273A);
  static const ink600 = Color(0xFF1C3349);

  static const gold400 = Color(0xFFD9BD85);
  static const gold500 = Color(0xFFC6A265);
  static const gold600 = Color(0xFFA88A58);
  static const gold700 = Color(0xFF8A6F45);

  static const cream100 = Color(0xFFF7F3EA);
  static const cream200 = Color(0xFFE9E2D3);
  static const cream300 = Color(0xFFCDC4B2);

  static const teal400 = Color(0xFF6FB3A8);
  static const rose400 = Color(0xFFC98585);

  // الوضع النهاري
  static const lightBg = Color(0xFFFAF7F0);
  static const lightRaised = Color(0xFFFFFFFF);
  static const lightSunken = Color(0xFFEFE9DC);
  static const lightText = Color(0xFF241D12);
  static const lightSecondary = Color(0xFF4E4436);
  static const lightGold = Color(0xFF8D6F33);
}

class SakinahTheme {
  static ThemeData dark() {
    const scheme = ColorScheme.dark(
      primary: SakinahColors.gold500,
      onPrimary: Color(0xFF17222F),
      secondary: SakinahColors.teal400,
      surface: SakinahColors.ink800,
      onSurface: SakinahColors.cream100,
      error: SakinahColors.rose400,
    );
    return _base(scheme, SakinahColors.ink800, SakinahColors.ink750);
  }

  static ThemeData light() {
    const scheme = ColorScheme.light(
      primary: SakinahColors.lightGold,
      onPrimary: Colors.white,
      secondary: SakinahColors.teal400,
      surface: SakinahColors.lightBg,
      onSurface: SakinahColors.lightText,
      error: Color(0xFF9E4B4B),
    );
    return _base(scheme, SakinahColors.lightBg, SakinahColors.lightRaised);
  }

  static ThemeData _base(ColorScheme scheme, Color bg, Color raised) {
    final isLight = scheme.brightness == Brightness.light;
    final border = isLight
        ? SakinahColors.lightGold.withValues(alpha: 0.24)
        : SakinahColors.gold500.withValues(alpha: 0.22);
    final textColor = isLight
        ? SakinahColors.lightText
        : SakinahColors.cream100;

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: bg,
      fontFamily: 'Cairo',
      dividerColor: border,
      appBarTheme: AppBarTheme(
        backgroundColor: raised,
        foregroundColor: textColor,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Amiri',
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: isLight ? SakinahColors.lightGold : SakinahColors.gold400,
        ),
      ),
      cardTheme: CardThemeData(
        color: raised,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: border),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: raised,
        indicatorColor: SakinahColors.gold500.withValues(alpha: 0.14),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(fontFamily: 'Cairo', fontSize: 11),
        ),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final sel = states.contains(WidgetState.selected);
          return IconThemeData(
            color: sel
                ? (isLight ? SakinahColors.lightGold : SakinahColors.gold400)
                : (isLight
                      ? SakinahColors.lightSecondary
                      : SakinahColors.cream300),
            size: 22,
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: SakinahColors.gold500,
          foregroundColor: const Color(0xFF17222F),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textColor,
          side: BorderSide(color: border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
          textStyle: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: raised,
        selectedColor: SakinahColors.gold500.withValues(alpha: 0.18),
        side: BorderSide(color: border),
        labelStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
        shape: const StadiumBorder(),
      ),
      textTheme: TextTheme(
        displayLarge: const TextStyle(
          fontFamily: 'Amiri',
          fontWeight: FontWeight.w700,
        ),
        displayMedium: const TextStyle(
          fontFamily: 'Amiri',
          fontWeight: FontWeight.w700,
        ),
        headlineMedium: TextStyle(
          fontFamily: 'Amiri',
          fontWeight: FontWeight.w700,
          color: isLight ? SakinahColors.lightGold : SakinahColors.gold400,
        ),
        titleLarge: TextStyle(
          fontFamily: 'Amiri',
          fontWeight: FontWeight.w700,
          color: isLight ? SakinahColors.lightGold : SakinahColors.gold400,
        ),
        bodyLarge: TextStyle(
          fontFamily: 'NotoNaskh',
          fontSize: 17,
          height: 1.9,
          color: textColor,
        ),
        bodyMedium: TextStyle(fontFamily: 'Cairo', color: textColor),
        bodySmall: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 12,
          color: isLight
              ? SakinahColors.lightSecondary
              : SakinahColors.cream300,
        ),
        labelSmall: const TextStyle(fontFamily: 'Cairo', fontSize: 11),
      ),
    );
  }
}

// =====================================================================
// زخارف إسلامية هندسية — كلها مرسومة برمجيًا (لا أصول مصوّرة محميّة)
// =====================================================================

/// نجمة ثمانية: مربعان متقاطعان — أساس الزخرفة الإسلامية.
class Star8Painter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  Star8Painter({required this.color, this.strokeWidth = 1.4});

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final r = size.shortestSide * 0.42;
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeJoin = StrokeJoin.round;

    for (final rot in [0.0, math.pi / 4]) {
      final path = Path();
      for (var k = 0; k < 4; k++) {
        final a = rot + (math.pi / 2) * k - math.pi / 2;
        final p = Offset(c.dx + r * math.cos(a), c.dy + r * math.sin(a));
        if (k == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      path.close();
      canvas.drawPath(path, paint);
    }

    canvas.drawCircle(c, size.shortestSide * 0.065, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant Star8Painter old) =>
      old.color != color || old.strokeWidth != strokeWidth;
}

/// شريط زخرفي هندسي متكرر (فاتحة الأقسام).
class OrnamentStripPainter extends CustomPainter {
  final Color color;
  OrnamentStripPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9;
    final h = size.height;
    final cy = h / 2;
    const unit = 90.0;
    final count = (size.width / unit).ceil() + 1;

    for (var i = 0; i < count; i++) {
      final x = i * unit;
      _diamond(canvas, paint, x + 15, cy, h * 0.34);
      _diamond(canvas, paint, x + 15, cy, h * 0.18);
      _diamond(canvas, paint, x + 45, cy, h * 0.26);
      _diamond(canvas, paint, x + 75, cy, h * 0.40);
      _diamond(canvas, paint, x + 75, cy, h * 0.20);
      canvas.drawLine(Offset(x + 26, cy), Offset(x + 37, cy), paint);
      canvas.drawLine(Offset(x + 53, cy), Offset(x + 64, cy), paint);
    }
  }

  void _diamond(Canvas canvas, Paint paint, double cx, double cy, double r) {
    final path = Path()
      ..moveTo(cx, cy - r)
      ..lineTo(cx + r, cy)
      ..lineTo(cx, cy + r)
      ..lineTo(cx - r, cy)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant OrnamentStripPainter old) => old.color != color;
}

/// فاصل مزخرف بوسط هندسي.
class OrnamentDivider extends StatelessWidget {
  final Color? color;
  const OrnamentDivider({super.key, this.color});

  @override
  Widget build(BuildContext context) {
    final c =
        color ?? Theme.of(context).colorScheme.primary.withValues(alpha: 0.6);
    return Row(
      children: [
        Expanded(child: Divider(color: c.withValues(alpha: 0.4))),
        const SizedBox(width: 10),
        SizedBox(
          width: 22,
          height: 22,
          child: CustomPaint(painter: Star8Painter(color: c)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Divider(color: c.withValues(alpha: 0.4))),
      ],
    );
  }
}

/// شريط زخرفي رقيق.
class OrnamentStrip extends StatelessWidget {
  final Color? color;
  final double height;
  const OrnamentStrip({super.key, this.color, this.height = 22});

  @override
  Widget build(BuildContext context) {
    final c =
        color ?? Theme.of(context).colorScheme.primary.withValues(alpha: 0.45);
    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(painter: OrnamentStripPainter(color: c)),
    );
  }
}
