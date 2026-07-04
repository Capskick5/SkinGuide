import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import ProductCard from './components/ProductCard'
import { makeSearchBlob, mapById, normalize, toArray, toProductCard } from './productUtils'
import { translateCategory, translateTag } from './translator'
import { useComparedProducts, useFavoriteProducts } from './productCollections'

const CATEGORY_ALL = 'all'
const FILTER_ALL = 'all'
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

// Khớp giá trị lưu trong Product.targetSkinTypes / Product.targetConcerns (tiếng Anh),
// nhãn hiển thị dùng lại translateTag để nhất quán với cách gắn thẻ sản phẩm.
const SKIN_TYPE_VALUES = ['Combination', 'Oily', 'Dry', 'Normal', 'Sensitive']
const CONCERN_VALUES = ['Dryness', 'Pigmentation', 'Pores', 'Acne', 'Wrinkles']

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

const QUICK_LINKS = [
  { icon: 'science', label: 'Niacinamide', query: 'niacinamide', color: 'bg-[#2f6f62]' },
  { icon: 'shield', label: 'Ceramide', query: 'ceramide', color: 'bg-[#5b67a5]' },
  { icon: 'water_drop', label: 'Salicylic Acid', query: 'salicylic acid', color: 'bg-[#1687a7]' },
  { icon: 'humidity_high', label: 'Hyaluronic Acid', query: 'hyaluronic acid', color: 'bg-[#587d9f]' },
  { icon: 'opacity', label: 'Da dầu', query: 'oily', color: 'bg-[#ac6b35]' },
  { icon: 'water_loss', label: 'Da khô', query: 'dry', color: 'bg-[#9b5a73]' },
  { icon: 'wb_sunny', label: 'Kem chống nắng', query: 'sunscreen', color: 'bg-[#cf7a16]' },
  { icon: 'wash', label: 'Sữa rửa mặt', query: 'cleanser', color: 'bg-[#3d7b58]' },
]

async function loadWithFallback(primaryRequest, fallbackRequest) {
  try {
    return await primaryRequest()
  } catch (primaryError) {
    if (!fallbackRequest) throw primaryError
    return fallbackRequest()
  }
}

function toPagedResult(
  items,
  { query, searchField, categoryId, isActive, sortBy, minPrice, maxPrice, brandId, skinType, concern, inStockOnly, page, size },
) {
  const normalizedQuery = normalize(query)
  const normalizedField = searchField || 'all'
  const filtered = items.filter((product) => {
    if (
      isActive !== '' &&
      isActive !== null &&
      isActive !== undefined &&
      typeof product.isActive === 'boolean' &&
      product.isActive !== Boolean(isActive)
    ) {
      return false
    }
    if (categoryId && product.categoryId !== categoryId) {
      return false
    }
    if (brandId && product.brandId !== brandId) {
      return false
    }
    if (skinType && !(product.targetSkinTypes || []).includes(skinType)) {
      return false
    }
    if (concern && !(product.targetConcerns || []).includes(concern)) {
      return false
    }
    const price = Number(product.price) || 0
    if (minPrice !== '' && minPrice !== null && minPrice !== undefined && price < Number(minPrice)) {
      return false
    }
    if (maxPrice !== '' && maxPrice !== null && maxPrice !== undefined && price > Number(maxPrice)) {
      return false
    }
    if (inStockOnly && Number(product.totalAvailableQuantity) <= 0) {
      return false
    }
    if (!normalizedQuery) {
      return true
    }
    const blob = makeSearchBlob(product, product.brandName || '', product.categoryName || '')
    return normalize(blob[normalizedField] || blob.all).includes(normalizedQuery)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''), 'vi')
    if (sortBy === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''), 'vi')
    if (sortBy === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0)
    if (sortBy === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0)
    return 0
  })

  const currentPage = Math.max(1, Number(page) || 1)
  const pageSize = Math.max(1, Number(size) || PAGE_SIZE)
  const start = (currentPage - 1) * pageSize

  return {
    content: sorted.slice(start, start + pageSize),
    totalElements: sorted.length,
    totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
  }
}

