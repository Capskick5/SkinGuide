import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { resolveImageUrl } from '@/page/products/productUtils'
import { useAuth } from '@/hook/useAuth'
import httpClient from '@/api/httpClient'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function getStatusLabel(status) {
  const map = {
    PENDING: { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'schedule' },
    PAID: { label: 'Đã thanh toán', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'check_circle' },
    PROCESSING: { label: 'Đang chuẩn bị', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'inventory_2' },
    SHIPPED: { label: 'Đang giao hàng', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'local_shipping' },
    CANCELLED: { label: 'Đã hủy', color: 'text-error bg-error/10 border-error/20', icon: 'cancel' }
  }
  return map[status] || { label: status, color: 'text-gray-600 bg-gray-100 border-gray-200', icon: 'info' }
}

/* ─────────────────────────────────────────────
   Modal Chi Tiết Đơn Hàng
───────────────────────────────────────────── */
function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = []
  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)

  pages.push(1)
  if (start > 2) pages.push('...')

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 1) pages.push('...')
  pages.push(totalPages)
  return pages
}

function OrderDetailModal({ order, onClose }) {
  if (!order) return null

  const statusConfig = getStatusLabel(order.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-pink bg-surface-container-lowest rounded-t-3xl">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">Chi tiết đơn hàng</h2>
            <p className="text-caption text-on-surface-variant">Mã đơn: <span className="font-semibold text-primary">{order.orderCode}</span></p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-border-pink hover:text-error transition-colors"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trạng thái & Ngày */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-primary-light border border-primary/20">
            <div>
              <p className="text-caption text-on-surface-variant">Ngày đặt hàng</p>
              <p className="font-semibold text-body-md text-on-surface">
                {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-xl border font-bold flex items-center gap-2 ${statusConfig.color}`}>
              <Icon name={statusConfig.icon} className="text-lg" />
              {statusConfig.label}
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div>
            <h3 className="font-bold text-title-md text-on-surface mb-3 flex items-center gap-2">
              <Icon name="inventory_2" className="text-primary" />
              Sản phẩm ({order.items.length})
            </h3>
            <div className="rounded-2xl border border-border-pink overflow-hidden divide-y divide-border-pink">
              {order.items.map((item, idx) => {
                const img = resolveImageUrl(item.imageUrl)
                return (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white">
                    <div className="w-14 h-14 rounded-xl bg-surface-container-lowest flex items-center justify-center shrink-0 border border-border-pink overflow-hidden">
                      {img ? (
                        <img src={img} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="science" className="text-primary/50 text-2xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-body-sm text-on-surface truncate">{item.productName}</p>
                      <p className="text-caption text-on-surface-variant mt-0.5">
                        Số lượng: {item.quantity} - Đơn giá: {money(item.unitPrice)}
                      </p>
                    </div>
                    <div className="font-bold text-on-surface whitespace-nowrap pl-2">
                      {money(item.subTotal)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Thông tin Giao hàng & Thanh toán */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border-pink p-5 bg-surface-container-lowest">
              <h3 className="font-bold text-body-md text-on-surface mb-3 flex items-center gap-2">
                <Icon name="local_shipping" className="text-primary text-lg" />
                Giao hàng đến
              </h3>
              <p className="font-semibold text-body-sm text-on-surface">{order.customerName}</p>
              <p className="text-caption text-on-surface-variant mt-0.5">{order.customerPhone}</p>
              <p className="text-caption text-on-surface-variant mt-1 leading-relaxed">{order.shippingAddress}</p>
            </div>

            <div className="rounded-2xl border border-border-pink p-5 bg-surface-container-lowest flex flex-col">
              <h3 className="font-bold text-body-md text-on-surface mb-3 flex items-center gap-2">
                <Icon name="payments" className="text-primary text-lg" />
                Thanh toán
              </h3>
              <div className="flex justify-between text-body-sm font-medium mb-1">
                <span className="text-on-surface-variant">Phương thức</span>
                <span className="text-on-surface">{order.paymentMethod === 'MOMO' ? 'Ví MoMo' : 'Tiền mặt (COD)'}</span>
              </div>
              <div className="flex justify-between text-body-sm font-medium mb-1 border-b border-border-pink pb-2">
                <span className="text-on-surface-variant">Phí vận chuyển</span>
                <span className="text-emerald-600">Miễn phí</span>
              </div>
              <div className="flex justify-between items-end mt-auto pt-2">
                <span className="text-on-surface font-bold">Tổng thanh toán</span>
                <span className="text-headline-sm font-bold text-primary">{money(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Trang Đơn hàng chính
───────────────────────────────────────────── */
export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Pagination state
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 5 // 5 đơn mỗi trang cho client

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    let cancelled = false

    async function loadOrders() {
      setLoading(true)
      try {
        const data = await httpClient.get(`/orders/user/${user.id}?page=${page}&size=${pageSize}`)
        if (cancelled) return
        setOrders(data.content || [])
        setTotalPages(data.totalPages || 1)
      } catch (err) {
        if (!cancelled) console.error(err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOrders()
    return () => {
      cancelled = true
    }
  }, [user?.id, page])

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-caption text-on-surface-variant mb-1">
            <Link to="/" className="hover:text-primary">Trang chủ</Link>
            <span className="mx-2">/</span>
            Lịch sử đơn hàng
          </p>
          <h1 className="text-headline-lg text-on-surface">Đơn hàng của tôi</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Icon name="hourglass_empty" className="text-4xl text-primary animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 bg-surface-container-lowest rounded-3xl border border-border-pink">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <Icon name="receipt_long" className="text-5xl text-primary/50" />
          </div>
          <div className="text-center">
            <p className="text-headline-sm text-on-surface font-semibold mb-2">Chưa có đơn hàng nào</p>
            <p className="text-body-md text-on-surface-variant">Bạn chưa thực hiện giao dịch nào.</p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-primary border border-primary font-semibold hover:bg-primary-light transition-colors"
          >
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
          {orders.map(order => {
            const statusConfig = getStatusLabel(order.status)
            const firstItem = order.items[0]
            const remainingCount = order.items.length - 1

            return (
              <div key={order.id} className="bg-white rounded-3xl border border-border-pink shadow-sm hover:shadow-[0_8px_30px_rgba(255,107,158,0.12)] transition-shadow overflow-hidden flex flex-col">
                {/* Header Card */}
                <div className="p-5 border-b border-border-pink/50 bg-surface-container-lowest flex items-start justify-between gap-3">
                  <div>
                    <p className="text-caption text-on-surface-variant flex items-center gap-1.5">
                      <Icon name="calendar_today" className="text-sm" />
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                    <h3 className="font-bold text-on-surface text-title-md mt-1">
                      Mã đơn: <span className="text-primary">{order.orderCode}</span>
                    </h3>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg border text-[11px] uppercase font-bold tracking-wide flex items-center gap-1.5 ${statusConfig.color}`}>
                    <Icon name={statusConfig.icon} className="text-[14px]" />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Body Card (Summary) */}
                <div className="p-5 flex-1">
                  {firstItem && (
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-primary-light flex items-center justify-center shrink-0 border border-border-pink overflow-hidden">
                        {firstItem.imageUrl ? (
                          <img src={resolveImageUrl(firstItem.imageUrl)} alt={firstItem.productName} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="science" className="text-primary/50 text-2xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-body-sm text-on-surface truncate">{firstItem.productName}</p>
                        <p className="text-caption text-on-surface-variant mt-0.5">
                          Số lượng: {firstItem.quantity}
                        </p>
                      </div>
                    </div>
                  )}
                  {remainingCount > 0 && (
                    <p className="text-caption text-primary font-medium mt-3 pl-20">
                      + {remainingCount} sản phẩm khác
                    </p>
                  )}
                </div>

                {/* Footer Card */}
                <div className="p-5 border-t border-border-pink/50 flex items-center justify-between bg-primary-light/30">
                  <div>
                    <p className="text-caption text-on-surface-variant">Tổng tiền</p>
                    <p className="font-bold text-primary text-title-md">{money(order.totalAmount)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-5 py-2.5 rounded-xl border border-primary text-primary font-semibold text-body-sm hover:bg-primary hover:text-white transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">
            Trang <span className="font-bold text-gray-800">{page + 1}</span> / {totalPages}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary hover:bg-gray-50 transition-colors"
            >
              <Icon name="chevron_left" className="text-base" />
              Trước
            </button>

            {getVisiblePages(page + 1, totalPages).map((item, index) =>
              item === '...' ? (
                <span key={`dots-${index}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item - 1)}
                  className={[
                    'min-w-10 h-10 px-3 rounded-xl border text-sm font-semibold transition-colors',
                    item === page + 1
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                      : 'border-gray-200 bg-white text-gray-600 hover:text-primary hover:bg-gray-50',
                  ].join(' ')}
                >
                  {item}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary hover:bg-gray-50 transition-colors"
            >
              Sau
              <Icon name="chevron_right" className="text-base" />
            </button>
          </div>
        </div>
      )}

      {/* Render Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}
