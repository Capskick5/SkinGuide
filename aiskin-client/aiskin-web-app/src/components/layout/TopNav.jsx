import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import UserMenu from './UserMenu'
import { PATHS } from '@/route/paths'
import { useCart } from '@/hook/useCart'

/**
 * Thanh header trên cùng (desktop) - cùng màu shell (hồng), căn phải.
 * Icon/chữ màu đen + cart icon + menu người dùng (avatar).
 */
export default function TopNav() {
  const navigate = useNavigate()
  const { totalCount } = useCart()

  return (
    <header className="hidden md:flex bg-nav fixed top-0 left-sidebar right-0 z-40 justify-end items-center px-6 h-[52px] gap-2">
      {/* Cart icon với badge */}
      <button
        type="button"
        id="topnav-cart-btn"
        onClick={() => navigate(PATHS.CART)}
        className="relative w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/60 transition-colors rounded-full"
        aria-label="Giỏ hàng"
      >
        <Icon name="shopping_cart" className="text-[22px]" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 shadow-ambient-pink animate-slide-up">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Orders → /orders */}
      <button
        type="button"
        onClick={() => navigate(PATHS.ORDERS)}
        className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/60 transition-colors rounded-full"
        aria-label="Lịch sử mua hàng"
      >
        <Icon name="receipt_long" className="text-[22px]" />
      </button>

      {/* Settings → /settings */}
      <button
        type="button"
        onClick={() => navigate(PATHS.SETTINGS)}
        className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/60 transition-colors rounded-full"
        aria-label="Cài đặt"
      >
        <Icon name="settings" className="text-[22px]" />
      </button>

      <div className="ml-1">
        <UserMenu />
      </div>
    </header>
  )
}

