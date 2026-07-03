import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'

/** Trang 404. */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-surface-soft">
      <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-primary mb-6">
        <Icon name="sentiment_dissatisfied" className="text-4xl" />
      </div>
      <h1 className="text-headline-lg text-on-surface mb-2">Không tìm thấy trang</h1>
      <p className="text-body-md text-on-surface-variant mb-8">
        Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link
        to={PATHS.PRODUCTS}
        className="px-6 py-3 rounded-full gradient-bg text-white text-label-md font-medium shadow-md hover:shadow-lg transition-all"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
