import { useEffect, useState, useCallback } from 'react'
import { Modal, message } from 'antd'
import Icon from '@/components/common/Icon'
import Pagination from '@/components/common/Pagination'
import { productApi } from '@/api/productApi'

export default function AdminIngredientsPage() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', aliases: '', benefits: '',
    concerns: '', contraindications: '', ewgScore: '',
  })

  // Pagination state
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const fetchIngredients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productApi.listIngredients()
      setIngredients(Array.isArray(res) ? res : [])
    } catch {
      message.error('Không tải được danh sách thành phần')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await fetchIngredients()
    })()
  }, [fetchIngredients])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', aliases: '', benefits: '', concerns: '', contraindications: '', ewgScore: '' })
    setShowForm(true)
  }

  const openEdit = (i) => {
    setEditing(i)
    setForm({
      name: i.name || '',
      description: i.description || '',
      aliases: (i.aliases || []).join(', '),
      benefits: (i.benefits || []).join(', '),
      concerns: (i.concerns || []).join(', '),
      contraindications: (i.contraindications || []).join(', '),
      ewgScore: i.ewgScore?.toString() || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toArr = (s) => s ? s.split(',').map(x => x.trim()).filter(Boolean) : []
    const payload = {
      name: form.name,
      description: form.description,
      aliases: toArr(form.aliases),
      benefits: toArr(form.benefits),
      concerns: toArr(form.concerns),
      contraindications: toArr(form.contraindications),
      ewgScore: form.ewgScore ? parseInt(form.ewgScore) : null,
    }
    try {
      if (editing) {
        await productApi.updateIngredient(editing.id, payload)
        message.success('Cập nhật thành phần thành công')
      } else {
        await productApi.createIngredient(payload)
        message.success('Tạo thành phần thành công')
      }
      setShowForm(false)
      fetchIngredients()
    } catch {
      message.error('Thao tác thất bại')
    }
  }

  const handleDelete = (i) => {
    Modal.confirm({
      title: 'Xóa thành phần',
      content: `Bạn có chắc muốn xóa "${i.name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await productApi.deleteIngredient(i.id)
          message.success('Đã xóa thành phần')
          fetchIngredients()
        } catch {
          message.error('Xóa thất bại')
        }
      },
    })
  }

  const filtered = search
    ? ingredients.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.aliases?.some(a => a.toLowerCase().includes(search.toLowerCase())))
    : ingredients

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const getEwgColor = (score) => {
    if (!score && score !== 0) return 'bg-gray-100 text-gray-500'
    if (score <= 2) return 'bg-green-100 text-green-700'
    if (score <= 6) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thành phần</h1>
          <p className="text-sm text-gray-500 mt-1">{ingredients.length} thành phần</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text" placeholder="Tìm thành phần, alias..." value={search}
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tên thành phần</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Mô tả</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">EWG</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Benefits</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentItems.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Icon name="science" className="text-emerald-400 text-sm" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{i.name}</p>
                          {i.aliases?.length > 0 && (
                            <p className="text-xs text-gray-400 truncate max-w-[180px]">{i.aliases.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{i.description || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${getEwgColor(i.ewgScore)}`}>
                        {i.ewgScore ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(i.benefits || []).slice(0, 3).map((b, idx) => (
                          <span key={idx} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{b}</span>
                        ))}
                        {(i.benefits || []).length > 3 && (
                          <span className="text-xs text-gray-400">+{i.benefits.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(i)} title="Sửa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                          <Icon name="edit" className="text-base" />
                        </button>
                        <button onClick={() => handleDelete(i)} title="Xóa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Icon name="delete" className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Không có thành phần</td></tr>
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
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">{editing ? 'Sửa thành phần' : 'Thêm thành phần'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tên thành phần *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tên khác (phẩy cách)</label>
                <input type="text" value={form.aliases} onChange={e => setForm(f => ({...f, aliases: e.target.value}))}
                  placeholder="Vitamin C, L-Ascorbic Acid"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lợi ích (phẩy cách)</label>
                <input type="text" value={form.benefits} onChange={e => setForm(f => ({...f, benefits: e.target.value}))}
                  placeholder="brightening, anti-aging, antioxidant"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lưu ý / Concerns (phẩy cách)</label>
                <input type="text" value={form.concerns} onChange={e => setForm(f => ({...f, concerns: e.target.value}))}
                  placeholder="irritation, sun sensitivity"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Chống chỉ định (phẩy cách)</label>
                <input type="text" value={form.contraindications} onChange={e => setForm(f => ({...f, contraindications: e.target.value}))}
                  placeholder="retinol, AHA/BHA"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">EWG Score (1-10)</label>
                <input type="number" min="1" max="10" value={form.ewgScore} onChange={e => setForm(f => ({...f, ewgScore: e.target.value}))}
                  placeholder="1"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
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
