import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import { mapById, resolveImageUrl, toArray } from './productUtils'
import ProductCollectionButtons from './components/ProductCollectionButtons'
import { useComparedProducts, useFavoriteProducts } from './productCollections'

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const favorites = useFavoriteProducts()
  const compared = useComparedProducts()

  useEffect(() => {
    let alive = true

    void (async () => {
      setLoading(true)
      setError('')

      try {
        const [productRes, brandRes, categoryRes] = await Promise.all([
          productApi.getProductBySlug(slug),
          productApi.listActiveBrands(),
          productApi.listActiveCategories(),
        ])

        if (!alive) return

        setProduct(productRes)
        setBrands(toArray(brandRes))
        setCategories(toArray(categoryRes))
      } catch (err) {
        if (!alive) return
        setProduct(null)
        setError(err?.message || 'Không tải được chi tiết sản phẩm.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [slug])

  const brandMap = useMemo(() => mapById(brands), [brands])
  const categoryMap = useMemo(() => mapById(categories), [categories])

  const imageSrc = resolveImageUrl(product?.imageUrl || product?.images?.[0])
  const brandName = brandMap.get(product?.brandId)?.name || product?.brandId || 'Không rõ thương hiệu'
  const categoryName = categoryMap.get(product?.categoryId)?.name || product?.categoryId || 'Không rõ danh mục'
  const ingredientCount = product?.ingredients?.length || 0
  const concernCount = product?.targetConcerns?.length || 0
  const skinTypeCount = product?.targetSkinTypes?.length || 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-caption text-on-surface-variant mb-1">
            <Link to="/products" className="hover:text-primary">
              Sản phẩm
            </Link>
            <span className="mx-2">/</span>
            Chi tiết
          </p>
          <h1 className="text-headline-lg text-on-surface">{product?.name || 'Chi tiết sản phẩm'}</h1>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-pink bg-surface-container-lowest text-body-md text-on-surface-variant hover:text-primary"
        >
          <Icon name="arrow_back" className="text-lg" />
          Quay lại
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="border border-error/20 bg-error/5 rounded-lg px-4 py-5 text-body-md text-on-surface-variant">
          {error}
        </div>
      ) : !product ? (
        <div className="border border-border-pink bg-surface-container-lowest rounded-lg px-4 py-8 text-center text-body-md text-on-surface-variant">
          Không tìm thấy sản phẩm.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] gap-6">
          <div className="lg:sticky lg:top-6 h-fit rounded-xl overflow-hidden border border-border-pink bg-surface-container-lowest">
            <div className="relative aspect-[4/5] bg-primary-light">
              {imageSrc ? (
                <img src={imageSrc} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Icon name="science" className="text-7xl text-primary/50" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-px bg-border-pink">
              <MiniStat label="Mối quan tâm" value={concernCount} />
              <MiniStat label="Loại da" value={skinTypeCount} />
              <MiniStat label="Thành phần" value={ingredientCount} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-primary-light text-tertiary text-caption">{brandName}</span>
                <span className="px-3 py-1 rounded-full bg-primary-light text-tertiary text-caption">{categoryName}</span>
                <span className="px-3 py-1 rounded-full bg-surface-soft text-on-surface-variant text-caption">
                  {product.slug}
                </span>
                <span
                  className={[
                    'px-3 py-1 rounded-full text-caption',
                    product.isActive ? 'bg-success/10 text-success' : 'bg-surface-soft text-on-surface-variant',
                  ].join(' ')}
                >
                  {product.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
                </span>
              </div>

              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <h2 className="text-title-lg text-on-surface font-semibold">{product.name}</h2>
                  <div className="mt-3 rounded-lg border border-border-pink bg-surface-container-lowest px-4 py-3">
                    <p className="text-caption text-on-surface-variant mb-1">Mô tả</p>
                    <p className="text-body-md text-on-surface leading-6 whitespace-pre-line">
                      {product.description || 'Không có mô tả.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-lg border border-border-pink bg-surface-container-lowest px-4 py-3 min-w-[180px]">
                  <p className="text-caption text-on-surface-variant">Giá</p>
                  <p className="text-title-lg text-on-surface font-semibold">{money(product.price)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ProductCollectionButtons
                  compact={false}
                  favoriteLabel="Yêu thích"
                  compareLabel="So sánh"
                  isFavorite={favorites.hasId(product.id)}
                  isCompared={compared.hasId(product.id)}
                  onFavoriteToggle={() => favorites.toggle(product.id)}
                  onCompareToggle={() => compared.toggle(product.id)}
                />
                <Link
                  to="/products/favorites"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
                >
                  <Icon name="favorite" filled className="text-base" />
                  Danh sách yêu thích ({favorites.count})
                </Link>
                <Link
                  to="/products/compare"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
                >
                  <Icon name="compare_arrows" className="text-base" />
                  So sánh ({compared.count})
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Thương hiệu" value={brandName} />
              <InfoRow label="Danh mục" value={categoryName} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Mối quan tâm">
                <TagList items={product.targetConcerns || []} emptyText="Không có dữ liệu" />
              </Section>

              <Section title="Loại da phù hợp">
                <TagList items={product.targetSkinTypes || []} emptyText="Không có dữ liệu" />
              </Section>
            </div>

            <Section title="Bảng thành phần">
              {product.ingredients?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ingredient) => {
                    const hasConcerns = ingredient.concerns?.length > 0
                    return (
                      <span
                        key={ingredient.ingredientId || ingredient.name}
                        className={[
                          'px-3 py-1.5 rounded-lg border text-caption transition-colors',
                          hasConcerns
                            ? 'border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 cursor-help'
                            : 'border-border-pink bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary cursor-default'
                        ].join(' ')}
                        title={hasConcerns ? `Lưu ý: ${ingredient.concerns.join(', ')}` : undefined}
                      >
                        {ingredient.name}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">Chưa có dữ liệu thành phần.</p>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-body-md font-semibold text-on-surface mb-3">{title}</h3>
      {children}
    </section>
  )
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
    <div className="rounded-lg border border-border-pink px-4 py-3 bg-surface-container-lowest">
      <p className="text-caption text-on-surface-variant mb-1">{label}</p>
      <p className="text-body-md text-on-surface">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface-container-lowest px-4 py-3 text-center">
      <p className="text-title-md font-semibold text-on-surface">{value}</p>
      <p className="text-caption text-on-surface-variant">{label}</p>
    </div>
  )
}
