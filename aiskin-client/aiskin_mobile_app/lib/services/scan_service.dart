import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../models/face_pose.dart';

/// Dịch vụ giao tiếp với relay server demo cho một phiên ghép nối.
class ScanService {
  /// Báo cho server biết điện thoại đã kết nối (sau khi quét QR).
  Future<bool> connect({required String serverUrl, required String sessionId}) async {
    try {
      final res = await http.post(Uri.parse('$serverUrl/api/session/$sessionId/connect'));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Upload một ảnh khuôn mặt lên server cho phiên [sessionId].
  Future<bool> uploadImage({
    required String serverUrl,
    required String sessionId,
    required File image,
    String label = 'Ảnh khuôn mặt',
  }) async {
    try {
      final uri = Uri.parse('$serverUrl/api/session/$sessionId/images');
      final req = http.MultipartRequest('POST', uri)
        ..fields['label'] = label
        ..files.add(await http.MultipartFile.fromPath(
          'file',
          image.path,
          contentType: MediaType('image', 'jpeg'),
        ));
      final res = await req.send();
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Upload tuần tự nhiều ảnh (3 góc), mỗi ảnh kèm nhãn góc chụp.
  /// Trả về true nếu tất cả thành công.
  Future<bool> uploadShots({
    required String serverUrl,
    required String sessionId,
    required List<CapturedShot> shots,
  }) async {
    for (final shot in shots) {
      final ok = await uploadImage(
        serverUrl: serverUrl,
        sessionId: sessionId,
        image: File(shot.path),
        label: shot.pose.label,
      );
      if (!ok) return false;
    }
    return true;
  }
}
