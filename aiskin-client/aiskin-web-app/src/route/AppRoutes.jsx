import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PATHS } from './paths'
import AppLayout from '@/components/layout/AppLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'

import AuthPage from '@/page/auth/AuthPage'
import ForgotPasswordPage from '@/page/auth/ForgotPasswordPage'
import DashboardPage from '@/page/dashboard/DashboardPage'
import AnalysisResultPage from '@/page/analysis/AnalysisResultPage'
import RoutinePage from '@/page/routine/RoutinePage'
import ProductsPage from '@/page/products/ProductsPage'
import ProductDetailPage from '@/page/products/ProductDetailPage'
import HistoryPage from '@/page/history/HistoryPage'
import ProgressPage from '@/page/progress/ProgressPage'
import ProfilePage from '@/page/profile/ProfilePage'
import NotFoundPage from '@/page/misc/NotFoundPage'

// Admin pages
import AdminDashboardPage from '@/page/admin/AdminDashboardPage'
import AdminUsersPage from '@/page/admin/AdminUsersPage'
import RolePermissionPage from '@/page/admin/RolePermissionPage'
import AdminProductsPage from '@/page/admin/AdminProductsPage'
import AdminBrandsPage from '@/page/admin/AdminBrandsPage'
import AdminCategoriesPage from '@/page/admin/AdminCategoriesPage'
import AdminIngredientsPage from '@/page/admin/AdminIngredientsPage'

/**
 * Khai báo tập trung toàn bộ route của ứng dụng.
 * - Auth routes: standalone (không có sidebar).
 * - App routes: bọc trong AppLayout (sidebar + topnav).
 */
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path={PATHS.LOGIN} element={<AuthPage mode="login" />} />
        <Route path={PATHS.REGISTER} element={<AuthPage mode="register" />} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />

        {/* App (có layout chung, yêu cầu đăng nhập) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Trang "Quét da" (gộp Trang chủ + Quét mới) */}
            <Route path={PATHS.DASHBOARD} element={<DashboardPage />} />
            <Route path={PATHS.SCAN} element={<DashboardPage />} />
            <Route path={PATHS.ANALYSIS} element={<AnalysisResultPage />} />
            <Route path={PATHS.ROUTINE} element={<RoutinePage />} />
            <Route path={PATHS.PRODUCTS} element={<ProductsPage />} />
            <Route path={PATHS.PRODUCT_DETAIL} element={<ProductDetailPage />} />
            <Route path={PATHS.HISTORY} element={<HistoryPage />} />
            <Route path={PATHS.PROGRESS} element={<ProgressPage />} />
            <Route path={PATHS.PROFILE} element={<ProfilePage />} />
            <Route path={PATHS.SETTINGS} element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Admin (yêu cầu ROLE_ADMIN) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={PATHS.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={PATHS.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={PATHS.ADMIN_ROLES} element={<RolePermissionPage />} />
            <Route path={PATHS.ADMIN_PRODUCTS} element={<AdminProductsPage />} />
            <Route path={PATHS.ADMIN_BRANDS} element={<AdminBrandsPage />} />
            <Route path={PATHS.ADMIN_CATEGORIES} element={<AdminCategoriesPage />} />
            <Route path={PATHS.ADMIN_INGREDIENTS} element={<AdminIngredientsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path={PATHS.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
