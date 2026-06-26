import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import ProductCard from './components/ProductCard'
import { mapById, toArray, toProductCard } from './productUtils'
import { useFavoriteProducts, useComparedProducts } from './productCollections'

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
      .map((product) => toProductCard(product, brandMap, categoryMap))
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {favoriteCards.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              isFavorite
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
