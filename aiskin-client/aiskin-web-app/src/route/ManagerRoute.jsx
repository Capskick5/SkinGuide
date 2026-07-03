import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '@/hook/useAuth'
import { PATHS } from './paths'

/**
 * Bọc các route yêu cầu quyền quản trị (bất kỳ role nào khác USER).
 * - Đang load -> spinner.
 * - Chưa đăng nhập -> về login.
 * - Chỉ có role USER -> về trang chủ user.
 */
export default function ManagerRoute() {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-soft">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} replace />
  }

  const hasAdminAccess = user?.roles?.some(role => role !== 'USER')
  if (!hasAdminAccess) {
    return <Navigate to={PATHS.DASHBOARD} replace />
  }

  return <Outlet />
}
