import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { useCart } from '@/context/CartContext'

/** Dữ liệu demo — sau này lấy từ Product Service */
const PRODUCTS = [
  {
    id: '1',
    brand: 'AuraLab',
    name: 'Serum Niacinamide 10%',
    category: 'Serum',
    match: 95,
    price: '599.000₫',
    priceNum: 599000,
    rating: '4.8',
    reviews: 312,
    ingredients: ['Niacinamide 10%', 'Kẽm PCA 1%', 'Panthenol', 'Glycerin'],
    reason: 'Hỗ trợ giảm mụn & kiểm soát dầu. Phù hợp với kết quả phân tích da dầu của bạn.',
    description: 'Serum Niacinamide 10% của AuraLab giúp thu nhỏ lỗ chân lông, kiểm soát bã nhờn và làm mờ thâm mụn hiệu quả. Công thức nhẹ nhàng, thích hợp cho da nhạy cảm và da dầu.',
    howToUse: 'Thoa 3–4 giọt lên da sạch sau bước toner, massage nhẹ nhàng. Dùng sáng và tối.',
    suitableFor: ['Da dầu', 'Da hỗn hợp', 'Da nhạy cảm', 'Mụn đầu đen', 'Lỗ chân lông to'],
    concerns: ['Mụn', 'Lỗ chân lông', 'Sạm thâm'],
    icon: 'science',
  },
  {
    id: '2',
    brand: 'Hydra+',
    name: 'Kem dưỡng Hyaluronic',
    category: 'Dưỡng ẩm',
    match: 92,
    price: '799.000₫',
    priceNum: 799000,
    rating: '4.7',
    reviews: 248,
    ingredients: ['Hyaluronic Acid', 'Ceramide', 'Squalane', 'Niacinamide 5%'],
    reason: 'Tăng cường cấp ẩm & hàng rào bảo vệ da.',
    description: 'Kem dưỡng ẩm chuyên sâu với 3 loại Hyaluronic Acid giúp cấp nước tức thì và duy trì độ ẩm suốt 72 giờ. Ceramide phục hồi hàng rào bảo vệ da.',
    howToUse: 'Thoa đều lên mặt và cổ sau các bước serum. Dùng sáng và tối.',
    suitableFor: ['Mọi loại da', 'Da khô', 'Da nhạy cảm'],
    concerns: ['Khô da', 'Hàng rào bảo vệ da yếu'],
    icon: 'opacity',
  },
  {
    id: '3',
    brand: 'SunGuard',
    name: 'Chống nắng khoáng SPF 50',
    category: 'Chống nắng',
    match: 90,
    price: '699.000₫',
    priceNum: 699000,
    rating: '4.9',
    reviews: 521,
    ingredients: ['Kẽm Oxit 20%', 'Titanium Dioxide', 'Vitamin E', 'Aloe Vera'],
    reason: 'Bảo vệ da khỏi sạm nám theo kết quả quét.',
    description: 'Kem chống nắng khoáng vật lý SPF 50+ PA++++ bảo vệ toàn diện khỏi tia UVA/UVB. Công thức không gây nhờn, phù hợp dùng hàng ngày và thoa lại dễ dàng.',
    howToUse: 'Thoa bước cuối cùng vào buổi sáng. Thoa lại sau mỗi 2 giờ khi ở ngoài trời.',
    suitableFor: ['Mọi loại da', 'Da nhạy cảm'],
    concerns: ['Sạm nám', 'Chống lão hóa'],
    icon: 'wb_sunny',
  },
  {
    id: '4',
    brand: 'PureGlow',
    name: 'Gel rửa mặt dịu nhẹ',
    category: 'Sữa rửa mặt',
    match: 88,
    price: '449.000₫',
    priceNum: 449000,
    rating: '4.6',
    reviews: 189,
    ingredients: ['Glycerin', 'Aloe Vera', 'Centella Asiatica', 'PHA'],
    reason: 'Làm sạch mà không gây khô da.',
    description: 'Gel rửa mặt pH 5.5 làm sạch hiệu quả mà không phá vỡ hàng rào bảo vệ da. Centella Asiatica làm dịu da kích ứng.',
    howToUse: 'Làm ướt mặt, lấy một lượng vừa đủ tạo bọt, massage 30 giây rồi rửa sạch.',
    suitableFor: ['Da dầu', 'Da hỗn hợp', 'Da nhạy cảm'],
    concerns: ['Mụn', 'Làm sạch nhẹ nhàng'],
    icon: 'wash',
  },
  {
    id: '5',
    brand: 'RetinAge',
    name: 'Retinol 0.3% ban đêm',
    category: 'Đặc trị',
    match: 85,
    price: '899.000₫',
    priceNum: 899000,
    rating: '4.5',
    reviews: 156,
    ingredients: ['Retinol 0.3%', 'Bakuchiol', 'Vitamin E', 'Jojoba Oil'],
    reason: 'Cải thiện nếp nhăn & kết cấu da.',
    description: 'Serum retinol nồng độ nhẹ dành cho người mới bắt đầu. Bakuchiol tăng cường tác dụng và giảm kích ứng. Phù hợp dùng 2–3 lần/tuần.',
    howToUse: 'Chỉ dùng ban đêm. Bắt đầu 2 lần/tuần, tăng dần. Nhớ dùng kem chống nắng vào ban ngày.',
    suitableFor: ['Da thường', 'Da khô', 'Da hỗn hợp'],
    concerns: ['Nếp nhăn', 'Kết cấu da', 'Lỗ chân lông'],
    icon: 'spa',
  },
  {
    id: '6',
    brand: 'BalanceCo',
    name: 'Toner làm dịu',
    category: 'Toner',
    match: 83,
    price: '499.000₫',
    priceNum: 499000,
    rating: '4.4',
    reviews: 203,
    ingredients: ['Rau má (Centella Asiatica)', 'Panthenol', 'Niacinamide 3%', 'BHA 0.5%'],
    reason: 'Làm dịu mẩn đỏ & da nhạy cảm.',
    description: 'Toner không cồn làm dịu da tức thì với chiết xuất rau má 50%. BHA nhẹ giúp làm sạch sâu lỗ chân lông.',
    howToUse: 'Thấm bông cotton hoặc vỗ nhẹ lên da sau bước rửa mặt.',
    suitableFor: ['Da nhạy cảm', 'Da mẩn đỏ', 'Mọi loại da'],
    concerns: ['Mẩn đỏ', 'Kích ứng', 'Mụn đầu đen'],
    icon: 'water_drop',
  },
]

