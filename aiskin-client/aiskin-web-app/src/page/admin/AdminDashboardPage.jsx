import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hook/useAuth'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import httpClient from '@/api/httpClient'
import { PATHS } from '@/route/paths'

// Các API để load data

const money = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`

const number = (value) => Number(value || 0).toLocaleString('vi-VN')



function DashboardCard({ label, value, hint, icon, tone = 'slate', to }) {
  const tones = {
    slate: 'bg-slate-900 text-white',
    green: 'bg-emerald-600 text-white',
    coral: 'bg-primary text-white',
    blue: 'bg-tertiary text-white',
    amber: 'bg-amber-500 text-white',
    teal: 'bg-secondary text-white',
  }

  const content = (
    <div className="h-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
          <p className="mt-2 text-xs leading-5 text-gray-500">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.slate}`}>
          <Icon name={icon} className="text-[22px]" />
        </div>
      </div>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

function Section({ title, action, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.roles?.includes('ADMIN')

  const [stats, setStats] = useState({
    products: 0,
    brands: 0,
    categories: 0,
    orders: 0,
    revenue: 0,
    paidOrders: 0,
    totalRefundAmount: 0,
    totalReturnShippingFee: 0,
    estimatedProfit: 0,
    totalReturnCount: 0,
    pendingReturnCount: 0,
    refundedReturnCount: 0,
    receivedReturnCount: 0,
    completedRefundCount: 0,
  })
  const [revenueByDay, setRevenueByDay] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function fetchDashboard() {
      setLoading(true)
      try {
        const [productsPage, brands, categories, ordersPage, financialData] = await Promise.allSettled([
          productApi.searchAdvancedProducts({ size: 1 }, { auth: true }),
          productApi.listBrands(),
          productApi.listCategories(),
          httpClient.get('/orders?page=0&size=1'),
          httpClient.get('/orders/admin/dashboard'),
        ])

        if (ignore) return

        const products = productsPage.status === 'fulfilled' ? productsPage.value : {}
        const financial = financialData.status === 'fulfilled' ? financialData.value || {} : {}

        // Map revenue by day from financial data
        const financialRevenueByDay = financial.revenueByDay || {}
        // Get last 7 days from financial map if available
        const keys = Object.keys(financialRevenueByDay).sort()
        const recentKeys = keys.slice(-7)
        const lastSevenDays = recentKeys.map(key => {
          const parts = key.split('-')
          const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : key
          return {
            key,
            label,
            value: financialRevenueByDay[key] || 0,
          }
        })

        setRevenueByDay(lastSevenDays)
        
        setStats({
          products: products.totalElements || 0,
          brands: Array.isArray(brands.value) ? brands.value.length : 0,
          categories: Array.isArray(categories.value) ? categories.value.length : 0,
          orders: ordersPage.status === 'fulfilled' ? ordersPage.value?.totalElements || 0 : 0,
          revenue: financial.totalRevenue || 0,
          paidOrders: financial.paidOrderCount || 0,
          totalRefundAmount: Number(financial.totalRefundAmount || 0),
          totalReturnShippingFee: Number(financial.totalReturnShippingFee || 0),
          estimatedProfit: Number(financial.estimatedProfit || 0),
          totalReturnCount: financial.totalReturnCount || 0,
          pendingReturnCount: financial.pendingReturnCount || 0,
          refundedReturnCount: financial.refundedReturnCount || 0,
          receivedReturnCount: financial.receivedReturnCount || 0,
          completedRefundCount: financial.completedRefundCount || 0,
        })
      } catch (err) {
        console.error('Admin dashboard fetch error:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchDashboard()
    return () => {
      ignore = true
    }
  }, [isAdmin])

  const maxRevenue = useMemo(
    () => Math.max(...revenueByDay.map((item) => item.value), 1),
    [revenueByDay],
  )

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">SkinGuide Admin</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Tổng quan vận hành</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Theo dõi doanh thu, đơn hàng, và sản phẩm trong hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={PATHS.ADMIN_ORDERS}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Icon name="receipt_long" className="text-lg" />
            Quản lý đơn hàng
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          label="Doanh thu đã ghi nhận"
          value={money(stats.revenue)}
          hint={`${number(stats.paidOrders)} đơn đã thanh toán hoặc đang xử lý`}
          icon="payments"
          tone="green"
          to={PATHS.ADMIN_ORDERS}
        />
        <DashboardCard
          label="Doanh số bán hàng"
          value={number(stats.orders)}
          hint="Tổng số đơn hàng trong hệ thống"
          icon="shopping_cart_checkout"
          tone="coral"
          to={PATHS.ADMIN_ORDERS}
        />
        <DashboardCard
          label="Sản phẩm"
          value={number(stats.products)}
          hint={`${number(stats.brands)} thương hiệu, ${number(stats.categories)} danh mục`}
          icon="inventory_2"
          tone="amber"
          to={PATHS.ADMIN_PRODUCTS}
        />
      </div>

      {/* Khu vực tài chính mới */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-950">📊 Tóm tắt Tài chính</h2>
          <Link to={PATHS.ADMIN_RETURNS} className="text-sm font-semibold text-primary">Xem đơn khiếu nại</Link>
        </div>
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {/* Cột 1: Doanh thu */}
          <div className="p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Doanh thu</p>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Tổng doanh thu</p>
              <p className="text-base font-bold text-emerald-700">{money(stats.revenue)}</p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Số đơn đã thanh toán</p>
              <p className="text-base font-bold text-gray-950">{number(stats.paidOrders)}</p>
            </div>
          </div>

          {/* Cột 2: Chi phí */}
          <div className="p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Chi phí phát sinh</p>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Hoàn tiền cho khách</p>
              <p className="text-base font-bold text-rose-600">-{money(stats.totalRefundAmount)}</p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Phí ship trả hàng (GHN)</p>
              <p className="text-base font-bold text-orange-600">-{money(stats.totalReturnShippingFee)}</p>
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-baseline justify-between">
              <p className="text-sm font-semibold text-gray-700">Lợi nhuận ước tính</p>
              <p className={`text-base font-extrabold ${stats.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stats.estimatedProfit >= 0 ? '' : '-'}{money(Math.abs(stats.estimatedProfit))}
              </p>
            </div>
          </div>

          {/* Cột 3: Khiếu nại */}
          <div className="p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Khiếu nại / Trả hàng</p>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Tổng đơn khiếu nại</p>
              <p className="text-base font-bold text-gray-950">{number(stats.totalReturnCount)}</p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Chờ xử lý</p>
              <p className="text-base font-bold text-amber-600">{number(stats.pendingReturnCount)}</p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Chờ xác nhận hoàn tiền</p>
              <p className="text-base font-bold text-blue-600">{number(stats.receivedReturnCount)}</p>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">Hoàn tiền thành công</p>
              <p className="text-base font-bold text-teal-600">{number(stats.refundedReturnCount)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Section
          title="Doanh thu 7 ngày gần nhất"
          action={<span className="text-sm font-semibold text-gray-500">{money(stats.revenue)}</span>}
        >
          <div className="flex h-72 items-end gap-3 px-5 pb-5 pt-8">
            {revenueByDay.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center text-gray-400 text-sm">Không có dữ liệu</div>
            ) : revenueByDay.map((item) => (
              <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                <div className="flex h-52 w-full items-end rounded-lg bg-gray-50 px-2">
                  <div
                    className="w-full rounded-md bg-secondary transition-all"
                    style={{ height: `${Math.max(6, (item.value / maxRevenue) * 100)}%` }}
                    title={money(item.value)}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-600">{item.label}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{item.value ? money(item.value) : '0đ'}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
