import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'

/** Trang 404. */
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-surface-soft">
      <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-primary mb-6">
        <Icon name="sentiment_dissatisfied" className="text-4xl" />
      </div>
      <h1 className="text-headline-lg text-on-surface mb-2">Không tìm thấy trang</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border-pink bg-white px-6 py-3 text-label-md font-medium text-on-surface-variant hover:border-primary hover:text-primary"
        >
          <Icon name="arrow_back" className="text-lg" />
          Quay lại
        </button>
        <Link
          to={PATHS.PRODUCTS}
          className="inline-flex items-center justify-center gap-2 rounded-full gradient-bg px-6 py-3 text-label-md font-medium text-white shadow-md transition-all hover:shadow-lg"
        >
          <Icon name="storefront" className="text-lg" />
          Xem sản phẩm
        </Link>
      </div>
    </div>
  )
}