const SEVERITY_COLORS = {
  high: 'bg-red-50 text-red-600 border-red-100',
  moderate: 'bg-amber-50 text-amber-600 border-amber-100',
  optimal: 'bg-green-50 text-green-600 border-green-100',
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, items } = useCart()

  const product = useMemo(() => PRODUCTS.find((p) => p.id === id), [id])
  const inCart = items.some((i) => i.id === id)

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center">
          <Icon name="search_off" className="text-4xl text-primary/50" />
        </div>
        <h2 className="text-headline-md text-on-surface">Không tìm thấy sản phẩm</h2>
        <button
          type="button"
          onClick={() => navigate(PATHS.PRODUCTS)}
          className="px-6 py-3 rounded-full gradient-bg text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Quay lại sản phẩm
        </button>
      </div>
    )
  }

  const handleAddToCart = () => {
    addItem({ id: product.id, name: product.name, brand: product.brand, price: product.price, priceNum: product.priceNum })
  }

  return (
    <div>
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate(PATHS.PRODUCTS)}
        className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-6 text-label-md"
      >
        <Icon name="arrow_back" className="text-xl" /> Sản phẩm gợi ý
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: image + match */}
        <div className="flex flex-col gap-6">
          {/* Product image placeholder */}
          <div className="bg-gradient-to-br from-primary-light to-surface-soft rounded-3xl aspect-square flex items-center justify-center shadow-ambient-pink border border-border-pink">
            <Icon name={product.icon} className="text-[100px] text-primary/50" />
          </div>
          {/* AI match */}
          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-5 shadow-ambient-pink">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Icon name="auto_awesome" className="text-white" />
              </span>
              <div>
                <p className="text-label-md font-semibold text-on-surface">AI Match Score</p>
                <p className="text-caption text-on-surface-variant">Phù hợp với hồ sơ da của bạn</p>
              </div>
              <span className="ml-auto text-headline-lg font-extrabold text-primary">{product.match}%</span>
            </div>
            <div className="h-2.5 bg-surface-soft rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg rounded-full transition-all duration-700"
                style={{ width: `${product.match}%` }}
              />
            </div>
            <p className="text-caption text-on-surface-variant mt-2 italic">"{product.reason}"</p>
          </div>
        </div>

        {/* Right: info */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-label-md text-primary mb-1">{product.brand}</p>
            <h1 className="text-headline-lg text-on-surface mb-2">{product.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-surface-soft border border-border-pink rounded-full text-caption text-on-surface-variant">
                {product.category}
              </span>
              <span className="flex items-center gap-1 text-body-md text-amber-500">
                <Icon name="star" filled className="text-base" />
                <span className="font-semibold">{product.rating}</span>
                <span className="text-on-surface-variant">({product.reviews} đánh giá)</span>
              </span>
            </div>
          </div>

          <p className="text-display-price font-extrabold text-primary text-2xl">{product.price}</p>

          {/* Add to cart */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={inCart}
              className={[
                'flex-1 py-4 rounded-2xl text-label-md font-bold transition-all flex items-center justify-center gap-2',
                inCart
                  ? 'bg-green-50 text-green-600 border-2 border-green-200 cursor-default'
                  : 'gradient-bg text-white shadow-[0_6px_20px_rgba(177,14,107,0.25)] hover:opacity-90',
              ].join(' ')}
            >
              <Icon name={inCart ? 'check_circle' : 'add_shopping_cart'} />
              {inCart ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              type="button"
              onClick={() => { handleAddToCart(); navigate(PATHS.CHECKOUT) }}
              className="flex-1 py-4 rounded-2xl border-2 border-primary text-primary text-label-md font-bold hover:bg-primary-light transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="flash_on" /> Mua ngay
            </button>
          </div>

          {/* Description */}
          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-5">
            <h3 className="text-headline-sm font-semibold text-on-surface mb-2">Mô tả sản phẩm</h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">{product.description}</p>
          </div>

          {/* How to use */}
          <div className="bg-primary-light/50 border border-border-pink rounded-2xl p-5">
            <h3 className="text-headline-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
              <Icon name="info" className="text-primary text-lg" /> Cách dùng
            </h3>
            <p className="text-body-md text-on-surface-variant leading-relaxed">{product.howToUse}</p>
          </div>

          {/* Ingredients */}
          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-5">
            <h3 className="text-headline-sm font-semibold text-on-surface mb-3">Thành phần chính</h3>
            <div className="flex flex-wrap gap-2">
              {product.ingredients.map((ing) => (
                <span key={ing} className="px-3 py-1 bg-surface-soft border border-border-pink/60 rounded-full text-label-md text-on-surface">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Suitable for */}
          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-5">
            <h3 className="text-headline-sm font-semibold text-on-surface mb-3">Phù hợp với</h3>
            <div className="flex flex-wrap gap-2">
              {product.suitableFor.map((s) => (
                <span key={s} className="px-3 py-1 bg-green-50 border border-green-100 rounded-full text-caption text-green-700 flex items-center gap-1">
                  <Icon name="check" className="text-sm" /> {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
