/**
 * Central route path registry.
 * Quản lý tập trung tất cả endpoint của ứng dụng để dễ bảo trì.
 * Dùng: import { PATHS } from '@/route/paths'
 */
export const PATHS = {
  // Public
  LANDING: '/welcome',
  OVERVIEW: '/overview',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // App (yêu cầu đăng nhập)
  PRODUCTS: '/',
  DASHBOARD: '/scan',
  SCAN: '/scan',
  SKIN_QUIZ: '/skin-quiz',
  ANALYSIS: '/analysis',
  ROUTINE: '/routine',
  PRODUCT_FAVORITES: '/products/favorites',
  PRODUCT_COMPARE: '/products/compare',
  PRODUCT_DETAIL: '/products/:slug',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  MOMO_RETURN: '/payment/momo-return',
  HISTORY: '/history',
  HISTORY_DETAIL: '/history/:id',

  // Tài khoản
  PROFILE: '/profile',
  SETTINGS: '/settings',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_PRODUCTS: '/admin/products',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_SCANS: '/admin/scans',
  ADMIN_BRANDS: '/admin/brands',
  ADMIN_CATEGORIES: '/admin/categories',
  ADMIN_INGREDIENTS: '/admin/ingredients',

  // Misc
  NOT_FOUND: '*',
}

export default PATHS
