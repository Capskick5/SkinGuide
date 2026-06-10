/**
 * Central route path registry.
 * Quản lý tập trung tất cả endpoint của ứng dụng để dễ bảo trì.
 * Dùng: import { PATHS } from '@/route/paths'
 */
export const PATHS = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // App (yêu cầu đăng nhập)
  DASHBOARD: '/',
  SCAN: '/scan',
  ANALYSIS: '/analysis',
  ROUTINE: '/routine',
  PRODUCTS: '/products',
  HISTORY: '/history',
  PROGRESS: '/progress',

  // Tài khoản
  PROFILE: '/profile',
  SETTINGS: '/settings',

  // Misc
  NOT_FOUND: '*',
}

export default PATHS
