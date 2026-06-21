import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'
import { PATHS } from '@/route/paths'
import { useCart } from '@/context/CartContext'
import { useCartDrawer } from '@/context/CartDrawerContext'

// ─── Category gradient & icon map ──────────────────────────────────────────
const CATEGORY_STYLE = {
  serum:        { gradient: 'from-violet-400 to-purple-600',   icon: 'science' },
  'dưỡng ẩm':  { gradient: 'from-sky-400 to-blue-600',        icon: 'opacity' },
  'chống nắng': { gradient: 'from-amber-400 to-orange-500',    icon: 'wb_sunny' },
  'sữa rửa mặt':{ gradient: 'from-emerald-400 to-teal-600',   icon: 'bubble_chart' },
  toner:        { gradient: 'from-pink-400 to-rose-600',       icon: 'water_drop' },
  'đặc trị':    { gradient: 'from-indigo-500 to-violet-700',   icon: 'spa' },
  mask:         { gradient: 'from-fuchsia-400 to-pink-600',    icon: 'face_retouching_natural' },
  default:      { gradient: 'from-primary to-tertiary',        icon: 'inventory_2' },
}

function getCategoryStyle(name) {
  if (!name) return CATEGORY_STYLE.default
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(CATEGORY_STYLE)) {
    if (lower.includes(key)) return val
  }
  return CATEGORY_STYLE.default
}

function formatPrice(price) {
  if (!price && price !== 0) return ''
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

// ─── Image placeholder (used when imageUrl is missing or broken) ──────────
function ProductImage({ imageUrl, categoryName, name }) {
  const [imgError, setImgError] = useState(false)
  const style = getCategoryStyle(categoryName)

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center gap-2`}>
      <span className="material-symbols-outlined text-white/90 text-5xl">{style.icon}</span>
      {categoryName && (
        <span className="text-white/70 text-xs font-medium tracking-wide uppercase">{categoryName}</span>
      )}
    </div>
  )
}

// ─── Product Card ────────────────────────────────────────────────────────────
function ProductCard({ product, categoryName }) {
  const navigate = useNavigate()
  const { addItem } = useCart()
  const { openCart } = useCartDrawer()
  const [added, setAdded] = useState(false)

  function handleAddToCart(e) {
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brandId,
      price: formatPrice(product.price),
      priceNum: product.price,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div
      className="bg-surface-container-lowest border border-border-pink rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(103,80,228,0.07)] hover:shadow-[0_8px_28px_rgba(103,80,228,0.14)] hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer group"
      onClick={() => navigate(PATHS.PRODUCT_DETAIL.replace(':id', product.id))}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <ProductImage imageUrl={product.imageUrl} categoryName={categoryName} name={product.name} />
        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        {/* Active badge */}
        {product.isActive && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-green-500/90 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
            Còn hàng
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col grow">
        {categoryName && (
          <span className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">{categoryName}</span>
        )}
        <h3 className="text-body-md font-semibold text-on-surface mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-caption text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Tags: skin types */}
        {product.targetSkinTypes?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.targetSkinTypes.slice(0, 3).map((t) => (
              <span key={t} className="px-2 py-0.5 bg-primary-light text-primary rounded-full text-[10px] font-medium">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-pink/50">
          <span className="text-body-md font-bold text-primary">
            {product.price ? formatPrice(product.price) : 'Liên hệ'}
          </span>
          <button
            type="button"
            onClick={handleAddToCart}
            className={[
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-label-md font-semibold transition-all text-[12px]',
              added
                ? 'bg-green-500 text-white'
                : 'gradient-bg text-white hover:opacity-90 hover:scale-105',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-sm">{added ? 'check' : 'add_shopping_cart'}</span>
            {added ? 'Đã thêm' : 'Giỏ hàng'}
          </button>
        </div>
        {added && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openCart() }}
            className="mt-2 text-[11px] text-primary font-medium hover:underline text-center"
          >
            Xem giỏ hàng →
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="bg-surface-container-lowest border border-border-pink rounded-2xl overflow-hidden animate-pulse">
      <div className="h-52 bg-surface-container-high" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-surface-container-high rounded-full w-1/3" />
        <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
        <div className="h-3 bg-surface-container-high rounded-full w-full" />
        <div className="h-3 bg-surface-container-high rounded-full w-2/3" />
        <div className="flex justify-between items-center pt-3 border-t border-border-pink/30">
          <div className="h-5 bg-surface-container-high rounded-full w-1/3" />
          <div className="h-8 w-24 bg-surface-container-high rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('Tất cả')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [prods, cats] = await Promise.allSettled([
          productApi.getActiveProducts(),
          productApi.listCategories(),
        ])
        const prodList = prods.status === 'fulfilled' ? (prods.value || []) : []
        const catList = cats.status === 'fulfilled' ? (cats.value || []) : []
        setProducts(prodList)
        setCategories(catList)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build category map for lookup: id → name
  const catMap = useMemo(() => {
    const m = {}
    categories.forEach((c) => { m[c.id] = c.name })
    return m
  }, [categories])

  // Category filter tabs
  const filterTabs = useMemo(() => {
    const names = ['Tất cả', ...categories.map((c) => c.name)]
    return names
  }, [categories])

  // Filter + search
  const visible = useMemo(() => {
    let list = products
    if (filter !== 'Tất cả') {
      const catId = categories.find((c) => c.name === filter)?.id
      if (catId) list = list.filter((p) => p.categoryId === catId)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [products, filter, search, categories])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2">Sản phẩm mỹ phẩm</h1>
        <p className="text-body-md text-on-surface-variant">
          Khám phá các sản phẩm chăm sóc da chuyên biệt, được chọn lọc kỹ càng cho từng loại da.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xl pointer-events-none">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border-pink bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={[
              'px-4 py-2 rounded-full text-label-md transition-all whitespace-nowrap',
              filter === tab
                ? 'gradient-bg text-white shadow-sm'
                : 'bg-surface-container-lowest border border-border-pink text-on-surface-variant hover:text-primary hover:border-primary',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-6 text-red-600">
          <span className="material-symbols-outlined">error</span>
          <p className="text-body-sm">Không thể tải sản phẩm: {error}</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
          : visible.length > 0
            ? visible.map((p) => (
                <ProductCard key={p.id} product={p} categoryName={catMap[p.categoryId] || ''} />
              ))
            : (
              <div className="col-span-full flex flex-col items-center py-20 gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary/50">inventory_2</span>
                </div>
                <h3 className="text-headline-md text-on-surface">Không có sản phẩm</h3>
                <p className="text-body-md text-on-surface-variant max-w-xs">
                  {search ? `Không tìm thấy sản phẩm nào cho "${search}"` : 'Chưa có sản phẩm nào trong danh mục này.'}
                </p>
                {search && (
                  <button onClick={() => setSearch('')} className="px-5 py-2.5 rounded-full gradient-bg text-white text-label-md hover:opacity-90">
                    Xoá tìm kiếm
                  </button>
                )}
              </div>
            )
        }
      </div>

      {/* Count */}
      {!loading && visible.length > 0 && (
        <p className="text-center text-caption text-on-surface-variant/50 mt-10">
          Hiển thị {visible.length} / {products.length} sản phẩm
        </p>
      )}
    </div>
  )
}
