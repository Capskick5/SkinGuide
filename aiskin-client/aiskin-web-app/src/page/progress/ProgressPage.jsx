import Icon from '@/components/common/Icon'
import { SCAN_HISTORY, PROGRESS_STATS } from '@/page/history/data'

/**
 * Trang Tiến trình: so sánh before/after, các chỉ số và biểu đồ xu hướng
 * điểm da theo thời gian.
 */
export default function ProgressPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">Tiến trình làn da của bạn</h1>
        <p className="text-body-md text-on-surface-variant">
          Theo dõi sự cải thiện của làn da theo thời gian.
        </p>
      </div>

      {/* Before / After */}
      <div className="bg-surface-container-lowest border border-border-pink rounded-xl p-6 shadow-ambient-pink mb-6">
        <div className="flex items-center justify-center gap-4 md:gap-8">
          <div className="text-center">
            <div className="w-28 h-36 md:w-40 md:h-52 rounded-2xl bg-primary-light flex items-center justify-center mb-2">
              <Icon name="face" className="text-6xl text-primary/40" />
            </div>
            <p className="text-caption text-on-surface-variant">Lần quét đầu</p>
            <p className="text-label-md text-on-surface">6 tuần trước</p>
          </div>

          <div className="flex flex-col items-center">
            <span className="px-4 py-2 gradient-bg text-white rounded-full text-label-md font-medium whitespace-nowrap">
              Cải thiện +15%
            </span>
            <Icon name="trending_up" className="text-primary text-3xl mt-3" />
          </div>

          <div className="text-center">
            <div className="w-28 h-36 md:w-40 md:h-52 rounded-2xl bg-primary-light flex items-center justify-center mb-2">
              <Icon name="face" className="text-6xl text-primary/60" />
            </div>
            <p className="text-caption text-on-surface-variant">Lần quét gần nhất</p>
            <p className="text-label-md text-on-surface">Hôm nay</p>
          </div>
        </div>
      </div>

      {/* Stats + trend */}
      <div className="bg-surface-container-lowest border border-border-pink rounded-xl p-6 shadow-ambient-pink">
        <div className="flex flex-wrap gap-3 mb-6">
          {PROGRESS_STATS.map((s) => (
            <div
              key={s.label}
              className="px-4 py-2 bg-surface-soft border border-border-pink rounded-full text-label-md"
            >
              <span className="text-on-surface-variant">{s.label} </span>
              <span className="font-semibold text-on-surface">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Biểu đồ cột đơn giản từ điểm da */}
        <div className="flex items-end gap-3 h-40">
          {[...SCAN_HISTORY].reverse().map((h) => (
            <div key={h.date} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full gradient-bg rounded-t-lg transition-all"
                style={{ height: `${h.score}%` }}
                title={`Điểm ${h.score}`}
              />
              <span className="text-caption text-on-surface-variant text-center leading-tight">
                {h.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
