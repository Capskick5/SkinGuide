import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/gradient_button.dart';

/// Màn hình xác nhận đã gửi ảnh thành công lên web.
class SuccessScreen extends StatelessWidget {
  const SuccessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: AppColors.success, size: 60),
              ),
              const SizedBox(height: 24),
              const Text(
                'Đã gửi ảnh thành công!',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Ảnh của bạn đã được gửi lên website. Vui lòng quay lại màn hình web để xem kết quả phân tích da.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.onSurfaceVariant, height: 1.5),
              ),
              const SizedBox(height: 32),
              GradientButton(
                label: 'Hoàn tất',
                icon: Icons.done,
                onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
