import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/gradient_button.dart';
import 'qr_scan_screen.dart';

/// Màn hình chính: giới thiệu + nút bắt đầu quét (mở camera quét QR ghép nối).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  void _startPairing(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const QrScanScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              // Logo + tên
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: AppColors.brandGradient,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.spa, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  RichText(
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                      children: [
                        TextSpan(text: 'Ai', style: TextStyle(color: AppColors.primary)),
                        TextSpan(text: 'Skin', style: TextStyle(color: AppColors.onSurface)),
                      ],
                    ),
                  ),
                ],
              ),
              const Spacer(),

              // Hình minh họa
              Center(
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: const BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.face_retouching_natural,
                      size: 88, color: AppColors.primary),
                ),
              ),
              const SizedBox(height: 32),

              const Text(
                'Quét khuôn mặt của bạn',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Quét mã QR hiển thị trên website AiSkin, sau đó chụp ảnh khuôn mặt để gửi lên phân tích.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: AppColors.onSurfaceVariant, height: 1.5),
              ),

              const Spacer(),

              GradientButton(
                label: 'Bắt đầu quét',
                icon: Icons.qr_code_scanner,
                onPressed: () => _startPairing(context),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
