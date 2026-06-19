import { useEffect, useMemo, useState } from 'react'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import ProductCard from './components/ProductCard'

const ALL_FILTER = 'Tất cả'

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]))
}

function uploadUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('/@fs/')) return value

  const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/')
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `/@fs/${encodeURI(normalized)}`
  }

  return ''
}

function resolveImageUrl(value) {
  return uploadUrl(value) || value || ''
}

function toProductCard(product, brandMap, categoryMap) {
  const brand = brandMap.get(product.brandId)
  const category = categoryMap.get(product.categoryId)
  const ingredientNames = (product.ingredients || [])
    .map((ingredient) => ingredient.name)
    .filter(Boolean)

  return {
    id: product.id,
    brand: brand?.name || product.brandId || 'Không rõ thương hiệu',
    name: product.name,
    category: category?.name || product.categoryId || 'Không rõ danh mục',
    categoryId: product.categoryId,
    price: money(product.price),
    ingredients: ingredientNames,
    reason: product.description || 'Sản phẩm chăm sóc da từ Product Service.',
    imageUrl: resolveImageUrl(product.imageUrl),
  }
}

export default function ProductsPage() {
  const [filter, setFilter] = useState(ALL_FILTER)
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let alive = true

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const [productRes, brandRes, categoryRes] = await Promise.all([
          productApi.listActiveProducts(),
          productApi.listActiveBrands(),
          productApi.listActiveCategories(),
        ])

        if (!alive) return

        setProducts(toArray(productRes))
        setBrands(toArray(brandRes))
        setCategories(toArray(categoryRes))
      } catch (err) {
        if (!alive) return
        setProducts([])
        setError(err?.message || 'Không tải được sản phẩm từ Product Service.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadProducts()

    return () => {
      alive = false
    }
  }, [])

  const brandMap = useMemo(() => mapById(brands), [brands])
  const categoryMap = useMemo(() => mapById(categories), [categories])

  const filters = useMemo(
    () => [ALL_FILTER, ...categories.map((category) => category.name).filter(Boolean)],
    [categories],
  )

  const visible = useMemo(() => {
    const selectedCategory = categories.find((category) => category.name === filter)

    return products
      .filter((product) => filter === ALL_FILTER || product.categoryId === selectedCategory?.id)
      .map((product) => toProductCard(product, brandMap, categoryMap))
  }, [brandMap, categoryMap, categories, filter, products])

  const handleViewDetails = async (productId) => {
    setSelectedProduct(null)
    setDetailError('')
    setDetailLoading(true)

    try {
      const product = await productApi.getProduct(productId)
      setSelectedProduct(product)
    } catch (err) {
      setDetailError(err?.message || 'Không tải được chi tiết sản phẩm.')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2">Gợi ý sản phẩm</h1>
        <p className="text-body-md text-on-surface-variant">
          Danh sách sản phẩm đang hoạt động lấy trực tiếp từ Product Service.
        </p>
      </div>

      <div className="flex items-center gap-3 bg-primary-light/60 border border-border-pink rounded-xl px-4 py-3 mb-6">
        <Icon name="insights" className="text-primary" />
        <p className="text-body-md text-on-surface-variant">
          Đang hiển thị <span className="font-medium text-on-surface">{visible.length}</span> sản phẩm.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={[
              'px-4 py-2 rounded-full text-label-md transition-all',
              filter === item
                ? 'gradient-bg text-white shadow-sm'
                : 'bg-surface-container-lowest border border-border-pink text-on-surface-variant hover:text-primary',
            ].join(' ')}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-72">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="border border-error/20 bg-error/5 rounded-xl px-4 py-5 text-body-md text-on-surface-variant">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-border-pink bg-surface-container-lowest rounded-xl px-4 py-8 text-center text-body-md text-on-surface-variant">
          Chưa có sản phẩm phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {visible.map((product) => (
            <ProductCard key={product.id} {...product} onViewDetails={handleViewDetails} />
          ))}
        </div>
      )}

      {(detailLoading || detailError || selectedProduct) && (
        <ProductDetailModal
          product={selectedProduct}
          brandName={brandMap.get(selectedProduct?.brandId)?.name || selectedProduct?.brandId || 'Không rõ thương hiệu'}
          categoryName={categoryMap.get(selectedProduct?.categoryId)?.name || selectedProduct?.categoryId || 'Không rõ danh mục'}
          loading={detailLoading}
          error={detailError}
          onClose={() => {
            setSelectedProduct(null)
            setDetailError('')
            setDetailLoading(false)
          }}
        />
      )}
    </div>
  )
}

