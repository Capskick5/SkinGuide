import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import ProductCard from './components/ProductCard'
import { makeSearchBlob, mapById, normalize, toArray, toProductCard } from './productUtils'
import { translateCategory } from './translator'

const CATEGORY_ALL = 'all'
const PAGE_SIZE = 12
const FLASH_DEAL_INTERVAL_MS = 12 * 60 * 60 * 1000
const FLASH_DEAL_SIZE = 6

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
  { icon: 'local_fire_department', label: 'Sale đầu tháng', query: 'sunscreen', color: 'from-[#ff5a00] to-[#ffcf33]' },
  { icon: 'bolt', label: 'Giao 2H', query: 'cleanser', color: 'from-[#ff6f61] to-[#ff9a3d]' },
  { icon: 'verified', label: 'Chính hãng', query: 'loreal', color: 'from-[#356dff] to-[#7fa0ff]' },
  { icon: 'spa', label: 'Clinic & S.P.A', query: 'serum', color: 'from-[#1f7a68] to-[#61cfa6]' },
  { icon: 'sell', label: 'Clinic Deals', query: 'cream', color: 'from-[#e11d48] to-[#ff7a90]' },
  { icon: 'home_health', label: 'Da nhạy cảm', query: 'sensitive', color: 'from-[#f5c400] to-[#ff8f00]' },
  { icon: 'calendar_month', label: 'Routine mới', query: 'toner', color: 'from-[#b449d9] to-[#ff7ad9]' },
  { icon: 'menu_book', label: 'Cẩm nang', query: 'moisturizer', color: 'from-[#536dfe] to-[#5fc3ff]' },
]

const SIDE_BANNERS = [
  { title: 'Giao nhanh miễn phí 2H', desc: 'Nội thành từ 90K', icon: 'local_shipping' },
  { title: 'Freeship toàn quốc', desc: 'Đơn từ 249K', icon: 'redeem' },
  { title: 'Quét mã xem routine', desc: 'Tải app AiSkin', icon: 'qr_code_2' },
]

