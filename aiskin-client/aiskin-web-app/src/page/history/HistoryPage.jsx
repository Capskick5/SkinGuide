import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { SCAN_HISTORY } from './data'

/**
 * Trang Lịch sử: danh sách tất cả các lần quét da đã thực hiện.
 */
export default function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">Lịch sử quét da</h1>
        <p className="text-body-md text-on-surface-variant">
          Toàn bộ các lần phân tích da của bạn, sắp xếp theo thời gian.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SCAN_HISTORY.map((h) => (
          <div
            key={h.id}
            className="bg-surface-container-lowest border border-border-pink rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors cursor-pointer group"
            onClick={() => navigate(`/history/${h.id}`)}
          >
            <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center text-primary shrink-0">
              <Icon name="face" filled />
            </div>
            <div className="grow">
              <p className="text-label-md text-on-surface">{h.date}</p>
              <p className="text-caption text-on-surface-variant">{h.dateLabel}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {h.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 bg-surface-soft border border-border-pink/60 rounded-full text-caption text-on-surface-variant"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-headline-md font-bold text-primary leading-none">{h.score}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/history/${h.id}`) }}
                className="text-caption text-primary hover:text-tertiary transition-colors flex items-center gap-1 mt-1 group-hover:underline"
              >
                Xem chi tiết <Icon name="arrow_forward" className="text-sm" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
