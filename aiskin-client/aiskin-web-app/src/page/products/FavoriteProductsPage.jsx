import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import { mapById, money, resolveImageUrl, toArray } from './productUtils'
import { useFavoriteProducts, useComparedProducts } from './productCollections'
import { translateTag } from './translator'

function FavoriteRow({ product, isCompared, onFavoriteToggle, onCompareToggle }) {
  const imageSrc = product.imageSrc || resolveImageUrl(product.imageUrl || product.images?.[0])
  const skinTypes = (product.targetSkinTypes || []).slice(0, 2).map(translateTag)
  const concerns = (product.targetConcerns || []).slice(0, 2).map(translateTag)

  return (
    <article className="grid gap-4 border-b border-border-pink px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_170px_220px] lg:items-center">
      <div className="flex min-w-0 gap-4">
        <Link
          to={product.slug ? `/products/${product.slug}` : '/products'}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border-pink bg-surface-container-lowest"
          aria-label={`Xem chi tiết ${product.name}`}
        >
          {imageSrc ? (
            <img src={imageSrc} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="spa" className="text-3xl text-primary/40" />
            </div>
          )}
        </Link>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-secondary">{product.brandName || 'AiSkin shop'}</p>
          <Link
            to={product.slug ? `/products/${product.slug}` : '/products'}
            className="mt-1 block line-clamp-2 text-base font-semibold text-on-surface hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-sm text-on-surface-variant">{product.categoryName || '-'}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {skinTypes.map((item) => (
              <span key={item} className="rounded-full bg-primary-light px-2.5 py-1 text-xs text-tertiary">
                {item}
              </span>
            ))}
            {concerns.map((item) => (
              <span key={item} className="rounded-full bg-surface-soft px-2.5 py-1 text-xs text-on-surface-variant">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between lg:block">
        <span className="text-sm text-on-surface-variant lg:hidden">Giá</span>
        <div>
          <p className="text-lg font-black text-on-surface">{money(product.price)}</p>
          <p className="text-xs text-on-surface-variant">Bấm để xem chi tiết</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
        <Link
          to={product.slug ? `/products/${product.slug}` : '/products'}
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-white hover:bg-tertiary sm:col-span-1"
        >
          <Icon name="visibility" className="text-base" />
          Xem chi tiết
        </Link>
        <button
          type="button"
          onClick={onFavoriteToggle}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border-pink bg-surface-container-lowest px-4 py-2 text-label-md text-on-surface-variant hover:text-primary"
        >
          <Icon name="favorite" filled className="text-base text-error" />
          Bỏ yêu thích
        </button>
        <button
          type="button"
          onClick={onCompareToggle}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-label-md font-semibold',
            isCompared
              ? 'bg-primary-light text-primary'
              : 'border border-border-pink bg-surface-container-lowest text-on-surface-variant hover:text-primary',
          ].join(' ')}
        >
          <Icon name={isCompared ? 'check_circle' : 'compare_arrows'} className="text-base" />
          {isCompared ? 'Đang so sánh' : 'So sánh'}
        </button>
      </div>
    </article>
  )
}

export default function FavoriteProductsPage() {
  const favorites = useFavoriteProducts()
  const compared = useComparedProducts()
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
        setError(err?.message || 'Không tải được danh sách yêu thích.')
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
  const favoriteCards = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]))
    return favorites.ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((product) => {
        const brand = brandMap.get(product.brandId)
        const category = categoryMap.get(product.categoryId)

        return {
          ...product,
          brandName: brand?.name || product.brandId || '-',
          categoryName: category?.name || product.categoryId || '-',
          imageSrc: resolveImageUrl(product.imageUrl || product.images?.[0]),
        }
      })
  }, [brandMap, categoryMap, favorites.ids, products])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-caption text-on-surface-variant mb-1">
            <Link to="/products" className="hover:text-primary">
              Sản phẩm
            </Link>
            <span className="mx-2">/</span>
            Yêu thích
          </p>
          <h1 className="text-headline-lg text-on-surface">Danh sách yêu thích</h1>
          <p className="text-body-md text-on-surface-variant">
            Lưu lại các sản phẩm bạn muốn xem sau.
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
            onClick={favorites.clear}
            disabled={favorites.count === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="delete" className="text-base" />
            Xóa hết
          </button>
          <Link
            to="/products/compare"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-label-md font-semibold hover:bg-tertiary"
          >
            <Icon name="compare_arrows" className="text-base" />
            So sánh ({compared.count})
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
      ) : favoriteCards.length === 0 ? (
        <div className="border border-border-pink bg-surface-container-lowest rounded-xl px-4 py-10 text-center">
          <Icon name="favorite_border" className="text-5xl text-primary/40 mb-3" />
          <p className="text-body-md text-on-surface-variant">Chưa có sản phẩm yêu thích nào.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white text-primary border border-primary text-label-md font-semibold hover:bg-primary-light"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(23,32,38,0.06)]">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_220px] bg-surface-container-low px-4 py-4 text-sm font-black text-on-surface lg:grid">
            <span>Sản phẩm</span>
            <span>Giá</span>
            <span className="text-right">Thao tác</span>
          </div>
          {favoriteCards.map((product) => (
            <FavoriteRow
              key={product.id}
              product={product}
              isCompared={compared.hasId(product.id)}
              onFavoriteToggle={() => favorites.toggle(product.id)}
              onCompareToggle={() => compared.toggle(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
