import Icon from '@/components/common/Icon'
import UserMenu from './UserMenu'

/**
 * Thanh header trên cùng (desktop) - cùng màu shell (hồng), căn phải.
 * Icon/chữ màu đen + menu người dùng (avatar).
 */
export default function TopNav() {
  return (
    <header className="hidden md:flex bg-nav fixed top-0 left-sidebar right-0 z-40 justify-end items-center px-6 h-[52px] gap-2">
      <button
        type="button"
        className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/60 transition-colors rounded-full"
        aria-label="Thông báo"
      >
        <Icon name="notifications" className="text-[22px]" />
      </button>
      <button
        type="button"
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
