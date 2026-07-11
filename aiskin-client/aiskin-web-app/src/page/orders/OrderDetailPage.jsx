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

const RETURN_STATUS_VN = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Chờ khách hàng trả hàng',
  READY_TO_PICK: 'Đang trả hàng',
  PICKING: 'Đang trả hàng',
  PICKED: 'Đang trả hàng',
  STORING: 'Đang trả hàng',
  TRANSPORTING: 'Đang trả hàng',
  SORTING: 'Đang trả hàng',
  DELIVERING: 'Đang trả hàng',
  DELIVERED: 'Đang trả hàng',
  RECEIVED: 'Hoàn tất trả hàng',
  REFUNDED: 'Hoàn tất trả hàng',
  REJECTED: 'Bị từ chối'
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

function RefundModal({ returnOrder, existingRefund, onClose, onSuccess }) {
  const [bankName, setBankName] = useState(existingRefund?.bankName || '')
  const [accountNumber, setAccountNumber] = useState(existingRefund?.accountNumber || '')
  const [accountName, setAccountName] = useState(existingRefund?.accountName || '')
  const [loading, setLoading] = useState(false)

  const isResubmit = !!existingRefund

  const handleSubmit = async () => {
    if (!bankName || !accountNumber || !accountName) {
      import('antd').then(({ message }) => message.error('Vui lòng điền đầy đủ thông tin'))
      return
    }
    setLoading(true)
    try {
      if (isResubmit) {
        await httpClient.put(`/refunds/${existingRefund.id}/resubmit`, { bankName, accountNumber, accountName })
        import('antd').then(({ message }) => message.success('Đã cập nhật lại thông tin ngân hàng thành công'))
      } else {
        await httpClient.post('/refunds', {
          returnOrderId: returnOrder.id,
          customerId: returnOrder.customerId,
          bankName,
          accountNumber,
          accountName
        })
        import('antd').then(({ message }) => message.success('Đã gửi thông tin nhận tiền hoàn thành công'))
      }
      onSuccess()
    } catch (error) {
      import('antd').then(({ message }) => message.error(error.response?.data?.message || 'Có lỗi xảy ra'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isResubmit ? 'Cập nhật lại thông tin ngân hàng' : 'Thông tin nhận tiền hoàn'}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ngân hàng (Ví dụ: Vietcombank, Techcombank) <span className="text-red-500">*</span></label>
            <input 
              value={bankName} onChange={e => setBankName(e.target.value)}
              placeholder="Nhập tên ngân hàng"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Số tài khoản / Số thẻ <span className="text-red-500">*</span></label>
            <input 
              value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
              placeholder="Nhập số tài khoản"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tên chủ tài khoản <span className="text-red-500">*</span></label>
            <input 
              value={accountName} onChange={e => setAccountName(e.target.value)}
              placeholder="Nhập tên chủ tài khoản (Viết hoa không dấu)"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : isResubmit ? 'Cập nhật lại' : 'Gửi yêu cầu'}
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
  const [returnRequest, setReturnRequest] = useState(null)
  const [refundRequest, setRefundRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmDeleteReturn, setConfirmDeleteReturn] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [showRefundModal, setShowRefundModal] = useState(false)

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await httpClient.get(`/orders/${id}`)
        setOrder(data)
        
        try {
          const returnData = await httpClient.get(`/returns/order/${id}`)
          setReturnRequest(returnData)
          
          if (returnData && (returnData.status === 'RECEIVED' || returnData.status === 'REFUNDED')) {
            try {
              const refundData = await httpClient.get(`/refunds/return-order/${returnData.id}`)
              setRefundRequest(refundData)
            } catch {
              // Ignore if no refund request exists yet
            }
          }
        } catch {
          // If 404, it means no return request, ignore
        }

      } catch {
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

      {/* Block Chi tiết Khiếu nại / Trả hàng (nếu có) */}
      {returnRequest && (
        <div className="mb-6 bg-white rounded-3xl shadow-sm border border-orange-200 overflow-hidden flex flex-col relative">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-bold text-title-md text-orange-700 flex items-center gap-2">
                <Icon name="gavel" className="text-orange-600" />
                Chi tiết Khiếu nại / Trả hàng
              </h3>
              {(returnRequest.status === 'PENDING' || returnRequest.status === 'REJECTED') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/orders/${id}/return?edit=true`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
                  >
                    <Icon name={returnRequest.status === 'REJECTED' ? 'replay' : 'edit'} className="text-base" /> 
                    {returnRequest.status === 'REJECTED' ? 'Khiếu nại lại' : 'Sửa'}
                  </button>
                  {returnRequest.status === 'PENDING' && (
                    <button
                      onClick={() => setConfirmDeleteReturn(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <Icon name="delete" className="text-base" /> Hủy khiếu nại
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-caption text-on-surface-variant mb-1">Trạng thái xử lý</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm border ${
                    returnRequest.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    ['READY_TO_PICK', 'PICKING', 'PICKED', 'STORING', 'TRANSPORTING', 'SORTING', 'DELIVERING', 'DELIVERED'].includes(returnRequest.status) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    ['RECEIVED', 'REFUNDED'].includes(returnRequest.status) ? 'bg-teal-50 text-teal-700 border-teal-200' :
                    returnRequest.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {RETURN_STATUS_VN[returnRequest.status] || returnRequest.status}
                  </div>
                </div>
                
                <div>
                  <p className="text-caption text-on-surface-variant mb-1">Lý do khiếu nại</p>
                  <p className="font-semibold text-body-md text-on-surface">{returnRequest.reason}</p>
                </div>
                
                <div>
                  <p className="text-caption text-on-surface-variant mb-1">Mô tả chi tiết</p>
                  <p className="text-body-md text-on-surface p-3 bg-surface-container-lowest border border-border-pink rounded-xl whitespace-pre-wrap">
                    {returnRequest.description}
                  </p>
                </div>

                {returnRequest.rejectReason && returnRequest.status === 'REJECTED' && (
                  <div>
                    <p className="text-caption text-rose-600 mb-1 font-semibold">Lý do từ chối từ Admin</p>
                    <p className="text-body-md text-rose-700 p-3 bg-rose-50 border border-rose-200 rounded-xl whitespace-pre-wrap">
                      {returnRequest.rejectReason}
                    </p>
                  </div>
                )}
                
                {returnRequest.imageUrls?.length > 0 && (
                  <div>
                    <p className="text-caption text-on-surface-variant mb-2">Hình ảnh đính kèm</p>
                    <div className="flex flex-wrap gap-2">
                      {returnRequest.imageUrls.map((img, idx) => (
                        <img 
                          key={idx} 
                          src={img.startsWith('http') ? img : `http://localhost:8080${img}`} 
                          alt="Bằng chứng" 
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                          onClick={() => window.open(img.startsWith('http') ? img : `http://localhost:8080${img}`, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-caption text-on-surface-variant mb-2">Sản phẩm yêu cầu trả</p>
                <div className="rounded-2xl border border-orange-100 overflow-hidden divide-y divide-orange-100">
                  {returnRequest.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-orange-50/30">
                      <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className="w-12 h-12 rounded object-cover border border-orange-100" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-gray-500">Đã chọn trả: <span className="font-bold text-orange-700">{item.quantity}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{money(item.subTotal)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-orange-50 flex justify-between items-center border-t border-orange-200">
                    <span className="font-semibold text-sm text-gray-700">Tổng tiền hoàn dự kiến:</span>
                    <span className="font-bold text-lg text-primary">{money(returnRequest.refundAmount)}</span>
                  </div>
                </div>

                {/* Phần Nhập thông tin hoàn tiền */}
                {returnRequest.status === 'RECEIVED' && !refundRequest && (
                  <div className="mt-4 bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-teal-800 flex items-center gap-2 mb-1">
                        <Icon name="account_balance" className="text-xl" /> Hàng đã về kho
                      </h4>
                      <p className="text-sm text-teal-700">SkinGuide đã nhận được hàng trả của bạn. Vui lòng cung cấp số tài khoản để chúng tôi tiến hành hoàn tiền.</p>
                    </div>
                    <button
                      onClick={() => setShowRefundModal(true)}
                      className="shrink-0 whitespace-nowrap bg-teal-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                    >
                      Nhập thông tin nhận tiền
                    </button>
                  </div>
                )}

                {refundRequest && (
                  <div className={`mt-4 rounded-2xl p-5 border ${
                    refundRequest.status === 'REJECTED'
                      ? 'bg-rose-50 border-rose-200'
                      : refundRequest.status === 'COMPLETED'
                        ? 'bg-teal-50 border-teal-200'
                        : 'bg-blue-50 border-blue-200'
                  }`}>
                    {/* Header block dựa theo status */}
                    {refundRequest.status === 'REJECTED' ? (
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h4 className="font-bold text-rose-800 flex items-center gap-2">
                            <Icon name="warning" className="text-xl" /> Thông tin tài khoản không hợp lệ
                          </h4>
                          <p className="text-sm text-rose-600 mt-1">SkinGuide không tìm thấy tài khoản bạn cung cấp. Vui lòng kiểm tra lại và cập nhật đúng số tài khoản.</p>
                        </div>
                        <button
                          onClick={() => setShowRefundModal(true)}
                          className="shrink-0 whitespace-nowrap bg-rose-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-rose-700 transition-colors text-sm shadow-sm"
                        >
                          Cập nhật lại
                        </button>
                      </div>
                    ) : refundRequest.status === 'COMPLETED' ? (
                      <h4 className="font-bold text-teal-800 flex items-center gap-2 mb-3">
                        <Icon name="check_circle" className="text-xl" /> Đã hoàn tiền
                      </h4>
                    ) : (
                      <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                        <Icon name="account_balance" className="text-xl" /> Thông tin nhận tiền hoàn
                      </h4>
                    )}

                    {/* Thông tin tài khoản */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className={`text-xs mb-1 ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-600' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-600' : 'text-blue-600'
                        }`}>Ngân hàng</p>
                        <p className={`font-semibold ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-900 line-through opacity-60' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-900' : 'text-blue-900'
                        }`}>{refundRequest.bankName}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-600' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-600' : 'text-blue-600'
                        }`}>Số tài khoản</p>
                        <p className={`font-semibold ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-900 line-through opacity-60' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-900' : 'text-blue-900'
                        }`}>{refundRequest.accountNumber}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-600' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-600' : 'text-blue-600'
                        }`}>Tên chủ thẻ</p>
                        <p className={`font-semibold uppercase ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-900 line-through opacity-60' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-900' : 'text-blue-900'
                        }`}>{refundRequest.accountName}</p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${
                          refundRequest.status === 'REJECTED' ? 'text-rose-600' :
                          refundRequest.status === 'COMPLETED' ? 'text-teal-600' : 'text-blue-600'
                        }`}>Trạng thái hoàn tiền</p>
                        <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          refundRequest.status === 'COMPLETED' ? 'bg-teal-100 text-teal-700' :
                          refundRequest.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {refundRequest.status === 'COMPLETED' ? 'Đã hoàn tất' :
                           refundRequest.status === 'REJECTED' ? 'Thông tin sai' : 'Đang xử lý'}
                        </p>
                      </div>
                    </div>
                    {refundRequest.receiptUrl && refundRequest.status === 'COMPLETED' && (
                      <div className="pt-3 border-t border-teal-200/50">
                        <p className="text-xs text-teal-600 mb-2">Biên lai chuyển khoản:</p>
                        <img 
                          src={refundRequest.receiptUrl.startsWith('http') ? refundRequest.receiptUrl : `http://localhost:8080${refundRequest.receiptUrl}`} 
                          alt="Biên lai" 
                          className="h-24 rounded cursor-pointer hover:opacity-80 transition-opacity border border-teal-200"
                          onClick={() => window.open(refundRequest.receiptUrl.startsWith('http') ? refundRequest.receiptUrl : `http://localhost:8080${refundRequest.receiptUrl}`, '_blank')}
                        />
                      </div>
                    )}
                    {refundRequest.status === 'COMPLETED' && (
                      <div className="mt-4 pt-4 border-t border-teal-200/50 flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <Icon name="support_agent" className="text-teal-700 text-base" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-teal-800">Chưa nhận được tiền hoàn?</p>
                          <p className="text-xs text-teal-700 mt-0.5">
                            Vui lòng chờ 1&ndash;3 ngày làm việc. Nếu vẫn chưa nhận được, liên hệ hotline:
                            {' '}<a href="tel:0987654321" className="font-bold text-teal-900 hover:underline">0987.654.321</a>
                            {' '}hoặc email <a href="mailto:support@aiskin.vn" className="font-bold text-teal-900 hover:underline">support@aiskin.vn</a>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {returnRequest.status === 'APPROVED' && (
              <div className="mt-6 pt-6 border-t border-orange-200">
                <h4 className="font-bold text-lg text-orange-800 mb-4 flex items-center gap-2">
                  <Icon name="local_shipping" /> Hướng dẫn gửi hàng hoàn trả
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100">
                    <p className="font-semibold text-orange-900 mb-3">Thông tin nhận hàng:</p>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li><strong>Người nhận:</strong> Kho SkinGuide</li>
                      <li><strong>Số điện thoại:</strong> 0987.654.321 (Hotline)</li>
                      <li><strong>Địa chỉ:</strong> Đại học FPT, TPHCM, Khu Công nghệ cao, TP. Thủ Đức</li>
                    </ul>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-1.5"><Icon name="info" className="text-base" /> Lưu ý quan trọng:</p>
                      <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                        <li>Bạn không cần mang ra bưu cục gửi. GHN sẽ đến tận nơi nhận.</li>
                        <li>Vui lòng ghi chú mã <strong>{order.orderCode}</strong> bên ngoài hộp kiện hàng.</li>
                        <li>Đóng gói cẩn thận để tránh hư hỏng.</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="font-semibold text-gray-900 mb-3">Thông tin vận chuyển thu hồi</p>
                    <p className="text-sm text-gray-500 mb-4">Hệ thống đã tự động tạo vận đơn thu hồi qua GHN. Shipper sẽ liên hệ bạn để lấy hàng tận nơi.</p>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">Đơn vị vận chuyển:</span>
                        <span className="font-bold text-blue-700">{returnRequest.returnCourier || 'GHN'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-blue-900">Mã vận đơn:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-blue-700 tracking-wider">
                            {returnRequest.returnTrackingCode || 'Đang tạo...'}
                          </span>
                          {returnRequest.returnTrackingCode && (
                            <a 
                              href={`https://tracking.ghn.dev/?order_code=${returnRequest.returnTrackingCode}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-500 hover:text-blue-700 transition"
                            >
                              <Icon name="open_in_new" className="text-lg" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <a 
                    href={`https://tracking.ghn.dev/?order_code=${order.trackingCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-blue-700 flex items-center gap-2 bg-blue-50 w-fit px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    title="Bấm để theo dõi đơn hàng trên GHN"
                  >
                    <Icon name="local_shipping" className="text-xl" />
                    {order.trackingCode}
                    <Icon name="open_in_new" className="text-sm ml-1" />
                  </a>
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
              
              {/* Nút trả hàng / Trạng thái khiếu nại */}
              {order.status === 'DELIVERED' && (
                <div className="w-full mt-4 flex flex-col gap-2">
                  {returnRequest ? (
                    <div className="px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex flex-col">
                      <span className="font-bold flex items-center gap-2 mb-1">
                        <Icon name="gavel" /> Đơn khiếu nại
                      </span>
                      <span className="text-sm">Trạng thái: <strong>{RETURN_STATUS_VN[returnRequest.status] || returnRequest.status}</strong></span>
                    </div>
                  ) : order.paymentStatus === 'PAID' ? (
                    <button
                      onClick={() => navigate(`/orders/${id}/return`)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-error text-white font-bold hover:bg-error/90 transition-colors shadow-sm"
                    >
                      <Icon name="keyboard_return" className="text-xl" />
                      Yêu cầu Khiếu nại / Trả hàng
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-low text-on-surface-variant font-bold border border-border-pink">
                      <Icon name="verified" className="text-xl text-primary" />
                      Đơn hàng hoàn tất
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hành trình đơn hàng */}
          <div className="mt-6 rounded-2xl border border-border-pink p-6 bg-white">
            <h3 className="font-bold text-title-md text-on-surface mb-6 flex items-center gap-2">
              <Icon name="route" className="text-primary" />
              Hành trình đơn hàng
            </h3>
            <div className="relative pl-4 border-l-2 border-primary/20 space-y-6">
              {(order.statusHistory?.length > 0
                ? [...order.statusHistory].reverse()
                : [{ status: order.status, note: order.cancelReason || 'Cập nhật trạng thái', createdAt: order.updatedAt || order.createdAt }]
              ).map((h, idx) => {
                const isLatest = idx === 0;
                const hConfig = getStatusLabel(h.status);
                return (
                  <div key={idx} className="relative">
                    {/* Dot */}
                    <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white ${isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-300'}`}></div>
                    
                    <div className="pl-4 -mt-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                        <span className={`font-bold text-body-md ${isLatest ? 'text-primary' : 'text-on-surface-variant'}`}>
                          {hConfig.label}
                        </span>
                        <span className="text-caption text-on-surface-variant font-medium">
                          {new Date(h.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {h.note && (
                        <p className={`text-body-sm mt-1 p-2.5 rounded-xl border ${isLatest ? 'bg-primary-light border-primary/20 text-on-surface' : 'bg-surface-container-lowest border-gray-100 text-gray-500'}`}>
                          {h.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {confirmDeleteReturn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setConfirmDeleteReturn(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl animate-slide-up">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Icon name="delete" className="text-3xl" />
            </div>
            <h3 className="mt-4 text-title-md font-bold text-gray-900">Hủy yêu cầu khiếu nại</h3>
            <p className="mt-2 text-sm text-gray-500">
              Bạn có chắc chắn muốn xóa/hủy bỏ yêu cầu khiếu nại này không? Hành động này không thể hoàn tác.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmDeleteReturn(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Đóng
              </button>
              <button 
                onClick={async () => {
                  try {
                    await httpClient.del(`/returns/${returnRequest.id}`)
                    import('antd').then(({ message }) => message.success('Đã hủy khiếu nại thành công'))
                    setConfirmDeleteReturn(false)
                    window.location.reload()
                  } catch (e) {
                    import('antd').then(({ message }) => message.error(e.response?.data?.message || 'Không thể hủy khiếu nại'))
                  }
                }} 
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Đồng ý hủy
              </button>
            </div>
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
      {showRefundModal && (
        <RefundModal 
          returnOrder={returnRequest}
          existingRefund={refundRequest?.status === 'REJECTED' ? refundRequest : null}
          onClose={() => setShowRefundModal(false)}
          onSuccess={() => {
            setShowRefundModal(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
