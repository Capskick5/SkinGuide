import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/context/CartContext'
import { useCartDrawer } from '@/context/CartDrawerContext'
import { PATHS } from '@/route/paths'

/** Format số -> "599.000₫" */
function fmt(num) {
  return num.toLocaleString('vi-VN') + '₫'
}

/**
 * Panel giỏ hàng trượt từ phải (drawer).
 * Bấm ngoài backdrop hoặc nút ✕ để đóng.
 */
export default function CartDrawer() {
  const { open, closeCart } = useCartDrawer()
  const { items, removeItem, setQty, totalItems, subtotal, clearCart } = useCart()
  const navigate = useNavigate()

  // Lock body scroll khi drawer mở
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function goCheckout() {
    closeCart()
    navigate(PATHS.CHECKOUT)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Giỏ hàng"
        aria-modal="true"
        className={[
          'fixed top-0 right-0 h-full w-full max-w-[420px] bg-canvas z-[70] flex flex-col',
          'shadow-[-8px_0_40px_rgba(103,80,228,0.15)]',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-pink">
          <div className="flex items-center gap-2">
            <Icon name="shopping_cart" className="text-primary text-2xl" />
            <h2 className="text-body-lg font-semibold text-on-surface">Giỏ hàng</h2>
            {totalItems > 0 && (
              <span className="ml-1 px-2 py-0.5 gradient-bg text-white text-caption rounded-full font-medium">
                {totalItems}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-soft transition-colors text-on-surface-variant"
            aria-label="Đóng giỏ hàng"
            id="cart-drawer-close"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center">
                <Icon name="shopping_cart" className="text-4xl text-primary/50" />
              </div>
              <div>
                <p className="text-body-md font-medium text-on-surface mb-1">Giỏ hàng trống</p>
                <p className="text-body-sm text-on-surface-variant">Hãy thêm sản phẩm từ trang Sản phẩm.</p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="px-6 py-2.5 rounded-full gradient-bg text-white text-label-md hover:opacity-90 transition-opacity"
              >
                Khám phá sản phẩm
              </button>
            </div>
          ) : (
            items.map((item) => (
              <CartItem key={item.id} item={item} onRemove={removeItem} onSetQty={setQty} />
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border-pink px-6 py-5 space-y-4 bg-canvas">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-body-md text-on-surface-variant">Tạm tính</span>
              <span className="text-body-lg font-bold text-on-surface">{fmt(subtotal)}</span>
            </div>

            {/* Shipping note */}
            <div className="flex items-center gap-2 bg-primary-light/60 border border-border-pink rounded-xl px-3 py-2">
              <Icon name="local_shipping" className="text-primary text-lg" />
              <span className="text-caption text-on-surface-variant">
                Miễn phí vận chuyển cho đơn hàng từ <strong className="text-on-surface">500.000₫</strong>
              </span>
            </div>

            {/* Actions */}
            <button
              type="button"
              id="cart-checkout-btn"
              onClick={goCheckout}
              className="w-full py-3.5 rounded-full gradient-bg text-white text-label-md font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(177,14,107,0.3)]"
            >
              <Icon name="payment" className="text-xl" />
              Tiến hành thanh toán
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="w-full py-2 text-caption text-on-surface-variant hover:text-red-500 transition-colors"
            >
              Xóa toàn bộ giỏ hàng
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

// ---------- CartItem ----------
function CartItem({ item, onRemove, onSetQty }) {
  return (
    <div className="flex gap-3 bg-surface-container-lowest border border-border-pink rounded-2xl p-3 hover:shadow-[0_4px_12px_rgba(103,80,228,0.08)] transition-shadow">
      {/* Icon placeholder */}
      <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-primary-light flex items-center justify-center">
        <Icon name="science" className="text-2xl text-primary/50" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-caption text-on-surface-variant truncate">{item.brand}</p>
        <p className="text-body-sm font-semibold text-on-surface leading-tight mb-1 line-clamp-2">{item.name}</p>
        <p className="text-body-sm font-bold text-primary">{item.price}</p>
      </div>

      {/* Qty + remove */}
      <div className="flex flex-col items-end justify-between gap-2">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-on-surface-variant/50 hover:text-red-400 transition-colors"
          aria-label="Xóa sản phẩm"
        >
          <Icon name="delete" className="text-base" />
        </button>
        <div className="flex items-center border border-border-pink rounded-full overflow-hidden">
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty - 1)}
            disabled={item.qty <= 1}
            className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors"
            aria-label="Giảm số lượng"
          >
            <Icon name="remove" className="text-base" />
          </button>
          <span className="w-7 text-center text-label-md font-semibold text-on-surface">{item.qty}</span>
          <button
            type="button"
            onClick={() => onSetQty(item.id, item.qty + 1)}
            className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Tăng số lượng"
          >
            <Icon name="add" className="text-base" />
          </button>
        </div>
      </div>
    </div>
  )
}
