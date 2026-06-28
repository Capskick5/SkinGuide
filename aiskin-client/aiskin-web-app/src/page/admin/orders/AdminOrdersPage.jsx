import { useEffect, useState } from 'react'
import Icon from '@/components/common/Icon'
import httpClient from '@/api/httpClient'
import { resolveImageUrl } from '@/page/products/productUtils'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

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

function getStatusLabel(status) {
  const map = {
    PENDING: { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50', icon: 'schedule' },
    PAID: { label: 'Đã thanh toán', color: 'text-emerald-600 bg-emerald-50', icon: 'check_circle' },
    PROCESSING: { label: 'Đang xử lý', color: 'text-blue-600 bg-blue-50', icon: 'inventory_2' },
    SHIPPED: { label: 'Đang giao hàng', color: 'text-purple-600 bg-purple-50', icon: 'local_shipping' },
    DELIVERED: { label: 'Đã giao hàng', color: 'text-green-600 bg-green-50', icon: 'done_all' },
    CANCELLED: { label: 'Đã hủy', color: 'text-error bg-error/10', icon: 'cancel' }
  }
  return map[status] || { label: status, color: 'text-gray-600 bg-gray-100', icon: 'info' }
}

function OrderDetailModal({ order, onClose }) {
  if (!order) return null
  const statusConfig = getStatusLabel(order.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 rounded-t-3xl bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Chi tiết đơn hàng</h2>
            <p className="text-sm text-gray-500 mt-1">Mã đơn: <span className="font-semibold text-primary">{order.orderCode}</span></p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-error hover:border-error transition-colors"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Trạng thái & Ngày */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Ngày đặt hàng</p>
              <p className="font-semibold text-gray-800">
                {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${statusConfig.color}`}>
              <Icon name={statusConfig.icon} className="text-lg" />
              {statusConfig.label}
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Icon name="inventory_2" className="text-primary" />
              Sản phẩm ({order.items.length})
            </h3>
            <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {order.items.map((item, idx) => {
                const img = resolveImageUrl(item.imageUrl)
                return (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50/50 transition-colors">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                      {img ? (
                        <img src={img} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="science" className="text-gray-400 text-2xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Số lượng: {item.quantity} - Đơn giá: {money(item.unitPrice)}
                      </p>
                    </div>
                    <div className="font-bold text-gray-800 whitespace-nowrap pl-2">
                      {money(item.subTotal)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Thông tin Giao hàng & Thanh toán */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-100 p-5 bg-white shadow-sm">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="local_shipping" className="text-primary text-lg" />
                Thông tin giao hàng
              </h3>
              <p className="font-semibold text-sm text-gray-800">{order.customerName}</p>
              <p className="text-xs text-gray-500 mt-1">{order.customerPhone}</p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{order.shippingAddress}</p>
            </div>

            <div className="rounded-2xl border border-gray-100 p-5 bg-white shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                <Icon name="payments" className="text-primary text-lg" />
                Thông tin thanh toán
              </h3>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="text-gray-500">Phương thức</span>
                <span className="text-gray-800">{order.paymentMethod === 'MOMO' ? 'Ví MoMo' : 'Tiền mặt (COD)'}</span>
              </div>
              <div className="flex justify-between text-sm font-medium mb-3 border-b border-gray-100 pb-3">
                <span className="text-gray-500">Trạng thái TT</span>
                <span className={order.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}>
                  {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : (order.paymentStatus === 'FAILED' ? 'Thất bại' : 'Chưa thanh toán')}
                </span>
              </div>
              <div className="flex justify-between items-end mt-auto pt-1">
                <span className="text-gray-800 font-bold">Tổng cộng</span>
                <span className="text-xl font-bold text-primary">{money(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmUpdateModal({ isOpen, onClose, onConfirm, newStatus }) {
  if (!isOpen) return null

  const statusConfig = getStatusLabel(newStatus)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center animate-slide-up border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-500">
          <Icon name="warning" className="text-3xl" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Xác nhận thay đổi?</h3>
        <p className="text-sm text-gray-500 mb-6">
          Bạn có chắc chắn muốn đổi trạng thái đơn hàng này thành 
          <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ml-1 ${statusConfig.color}`}>
            {statusConfig.label}
          </span> không?
        </p>
        <div className="flex items-center gap-3 w-full">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-ambient-pink"
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [confirmUpdate, setConfirmUpdate] = useState(null)
  
  // Pagination state
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const pageSize = 10

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await httpClient.get(`/orders?page=${page}&size=${pageSize}&status=${filter}`)
      setOrders(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [page, filter])

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    setPage(0) // Reset to page 1
  }

  const handleSelectChange = (orderId, newStatus) => {
    setConfirmUpdate({ orderId, newStatus })
  }

  const executeUpdateStatus = async () => {
    if (!confirmUpdate) return
    const { orderId, newStatus } = confirmUpdate
    setConfirmUpdate(null)
    setUpdating(orderId)
    try {
      await httpClient.put(`/orders/${orderId}/status`, { status: newStatus })
      fetchOrders()
    } catch (err) {
      console.error(err)
      alert('Cập nhật thất bại')
    } finally {
      setUpdating(null)
    }
  }

  const tabs = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'PENDING', label: 'Chờ thanh toán' },
    { id: 'PAID', label: 'Đã thanh toán' },
    { id: 'PROCESSING', label: 'Đang xử lý' },
    { id: 'SHIPPED', label: 'Đang giao' },
    { id: 'DELIVERED', label: 'Đã giao' },
    { id: 'CANCELLED', label: 'Đã hủy' },
  ]

  const statusOptions = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Xem và cập nhật trạng thái các đơn đặt hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-pink-50 text-primary rounded-xl font-semibold text-sm flex items-center gap-2">
            <Icon name="receipt_long" />
            Tổng: {totalElements} đơn
          </div>
          <button 
            onClick={fetchOrders}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-primary transition-colors"
            title="Làm mới"
          >
            <Icon name="refresh" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Icon name="hourglass_empty" className="text-4xl text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Icon name="inbox" className="text-5xl mb-3 text-gray-300" />
            <p>Không tìm thấy đơn hàng nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Mã đơn & Thời gian</th>
                  <th className="px-6 py-4 font-semibold">Khách hàng</th>
                  <th className="px-6 py-4 font-semibold">Tổng tiền</th>
                  <th className="px-6 py-4 font-semibold">Thanh toán</th>
                  <th className="px-6 py-4 font-semibold w-48">Trạng thái</th>
                  <th className="px-6 py-4 font-semibold text-right w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(order => {
                  const statusConfig = getStatusLabel(order.status)
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-primary">{order.orderCode}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Icon name="schedule" className="text-[14px]" />
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-semibold text-gray-800">{order.customerName}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.customerPhone}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-gray-800">{money(order.totalAmount)}</div>
                        <div className="text-xs text-gray-500 mt-1">{order.paymentMethod}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 
                          order.paymentStatus === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {updating === order.id ? (
                          <div className="flex items-center gap-2 text-primary">
                            <Icon name="sync" className="animate-spin" /> Đang lưu...
                          </div>
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleSelectChange(order.id, e.target.value)}
                            className={`w-full text-xs font-bold py-1.5 px-2 rounded-lg border outline-none cursor-pointer ${statusConfig.color}`}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt} value={opt} className="text-gray-800 bg-white">
                                {getStatusLabel(opt).label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                          title="Xem chi tiết"
                        >
                          <Icon name="visibility" className="text-lg" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
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

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmUpdateModal 
        isOpen={!!confirmUpdate}
        newStatus={confirmUpdate?.newStatus}
        onClose={() => setConfirmUpdate(null)}
        onConfirm={executeUpdateStatus}
      />
    </div>
  )
}
