import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import ProductCard from './components/ProductCard'
import { mapById, toArray, toProductCard } from './productUtils'
import { useComparedProducts, useFavoriteProducts } from './productCollections'

const CATEGORY_ALL = 'all'
const PAGE_SIZE = 12

const SEARCH_FIELDS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'name', label: 'Tên sản phẩm' },
  { value: 'slug', label: 'Slug' },
  { value: 'brand', label: 'Thương hiệu' },
  { value: 'category', label: 'Danh mục' },
  { value: 'ingredient', label: 'Thành phần' },
  { value: 'concern', label: 'Mối quan tâm' },
]

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Độ phù hợp' },
  { value: 'name-asc', label: 'Tên A-Z' },
  { value: 'name-desc', label: 'Tên Z-A' },
  { value: 'price-asc', label: 'Giá thấp đến cao' },
  { value: 'price-desc', label: 'Giá cao đến thấp' },
]

function normalize(value) {
  return String(value || '').toLowerCase()
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = []
  const start = Math.max(2, currentPage - 2)
  const end = Math.min(totalPages - 1, currentPage + 2)

  pages.push(1)
  if (start > 2) pages.push('...')

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (end < totalPages - 1) pages.push('...')
  pages.push(totalPages)
  return pages
}

export default function ProductsPage() {
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_ALL)
  const [searchField, setSearchField] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const moreMenuRef = useRef(null)
  const favorites = useFavoriteProducts()
  const compared = useComparedProducts()

  // 1. Chỉ load danh mục và thương hiệu 1 lần lúc đầu
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [brandRes, categoryRes] = await Promise.all([
          productApi.listActiveBrands(),
          productApi.listActiveCategories(),
        ])
        if (!alive) return
        setBrands(toArray(brandRes))
        setCategories(toArray(categoryRes))
      } catch (err) {
        console.error('Không tải được danh mục/thương hiệu', err)
      }
    })()
    return () => { alive = false }
  }, [])

  // 2. Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  // 3. Load sản phẩm theo phân trang/bộ lọc từ API server
  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const res = await productApi.searchAdvancedProducts({
          query: debouncedQuery,
          searchField,
          categoryId: categoryFilter === CATEGORY_ALL ? '' : categoryFilter,
          isActive: true, // Client chỉ thấy active
          sortBy,
          page,
          size: PAGE_SIZE,
        })
        if (!alive) return
        setProducts(res?.content || [])
        setTotalPages(res?.totalPages || 1)
        setTotalElements(res?.totalElements || 0)
      } catch (err) {
        if (!alive) return
        setProducts([])
        setError(err?.message || 'Không tải được sản phẩm.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [debouncedQuery, searchField, categoryFilter, sortBy, page])

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

  const pageCards = useMemo(() => {
    return products.map((product) => toProductCard(product, brandMap, categoryMap))
  }, [brandMap, categoryMap, products])

  const currentPage = Math.min(page, totalPages)
  const pageStart = totalElements === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalElements)
  const visiblePages = useMemo(() => getVisiblePages(currentPage, totalPages), [currentPage, totalPages])

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-2">Gợi ý sản phẩm</h1>
            <p className="text-body-md text-on-surface-variant">
              Tìm theo tên, slug, thương hiệu, danh mục, thành phần hoặc mối quan tâm.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            to="/products/favorites"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
          >
            <Icon name="favorite" filled className="text-base" />
            Yêu thích ({favorites.count})
          </Link>
          <Link
            to="/products/compare"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-pink bg-surface-container-lowest text-label-md text-on-surface-variant hover:text-primary"
          >
            <Icon name="compare_arrows" className="text-base" />
            So sánh ({compared.count})
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_220px] gap-3">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/70 text-lg" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setPage(1)
                setQuery(e.target.value)
              }}
              placeholder="Tìm sản phẩm..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
          <select
            value={searchField}
            onChange={(e) => {
              setPage(1)
              setSearchField(e.target.value)
            }}
            className="h-11 px-3 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            {SEARCH_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setPage(1)
              setSortBy(e.target.value)
            }}
            className="h-11 px-3 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 items-start">
          {visibleFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPage(1)
                setCategoryFilter(item.id)
              }}
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
                          setPage(1)
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-primary-light/60 border border-border-pink rounded-xl px-4 py-3 mb-6">
        <div className="flex items-center gap-3">
          <Icon name="insights" className="text-primary" />
          <p className="text-body-md text-on-surface-variant">
            Đang hiển thị <span className="font-medium text-on-surface">{totalElements}</span> sản phẩm.
          </p>
        </div>
        {totalElements > 0 ? (
          <p className="text-caption text-on-surface-variant">
            {pageStart}-{pageEnd} / {totalElements} mục
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-72">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="border border-error/20 bg-error/5 rounded-xl px-4 py-5 text-body-md text-on-surface-variant">
          {error}
        </div>
      ) : pageCards.length === 0 ? (
        <div className="border border-border-pink bg-surface-container-lowest rounded-xl px-4 py-8 text-center text-body-md text-on-surface-variant">
          Chưa có sản phẩm phù hợp.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {pageCards.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                isFavorite={favorites.hasId(product.id)}
                isCompared={compared.hasId(product.id)}
                onFavoriteToggle={() => favorites.toggle(product.id)}
                onCompareToggle={() => compared.toggle(product.id)}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-on-surface-variant">
                Trang <span className="font-medium text-on-surface">{currentPage}</span> / {totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
                >
                  <Icon name="chevron_left" className="text-base" />
                  Trước
                </button>

                {visiblePages.map((item, index) =>
                  item === '...' ? (
                    <span key={`dots-${index}`} className="px-2 text-on-surface-variant">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={[
                        'min-w-10 h-10 px-3 rounded-xl border text-body-md transition-colors',
                        item === currentPage
                          ? 'gradient-bg text-white border-transparent shadow-sm'
                          : 'border-border-pink bg-surface-container-lowest text-on-surface-variant hover:text-primary',
                      ].join(' ')}
                    >
                      {item}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-border-pink bg-surface-container-lowest text-body-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary"
                >
                  Sau
                  <Icon name="chevron_right" className="text-base" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {compared.count > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-30 w-[min(58rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-border-pink bg-surface-container-lowest shadow-[0_16px_50px_rgba(103,80,228,0.16)] px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center">
                <Icon name="compare_arrows" />
              </span>
              <div>
                <p className="text-body-md font-medium text-on-surface">
                  Đã chọn {compared.count} sản phẩm để so sánh
                </p>
                <p className="text-caption text-on-surface-variant">
                  Tối đa 3 sản phẩm, chọn thêm sẽ tự thay mục cũ nhất.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={compared.clear}
                className="px-4 py-2 rounded-full border border-border-pink text-label-md text-on-surface-variant hover:text-primary"
              >
                Xóa hết
              </button>
              <Link
                to="/products/compare"
                className="px-4 py-2 rounded-full bg-primary text-white text-label-md font-semibold hover:bg-tertiary transition-colors"
              >
                Mở so sánh
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
