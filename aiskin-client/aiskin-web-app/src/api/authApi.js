import { httpClient } from './httpClient'

/**
 * Gọi các endpoint của user-service (qua API Gateway).
 * Backend: mss.userservice.controller.{AuthController, UserController, AdminUserController}
 */
export const authApi = {
  // ---------- Auth (public) ----------

  /** POST /api/auth/register -> AuthResponse */
  register({ email, password, fullName }) {
    return httpClient.post('/auth/register', { email, password, fullName }, { auth: false })
  },

  /** POST /api/auth/login -> AuthResponse */
  login({ email, password }) {
    return httpClient.post('/auth/login', { email, password }, { auth: false })
  },

  /** POST /api/auth/refresh -> AuthResponse */
  refresh(refreshToken) {
    return httpClient.post('/auth/refresh', { refreshToken }, { auth: false })
  },

  /** POST /api/auth/logout -> 204 */
  logout(refreshToken) {
    return httpClient.post('/auth/logout', { refreshToken }, { auth: false })
  },

  // ---------- Email verification ----------

  /** POST /api/auth/request-email-verification -> OtpResponse */
  requestEmailVerification(email) {
    return httpClient.post('/auth/request-email-verification', { email }, { auth: false })
  },

  /** POST /api/auth/verify-email -> 204 */
  verifyEmail({ email, otp }) {
    return httpClient.post('/auth/verify-email', { email, otp }, { auth: false })
  },

  // ---------- Forgot / reset password ----------

  /** POST /api/auth/forgot-password -> OtpResponse */
  forgotPassword(email) {
    return httpClient.post('/auth/forgot-password', { email }, { auth: false })
  },

  /** POST /api/auth/reset-password -> 204 */
  resetPassword({ email, otp, newPassword }) {
    return httpClient.post('/auth/reset-password', { email, otp, newPassword }, { auth: false })
  },

  // ---------- Current user (authenticated) ----------

  /** GET /api/users/me -> UserResponse */
  me() {
    return httpClient.get('/users/me')
  },

  /** PUT /api/users/me -> UserResponse */
  updateProfile({ fullName, skinProfile }) {
    return httpClient.put('/users/me', { fullName, skinProfile })
  },

  /** POST /api/users/me/change-password -> 204 */
  changePassword({ currentPassword, newPassword }) {
    return httpClient.post('/users/me/change-password', { currentPassword, newPassword })
  },
}

export default authApi
