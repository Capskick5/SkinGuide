import { useEffect, useState, useCallback } from 'react'
import { Modal, message } from 'antd'
import Icon from '@/components/common/Icon'
import Pagination from '@/components/common/Pagination'
import { productApi } from '@/api/productApi'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', displayOrder: 0 })

  // Pagination state
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productApi.listCategories()
      setCategories(Array.isArray(res) ? res : [])
    } catch {
      message.error('Không tải được danh sách danh mục')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await fetchCategories()
    })()
  }, [fetchCategories])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', displayOrder: '' })
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name || '',
      description: c.description || '',
      displayOrder: c.displayOrder?.toString() || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description,
      displayOrder: form.displayOrder ? parseInt(form.displayOrder) : 0,
    }
    try {
      if (editing) {
        await productApi.updateCategory(editing.id, payload)
        message.success('Cập nhật danh mục thành công')
      } else {
        await productApi.createCategory(payload)
        message.success('Tạo danh mục thành công')
      }
      setShowForm(false)
      fetchCategories()
    } catch {
      message.error('Thao tác thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (c) => {
    Modal.confirm({
      title: 'Xóa danh mục',
      content: `Bạn có chắc muốn xóa "${c.name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await productApi.deleteCategory(c.id)
          message.success('Đã xóa danh mục')
          fetchCategories()
        } catch {
          message.error('Xóa thất bại')
        }
      },
    })
  }

  const filtered = search
    ? categories.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
    : categories

  // Sort by displayOrder
  const sorted = [...filtered].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const currentItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý danh mục</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} danh mục</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text" placeholder="Tìm danh mục..." value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
            />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-500 text-white text-sm font-medium rounded-xl hover:bg-pink-600 transition-all shrink-0">
            <Icon name="add" className="text-lg" />
            Thêm mới
          </button>
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500 w-16">Thứ tự</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tên danh mục</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Mô tả</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Slug</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-pink-50 text-pink-600 text-xs font-bold">
                        {c.displayOrder || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Icon name="category" className="text-purple-400 text-sm" />
                        </div>
                        <span className="font-medium text-gray-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{c.description || '—'}</td>
                    <td className="px-5 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{c.slug}</code>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} title="Sửa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                          <Icon name="edit" className="text-base" />
                        </button>
                        <button onClick={() => handleDelete(c)} title="Xóa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Icon name="delete" className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Không có danh mục</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/30">
            <Pagination 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
              containerClass="!shadow-none !border-0 !bg-transparent !p-0"
            />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Đóng biểu mẫu" className="text-gray-400 hover:text-gray-600">
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tên danh mục *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Thứ tự hiển thị</label>
                <input type="number" value={form.displayOrder} onChange={e => setForm(f => ({...f, displayOrder: e.target.value}))}
                  placeholder="0" min="0"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Hủy</button>
              <button type="submit" disabled={saving}
                className="inline-flex min-w-24 items-center justify-center gap-2 px-5 py-2 bg-pink-500 text-white text-sm font-medium rounded-xl hover:bg-pink-600 transition-all disabled:cursor-wait disabled:opacity-60">
                {saving && <Icon name="progress_activity" className="animate-spin text-base" />}
                {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
