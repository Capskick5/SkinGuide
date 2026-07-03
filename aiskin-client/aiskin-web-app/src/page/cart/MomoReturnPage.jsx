import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import httpClient from '@/api/httpClient'
import { useCart } from '@/hook/useCart'

export default function MomoReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Đang xác nhận kết quả thanh toán từ MoMo sandbox...')

  useEffect(() => {
    let cancelled = false

    async function syncMomoResult() {
      const orderId = searchParams.get('orderId')
      const resultCode = searchParams.get('resultCode')
      const momoMessage = searchParams.get('message')

      if (!orderId || resultCode === null) {
        navigate('/')
        return
      }

      try {
        await httpClient.post('/orders/payment/momo-ipn', {
          orderId,
          resultCode: Number(resultCode),
        })
      } catch (err) {
        console.error('Sync MoMo return failed:', err)
      }

      if (cancelled) return

      if (resultCode === '0') {
        clearCart()
        setStatus('success')
        setMessage(`Đơn ${orderId} đã được thanh toán thành công qua MoMo sandbox.`)
      } else {
        setStatus('fail')
        setMessage(momoMessage || `Giao dịch cho đơn ${orderId} chưa thành công.`)
      }
    }

    syncMomoResult()
    return () => {
      cancelled = true
    }
  }, [searchParams, navigate, clearCart])

  const isSuccess = status === 'success'
  const isFail = status === 'fail'

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4 text-center">
      <div className="w-full max-w-md rounded-lg border border-border-pink bg-white p-8 shadow-[0_12px_40px_rgba(103,80,228,0.12)]">
        <div
          className={[
            'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full',
            isSuccess ? 'bg-emerald-100 text-emerald-600' : isFail ? 'bg-error/10 text-error' : 'bg-primary-light text-primary',
          ].join(' ')}
        >
          <Icon
            name={isSuccess ? 'check_circle' : isFail ? 'cancel' : 'hourglass_empty'}
            filled={isSuccess || isFail}
            className={status === 'processing' ? 'animate-spin text-5xl' : 'text-5xl'}
          />
        </div>

        <h1 className="mb-2 text-headline-sm font-bold text-on-surface">
          {isSuccess ? 'Thanh toán thành công' : isFail ? 'Thanh toán thất bại' : 'Đang xử lý'}
        </h1>
        <p className="mb-6 text-body-md leading-6 text-on-surface-variant">{message}</p>

        {isSuccess ? (
          <div className="grid gap-3">
            <Link to="/orders" className="flex h-12 items-center justify-center rounded-lg bg-primary font-bold text-white transition hover:bg-tertiary">
              Xem đơn hàng
            </Link>
            <Link to="/products" className="flex h-12 items-center justify-center rounded-lg border border-border-pink font-bold text-primary transition hover:bg-primary-light">
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : null}

        {isFail ? (
          <div className="grid gap-3">
            <Link to="/checkout" className="flex h-12 items-center justify-center rounded-lg bg-primary font-bold text-white transition hover:bg-tertiary">
              Thử thanh toán lại
            </Link>
            <Link to="/cart" className="flex h-12 items-center justify-center rounded-lg border border-border-pink font-bold text-primary transition hover:bg-primary-light">
              Quay về giỏ hàng
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
