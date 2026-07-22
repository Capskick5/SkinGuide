import { useEffect, useState, useCallback } from 'react'
import { Modal, message } from 'antd'
import Icon from '@/components/common/Icon'
import Pagination from '@/components/common/Pagination'
import { productApi } from '@/api/productApi'

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', country: '', description: '', logoUrl: '' })
  
  // Pagination state
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productApi.listBrands()
      setBrands(Array.isArray(res) ? res : [])
    } catch {
      message.error('Không tải được danh sách thương hiệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await fetchBrands()
    })()
  }, [fetchBrands])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', country: '', description: '', logoUrl: '' })
    setShowForm(true)
  }

  const openEdit = (b) => {
    setEditing(b)
    setForm({
      name: b.name || '',
      country: b.country || '',
      description: b.description || '',
      logoUrl: b.logoUrl || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await productApi.updateBrand(editing.id, form)
        message.success('Cập nhật thương hiệu thành công')
      } else {
        await productApi.createBrand(form)
        message.success('Tạo thương hiệu thành công')
      }
      setShowForm(false)
      fetchBrands()
    } catch {
      message.error('Thao tác thất bại')
    }
  }

  const handleDelete = (b) => {
    Modal.confirm({
      title: 'Xóa thương hiệu',
      content: `Bạn có chắc muốn xóa "${b.name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await productApi.deleteBrand(b.id)
          message.success('Đã xóa thương hiệu')
          fetchBrands()
        } catch {
          message.error('Xóa thất bại')
        }
      },
    })
  }

  const filtered = search
    ? brands.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()))
    : brands

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thương hiệu</h1>
          <p className="text-sm text-gray-500 mt-1">{brands.length} thương hiệu</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Tìm thương hiệu..."
              value={search}
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

      {/* Grid Cards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-7 h-7 border-3 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">Không có thương hiệu</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {currentItems.map((b) => (
              <div key={b.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt={`Logo ${b.name}`} loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-contain bg-gray-50 p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                      <Icon name="storefront" className="text-pink-400 text-xl" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{b.name}</h3>
                    {b.country && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Icon name="location_on" className="text-xs" />{b.country}
                      </p>
                    )}
                  </div>
                </div>
                {b.description && (
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{b.description}</p>
                )}
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => openEdit(b)} title="Sửa"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <Icon name="edit" className="text-base" />
                  </button>
                  <button onClick={() => handleDelete(b)} title="Xóa"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Icon name="delete" className="text-base" />
                  </button>
                </div>
              </div>
            ))}
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
              <h3 className="font-semibold text-gray-900">{editing ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tên thương hiệu *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quốc gia</label>
                <input type="text" value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))}
                  placeholder="Hàn Quốc, Nhật Bản, Pháp..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Logo URL</label>
                <input type="text" value={form.logoUrl} onChange={e => setForm(f => ({...f, logoUrl: e.target.value}))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Hủy</button>
              <button type="submit"
                className="px-5 py-2 bg-pink-500 text-white text-sm font-medium rounded-xl hover:bg-pink-600 transition-all">
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
