import 'package:flutter/material.dart';

/// Bảng màu & theme của AiSkin (đồng bộ với web - tông hồng "Aura Radiant").
class AppColors {
  static const primary = Color(0xFFB10E6B);
  static const primaryGradStart = Color(0xFFF9A8D4);
  static const primaryGradEnd = Color(0xFFEC4899);
  static const primaryLight = Color(0xFFFCE7F3);
  static const tertiary = Color(0xFFB5005D);
  static const borderPink = Color(0xFFFBCFE8);
  static const surfaceSoft = Color(0xFFFFF5F9);
  static const onSurface = Color(0xFF121C2A);
  static const onSurfaceVariant = Color(0xFF574048);
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);

  /// Gradient hồng dùng cho nút/CTA chính.
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [primaryGradStart, primaryGradEnd],
  );
}

class AppTheme {
  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: Colors.white,
      fontFamily: 'Roboto',
    );

    return base.copyWith(
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        centerTitle: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
