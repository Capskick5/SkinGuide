import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { resolveImageUrl } from '@/page/products/productUtils'
import httpClient from '@/api/httpClient'
import { message } from 'antd'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function getStatusLabel(status) {
  const map = {
    // Nhóm 1: Chờ duyệt
    PENDING: { label: 'Chờ duyệt', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'schedule' },
    // Nhóm 2: Đang chuẩn bị
    PROCESSING: { label: 'Đang chuẩn bị', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'inventory_2' },
    // Nhóm 3: Chờ lấy hàng
    READY_TO_PICK: { label: 'Chờ lấy hàng', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'inventory' },
    PICKING: { label: 'Đang lấy hàng', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'inventory' },
    PICKED: { label: 'Đã lấy hàng', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: 'inventory' },
    // Nhóm 4: Đang vận chuyển
    STORING: { label: 'Nhập kho', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'warehouse' },
    TRANSPORTING: { label: 'Trung chuyển', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'local_shipping' },
    SORTING: { label: 'Đang phân loại', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'category' },
    DELIVERING: { label: 'Đang giao hàng', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'local_shipping' },
    DELIVERY_FAIL: { label: 'Giao thất bại (Đang hoàn về kho)', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: 'local_shipping' },
    // Nhóm 5: Thành công
    DELIVERED: { label: 'Thành công', color: 'text-teal-600 bg-teal-50 border-teal-200', icon: 'mark_email_read' },
    RECEIVED: { label: 'Thành công', color: 'text-teal-600 bg-teal-50 border-teal-200', icon: 'mark_email_read' },
    // Nhóm 6: Giao thất bại / Hoàn trả
    WAITING_TO_RETURN: { label: 'Chờ hoàn trả', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'keyboard_return' },
    RETURN: { label: 'Đang hoàn trả', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'keyboard_return' },
    RETURN_TRANSPORTING: { label: 'Luân chuyển hàng hoàn', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'keyboard_return' },
    RETURNING: { label: 'Đang trả hàng', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'keyboard_return' },
    RETURN_FAIL: { label: 'Hoàn trả thất bại', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'keyboard_return' },
    RETURNED: { label: 'Đã hoàn trả', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: 'keyboard_return' },
    REFUSED: { label: 'Từ chối nhận hàng', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: 'cancel' },
    CANCELLED: { label: 'Đã hủy', color: 'text-gray-600 bg-gray-100 border-gray-200', icon: 'block' }
  }
  return map[status] || { label: status, color: 'text-gray-600 bg-gray-100 border-gray-200', icon: 'info' }
}

