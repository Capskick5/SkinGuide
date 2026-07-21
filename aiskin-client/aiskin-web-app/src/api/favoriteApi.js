import { request } from './httpClient'

/**
 * API danh sách yêu thích (persist trên server cho người dùng đã đăng nhập).
 * Mọi endpoint trả về mảng productId hiện tại.
 */
export const favoriteApi = {
  list() {
    return request('/users/me/favorites')
  },

  add(productId) {
    return request(`/users/me/favorites/${encodeURIComponent(productId)}`, { method: 'PUT' })
  },

  remove(productId) {
    return request(`/users/me/favorites/${encodeURIComponent(productId)}`, { method: 'DELETE' })
  },

  merge(productIds) {
    return request('/users/me/favorites/merge', { method: 'POST', body: productIds })
  },

  clear() {
    return request('/users/me/favorites', { method: 'DELETE' })
  },
}

export default favoriteApi
