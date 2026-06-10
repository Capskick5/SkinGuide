// Smoke test cho màn hình chính AiSkin.
import 'package:flutter_test/flutter_test.dart';

import 'package:aiskin_mobile_app/main.dart';

void main() {
  testWidgets('Màn hình chính hiển thị tiêu đề và nút quét', (WidgetTester tester) async {
    await tester.pumpWidget(const AiSkinApp());

    expect(find.text('Quét khuôn mặt của bạn'), findsOneWidget);
    expect(find.text('Bắt đầu quét'), findsOneWidget);
  });
}
