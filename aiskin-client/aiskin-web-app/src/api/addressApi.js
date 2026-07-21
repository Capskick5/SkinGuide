import { request } from './httpClient'

/**
 * Sổ địa chỉ giao hàng (persist trên server cho người dùng đã đăng nhập).
 * Mọi endpoint trả về mảng địa chỉ hiện tại (trừ update/remove/setDefault cũng trả mảng đầy đủ).
 */
export const addressApi = {
  list() {
    return request('/users/me/addresses')
  },

  create(address) {
    return request('/users/me/addresses', { method: 'POST', body: address })
  },

  update(addressId, address) {
    return request(`/users/me/addresses/${encodeURIComponent(addressId)}`, { method: 'PUT', body: address })
  },

  remove(addressId) {
    return request(`/users/me/addresses/${encodeURIComponent(addressId)}`, { method: 'DELETE' })
  },

  setDefault(addressId) {
    return request(`/users/me/addresses/${encodeURIComponent(addressId)}/default`, { method: 'PUT' })
  },
}

export default addressApi
