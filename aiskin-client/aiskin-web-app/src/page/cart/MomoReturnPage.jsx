import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'

export default function MomoReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const [status, setStatus] = useState('processing') // processing, success, fail

  useEffect(() => {
    const resultCode = searchParams.get('resultCode')
    if (resultCode === '0') {
      setStatus('success')
      clearCart() // Clear cart on success
    } else if (resultCode) {
      setStatus('fail')
    } else {
      // no params, redirect to home
      navigate('/')
    }
  }, [searchParams, navigate, clearCart])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      {status === 'processing' && (
        <>
          <Icon name="hourglass_empty" className="text-6xl text-primary animate-spin mb-4" />
          <h1 className="text-headline-sm font-bold text-on-surface">Đang xử lý kết quả...</h1>
        </>
      )}

      {status === 'success' && (
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Icon name="check_circle" filled className="text-6xl text-emerald-500" />
          </div>
          <h1 className="text-headline-md font-bold text-on-surface mb-2">Thanh toán thành công!</h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            Đơn hàng của bạn đã được ghi nhận và thanh toán qua ví MoMo.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/orders"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:opacity-90 transition-opacity"
            >
              Xem đơn hàng
            </Link>
            <Link
              to="/products"
              className="w-full py-3.5 rounded-2xl border border-border-pink text-primary font-bold hover:bg-surface-container-lowest transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}

      {status === 'fail' && (
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
          <div className="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
            <Icon name="cancel" filled className="text-6xl text-error" />
          </div>
          <h1 className="text-headline-md font-bold text-on-surface mb-2">Thanh toán thất bại</h1>
          <p className="text-body-md text-on-surface-variant mb-8">
            Giao dịch đã bị hủy hoặc có lỗi xảy ra trong quá trình thanh toán.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/cart"
              className="w-full py-3.5 rounded-2xl gradient-bg text-white font-bold shadow-ambient-pink hover:opacity-90 transition-opacity"
            >
              Thử lại thanh toán
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
