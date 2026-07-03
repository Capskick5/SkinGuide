import { PATHS } from './paths'

export const NAV_ITEMS = [
  { key: 'products', label: 'Sản phẩm', icon: 'shopping_bag', path: PATHS.PRODUCTS },
  { key: 'scan', label: 'Quét da', icon: 'document_scanner', path: PATHS.SCAN },
  { key: 'skin', label: 'Da của tôi', icon: 'face', path: PATHS.ANALYSIS },
  { key: 'routine', label: 'Lộ trình', icon: 'calendar_today', path: PATHS.ROUTINE },
  { key: 'history', label: 'Lịch sử', icon: 'history', path: PATHS.HISTORY },
]

export const MOBILE_NAV_ITEMS = [
  { key: 'products', label: 'Sản phẩm', icon: 'shopping_bag', path: PATHS.PRODUCTS },
  { key: 'scan', label: 'Quét da', icon: 'document_scanner', path: PATHS.SCAN },
  { key: 'skin', label: 'Da', icon: 'face', path: PATHS.ANALYSIS },
  { key: 'routine', label: 'Lộ trình', icon: 'calendar_today', path: PATHS.ROUTINE },
  { key: 'history', label: 'Lịch sử', icon: 'history', path: PATHS.HISTORY },
]
