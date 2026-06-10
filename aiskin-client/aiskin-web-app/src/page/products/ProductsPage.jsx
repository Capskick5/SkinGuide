import { useMemo, useState } from 'react'
import Icon from '@/components/common/Icon'
import ProductCard from './components/ProductCard'

const FILTERS = ['Tất cả', 'Sữa rửa mặt', 'Toner', 'Serum', 'Dưỡng ẩm', 'Chống nắng', 'Đặc trị']

/** Dữ liệu demo - sau này lấy từ Product Service (ProductRecommendation + Product). */
const PRODUCTS = [
  { brand: 'AuraLab', name: 'Serum Niacinamide 10%', category: 'Serum', match: 95, price: '599.000₫', rating: '4.8', ingredients: ['Niacinamide', 'Kẽm'], reason: 'Hỗ trợ giảm mụn & kiểm soát dầu.' },
  { brand: 'Hydra+', name: 'Kem dưỡng Hyaluronic', category: 'Dưỡng ẩm', match: 92, price: '799.000₫', rating: '4.7', ingredients: ['Hyaluronic Acid', 'Ceramide'], reason: 'Tăng cường cấp ẩm & hàng rào bảo vệ.' },
  { brand: 'SunGuard', name: 'Chống nắng khoáng SPF 50', category: 'Chống nắng', match: 90, price: '699.000₫', rating: '4.9', ingredients: ['Kẽm Oxit'], reason: 'Bảo vệ da khỏi sạm nám.' },
  { brand: 'PureGlow', name: 'Gel rửa mặt dịu nhẹ', category: 'Sữa rửa mặt', match: 88, price: '449.000₫', rating: '4.6', ingredients: ['Glycerin'], reason: 'Làm sạch mà không gây khô da.' },
  { brand: 'RetinAge', name: 'Retinol 0.3% ban đêm', category: 'Đặc trị', match: 85, price: '899.000₫', rating: '4.5', ingredients: ['Retinol'], reason: 'Cải thiện nếp nhăn & kết cấu da.' },
  { brand: 'BalanceCo', name: 'Toner làm dịu', category: 'Toner', match: 83, price: '499.000₫', rating: '4.4', ingredients: ['Rau má', 'Panthenol'], reason: 'Làm dịu mẩn đỏ & da nhạy cảm.' },
]

/**
 * Trang gợi ý sản phẩm với bộ lọc theo danh mục.
 */
export default function ProductsPage() {
  const [filter, setFilter] = useState('Tất cả')

  const visible = useMemo(
    () => (filter === 'Tất cả' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter)),
    [filter],
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-headline-lg text-on-surface mb-2">Gợi ý cho làn da của bạn</h1>
        <p className="text-body-md text-on-surface-variant">
          Các sản phẩm phù hợp với da hỗn hợp và các vấn đề được phát hiện.
        </p>
      </div>

      {/* Summary banner */}
      <div className="flex items-center gap-3 bg-primary-light/60 border border-border-pink rounded-xl px-4 py-3 mb-6">
        <Icon name="insights" className="text-primary" />
        <p className="text-body-md text-on-surface-variant">
          Dựa trên kết quả quét: <span className="font-medium text-on-surface">Mụn (trung bình)</span>,{' '}
          <span className="font-medium text-on-surface">Sạm nám (nhẹ)</span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={[
              'px-4 py-2 rounded-full text-label-md transition-all',
              filter === f
                ? 'gradient-bg text-white shadow-sm'
                : 'bg-surface-container-lowest border border-border-pink text-on-surface-variant hover:text-primary',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {visible.map((p) => (
          <ProductCard key={p.name} {...p} />
        ))}
      </div>
    </div>
  )
}
