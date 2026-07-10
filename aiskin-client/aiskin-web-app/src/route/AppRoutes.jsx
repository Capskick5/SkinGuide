import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PATHS } from './paths'
import AppLayout from '@/components/layout/AppLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import ManagerRoute from './ManagerRoute'

import LandingPage from '@/page/landing/LandingPage'
import AuthPage from '@/page/auth/AuthPage'
import ForgotPasswordPage from '@/page/auth/ForgotPasswordPage'
import DashboardPage from '@/page/dashboard/DashboardPage'
import SkinQuizPage from '@/page/skin-quiz/SkinQuizPage'
import RoutinePage from '@/page/routine/RoutinePage'
import ProductsPage from '@/page/products/ProductsPage'
import FavoriteProductsPage from '@/page/products/FavoriteProductsPage'
import CompareProductsPage from '@/page/products/CompareProductsPage'
import ProductDetailPage from '@/page/products/ProductDetailPage'
import CartPage from '@/page/cart/CartPage'
import CheckoutPage from '@/page/cart/CheckoutPage'
import MomoReturnPage from '@/page/cart/MomoReturnPage'
import VnpayReturnPage from '@/page/cart/VnpayReturnPage'
import OrdersPage from '@/page/orders/OrdersPage'
import OrderDetailPage from '@/page/orders/OrderDetailPage'
import HistoryPage from '@/page/history/HistoryPage'
import HistoryDetailPage from '@/page/history/HistoryDetailPage'
import ProfilePage from '@/page/profile/ProfilePage'
import SettingsPage from '@/page/settings/SettingsPage'
import NotFoundPage from '@/page/misc/NotFoundPage'
import OverviewPage from '@/page/overview/OverviewPage'

import AdminDashboardPage from '@/page/admin/AdminDashboardPage'
import AdminUsersPage from '@/page/admin/AdminUsersPage'
import RolePermissionPage from '@/page/admin/RolePermissionPage'
import AdminProductsPage from '@/page/admin/AdminProductsPage'
import AdminInventoryPage from '@/page/admin/AdminInventoryPage'
import AdminBrandsPage from '@/page/admin/AdminBrandsPage'
import AdminCategoriesPage from '@/page/admin/AdminCategoriesPage'
import AdminIngredientsPage from '@/page/admin/AdminIngredientsPage'
import ReturnRequestPage from '@/page/orders/ReturnRequestPage'
import AdminOrdersPage from '@/page/admin/orders/AdminOrdersPage'
import AdminReturnOrdersPage from '@/page/admin/orders/AdminReturnOrdersPage'
import AdminScansPage from '@/page/admin/AdminScansPage'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PATHS.LANDING} element={<LandingPage />} />
        <Route path={PATHS.OVERVIEW} element={<OverviewPage />} />
        <Route path={PATHS.LOGIN} element={<AuthPage mode="login" />} />
        <Route path={PATHS.REGISTER} element={<AuthPage mode="register" />} />
        <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />

        <Route element={<AppLayout />}>
          <Route path={PATHS.PRODUCTS} element={<ProductsPage />} />
          <Route path="/products" element={<Navigate to={PATHS.PRODUCTS} replace />} />
          <Route path={PATHS.PRODUCT_DETAIL} element={<ProductDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path={PATHS.SKIN_QUIZ} element={<SkinQuizPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.SCAN} element={<DashboardPage />} />
            <Route path={PATHS.ANALYSIS} element={<DashboardPage />} />
            <Route path={PATHS.ROUTINE} element={<RoutinePage />} />
            <Route path={PATHS.PRODUCT_FAVORITES} element={<FavoriteProductsPage />} />
            <Route path={PATHS.PRODUCT_COMPARE} element={<CompareProductsPage />} />
            <Route path={PATHS.CART} element={<CartPage />} />
            <Route path={PATHS.CHECKOUT} element={<CheckoutPage />} />
            <Route path={PATHS.ORDERS} element={<OrdersPage />} />
            <Route path={PATHS.ORDER_DETAIL} element={<OrderDetailPage />} />
            <Route path={PATHS.ORDER_RETURN} element={<ReturnRequestPage />} />
            <Route path={PATHS.MOMO_RETURN} element={<MomoReturnPage />} />
            <Route path={PATHS.VNPAY_RETURN} element={<VnpayReturnPage />} />
            <Route path={PATHS.HISTORY} element={<HistoryPage />} />
            <Route path={PATHS.HISTORY_DETAIL} element={<HistoryDetailPage />} />
            <Route path={PATHS.PROFILE} element={<ProfilePage />} />
            <Route path={PATHS.SETTINGS} element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={PATHS.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={PATHS.ADMIN_ROLES} element={<RolePermissionPage />} />
          </Route>
        </Route>

        <Route element={<ManagerRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={PATHS.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={PATHS.ADMIN_PRODUCTS} element={<AdminProductsPage />} />
            <Route path={PATHS.ADMIN_INVENTORY} element={<AdminInventoryPage />} />
            <Route path={PATHS.ADMIN_ORDERS} element={<AdminOrdersPage />} />
            <Route path={PATHS.ADMIN_RETURNS} element={<AdminReturnOrdersPage />} />
            <Route path={PATHS.ADMIN_SCANS} element={<AdminScansPage />} />
            <Route path={PATHS.ADMIN_BRANDS} element={<AdminBrandsPage />} />
            <Route path={PATHS.ADMIN_CATEGORIES} element={<AdminCategoriesPage />} />
            <Route path={PATHS.ADMIN_INGREDIENTS} element={<AdminIngredientsPage />} />
          </Route>
        </Route>

        <Route path={PATHS.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
