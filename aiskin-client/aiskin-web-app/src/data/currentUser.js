/** Thông tin người dùng hiện tại (demo).
 *  Sau này lấy từ User Service qua GraphQL. */
export const CURRENT_USER = {
  fullName: 'Jamie Smith',
  email: 'jamie@example.com',
  phone: '0901 234 567',
  gender: 'Nữ',
  joinedAt: '01/2024',
  skinType: 'Da hỗn hợp',
  concerns: ['Mụn', 'Sạm nám', 'Lỗ chân lông'],
}

/** Lấy chữ cái đầu của họ tên để hiển thị avatar (vd "Jamie Smith" -> "JS"). */
export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
