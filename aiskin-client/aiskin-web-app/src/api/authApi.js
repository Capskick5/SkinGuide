import { httpClient } from './httpClient'

/**
 * @typedef {Object} SkinProfile
 * @property {string} skinType
 * @property {string[]} currentConcerns
 * @property {string[]} allergies
 * @property {boolean} sensitiveSkin
 * @property {string} gender
 */

/**
 * @typedef {Object} UserResponse
 * @property {string} id
 * @property {string} email
 * @property {string} fullName
 * @property {string[]} roles
 * @property {boolean} active
 * @property {boolean} emailVerified
 * @property {SkinProfile} skinProfile
 * @property {Object[]} addresses
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {string} tokenType
 * @property {number} expiresIn
 * @property {UserResponse} user
 */

/**
 * @typedef {Object} OtpResponse
 * @property {string} message
 * @property {string} [devOtp]
 */

/**
 * @template T
 * @typedef {Object} Page
 * @property {T[]} content
 * @property {number} totalElements
 * @property {number} totalPages
 * @property {number} size
 * @property {number} number
 * @property {boolean} first
 * @property {boolean} last
 * @property {boolean} empty
 */

/**
 * Gọi các endpoint của user-service (qua API Gateway).
 * Backend: mss.userservice.controller.{AuthController, UserController, AdminUserController}
 */
export const authApi = {
  // ---------- AuthController (public) ----------

  /**
   * Đăng ký tài khoản mới.
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} data.fullName
   * @returns {Promise<AuthResponse>}
   */
  register({ email, password, fullName }) {
    return httpClient.post('/auth/register', { email, password, fullName }, { auth: false })
  },

  /**
   * Đăng nhập.
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.password
   * @returns {Promise<AuthResponse>}
   */
  login({ email, password }) {
    return httpClient.post('/auth/login', { email, password }, { auth: false })
  },

  /**
   * Đăng nhập hoặc đăng ký bằng Google.
   * @param {string} credential 
   * @returns {Promise<AuthResponse>}
   */
  loginWithGoogle(credential) {
    return httpClient.post('/auth/google', { credential }, { auth: false })
  },

  /**
   * Làm mới access token.
   * @param {string} refreshToken 
   * @returns {Promise<AuthResponse>}
   */
  refresh(refreshToken) {
    return httpClient.post('/auth/refresh', { refreshToken }, { auth: false })
  },

  /**
   * Đăng xuất.
   * @param {string} refreshToken 
   * @returns {Promise<void>}
   */
  logout(refreshToken) {
    return httpClient.post('/auth/logout', { refreshToken }, { auth: false })
  },

  /**
   * Yêu cầu gửi mã OTP để xác thực email.
   * @param {string} email 
   * @returns {Promise<OtpResponse>}
   */
  requestEmailVerification(email) {
    return httpClient.post('/auth/request-email-verification', { email }, { auth: false })
  },

  /**
   * Xác thực email với mã OTP.
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.otp
   * @returns {Promise<void>}
   */
  verifyEmail({ email, otp }) {
    return httpClient.post('/auth/verify-email', { email, otp }, { auth: false })
  },

  /**
   * Yêu cầu gửi mã OTP để đặt lại mật khẩu.
   * @param {string} email 
   * @returns {Promise<OtpResponse>}
   */
  forgotPassword(email) {
    return httpClient.post('/auth/forgot-password', { email }, { auth: false })
  },

  /**
   * Đặt lại mật khẩu.
   * @param {Object} data
   * @param {string} data.email
   * @param {string} data.otp
   * @param {string} data.newPassword
   * @returns {Promise<void>}
   */
  resetPassword({ email, otp, newPassword }) {
    return httpClient.post('/auth/reset-password', { email, otp, newPassword }, { auth: false })
  },

  // ---------- UserController (authenticated) ----------

  /**
   * Lấy thông tin người dùng hiện tại.
   * @returns {Promise<UserResponse>}
   */
  me() {
    return httpClient.get('/users/me')
  },

  /**
   * Cập nhật hồ sơ người dùng.
   * @param {Object} data
   * @param {string} data.fullName
   * @param {SkinProfile} data.skinProfile
   * @returns {Promise<UserResponse>}
   */
  updateProfile({ fullName, skinProfile }) {
    return httpClient.put('/users/me', { fullName, skinProfile })
  },

  /**
   * Đổi mật khẩu.
   * @param {Object} data
   * @param {string} data.currentPassword
   * @param {string} data.newPassword
   * @returns {Promise<void>}
   */
  changePassword({ currentPassword, newPassword }) {
    return httpClient.post('/users/me/change-password', { currentPassword, newPassword })
  },

  // ---------- AdminUserController (admin) ----------

  /**
   * Lấy danh sách người dùng (Admin).
   * @param {Object} params (ví dụ: { page: 0, size: 20 })
   * @returns {Promise<Page<UserResponse>>}
   */
  listUsers(params) {
    const query = new URLSearchParams(params).toString()
    const url = query ? `/admin/users?${query}` : '/admin/users'
    return httpClient.get(url)
  },

  /**
   * Xem chi tiết 1 người dùng (Admin).
   * @param {string} id 
   * @returns {Promise<UserResponse>}
   */
  getUserById(id) {
    return httpClient.get(`/admin/users/${id}`)
  },

  /**
   * Kích hoạt tài khoản (Admin).
   * @param {string} id 
   * @returns {Promise<UserResponse>}
   */
  activateUser(id) {
    return httpClient.post(`/admin/users/${id}/activate`)
  },

  /**
   * Vô hiệu hóa tài khoản (Admin).
   * @param {string} id 
   * @returns {Promise<UserResponse>}
   */
  deactivateUser(id) {
    return httpClient.post(`/admin/users/${id}/deactivate`)
  }
}

export default authApi
