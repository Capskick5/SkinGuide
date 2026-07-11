import Icon from './Icon'

/**
 * Tạo mảng các trang cần hiển thị (vd: 1, 2, 3, ..., 10)
 */
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

/**
 * Component Pagination dùng chung cho toàn bộ app
 * @param {number} currentPage - Trang hiện tại (1-indexed, tính từ 1)
 * @param {number} totalPages - Tổng số trang
 * @param {function} onPageChange - Callback khi chuyển trang
 * @param {boolean} [showPageInfo=true] - Hiển thị "Trang X / Y"
 * @param {string} [containerClass] - Lớp CSS bổ sung cho container
 */
export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  showPageInfo = true,
  containerClass = ""
}) {
  if (totalPages <= 0) return null

  const visiblePages = getVisiblePages(currentPage, totalPages)

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm ${containerClass}`}>
      {showPageInfo && (
        <p className="text-sm text-gray-500">
          Trang <span className="font-bold text-gray-800">{currentPage}</span> / {totalPages}
        </p>
      )}

      <div className={`flex flex-wrap items-center gap-2 ${!showPageInfo ? 'w-full justify-center' : ''}`}>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary hover:bg-gray-50 transition-colors"
        >
          <Icon name="chevron_left" className="text-base" />
          Trước
        </button>

        {visiblePages.map((item, index) =>
          item === '...' ? (
            <span key={`dots-${index}`} className="px-2 text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={[
                'min-w-10 h-10 px-3 rounded-xl border text-sm font-semibold transition-colors',
                item === currentPage
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                  : 'border-gray-200 bg-white text-gray-600 hover:text-primary hover:bg-gray-50',
              ].join(' ')}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary hover:bg-gray-50 transition-colors"
        >
          Sau
          <Icon name="chevron_right" className="text-base" />
        </button>
      </div>
    </div>
  )
}
