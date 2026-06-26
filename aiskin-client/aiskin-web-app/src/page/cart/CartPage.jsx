import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'
import { resolveImageUrl } from '@/page/products/productUtils'
import qrImage from '@/assets/qr-payment.png'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

/* ─────────────────────────────────────────────
   Modal thanh toán QR
───────────────────────────────────────────── */
function QrPaymentModal({ totalPrice, onClose, onConfirm }) {
  const [copied, setCopied] = useState(false)
  const accountNumber = '0123 4567 8910'

  function handleCopy() {
    navigator.clipboard.writeText(accountNumber.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gradient-bg px-6 pt-6 pb-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 mb-3">
            <Icon name="qr_code_2" className="text-white text-2xl" />
          </div>
          <h2 className="text-white font-bold text-lg">Thanh toán QR</h2>
          <p className="text-white/80 text-sm mt-1">Quét mã để chuyển khoản</p>
        </div>

        {/* QR Code */}
        <div className="px-6 -mt-5">
          <div className="bg-white rounded-2xl shadow-ambient-pink p-4 border border-border-pink">
            <img
              src={qrImage}
              alt="Mã QR thanh toán"
              className="w-full aspect-square object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Bank info */}
        <div className="px-6 pt-4 space-y-3">
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-container-low border border-border-pink">
            <div>
              <p className="text-caption text-on-surface-variant">Số tài khoản</p>
              <p className="font-semibold text-on-surface tracking-widest">{accountNumber}</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-light text-primary text-caption font-medium hover:bg-primary hover:text-white transition-colors"
            >
              <Icon name={copied ? 'check' : 'content_copy'} className="text-base" />
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="py-3 px-4 rounded-xl bg-surface-container-low border border-border-pink">
              <p className="text-caption text-on-surface-variant">Chủ tài khoản</p>
              <p className="font-medium text-on-surface text-sm">NGUYEN VAN A</p>
            </div>
            <div className="py-3 px-4 rounded-xl bg-surface-container-low border border-border-pink">
              <p className="text-caption text-on-surface-variant">Ngân hàng</p>
              <p className="font-medium text-on-surface text-sm">MB Bank</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-primary-light border border-primary/20">
            <p className="text-body-md font-semibold text-on-surface">Số tiền</p>
            <p className="text-title-md font-bold text-primary">{money(totalPrice)}</p>
          </div>

          <p className="text-caption text-on-surface-variant text-center pb-1">
            Nội dung chuyển khoản: <strong className="text-on-surface">AISKIN ORDER</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-3 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border-pink text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl gradient-bg text-white font-semibold hover:opacity-90 transition-opacity shadow-ambient-pink"
          >
            Đã thanh toán
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal thanh toán tiền mặt
───────────────────────────────────────────── */
function CashPaymentModal({ totalPrice, onClose, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 px-6 pt-6 pb-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 mb-3">
            <Icon name="payments" className="text-white text-2xl" />
          </div>
          <h2 className="text-white font-bold text-lg">Thanh toán tiền mặt</h2>
          <p className="text-white/80 text-sm mt-1">Thanh toán khi nhận hàng (COD)</p>
        </div>

        {/* Content */}
        <div className="px-6 -mt-5 space-y-3">
          <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(16,185,129,0.12)] border border-emerald-100 p-5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <Icon name="local_shipping" className="text-3xl text-emerald-500" />
              </div>
              <p className="text-center text-body-md text-on-surface font-medium">
                Giao hàng tận nơi, thanh toán khi nhận
              </p>
              <p className="text-center text-caption text-on-surface-variant">
                Bạn sẽ thanh toán cho nhân viên giao hàng khi nhận được sản phẩm.
              </p>
            </div>
          </div>

          <div className="space-y-2 py-3 px-4 rounded-xl bg-surface-container-low border border-border-pink">
            <InfoRow label="Phương thức" value="Tiền mặt (COD)" />
            <div className="border-t border-border-pink" />
            <InfoRow label="Thời gian giao" value="2 – 5 ngày làm việc" />
            <div className="border-t border-border-pink" />
            <div className="flex justify-between items-center pt-1">
              <span className="font-semibold text-on-surface">Tổng thanh toán</span>
              <span className="font-bold text-lg text-emerald-600">{money(totalPrice)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 py-3 px-4 rounded-xl bg-amber-50 border border-amber-200">
            <Icon name="info" className="text-amber-500 text-base mt-0.5 shrink-0" />
            <p className="text-caption text-amber-700">
              Vui lòng chuẩn bị đúng số tiền khi nhận hàng để thuận tiện giao dịch.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border-pink text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
          >
            Xác nhận đặt hàng
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-caption text-on-surface-variant">{label}</span>
      <span className="text-body-sm text-on-surface font-medium">{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal thanh toán thành công
───────────────────────────────────────────── */
function SuccessModal({ method, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs text-center p-8 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4">
          <Icon name="check_circle" filled className="text-4xl text-primary" />
        </div>
        <h2 className="text-headline-sm text-on-surface font-bold mb-2">Đặt hàng thành công!</h2>
        <p className="text-body-sm text-on-surface-variant mb-6">
          {method === 'qr'
            ? 'Chúng tôi sẽ xác nhận sau khi nhận được thanh toán.'
            : 'Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ sớm!'}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl gradient-bg text-white font-semibold shadow-ambient-pink hover:opacity-90 transition-opacity"
        >
          Về trang sản phẩm
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Chọn phương thức thanh toán
───────────────────────────────────────────── */
function PaymentSelector({ totalPrice, onSelectQr, onSelectCash }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gradient-bg px-6 pt-6 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 mb-3">
            <Icon name="shopping_cart_checkout" className="text-white text-2xl" />
          </div>
          <h2 className="text-white font-bold text-lg">Chọn phương thức thanh toán</h2>
          <p className="text-white/80 text-sm mt-1">Tổng: <strong>{money(totalPrice)}</strong></p>
        </div>

        <div className="p-6 space-y-3">
          {/* QR */}
          <button
            onClick={onSelectQr}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-primary/30 bg-primary-light hover:border-primary hover:shadow-ambient-pink transition-all group"
          >
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Icon name="qr_code_2" className="text-white text-2xl" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-on-surface">Thanh toán QR</p>
              <p className="text-caption text-on-surface-variant">Chuyển khoản ngân hàng qua mã QR</p>
            </div>
            <Icon name="chevron_right" className="ml-auto text-on-surface-variant group-hover:text-primary transition-colors" />
          </button>

          {/* Cash */}
          <button
            onClick={onSelectCash}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:shadow-[0_4px_14px_rgba(16,185,129,0.15)] transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Icon name="payments" className="text-white text-2xl" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-on-surface">Tiền mặt (COD)</p>
              <p className="text-caption text-on-surface-variant">Thanh toán khi nhận hàng</p>
            </div>
            <Icon name="chevron_right" className="ml-auto text-on-surface-variant group-hover:text-emerald-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Cart Item Row
───────────────────────────────────────────── */
function CartItem({ item, onRemove, onUpdateQty }) {
  const imageSrc = resolveImageUrl(item.imageUrl || item.images?.[0])

  return (
    <div className="flex gap-4 py-4 border-b border-border-pink last:border-0 group animate-slide-up">
      {/* Ảnh */}
      <div className="w-20 h-20 rounded-xl overflow-hidden border border-border-pink bg-primary-light shrink-0">
        {imageSrc ? (
          <img src={imageSrc} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="science" className="text-2xl text-primary/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface text-body-sm truncate pr-2">{item.name}</p>
        <p className="text-caption text-on-surface-variant mt-0.5">{money(item.price)}</p>

        {/* Qty controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onUpdateQty(item.id, item.qty - 1)}
            className="w-7 h-7 rounded-full border border-border-pink flex items-center justify-center hover:bg-surface-container-low transition-colors"
          >
            <Icon name="remove" className="text-sm text-on-surface-variant" />
          </button>
          <span className="w-6 text-center font-semibold text-on-surface text-body-sm">
            {item.qty}
          </span>
          <button
            onClick={() => onUpdateQty(item.id, item.qty + 1)}
            className="w-7 h-7 rounded-full border border-border-pink flex items-center justify-center hover:bg-surface-container-low transition-colors"
          >
            <Icon name="add" className="text-sm text-on-surface-variant" />
          </button>
        </div>
      </div>

      {/* Subtotal + remove */}
      <div className="flex flex-col items-end justify-between shrink-0">
        <button
          onClick={() => onRemove(item.id)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Xóa sản phẩm"
        >
          <Icon name="delete" className="text-base" />
        </button>
        <p className="font-bold text-primary">{money((item.price || 0) * item.qty)}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Trang chính: Giỏ hàng
───────────────────────────────────────────── */
export default function CartPage() {
  const { items, totalCount, totalPrice, removeItem, updateQty, clearCart } = useCart()
  const [modal, setModal] = useState(null) // null | 'selector' | 'qr' | 'cash' | 'success-qr' | 'success-cash'

  function handleCheckout() {
    setModal('selector')
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-caption text-on-surface-variant mb-1">
            <Link to="/products" className="hover:text-primary">Sản phẩm</Link>
            <span className="mx-2">/</span>
            Giỏ hàng
          </p>
          <h1 className="text-headline-lg text-on-surface">
            Giỏ hàng
            {totalCount > 0 && (
              <span className="ml-3 px-3 py-0.5 rounded-full bg-primary text-white text-label-md align-middle">
                {totalCount}
              </span>
            )}
          </h1>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md text-on-surface-variant hover:text-primary"
        >
          <Icon name="arrow_back" className="text-lg" />
          Tiếp tục mua
        </Link>
      </div>

      {items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center min-h-80 gap-5">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <Icon name="shopping_cart" className="text-5xl text-primary/50" />
          </div>
          <div className="text-center">
            <p className="text-headline-sm text-on-surface font-semibold mb-2">Giỏ hàng trống</p>
            <p className="text-body-md text-on-surface-variant">
              Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-primary border border-primary font-semibold hover:bg-primary-light transition-colors"
          >
            <Icon name="storefront" className="text-xl" />
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
          {/* Danh sách sản phẩm */}
          <div className="rounded-2xl border border-border-pink bg-surface-container-lowest overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-pink">
              <p className="font-semibold text-on-surface">{totalCount} sản phẩm</p>
              <button
                onClick={clearCart}
                className="flex items-center gap-1.5 text-caption text-on-surface-variant hover:text-error transition-colors"
              >
                <Icon name="delete_sweep" className="text-base" />
                Xóa tất cả
              </button>
            </div>
            <div className="px-5">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onUpdateQty={updateQty}
                />
              ))}
            </div>
          </div>

          {/* Tóm tắt đơn hàng */}
          <div className="h-fit rounded-2xl border border-border-pink bg-surface-container-lowest overflow-hidden">
            <div className="px-5 py-4 border-b border-border-pink">
              <p className="font-semibold text-on-surface">Tóm tắt đơn hàng</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between text-body-sm text-on-surface-variant">
                <span>Tạm tính ({totalCount} sản phẩm)</span>
                <span>{money(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-body-sm text-on-surface-variant">
                <span>Phí vận chuyển</span>
                <span className="text-success font-medium">Miễn phí</span>
              </div>
              <div className="border-t border-border-pink pt-3 flex justify-between">
                <span className="font-bold text-on-surface">Tổng cộng</span>
                <span className="font-bold text-primary text-title-md">{money(totalPrice)}</span>
              </div>
            </div>

            {/* Checkout button */}
            <div className="px-5 pb-5">
              <button
                onClick={handleCheckout}
                className="w-full py-4 rounded-2xl gradient-bg text-white font-bold text-body-md shadow-ambient-pink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Icon name="shopping_cart_checkout" className="text-xl" />
                Thanh toán
              </button>
            </div>

            {/* Payment methods hint */}
            <div className="px-5 pb-5 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                <Icon name="qr_code_2" className="text-base text-primary" />
                QR Code
              </div>
              <span className="text-border-pink">|</span>
              <div className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                <Icon name="payments" className="text-base text-success" />
                Tiền mặt
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'selector' && (
        <PaymentSelector
          totalPrice={totalPrice}
          onSelectQr={() => setModal('qr')}
          onSelectCash={() => setModal('cash')}
        />
      )}
      {modal === 'qr' && (
        <QrPaymentModal
          totalPrice={totalPrice}
          onClose={() => setModal('selector')}
          onConfirm={() => { clearCart(); setModal('success-qr') }}
        />
      )}
      {modal === 'cash' && (
        <CashPaymentModal
          totalPrice={totalPrice}
          onClose={() => setModal('selector')}
          onConfirm={() => { clearCart(); setModal('success-cash') }}
        />
      )}
      {(modal === 'success-qr' || modal === 'success-cash') && (
        <SuccessModal
          method={modal === 'success-qr' ? 'qr' : 'cash'}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
