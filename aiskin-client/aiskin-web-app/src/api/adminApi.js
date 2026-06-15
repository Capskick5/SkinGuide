import { request } from './httpClient'

/**
 * API calls cho Admin panel.
 * Backend: mss.userservice.controller.AdminUserController (requires ROLE_ADMIN)
 */
export const adminApi = {
  /**
   * Danh sách người dùng (phân trang).
   * @param {{ page?: number, size?: number, sort?: string }} params
   */
  async listUsers({ page = 0, size = 10, sort = 'createdAt,desc' } = {}) {
    return request(`/admin/users?page=${page}&size=${size}&sort=${sort}`)
  },

  /** Xem chi tiết một user. */
  async getUser(id) {
    return request(`/admin/users/${id}`)
  },

  /** Kích hoạt tài khoản. */
  async activate(id) {
    return request(`/admin/users/${id}/activate`, { method: 'POST' })
  },

  /** Vô hiệu hóa tài khoản. */
  async deactivate(id) {
    return request(`/admin/users/${id}/deactivate`, { method: 'POST' })
  },

  /** Gán role cho user (USER | ADMIN). */
  async setRole(id, role) {
    return request(`/admin/users/${id}/role?role=${role}`, { method: 'PUT' })
  },
}
