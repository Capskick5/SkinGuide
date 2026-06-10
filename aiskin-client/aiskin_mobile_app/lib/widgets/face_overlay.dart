import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Lớp phủ vẽ khung oval định vị khuôn mặt + làm tối vùng xung quanh.
class FaceOverlay extends StatelessWidget {
  const FaceOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: CustomPaint(
        size: Size.infinite,
        painter: _FaceOverlayPainter(),
      ),
    );
  }
}

class _FaceOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final ovalRect = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * 0.42),
      width: size.width * 0.72,
      height: size.width * 0.95,
    );

    // Vùng tối bao quanh, chừa lỗ oval.
    final overlay = Path()..addRect(Offset.zero & size);
    final hole = Path()..addOval(ovalRect);
    final combined = Path.combine(PathOperation.difference, overlay, hole);
    canvas.drawPath(combined, Paint()..color = Colors.black.withValues(alpha: 0.5));

    // Viền oval.
    canvas.drawOval(
      ovalRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = AppColors.primaryGradStart,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
