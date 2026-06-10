import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import ScoreGauge from './components/ScoreGauge'
import ConditionCard from './components/ConditionCard'

/** Dữ liệu demo - sau này lấy từ AI Scan Service (ScanAnalysis + SkinCondition). */
const SKIN_TYPES = ['Da dầu', 'Da nhạy cảm']
const CONDITIONS = [
  {
    icon: 'coronavirus',
    title: 'Mụn & khuyết điểm',
    severityLabel: 'Trung bình',
    severity: 'moderate',
    level: 60,
    description:
      'Tập trung chủ yếu ở vùng quai hàm và cằm. Có thể do thay đổi nội tiết tố.',
  },
  {
    icon: 'wb_sunny',
    title: 'Sạm nám',
    severityLabel: 'Cần chú ý',
    severity: 'high',
    level: 85,
    description:
      'Phát hiện đốm nắng ở vùng gò má trên. Cần tăng cường chống nắng trong lộ trình hằng ngày.',
  },
  {
    icon: 'water_drop',
    title: 'Độ ẩm',
    severityLabel: 'Tối ưu',
    severity: 'optimal',
    level: 25,
    description: 'Hàng rào bảo vệ da còn nguyên vẹn, giữ ẩm tốt ở vùng chữ T.',
  },
]

/**
 * Trang kết quả phân tích da: ảnh + điểm tổng thể (trái),
 * danh sách tình trạng da (phải).
 */
export default function AnalysisResultPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-background mb-2">
            Kết quả phân tích
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Phân tích chi tiết tình trạng sức khỏe làn da của bạn.
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          {SKIN_TYPES.map((t) => (
            <span key={t} className="px-4 py-2 bg-primary-light text-tertiary rounded-full text-label-md">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: photo + score */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-border-pink shadow-ambient-pink flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden mb-6 bg-primary-light flex items-center justify-center">
              <Icon name="face" className="text-[120px] text-primary/40" />
              <div className="absolute top-1/4 left-1/3 w-8 h-8 rounded-full border-2 border-primary border-dashed animate-pulse" />
              <div className="absolute top-1/2 right-1/4 w-12 h-12 rounded-full border-2 border-warning border-dashed animate-pulse" />
              <div className="absolute bottom-1/3 left-1/4 w-10 h-10 rounded-full border-2 border-error border-dashed animate-pulse" />
            </div>

            <div className="flex items-center justify-between w-full bg-surface-soft p-4 rounded-xl border border-border-pink">
              <div>
                <h3 className="text-headline-md text-on-surface">Sức khỏe tổng thể</h3>
                <p className="text-caption text-on-surface-variant">Khá tốt, cần chăm sóc nhẹ.</p>
              </div>
              <ScoreGauge score={82} />
            </div>
          </div>
        </div>

        {/* Right: conditions */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h2 className="text-headline-md text-on-surface mb-2 px-2">Tình trạng phát hiện</h2>
          {CONDITIONS.map((c) => (
            <ConditionCard key={c.title} {...c} />
          ))}

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              className="flex-1 bg-surface-container-lowest border-2 border-border-pink text-primary py-3 rounded-full text-label-md hover:bg-surface-soft transition-colors flex justify-center items-center gap-2"
            >
              <Icon name="download" /> Tải báo cáo
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.ROUTINE)}
              className="flex-1 gradient-bg text-white py-3 rounded-full text-label-md shadow-sm hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
            >
              Xem lộ trình gợi ý <Icon name="arrow_forward" />
            </button>
          </div>

          <p className="text-caption text-on-surface-variant italic mt-2 px-2">
            Kết quả phân tích chỉ mang tính tham khảo và không thay thế bác sĩ da liễu chuyên môn.
          </p>
        </div>
      </div>
    </div>
  )
}
