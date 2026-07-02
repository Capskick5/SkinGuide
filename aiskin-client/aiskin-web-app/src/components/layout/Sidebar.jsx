import { NavLink } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import Logo from '@/components/common/Logo'
import { NAV_ITEMS } from '@/route/navigation'
import { PATHS } from '@/route/paths'

/**
 * Sidebar điều hướng dọc bên trái (desktop), phong cách QuillBot.
 * Cùng màu với shell (hồng), chữ nút màu đen, mục active nền trắng.
 */
export default function Sidebar() {
  return (
    <nav className="hidden md:flex bg-white/35 backdrop-blur-xl fixed left-0 top-0 h-full w-sidebar flex-col items-center py-5 z-50 border-r border-white/40">
      {/* Logo thương hiệu (style QuillBot: logo trên, wordmark dưới) */}
      <NavLink to={PATHS.DASHBOARD} end className="mb-6">
        <Logo layout="stacked" size={44} />
      </NavLink>

      {/* Menu */}
      <div className="flex flex-col w-full gap-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === PATHS.DASHBOARD}
            className={({ isActive }) =>
              [
                'group flex flex-col items-center gap-1 py-2 px-1 w-full rounded-lg transition-all active:scale-95',
                isActive
                  ? 'bg-white text-on-surface shadow-[0_12px_26px_rgba(23,32,38,0.1)]'
                  : 'text-on-surface hover:bg-white/55',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={[
                    'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
                    isActive ? 'text-primary' : 'text-on-surface group-hover:text-primary',
                  ].join(' ')}
                >
                  <Icon name={item.icon} filled={isActive} className="text-[22px]" />
                </span>
                <span className="text-[11px] leading-tight text-center font-medium tracking-tight text-on-surface">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