function formatVnd(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`
}

function getFlashDealMeta(now = Date.now()) {
  const current = new Date(now)
  const startOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime()
  const halfDay = current.getHours() < 12 ? 0 : 1
  const cycle = Math.floor(startOfDay / (24 * 60 * 60 * 1000)) * 2 + halfDay
  const nextAt = startOfDay + (halfDay + 1) * FLASH_DEAL_INTERVAL_MS
  const remaining = Math.max(0, nextAt - now)
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((remaining % (60 * 1000)) / 1000)

  return {
    cycle,
    timeParts: [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')),
  }
}

function pickFlashDeals(products, cycle) {
  if (!products.length) return []
  const start = (cycle * FLASH_DEAL_SIZE) % products.length
  return Array.from({ length: Math.min(FLASH_DEAL_SIZE, products.length) }, (_, index) => {
    return products[(start + index) % products.length]
  })
}

async function loadWithFallback(primaryRequest, fallbackRequest) {
  try {
    return await primaryRequest()
  } catch (primaryError) {
    if (!fallbackRequest) throw primaryError
    return fallbackRequest()
  }
}

function toPagedResult(items, { query, searchField, categoryId, isActive, sortBy, page, size }) {
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
    <section className="mb-6 overflow-hidden rounded-md bg-white shadow-[0_18px_50px_rgba(23,32,38,0.08)]">
      <div className="bg-[#28b8e8] px-4 py-3 text-center text-sm font-black uppercase text-white md:text-lg">
        AiSkin Mall - Mỹ phẩm chính hãng, deal đẹp mỗi ngày - giảm đến 45%
      </div>
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,2fr)_1fr]">
        <button
          type="button"
          onClick={() => onPick('serum')}
          className="group relative min-h-[260px] overflow-hidden rounded-md bg-[linear-gradient(115deg,#971717_0%,#d92525_48%,#ff8a3d_100%)] p-6 text-left text-white md:p-8"
        >
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,white_0_2px,transparent_3px),radial-gradient(circle_at_70%_30%,white_0_1px,transparent_3px)] [background-size:44px_44px]" />
          <div className="relative max-w-xl">
            <p className="font-serif text-3xl italic leading-none md:text-5xl">Trải nghiệm</p>
            <h2 className="mt-1 text-3xl font-black uppercase leading-tight md:text-5xl">Da căng bóng toàn diện</h2>
            <p className="mt-4 max-w-md text-sm font-semibold text-white/88 md:text-base">
              Serum, kem chống nắng và routine phục hồi đang vào mùa sale lớn.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black text-[#b91414] shadow-lg">
              Mua deal hôm nay
              <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />
            </div>
          </div>
          <div className="absolute bottom-5 right-6 hidden items-end gap-3 md:flex">
            {['h-32 bg-white', 'h-44 bg-[#f7fbff]', 'h-28 bg-[#ffe3d8]'].map((cls, index) => (
              <div key={cls} className={`w-16 rounded-t-2xl rounded-b-md shadow-2xl ${cls}`}>
                <div className="mx-auto mt-4 h-10 w-9 rounded-full bg-[#1f7a68]/15" />
                <div className="mx-auto mt-3 h-2 w-9 rounded-full bg-[#ff6f61]" />
                <div className="mx-auto mt-2 h-2 w-7 rounded-full bg-[#1f7a68]" />
                {index === 1 ? <div className="mx-auto mt-4 h-10 w-10 rounded-full border-4 border-[#ffcf33]" /> : null}
              </div>
            ))}
          </div>
        </button>

        <div className="grid gap-3">
          <div className="rounded-md bg-[#dff5e9] p-4 text-[#145845]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#ff5a00] shadow">
                <Icon name="rocket_launch" filled />
              </span>
              <div>
                <p className="text-xl font-black uppercase">NowFree 2H</p>
                <p className="text-sm font-bold">Giao nhanh miễn phí nội thành</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {SIDE_BANNERS.slice(0, 2).map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onPick(item.title.includes('Freeship') ? 'sunscreen' : 'cleanser')}
                  className="rounded-md bg-[#1f7a68] p-3 text-left text-white"
                >
                  <Icon name={item.icon} className="mb-2 text-xl" />
                  <p className="text-sm font-black uppercase">{item.title}</p>
                  <p className="text-xs text-white/80">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPick('routine')}
            className="rounded-md bg-[linear-gradient(90deg,#f3f7f5,#c9eedb)] p-4 text-left text-[#145845]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase">Quét mã kiểm tra giá</p>
                <p className="mt-1 text-2xl font-black">Tải app AiSkin</p>
              </div>
              <div className="grid h-20 w-20 grid-cols-4 gap-1 rounded-md bg-white p-2 shadow-inner">
                {Array.from({ length: 16 }).map((_, index) => (
                  <span key={index} className={index % 3 === 0 || index % 5 === 0 ? 'bg-[#1f7a68]' : 'bg-[#dcebe5]'} />
                ))}
              </div>
            </div>
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
          <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${item.color} text-white shadow-[0_10px_24px_rgba(23,32,38,0.16)] transition-transform group-hover:-translate-y-1`}>
            <Icon name={item.icon} filled className="text-2xl" />
          </span>
          <span className="text-xs font-bold text-on-surface md:text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function FlashDeals({ products }) {
  const [now, setNow] = useState(() => Date.now())
  const { cycle, timeParts } = useMemo(() => getFlashDealMeta(now), [now])
  const deals = useMemo(() => pickFlashDeals(products, cycle), [products, cycle])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (deals.length === 0) return null

  return (
    <section className="mb-6 overflow-hidden rounded-md bg-[#ff8848] p-3 shadow-[0_18px_50px_rgba(255,90,0,0.18)] md:p-5">
      <div className="mb-4 flex items-center justify-between text-white">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black md:text-3xl">Flash deals</h2>
          <div className="flex items-center gap-1 text-sm font-black">
            {timeParts.map((time, index) => (
              <span key={`${time}-${index}`} className="rounded-md bg-black px-2 py-1 text-white">{time}</span>
            ))}
          </div>
          <span className="text-xs font-bold text-white/80">Đổi deal mỗi 12 giờ</span>
        </div>
        <Link to="/products" className="text-sm font-bold hover:underline">Xem tất cả</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {deals.map((product, index) => {
          const discount = [38, 20, 58, 56, 40, 41][index % 6]
          const originalPrice = Math.round((product.priceValue || 0) * (100 / (100 - discount)))
          return (
            <Link
              key={product.id}
              to={`/products/${product.slug}`}
              className="group overflow-hidden rounded-md bg-white shadow-[0_12px_26px_rgba(23,32,38,0.12)]"
            >
              <div className="relative aspect-square bg-[#fff3ec]">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon name="spa" className="text-5xl text-primary/40" />
                  </div>
                )}
                <span className="absolute right-0 top-0 rounded-bl-md bg-[#ff5a00] px-2 py-1 text-xs font-black text-white">
                  -{discount}%
                </span>
                <span className="absolute left-2 top-2 rounded-md bg-yellow-300 px-2 py-1 text-xs font-black text-[#d71920]">1.7</span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-10 text-xs font-bold text-on-surface">{product.name}</p>
                <p className="mt-2 text-lg font-black text-[#d71920]">{product.price}</p>
                <p className="text-xs text-on-surface-variant line-through">{formatVnd(originalPrice)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
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
  const [flashProducts, setFlashProducts] = useState([])

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

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const options = {
          isActive: true,
          sortBy: 'relevance',
          page: 1,
          size: 72,
        }
        const res = await loadWithFallback(
          () => productApi.searchAdvancedProducts(options),
          async () => toPagedResult(toArray(await productApi.listActiveProducts()), options),
        )
        if (alive) setFlashProducts(res?.content || [])
      } catch (err) {
        console.error('KhÃ´ng táº£i Ä‘Æ°á»£c flash deals', err)
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
        const options = {
          query: debouncedQuery,
          searchField,
          categoryId: categoryFilter === CATEGORY_ALL ? '' : categoryFilter,
          isActive: true, // Client chỉ thấy active
          sortBy,
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
  }, [debouncedQuery, searchField, categoryFilter, sortBy, page])

  const brandMap = useMemo(() => mapById(brands), [brands])
  const categoryMap = useMemo(() => mapById(categories), [categories])
  const filters = useMemo(
    () => [{ id: CATEGORY_ALL, name: 'Tất cả' }, ...categories.map(c => ({ ...c, name: translateCategory(c.name) }))],
    [categories],
  )

  const pageCards = useMemo(() => {
    return products.map((product) => toProductCard(product, brandMap, categoryMap))
  }, [brandMap, categoryMap, products])

  const flashDealCards = useMemo(() => {
    const source = flashProducts.length > 0 ? flashProducts : products
    return source.map((product) => toProductCard(product, brandMap, categoryMap))
  }, [brandMap, categoryMap, flashProducts, products])

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
      <FlashDeals products={flashDealCards} />

      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-2">Shop sản phẩm skincare</h1>
            <p className="text-body-md text-on-surface-variant">
              Tìm theo tên, slug, thương hiệu, danh mục, thành phần hoặc mối quan tâm.
            </p>
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
              <ProductCard key={product.id} {...product} />
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