function ShopHero({ onPick }) {
  return (
    <section className="mb-6 overflow-hidden rounded-md border border-[#bddfd1] bg-[#eef8f4]">
      <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1.6fr)_1fr] lg:items-center lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase text-[#2f6f62]">AiSkin Store</p>
          <h1 className="mt-1 text-3xl font-black text-[#173b32] md:text-4xl">Skincare theo nhu cầu làn da</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#41665d] md:text-base">
            Tìm sản phẩm theo thành phần, loại da và danh mục. Giá cùng tồn kho được lấy trực tiếp từ hệ thống bán hàng.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/scan"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#2f6f62] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#25584e]"
            >
              <Icon name="face_retouching_natural" />
              Quét da
            </Link>
            <Link
              to="/routine"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#2f6f62] bg-white px-4 py-2.5 text-sm font-bold text-[#2f6f62] hover:bg-[#e3f3ed]"
            >
              <Icon name="checklist" />
              Xem routine
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onPick('niacinamide')}
            className="min-h-28 rounded-md bg-white p-4 text-left text-[#173b32] shadow-sm hover:bg-[#f8fcfa]"
          >
            <Icon name="science" className="text-2xl text-[#2f6f62]" />
            <span className="mt-3 block text-sm font-bold">Tìm Niacinamide</span>
          </button>
          <button
            type="button"
            onClick={() => onPick('ceramide')}
            className="min-h-28 rounded-md bg-[#fff4df] p-4 text-left text-[#6c4815] shadow-sm hover:bg-[#ffedca]"
          >
            <Icon name="shield" className="text-2xl text-[#b9700e]" />
            <span className="mt-3 block text-sm font-bold">Tìm Ceramide</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function QuickLinks({ onPick }) {
  return (
    <div className="mb-6 grid grid-cols-4 gap-3 rounded-md bg-white px-3 py-5 shadow-[0_14px_38px_rgba(23,32,38,0.06)] md:grid-cols-8">
      {QUICK_LINKS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onPick(item.query)}
          className="group flex flex-col items-center gap-2 text-center"
        >
          <span className={`flex h-14 w-14 items-center justify-center rounded-full ${item.color} text-white shadow-[0_10px_24px_rgba(23,32,38,0.16)] transition-transform group-hover:-translate-y-1`}>
            <Icon name={item.icon} filled className="text-2xl" />
          </span>
          <span className="text-xs font-bold text-on-surface md:text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  )
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
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Bộ lọc nâng cao: giá, thương hiệu, loại da, mối quan tâm, còn hàng
  const [brandFilter, setBrandFilter] = useState(FILTER_ALL)
  const [skinTypeFilter, setSkinTypeFilter] = useState(FILTER_ALL)
  const [concernFilter, setConcernFilter] = useState(FILTER_ALL)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [minPriceInput, setMinPriceInput] = useState('')
  const [maxPriceInput, setMaxPriceInput] = useState('')
  const [debouncedMinPrice, setDebouncedMinPrice] = useState('')
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState('')
  const favorites = useFavoriteProducts()
  const compared = useComparedProducts()

  // 1. Chỉ load danh mục và thương hiệu 1 lần lúc đầu
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [brandRes, categoryRes] = await Promise.all([
          loadWithFallback(productApi.listActiveBrands, productApi.listBrands),
          loadWithFallback(productApi.listActiveCategories, productApi.listCategories),
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

  // 2b. Debounce khoảng giá (tránh gọi API liên tục khi gõ số)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMinPrice(minPriceInput)
      setDebouncedMaxPrice(maxPriceInput)
    }, 500)
    return () => clearTimeout(timer)
  }, [minPriceInput, maxPriceInput])

  // 3. Load sản phẩm theo phân trang/bộ lọc từ API server
  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true)
      setError('')
      try {
        const options = {
          query: debouncedQuery,
          searchField,
          categoryId: categoryFilter === CATEGORY_ALL ? '' : categoryFilter,
          isActive: true, // Client chỉ thấy active
          sortBy,
          minPrice: debouncedMinPrice === '' ? '' : Number(debouncedMinPrice),
          maxPrice: debouncedMaxPrice === '' ? '' : Number(debouncedMaxPrice),
          brandId: brandFilter === FILTER_ALL ? '' : brandFilter,
          skinType: skinTypeFilter === FILTER_ALL ? '' : skinTypeFilter,
          concern: concernFilter === FILTER_ALL ? '' : concernFilter,
          inStockOnly: inStockOnly ? true : '',
          page,
          size: PAGE_SIZE,
        }
        const res = await loadWithFallback(
          () => productApi.searchAdvancedProducts(options),
          async () => toPagedResult(toArray(await productApi.listActiveProducts()), options),
        )
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
  }, [
    debouncedQuery,
    searchField,
    categoryFilter,
    sortBy,
    page,
    debouncedMinPrice,
    debouncedMaxPrice,
    brandFilter,
    skinTypeFilter,
    concernFilter,
    inStockOnly,
  ])

  const brandMap = useMemo(() => mapById(brands), [brands])
  const categoryMap = useMemo(() => mapById(categories), [categories])
  const filters = useMemo(
    () => [{ id: CATEGORY_ALL, name: 'Tất cả' }, ...categories.map(c => ({ ...c, name: translateCategory(c.name) }))],
    [categories],
  )

  const pageCards = useMemo(() => {
    return products.map((product) => toProductCard(product, brandMap, categoryMap))
  }, [brandMap, categoryMap, products])

  const handlePromoPick = (value) => {
    setPage(1)
    setCategoryFilter(CATEGORY_ALL)
    setSearchField('all')
    setQuery(value)
  }

  const currentPage = Math.min(page, totalPages)
  const pageStart = totalElements === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalElements)
  const visiblePages = useMemo(() => getVisiblePages(currentPage, totalPages), [currentPage, totalPages])

  return (
    <div>
      <ShopHero onPick={handlePromoPick} />
      <QuickLinks onPick={handlePromoPick} />

      <div className="mb-6 rounded-2xl border border-border-pink bg-white/90 p-4 shadow-[0_14px_38px_rgba(23,32,38,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-caption text-on-surface-variant mb-1">Bộ sưu tập của bạn</p>
            <h2 className="text-headline-sm text-on-surface mb-2">Xem nhanh sản phẩm đã lưu</h2>
            <p className="text-body-md text-on-surface-variant">
              Bạn đã lưu <span className="font-semibold text-primary">{favorites.count}</span> sản phẩm yêu thích và{' '}
              <span className="font-semibold text-secondary">{compared.count}</span> sản phẩm trong danh sách so sánh.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/products/favorites"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-semibold text-white hover:bg-tertiary"
            >
              <Icon name="favorite" filled className="text-base" />
              Yêu thích
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{favorites.count}</span>
            </Link>
            <Link
              to="/products/compare"
              className="inline-flex items-center gap-2 rounded-full border border-border-pink bg-surface-container-lowest px-4 py-2 text-label-md font-semibold text-on-surface-variant hover:text-primary"
            >
              <Icon name="compare_arrows" className="text-base" />
              So sánh
              <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold text-secondary">
                {compared.count}
              </span>
            </Link>
          </div>
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
          {filters.map((item) => (
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
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border-pink bg-surface-container-lowest px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={minPriceInput}
              onChange={(e) => {
                setPage(1)
                setMinPriceInput(e.target.value)
              }}
              placeholder="Giá từ"
              className="h-11 w-full min-w-0 rounded-xl border border-border-pink bg-white px-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
            <span className="text-on-surface-variant">-</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={maxPriceInput}
              onChange={(e) => {
                setPage(1)
                setMaxPriceInput(e.target.value)
              }}
              placeholder="Giá đến"
              className="h-11 w-full min-w-0 rounded-xl border border-border-pink bg-white px-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>

          <select
            value={brandFilter}
            onChange={(e) => {
              setPage(1)
              setBrandFilter(e.target.value)
            }}
            className="h-11 px-3 rounded-xl border border-border-pink bg-white text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value={FILTER_ALL}>Tất cả thương hiệu</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <select
            value={skinTypeFilter}
            onChange={(e) => {
              setPage(1)
              setSkinTypeFilter(e.target.value)
            }}
            className="h-11 px-3 rounded-xl border border-border-pink bg-white text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value={FILTER_ALL}>Tất cả loại da</option>
            {SKIN_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {translateTag(value)}
              </option>
            ))}
          </select>

          <select
            value={concernFilter}
            onChange={(e) => {
              setPage(1)
              setConcernFilter(e.target.value)
            }}
            className="h-11 px-3 rounded-xl border border-border-pink bg-white text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
          >
            <option value={FILTER_ALL}>Tất cả mối quan tâm</option>
            {CONCERN_VALUES.map((value) => (
              <option key={value} value={value}>
                {translateTag(value)}
              </option>
            ))}
          </select>

          <label className="flex h-11 items-center gap-2 rounded-xl border border-border-pink bg-white px-3 text-body-md text-on-surface-variant">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                setPage(1)
                setInStockOnly(e.target.checked)
              }}
              className="h-4 w-4 rounded border-border-pink text-primary focus:ring-primary/30"
            />
            Chỉ hiện còn hàng
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-primary-light/60 border border-border-pink rounded-xl px-4 py-3 mb-6">
        <div className="flex items-center gap-3">
          <Icon name="insights" className="text-primary" />
          <p className="text-body-md text-on-surface-variant">
            {loading ? (
              'Đang tải sản phẩm...'
            ) : (
              <>Đang hiển thị <span className="font-medium text-on-surface">{totalElements}</span> sản phẩm.</>
            )}
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
    </div>
  )
}