function ProductDetailModal({ product, brandName, categoryName, loading, error, onClose }) {
  const imageSrc = resolveImageUrl(product?.imageUrl || product?.images?.[0])
  const ingredientRows = product?.ingredients || []

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-surface-container-lowest border border-border-pink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-pink">
          <div>
            <p className="text-caption text-on-surface-variant">Chi tiết sản phẩm</p>
            <h2 className="text-title-lg text-on-surface font-semibold">{product?.name || 'Sản phẩm'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-border-pink flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
            aria-label="Đóng"
          >
            <Icon name="close" className="text-xl" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="p-6 text-body-md text-error">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="bg-primary-light min-h-[280px] lg:min-h-full">
              {imageSrc ? (
                <img src={imageSrc} alt={product?.name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[280px] flex items-center justify-center">
                  <Icon name="science" className="text-7xl text-primary/50" />
                </div>
              )}
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-68px)]">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-primary-light text-tertiary text-caption">{brandName}</span>
                <span className="px-3 py-1 rounded-full bg-primary-light text-tertiary text-caption">{categoryName}</span>
                <span className="px-3 py-1 rounded-full bg-surface-soft text-on-surface-variant text-caption">
                  {product?.slug}
                </span>
              </div>

              <p className="text-body-lg text-on-surface mb-5">{product?.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <InfoRow label="Giá" value={product?.price != null ? `${Number(product.price).toLocaleString('vi-VN')}đ` : '-'} />
                <InfoRow label="Trạng thái" value={product?.isActive ? 'Đang hoạt động' : 'Không hoạt động'} />
              </div>

              <SectionTitle title="Mối quan tâm" />
              <TagList items={product?.targetConcerns || []} emptyText="Không có dữ liệu" />

              <SectionTitle title="Loại da phù hợp" />
              <TagList items={product?.targetSkinTypes || []} emptyText="Không có dữ liệu" />

              <SectionTitle title="Thành phần" />
              {ingredientRows.length > 0 ? (
                <div className="space-y-3">
                  {ingredientRows.map((ingredient) => (
                    <div key={ingredient.ingredientId || ingredient.name} className="rounded-xl border border-border-pink px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-on-surface">{ingredient.name}</p>
                          <p className="text-caption text-on-surface-variant">{ingredient.ingredientId}</p>
                        </div>
                        <div className="text-right text-caption text-on-surface-variant">
                          <p>{ingredient.isKey ? 'Thành phần chính' : 'Thành phần phụ'}</p>
                          <p>{ingredient.percentage != null ? `${ingredient.percentage}%` : '-'}</p>
                        </div>
                      </div>
                      {ingredient.concerns?.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ingredient.concerns.map((concern) => (
                            <span
                              key={concern}
                              className="px-2 py-1 rounded-full bg-surface-soft text-caption text-on-surface-variant"
                            >
                              {concern}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">Chưa có dữ liệu thành phần.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ title }) {
  return <h3 className="text-body-md font-semibold text-on-surface mt-6 mb-3">{title}</h3>
}

function TagList({ items, emptyText }) {
  if (!items || items.length === 0) {
    return <p className="text-body-md text-on-surface-variant">{emptyText}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="px-3 py-1 rounded-full bg-surface-soft text-caption text-on-surface-variant">
          {item}
        </span>
      ))}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-border-pink px-4 py-3">
      <p className="text-caption text-on-surface-variant mb-1">{label}</p>
      <p className="text-body-md text-on-surface">{value}</p>
    </div>
  )
}
