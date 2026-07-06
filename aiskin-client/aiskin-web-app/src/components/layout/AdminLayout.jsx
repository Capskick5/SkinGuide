import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PATHS } from '@/route/paths'
import Icon from '@/components/common/Icon'
import { useAuth } from '@/hook/useAuth'

const ADMIN_NAV_GROUPS = [
  {
    title: 'Tổng quan',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: PATHS.ADMIN_DASHBOARD },
    ],
  },
  {
    title: 'Kinh doanh',
    items: [
      { key: 'orders', label: 'Đơn hàng', icon: 'receipt_long', path: PATHS.ADMIN_ORDERS },
      { key: 'returns', label: 'Đơn khiếu nại', icon: 'assignment_return', path: PATHS.ADMIN_RETURNS },
      { key: 'products', label: 'Sản phẩm', icon: 'inventory_2', path: PATHS.ADMIN_PRODUCTS },
      { key: 'scans', label: 'Quét da', icon: 'document_scanner', path: PATHS.ADMIN_SCANS },
    ],
  },
  {
    title: 'Danh mục',
    items: [
      { key: 'brands', label: 'Thương hiệu', icon: 'storefront', path: PATHS.ADMIN_BRANDS },
      { key: 'categories', label: 'Danh mục', icon: 'category', path: PATHS.ADMIN_CATEGORIES },
      { key: 'ingredients', label: 'Thành phần', icon: 'science', path: PATHS.ADMIN_INGREDIENTS },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { key: 'users', label: 'Người dùng', icon: 'group', path: PATHS.ADMIN_USERS },
      { key: 'roles', label: 'Phân quyền', icon: 'admin_panel_settings', path: PATHS.ADMIN_ROLES },
    ],
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(PATHS.LOGIN)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950">
            <Icon name="shield_person" className="text-xl text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-950">SkinGuide Admin</p>
            <p className="text-xs font-medium text-gray-500">Operations Console</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {ADMIN_NAV_GROUPS.filter((group) => 
              user?.roles?.includes('ADMIN') ? true : group.title !== 'Hệ thống'
            ).map((group) => (
              <div key={group.title}>
                <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <NavLink
                        to={item.path}
                        end={item.path === PATHS.ADMIN_DASHBOARD}
                        className={({ isActive }) =>
                          [
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                            isActive
                              ? 'bg-gray-950 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950',
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
              </div>
            ))}
          </div>
        </nav>

        <div className="space-y-1 border-t border-gray-100 p-3">
          <NavLink
            to={PATHS.PRODUCTS}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
          >
            <Icon name="arrow_back" className="text-xl" />
            <span>Về trang người dùng</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="logout" className="text-xl" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div>
            <h2 className="text-base font-bold text-gray-950">Quản trị hệ thống</h2>
            <p className="text-xs text-gray-500">Doanh thu, đơn hàng, sản phẩm, người dùng và lượt quét da</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.fullName || 'Admin'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container">
              <Icon name="person" className="text-lg text-secondary" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
