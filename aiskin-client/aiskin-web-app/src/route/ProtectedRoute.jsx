import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '@/hook/useAuth'
import { PATHS } from './paths'

/**
 * Bọc các route yêu cầu đăng nhập.
 * - Đang khôi phục phiên -> hiển thị spinner.
 * - Chưa đăng nhập -> chuyển về /login (nhớ trang định vào).
 */
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-soft">
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={PATHS.LOGIN} replace state={{ from: location }} />
  }

  return <Outlet />
}
