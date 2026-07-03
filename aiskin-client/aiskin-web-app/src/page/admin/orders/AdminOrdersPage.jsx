import { useEffect, useMemo, useState } from 'react'
import { App as AntApp } from 'antd'
import Icon from '@/components/common/Icon'
import httpClient from '@/api/httpClient'
import { resolveImageUrl } from '@/page/products/productUtils'

const STATUS = {
  ALL: { label: 'Tất cả', icon: 'apps' },
  PENDING: { label: 'Chờ thanh toán', icon: 'schedule', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  PAID: { label: 'Đã thanh toán', icon: 'check_circle', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  PROCESSING: { label: 'Đang xử lý', icon: 'inventory_2', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  SHIPPED: { label: 'Đang giao', icon: 'local_shipping', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  DELIVERED: { label: 'Đã giao', icon: 'done_all', tone: 'bg-green-50 text-green-700 border-green-100' },
  CANCELLED: { label: 'Đã hủy', icon: 'cancel', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const STATUS_OPTIONS = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

function money(value) {
  if (value === null || value === undefined) return '0đ'
  return `${Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`
}

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu'
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function StatusBadge({ status }) {
  const config = STATUS[status] || { label: status, icon: 'info', tone: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.tone}`}>
      <Icon name={config.icon} className="text-[15px]" />
      {config.label}
    </span>
  )
}

function PaymentBadge({ status }) {
  const paid = status === 'PAID'
  const failed = status === 'FAILED' || status === 'REFUNDED'
  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
        paid ? 'bg-emerald-50 text-emerald-700' : failed ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
      ].join(' ')}
    >
      {status || 'UNPAID'}
    </span>
  )
}

function OrderDetailModal({ order, onClose }) {
  if (!order) return null
  const items = order.items || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Đóng" />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-primary">{order.orderCode}</p>
            <h2 className="mt-1 text-xl font-bold text-gray-950">Chi tiết đơn hàng</h2>
            <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt)}</p>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Khách hàng</p>
              <p className="mt-2 font-semibold text-gray-950">{order.customerName || 'Khách hàng'}</p>
              <p className="mt-1 text-sm text-gray-500">{order.customerPhone || 'Chưa có SĐT'}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Trạng thái</p>
              <div className="mt-2">
                <StatusBadge status={order.status} />
              </div>
              {order.status === 'CANCELLED' && (
                <p className="mt-2 text-xs text-rose-600">Đơn đã hủy, không thể đổi trạng thái.</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase text-gray-400">Thanh toán</p>
              <p className="mt-2 font-semibold text-gray-950">{order.paymentMethod || 'COD'}</p>
              <div className="mt-1">
                <PaymentBadge status={order.paymentStatus} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase text-gray-400">Địa chỉ giao hàng</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">{order.shippingAddress || 'Chưa có địa chỉ'}</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h3 className="font-semibold text-gray-950">Sản phẩm ({items.length})</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item, index) => {
                const imageUrl = resolveImageUrl(item.imageUrl)
                return (
                  <div key={`${item.productId || item.productName}-${index}`} className="flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.productName} className="h-full w-full object-cover" />
                      ) : (
                        <Icon name="inventory_2" className="text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-950">{item.productName}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.quantity} x {money(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-950">{money(item.subTotal)}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-4">
              <span className="font-semibold text-gray-700">Tổng cộng</span>
              <span className="text-xl font-bold text-gray-950">{money(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmUpdateModal({ change, onClose, onConfirm }) {
  if (!change) return null
  const config = STATUS[change.newStatus]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Icon name="warning" className="text-2xl" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-950">Xác nhận đổi trạng thái</h3>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Chuyển đơn <span className="font-semibold text-gray-800">{change.orderCode}</span> sang trạng thái{' '}
          <span className="font-semibold text-gray-950">{config?.label || change.newStatus}</span>?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminOrdersPage() {
  const { message } = AntApp.useApp()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [confirmUpdate, setConfirmUpdate] = useState(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const pageSize = 10

  async function fetchOrders() {
    setLoading(true)
    try {
      const data = await httpClient.get(`/orders?page=${page}&size=${pageSize}&status=${filter}`)
      setOrders(data.content || [])
      setTotalPages(data.totalPages || 1)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      console.error('Fetch orders failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [page, filter])



  function changeFilter(status) {
    setFilter(status)
    setPage(0)
  }

  function handleStatusChange(order, newStatus) {
    if (order.status === 'CANCELLED' && newStatus !== 'CANCELLED') return
    if (order.status === newStatus) return
    setConfirmUpdate({ orderId: order.id, orderCode: order.orderCode, newStatus })
  }

  async function executeUpdateStatus() {
    if (!confirmUpdate) return
    const { orderId, newStatus } = confirmUpdate
    setConfirmUpdate(null)
    setUpdating(orderId)
    try {
      await httpClient.put(`/orders/${orderId}/status`, { status: newStatus })
      await fetchOrders()
    } catch (err) {
      console.error('Update order status failed:', err)
      message.error(err?.message || 'Cập nhật trạng thái thất bại')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Quản lý kinh doanh</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Đơn hàng</h1>
          <p className="mt-2 text-sm text-gray-500">
            Theo dõi, lọc và cập nhật trạng thái xử lý đơn hàng. Đơn đã hủy sẽ bị khóa trạng thái.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Icon name="refresh" className={loading ? 'animate-spin text-lg' : 'text-lg'} />
          Làm mới
        </button>
      </div>



      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-2">
          {Object.entries(STATUS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              className={[
                'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                filter === key ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950',
              ].join(' ')}
            >
              <Icon name={config.icon} className="text-lg" />
              {config.label}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading && orders.length === 0 ? (
          <div className="flex h-80 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-80 flex-col items-center justify-center text-gray-400">
            <Icon name="inbox" className="text-5xl" />
            <p className="mt-3 text-sm">Không tìm thấy đơn hàng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Đơn hàng</th>
                  <th className="px-5 py-3">Khách hàng</th>
                  <th className="px-5 py-3">Thanh toán</th>
                  <th className="px-5 py-3 text-right">Tổng tiền</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const locked = order.status === 'CANCELLED'
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 align-top">
                        <p className="font-bold text-primary">{order.orderCode}</p>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-gray-950">{order.customerName || 'Khách hàng'}</p>
                        <p className="mt-1 text-xs text-gray-500">{order.customerPhone || 'Chưa có SĐT'}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="mb-2 text-xs font-semibold text-gray-500">{order.paymentMethod || 'COD'}</p>
                        <PaymentBadge status={order.paymentStatus} />
                      </td>
                      <td className="px-5 py-4 text-right align-top font-bold text-gray-950">{money(order.totalAmount)}</td>
                      <td className="px-5 py-4 align-top">
                        {updating === order.id ? (
                          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
                            <Icon name="sync" className="animate-spin text-lg" />
                            Đang lưu
                          </div>
                        ) : locked ? (
                          <div className="space-y-1">
                            <StatusBadge status="CANCELLED" />
                            <p className="text-xs text-rose-600">Đã khóa</p>
                          </div>
                        ) : (
                          <select
                            value={order.status}
                            onChange={(event) => handleStatusChange(order, event.target.value)}
                            className="h-10 min-w-44 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus:border-secondary"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {STATUS[status].label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right align-top">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-950"
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

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <ConfirmUpdateModal
        change={confirmUpdate}
        onClose={() => setConfirmUpdate(null)}
        onConfirm={executeUpdateStatus}
      />
    </div>
  )
}
