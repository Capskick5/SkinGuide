/// Thông tin phiên ghép nối lấy từ mã QR trên web.
/// QR có dạng: aiskin://pair?server=SERVER_URL&session=MSS-XXXXXX
class PairingSession {
  const PairingSession({required this.sessionId, required this.serverUrl, this.raw});

  final String sessionId;
  final String serverUrl;
  final String? raw;

  /// Parse nội dung QR -> PairingSession. Trả về null nếu không hợp lệ.
  static PairingSession? tryParse(String? rawValue) {
    if (rawValue == null || rawValue.isEmpty) return null;

    final uri = Uri.tryParse(rawValue);
    if (uri != null) {
      final session = uri.queryParameters['session'];
      final server = uri.queryParameters['server'];
      if (session != null && session.isNotEmpty && server != null && server.isNotEmpty) {
        return PairingSession(
          sessionId: session,
          serverUrl: server.replaceAll(RegExp(r'/$'), ''),
          raw: rawValue,
        );
      }
    }
    return null;
  }
}
