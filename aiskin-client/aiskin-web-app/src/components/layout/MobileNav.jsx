import { NavLink } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { MOBILE_NAV_ITEMS } from '@/route/navigation'
import { PATHS } from '@/route/paths'

/**
 * Bottom navigation cho mobile (ẩn trên desktop).
 */
export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-white/70 shadow-[0_-18px_40px_rgba(23,32,38,0.12)] z-50 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-between items-center">
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === PATHS.PRODUCTS}
          className={({ isActive }) =>
            [
              'flex flex-col items-center gap-1 px-3 py-1.5 min-w-[48px] transition-all duration-200',
              isActive ? 'text-primary' : 'text-tertiary/70 active:scale-90',
            ].join(' ')
          }
        >
          {({ isActive }) =>
            isActive ? (
              <>
                <span className="bg-primary text-white px-4 py-1.5 rounded-xl flex items-center justify-center shadow-[0_8px_18px_rgba(255,111,97,0.24)] animate-scale-in">
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
