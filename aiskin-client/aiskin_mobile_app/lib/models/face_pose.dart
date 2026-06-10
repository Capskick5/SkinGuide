import 'package:flutter/material.dart';

/// Một góc chụp khuôn mặt trong quy trình quét da.
class FacePose {
  const FacePose({
    required this.id,
    required this.label,
    required this.instruction,
    required this.icon,
  });

  final String id;
  final String label;
  final String instruction;
  final IconData icon;
}

/// Ba góc cần chụp: chính diện, nghiêng trái, nghiêng phải.
const List<FacePose> kFacePoses = [
  FacePose(
    id: 'front',
    label: 'Chính diện',
    instruction: 'Nhìn thẳng vào camera, đưa khuôn mặt vào khung',
    icon: Icons.face,
  ),
  FacePose(
    id: 'left',
    label: 'Nghiêng trái',
    instruction: 'Quay mặt nhẹ sang TRÁI để lộ má phải',
    icon: Icons.turn_left,
  ),
  FacePose(
    id: 'right',
    label: 'Nghiêng phải',
    instruction: 'Quay mặt nhẹ sang PHẢI để lộ má trái',
    icon: Icons.turn_right,
  ),
];

/// Ảnh đã chụp gắn với một góc.
class CapturedShot {
  const CapturedShot({required this.pose, required this.path});
  final FacePose pose;
  final String path;
}
