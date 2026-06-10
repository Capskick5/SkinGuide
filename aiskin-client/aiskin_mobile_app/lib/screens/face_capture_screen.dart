import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import '../models/pairing_session.dart';
import '../models/face_pose.dart';
import '../theme/app_theme.dart';
import '../widgets/face_overlay.dart';
import 'review_screen.dart';

/// Màn hình chụp khuôn mặt theo 3 góc: chính diện, nghiêng trái, nghiêng phải.
class FaceCaptureScreen extends StatefulWidget {
  const FaceCaptureScreen({super.key, required this.session});

  final PairingSession session;

  @override
  State<FaceCaptureScreen> createState() => _FaceCaptureScreenState();
}

class _FaceCaptureScreenState extends State<FaceCaptureScreen> {
  CameraController? _controller;
  Future<void>? _initFuture;
  bool _capturing = false;
  String? _error;

  int _index = 0; // góc đang chụp
  final List<CapturedShot> _shots = [];

  FacePose get _pose => kFacePoses[_index];

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        front,
        ResolutionPreset.high,
        enableAudio: false,
      );
      _controller = controller;
      _initFuture = controller.initialize();
      await _initFuture;
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) setState(() => _error = 'Không thể mở camera: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _capturing) return;
    setState(() => _capturing = true);
    try {
      final shot = await controller.takePicture();
      _shots.add(CapturedShot(pose: _pose, path: shot.path));

      if (_index < kFacePoses.length - 1) {
        // Sang góc tiếp theo.
        setState(() => _index += 1);
      } else {
        // Đủ 3 góc -> sang màn xem lại.
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ReviewScreen(session: widget.session, shots: List.of(_shots)),
          ),
        );
      }
    } catch (_) {
      // bỏ qua, cho phép chụp lại
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text('Chụp khuôn mặt (${_index + 1}/${kFacePoses.length})'),
      ),
      extendBodyBehindAppBar: true,
      body: _error != null
          ? _ErrorView(message: _error!)
          : FutureBuilder<void>(
              future: _initFuture,
              builder: (context, snapshot) {
                if (_controller == null ||
                    snapshot.connectionState != ConnectionState.done) {
                  return const Center(
                    child: CircularProgressIndicator(color: AppColors.primaryGradStart),
                  );
                }
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    CameraPreview(_controller!),
                    const FaceOverlay(),

                    // Chỉ báo tiến trình 3 góc
                    Positioned(
                      top: 100,
                      left: 0,
                      right: 0,
                      child: Column(
                        children: [
                          _StepDots(total: kFacePoses.length, current: _index),
                          const SizedBox(height: 12),
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.9),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.link, color: Colors.white, size: 16),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Đã kết nối · ${widget.session.sessionId}',
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Hướng dẫn góc hiện tại + nút chụp
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, Colors.black.withValues(alpha: 0.65)],
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(_pose.icon, color: Colors.white, size: 18),
                                  const SizedBox(width: 8),
                                  Text(
                                    _pose.label,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _pose.instruction,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white, fontSize: 14),
                            ),
                            const SizedBox(height: 20),
                            GestureDetector(
                              onTap: _capture,
                              child: Container(
                                width: 76,
                                height: 76,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 4),
                                ),
                                child: Container(
                                  margin: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(
                                    gradient: AppColors.brandGradient,
                                    shape: BoxShape.circle,
                                  ),
                                  child: _capturing
                                      ? const Padding(
                                          padding: EdgeInsets.all(20),
                                          child: CircularProgressIndicator(
                                              color: Colors.white, strokeWidth: 3),
                                        )
                                      : Icon(
                                          _index < kFacePoses.length - 1
                                              ? Icons.camera_alt
                                              : Icons.check,
                                          color: Colors.white,
                                        ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }
}

/// Dấu chấm thể hiện tiến trình các góc đã/đang chụp.
class _StepDots extends StatelessWidget {
  const _StepDots({required this.total, required this.current});
  final int total;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(total, (i) {
        final done = i < current;
        final active = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: active ? 28 : 10,
          height: 10,
          decoration: BoxDecoration(
            color: done || active ? AppColors.primaryGradStart : Colors.white38,
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.no_photography, color: Colors.white54, size: 56),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
          ],
        ),
      ),
    );
  }
}
