import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import httpClient from '@/api/httpClient'
import { PATHS } from '@/route/paths'

const money = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`

const number = (value) => Number(value || 0).toLocaleString('vi-VN')

const signedMoney = (value) => {
  const numericValue = Number(value || 0)
  return `${numericValue < 0 ? '-' : ''}${money(Math.abs(numericValue))}`
}

const initialFinancial = {
  grossRevenue: 0,
  productRevenue: 0,
  shippingCollected: 0,
  completedRefundAmount: 0,
  pendingRefundAmount: 0,
  originalShippingCost: 0,
  returnShippingCost: 0,
  redeliveryShippingCost: 0,
  totalShippingCost: 0,
  shopShippingSubsidy: 0,
  netCashAfterRefundAndShipping: 0,
  averageShippingCostPerShipment: 0,
  paidOrderCount: 0,
  completedRefundCount: 0,
  pendingRefundCount: 0,
  originalShipmentCount: 0,
  returnShipmentCount: 0,
  redeliveryShipmentCount: 0,
  totalReturnCount: 0,
  pendingReturnCount: 0,
  inspectionReturnCount: 0,
  waitingRefundReturnCount: 0,
  refundedReturnCount: 0,
  rejectedReturnCount: 0,
  resolvedReturnCount: 0,
  totalCompensationCount: 0,
  activeRedeliveryCount: 0,
  completedRedeliveryCount: 0,
  returnedRedeliveryCount: 0,
  claimTypeCounts: {},
  returnStatusCounts: {},
  compensationStatusCounts: {},
  revenueByDay: {},
  refundByDay: {},
  shippingCostByDay: {},
  netCashByDay: {},
}

function MetricCard({ label, value, hint, icon, accent = 'slate', to }) {
  const accents = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }

  const content = (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 xl:text-3xl">
            {value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${accents[accent] || accents.slate}`}
        >
          <Icon name={icon} className="text-[22px]" />
        </span>
      </div>
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

