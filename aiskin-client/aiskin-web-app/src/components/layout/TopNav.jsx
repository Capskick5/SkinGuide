import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import UserMenu from './UserMenu'
import { PATHS } from '@/route/paths'
import { useCart } from '@/hook/useCart'
import { useAuth } from '@/hook/useAuth'

export default function TopNav() {
  const navigate = useNavigate()
  const { totalCount } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <header className="hidden md:flex bg-white/30 backdrop-blur-xl fixed top-0 left-sidebar right-0 z-40 justify-end items-center px-6 h-[52px] gap-2 border-b border-white/35">
      <button
        type="button"
        id="topnav-cart-btn"
        onClick={() => navigate(PATHS.CART)}
        className="relative w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/70 transition-all duration-200 rounded-lg focus-ring"
        aria-label="Giỏ hàng"
        title="Giỏ hàng"
      >
        <Icon name="shopping_cart" className="text-[22px]" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold px-1 shadow-ambient-pink animate-scale-in">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => navigate(PATHS.ORDERS)}
        className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/70 transition-all duration-200 rounded-lg focus-ring"
        aria-label="Lịch sử mua hàng"
        title="Đơn hàng"
      >
        <Icon name="receipt_long" className="text-[22px]" />
      </button>

      <button
        type="button"
        onClick={() => navigate(PATHS.SETTINGS)}
        className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/70 transition-all duration-200 rounded-lg focus-ring"
        aria-label="Cài đặt"
        title="Cài đặt"
      >
        <Icon name="settings" className="text-[22px]" />
      </button>

      {isAuthenticated ? (
        <div className="ml-1">
          <UserMenu />
        </div>
      ) : (
        <div className="ml-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(PATHS.LOGIN)}
            className="h-9 rounded-lg px-4 text-sm font-semibold text-on-surface hover:bg-white/70 transition-all duration-200 focus-ring"
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => navigate(PATHS.REGISTER)}
            className="h-9 rounded-lg bg-on-surface px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,32,38,0.16)] hover:opacity-90 transition-all duration-200 hover:scale-[1.02] focus-ring"
          >
            Đăng ký
          </button>
        </div>
      )}
    </header>
  )
}
