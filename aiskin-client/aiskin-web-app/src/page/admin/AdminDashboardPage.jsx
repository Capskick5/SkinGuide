import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hook/useAuth'
import Icon from '@/components/common/Icon'
import { adminApi } from '@/api/adminApi'
import { productApi } from '@/api/productApi'
import httpClient from '@/api/httpClient'
import { PATHS } from '@/route/paths'

const ORDER_STATUS = {
  PENDING: { label: 'Chờ thanh toán', color: 'bg-amber-500' },
  PAID: { label: 'Đã thanh toán', color: 'bg-emerald-500' },
  PROCESSING: { label: 'Đang xử lý', color: 'bg-blue-500' },
  SHIPPED: { label: 'Đang giao', color: 'bg-indigo-500' },
  DELIVERED: { label: 'Đã giao', color: 'bg-green-600' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-rose-500' },
}

const money = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`

const number = (value) => Number(value || 0).toLocaleString('vi-VN')

function toDateKey(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isPaidOrder(order) {
  return order?.paymentStatus === 'PAID' || ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order?.status)
}

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
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
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
    users: 0,
    products: 0,
    brands: 0,
    categories: 0,
    orders: 0,
    revenue: 0,
    paidOrders: 0,
    scans: 0,
    scanUsers: 0,
    scansToday: 0,
    // Tài chính mới
    totalRefundAmount: 0,
    totalReturnShippingFee: 0,
    estimatedProfit: 0,
    totalReturnCount: 0,
    pendingReturnCount: 0,
    refundedReturnCount: 0,
    receivedReturnCount: 0,
    completedRefundCount: 0,
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [latestScans, setLatestScans] = useState([])
  const [orderStatus, setOrderStatus] = useState({})
  const [revenueByDay, setRevenueByDay] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function fetchDashboard() {
      setLoading(true)
      try {
        const [usersPage, productsPage, brands, categories, ordersPage, scanStats, financialData] = await Promise.allSettled([
          isAdmin ? adminApi.listUsers({ page: 0, size: 6, sort: 'createdAt,desc' }) : Promise.resolve({}),
          productApi.searchAdvancedProducts({ size: 1 }),
          productApi.listBrands(),
          productApi.listCategories(),
          httpClient.get('/orders?page=0&size=1000&status=ALL'),
          isAdmin ? httpClient.get('/scans/admin/stats') : Promise.resolve({}),
          httpClient.get('/orders/admin/dashboard'),
        ])

        if (ignore) return

        const users = usersPage.status === 'fulfilled' ? usersPage.value : {}
        const products = productsPage.status === 'fulfilled' ? productsPage.value : {}
        const allOrders = ordersPage.status === 'fulfilled' ? ordersPage.value?.content || [] : []
        const scans = scanStats.status === 'fulfilled' ? scanStats.value || {} : {}
        const financial = financialData.status === 'fulfilled' ? financialData.value || {} : {}

        const statusCounts = {}
        const dayMap = new Map()
        const paidOrders = allOrders.filter(isPaidOrder)
        const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0)

        allOrders.forEach((order) => {
          statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
          if (isPaidOrder(order)) {
            const key = toDateKey(order.createdAt)
            dayMap.set(key, (dayMap.get(key) || 0) + Number(order.totalAmount || 0))
          }
        })

        const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - index))
          const key = date.toISOString().slice(0, 10)
          return {
            key,
            label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            value: dayMap.get(key) || 0,
          }
        })

        setRecentUsers(users.content || [])
        setRecentOrders(allOrders.slice(0, 6))
        setLatestScans(scans.latestScans || [])
        setOrderStatus(statusCounts)
        setRevenueByDay(lastSevenDays)
        setStats({
          users: users.totalElements || 0,
          products: products.totalElements || 0,
          brands: Array.isArray(brands.value) ? brands.value.length : 0,
          categories: Array.isArray(categories.value) ? categories.value.length : 0,
          orders: ordersPage.status === 'fulfilled' ? ordersPage.value?.totalElements || allOrders.length : 0,
          revenue: financial.totalRevenue ?? totalRevenue,
          paidOrders: financial.paidOrderCount ?? paidOrders.length,
          scans: scans.totalScans || 0,
          scanUsers: scans.uniqueScanUsers || 0,
          scansToday: scans.scansToday || 0,
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
  }, [])

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
            Theo dõi doanh thu, đơn hàng, người dùng và hoạt động quét da trong hệ thống.
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
          <Link
            to={PATHS.ADMIN_PRODUCTS}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Icon name="inventory_2" className="text-lg" />
            Sản phẩm
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
        {isAdmin && (
          <DashboardCard
            label="Lượt quét da"
            value={number(stats.scans)}
            hint={`${number(stats.scanUsers)} người dùng đã quét, hôm nay ${number(stats.scansToday)} lượt`}
            icon="document_scanner"
            tone="blue"
            to={PATHS.ADMIN_SCANS}
          />
        )}
        {isAdmin && (
          <DashboardCard
            label="Người dùng"
            value={number(stats.users)}
            hint="Tài khoản đang được quản lý"
            icon="group"
            tone="teal"
            to={PATHS.ADMIN_USERS}
          />
        )}
        <DashboardCard
          label="Sản phẩm"
          value={number(stats.products)}
          hint={`${number(stats.brands)} thương hiệu, ${number(stats.categories)} danh mục`}
          icon="inventory_2"
          tone="amber"
          to={PATHS.ADMIN_PRODUCTS}
        />
        {isAdmin && (
          <DashboardCard
            label="Tỷ lệ chuyển đổi scan"
            value={`${stats.users ? Math.round((stats.scanUsers / stats.users) * 100) : 0}%`}
            hint="Tỷ lệ người dùng từng có lịch sử quét da"
            icon="analytics"
            tone="slate"
            to={PATHS.ADMIN_SCANS}
          />
        )}
      </div>

      {/* Khu vực tài chính mới */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-950">📊 Tóm tắt Tài chính</h2>
          <Link to="/admin/returns" className="text-sm font-semibold text-primary">Xem đơn khiếu nại</Link>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Section
          title="Doanh thu 7 ngày gần nhất"
          action={<span className="text-sm font-semibold text-gray-500">{money(stats.revenue)}</span>}
        >
          <div className="flex h-72 items-end gap-3 px-5 pb-5 pt-8">
            {revenueByDay.map((item) => (
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

        <Section
          title="Trạng thái đơn hàng"
          action={<Link to={PATHS.ADMIN_ORDERS} className="text-sm font-semibold text-primary">Xem tất cả</Link>}
        >
          <div className="space-y-4 p-5">
            {Object.entries(ORDER_STATUS).map(([key, config]) => {
              const count = orderStatus[key] || 0
              const percent = stats.orders ? Math.round((count / stats.orders) * 100) : 0
              return (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{config.label}</span>
                    <span className="font-semibold text-gray-950">{number(count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${config.color}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section
          title="Đơn hàng mới"
          action={<Link to={PATHS.ADMIN_ORDERS} className="text-sm font-semibold text-primary">Quản lý</Link>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Mã đơn</th>
                  <th className="px-5 py-3">Khách hàng</th>
                  <th className="px-5 py-3">Ngày</th>
                  <th className="px-5 py-3 text-right">Giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-gray-400">Chưa có đơn hàng</td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold text-primary">{order.orderCode}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{order.customerName || 'Khách hàng'}</p>
                        <p className="text-xs text-gray-500">{ORDER_STATUS[order.status]?.label || order.status}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-4 text-right font-bold text-gray-950">{money(order.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {isAdmin && (
          <Section title="Người dùng và quét da">
            <div className="divide-y divide-gray-100">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container">
                      <Icon name="person" className="text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-950">{user.fullName || user.email}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    {user.roles?.includes('ADMIN') ? 'Admin' : 'User'}
                  </span>
                </div>
              ))}
              {latestScans.length > 0 && (
                <div className="px-5 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Lượt quét gần đây</p>
                  <div className="space-y-3">
                    {latestScans.map((scan) => (
                      <div key={scan.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                        <span className="min-w-0 truncate text-xs font-medium text-gray-700">{scan.userId}</span>
                        <span className="text-xs text-gray-500">{scan.skinType || 'Unknown'} - {formatDate(scan.analyzedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
