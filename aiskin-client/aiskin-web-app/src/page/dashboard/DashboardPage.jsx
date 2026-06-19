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
  { key: 'upload', label: 'Tải ảnh lên', icon: 'upload' },
  { key: 'phone', label: 'Quét từ điện thoại (Coming soon)', icon: 'qr_code_scanner', disabled: true },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('upload')
  const pairing = usePairingSession()

  const goAnalyze = () => navigate(PATHS.ANALYSIS)

  return (
    <div>
      {/* Hero */}
      <section className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-headline-sm md:text-headline-md text-on-surface font-semibold mb-2">
          Quét &amp; phân tích làn da
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
          Tải ảnh khuôn mặt của bạn trực tiếp lên đây để AI phân tích tình trạng da.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-surface-container-low rounded-full border border-border-pink/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              disabled={t.disabled}
              onClick={() => setTab(t.key)}
              className={[
                'px-5 py-2 rounded-full text-label-md flex items-center gap-2 transition-all',
                t.disabled ? 'opacity-50 cursor-not-allowed grayscale' : '',
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
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col gap-8">
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
          <div>
            <TipsCard />
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <UploadDropzone onFileSelected={goAnalyze} />
          </div>
          <div>
            <TipsCard />
          </div>
        </section>
      )}
    </div>
  )
}
