import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PATHS } from './paths'
import AppLayout from '@/components/layout/AppLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import ManagerRoute from './ManagerRoute'
import HomeRoute from './HomeRoute'

import LandingPage from '@/page/landing/LandingPage'
import AuthPage from '@/page/auth/AuthPage'
import ForgotPasswordPage from '@/page/auth/ForgotPasswordPage'
import DashboardPage from '@/page/dashboard/DashboardPage'
import SkinQuizPage from '@/page/skin-quiz/SkinQuizPage'
import AnalysisResultPage from '@/page/analysis/AnalysisResultPage'
import RoutinePage from '@/page/routine/RoutinePage'
import ProductsPage from '@/page/products/ProductsPage'
import FavoriteProductsPage from '@/page/products/FavoriteProductsPage'
import CompareProductsPage from '@/page/products/CompareProductsPage'
import ProductDetailPage from '@/page/products/ProductDetailPage'
import CartPage from '@/page/cart/CartPage'
import CheckoutPage from '@/page/cart/CheckoutPage'
import MomoReturnPage from '@/page/cart/MomoReturnPage'
import OrdersPage from '@/page/orders/OrdersPage'
import HistoryPage from '@/page/history/HistoryPage'
import HistoryDetailPage from '@/page/history/HistoryDetailPage'
import ProgressPage from '@/page/progress/ProgressPage'
import ProfilePage from '@/page/profile/ProfilePage'
import SettingsPage from '@/page/settings/SettingsPage'
import NotFoundPage from '@/page/misc/NotFoundPage'
import OverviewPage from '@/page/overview/OverviewPage'

// Admin pages
import AdminDashboardPage from '@/page/admin/AdminDashboardPage'
import AdminUsersPage from '@/page/admin/AdminUsersPage'
import RolePermissionPage from '@/page/admin/RolePermissionPage'
import AdminProductsPage from '@/page/admin/AdminProductsPage'
import AdminBrandsPage from '@/page/admin/AdminBrandsPage'
import AdminCategoriesPage from '@/page/admin/AdminCategoriesPage'
import AdminIngredientsPage from '@/page/admin/AdminIngredientsPage'
import AdminOrdersPage from '@/page/admin/orders/AdminOrdersPage'
import AdminScansPage from '@/page/admin/AdminScansPage'

/**
 * Khai báo tập trung toàn bộ route của ứng dụng.
 * - Public routes: Landing page, Auth routes.
 * - App routes: bọc trong AppLayout (sidebar + topnav), yêu cầu đăng nhập.
 * - Admin routes: yêu cầu ROLE_ADMIN.
 */
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang gốc "/" — thông minh:
            Đã login → Dashboard (có AppLayout)
            Chưa login → Landing Page */}
        <Route element={<HomeRoute />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.DASHBOARD} element={<DashboardPage />} />
          </Route>
        </Route>

        {/* Public – không cần đăng nhập */}
        <Route path={PATHS.LANDING} element={<LandingPage />} />
        <Route path={PATHS.OVERVIEW} element={<OverviewPage />} />
        <Route path={PATHS.LOGIN} element={<AuthPage mode="login" />} />
        <Route path={PATHS.REGISTER} element={<AuthPage mode="register" />} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />

        {/* Shop public: khách chưa đăng nhập vẫn xem được sản phẩm */}
        <Route element={<AppLayout />}>
          <Route path={PATHS.PRODUCTS} element={<ProductsPage />} />
          <Route path={PATHS.PRODUCT_DETAIL} element={<ProductDetailPage />} />
        </Route>

        {/* Skin Quiz – standalone (không cần AppLayout nhưng cần login) */}
        <Route element={<ProtectedRoute />}>
          <Route path={PATHS.SKIN_QUIZ} element={<SkinQuizPage />} />
        </Route>

        {/* App (có layout chung, yêu cầu đăng nhập) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* /scan alias */}
            <Route path={PATHS.SCAN} element={<DashboardPage />} />

            {/* Phân tích */}
            <Route path={PATHS.ANALYSIS} element={<AnalysisResultPage />} />

            {/* Lộ trình */}
            <Route path={PATHS.ROUTINE} element={<RoutinePage />} />

            {/* Mua hàng: cần đăng nhập */}
            <Route path={PATHS.PRODUCT_FAVORITES} element={<FavoriteProductsPage />} />
            <Route path={PATHS.PRODUCT_COMPARE} element={<CompareProductsPage />} />
            <Route path={PATHS.CART} element={<CartPage />} />
            <Route path={PATHS.CHECKOUT} element={<CheckoutPage />} />
            <Route path={PATHS.ORDERS} element={<OrdersPage />} />
            
            {/* Momo Return */}
            <Route path={PATHS.MOMO_RETURN} element={<MomoReturnPage />} />

            {/* Lịch sử */}
            <Route path={PATHS.HISTORY} element={<HistoryPage />} />
            <Route path="/history/:id" element={<HistoryDetailPage />} />

            {/* Tiến trình */}
            <Route path={PATHS.PROGRESS} element={<ProgressPage />} />

            {/* Tài khoản */}
            <Route path={PATHS.PROFILE} element={<ProfilePage />} />
            <Route path={PATHS.SETTINGS} element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Admin (chỉ ROLE_ADMIN) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={PATHS.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={PATHS.ADMIN_ROLES} element={<RolePermissionPage />} />
          </Route>
        </Route>

        {/* Manager (ROLE_ADMIN hoặc ROLE_MANAGER hoặc các Role tùy chỉnh) */}
        <Route element={<ManagerRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={PATHS.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={PATHS.ADMIN_PRODUCTS} element={<AdminProductsPage />} />
            <Route path={PATHS.ADMIN_ORDERS} element={<AdminOrdersPage />} />
            <Route path={PATHS.ADMIN_SCANS} element={<AdminScansPage />} />
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
