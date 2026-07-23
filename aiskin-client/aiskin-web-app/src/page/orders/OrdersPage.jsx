import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { resolveImageUrl } from '@/page/products/productUtils'
import { useAuth } from '@/hook/useAuth'
import httpClient from '@/api/httpClient'
import { message } from 'antd'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function getStatusLabel(status) {
  const map = {
    // 1. Chờ duyệt
    PENDING: { label: 'Chờ duyệt', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'schedule' },
    
    // 2. Đang chuẩn bị
    PROCESSING: { label: 'Đang chuẩn bị', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'inventory_2' },
    
    // 3. Đang vận chuyển (Gom tất cả các bước trung gian của GHN)
    READY_TO_PICK: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    PICKING: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    PICKED: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    STORING: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    TRANSPORTING: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    SORTING: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    DELIVERING: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    DELIVERY_FAIL: { label: 'Đang vận chuyển', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'local_shipping' },
    
    // 4. Thành công
    DELIVERED: { label: 'Thành công', color: 'text-teal-600 bg-teal-50 border-teal-200', icon: 'mark_email_read' },
    RECEIVED: { label: 'Thành công', color: 'text-teal-600 bg-teal-50 border-teal-200', icon: 'mark_email_read' },
    
    // 5. Từ chối nhận hàng (Gom tất cả các bước Hoàn trả)
    WAITING_TO_RETURN: { label: 'Từ chối nhận hàng đang hoàn kho', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'keyboard_return' },
    RETURN: { label: 'Từ chối nhận hàng đang hoàn kho', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'keyboard_return' },
    RETURN_TRANSPORTING: { label: 'Từ chối nhận hàng đang hoàn kho', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'keyboard_return' },
    RETURNING: { label: 'Từ chối nhận hàng đang hoàn kho', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'keyboard_return' },
    RETURN_FAIL: { label: 'Từ chối nhận hàng đang hoàn kho', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'keyboard_return' },
    REFUSED: { label: 'Từ chối nhận hàng đang hoàn kho', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'cancel' },
    RETURNED: { label: 'Đã hoàn hàng về kho', color: 'text-gray-600 bg-gray-100 border-gray-200', icon: 'keyboard_return' },
    
    // 6. Đã hủy
    CANCELLED: { label: 'Đã hủy', color: 'text-gray-600 bg-gray-100 border-gray-200', icon: 'block' }
  }
  return map[status] || { label: status, color: 'text-gray-600 bg-gray-100 border-gray-200', icon: 'info' }
}

const TABS = [
  { key: 'PENDING', query: 'PENDING', label: 'Chờ duyệt' },
  { key: 'PROCESSING', query: 'PROCESSING', label: 'Đang chuẩn bị' },
  { key: 'TRANSPORTING', query: 'READY_TO_PICK,PICKING,PICKED,STORING,TRANSPORTING,SORTING,DELIVERING,DELIVERY_FAIL', label: 'Đang vận chuyển' },
  { key: 'DELIVERED', query: 'DELIVERED,RECEIVED', label: 'Thành công' },
  { key: 'REFUSED', query: 'WAITING_TO_RETURN,RETURN,RETURN_TRANSPORTING,RETURNING,RETURN_FAIL,RETURNED,REFUSED', label: 'Từ chối nhận hàng' },
  { key: 'CANCELLED', query: 'CANCELLED', label: 'Đã hủy' },
]

