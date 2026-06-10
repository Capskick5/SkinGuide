import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from '@/api/authApi'
import { tokenStorage } from '@/api/tokenStorage'
import { setRefreshHandler } from '@/api/httpClient'

export const AuthContext = createContext(null)

/**
 * Cung cấp trạng thái xác thực cho toàn app:
 *  - user, isAuthenticated, loading
 *  - login(), register(), logout()
 * Tự khôi phục phiên khi tải lại trang (nếu còn token hợp lệ).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Tránh nhiều request refresh chạy song song.
  const refreshingRef = useRef(null)

  const applyAuthResponse = useCallback((data) => {
    tokenStorage.setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  /** Dùng refresh token đổi lấy access token mới. Trả về true nếu thành công. */
  const refresh = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) return false

    // Gộp các lời gọi refresh đồng thời thành một.
    if (!refreshingRef.current) {
      refreshingRef.current = authApi
        .refresh(refreshToken)
        .then((data) => {
          applyAuthResponse(data)
          return true
        })
        .catch(() => {
          tokenStorage.clear()
          setUser(null)
          return false
        })
        .finally(() => {
          refreshingRef.current = null
        })
    }
    return refreshingRef.current
  }, [applyAuthResponse])

  // Cho httpClient biết cách tự refresh khi gặp 401.
  useEffect(() => {
    setRefreshHandler(refresh)
  }, [refresh])

  // Khôi phục phiên khi mở lại app.
  useEffect(() => {
    let active = true
    async function bootstrap() {
      if (!tokenStorage.getAccessToken()) {
        setLoading(false)
        return
      }
      try {
        const me = await authApi.me()
        if (active) setUser(me)
      } catch {
        if (active) {
          tokenStorage.clear()
          setUser(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(
    async ({ email, password }) => applyAuthResponse(await authApi.login({ email, password })),
    [applyAuthResponse],
  )

  const register = useCallback(
    async ({ email, password }) => applyAuthResponse(await authApi.register({ email, password })),
    [applyAuthResponse],
  )

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      // Bỏ qua lỗi mạng khi logout, vẫn xóa token local.
    } finally {
      tokenStorage.clear()
      setUser(null)
    }
  }, [])

  /** Cập nhật hồ sơ (tên, hồ sơ da) rồi đồng bộ state. */
  const updateProfile = useCallback(async (payload) => {
    const updated = await authApi.updateProfile(payload)
    setUser(updated)
    return updated
  }, [])

  /** Đổi mật khẩu (backend sẽ thu hồi các phiên khác). */
  const changePassword = useCallback(
    async (payload) => authApi.changePassword(payload),
    [],
  )

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [user, loading, login, register, logout, updateProfile, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
