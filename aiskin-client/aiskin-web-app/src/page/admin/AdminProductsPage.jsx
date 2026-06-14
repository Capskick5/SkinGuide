import { useEffect, useState, useCallback } from 'react'
import { Modal, message } from 'antd'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'

/**
 * Quản lý sản phẩm — CRUD, tìm kiếm, toggle active.
 */
export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    name: '', description: '', price: '', imageUrl: '', brandId: '', categoryId: '',
    targetConcerns: '', targetSkinTypes: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [prodRes, brandRes, catRes] = await Promise.all([
        productApi.listProducts(),
        productApi.listBrands(),
        productApi.listCategories(),
      ])
      setProducts(prodRes.data || [])
      setBrands(brandRes.data || [])
      setCategories(catRes.data || [])
    } catch {
      message.error('Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', price: '', imageUrl: '', brandId: '', categoryId: '', targetConcerns: '', targetSkinTypes: '' })
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price?.toString() || '',
      imageUrl: p.imageUrl || '',
      brandId: p.brandId || '',
      categoryId: p.categoryId || '',
      targetConcerns: (p.targetConcerns || []).join(', '),
      targetSkinTypes: (p.targetSkinTypes || []).join(', '),
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      imageUrl: form.imageUrl,
      brandId: form.brandId,
      categoryId: form.categoryId,
      targetConcerns: form.targetConcerns ? form.targetConcerns.split(',').map(s => s.trim()) : [],
      targetSkinTypes: form.targetSkinTypes ? form.targetSkinTypes.split(',').map(s => s.trim()) : [],
    }
    try {
      if (editing) {
        await productApi.updateProduct(editing.id, payload)
        message.success('Cập nhật sản phẩm thành công')
      } else {
        await productApi.createProduct(payload)
        message.success('Tạo sản phẩm thành công')
      }
      setShowForm(false)
      fetchData()
    } catch {
      message.error('Thao tác thất bại')
    }
  }

  const handleDelete = (p) => {
    Modal.confirm({
      title: 'Xóa sản phẩm',
      content: `Bạn có chắc muốn xóa "${p.name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await productApi.deleteProduct(p.id)
          message.success('Đã xóa sản phẩm')
          fetchData()
        } catch {
          message.error('Xóa thất bại')
        }
      },
    })
  }

  const filtered = search
    ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    : products

  const getBrandName = (id) => brands.find(b => b.id === id)?.name || '—'
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '—'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} sản phẩm</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text" placeholder="Tìm sản phẩm..." value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Sản phẩm</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Thương hiệu</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Danh mục</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Giá</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Trạng thái</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center">
                            <Icon name="inventory_2" className="text-pink-400 text-sm" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{getBrandName(p.brandId)}</td>
                    <td className="px-5 py-3 text-gray-600">{getCategoryName(p.categoryId)}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {p.price ? `${p.price.toLocaleString('vi-VN')}đ` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {p.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} title="Sửa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                          <Icon name="edit" className="text-base" />
                        </button>
                        <button onClick={() => handleDelete(p)} title="Xóa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Icon name="delete" className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Không có sản phẩm</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="close" className="text-xl" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <Field label="Tên sản phẩm *" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} />
              <Field label="Mô tả" value={form.description} onChange={v => setForm(f => ({...f, description: v}))} multiline />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Giá (VNĐ)" value={form.price} onChange={v => setForm(f => ({...f, price: v}))} type="number" />
                <Field label="Ảnh URL" value={form.imageUrl} onChange={v => setForm(f => ({...f, imageUrl: v}))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Thương hiệu *" value={form.brandId} onChange={v => setForm(f => ({...f, brandId: v}))} options={brands} />
                <SelectField label="Danh mục *" value={form.categoryId} onChange={v => setForm(f => ({...f, categoryId: v}))} options={categories} />
              </div>
              <Field label="Skin types (phẩy cách)" value={form.targetSkinTypes} onChange={v => setForm(f => ({...f, targetSkinTypes: v}))} placeholder="oily, dry, combination" />
              <Field label="Concerns (phẩy cách)" value={form.targetConcerns} onChange={v => setForm(f => ({...f, targetConcerns: v}))} placeholder="acne, dark_spots, wrinkles" />
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

function Field({ label, value, onChange, type = 'text', multiline, placeholder }) {
  const cls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className={cls} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400">
        <option value="">— Chọn —</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  )
}