/* ─────────────────────────────────────────────
   Modal Xác nhận Hủy đơn hàng
───────────────────────────────────────────── */
function ConfirmCancelModal({ orderCode, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef(null)

  const predefinedReasons = [
    'Muốn đổi sản phẩm/số lượng',
    'Tìm thấy giá rẻ hơn chỗ khác',
    'Phí vận chuyển quá cao',
    'Đổi ý, không muốn mua nữa',
    'Cập nhật địa chỉ/SĐT',
    'Khác'
  ]

  if (!orderCode) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl animate-slide-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
          <Icon name="warning" className="text-3xl" />
        </div>
        <h3 className="mt-4 text-title-md font-bold text-on-surface">Xác nhận hủy đơn hàng</h3>
        <p className="mt-2 text-body-sm leading-6 text-on-surface-variant">
          Bạn có chắc chắn muốn hủy đơn hàng <span className="font-bold text-primary">{orderCode}</span> không?
        </p>

        <div className="mt-4 text-left">
          <p className="text-body-sm font-semibold mb-2">Lý do hủy đơn <span className="text-error">*</span></p>
          <div className="flex flex-wrap gap-2 mb-3">
            {predefinedReasons.map(r => (
              <button 
                key={r} 
                onClick={() => {
                  setSelectedTag(r)
                  if (r === 'Khác') {
                    setReason('')
                    inputRef.current?.focus()
                  } else {
                    setReason(r)
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selectedTag === r ? 'bg-primary text-white border-primary' : 'bg-surface-container border-border-pink hover:bg-border-pink'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (selectedTag && selectedTag !== 'Khác' && e.target.value !== selectedTag) {
                setSelectedTag('')
              }
            }}
            placeholder="Nhập lý do hủy..."
            className="w-full rounded-xl border border-border-pink px-4 py-3 text-body-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            rows="2"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-body-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={async () => {
              setIsSubmitting(true)
              try {
                await onConfirm(reason)
              } finally {
                if (document.body.contains(inputRef.current)) {
                  setIsSubmitting(false)
                }
              }
            }}
            disabled={!reason.trim() || isSubmitting}
            className="flex-1 rounded-xl bg-error px-4 py-3 text-body-sm font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Icon name="progress_activity" className="animate-spin text-lg" />}
            {isSubmitting ? 'Đang hủy...' : 'Hủy đơn'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Trang Đơn hàng chính
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

/* ─────────────────────────────────────────────
   Trang Đơn hàng chính
───────────────────────────────────────────── */
export default function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [returnRequests, setReturnRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [activeTab, setActiveTab] = useState('PENDING')
  
  // Pagination state
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 5 // 5 đơn mỗi trang cho client

  useEffect(() => {
    if (!user?.id) {
      return
    }
    
    let cancelled = false

    async function loadOrders() {
      setLoading(true)
      try {
        const activeTabObj = TABS.find(t => t.key === activeTab) || TABS[0]
        const data = await httpClient.get(`/orders/user/${user.id}?page=${page}&size=${pageSize}&status=${activeTabObj.query}`)
        if (cancelled) return
        setOrders(data.content || [])
        setTotalPages(data.totalPages || 1)
        
        if (activeTab === 'DELIVERED') {
          try {
            const returnsData = await httpClient.get(`/returns/user/${user.id}`)
            if (!cancelled) setReturnRequests(returnsData || [])
          } catch (e) {
            console.error('Failed to load returns', e)
          }
        } else {
          setReturnRequests([])
        }
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
  }, [user?.id, page, activeTab])

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

      {/* Tabs */}
      <div className="mb-6 flex overflow-x-auto gap-2 pt-1 pb-2 px-1 -mx-1 scrollbar-hide" role="tablist" aria-label="Lọc đơn hàng theo trạng thái">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const statusStyle = getStatusLabel(tab.key)

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveTab(tab.key)
                setPage(0)
              }}
              className={`px-4 py-2 flex items-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? `${statusStyle.color} shadow-sm ring-1 ring-current`
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon name={statusStyle.icon} className={isActive ? '' : 'opacity-60'} />
              {tab.label}
            </button>
          )
        })}
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
        <div className="flex flex-col gap-3 w-full">
          {orders.map(order => {
            const statusConfig = getStatusLabel(order.status)
            const firstItem = order.items[0]
            const remainingCount = order.items.length - 1

            return (
              <div key={order.id} className="bg-white rounded-lg border border-border-pink shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col w-full">
                {/* Header Card */}
                <div className="px-4 py-2 border-b border-border-pink/50 bg-surface-container-lowest flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <h3 className="font-bold text-on-surface text-[13px]">
                      Mã đơn: <span className="text-primary">{order.orderCode}</span>
                    </h3>
                    
                    {returnRequests.find(r => r.orderId === order.id && !['REFUNDED', 'RESOLVED', 'REJECTED', 'INSPECTION_FAILED'].includes(r.status)) && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        <Icon name="gavel" className="text-[13px]" />
                        Đang khiếu nại
                      </span>
                    )}
                    {returnRequests.find(r => r.orderId === order.id && r.status === 'REFUNDED') && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Icon name="price_check" className="text-[13px]" />
                        Đã trả hàng & Hoàn tiền
                      </span>
                    )}
                    {returnRequests.find(r => r.orderId === order.id && r.status === 'RESOLVED') && (
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Icon name="local_shipping" className="text-[13px]" />
                        Đã giao lại thành công
                      </span>
                    )}

                    <span className="hidden sm:inline text-border-pink">|</span>
                    <p className="text-caption text-on-surface-variant flex items-center gap-1.5">
                      <Icon name="calendar_today" className="text-sm" />
                      {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {order.status === 'PENDING' && order.paymentMethod === 'BANK_TRANSFER' && order.paymentStatus === 'UNPAID' && (
                      <div className="shrink-0 px-3 py-1.5 rounded-lg border text-[11px] uppercase font-bold tracking-wide flex items-center gap-1.5 text-orange-600 bg-orange-50 border-orange-200">
                        <Icon name="payment" className="text-[14px]" />
                        Chờ thanh toán
                      </div>
                    )}
                    <div className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11px] uppercase font-bold tracking-wide flex items-center gap-1.5 ${statusConfig.color}`}>
                      <Icon name={statusConfig.icon} className="text-[14px]" />
                      {statusConfig.label}
                    </div>
                  </div>
                </div>

                {/* Body Card (Product & Actions combined) */}
                <div className="px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Left: Product summary */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                    {firstItem && (
                      <>
                        <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center shrink-0 border border-border-pink overflow-hidden">
                          {firstItem.imageUrl ? (
                            <img src={resolveImageUrl(firstItem.imageUrl)} alt={firstItem.productName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          ) : (
                            <Icon name="science" className="text-primary/50 text-2xl" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-2 gap-y-1">
                          <p className="font-semibold text-body-sm text-on-surface truncate max-w-[200px] sm:max-w-[300px]">{firstItem.productName}</p>
                          <span className="text-caption text-on-surface-variant shrink-0 border-l border-gray-300 pl-2">
                            SL: {firstItem.quantity}
                          </span>
                          {remainingCount > 0 && (
                            <span className="text-[11px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                              + {remainingCount} sản phẩm khác
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Total and Button */}
                  <div className="flex items-center shrink-0 w-full sm:w-auto sm:border-l sm:border-border-pink sm:pl-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-border-pink sm:border-t-0 gap-3 justify-between sm:justify-start">
                    <div className="text-right flex flex-col sm:block">
                      <span className="text-caption text-on-surface-variant sm:mr-1">Tổng thanh toán:</span>
                      <span className="font-bold text-primary text-body-lg">{money(order.totalAmount)}</span>
                    </div>
                    <Link
                      to={`/orders/${order.id}`}
                      className="px-3 py-1.5 rounded-lg border border-primary text-primary font-bold text-sm hover:bg-primary hover:text-white transition-colors shrink-0"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
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

      {confirmCancel && (
        <ConfirmCancelModal
          orderCode={confirmCancel.orderCode}
          onClose={() => setConfirmCancel(null)}
          onConfirm={async (reason) => {
            try {
              await httpClient.post(`/orders/${confirmCancel.id}/cancel`, { cancelReason: reason })
              message.success('Đã hủy đơn hàng thành công')
              setConfirmCancel(null)
              setTimeout(() => window.location.reload(), 500)
            } catch (err) {
              message.error(err.response?.data?.message || 'Không thể hủy đơn hàng')
              setConfirmCancel(null)
            }
          }}
        />
      )}
    </div>
  )
}
