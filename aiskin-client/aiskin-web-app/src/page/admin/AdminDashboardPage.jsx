import { useEffect, useState } from 'react'
import Icon from '@/components/common/Icon'
import { adminApi } from '@/api/adminApi'

const STAT_CARDS = [
  { key: 'users', label: 'Người dùng', icon: 'group', color: 'bg-blue-500' },
  { key: 'products', label: 'Sản phẩm', icon: 'inventory_2', color: 'bg-pink-500' },
  { key: 'brands', label: 'Thương hiệu', icon: 'storefront', color: 'bg-purple-500' },
  { key: 'categories', label: 'Danh mục', icon: 'category', color: 'bg-amber-500' },
]

/**
 * Admin Dashboard — tổng quan hệ thống.
 * Hiển thị thống kê nhanh và danh sách người dùng mới.
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, products: 0, brands: 0, categories: 0 })
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersPage] = await Promise.all([
          adminApi.listUsers({ page: 0, size: 5, sort: 'createdAt,desc' }),
        ])
        setRecentUsers(usersPage.content || [])
        setStats((s) => ({ ...s, users: usersPage.totalElements || 0 }))
      } catch (err) {
        console.error('Admin dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tổng quan hệ thống MSS SkinGuide</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats[card.key]}</p>
              </div>
              <div className={`w-11 h-11 ${card.color} rounded-xl flex items-center justify-center`}>
                <Icon name={card.icon} className="text-white text-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Người dùng mới nhất</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recentUsers.length === 0 ? (
            <p className="p-5 text-sm text-gray-400 text-center">Chưa có người dùng nào</p>
          ) : (
            recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center">
                    <Icon name="person" className="text-pink-500 text-base" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.fullName || u.email}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.roles?.includes('ADMIN') ? (
                    <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      User
                    </span>
                  )}
                  <span
                    className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