function ConfirmCancelModal({ orderCode, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
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
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="flex-1 rounded-xl bg-error px-4 py-3 text-body-sm font-semibold text-white hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy đơn
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState(null)

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await httpClient.get(`/orders/${id}`)
        setOrder(data)
      } catch (err) {
        message.error('Không tìm thấy đơn hàng')
        navigate('/orders')
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Icon name="hourglass_empty" className="text-4xl text-primary animate-spin" />
      </div>
    )
  }

  if (!order) return null

  const statusConfig = getStatusLabel(order.status)

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-caption text-on-surface-variant mb-1">
            <Link to="/" className="hover:text-primary">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link to="/orders" className="hover:text-primary">Lịch sử đơn hàng</Link>
            <span className="mx-2">/</span>
            Chi tiết
          </p>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => navigate('/orders')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-border-pink hover:bg-border-pink transition-colors"
            >
              <Icon name="arrow_back" />
            </button>
            <h1 className="text-headline-lg text-on-surface font-bold">Mã đơn: <span className="text-primary">{order.orderCode}</span></h1>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-border-pink overflow-hidden flex flex-col">
        {/* Body */}
        <div className="flex-1 p-6 space-y-6">
          {/* Trạng thái & Ngày */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-primary-light border border-primary/20">
            <div>
              <p className="text-caption text-on-surface-variant">Ngày đặt hàng</p>
              <p className="font-semibold text-body-lg text-on-surface">
                {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className={`px-5 py-2.5 rounded-xl border font-bold flex items-center gap-2 text-body-md ${statusConfig.color}`}>
              <Icon name={statusConfig.icon} className="text-xl" />
              {statusConfig.label}
            </div>
          </div>
          
          {order.status === 'CANCELLED' && order.cancelReason && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Icon name="info" className="text-lg" />
                Lý do hủy đơn
              </div>
              <p className="text-sm">{order.cancelReason}</p>
            </div>
          )}

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
                    <div className="w-16 h-16 rounded-xl bg-surface-container-lowest flex items-center justify-center shrink-0 border border-border-pink overflow-hidden">
                      {img ? (
                        <img src={img} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="science" className="text-primary/50 text-3xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-body-md text-on-surface truncate">{item.productName}</p>
                      <p className="text-caption text-on-surface-variant mt-0.5 text-body-sm">
                        Số lượng: {item.quantity} - Đơn giá: {money(item.unitPrice)}
                      </p>
                    </div>
                    <div className="font-bold text-on-surface whitespace-nowrap pl-2 text-body-md">
                      {money(item.subTotal)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Thông tin Giao hàng & Thanh toán */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border-pink p-6 bg-surface-container-lowest flex flex-col">
              <h3 className="font-bold text-body-md text-on-surface mb-3 flex items-center gap-2">
                <Icon name="local_shipping" className="text-primary text-xl" />
                Giao hàng đến
              </h3>
              <p className="font-semibold text-body-md text-on-surface">{order.customerName}</p>
              <p className="text-body-sm text-on-surface-variant mt-0.5">{order.customerPhone}</p>
              <p className="text-body-sm text-on-surface-variant mt-2 leading-relaxed">{order.shippingAddress}</p>
              
              {order.trackingCode && (
                <div className="mt-auto pt-4 border-t border-border-pink">
                  <p className="text-body-sm text-on-surface-variant mb-2">Mã Vận Đơn GHN</p>
                  <p className="font-bold text-blue-700 flex items-center gap-2 bg-blue-50 w-fit px-4 py-2 rounded-lg border border-blue-200">
                    <Icon name="local_shipping" className="text-xl" />
                    {order.trackingCode}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border-pink p-6 bg-surface-container-lowest flex flex-col">
              <h3 className="font-bold text-body-md text-on-surface mb-3 flex items-center gap-2">
                <Icon name="payments" className="text-primary text-xl" />
                Thanh toán
              </h3>
              <div className="flex justify-between text-body-sm font-medium mb-2">
                <span className="text-on-surface-variant">Phương thức</span>
                <span className="text-on-surface">
                  {order.paymentMethod === 'MOMO' ? 'Ví MoMo' : order.paymentMethod === 'VNPAY' ? 'Thanh toán trực tuyến (VNPay)' : 'Tiền mặt (COD)'}
                </span>
              </div>
              <div className="flex justify-between text-body-sm font-medium mb-3 border-b border-border-pink pb-3">
                <span className="text-on-surface-variant">Phí vận chuyển</span>
                <span className="text-on-surface font-semibold">{order.shippingFee > 0 ? money(order.shippingFee) : <span className="text-emerald-600">Miễn phí</span>}</span>
              </div>
              <div className="flex justify-between items-end mt-auto pt-2 mb-2">
                <span className="text-on-surface font-bold text-body-md">Tổng thanh toán</span>
                <span className="text-headline-sm font-bold text-primary">{money(order.totalAmount)}</span>
              </div>
              
              {/* Nút hành động */}
              {order.status === 'PENDING' && (
                <div className="w-full mt-4 flex flex-col gap-2">
                  {order.paymentStatus === 'UNPAID' && order.paymentMethod !== 'COD' && (
                    <button
                      onClick={async () => {
                        try {
                          message.loading('Đang khởi tạo cổng thanh toán...')
                          const res = await httpClient.get(`/orders/${order.id}/payment-url`)
                          if (res.paymentUrl) {
                            window.location.href = res.paymentUrl
                          }
                        } catch (err) {
                          message.error(err.response?.data?.message || 'Không thể tạo liên kết thanh toán')
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold hover:bg-tertiary transition-colors"
                    >
                      <Icon name="payment" className="text-xl" />
                      Tiến hành thanh toán
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmCancel(order)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-error text-error font-bold hover:bg-error/10 transition-colors"
                  >
                    <Icon name="cancel" className="text-xl" />
                    Hủy đơn hàng
                  </button>
                </div>
              )}
              {order.status === 'DELIVERED' && order.paymentMethod === 'MOMO' && (
                <button
                  onClick={() => message.info("Tính năng trả hàng đang được xây dựng")}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-error text-white font-bold hover:bg-error/90 transition-colors"
                >
                  <Icon name="keyboard_return" className="text-xl" />
                  Yêu cầu Trả hàng / Hoàn tiền
                </button>
              )}
              {order.status === 'DELIVERED' && order.paymentMethod === 'COD' && (
                <div className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low text-on-surface-variant font-bold border border-border-pink">
                  <Icon name="verified" className="text-xl text-primary" />
                  Đơn hàng hoàn tất
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
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
