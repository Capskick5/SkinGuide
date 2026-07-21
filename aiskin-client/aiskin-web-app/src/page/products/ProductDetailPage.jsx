import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import { mapById, resolveImageUrl, toArray } from './productUtils'
import { useCart } from '@/hook/useCart'
import { useAuth } from '@/hook/useAuth'
import { PATHS } from '@/route/paths'
import { translateCategory, translateDescription, translateName, translateTag } from './translator'
import ProductReviews from './components/ProductReviews'

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

function compactText(value, maxLength = 260) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  const boundary = text.lastIndexOf(' ', maxLength)
  return `${text.slice(0, boundary > 120 ? boundary : maxLength).trim()}...`
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [product, setProduct] = useState(null)
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { addItem, items } = useCart()
  const { isAuthenticated } = useAuth()
  const [addedToCart, setAddedToCart] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showAllIngredients, setShowAllIngredients] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const activeVariants = (product?.variants || []).filter((variant) => variant.isActive !== false)
  // Tính tổng số lượng từ các biến thể hoặc lấy trực tiếp từ product
  const totalAvailableQuantity = product?.totalAvailableQuantity ?? product?.totalOnHandQuantity ?? activeVariants.reduce(
    (sum, v) => sum + Math.max(0, Number(v.availableQuantity || v.onHandQuantity || 0)), 0
  )
  
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId)
    || activeVariants.find((variant) => (
      variant.trackInventory === false
      || Number(variant.availableQuantity ?? variant.onHandQuantity ?? 0) > 0
    ))
    || activeVariants[0]
  const availableQuantity = selectedVariant
    ? Math.max(0, Number(selectedVariant.availableQuantity ?? selectedVariant.onHandQuantity ?? 0))
    : Math.max(0, Number(totalAvailableQuantity || 0))
  
  const tracksInventory = selectedVariant?.trackInventory !== false
  const outOfStock = tracksInventory && availableQuantity <= 0
  const inCart = items.some((item) => (
    item.id === product?.id && item.variantId === selectedVariant?.id
  ))

  function handleAddToCart() {
    if (!product || outOfStock) return
    if (!isAuthenticated) {
      navigate(PATHS.LOGIN, { state: { from: location } })
      return
    }
    addItem({
      id: product.id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || product.images?.[0],
      slug: product.slug,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      sku: selectedVariant?.sku,
      unit: selectedVariant?.unit,
      availableQuantity,
      trackInventory: selectedVariant?.trackInventory,
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  useEffect(() => {
    let alive = true

    void (async () => {
      setLoading(true)
      setError('')
      setShowFullDescription(false)
      setShowAllIngredients(false)

      try {
        const [productRes, brandRes, categoryRes] = await Promise.all([
          productApi.getProductBySlug(slug),
          productApi.listActiveBrands(),
          productApi.listActiveCategories(),
        ])

        if (!alive) return

        setProduct(productRes)
        const initialVariants = (productRes?.variants || []).filter((variant) => variant.isActive !== false)
        const initialVariant = initialVariants.find((variant) => (
          variant.trackInventory === false
          || Number(variant.availableQuantity ?? variant.onHandQuantity ?? 0) > 0
        )) || initialVariants[0]
        setSelectedVariantId(initialVariant?.id || '')
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

  const imageSrc = resolveImageUrl(selectedVariant?.imageUrl || product?.imageUrl || product?.images?.[0])
  const brandName = product?.brandName || brandMap.get(product?.brandId)?.name || 'Không rõ thương hiệu'
  const rawCategoryName = product?.categoryName || categoryMap.get(product?.categoryId)?.name || 'Không rõ danh mục'
  const categoryName = translateCategory(rawCategoryName)
  const productName = translateName(product?.name || '')
  const productDescription = translateDescription(product?.description || 'Không có mô tả.')
  const finalDescription = productDescription
  const shortDescription = compactText(finalDescription)
  const canExpandDescription = finalDescription.length > shortDescription.length
  const ingredientCount = product?.ingredients?.length || 0
  const displayedIngredients = showAllIngredients ? product?.ingredients || [] : (product?.ingredients || []).slice(0, 5)
  const hiddenIngredientCount = Math.max(0, ingredientCount - displayedIngredients.length)
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
                  <h2 className="text-title-lg text-on-surface font-semibold">{productName}</h2>
                  <div className="mt-3 rounded-lg border border-border-pink bg-surface-container-lowest px-4 py-3">
                    <p className="text-caption text-on-surface-variant mb-1">Mô tả</p>
                    <p className="text-body-md text-on-surface leading-6 whitespace-pre-line">
                      {showFullDescription ? finalDescription : shortDescription}
                    </p>
                    {canExpandDescription ? (
                      <button
                        type="button"
                        onClick={() => setShowFullDescription((value) => !value)}
                        className="mt-3 inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:text-secondary"
                      >
                        {showFullDescription ? 'Thu gọn' : 'Xem thêm mô tả'}
                        <Icon name={showFullDescription ? 'expand_less' : 'expand_more'} className="text-base" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 rounded-lg border border-border-pink bg-surface-container-lowest px-4 py-3 min-w-[180px]">
                  <p className="text-caption text-on-surface-variant">Giá</p>
                  <p className="text-title-lg text-on-surface font-semibold">{money(selectedVariant?.price || product.price)}</p>
                </div>
              </div>
              {activeVariants.length > 1 ? (
                <div className="mt-4 max-w-sm">
                  <label htmlFor="product-variant" className="mb-1.5 block text-caption font-semibold text-on-surface-variant">
                    Chọn phiên bản
                  </label>
                  <select
                    id="product-variant"
                    value={selectedVariant?.id || ''}
                    onChange={(event) => setSelectedVariantId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-border-pink bg-white px-3 text-body-md text-on-surface outline-none focus:border-primary"
                  >
                    {activeVariants.map((variant) => {
                      const stock = Math.max(0, Number(variant.availableQuantity ?? variant.onHandQuantity ?? 0))
                      const stockLabel = variant.trackInventory === false ? 'Đang bán' : stock > 0 ? `Còn ${stock}` : 'Hết hàng'
                      return <option key={variant.id} value={variant.id}>{variant.name} - {stockLabel}</option>
                    })}
                  </select>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {tracksInventory ? (
                  <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${outOfStock ? 'border-error/20 bg-error/5 text-error' : 'border-success/20 bg-success/5 text-success'}`}>
                    <Icon name={outOfStock ? 'remove_shopping_cart' : 'inventory_2'} className="text-lg" />
                    {outOfStock ? 'Hết hàng' : `Còn ${availableQuantity} sản phẩm`}
                    {selectedVariant?.name ? <span className="font-normal opacity-80">· {selectedVariant.name}</span> : null}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  id="product-add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={addedToCart || outOfStock}
                  className={[
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-label-md transition-all shadow-ambient-pink active:scale-95',
                    outOfStock
                      ? 'cursor-not-allowed bg-surface-container text-on-surface-variant shadow-none'
                      : addedToCart
                        ? 'bg-success text-white'
                        : 'gradient-bg text-white hover:opacity-90',
                  ].join(' ')}
                >
                  <Icon name={outOfStock ? 'remove_shopping_cart' : addedToCart ? 'check' : 'add_shopping_cart'} className="text-base" />
                  {outOfStock ? 'Hết hàng' : !isAuthenticated ? 'Đăng nhập để mua' : addedToCart ? 'Đã thêm!' : inCart ? 'Thêm nữa' : 'Thêm vào giỏ'}
                </button>

                <Link
                  to="/cart"
                  onClick={(event) => {
                    if (!isAuthenticated) {
                      event.preventDefault()
                      navigate(PATHS.LOGIN, { state: { from: location } })
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary-light text-primary text-label-md font-medium hover:bg-primary hover:text-white transition-all"
                >
                  <Icon name="shopping_cart" className="text-base" />
                  Xem giỏ hàng
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Thương hiệu" value={brandName} />
              <InfoRow label="Danh mục" value={categoryName} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Mối quan tâm">
                <TagList items={(product.targetConcerns || []).map(translateTag)} emptyText="Không có dữ liệu" />
              </Section>

              <Section title="Loại da phù hợp">
                <TagList items={(product.targetSkinTypes || []).map(translateTag)} emptyText="Không có dữ liệu" />
              </Section>
            </div>

            <Section title="Bảng thành phần">
              {product.ingredients?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {displayedIngredients.map((ingredient) => {
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
                  {hiddenIngredientCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllIngredients(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-caption font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                    >
                      <Icon name="add" className="text-base" />
                      {hiddenIngredientCount}
                    </button>
                  ) : showAllIngredients && ingredientCount > 5 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllIngredients(false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border-pink bg-surface-container-lowest px-3 py-1.5 text-caption font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                    >
                      <Icon name="remove" className="text-base" />
                      Thu gọn
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-body-md text-on-surface-variant">Chưa có dữ liệu thành phần.</p>
              )}
            </Section>

            <ProductReviews productId={product.id} isAuthenticated={isAuthenticated} />
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
