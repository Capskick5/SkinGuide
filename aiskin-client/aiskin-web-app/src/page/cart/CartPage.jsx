import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'
import { resolveImageUrl } from '@/page/products/productUtils'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

/* ─────────────────────────────────────────────
   Modal Nhập Thông Tin Giao Hàng
───────────────────────────────────────────── */
function AddressFormModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    shippingAddress: ''
  })

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        <div className="gradient-bg px-6 py-5 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
          <h2 className="text-white font-bold text-lg">Thông tin giao hàng</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-caption font-medium text-on-surface mb-1">Họ và tên</label>
            <input
              required
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-border-pink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Nhập họ và tên"
            />
          </div>
          <div>
            <label className="block text-caption font-medium text-on-surface mb-1">Số điện thoại</label>
            <input
              required
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-border-pink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Nhập số điện thoại"
            />
          </div>
          <div>
            <label className="block text-caption font-medium text-on-surface mb-1">Địa chỉ giao hàng</label>
            <textarea
              required
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 rounded-xl border border-border-pink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              placeholder="Nhập chi tiết địa chỉ nhận hàng"
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full py-3.5 mt-2 rounded-2xl gradient-bg text-white font-bold shadow-ambient-pink hover:opacity-90 transition-opacity"
          >
            Tiếp tục
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Chọn phương thức thanh toán
───────────────────────────────────────────── */
function PaymentSelector({ totalPrice, onSelectMomo, onSelectCash, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
        <div className="gradient-bg px-6 pt-6 pb-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Icon name="close" className="text-lg" />
          </button>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 mb-3">
            <Icon name="shopping_cart_checkout" className="text-white text-2xl" />
          </div>
          <h2 className="text-white font-bold text-lg">Phương thức thanh toán</h2>
          <p className="text-white/80 text-sm mt-1">Tổng: <strong>{money(totalPrice)}</strong></p>
        </div>

        <div className="p-6 space-y-3">
          {/* Momo */}
          <button
            onClick={onSelectMomo}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-primary/30 bg-primary-light hover:border-primary hover:shadow-ambient-pink transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Icon name="account_balance_wallet" className="text-white text-2xl" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-on-surface">Ví MoMo</p>
              <p className="text-caption text-on-surface-variant">Thanh toán qua ví điện tử</p>
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
   Modal Đang xử lý
───────────────────────────────────────────── */
function ProcessingModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center">
        <Icon name="hourglass_empty" className="text-5xl text-primary animate-spin" />
        <p className="mt-4 font-semibold text-on-surface">Đang xử lý thanh toán...</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal thanh toán thành công (COD)
───────────────────────────────────────────── */
function SuccessModal({ onClose }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xs text-center p-8 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4">
          <Icon name="check_circle" filled className="text-4xl text-primary" />
        </div>
        <h2 className="text-headline-sm text-on-surface font-bold mb-2">Đặt hàng thành công!</h2>
        <p className="text-body-sm text-on-surface-variant mb-6">
          Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ sớm!
        </p>
        <button
          onClick={() => { onClose(); navigate('/orders') }}
          className="w-full py-3 rounded-2xl gradient-bg text-white font-semibold shadow-ambient-pink hover:opacity-90 transition-opacity"
        >
          Xem đơn hàng
        </button>
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
      <div className="w-20 h-20 rounded-xl overflow-hidden border border-border-pink bg-primary-light shrink-0">
        {imageSrc ? (
          <img src={imageSrc} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="science" className="text-2xl text-primary/40" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-on-surface text-body-sm truncate pr-2">{item.name}</p>
        <p className="text-caption text-on-surface-variant mt-0.5">{money(item.price)}</p>

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
  const navigate = useNavigate()

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

            <div className="px-5 pb-5">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-4 rounded-2xl gradient-bg text-white font-bold text-body-md shadow-ambient-pink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Icon name="shopping_cart_checkout" className="text-xl" />
                Tiến hành thanh toán
              </button>
            </div>

            <div className="px-5 pb-5 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                <Icon name="account_balance_wallet" className="text-base text-primary" />
                MoMo
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
    </div>
  )
}


