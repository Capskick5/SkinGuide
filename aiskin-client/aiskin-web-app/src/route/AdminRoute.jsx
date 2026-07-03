import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '@/hook/useAuth'
import { PATHS } from './paths'

/**
 * Bọc các route yêu cầu quyền ADMIN.
 * - Đang load -> spinner.
 * - Chưa đăng nhập -> về login.
 * - Không có role ADMIN -> về trang chủ user.
 */
export default function AdminRoute() {
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

  const isAdmin = user?.roles?.includes('ADMIN')
  if (!isAdmin) {
    return <Navigate to={PATHS.PRODUCTS} replace />
  }

  return <Outlet />
}
