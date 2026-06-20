import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import { mapById, resolveImageUrl, toArray, money } from './productUtils'
import { useComparedProducts, useFavoriteProducts } from './productCollections'

function valueList(items) {
  if (!items || items.length === 0) return <span className="text-on-surface-variant">-</span>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="px-2.5 py-1 rounded-full bg-surface-soft text-caption text-on-surface-variant">
          {item}
        </span>
      ))}
    </div>
  )
}

export default function CompareProductsPage() {
  const compared = useComparedProducts()
  const favorites = useFavoriteProducts()
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    void (async () => {
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
        setError(err?.message || 'Không tải được dữ liệu so sánh.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const brandMap = useMemo(() => mapById(brands), [brands])
  const categoryMap = useMemo(() => mapById(categories), [categories])
  const selectedProducts = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]))
    return compared.ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((product) => ({
        ...product,
        brandName: brandMap.get(product.brandId)?.name || product.brandId || '-',
        categoryName: categoryMap.get(product.categoryId)?.name || product.categoryId || '-',
        imageSrc: resolveImageUrl(product.imageUrl || product.images?.[0]),
      }))
  }, [brandMap, categoryMap, compared.ids, products])

  const rows = [
    { label: 'Giá', render: (product) => <span className="font-semibold text-on-surface">{money(product.price)}</span> },
    { label: 'Thương hiệu', render: (product) => product.brandName },
    { label: 'Danh mục', render: (product) => product.categoryName },
    { label: 'Trạng thái', render: (product) => (product.isActive ? 'Đang hoạt động' : 'Không hoạt động') },
    { label: 'Mối quan tâm', render: (product) => valueList(product.targetConcerns || []) },
    { label: 'Loại da', render: (product) => valueList(product.targetSkinTypes || []) },
    {
      label: 'Thành phần tiêu biểu',
      render: (product) => valueList((product.ingredients || []).map((ingredient) => ingredient.name).filter(Boolean)),
    },
    {
      label: 'Mô tả',
      render: (product) => (
        <p className="text-body-sm text-on-surface-variant leading-6 line-clamp-4">
          {product.description || '-'}
        </p>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-caption text-on-surface-variant mb-1">
            <Link to="/products" className="hover:text-primary">
              Sản phẩm
            </Link>
            <span className="mx-2">/</span>
            So sánh
          </p>
          <h1 className="text-headline-lg text-on-surface">So sánh sản phẩm</h1>
          <p className="text-body-md text-on-surface-variant">
            Chọn tối đa 3 sản phẩm để đặt cạnh nhau và xem khác biệt nhanh.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
          >
            <Icon name="arrow_back" className="text-base" />
            Quay lại
          </Link>
          <button
            type="button"
            onClick={compared.clear}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
          >
            <Icon name="delete" className="text-base" />
            Xóa so sánh
          </button>
          <Link
            to="/products/favorites"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-label-md font-semibold hover:bg-tertiary"
          >
            <Icon name="favorite" filled className="text-base" />
            Yêu thích ({favorites.count})
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-72">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="border border-error/20 bg-error/5 rounded-xl px-4 py-5 text-body-md text-on-surface-variant">
          {error}
        </div>
      ) : selectedProducts.length < 2 ? (
        <div className="border border-border-pink bg-surface-container-lowest rounded-xl px-4 py-10 text-center">
          <Icon name="compare_arrows" className="text-5xl text-primary/40 mb-3" />
          <p className="text-body-md text-on-surface-variant">
            Cần chọn ít nhất 2 sản phẩm để so sánh.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-primary text-white text-label-md font-semibold hover:bg-tertiary"
          >
            Chọn sản phẩm
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedProducts.length}, minmax(0, 1fr))` }}>
            {selectedProducts.map((product) => (
              <div key={product.id} className="rounded-2xl border border-border-pink bg-surface-container-lowest overflow-hidden">
                <div className="relative aspect-[4/5] bg-primary-light">
                  {product.imageSrc ? (
                    <img src={product.imageSrc} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Icon name="science" className="text-6xl text-primary/50" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => compared.toggle(product.id)}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 text-error flex items-center justify-center shadow-sm hover:bg-white"
                    aria-label="Bỏ khỏi so sánh"
                    title="Bỏ khỏi so sánh"
                  >
                    <Icon name="close" className="text-xl" />
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-caption text-on-surface-variant">{product.brandName}</p>
                  <h2 className="text-body-lg font-semibold text-on-surface">{product.name}</h2>
                  <p className="text-title-md font-semibold text-on-surface">{money(product.price)}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-full bg-primary-light text-tertiary text-caption">
                      {product.categoryName}
                    </span>
                    <span className={[
                      'px-2.5 py-1 rounded-full text-caption',
                      product.isActive ? 'bg-success/10 text-success' : 'bg-surface-soft text-on-surface-variant',
                    ].join(' ')}>
                      {product.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-pink bg-surface-container-lowest">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-surface-soft">
                  <th className="text-left px-4 py-3 text-caption uppercase tracking-wide text-on-surface-variant w-52">Tiêu chí</th>
                  {selectedProducts.map((product) => (
                    <th key={product.id} className="text-left px-4 py-3 text-body-md font-semibold text-on-surface min-w-72">
                      {product.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-border-pink align-top">
                    <td className="px-4 py-4 text-body-md font-medium text-on-surface-variant bg-surface-container-lowest">
                      {row.label}
                    </td>
                    {selectedProducts.map((product) => (
                      <td key={`${row.label}-${product.id}`} className="px-4 py-4 text-body-md text-on-surface">
                        {row.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
