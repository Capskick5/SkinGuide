import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import httpClient from '@/api/httpClient'
import { message } from 'antd'
import { QRCodeSVG } from 'qrcode.react'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

export default function BankTransferPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const simulationEnabled = import.meta.env.VITE_BANK_TRANSFER_SIMULATION_ENABLED === 'true'

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await httpClient.get(`/orders/${id}`)
        setOrder(data)
        if (data.paymentMethod !== 'BANK_TRANSFER') {
          message.warning('Đơn hàng không sử dụng hình thức chuyển khoản')
          navigate(`/orders/${data.id}`)
        } else if (data.paymentStatus === 'PAID') {
          message.success('Đơn hàng đã được thanh toán')
          navigate(`/orders/${data.id}`)
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

  const handleSimulatePayment = async () => {
    setSimulating(true)
    try {
      // Fake a small delay to simulate bank check
      message.loading({ content: 'Hệ thống đang kiểm tra giao dịch...', key: 'checking' })
      await new Promise(resolve => setTimeout(resolve, 2500))

      // The API endpoint uses the order code or ID.
      await httpClient.post(`/orders/${id}/payment/simulate-bank-transfer`)
      
      message.success({ content: 'Đã xác nhận thanh toán thành công!', key: 'checking', duration: 3 })
      navigate('/orders', { state: { orderCode: id, success: true } })
    } catch (err) {
      message.error({ content: err?.response?.data?.message || 'Chưa tìm thấy giao dịch. Vui lòng thử lại.', key: 'checking', duration: 3 })
    } finally {
      setSimulating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Icon name="hourglass_empty" className="animate-spin text-4xl text-primary" />
        <p className="font-semibold text-on-surface-variant">Đang tải thông tin đơn hàng...</p>
      </div>
    )
  }

  if (!order) return null

  const qrValue = `PAYMENT:${order.orderCode}`

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="text-headline-md font-bold text-on-surface">Chuyển khoản ngân hàng</h1>
        <p className="text-body-md text-on-surface-variant">Vui lòng hoàn tất thanh toán để chúng tôi xử lý đơn hàng của bạn.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-pink bg-white shadow-sm">
        <div className="bg-primary-light px-6 py-4">
          <p className="font-bold text-on-surface">Mã đơn hàng: <span className="text-primary">{order.orderCode}</span></p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant mb-1">Số tiền cần thanh toán</p>
              <p className="text-3xl font-bold text-primary">{money(order.totalAmount)}</p>
            </div>

            <div className="rounded-xl border border-border-pink bg-surface-soft p-4 space-y-4">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Ngân hàng</p>
                <p className="font-bold text-on-surface">Vietcombank (VCB)</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Số tài khoản</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-on-surface text-lg">19036578901018</p>
                  <button type="button" onClick={() => { navigator.clipboard.writeText('19036578901018'); message.success('Đã copy số tài khoản') }} className="text-primary hover:text-tertiary">
                    <Icon name="content_copy" className="text-xl" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Tên tài khoản</p>
                <p className="font-bold text-on-surface">CÔNG TY TNHH AISKIN</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Nội dung chuyển khoản</p>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary bg-white px-3 py-2">
                  <p className="font-bold text-primary flex-1">{order.orderCode}</p>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(order.orderCode); message.success('Đã copy nội dung') }} className="text-primary hover:text-tertiary">
                    <Icon name="content_copy" className="text-xl" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-600">Lưu ý: Bạn cần ghi chính xác nội dung chuyển khoản để hệ thống ghi nhận.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-border-pink bg-white p-6 shadow-sm">
            <p className="font-bold text-on-surface mb-4">Quét mã QR để thanh toán nhanh</p>
            <div className="h-48 w-48 rounded-xl border border-gray-100 p-2 shadow-sm">
              <QRCodeSVG value={qrValue} title={`QR thanh toán đơn ${order.orderCode}`} className="h-full w-full" />
            </div>
            <p className="mt-4 text-sm text-center text-on-surface-variant">
              Sử dụng ứng dụng ngân hàng hoặc ví điện tử để quét mã
            </p>
          </div>
        </div>

        <div className="border-t border-border-pink bg-gray-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to={`/orders/${order.id}`} className="font-semibold text-primary hover:underline">
            Xem chi tiết đơn hàng
          </Link>
          {simulationEnabled ? (
            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={simulating}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Icon name={simulating ? 'hourglass_empty' : 'check_circle'} className={simulating ? 'animate-spin text-xl' : 'text-xl'} />
              {simulating ? 'Đang xác nhận...' : 'Xác nhận thanh toán thử nghiệm'}
            </button>
          ) : (
            <p className="max-w-sm text-right text-sm text-on-surface-variant">
              Trạng thái đơn hàng sẽ tự cập nhật sau khi hệ thống xác nhận giao dịch.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
