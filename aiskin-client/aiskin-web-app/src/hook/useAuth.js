import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/**
 * Truy cập trạng thái & hành động xác thực.
 * Phải dùng bên trong <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
  }
  return ctx
}

export default useAuth
