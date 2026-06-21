/**
 * Central route path registry.
 * Quản lý tập trung tất cả endpoint của ứng dụng để dễ bảo trì.
 * Dùng: import { PATHS } from '@/route/paths'
 */
export const PATHS = {
  // Public
  LANDING: '/welcome',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // App (yêu cầu đăng nhập)
  DASHBOARD: '/',
  SCAN: '/scan',
  SKIN_QUIZ: '/skin-quiz',
  ANALYSIS: '/analysis',
  ROUTINE: '/routine',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:id',
  HISTORY: '/history',
  HISTORY_DETAIL: '/history/:id',
  PROGRESS: '/progress',
  CHECKOUT: '/checkout',

  // Tài khoản
  PROFILE: '/profile',
  SETTINGS: '/settings',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_BRANDS: '/admin/brands',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_INGREDIENTS: '/admin/ingredients',

  // Misc
  NOT_FOUND: '*',
}

export default PATHS
