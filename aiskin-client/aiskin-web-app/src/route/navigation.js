import { PATHS } from './paths'

/**
 * Cấu hình các mục điều hướng dùng chung cho Sidebar (desktop) và
 * Bottom Navigation (mobile). icon = tên Material Symbols.
 */
export const NAV_ITEMS = [
  { key: 'scan', label: 'Quét da', icon: 'document_scanner', path: PATHS.DASHBOARD },
  { key: 'skin', label: 'Da của tôi', icon: 'face', path: PATHS.ANALYSIS },
  { key: 'routine', label: 'Lộ trình', icon: 'calendar_today', path: PATHS.ROUTINE },
  { key: 'products', label: 'Sản phẩm', icon: 'shopping_bag', path: PATHS.PRODUCTS },
  { key: 'orders', label: 'Đơn hàng', icon: 'local_shipping', path: PATHS.ORDERS },
  { key: 'history', label: 'Lịch sử', icon: 'history', path: PATHS.HISTORY },
]

/** Các mục hiển thị trên bottom nav của mobile (rút gọn) */
export const MOBILE_NAV_ITEMS = [
  { key: 'scan', label: 'Quét da', icon: 'document_scanner', path: PATHS.DASHBOARD },
  { key: 'skin', label: 'Da', icon: 'face', path: PATHS.ANALYSIS },
  { key: 'routine', label: 'Lộ trình', icon: 'calendar_today', path: PATHS.ROUTINE },
  { key: 'products', label: 'Sản phẩm', icon: 'shopping_bag', path: PATHS.PRODUCTS },
  { key: 'orders', label: 'Đơn hàng', icon: 'local_shipping', path: PATHS.ORDERS },
  { key: 'history', label: 'Lịch sử', icon: 'history', path: PATHS.HISTORY },
]
