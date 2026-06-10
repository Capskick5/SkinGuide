import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import UploadDropzone from '@/page/scan/components/UploadDropzone'
import TipsCard from '@/page/scan/components/TipsCard'
import PhonePairing from '@/page/scan/components/PhonePairing'
import ReceivedImages from '@/page/scan/components/ReceivedImages'
import usePairingSession from '@/page/scan/hooks/usePairingSession'
import SuggestionCard from './components/SuggestionCard'

/**
 * Trang "Quét da": 2 cách đưa ảnh khuôn mặt vào hệ thống để AI phân tích.
 *  - Tab "Quét từ điện thoại": ghép nối qua QR, nhận ảnh real-time từ app.
 *  - Tab "Tải ảnh lên": kéo-thả/chọn ảnh trực tiếp trên web (dự phòng).
 */
const TABS = [
  { key: 'phone', label: 'Quét từ điện thoại', icon: 'qr_code_scanner' },
  { key: 'upload', label: 'Tải ảnh lên', icon: 'upload' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('phone')
  const pairing = usePairingSession()

  const goAnalyze = () => navigate(PATHS.ANALYSIS)

  return (
    <div>
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-headline-lg-mobile md:text-display-hero text-on-surface mb-4">
          Quét &amp; phân tích làn da
        </h1>
        <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
          Chụp ảnh khuôn mặt bằng điện thoại và gửi lên đây, hoặc tải ảnh trực tiếp để AI phân tích
          tình trạng da của bạn.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-surface-container-low rounded-full border border-border-pink/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                'px-5 py-2 rounded-full text-label-md flex items-center gap-2 transition-all',
                tab === t.key
                  ? 'gradient-bg text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-primary',
              ].join(' ')}
            >
              <Icon name={t.icon} className="text-base" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nội dung theo tab */}
      {tab === 'phone' ? (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="lg:col-span-8 flex flex-col gap-8">
            <PhonePairing
              sessionId={pairing.sessionId}
              status={pairing.status}
              secondsLeft={pairing.secondsLeft}
              error={pairing.error}
              onStart={pairing.startSession}
              onReset={pairing.reset}
            />
            <ReceivedImages images={pairing.images} onAnalyze={goAnalyze} />
          </div>
          <div className="lg:col-span-4">
            <TipsCard />
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="lg:col-span-8">
            <UploadDropzone onFileSelected={goAnalyze} />
          </div>
          <div className="lg:col-span-4">
            <TipsCard />
          </div>
        </section>
      )}

      {/* Suggestions */}
      <section className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Khám phá thêm
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SuggestionCard
            icon="face_retouching_natural"
            title="Da của tôi"
            description="Xem kết quả phân tích chi tiết về độ ẩm, nếp nhăn và khuyết điểm trên da."
            cta="Xem phân tích"
            to={PATHS.ANALYSIS}
          />
          <SuggestionCard
            icon="auto_awesome"
            title="Nhận lộ trình"
            description="Nhận lộ trình chăm sóc da sáng/tối được cá nhân hóa theo kết quả AI."
            cta="Xem lộ trình"
            to={PATHS.ROUTINE}
          />
          <SuggestionCard
            icon="local_mall"
            title="Tìm sản phẩm"
            description="Khám phá các sản phẩm phù hợp với hồ sơ da của bạn."
            cta="Xem gợi ý"
            to={PATHS.PRODUCTS}
          />
        </div>
      </section>
    </div>
  )
}
