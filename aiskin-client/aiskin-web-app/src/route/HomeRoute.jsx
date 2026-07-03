import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hook/useAuth'
import { Spin } from 'antd'
import { PATHS } from './paths'

/**
 * Route thông minh cho trang gốc "/":
 * - Đang tải → spinner
 * - Đã đăng nhập → vào Dashboard
 * - Chưa đăng nhập → vào Landing Page
 */
export default function HomeRoute() {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-soft">
        <Spin size="large" />
      </div>
    )
  }

  if (isAuthenticated) {
    const hasAdminAccess = user?.roles?.some(role => role !== 'USER')
    if (hasAdminAccess) {
      return <Navigate to={PATHS.ADMIN_DASHBOARD} replace />
    }
    return <Outlet />
  }

  return <Navigate to={PATHS.LANDING} replace />
}
