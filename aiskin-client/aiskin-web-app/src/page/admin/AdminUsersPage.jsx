import { useEffect, useState, useCallback } from 'react'
import { Modal, message } from 'antd'
import Icon from '@/components/common/Icon'
import { adminApi } from '@/api/adminApi'

/**
 * Quản lý người dùng — liệt kê, tìm kiếm, gán role, kích hoạt/vô hiệu hóa.
 * Phong cách Stitch: bảng sạch, pill badges, action buttons nhỏ gọn.
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const pageSize = 10

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listUsers({ page, size: pageSize, sort: 'createdAt,desc' })
      setUsers(data.content || [])
      setTotalPages(data.totalPages || 0)
      setTotalElements(data.totalElements || 0)
    } catch (err) {
      message.error('Không tải được danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleToggleActive = async (user) => {
    const action = user.active ? 'deactivate' : 'activate'
    const label = user.active ? 'vô hiệu hóa' : 'kích hoạt'
    Modal.confirm({
      title: `Xác nhận ${label}`,
      content: `Bạn có chắc muốn ${label} tài khoản "${user.email}"?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: { className: 'bg-pink-500 hover:bg-pink-600' },
      onOk: async () => {
        try {
          await adminApi[action](user.id)
          message.success(`Đã ${label} tài khoản`)
          fetchUsers()
        } catch {
          message.error('Thao tác thất bại')
        }
      },
    })
  }

  const handleSetRole = async (user, role) => {
    try {
      await adminApi.setRole(user.id, role)
      message.success(`Đã gán role ${role} cho ${user.email}`)
      fetchUsers()
    } catch {
      message.error('Gán role thất bại')
    }
  }

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.fullName?.toLowerCase().includes(search.toLowerCase()),
      )
    : users

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng cộng {totalElements} tài khoản</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
          />
          <input
            type="text"
            placeholder="Tìm theo email, tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-7 h-7 border-3 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Người dùng</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Trạng thái</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Ngày tạo</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center shrink-0">
                          <Icon name="person" className="text-pink-500 text-sm" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.fullName || '—'}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.roles?.includes('ADMIN') ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                          <Icon name="shield_person" className="text-xs" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          <Icon name="person" className="text-xs" />
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          Vô hiệu
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Toggle role */}
                        {u.roles?.includes('ADMIN') ? (
                          <button
                            onClick={() => handleSetRole(u, 'USER')}
                            title="Hạ xuống User"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          >
                            <Icon name="arrow_downward" className="text-base" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetRole(u, 'ADMIN')}
                            title="Nâng lên Admin"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                          >
                            <Icon name="arrow_upward" className="text-base" />
                          </button>
                        )}
                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                          className={`p-1.5 rounded-lg transition-all ${
                            u.active
                              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <Icon name={u.active ? 'block' : 'check_circle'} className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">
                      Không tìm thấy người dùng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Trang {page + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
