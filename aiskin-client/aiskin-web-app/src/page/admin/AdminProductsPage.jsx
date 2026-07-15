import { useEffect, useMemo, useState, useCallback } from 'react'
import { Modal, message } from 'antd'
import Icon from '@/components/common/Icon'
import Pagination from '@/components/common/Pagination'
import { productApi } from '@/api/productApi'

const SEARCH_FIELDS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'name', label: 'Tên sản phẩm' },
  { value: 'slug', label: 'Slug' },
  { value: 'brand', label: 'Thương hiệu' },
  { value: 'category', label: 'Danh mục' },
  { value: 'ingredient', label: 'Thành phần' },
  { value: 'concern', label: 'Mối quan tâm' },
]

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  images: [],
  brandId: '',
  categoryId: '',
  targetConcerns: [],
  targetSkinTypes: [],
  keyIngredientIds: [],
  variants: [],
}

function createEmptyVariant() {
  return {
    id: '',
    name: '',
    sku: '',
    price: '',
    imageUrl: '',
    volume: '',
    unit: '',
    isActive: true,
    trackInventory: true,
    lowStockThreshold: '5',
    inventoryLevels: [
      {
        warehouseId: 'MAIN_WAREHOUSE',
        warehouseName: 'Kho chính',
        onHandQuantity: '0',
        reservedQuantity: '0',
        soldQuantity: '0',
      },
    ],
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

function parseTokens(text) {
  return String(text || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
}

function uniqueTokens(items) {
  return [...new Set(items.filter(Boolean))]
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchField, setSearchField] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const [brandRes, catRes, ingRes] = await Promise.all([
        productApi.listBrands(),
        productApi.listCategories(),
        productApi.listIngredients(),
      ])
      setBrands(toArray(brandRes))
      setCategories(toArray(catRes))
      setIngredients(toArray(ingRes))
    } catch {
      message.error('Không tải được dữ liệu cấu hình')
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      let isActiveParam = ''
      if (statusFilter === 'active') isActiveParam = true
      else if (statusFilter === 'inactive') isActiveParam = false

      const res = await productApi.searchAdvancedProducts({
          query: debouncedSearch,
          searchField,
          isActive: isActiveParam,
          page,
          size: 15,
        }, { auth: true })
      setProducts(res?.content || [])
      setTotalPages(res?.totalPages || 1)
      setTotalElements(res?.totalElements || 0)
    } catch {
      message.error('Không tải được danh sách sản phẩm')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, searchField, statusFilter, page])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchData])

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchProducts(), 0)
    return () => window.clearTimeout(timer)
  }, [fetchProducts])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const brandMap = useMemo(() => new Map(brands.map((item) => [item.id, item])), [brands])
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories])
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = async (product) => {
    let source = product
    try {
      source = await productApi.getProduct(product.id, { auth: true })
    } catch {
      message.warning('Không tải được chi tiết sản phẩm, đang dùng dữ liệu trên danh sách')
    }

    setEditing(source)
    setForm({
      name: source.name || '',
      description: source.description || '',
      price: source.price?.toString() || '',
      imageUrl: source.imageUrl || '',
      images: source.images || [],
      brandId: source.brandId || '',
      categoryId: source.categoryId || '',
      targetConcerns: source.targetConcerns || [],
      targetSkinTypes: source.targetSkinTypes || [],
      keyIngredientIds: source.keyIngredientIds || [],
      variants: (source.variants || []).map((variant) => ({
        id: variant.id || '',
        name: variant.name || '',
        sku: variant.sku || '',
        price: variant.price?.toString() || '',
        imageUrl: variant.imageUrl || '',
        volume: variant.volume || '',
        unit: variant.unit || '',
        isActive: variant.isActive !== false,
        trackInventory: variant.trackInventory !== false,
        lowStockThreshold: variant.lowStockThreshold?.toString() || '5',
        inventoryLevels: (variant.inventoryLevels?.length ? variant.inventoryLevels : [{
          warehouseId: 'MAIN_WAREHOUSE',
          warehouseName: 'Kho chính',
          onHandQuantity: 0,
          reservedQuantity: 0,
          soldQuantity: 0,
        }]).map((level) => ({
          warehouseId: level.warehouseId || 'MAIN_WAREHOUSE',
          warehouseName: level.warehouseName || 'Kho chính',
          onHandQuantity: level.onHandQuantity?.toString() || '0',
          reservedQuantity: level.reservedQuantity?.toString() || '0',
          soldQuantity: level.soldQuantity?.toString() || '0',
        })),
      })),
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
      images: form.images,
      brandId: form.brandId,
      categoryId: form.categoryId,
      targetConcerns: form.targetConcerns,
      targetSkinTypes: form.targetSkinTypes,
      keyIngredientIds: form.keyIngredientIds,
      variants: form.variants.map((variant) => ({
        id: variant.id || null,
        name: variant.name || 'Default',
        sku: variant.sku,
        price: parseFloat(variant.price) || parseFloat(form.price) || 0,
        imageUrl: variant.imageUrl || form.imageUrl,
        volume: variant.volume,
        unit: variant.unit,
        isActive: variant.isActive,
        trackInventory: variant.trackInventory,
        lowStockThreshold: parseInt(variant.lowStockThreshold, 10) || 0,
        inventoryLevels: (variant.inventoryLevels || []).map((level) => ({
          warehouseId: level.warehouseId || 'MAIN_WAREHOUSE',
          warehouseName: level.warehouseName || 'Kho chính',
          onHandQuantity: parseInt(level.onHandQuantity, 10) || 0,
          reservedQuantity: parseInt(level.reservedQuantity, 10) || 0,
          soldQuantity: parseInt(level.soldQuantity, 10) || 0,
        })),
      })),
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
      fetchProducts()
    } catch {
      message.error('Thao tác thất bại')
    }
  }

  const handleDelete = (product) => {
    Modal.confirm({
      title: 'Xóa sản phẩm',
      content: `Bạn có chắc muốn xóa "${product.name}"?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await productApi.deleteProduct(product.id)
          message.success('Đã xóa sản phẩm')
          fetchProducts()
        } catch {
          message.error('Xóa thất bại')
        }
      },
    })
  }

  const filtered = products

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">{totalElements} sản phẩm</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-3">
            <div className="relative w-full sm:w-72 lg:w-[26rem]">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={search}
                onChange={(e) => {
                  setPage(1)
                  setSearch(e.target.value)
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
              />
            </div>
            <select
              value={searchField}
              onChange={(e) => {
                setPage(1)
                setSearchField(e.target.value)
              }}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
            >
              {SEARCH_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1)
              setStatusFilter(e.target.value)
            }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-pink-500 text-white text-sm font-medium rounded-xl hover:bg-pink-600 transition-all shrink-0"
          >
            <Icon name="add" className="text-lg" />
            Thêm mới
          </button>
        </div>
      </div>

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
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kho</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Trạng thái</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-pink-50 flex items-center justify-center">
                            <Icon name="inventory_2" className="text-pink-400 text-sm" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{brandMap.get(product.brandId)?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{categoryMap.get(product.categoryId)?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium">
                      {product.price ? `${product.price.toLocaleString('vi-VN')}đ` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs">
                        <p className="font-semibold text-gray-800">Còn bán: {product.totalAvailableQuantity ?? 0}</p>
                        <p className="text-gray-400">Tồn: {product.totalOnHandQuantity ?? 0} · Giữ: {product.totalReservedQuantity ?? 0}</p>
                        {product.hasLowStock ? <p className="mt-1 text-amber-600 font-medium">Sắp hết hàng</p> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          title="Sửa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Icon name="edit" className="text-base" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          title="Xóa"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Icon name="delete" className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                      Không có sản phẩm
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {totalPages > 0 && (
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
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[88vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <Icon name="close" className="text-xl" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              <Field label="Tên sản phẩm *" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
              <Field label="Mô tả" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} multiline />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Giá (VNĐ)" value={form.price} onChange={(value) => setForm((prev) => ({ ...prev, price: value }))} type="number" />
                <Field label="Ảnh chính URL" value={form.imageUrl} onChange={(value) => setForm((prev) => ({ ...prev, imageUrl: value }))} />
              </div>

              <ArrayField
                label="Ảnh phụ"
                value={form.images}
                onChange={(value) => setForm((prev) => ({ ...prev, images: value }))}
                placeholder="Dán URL rồi Enter"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Thương hiệu *"
                  value={form.brandId}
                  onChange={(value) => setForm((prev) => ({ ...prev, brandId: value }))}
                  options={brands}
                />
                <SelectField
                  label="Danh mục *"
                  value={form.categoryId}
                  onChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}
                  options={categories}
                />
              </div>

              <ArrayField
                label="Mối quan tâm"
                value={form.targetConcerns}
                onChange={(value) => setForm((prev) => ({ ...prev, targetConcerns: value }))}
                placeholder="acne, dark_spots, wrinkles"
              />

              <ArrayField
                label="Loại da phù hợp"
                value={form.targetSkinTypes}
                onChange={(value) => setForm((prev) => ({ ...prev, targetSkinTypes: value }))}
                placeholder="oily, dry, combination"
              />

              <ArrayField
                label="Key ingredient IDs"
                value={form.keyIngredientIds}
                onChange={(value) => setForm((prev) => ({ ...prev, keyIngredientIds: value }))}
                placeholder="ing_001, ing_002"
                suggestions={ingredients}
                suggestionLabel={(ingredient) => `${ingredient.name} (${ingredient.id})`}
                suggestionValue={(ingredient) => ingredient.id}
              />

              <VariantField
                value={form.variants}
                onChange={(value) => setForm((prev) => ({ ...prev, variants: value }))}
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-pink-500 text-white text-sm font-medium rounded-xl hover:bg-pink-600 transition-all"
              >
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function VariantField({ value, onChange }) {
  const variants = value || []

  const updateVariant = (index, patch) => {
    onChange(variants.map((variant, currentIndex) => (
      currentIndex === index ? { ...variant, ...patch } : variant
    )))
  }

  const updateInventory = (variantIndex, levelIndex, patch) => {
    const variant = variants[variantIndex]
    const levels = variant.inventoryLevels || []
    updateVariant(variantIndex, {
      inventoryLevels: levels.map((level, currentIndex) => (
        currentIndex === levelIndex ? { ...level, ...patch } : level
      )),
    })
  }

  const addVariant = () => {
    onChange([...variants, createEmptyVariant()])
  }

  const removeVariant = (index) => {
    onChange(variants.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <section className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Biến thể & tồn kho</h4>
          <p className="text-xs text-gray-500 mt-1">Ví dụ: chai 50ml, chai 100ml. Mỗi biến thể có SKU và tồn kho riêng.</p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-pink-200 text-xs font-medium text-pink-600 hover:bg-pink-50"
        >
          <Icon name="add" className="text-sm" />
          Thêm variant
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-500">
          Chưa có variant. Nếu để trống, backend sẽ tự tạo variant mặc định cho sản phẩm mới.
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((variant, index) => {
            const level = variant.inventoryLevels?.[0] || createEmptyVariant().inventoryLevels[0]
            return (
              <div key={variant.id || index} className="rounded-xl border border-gray-100 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Variant #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Xóa variant
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Tên variant" value={variant.name} onChange={(name) => updateVariant(index, { name })} placeholder="Chai 100ml" />
                  <Field label="SKU" value={variant.sku} onChange={(sku) => updateVariant(index, { sku })} placeholder="SRM-A-100ML" />
                  <Field label="Giá variant" value={variant.price} onChange={(price) => updateVariant(index, { price })} type="number" />
                  <Field label="Ảnh variant URL" value={variant.imageUrl} onChange={(imageUrl) => updateVariant(index, { imageUrl })} />
                  <Field label="Dung tích" value={variant.volume} onChange={(volume) => updateVariant(index, { volume })} placeholder="100" />
                  <Field label="Đơn vị" value={variant.unit} onChange={(unit) => updateVariant(index, { unit })} placeholder="ml" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Tồn kho" value={level.onHandQuantity} onChange={(onHandQuantity) => updateInventory(index, 0, { onHandQuantity })} type="number" />
                  <Field label="Đang giữ" value={level.reservedQuantity} onChange={(reservedQuantity) => updateInventory(index, 0, { reservedQuantity })} type="number" />
                  <Field label="Đã bán" value={level.soldQuantity} onChange={(soldQuantity) => updateInventory(index, 0, { soldQuantity })} type="number" />
                  <Field label="Cảnh báo thấp" value={variant.lowStockThreshold} onChange={(lowStockThreshold) => updateVariant(index, { lowStockThreshold })} type="number" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Warehouse ID" value={level.warehouseId} onChange={(warehouseId) => updateInventory(index, 0, { warehouseId })} />
                  <Field label="Tên kho" value={level.warehouseName} onChange={(warehouseName) => updateInventory(index, 0, { warehouseName })} />
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={variant.trackInventory}
                    onChange={(e) => updateVariant(index, { trackInventory: e.target.checked })}
                    className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                  />
                  Theo dõi tồn kho cho variant này
                </label>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', multiline, placeholder }) {
  const cls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400'
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
      >
        <option value="">— Chọn —</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function ArrayField({
  label,
  value,
  onChange,
  placeholder,
  suggestions = [],
  suggestionLabel,
  suggestionValue,
}) {
  const [draft, setDraft] = useState('')

  const addTokens = (text) => {
    const tokens = parseTokens(text)
    if (tokens.length === 0) return
    onChange(uniqueTokens([...(value || []), ...tokens]))
    setDraft('')
  }

  const handleSuggestion = (item) => {
    const token = suggestionValue ? suggestionValue(item) : item
    onChange(uniqueTokens([...(value || []), token]))
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTokens(draft)
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
        />
        <button
          type="button"
          onClick={() => addTokens(draft)}
          className="px-4 py-2.5 rounded-xl border border-pink-200 text-pink-600 hover:bg-pink-50 text-sm"
        >
          Thêm
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(value || []).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange((value || []).filter((current) => current !== item))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-pink-50 text-pink-700 text-xs"
          >
            {item}
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.slice(0, 12).map((item) => {
            const token = suggestionValue ? suggestionValue(item) : item
            const labelText = suggestionLabel ? suggestionLabel(item) : String(item)
            return (
              <button
                key={token}
                type="button"
                onClick={() => handleSuggestion(item)}
                className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-pink-300 hover:text-pink-700 hover:bg-pink-50"
              >
                {labelText}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
