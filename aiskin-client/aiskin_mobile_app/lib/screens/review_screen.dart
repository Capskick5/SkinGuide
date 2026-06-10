import 'dart:io';
import 'package:flutter/material.dart';
import '../models/pairing_session.dart';
import '../models/face_pose.dart';
import '../services/scan_service.dart';
import '../theme/app_theme.dart';
import '../widgets/gradient_button.dart';
import 'success_screen.dart';

/// Xem lại 3 ảnh đã chụp -> chụp lại hoặc gửi tất cả lên web.
class ReviewScreen extends StatefulWidget {
  const ReviewScreen({super.key, required this.session, required this.shots});

  final PairingSession session;
  final List<CapturedShot> shots;

  @override
  State<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends State<ReviewScreen> {
  final ScanService _service = ScanService();
  bool _sending = false;

  Future<void> _send() async {
    setState(() => _sending = true);
    final ok = await _service.uploadShots(
      serverUrl: widget.session.serverUrl,
      sessionId: widget.session.sessionId,
      shots: widget.shots,
    );
    if (!mounted) return;
    setState(() => _sending = false);
    if (ok) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const SuccessScreen()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gửi ảnh thất bại, vui lòng thử lại.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Xem lại ảnh')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Text(
                'Đã chụp đủ 3 góc. Kiểm tra ảnh có rõ nét, đủ sáng trước khi gửi.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: GridView.count(
                  crossAxisCount: 3,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.62,
                  children: widget.shots.map((shot) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              decoration: BoxDecoration(
                                border: Border.all(color: AppColors.borderPink, width: 2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Image.file(File(shot.path), fit: BoxFit.cover),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(shot.pose.icon, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Text(
                              shot.pose.label,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.onSurface,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),
              GradientButton(
                label: _sending ? 'Đang gửi…' : 'Gửi ${widget.shots.length} ảnh để phân tích',
                icon: Icons.cloud_upload,
                onPressed: _sending ? null : _send,
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: _sending ? null : () => Navigator.of(context).pop(),
                icon: const Icon(Icons.refresh, color: AppColors.primary),
                label: const Text('Chụp lại', style: TextStyle(color: AppColors.primary)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
