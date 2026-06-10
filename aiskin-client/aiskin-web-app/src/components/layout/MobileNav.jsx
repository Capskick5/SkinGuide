import { NavLink } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { MOBILE_NAV_ITEMS } from '@/route/navigation'
import { PATHS } from '@/route/paths'

/**
 * Bottom navigation cho mobile (ẩn trên desktop).
 */
export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-nav border-t border-border-pink shadow-[0_-4px_20px_rgba(103,80,228,0.1)] z-50 px-3 py-2 flex justify-between items-center">
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === PATHS.DASHBOARD}
          className={({ isActive }) =>
            [
              'flex flex-col items-center gap-1 px-2 py-1 transition-colors',
              isActive ? 'text-primary' : 'text-tertiary/70',
            ].join(' ')
          }
        >
          {({ isActive }) =>
            isActive ? (
              <>
                <span className="bg-white px-4 py-1 rounded-full flex items-center justify-center shadow-[0_3px_10px_rgba(177,14,107,0.15)]">
                  <Icon name={item.icon} filled />
                </span>
                <span className="text-[10px] leading-tight font-semibold">{item.label}</span>
              </>
            ) : (
              <>
                <Icon name={item.icon} />
                <span className="text-[10px] leading-tight">{item.label}</span>
              </>
            )
          }
        </NavLink>
      ))}
    </nav>
  )
}
