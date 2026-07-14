/**
 * Cấu hình API.
 * - Mặc định gọi qua '/api' -> Vite dev proxy forward sang API Gateway (localhost:8080).
 * - Production: đặt VITE_API_BASE_URL (vd https://api.aiskin.vn).
 */
const fromEnv = import.meta.env.VITE_API_BASE_URL

export const API_BASE_URL =
  fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, '') : '/api'

export function resolveApiAssetUrl(value) {
  if (!value || /^(https?:|blob:|data:)/i.test(value)) return value || ''

  const path = `/${String(value).replace(/^\/+/, '')}`
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return `${new URL(API_BASE_URL).origin}${path}`
  }
  return path
}

/** Khóa lưu token trong localStorage. */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'aiskin.accessToken',
  REFRESH_TOKEN: 'aiskin.refreshToken',
}

export default API_BASE_URL
