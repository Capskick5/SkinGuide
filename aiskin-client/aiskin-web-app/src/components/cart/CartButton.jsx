import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/context/CartContext'
import { useCartDrawer } from '@/context/CartDrawerContext'

/**
 * Nút giỏ hàng hiển thị trên TopNav.
 * Badge số lượng co-animation khi thêm hàng.
 */
export default function CartButton() {
  const { totalItems } = useCart()
  const { openCart } = useCartDrawer()
  const [bump, setBump] = useState(false)
  const prevRef = useRef(totalItems)

  // Hiệu ứng "bump" khi totalItems tăng
  useEffect(() => {
    if (totalItems > prevRef.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 400)
      return () => clearTimeout(t)
    }
    prevRef.current = totalItems
  }, [totalItems])

  return (
    <button
      type="button"
      id="cart-open-btn"
      onClick={openCart}
      aria-label={`Giỏ hàng${totalItems > 0 ? ` (${totalItems} sản phẩm)` : ''}`}
      className="relative w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/60 transition-colors rounded-full"
    >
      <Icon
        name="shopping_cart"
        className={['text-[22px] transition-transform duration-200', bump ? 'scale-125' : 'scale-100'].join(' ')}
      />
      {totalItems > 0 && (
        <span
          className={[
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 gradient-bg text-white text-[10px] font-bold rounded-full flex items-center justify-center',
            'transition-transform duration-200',
            bump ? 'scale-125' : 'scale-100',
          ].join(' ')}
        >
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  )
}
