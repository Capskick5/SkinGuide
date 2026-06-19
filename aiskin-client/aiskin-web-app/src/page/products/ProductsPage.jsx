import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import ProductCard from './components/ProductCard'
import { mapById, toArray, toProductCard } from './productUtils'

const CATEGORY_ALL = 'all'
const SEARCH_FIELDS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'name', label: 'Tên sản phẩm' },
  { value: 'slug', label: 'Slug' },
  { value: 'brand', label: 'Thương hiệu' },
  { value: 'category', label: 'Danh mục' },
  { value: 'ingredient', label: 'Thành phần' },
  { value: 'concern', label: 'Mối quan tâm' },
]

function normalize(value) {
  return String(value || '').toLowerCase()
}

export default function ProductsPage() {
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_ALL)
  const [searchField, setSearchField] = useState('all')
  const [query, setQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const moreMenuRef = useRef(null)

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
        setProducts([])
        setError(err?.message || 'Không tải được sản phẩm từ Product Service.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const brandMap = useMemo(() => mapById(brands), [brands])
  const categoryMap = useMemo(() => mapById(categories), [categories])
  const filters = useMemo(
    () => [{ id: CATEGORY_ALL, name: 'Tất cả' }, ...categories],
    [categories],
  )
  const visibleFilters = useMemo(() => filters.slice(0, 8), [filters])
  const hiddenFilters = useMemo(() => filters.slice(8), [filters])
  const activeFilterName = useMemo(
    () => filters.find((item) => item.id === categoryFilter)?.name || 'Tất cả',
    [categoryFilter, filters],
  )

  const cards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const selectedCategory = categoryFilter === CATEGORY_ALL
      ? null
      : categories.find((category) => category.id === categoryFilter)

    return products
      .filter((product) => categoryFilter === CATEGORY_ALL || product.categoryId === selectedCategory?.id)
      .map((product) => toProductCard(product, brandMap, categoryMap))
      .filter((product) => {
        if (!normalizedQuery) return true
        const blob = product.searchBlob
        if (searchField === 'all') return blob.all.includes(normalizedQuery)
        return normalize(blob[searchField]).includes(normalizedQuery)
      })
  }, [brandMap, categoryMap, categoryFilter, categories, products, query, searchField])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2">Gợi ý sản phẩm</h1>
        <p className="text-body-md text-on-surface-variant">
          Tìm theo tên, slug, thương hiệu, danh mục, thành phần hoặc mối quan tâm.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px] gap-3">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/70 text-lg" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="h-11 px-3 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            {SEARCH_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 items-start">
          {visibleFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategoryFilter(item.id)}
              className={[
                'px-4 py-2 rounded-full text-label-md transition-all',
                categoryFilter === item.id
                  ? 'gradient-bg text-white shadow-sm'
                  : 'bg-surface-container-lowest border border-border-pink text-on-surface-variant hover:text-primary',
              ].join(' ')}
            >
              {item.name}
            </button>
          ))}

          {hiddenFilters.length > 0 ? (
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className={[
                  'px-4 py-2 rounded-full text-label-md transition-all inline-flex items-center gap-2',
                  hiddenFilters.some((item) => item.id === categoryFilter)
                    ? 'gradient-bg text-white shadow-sm'
                    : 'bg-surface-container-lowest border border-border-pink text-on-surface-variant hover:text-primary',
                ].join(' ')}
              >
                {hiddenFilters.some((item) => item.id === categoryFilter) ? activeFilterName : `Khác (${hiddenFilters.length})`}
                <Icon name={moreOpen ? 'expand_less' : 'expand_more'} className="text-base" />
              </button>

              {moreOpen ? (
                <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-border-pink bg-surface-container-lowest shadow-xl p-3">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <p className="text-caption text-on-surface-variant">Danh mục đầy đủ</p>
                    <button
                      type="button"
                      onClick={() => setMoreOpen(false)}
                      className="text-caption text-on-surface-variant hover:text-primary"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-auto pr-1">
                    {hiddenFilters.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(item.id)
                          setMoreOpen(false)
                        }}
                        className={[
                          'px-3 py-2 rounded-xl text-left text-label-md transition-all border',
                          categoryFilter === item.id
                            ? 'gradient-bg text-white border-transparent shadow-sm'
                            : 'border-border-pink text-on-surface-variant hover:text-primary hover:bg-primary-light/40',
                        ].join(' ')}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 bg-primary-light/60 border border-border-pink rounded-xl px-4 py-3 mb-6">
        <Icon name="insights" className="text-primary" />
        <p className="text-body-md text-on-surface-variant">
          Đang hiển thị <span className="font-medium text-on-surface">{cards.length}</span> sản phẩm.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-72">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="border border-error/20 bg-error/5 rounded-xl px-4 py-5 text-body-md text-on-surface-variant">
          {error}
        </div>
      ) : cards.length === 0 ? (
        <div className="border border-border-pink bg-surface-container-lowest rounded-xl px-4 py-8 text-center text-body-md text-on-surface-variant">
          Chưa có sản phẩm phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      )}
    </div>
  )
}
