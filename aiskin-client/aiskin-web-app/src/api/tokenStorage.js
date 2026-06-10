import { STORAGE_KEYS } from '@/config/api'

/**
 * Quản lý lưu/đọc/xóa cặp token trong localStorage.
 * Tách riêng để dễ thay backend store (vd cookie) sau này.
 */
export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  },
  getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  },
  setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  },
}

export default tokenStorage
