import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PATHS } from '@/route/paths'
import Icon from '@/components/common/Icon'
import { useAuth } from '@/hook/useAuth'

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: PATHS.ADMIN_DASHBOARD },
  { key: 'users', label: 'Người dùng', icon: 'group', path: PATHS.ADMIN_USERS },
  { key: 'products', label: 'Sản phẩm', icon: 'inventory_2', path: PATHS.ADMIN_PRODUCTS },
  { key: 'brands', label: 'Thương hiệu', icon: 'storefront', path: PATHS.ADMIN_BRANDS },
  { key: 'categories', label: 'Danh mục', icon: 'category', path: PATHS.ADMIN_CATEGORIES },
  { key: 'ingredients', label: 'Thành phần', icon: 'science', path: PATHS.ADMIN_INGREDIENTS },
]

/**
 * Layout riêng cho Admin panel — sidebar trái tối (dark) + content chính bên phải.
 * Phong cách Stitch: clean, modern, dùng pink accent trên nền tối.
 */
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(PATHS.LOGIN)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Brand */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-700/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
            <Icon name="shield_person" className="text-white text-lg" />
          </div>
          <span className="font-semibold text-base tracking-tight">MSS Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {ADMIN_NAV.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.path}
                  end={item.path === PATHS.ADMIN_DASHBOARD}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-pink-500/20 !text-white shadow-sm'
                        : '!text-white hover:bg-gray-800',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={item.icon} filled={isActive} className="text-xl" />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer — back to user app + logout */}
        <div className="p-3 border-t border-gray-700/50 space-y-1">
          <NavLink
            to={PATHS.DASHBOARD}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white hover:bg-gray-800 hover:text-white transition-all"
          >
            <Icon name="arrow_back" className="text-xl" />
            <span>Về trang người dùng</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white hover:bg-red-500/15 hover:text-red-400 transition-all"
          >
            <Icon name="logout" className="text-xl" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Quản trị hệ thống</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
              <Icon name="person" className="text-pink-600 text-base" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
