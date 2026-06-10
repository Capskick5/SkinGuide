import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const AiSkinApp());
}

class AiSkinApp extends StatelessWidget {
  const AiSkinApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AiSkin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const HomeScreen(),
    );
  }
}
