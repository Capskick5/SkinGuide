import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PATHS } from './paths'
import AppLayout from '@/components/layout/AppLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import ManagerRoute from './ManagerRoute'

const LandingPage = lazy(() => import('@/page/landing/LandingPage'))
const AuthPage = lazy(() => import('@/page/auth/AuthPage'))
const ForgotPasswordPage = lazy(() => import('@/page/auth/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('@/page/dashboard/DashboardPage'))
const SkinQuizPage = lazy(() => import('@/page/skin-quiz/SkinQuizPage'))
const RoutinePage = lazy(() => import('@/page/routine/RoutinePage'))
const ProductsPage = lazy(() => import('@/page/products/ProductsPage'))
const FavoriteProductsPage = lazy(() => import('@/page/products/FavoriteProductsPage'))
const CompareProductsPage = lazy(() => import('@/page/products/CompareProductsPage'))
const ProductDetailPage = lazy(() => import('@/page/products/ProductDetailPage'))
const CartPage = lazy(() => import('@/page/cart/CartPage'))
const CheckoutPage = lazy(() => import('@/page/cart/CheckoutPage'))
const MomoReturnPage = lazy(() => import('@/page/cart/MomoReturnPage'))
const VnpayReturnPage = lazy(() => import('@/page/cart/VnpayReturnPage'))
const BankTransferPage = lazy(() => import('@/page/cart/BankTransferPage'))
const OrdersPage = lazy(() => import('@/page/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/page/orders/OrderDetailPage'))
const ReturnRequestPage = lazy(() => import('@/page/orders/ReturnRequestPage'))
const HistoryPage = lazy(() => import('@/page/history/HistoryPage'))
const HistoryDetailPage = lazy(() => import('@/page/history/HistoryDetailPage'))
const ProfilePage = lazy(() => import('@/page/profile/ProfilePage'))
const SettingsPage = lazy(() => import('@/page/settings/SettingsPage'))
const NotFoundPage = lazy(() => import('@/page/misc/NotFoundPage'))
const OverviewPage = lazy(() => import('@/page/overview/OverviewPage'))

const AdminDashboardPage = lazy(() => import('@/page/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('@/page/admin/AdminUsersPage'))
const RolePermissionPage = lazy(() => import('@/page/admin/RolePermissionPage'))
const AdminProductsPage = lazy(() => import('@/page/admin/AdminProductsPage'))
const AdminInventoryPage = lazy(() => import('@/page/admin/AdminInventoryPage'))
const AdminBrandsPage = lazy(() => import('@/page/admin/AdminBrandsPage'))
const AdminCategoriesPage = lazy(() => import('@/page/admin/AdminCategoriesPage'))
const AdminIngredientsPage = lazy(() => import('@/page/admin/AdminIngredientsPage'))
const AdminOrdersPage = lazy(() => import('@/page/admin/orders/AdminOrdersPage'))
const AdminReturnOrdersPage = lazy(() => import('@/page/admin/orders/AdminReturnOrdersPage'))
const AdminScansPage = lazy(() => import('@/page/admin/AdminScansPage'))

function PageLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center" role="status" aria-label="Đang tải trang">
      <span className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
    </div>
  )
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
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
            <Route path={PATHS.BANK_TRANSFER_PAYMENT} element={<BankTransferPage />} />
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
      </Suspense>
    </BrowserRouter>
  )
}
