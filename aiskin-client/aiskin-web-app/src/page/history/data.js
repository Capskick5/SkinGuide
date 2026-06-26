/** Dữ liệu demo dùng chung cho Lịch sử & Tiến trình.
 *  Sau này lấy từ AI Scan Service (ScanAnalysis) + Skincare Service (UserProgress). */
export const SCAN_HISTORY = [
  {
    id: '1',
    date: 'Hôm nay',
    dateLabel: '20/06/2026',
    score: 82,
    tags: ['Mụn', 'Sạm nám'],
    skinTypes: ['Da dầu', 'Da nhạy cảm'],
    summary: 'Khá tốt, cần chăm sóc nhẹ.',
    conditions: [
      { icon: 'coronavirus', title: 'Mụn & khuyết điểm', severityLabel: 'Trung bình', severity: 'moderate', level: 60, description: 'Tập trung chủ yếu ở vùng quai hàm và cằm. Có thể do thay đổi nội tiết tố.' },
      { icon: 'wb_sunny', title: 'Sạm nám', severityLabel: 'Cần chú ý', severity: 'high', level: 85, description: 'Phát hiện đốm nắng ở vùng gò má trên. Cần tăng cường chống nắng.' },
      { icon: 'water_drop', title: 'Độ ẩm', severityLabel: 'Tối ưu', severity: 'optimal', level: 25, description: 'Hàng rào bảo vệ da còn nguyên vẹn, giữ ẩm tốt ở vùng chữ T.' },
    ],
  },
  {
    id: '2',
    date: '2 tuần trước',
    dateLabel: '06/06/2026',
    score: 78,
    tags: ['Mụn', 'Khô da'],
    skinTypes: ['Da dầu'],
    summary: 'Tương đối ổn, cần cải thiện độ ẩm.',
    conditions: [
      { icon: 'coronavirus', title: 'Mụn & khuyết điểm', severityLabel: 'Nặng', severity: 'high', level: 75, description: 'Mụn ẩn và mụn đầu đen ở vùng mũi và trán.' },
      { icon: 'water_drop', title: 'Độ ẩm', severityLabel: 'Thấp', severity: 'high', level: 70, description: 'Da thiếu ẩm ở vùng má, cần bổ sung kem dưỡng ẩm.' },
    ],
  },
  {
    id: '3',
    date: '1 tháng trước',
    dateLabel: '20/05/2026',
    score: 71,
    tags: ['Mụn', 'Mẩn đỏ'],
    skinTypes: ['Da nhạy cảm'],
    summary: 'Cần cải thiện nhiều hơn.',
    conditions: [
      { icon: 'coronavirus', title: 'Mụn & khuyết điểm', severityLabel: 'Nặng', severity: 'high', level: 80, description: 'Mụn viêm ở cằm và quai hàm.' },
      { icon: 'favorite', title: 'Mẩn đỏ', severityLabel: 'Cần chú ý', severity: 'moderate', level: 55, description: 'Vùng má bị kích ứng nhẹ.' },
    ],
  },
  {
    id: '4',
    date: '6 tuần trước',
    dateLabel: '09/05/2026',
    score: 67,
    tags: ['Mụn', 'Da dầu'],
    skinTypes: ['Da dầu'],
    summary: 'Tình trạng da yếu, cần lộ trình chăm sóc ngay.',
    conditions: [
      { icon: 'coronavirus', title: 'Mụn & khuyết điểm', severityLabel: 'Nghiêm trọng', severity: 'high', level: 90, description: 'Mụn viêm lan rộng ở trán và má.' },
      { icon: 'water_drop', title: 'Dầu thừa', severityLabel: 'Cần chú ý', severity: 'moderate', level: 65, description: 'Tiết dầu nhiều ở vùng chữ T.' },
    ],
  },
]

export const PROGRESS_STATS = [
  { label: 'Điểm da', value: '82' },
  { label: 'Lượt quét', value: '6' },
  { label: 'Chuỗi ngày', value: '12 ngày' },
]
