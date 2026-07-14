import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { App as AntApp, Dropdown } from 'antd'
import Icon from '@/components/common/Icon'
import httpClient from '@/api/httpClient'

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

const RETURN_STATUS = {
  PENDING: { label: 'Chờ duyệt', icon: 'schedule', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  APPROVED: { label: 'Chờ khách gửi hàng', icon: 'thumb_up', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  READY_TO_PICK: { label: 'Chờ lấy hàng', icon: 'inventory_2', tone: 'bg-purple-50 text-purple-700 border-purple-100' },
  PICKING: { label: 'Đang lấy hàng', icon: 'front_hand', tone: 'bg-purple-50 text-purple-700 border-purple-100' },
  PICKED: { label: 'Đã lấy hàng', icon: 'check_box', tone: 'bg-purple-50 text-purple-700 border-purple-100' },
  STORING: { label: 'Nhập kho', icon: 'store', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  TRANSPORTING: { label: 'Đang trung chuyển', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  SORTING: { label: 'Đang phân loại', icon: 'alt_route', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  DELIVERING: { label: 'Đang giao đến kho', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  DELIVERED: { label: 'Đã giao đến kho', icon: 'done_all', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
  RECEIVED: { label: 'Đã nhận hàng trả', icon: 'inventory_2', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  REFUNDED: { label: 'Đã hoàn tiền', icon: 'price_check', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
  REJECTED: { label: 'Từ chối', icon: 'block', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const TABS = [
  { key: 'PENDING', query: 'PENDING', label: 'Chờ duyệt', icon: 'schedule', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  { key: 'SHIPPING', query: 'APPROVED,READY_TO_PICK,PICKING,PICKED,STORING,TRANSPORTING,SORTING,DELIVERING,DELIVERED', label: 'Đang vận chuyển', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { key: 'RECEIVED', query: 'RECEIVED', label: 'Đã nhận trả', icon: 'inventory_2', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { key: 'REFUNDED', query: 'REFUNDED', label: 'Đã hoàn tiền', icon: 'price_check', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
  { key: 'REJECTED', query: 'REJECTED', label: 'Từ chối', icon: 'block', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
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
  const [fullOrder, setFullOrder] = useState(null)

  const [refundRequest, setRefundRequest] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState('')

  useEffect(() => {
    if (request?.orderId) {
      httpClient.get(`/orders/${request.orderId}`)
        .then(res => setFullOrder(res))
        .catch(err => console.error(err))
    }
    if (request?.id && (request.status === 'RECEIVED' || request.status === 'REFUNDED')) {
      httpClient.get(`/refunds/return-order/${request.id}`)
        .then(res => setRefundRequest(res))
        .catch(err => console.error(err))
    }
  }, [request])

  const handleCompleteRefund = async () => {
    setCompleting(true)
    try {
      await httpClient.put(`/refunds/admin/${refundRequest.id}/complete`, { receiptUrl })
      import('antd').then(({ message }) => message.success('Đã xác nhận hoàn tiền thành công'))
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      import('antd').then(({ message }) => message.error(err.response?.data?.message || 'Có lỗi xảy ra'))
    } finally {
      setCompleting(false)
    }
  }

  const handleRejectRefund = async () => {
    setCompleting(true)
    try {
      await httpClient.put(`/refunds/admin/${refundRequest.id}/reject`)
      import('antd').then(({ message }) => message.warning('Đã đánh dấu thông tin ngân hàng không hợp lệ'))
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      import('antd').then(({ message }) => message.error(err.response?.data?.message || 'Có lỗi xảy ra'))
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
            <p className="mt-1 text-sm text-gray-500">{formatDate(request.createdAt)}</p>
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

          {request.items && request.items.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                <h3 className="font-semibold text-gray-950">Sản phẩm yêu cầu trả ({request.items.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {request.items.map((item, index) => {
                  const img = item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:8080${item.imageUrl}`
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

          {fullOrder?.items && fullOrder.items.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 opacity-70">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                <h3 className="font-semibold text-gray-950">Toàn bộ sản phẩm trong đơn gốc ({fullOrder.items.length})</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {fullOrder.items.map((item, index) => {
                  const img = item.imageUrl?.startsWith('http') ? item.imageUrl : `http://localhost:8080${item.imageUrl}`
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
                  <a key={idx} href={url.startsWith('http') ? url : `http://localhost:8080${url}`} target="_blank" rel="noreferrer" className="aspect-square rounded-lg border border-gray-200 overflow-hidden hover:border-primary transition-colors block">
                    <img src={url.startsWith('http') ? url : `http://localhost:8080${url}`} alt="proof" className="w-full h-full object-cover" />
                  </a>
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
                    <a href={refundRequest.receiptUrl.startsWith('http') ? refundRequest.receiptUrl : `http://localhost:8080${refundRequest.receiptUrl}`} target="_blank" rel="noreferrer" className="mt-2 block">
                      <img 
                        src={refundRequest.receiptUrl.startsWith('http') ? refundRequest.receiptUrl : `http://localhost:8080${refundRequest.receiptUrl}`} 
                        alt="Biên lai" 
                        className="h-32 rounded border border-blue-200 hover:opacity-80 transition-opacity"
                      />
                    </a>
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

  const handleStatusChange = async (req, newStatus, reason = null, inventoryDisposition = null) => {
    if (newStatus === 'REJECTED' && !reason) {
      setRejectingRequest(req)
      setRejectReason('')
      return
    }

    try {
      setUpdating(req.id)
      await httpClient.put(`/returns/admin/${req.id}/status`, {
        status: newStatus,
        rejectReason: reason,
        inventoryDisposition,
      })
      message.success('Cập nhật trạng thái thành công')
      setRejectingRequest(null)
      fetchReturns()
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật')
    } finally {
      setUpdating(null)
    }
  }

  const statusActions = (req) => {
    const nextStatuses = req.status === 'PENDING'
      ? ['APPROVED', 'REJECTED']
      : ['APPROVED', 'DELIVERED'].includes(req.status) ? ['RECEIVED'] : []

    return nextStatuses.flatMap(status => {
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
        ]
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncGhn}
            disabled={syncingGhn}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
          >
            <Icon name="sync" className={syncingGhn ? 'animate-spin text-lg' : 'text-lg'} />
            Đồng bộ GHN
          </button>
          <button
            type="button"
            onClick={fetchReturns}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
                  {filter === 'RECEIVED' && <th className="px-5 py-3">Đơn hoàn tiền</th>}
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
                            disabled={['REFUNDED', 'REJECTED', 'RECEIVED', 'READY_TO_PICK', 'PICKING', 'PICKED', 'STORING', 'TRANSPORTING', 'SORTING', 'DELIVERING'].includes(req.status)}
                          >
                            <button 
                              className={`inline-flex items-center justify-between min-w-36 gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${!['REFUNDED', 'REJECTED', 'RECEIVED', 'READY_TO_PICK', 'PICKING', 'PICKED', 'STORING', 'TRANSPORTING', 'SORTING', 'DELIVERING'].includes(req.status) ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} ${RETURN_STATUS[req.status]?.tone || 'bg-gray-100 text-gray-700 border-gray-200'}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Icon name={RETURN_STATUS[req.status]?.icon || 'info'} className="text-[15px]" />
                                {RETURN_STATUS[req.status]?.label || req.status}
                              </div>
                              {!['REFUNDED', 'REJECTED', 'RECEIVED', 'READY_TO_PICK', 'PICKING', 'PICKED', 'STORING', 'TRANSPORTING', 'SORTING', 'DELIVERING'].includes(req.status) && (
                                <Icon name="expand_more" className="text-lg opacity-60" />
                              )}
                            </button>
                          </Dropdown>
                          {['READY_TO_PICK', 'PICKING', 'PICKED', 'STORING', 'TRANSPORTING', 'SORTING', 'DELIVERING', 'DELIVERED'].includes(req.status) && req.returnTrackingCode && (
                            <p className="text-xs text-blue-600 flex items-center gap-1 ml-1 mt-1">
                              <Icon name="sync" className="text-[14px]" /> 
                              GHN tự động cập nhật
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    {filter === 'RECEIVED' && (
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
                disabled={!rejectReason.trim() || updating === rejectingRequest.id}
                className="flex-1 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating === rejectingRequest.id ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
