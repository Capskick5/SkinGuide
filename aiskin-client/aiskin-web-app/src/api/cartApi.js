import { request } from './httpClient'

/**
 * API giỏ hàng lưu trên server (cho người dùng đã đăng nhập).
 * Server là kho lưu thuần: PUT thay thế toàn bộ giỏ, GET đọc lại, DELETE xóa.
 */
export const cartApi = {
  get() {
    return request('/carts/me')
  },

  replace(items) {
    return request('/carts/me', { method: 'PUT', body: items })
  },

  clear() {
    return request('/carts/me', { method: 'DELETE' })
  },
}

export default cartApi
