import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { App as AntApp, Dropdown } from 'antd'
import Icon from '@/components/common/Icon'
import ProtectedImage from '@/components/common/ProtectedImage'
import httpClient from '@/api/httpClient'
import { resolveImageUrl } from '@/page/products/productUtils'

function money(value) {
  if (value === null || value === undefined) return '0đ'
  return `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`
}

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu'
  return date.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const pages = [1]
  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)
  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < totalPages - 1) pages.push('...')
  pages.push(totalPages)
  return pages
}

const CLAIM_TYPE = {
  RETURN: { label: 'Trả hàng', icon: 'assignment_return', tone: 'bg-gray-100 text-gray-700 border-gray-200' },
  MISSING_ITEM: { label: 'Giao thiếu', icon: 'remove_shopping_cart', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  WRONG_ITEM: { label: 'Giao sai', icon: 'swap_horiz', tone: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const RETURN_STATUS = {
  PENDING: { label: 'Chờ duyệt', icon: 'schedule', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  DELIVERING: { label: 'Đang vận chuyển hoàn', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  DELIVERED: { label: 'Đã giao đến kho', icon: 'done_all', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
  RECEIVED: { label: 'Đã nhận hàng trả', icon: 'inventory_2', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  INSPECTION_FAILED: { label: 'Từ chối sau kiểm tra', icon: 'gpp_bad', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  REFUND_PENDING: { label: 'Chờ hoàn tiền', icon: 'payments', tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  REFUNDED: { label: 'Đã hoàn tiền', icon: 'price_check', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
  REDELIVERY_PENDING: { label: 'Chờ giao lại', icon: 'inventory_2', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  REDELIVERING: { label: 'Đang giao lại', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  RESOLVED: { label: 'Đã giao lại', icon: 'task_alt', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  REJECTED: { label: 'Từ chối', icon: 'block', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const TABS = [
  { key: 'PENDING', query: 'PENDING', label: 'Chờ duyệt', icon: 'schedule', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  { key: 'SHIPPING', query: 'DELIVERING,DELIVERED', label: 'Đang vận chuyển', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { key: 'REFUND', query: 'REFUND_PENDING', label: 'Chờ hoàn tiền', icon: 'payments', tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { key: 'REDELIVERY', query: 'REDELIVERY_PENDING,REDELIVERING', label: 'Giao lại', icon: 'local_shipping', tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  { key: 'REFUNDED', query: 'REFUNDED', label: 'Đã hoàn tiền', icon: 'price_check', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
  { key: 'RESOLVED', query: 'RESOLVED', label: 'Đã giao lại', icon: 'task_alt', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { key: 'REJECTED', query: 'REJECTED,INSPECTION_FAILED', label: 'Từ chối', icon: 'block', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
]

function StatusBadge({ status }) {
  const config = RETURN_STATUS[status] || { label: status, icon: 'info', tone: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.tone}`}>
      <Icon name={config.icon} className="text-[15px]" />
      {config.label}
    </span>
  )
}

function RefundStatusCell({ returnId }) {
  const [refundInfo, setRefundInfo] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!returnId) return
    httpClient.get(`/refunds/return-order/${returnId}`)
      .then(res => { setRefundInfo(res); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [returnId])

  if (!loaded) return <span className="text-xs text-gray-400">Đang kiểm tra...</span>
  if (!refundInfo) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Icon name="pending" className="text-[14px]" /> Chờ khách cung cấp
    </span>
  )
  if (refundInfo.status === 'COMPLETED') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-semibold text-teal-700">
      <Icon name="check_circle" className="text-[14px]" /> Đã hoàn tiền
    </span>
  )
  if (refundInfo.status === 'REJECTED') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
      <Icon name="warning" className="text-[14px]" /> Thông tin sai
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700">
      <Icon name="account_balance" className="text-[14px]" /> Đã cung cấp STK
    </span>
  )
}

function ReturnDetailsModal({ request, onClose }) {
  const { message } = AntApp.useApp()
  const [fullOrder, setFullOrder] = useState(null)

  const [refundRequest, setRefundRequest] = useState(null)
  const [compensationOrder, setCompensationOrder] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState('')

  useEffect(() => {
    if (request?.orderId) {
      httpClient.get(`/orders/${request.orderId}`)
        .then(res => setFullOrder(res))
        .catch(err => console.error(err))
    }
    if (request?.id && (request.status === 'REFUND_PENDING' || request.status === 'REFUNDED')) {
      httpClient.get(`/refunds/return-order/${request.id}`)
        .then(res => setRefundRequest(res))
        .catch(err => console.error(err))
    }
    if (request?.id && request.resolution === 'REDELIVER') {
      httpClient.get(`/compensations/return-order/${request.id}`)
        .then(res => setCompensationOrder(res))
        .catch(() => setCompensationOrder(null))
    }
  }, [request])

  const handleCompensationAction = async (action) => {
    if (!compensationOrder) return
    setCompleting(true)
    try {
      const updated = await httpClient.put(`/compensations/admin/${compensationOrder.id}/${action}`)
      setCompensationOrder(updated)
      message.success(action === 'reserve'
        ? 'Đã giữ tồn kho cho đơn giao lại'
        : action === 'ship' ? 'Đã tạo vận đơn giao lại' : 'Đã xác nhận giao lại thành công')
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xử lý đơn giao lại')
    } finally {
      setCompleting(false)
    }
  }

  const handleCompleteRefund = async () => {
    setCompleting(true)
    try {
      await httpClient.put(`/refunds/admin/${refundRequest.id}/complete`, { receiptUrl })
      message.success('Đã xác nhận hoàn tiền thành công')
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setCompleting(false)
    }
  }

  const handleRejectRefund = async () => {
    setCompleting(true)
    try {
      await httpClient.put(`/refunds/admin/${refundRequest.id}/reject`)
      message.warning('Đã đánh dấu thông tin ngân hàng không hợp lệ')
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setCompleting(false)
    }
  }

  if (!request) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-label="Đóng" />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-primary">{request.orderCode}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950">Chi tiết khiếu nại</h2>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-sm text-gray-500">{formatDate(request.createdAt)}</p>
              {request.claimType && CLAIM_TYPE[request.claimType] && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${CLAIM_TYPE[request.claimType].tone}`}>
                  <Icon name={CLAIM_TYPE[request.claimType].icon} className="text-[13px]" />
                  {CLAIM_TYPE[request.claimType].label}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Khách hàng</p>
              <p className="mt-2 font-semibold text-gray-950">{request.customerName}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Số điện thoại</p>
              <p className="mt-2 font-semibold text-gray-950">
                {fullOrder?.customerPhone || 'Đang tải...'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Trạng thái</p>
              <div className="mt-2">
                <StatusBadge status={request.status} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Tiền hoàn (dự kiến)</p>
              <p className="mt-2 font-bold text-primary">{money(request.refundAmount)}</p>
            </div>
            {request.returnShippingFee != null && request.returnShippingFee > 0 && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">Phí vận chuyển (Shop trả)</p>
                <p className="mt-2 font-bold text-rose-500">{money(request.returnShippingFee)}</p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Địa chỉ giao hàng</p>
            <p className="mt-2 font-semibold text-gray-950">{fullOrder?.shippingAddress || 'Đang tải...'}</p>
          </div>

          <div className={`mt-4 rounded-lg border p-4 ${
            request.resolution === 'REFUND'
              ? 'border-teal-200 bg-teal-50'
              : 'border-indigo-200 bg-indigo-50'
          }`}>
            <p className="text-xs font-semibold uppercase opacity-70">Phương án khách hàng yêu cầu</p>
            <p className="mt-2 flex items-center gap-2 font-bold">
              <Icon name={request.resolution === 'REFUND' ? 'payments' : 'local_shipping'} />
              {request.resolution === 'REFUND'
                ? 'Hoàn tiền'
                : request.claimType === 'MISSING_ITEM' ? 'Giao bù hàng thiếu' : 'Giao lại sản phẩm đúng'}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Lý do khiếu nại</p>
            <p className="mt-2 font-bold text-rose-600">{request.reason}</p>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{request.description}</p>
          </div>

          {request.returnTrackingCode && (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700 flex items-center gap-1.5"><Icon name="local_shipping" className="text-base" /> Thông tin bưu kiện khách gửi trả</p>
              <div className="mt-2 text-sm text-emerald-900 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-emerald-700">Đơn vị vận chuyển:</span>
                  <p className="font-bold text-base mt-0.5">{request.returnCourier}</p>
                </div>
                <div>
                  <span className="text-emerald-700">Mã vận đơn:</span>
                  <p className="font-bold text-base mt-0.5">{request.returnTrackingCode}</p>
                </div>
              </div>
            </div>
          )}

          {request.returnShipmentError && (
            <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <Icon name="warning" className="mt-0.5 shrink-0 text-xl text-amber-600" />
              <div>
                <p className="text-sm font-semibold">Chưa tạo được vận đơn trả hàng</p>
                <p className="mt-1 text-sm">{request.returnShipmentError}</p>
              </div>
            </div>
          )}

          {request.items && request.items.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                <h3 className="font-semibold text-gray-950">
                  {request.claimType === 'MISSING_ITEM'
                    ? 'Sản phẩm bị giao thiếu'
                    : request.claimType === 'WRONG_ITEM'
                      ? 'Sản phẩm đáng lẽ khách phải nhận'
                      : 'Sản phẩm khách gửi trả'} ({request.items.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {request.items.map((item, index) => {
                  const img = resolveImageUrl(item.imageUrl)
                  return (
                    <div key={index} className="flex items-center gap-4 p-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {img ? (
                          <img src={img} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="inventory_2" className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-950">{item.productName}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Số lượng trả: <span className="font-bold text-gray-900">{item.quantity}</span> x {money(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-950">{money(item.subTotal)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {request.claimType === 'WRONG_ITEM' && request.wrongItems?.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-orange-200">
              <div className="border-b border-orange-200 bg-orange-50 px-4 py-3">
                <h3 className="font-semibold text-orange-950">Hàng thực tế khách nhận sai và gửi trả</h3>
              </div>
              <div className="divide-y divide-orange-100">
                {request.wrongItems.map((item, index) => (
                  <div key={`${item.productId}-${item.variantId}-${index}`} className="flex justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold text-gray-950">{item.productName}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.variantName || item.sku}</p>
                    </div>
                    <span className="font-bold text-orange-800">×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fullOrder?.items && fullOrder.items.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 opacity-70">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                <h3 className="font-semibold text-gray-950">Toàn bộ sản phẩm trong đơn gốc ({fullOrder.items.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {fullOrder.items.map((item, index) => {
                  const img = resolveImageUrl(item.imageUrl)
                  return (
                    <div key={index} className="flex items-center gap-4 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        {img ? (
                          <img src={img} alt={item.productName} className="h-full w-full object-cover" />
                        ) : (
                          <Icon name="inventory_2" className="text-gray-400 text-xs" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-950">{item.productName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          SL đã mua: <span className="font-bold text-gray-900">{item.quantity}</span> x {money(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="font-semibold text-gray-950 mb-3">Hình ảnh bằng chứng ({request.imageUrls?.length || 0})</h4>
            {request.imageUrls?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {request.imageUrls.map((url, idx) => (
                  <ProtectedImage
                    key={idx}
                    source={url}
                    preview
                    alt="Bằng chứng trả hàng"
                    className="aspect-square w-full cursor-pointer rounded-lg border border-gray-200 object-cover transition-colors hover:border-primary"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Không có hình ảnh đính kèm.</p>
            )}
          </div>

          {refundRequest && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Icon name="account_balance" className="text-xl" /> Thông tin nhận tiền hoàn
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-700">Ngân hàng</p>
                  <p className="font-bold text-blue-950 mt-1">{refundRequest.bankName}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Số tài khoản</p>
                  <p className="font-bold text-blue-950 mt-1">{refundRequest.accountNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Tên chủ tài khoản</p>
                  <p className="font-bold text-blue-950 mt-1 uppercase">{refundRequest.accountName}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Trạng thái hoàn tiền</p>
                  <p className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    refundRequest.status === 'COMPLETED' ? 'bg-teal-100 text-teal-700' :
                    refundRequest.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {refundRequest.status === 'COMPLETED' ? 'Đã hoàn tất' :
                     refundRequest.status === 'REJECTED' ? 'Bị từ chối' : 'Đang xử lý'}
                  </p>
                </div>
              </div>
              
              {refundRequest.status === 'PENDING' && (
                <div className="mt-5 pt-5 border-t border-blue-200/50 space-y-3">
                  <p className="text-sm font-semibold text-blue-900">Sau khi chuyển khoản, đính kèm biên lai (Tùy chọn):</p>
                  <input
                    value={receiptUrl}
                    onChange={e => setReceiptUrl(e.target.value)}
                    placeholder="Đường dẫn ảnh biên lai (URL)..."
                    className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleRejectRefund}
                      disabled={completing}
                      className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <Icon name="warning" className="text-base mr-1" />
                      Thông tin sai
                    </button>
                    <button
                      onClick={handleCompleteRefund}
                      disabled={completing}
                      className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {completing ? 'Đang xử lý...' : '✓ Đã hoàn tiền'}
                    </button>
                  </div>
                </div>
              )}

              {refundRequest.status === 'COMPLETED' && (
                <div className="mt-4 pt-4 border-t border-blue-200/50">
                  <p className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                    <Icon name="check_circle" className="text-base" /> Đã xác nhận hoàn tiền thành công
                  </p>
                  {refundRequest.receiptUrl && (
                    <div className="mt-2">
                      <ProtectedImage
                        source={refundRequest.receiptUrl}
                        preview
                        alt="Biên lai" 
                        className="h-32 cursor-pointer rounded border border-blue-200 transition-opacity hover:opacity-80"
                      />
                    </div>
                  )}
                </div>
              )}

              {refundRequest.status === 'REJECTED' && (
                <div className="mt-4 pt-4 border-t border-rose-200">
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <Icon name="warning" className="text-base" /> Thông tin ngân hàng bị đánh dấu không hợp lệ
                  </p>
                  <p className="text-xs text-rose-500 mt-1">Khách hàng cần cập nhật lại thông tin tài khoản.</p>
                </div>
              )}
            </div>
          )}

          {compensationOrder && (
            <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="flex items-center gap-2 font-bold text-indigo-950">
                    <Icon name="local_shipping" /> Đơn giao lại
                  </h4>
                  <p className="mt-1 text-sm text-indigo-700">
                    Trạng thái: <strong>{compensationOrder.status}</strong>
                  </p>
                </div>
                {compensationOrder.trackingCode && (
                  <div className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm">
                    <span className="text-indigo-600">Mã GHN</span>
                    <p className="font-bold text-indigo-950">{compensationOrder.trackingCode}</p>
                  </div>
                )}
              </div>
              {compensationOrder.failureReason && (
                <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {compensationOrder.failureReason}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {compensationOrder.status === 'PENDING' && (
                  <button
                    onClick={() => handleCompensationAction('reserve')}
                    disabled={completing}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Giữ tồn kho
                  </button>
                )}
                {['INVENTORY_RESERVED', 'READY_TO_SHIP'].includes(compensationOrder.status) && (
                  <button
                    onClick={() => handleCompensationAction('ship')}
                    disabled={completing}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Tạo vận đơn giao lại
                  </button>
                )}
                {compensationOrder.status === 'SHIPPING' && (
                  <button
                    onClick={() => handleCompensationAction('complete')}
                    disabled={completing}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Xác nhận đã giao thành công
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminReturnOrdersPage() {
  const { message } = AntApp.useApp()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [rejectingRequest, setRejectingRequest] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [hasReadReject, setHasReadReject] = useState(false)
  const [approvingRequest, setApprovingRequest] = useState(null)
  const [hasReadApprove, setHasReadApprove] = useState(false)
  const [inspectionFailRequest, setInspectionFailRequest] = useState(null)
  const [inspectionNote, setInspectionNote] = useState('')
  const [syncingGhn, setSyncingGhn] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 10

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true)
      const activeTabObj = TABS.find(t => t.key === filter) || TABS[0]
      const data = await httpClient.get(`/returns?page=${page}&size=${pageSize}&status=${activeTabObj.query}`)
      setReturns(data.content || [])
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error('Fetch returns failed:', err)
      message.error('Lỗi khi tải danh sách')
    } finally {
      setLoading(false)
    }
  }, [filter, message, page])

  const handleSyncGhn = async () => {
    try {
      setSyncingGhn(true)
      await httpClient.post('/returns/sync-ghn')
      message.success('Đồng bộ trạng thái từ GHN thành công')
      await fetchReturns()
    } catch (err) {
      console.error('GHN sync failed:', err)
      message.error(err.response?.data?.message || err?.message || 'Đồng bộ GHN thất bại')
    } finally {
      setSyncingGhn(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => void fetchReturns(), 0)
    return () => clearTimeout(timer)
  }, [fetchReturns])

  function changeFilter(status) {
    setFilter(status)
    setPage(0)
  }

  const handleStatusChange = async (req, newStatus, reason = null, inventoryDisposition = null, forceApprove = false, inspNote = null) => {
    if (newStatus === 'REJECTED' && !reason) {
      setRejectingRequest(req)
      setRejectReason('')
      setHasReadReject(false)
      return
    }
    if (newStatus === 'DELIVERING' && !forceApprove) {
      setApprovingRequest(req)
      setHasReadApprove(false)
      return
    }
    if (newStatus === 'INSPECTION_FAILED' && !inspNote) {
      setInspectionFailRequest(req)
      setInspectionNote('')
      return
    }

    try {
      setUpdating(req.id)
      await httpClient.put(`/returns/admin/${req.id}/status`, {
        status: newStatus,
        rejectReason: reason,
        inventoryDisposition,
        inspectionNote: inspNote,
      })
      message.success('Cập nhật trạng thái thành công')
      setRejectingRequest(null)
      setApprovingRequest(null)
      setInspectionFailRequest(null)
      fetchReturns()
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật')
    } finally {
      setUpdating(null)
    }
  }

  const handleResolve = async (req, resolutionType, note = null) => {
    try {
      setUpdating(req.id)
      await httpClient.post(`/returns/admin/${req.id}/resolve`, { resolution: resolutionType, note })
      message.success(resolutionType === 'REFUND' ? 'Đã chọn hoàn tiền cho khách' : 'Đã tạo đơn giao bù hàng')
      fetchReturns()
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setUpdating(null)
    }
  }

  const statusActions = (req) => {
    // MISSING_ITEM: không có hàng vật lý cần vận chuyển, bỏ qua bước DELIVERING
    const isMissingItem = req.claimType === 'MISSING_ITEM'

    const nextStatuses = req.status === 'PENDING'
      ? (isMissingItem ? ['REJECTED'] : ['DELIVERING', 'REJECTED'])
      : req.status === 'DELIVERED'
        ? ['RECEIVED', 'INSPECTION_FAILED']
        : req.status === 'DELIVERING' ? ['RECEIVED'] : []

    const actions = nextStatuses.flatMap(status => {
      if (status === 'DELIVERING') {
        return [{
          key: 'DELIVERING',
          label: (
            <div className="flex items-center gap-2 px-1">
              <Icon name="check_circle" className="text-[15px] text-emerald-700" />
              <span className="text-sm font-semibold">Duyệt &amp; Tạo đơn hoàn</span>
            </div>
          ),
          onClick: () => handleStatusChange(req, 'DELIVERING'),
        }]
      }
      if (status === 'RECEIVED') {
        return [
          {
            key: 'RECEIVED_RESTOCK',
            label: (
              <div className="flex items-center gap-2 px-1">
                <Icon name="inventory_2" className="text-[15px] text-emerald-700" />
                <span className="text-sm font-semibold">Nhận hàng và nhập lại kho</span>
              </div>
            ),
            onClick: () => handleStatusChange(req, 'RECEIVED', null, 'RESTOCK'),
          },
          {
            key: 'RECEIVED_DAMAGED',
            label: (
              <div className="flex items-center gap-2 px-1">
                <Icon name="report" className="text-[15px] text-rose-700" />
                <span className="text-sm font-semibold">Nhận hàng và đánh dấu hỏng</span>
              </div>
            ),
            onClick: () => handleStatusChange(req, 'RECEIVED', null, 'DAMAGED'),
          },
          {
            key: 'RECEIVED_DISCARD',
            label: (
              <div className="flex items-center gap-2 px-1">
                <Icon name="delete_forever" className="text-[15px] text-gray-500" />
                <span className="text-sm font-semibold">Nhận &amp; Hủy bỏ (Không phải hàng của shop)</span>
              </div>
            ),
            onClick: () => handleStatusChange(req, 'RECEIVED', null, 'DISCARD'),
          },
        ]
      }
      if (status === 'INSPECTION_FAILED') {
        return [{
          key: 'INSPECTION_FAILED',
          label: (
            <div className="flex items-center gap-2 px-1">
              <Icon name="gpp_bad" className="text-[15px] text-rose-700" />
              <span className="text-sm font-semibold text-rose-700">Từ chối - Hàng trả không đúng</span>
            </div>
          ),
          onClick: () => handleStatusChange(req, 'INSPECTION_FAILED'),
        }]
      }
      return [{
        key: status,
        label: (
          <div className="flex items-center gap-2 px-1">
            <Icon name={RETURN_STATUS[status].icon} className={`text-[15px] ${RETURN_STATUS[status].tone.split(' ')[1]}`} />
            <span className="text-sm font-semibold">
              {status === 'APPROVED' ? 'Duyệt đơn' : RETURN_STATUS[status].label}
            </span>
          </div>
        ),
        onClick: () => handleStatusChange(req, status),
      }]
    })

    // Giao thiếu không thu hồi hàng: duyệt đúng phương án khách đã chọn.
    if (req.status === 'RECEIVED' && !req.resolution) {
      actions.push(
        { type: 'divider' },
        {
          key: 'LEGACY_REFUND',
          label: 'Dữ liệu cũ: chọn hoàn tiền',
          onClick: () => handleResolve(req, 'REFUND'),
        },
        {
          key: 'LEGACY_REDELIVER',
          label: 'Dữ liệu cũ: chọn giao lại',
          onClick: () => handleResolve(req, 'REDELIVER'),
        },
      )
    }
    if (req.status === 'PENDING' && isMissingItem && !req.resolution) {
      actions.unshift(
        {
          key: 'LEGACY_MISSING_REFUND',
          label: 'Dữ liệu cũ: duyệt hoàn tiền',
          onClick: () => handleResolve(req, 'REFUND'),
        },
        {
          key: 'LEGACY_MISSING_REDELIVER',
          label: 'Dữ liệu cũ: duyệt giao bù',
          onClick: () => handleResolve(req, 'REDELIVER'),
        },
        { type: 'divider' },
      )
    } else if (req.status === 'PENDING' && isMissingItem) {
      actions.unshift(
        {
          key: 'APPROVE_MISSING_RESOLUTION',
          label: (
            <div className="flex items-center gap-2 px-1">
              <Icon name={req.resolution === 'REFUND' ? 'payments' : 'local_shipping'} className="text-[15px] text-teal-700" />
              <span className="text-sm font-semibold">
                {req.resolution === 'REFUND' ? 'Duyệt để hoàn tiền' : 'Duyệt để giao bù hàng thiếu'}
              </span>
            </div>
          ),
          onClick: () => handleResolve(req, req.resolution),
        },
        { type: 'divider' },
      )
    }

    return actions
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Quản lý kinh doanh</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Đơn khiếu nại / Trả hàng</h1>
          <p className="mt-2 text-sm text-gray-500">
            Theo dõi, lọc và cập nhật trạng thái các yêu cầu đổi trả, hoàn tiền.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSyncGhn}
            disabled={syncingGhn}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:cursor-wait disabled:opacity-50 sm:flex-none"
          >
            <Icon name="sync" className={syncingGhn ? 'animate-spin text-lg' : 'text-lg'} />
            Đồng bộ GHN
          </button>
          <button
            type="button"
            onClick={fetchReturns}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-50 sm:flex-none"
          >
            <Icon name="refresh" className={loading ? 'animate-spin text-lg' : 'text-lg'} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeFilter(tab.key)}
              aria-pressed={filter === tab.key}
              className={[
                'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all',
                filter === tab.key 
                  ? `${tab.tone} shadow-sm ring-1 ring-current` 
                  : 'border-transparent text-gray-500 hover:bg-gray-50',
              ].join(' ')}
            >
              <Icon name={tab.icon} className={`text-lg ${filter === tab.key ? '' : 'opacity-60'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading && returns.length === 0 ? (
          <div className="flex h-80 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : returns.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center text-gray-400">
            <Icon name="inbox" className="text-5xl" />
            <p className="mt-3 text-sm">Không tìm thấy đơn khiếu nại nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Đơn hàng</th>
                  <th className="px-5 py-3">Khách hàng</th>
                  <th className="px-5 py-3 max-w-[200px]">Lý do</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  {filter === 'REFUND' && <th className="px-5 py-3">Đơn hoàn tiền</th>}
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 align-top">
                      <Link to={`/admin/orders`} className="font-bold text-primary hover:underline">{req.orderCode}</Link>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(req.createdAt)}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-gray-950">{req.customerName}</p>
                    </td>
                    <td className="px-5 py-4 align-top max-w-[200px]">
                      <p className="truncate text-gray-950 font-medium">{req.reason}</p>
                      <p className="truncate text-gray-500 text-xs mt-1">{req.description}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      {updating === req.id ? (
                        <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
                          <Icon name="sync" className="animate-spin text-lg" />
                          Đang lưu
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Dropdown
                            menu={{
                              items: statusActions(req)
                            }}
                            trigger={['click']}
                            disabled={['REFUNDED', 'REJECTED', 'INSPECTION_FAILED', 'REFUND_PENDING', 'REDELIVERY_PENDING', 'REDELIVERING', 'RESOLVED'].includes(req.status)}
                          >
                            <button 
                              className={`inline-flex items-center justify-between min-w-36 gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${!['REFUNDED', 'REJECTED', 'INSPECTION_FAILED', 'REFUND_PENDING', 'REDELIVERY_PENDING', 'REDELIVERING', 'RESOLVED'].includes(req.status) ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${RETURN_STATUS[req.status]?.tone || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Icon name={RETURN_STATUS[req.status]?.icon || 'info'} className="text-[15px]" />
                                {RETURN_STATUS[req.status]?.label || req.status}
                              </div>
                              {!['REFUNDED', 'REJECTED', 'INSPECTION_FAILED', 'REFUND_PENDING', 'REDELIVERY_PENDING', 'REDELIVERING', 'RESOLVED'].includes(req.status) && (
                                <Icon name="expand_more" className="text-lg opacity-60" />
                              )}
                            </button>
                          </Dropdown>
                          {['DELIVERING', 'DELIVERED'].includes(req.status) && req.returnTrackingCode && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 ml-1 mt-1">
                              <Icon name="sync" className="text-[14px]" /> 
                              GHN tự động cập nhật
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    {filter === 'REFUND' && (
                      <td className="px-5 py-4 align-top">
                        <RefundStatusCell returnId={req.id} />
                      </td>
                    )}
                    <td className="px-5 py-4 text-right align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-950"
                        title="Xem chi tiết"
                      >
                        <Icon name="visibility" className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Trang <span className="font-bold text-gray-950">{page + 1}</span> / {totalPages}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="chevron_left" className="text-base" />
              Trước
            </button>
            {getVisiblePages(page + 1, totalPages).map((item, index) =>
              item === '...' ? (
                <span key={`dots-${index}`} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item - 1)}
                  aria-current={item === page + 1 ? 'page' : undefined}
                  aria-label={`Trang ${item}`}
                  className={[
                    'h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold',
                    item === page + 1
                      ? 'border-gray-950 bg-gray-950 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
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
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
              <Icon name="chevron_right" className="text-base" />
            </button>
          </div>
        </div>
      )}

      <ReturnDetailsModal 
        request={selectedRequest} 
        onClose={() => setSelectedRequest(null)} 
      />

      {/* Modal Nhập lý do từ chối */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setRejectingRequest(null)} aria-label="Đóng" />
          <div className="relative w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Icon name="warning" className="text-2xl" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-950">Từ chối yêu cầu khiếu nại</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Từ chối khiếu nại của đơn <span className="font-semibold text-gray-800">{rejectingRequest.orderCode}</span>?
            </p>
            
            <div className="mt-4 text-left">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Lý do từ chối <span className="text-rose-500">*</span></label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  'Hình ảnh bằng chứng không rõ ràng', 
                  'Lý do khiếu nại không hợp lệ', 
                  'Sản phẩm không thuộc diện hỗ trợ đổi trả', 
                  'Đã quá thời hạn đổi trả quy định'
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRejectReason(option)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      rejectReason === option 
                        ? 'border-gray-950 bg-gray-950 text-white' 
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-gray-950 focus:ring-1 focus:ring-gray-950"
                rows={3}
                placeholder="Hoặc nhập lý do chi tiết của bạn..."
              />
              <div className="mt-4 p-3 border border-amber-200 bg-amber-50 rounded-lg text-left">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={hasReadReject} 
                    onChange={e => setHasReadReject(e.target.checked)} 
                    className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-900 font-medium">Tôi xác nhận đã đọc và kiểm tra kỹ chi tiết khiếu nại này trước khi từ chối.</span>
                </label>
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(rejectingRequest, 'REJECTED', rejectReason)}
                  disabled={!rejectReason.trim() || !hasReadReject || updating === rejectingRequest.id}
                  className="flex-1 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating === rejectingRequest.id ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Duyệt */}
      {approvingRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setApprovingRequest(null)} aria-label="Đóng" />
          <div className="relative w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon name="check_circle" className="text-2xl" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-950">Duyệt & Tạo đơn hoàn</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Chấp nhận khiếu nại của đơn <span className="font-semibold text-gray-800">{approvingRequest.orderCode}</span> và tạo mã vận đơn để khách trả hàng?
            </p>
            
            <div className="mt-4 p-3 border border-amber-200 bg-amber-50 rounded-lg text-left">
              <label className="flex items-start gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hasReadApprove} 
                  onChange={e => setHasReadApprove(e.target.checked)} 
                  className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-amber-900 font-medium">Tôi xác nhận đã đọc và kiểm tra kỹ chi tiết khiếu nại này trước khi duyệt.</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                type="button"
                onClick={() => setApprovingRequest(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(approvingRequest, 'DELIVERING', null, null, true)}
                disabled={!hasReadApprove || updating === approvingRequest.id}
                className="flex-1 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating === approvingRequest.id ? 'Đang xử lý...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ghi chú từ chối sau kiểm tra (INSPECTION_FAILED) */}
      {inspectionFailRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45" onClick={() => setInspectionFailRequest(null)} aria-label="Đóng" />
          <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Icon name="gpp_bad" className="text-2xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-950">Từ chối sau kiểm tra</h3>
                <p className="text-xs text-gray-500 mt-0.5">{inspectionFailRequest.orderCode}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-800">
              <p className="font-semibold flex items-center gap-1.5">
                <Icon name="warning" className="text-base" /> Hàng trả về không đúng / không hợp lệ
              </p>
              <p className="mt-1 text-xs">Khách hàng sẽ không được hoàn tiền cho đơn này. Hãy ghi rõ lý do để lưu hồ sơ.</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ghi chú kiểm tra <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  'Hàng gửi về không phải hàng đã mua',
                  'Hàng bị cố tình phá hoại trước khi trả',
                  'Hàng đã qua sử dụng / không thể bán lại',
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setInspectionNote(option)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      inspectionNote === option
                        ? 'border-rose-700 bg-rose-700 text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <textarea
                value={inspectionNote}
                onChange={e => setInspectionNote(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                rows={3}
                placeholder="Mô tả vấn đề phát hiện khi kiểm tra hàng trả..."
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setInspectionFailRequest(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(inspectionFailRequest, 'INSPECTION_FAILED', null, null, false, inspectionNote)}
                disabled={!inspectionNote.trim() || updating === inspectionFailRequest.id}
                className="flex-1 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating === inspectionFailRequest.id ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
