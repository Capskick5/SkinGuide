import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/context/CartContext'
import { PATHS } from '@/route/paths'

/** Format VND */
function fmt(num) {
  return num.toLocaleString('vi-VN') + '₫'
}

const SHIPPING_FEE = 30000
const FREE_SHIP_THRESHOLD = 500000

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng', icon: 'local_shipping', desc: 'Trả tiền mặt khi giao hàng' },
  { id: 'bank', label: 'Chuyển khoản ngân hàng', icon: 'account_balance', desc: 'Thanh toán qua tài khoản ngân hàng' },
  { id: 'momo', label: 'Ví MoMo', icon: 'smartphone', desc: 'Quét mã QR hoặc số điện thoại' },
  { id: 'vnpay', label: 'VNPay', icon: 'credit_card', desc: 'Thẻ ATM / Thẻ quốc tế / QR Code' },
]

/**
 * Trang thanh toán đầy đủ: thông tin giao hàng + phương thức thanh toán + tóm tắt đơn hàng.
 */
export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    district: '',
    note: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const shippingFee = subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE
  const total = subtotal + shippingFee

  // Nếu giỏ trống, redirect về products
  if (items.length === 0 && !success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
          <Icon name="shopping_cart" className="text-5xl text-primary/40" />
        </div>
        <div className="text-center">
          <h2 className="text-headline-md font-bold text-on-surface mb-2">Giỏ hàng trống</h2>
          <p className="text-body-md text-on-surface-variant">Bạn chưa có sản phẩm nào trong giỏ hàng.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(PATHS.PRODUCTS)}
          className="px-8 py-3 rounded-full gradient-bg text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Khám phá sản phẩm
        </button>
      </div>
    )
  }

  // Màn hình thành công
  if (success) {
    return <SuccessScreen onBack={() => navigate(PATHS.PRODUCTS)} />
  }

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ tên'
    if (!/^0\d{9}$/.test(form.phone)) e.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ'
    if (!form.city.trim()) e.city = 'Vui lòng chọn tỉnh/thành phố'
    if (!form.district.trim()) e.district = 'Vui lòng nhập quận/huyện'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)

    // Giả lập gọi API 1.5s
    await new Promise((r) => setTimeout(r, 1500))
    clearCart()
    setSubmitting(false)
    setSuccess(true)
  }

  function field(key, label, type = 'text', placeholder = '') {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`checkout-${key}`} className="text-label-md font-medium text-on-surface">
          {label} {['fullName', 'phone', 'address', 'city', 'district'].includes(key) && <span className="text-red-500">*</span>}
        </label>
        <input
          id={`checkout-${key}`}
          name={key}
          type={type}
          placeholder={placeholder}
          value={form[key]}
          onChange={(ev) => setForm((f) => ({ ...f, [key]: ev.target.value }))}
          className={[
            'px-4 py-3 rounded-xl border bg-surface-container-lowest text-on-surface text-body-md',
            'placeholder:text-on-surface-variant/50 outline-none transition-all',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            errors[key] ? 'border-red-400 ring-2 ring-red-100' : 'border-border-pink',
          ].join(' ')}
        />
        {errors[key] && (
          <p className="text-caption text-red-500 flex items-center gap-1">
            <Icon name="error" className="text-base" /> {errors[key]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-4 text-label-md"
        >
          <Icon name="arrow_back" className="text-xl" />
          Quay lại
        </button>
        <h1 className="text-headline-lg text-on-surface font-bold mb-1">Thanh toán</h1>
        <p className="text-body-md text-on-surface-variant">Điền thông tin để hoàn tất đơn hàng của bạn.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left column – shipping + payment */}
          <div className="space-y-8">

            {/* Shipping info */}
            <section className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 space-y-4 shadow-[0_4px_20px_rgba(103,80,228,0.04)]">
              <h2 className="text-body-lg font-semibold text-on-surface flex items-center gap-2">
                <Icon name="local_shipping" className="text-primary" />
                Thông tin giao hàng
              </h2>
              {field('fullName', 'Họ và tên', 'text', 'Nguyễn Văn A')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('phone', 'Số điện thoại', 'tel', '0912345678')}
                {field('email', 'Email (tùy chọn)', 'email', 'email@example.com')}
              </div>
              {field('address', 'Địa chỉ chi tiết', 'text', 'Số nhà, tên đường, phường/xã')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('district', 'Quận / Huyện', 'text', 'Quận 1')}
                {field('city', 'Tỉnh / Thành phố', 'text', 'TP. Hồ Chí Minh')}
              </div>
              {/* Note */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-note" className="text-label-md font-medium text-on-surface">
                  Ghi chú đơn hàng
                </label>
                <textarea
                  id="checkout-note"
                  name="note"
                  rows={3}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                  value={form.note}
                  onChange={(ev) => setForm((f) => ({ ...f, note: ev.target.value }))}
                  className="px-4 py-3 rounded-xl border border-border-pink bg-surface-container-lowest text-on-surface text-body-md placeholder:text-on-surface-variant/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </section>

            {/* Payment method */}
            <section className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 space-y-4 shadow-[0_4px_20px_rgba(103,80,228,0.04)]">
              <h2 className="text-body-lg font-semibold text-on-surface flex items-center gap-2">
                <Icon name="payment" className="text-primary" />
                Phương thức thanh toán
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.id}
                    htmlFor={`pm-${pm.id}`}
                    className={[
                      'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                      paymentMethod === pm.id
                        ? 'border-primary bg-primary-light/40 shadow-[0_0_0_3px_rgba(177,14,107,0.08)]'
                        : 'border-border-pink hover:border-primary/40 hover:bg-surface-soft',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      id={`pm-${pm.id}`}
                      name="paymentMethod"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon name={pm.icon} className="text-base text-primary" />
                        <span className="text-label-md font-semibold text-on-surface">{pm.label}</span>
                      </div>
                      <p className="text-caption text-on-surface-variant">{pm.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right column – Order summary */}
          <div>
            <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 space-y-4 shadow-[0_4px_20px_rgba(103,80,228,0.06)] lg:sticky lg:top-4">
              <h2 className="text-body-lg font-semibold text-on-surface flex items-center gap-2">
                <Icon name="receipt_long" className="text-primary" />
                Tóm tắt đơn hàng
              </h2>

              {/* Items list */}
              <div className="divide-y divide-border-pink max-h-72 overflow-y-auto scrollbar-hidden">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex gap-3">
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-primary-light flex items-center justify-center">
                      <Icon name="science" className="text-lg text-primary/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-on-surface line-clamp-1">{item.name}</p>
                      <p className="text-caption text-on-surface-variant">{item.brand} × {item.qty}</p>
                    </div>
                    <p className="text-body-sm font-semibold text-on-surface whitespace-nowrap">
                      {fmt(item.priceNum * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-border-pink pt-4 space-y-2">
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>Tạm tính ({items.reduce((s, i) => s + i.qty, 0)} sản phẩm)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>Phí vận chuyển</span>
                  {shippingFee === 0 ? (
                    <span className="text-green-600 font-medium">Miễn phí</span>
                  ) : (
                    <span>{fmt(shippingFee)}</span>
                  )}
                </div>
                {shippingFee > 0 && (
                  <p className="text-caption text-on-surface-variant bg-primary-light/40 px-3 py-1.5 rounded-lg">
                    Thêm <strong>{fmt(FREE_SHIP_THRESHOLD - subtotal)}</strong> để được miễn phí vận chuyển
                  </p>
                )}
              </div>

              <div className="border-t border-border-pink pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-body-md font-bold text-on-surface">Tổng cộng</span>
                  <span className="text-headline-sm font-extrabold text-primary">{fmt(total)}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                type="submit"
                id="checkout-submit-btn"
                disabled={submitting}
                className={[
                  'w-full py-4 rounded-2xl gradient-bg text-white text-label-md font-bold',
                  'hover:opacity-90 transition-all flex items-center justify-center gap-2',
                  'shadow-[0_6px_20px_rgba(177,14,107,0.3)]',
                  submitting ? 'opacity-70 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Icon name="lock" className="text-xl" />
                    Đặt hàng – {fmt(total)}
                  </>
                )}
              </button>

              <p className="text-caption text-center text-on-surface-variant flex items-center justify-center gap-1">
                <Icon name="security" className="text-base" />
                Thanh toán an toàn & bảo mật SSL
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

// ---------- Success Screen ----------
function SuccessScreen({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      {/* Animated check */}
      <div className="relative w-28 h-28">
        <div className="w-28 h-28 rounded-full gradient-bg flex items-center justify-center shadow-[0_8px_30px_rgba(177,14,107,0.35)] animate-bounce-gentle">
          <Icon name="check_circle" className="text-6xl text-white" />
        </div>
        {/* Sparkles */}
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 rounded-full gradient-bg opacity-70"
            style={{
              top: `${50 + 50 * Math.sin((i * Math.PI * 2) / 6)}%`,
              left: `${50 + 50 * Math.cos((i * Math.PI * 2) / 6)}%`,
              transform: 'translate(-50%,-50%)',
              animation: `ping 1s ${i * 0.1}s ease-out infinite`,
            }}
          />
        ))}
      </div>

      <div>
        <h2 className="text-headline-md font-extrabold text-on-surface mb-2">Đặt hàng thành công! 🎉</h2>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          Cảm ơn bạn đã tin tưởng <strong>AISkin</strong>! Đơn hàng của bạn đang được xử lý và sẽ được giao trong 2-4 ngày.
        </p>
      </div>

      {/* Order details summary */}
      <div className="bg-primary-light/60 border border-border-pink rounded-2xl px-8 py-5 space-y-2 max-w-sm w-full">
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-on-surface-variant">Mã đơn hàng</span>
          <span className="font-bold text-on-surface">#{Math.random().toString(36).slice(2, 9).toUpperCase()}</span>
        </div>
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-on-surface-variant">Trạng thái</span>
          <span className="font-semibold text-green-600 flex items-center gap-1">
            <Icon name="check_circle" className="text-base" /> Đã xác nhận
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="px-8 py-3.5 rounded-full gradient-bg text-white font-semibold hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(177,14,107,0.3)]"
      >
        Tiếp tục mua sắm
      </button>
    </div>
  )
}
