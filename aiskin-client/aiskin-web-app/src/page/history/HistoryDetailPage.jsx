import { useParams, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { SCAN_HISTORY } from './data'
import ConditionCard from '@/page/analysis/components/ConditionCard'
import ScoreGauge from '@/page/analysis/components/ScoreGauge'

/**
 * Trang chi tiết một lần quét da, truy cập qua /history/:id
 */
export default function HistoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scan = SCAN_HISTORY.find((h) => h.id === id)

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center">
          <Icon name="search_off" className="text-4xl text-primary/50" />
        </div>
        <div>
          <h2 className="text-headline-md text-on-surface mb-2">Không tìm thấy lần quét này</h2>
          <p className="text-body-md text-on-surface-variant">ID không hợp lệ hoặc dữ liệu đã bị xóa.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(PATHS.HISTORY)}
          className="px-6 py-3 rounded-full gradient-bg text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Quay lại lịch sử
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate(PATHS.HISTORY)}
          className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors mb-4 text-label-md"
        >
          <Icon name="arrow_back" className="text-xl" />
          Lịch sử quét da
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-1">Chi tiết phân tích</h1>
            <p className="text-body-md text-on-surface-variant">{scan.dateLabel} · {scan.date}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scan.skinTypes.map((t) => (
              <span key={t} className="px-4 py-1.5 bg-primary-light text-tertiary rounded-full text-label-md">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: score summary */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-border-pink shadow-ambient-pink flex flex-col items-center">
            {/* Placeholder face */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-6 bg-primary-light flex items-center justify-center">
              <Icon name="face" className="text-[120px] text-primary/40" />
              {scan.conditions.map((_, i) => (
                <div
                  key={i}
                  className={[
                    'absolute rounded-full border-2 border-dashed animate-pulse',
                    i === 0 ? 'top-1/4 left-1/3 w-8 h-8 border-primary' : '',
                    i === 1 ? 'top-1/2 right-1/4 w-12 h-12 border-warning' : '',
                    i === 2 ? 'bottom-1/3 left-1/4 w-10 h-10 border-error' : '',
                  ].join(' ')}
                />
              ))}
            </div>

            <div className="flex items-center justify-between w-full bg-surface-soft p-4 rounded-xl border border-border-pink">
              <div>
                <h3 className="text-headline-md text-on-surface">Sức khỏe tổng thể</h3>
                <p className="text-caption text-on-surface-variant">{scan.summary}</p>
              </div>
              <ScoreGauge score={scan.score} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-border-pink text-primary text-label-md hover:bg-surface-soft transition-colors"
            >
              <Icon name="download" /> Tải báo cáo PDF
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.ROUTINE)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full gradient-bg text-white text-label-md shadow-sm hover:opacity-90 transition-opacity"
            >
              Xem lộ trình gợi ý <Icon name="arrow_forward" />
            </button>
          </div>
        </div>

        {/* Right: conditions */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <h2 className="text-headline-md text-on-surface mb-2 px-2">Tình trạng phát hiện</h2>
          {scan.conditions.map((c) => (
            <ConditionCard key={c.title} {...c} />
          ))}
          <p className="text-caption text-on-surface-variant italic mt-2 px-2">
            Kết quả phân tích chỉ mang tính tham khảo và không thay thế bác sĩ da liễu chuyên môn.
          </p>
        </div>
      </div>
    </div>
  )
}