function Section({ title, description, action, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function FinanceRow({ label, value, hint, tone = 'default', strong = false }) {
  const tones = {
    default: 'text-slate-950',
    positive: 'text-emerald-700',
    negative: 'text-rose-700',
    warning: 'text-amber-700',
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className={`${strong ? 'font-semibold text-slate-800' : 'text-slate-600'} text-sm`}>{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-5 text-slate-400">{hint}</p>}
      </div>
      <p className={`shrink-0 text-sm ${strong ? 'font-bold' : 'font-semibold'} ${tones[tone]}`}>
        {value}
      </p>
    </div>
  )
}

function CountTile({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }

  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-2xl font-bold">{number(value)}</p>
      <p className="mt-1 text-xs font-medium leading-5">{label}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [catalog, setCatalog] = useState({ products: 0, brands: 0, categories: 0, orders: 0 })
  const [financial, setFinancial] = useState(initialFinancial)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let ignore = false

    async function fetchDashboard() {
      refreshKey === 0 ? setLoading(true) : setRefreshing(true)
      setError('')

      try {
        const results = await Promise.allSettled([
          productApi.searchAdvancedProducts({ size: 1 }, { auth: true }),
          productApi.listBrands(),
          productApi.listCategories(),
          httpClient.get('/orders?page=0&size=1'),
          httpClient.get('/orders/admin/dashboard'),
        ])

        if (ignore) return

        const [productsResult, brandsResult, categoriesResult, ordersResult, financialResult] = results
        const products = productsResult.status === 'fulfilled' ? productsResult.value || {} : {}
        const brands = brandsResult.status === 'fulfilled' ? brandsResult.value : []
        const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : []
        const orders = ordersResult.status === 'fulfilled' ? ordersResult.value || {} : {}

        setCatalog({
          products: products.totalElements || 0,
          brands: Array.isArray(brands) ? brands.length : 0,
          categories: Array.isArray(categories) ? categories.length : 0,
          orders: orders.totalElements || 0,
        })

        if (financialResult.status === 'fulfilled') {
          setFinancial({ ...initialFinancial, ...(financialResult.value || {}) })
        } else {
          setError('Không tải được dữ liệu tài chính. Các số liệu danh mục vẫn được giữ lại.')
        }
      } catch (fetchError) {
        console.error('Admin dashboard fetch error:', fetchError)
        if (!ignore) setError('Không thể tải dashboard. Vui lòng thử làm mới.')
      } finally {
        if (!ignore) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchDashboard()
    return () => {
      ignore = true
    }
  }, [refreshKey])

  const trend = useMemo(() => {
    const keys = Object.keys(financial.revenueByDay || {}).sort().slice(-14)
    return keys.map((key) => {
      const [, month, day] = key.split('-')
      return {
        key,
        label: day && month ? `${day}/${month}` : key,
        revenue: Number(financial.revenueByDay?.[key] || 0),
        refund: Number(financial.refundByDay?.[key] || 0),
        shipping: Number(financial.shippingCostByDay?.[key] || 0),
        net: Number(financial.netCashByDay?.[key] || 0),
      }
    })
  }, [financial])

  const trendMaximum = useMemo(
    () => Math.max(...trend.flatMap((item) => [item.revenue, item.refund, item.shipping]), 1),
    [trend],
  )

  const claimTypes = [
    {
      label: 'Hư hỏng, móp méo',
      value: financial.claimTypeCounts?.RETURN,
      icon: 'broken_image',
      tone: 'rose',
    },
    {
      label: 'Giao thiếu sản phẩm',
      value: financial.claimTypeCounts?.MISSING_ITEM,
      icon: 'remove_shopping_cart',
      tone: 'amber',
    },
    {
      label: 'Giao sai sản phẩm',
      value: financial.claimTypeCounts?.WRONG_ITEM,
      icon: 'swap_horiz',
      tone: 'blue',
    },
  ]

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="rounded-2xl bg-slate-950 px-6 py-6 text-white shadow-sm lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-300">SkinGuide Admin</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard tài chính & vận hành</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Theo dõi riêng tiền khách thanh toán, tiền hoàn và ba lớp chi phí vận chuyển:
              đơn gốc, thu hồi hàng khiếu nại và giao lại cho khách.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            >
              <Icon name="refresh" className={refreshing ? 'animate-spin text-lg' : 'text-lg'} />
              {refreshing ? 'Đang cập nhật' : 'Làm mới'}
            </button>
            <Link
              to={PATHS.ADMIN_RETURNS}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100"
            >
              <Icon name="assignment_return" className="text-lg" />
              Quản lý khiếu nại
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="warning" className="mt-0.5 text-lg" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tổng tiền đã ghi nhận"
          value={money(financial.grossRevenue)}
          hint={`${number(financial.paidOrderCount)} đơn từng thanh toán, đã gồm phí ship khách trả`}
          icon="account_balance_wallet"
          accent="emerald"
          to={PATHS.ADMIN_ORDERS}
        />
        <MetricCard
          label="Đã hoàn cho khách"
          value={money(financial.completedRefundAmount)}
          hint={`${number(financial.completedRefundCount)} giao dịch hoàn tất · ${money(financial.pendingRefundAmount)} đang chờ`}
          icon="currency_exchange"
          accent="rose"
          to={PATHS.ADMIN_RETURNS}
        />
        <MetricCard
          label="Tổng chi phí vận chuyển"
          value={money(financial.totalShippingCost)}
          hint="Đơn gốc + thu hồi hàng + giao lại"
          icon="local_shipping"
          accent="amber"
        />
        <MetricCard
          label="Dòng tiền ròng ước tính"
          value={signedMoney(financial.netCashAfterRefundAndShipping)}
          hint="Tiền ghi nhận − tiền đã hoàn − toàn bộ phí ship; chưa trừ giá vốn"
          icon="monitoring"
          accent={Number(financial.netCashAfterRefundAndShipping) >= 0 ? 'blue' : 'rose'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Section
          title="Bóc tách chi phí vận chuyển"
          description="Phí được ghi nhận ngay khi đã có vận đơn/chi phí GHN, kể cả kiện đang giao hoặc hoàn về."
        >
          <div className="grid grid-cols-1 gap-0 divide-y divide-slate-100 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="py-3 sm:pr-6">
              <FinanceRow
                label="Ship đơn hàng gốc"
                value={money(financial.originalShippingCost)}
                hint={`${number(financial.originalShipmentCount)} vận đơn`}
              />
              <FinanceRow
                label="Thu hồi hàng khiếu nại"
                value={money(financial.returnShippingCost)}
                hint={`${number(financial.returnShipmentCount)} vận đơn trả về kho`}
                tone="warning"
              />
              <FinanceRow
                label="Giao lại sản phẩm"
                value={money(financial.redeliveryShippingCost)}
                hint={`${number(financial.redeliveryShipmentCount)} vận đơn giao lại`}
                tone="warning"
              />
              <div className="border-t border-slate-200">
                <FinanceRow
                  label="Tổng chi phí ship"
                  value={money(financial.totalShippingCost)}
                  strong
                  tone="negative"
                />
              </div>
            </div>
            <div className="py-3 sm:pl-6">
              <FinanceRow
                label="Phí ship khách đã trả"
                value={money(financial.shippingCollected)}
                hint="Nằm trong tổng tiền đã ghi nhận"
                tone="positive"
              />
              <FinanceRow
                label="Phần shop bù cho vận chuyển"
                value={signedMoney(financial.shopShippingSubsidy)}
                hint="Tổng chi phí ship − phí ship thu từ khách"
                tone={Number(financial.shopShippingSubsidy) > 0 ? 'negative' : 'positive'}
                strong
              />
              <FinanceRow
                label="Bình quân mỗi vận đơn"
                value={money(financial.averageShippingCostPerShipment)}
                hint="Tính trên đơn gốc, thu hồi và giao lại"
              />
              <div className="mt-3 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-800">
                <p className="font-semibold">Cách đọc số liệu</p>
                <p className="mt-1">
                  Khi có khiếu nại, một đơn có thể phát sinh thêm cả phí lấy hàng về và phí giao lại.
                  Hai khoản này là chi phí shop chịu, không cộng vào doanh thu.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Cấu trúc tiền ghi nhận"
          description="Phân biệt tiền hàng và phần phí vận chuyển khách đã thanh toán."
        >
          <div className="px-5 py-3">
            <FinanceRow label="Tổng tiền đơn hàng" value={money(financial.grossRevenue)} strong />
            <FinanceRow label="Phí ship thu từ khách" value={money(financial.shippingCollected)} />
            <FinanceRow
              label="Doanh thu sản phẩm"
              value={money(financial.productRevenue)}
              hint="Tổng tiền đơn hàng − phí ship khách trả"
              tone="positive"
              strong
            />
            <div className="border-t border-slate-200">
              <FinanceRow
                label="Hoàn tiền đang chờ xử lý"
                value={money(financial.pendingRefundAmount)}
                hint={`${number(financial.pendingRefundCount)} yêu cầu, chưa trừ vào dòng tiền ròng`}
                tone="warning"
              />
            </div>
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              “Dòng tiền ròng ước tính” không phải lợi nhuận: chưa bao gồm giá vốn sản phẩm,
              lương, marketing, phí thanh toán và các chi phí vận hành khác.
            </p>
          </div>
        </Section>
      </div>

      <Section
        title="Dòng tiền 14 ngày gần nhất"
        description="So sánh tiền ghi nhận với tiền hoàn và toàn bộ phí vận chuyển phát sinh theo ngày."
        action={
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Tiền ghi nhận</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" />Hoàn tiền</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" />Phí ship</span>
          </div>
        }
      >
        <div className="overflow-x-auto px-5 pb-5 pt-6">
          {trend.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu theo ngày
            </div>
          ) : (
            <div className="flex h-72 min-w-[850px] items-end gap-3">
              {trend.map((item) => (
                <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center">
                  <div className="flex h-48 w-full items-end justify-center gap-1 rounded-lg bg-slate-50 px-1.5 pt-2">
                    <div
                      className="w-2.5 rounded-t bg-emerald-500"
                      style={{ height: `${item.revenue ? Math.max(4, (item.revenue / trendMaximum) * 100) : 0}%` }}
                      title={`Tiền ghi nhận: ${money(item.revenue)}`}
                    />
                    <div
                      className="w-2.5 rounded-t bg-rose-400"
                      style={{ height: `${item.refund ? Math.max(4, (item.refund / trendMaximum) * 100) : 0}%` }}
                      title={`Hoàn tiền: ${money(item.refund)}`}
                    />
                    <div
                      className="w-2.5 rounded-t bg-amber-400"
                      style={{ height: `${item.shipping ? Math.max(4, (item.shipping / trendMaximum) * 100) : 0}%` }}
                      title={`Phí ship: ${money(item.shipping)}`}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-600">{item.label}</p>
                  <p className={`mt-1 text-[10px] font-medium ${item.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Ròng {signedMoney(item.net)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Section
          title="Khiếu nại theo lý do"
          description={`${number(financial.totalReturnCount)} khiếu nại trong toàn hệ thống`}
          action={
            <Link to={PATHS.ADMIN_RETURNS} className="text-sm font-semibold text-primary hover:underline">
              Xem danh sách
            </Link>
          }
        >
          <div className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-1">
            {claimTypes.map((item) => (
              <div key={item.label} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Icon name={item.icon} className="text-xl" />
                </span>
                <div>
                  <p className="text-xl font-bold text-slate-950">{number(item.value)}</p>
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Hàng đợi xử lý khiếu nại & giao lại"
          description="Các điểm đang cần Admin, Manager hoặc kho tiếp tục xử lý."
        >
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            <CountTile label="Chờ review và duyệt" value={financial.pendingReturnCount} tone="amber" />
            <CountTile label="Chờ/đang kiểm hàng" value={financial.inspectionReturnCount} tone="blue" />
            <CountTile label="Chờ hoàn tiền" value={financial.waitingRefundReturnCount} tone="violet" />
            <CountTile label="Đơn giao lại đang xử lý" value={financial.activeRedeliveryCount} tone="amber" />
            <CountTile label="Đã giao lại thành công" value={financial.completedRedeliveryCount} tone="emerald" />
            <CountTile label="Giao lại hoàn về kho" value={financial.returnedRedeliveryCount} tone="rose" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50">
            <div className="p-4 text-center">
              <p className="text-lg font-bold text-emerald-700">{number(financial.refundedReturnCount)}</p>
              <p className="mt-1 text-xs text-slate-500">Đã hoàn tiền</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-lg font-bold text-blue-700">{number(financial.resolvedReturnCount)}</p>
              <p className="mt-1 text-xs text-slate-500">Đã giải quyết giao lại</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-lg font-bold text-rose-700">{number(financial.rejectedReturnCount)}</p>
              <p className="mt-1 text-xs text-slate-500">Bị từ chối</p>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Tổng đơn hàng"
          value={number(catalog.orders)}
          hint="Tất cả trạng thái trong hệ thống"
          icon="receipt_long"
          to={PATHS.ADMIN_ORDERS}
        />
        <MetricCard
          label="Sản phẩm"
          value={number(catalog.products)}
          hint={`${number(catalog.brands)} thương hiệu · ${number(catalog.categories)} danh mục`}
          icon="inventory_2"
          to={PATHS.ADMIN_PRODUCTS}
        />
        <MetricCard
          label="Tổng đơn giao lại"
          value={number(financial.totalCompensationCount)}
          hint={`${number(financial.redeliveryShipmentCount)} đơn đã phát sinh vận đơn`}
          icon="move_to_inbox"
          accent="blue"
          to={PATHS.ADMIN_RETURNS}
        />
      </div>
    </div>
  )
}
