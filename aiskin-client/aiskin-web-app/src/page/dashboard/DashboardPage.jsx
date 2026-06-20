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
import { analyzeSkin, validateSkin } from '@/api/scanApi'
import { Spin, message } from 'antd'

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
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const pairing = usePairingSession()

  const handleFileSelected = async (file) => {
    if (!file) return
    setIsLoading(true)
    setScanError(null)
    try {
      const data = await validateSkin(file)
      // Dùng ảnh đã qua xử lý (cắt gọn, CLAHE) từ API trả về để hiện Preview
      setPreviewUrl(data.processed_image_b64)
      setSelectedFile(file)
    } catch (error) {
      setScanError(error.message || 'Ảnh không hợp lệ!')
      setPreviewUrl(URL.createObjectURL(file))
      setSelectedFile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setIsLoading(true)
    setScanError(null)
    try {
      const result = await analyzeSkin(selectedFile)
      // Chuyển sang trang kết quả, truyền kèm JSON và URL ảnh gốc
      navigate(PATHS.ANALYSIS, { 
        state: { 
          result, 
          originalImage: previewUrl 
        } 
      })
    } catch (error) {
      setScanError(error.message || 'Có lỗi xảy ra khi phân tích ảnh!')
    } finally {
      setIsLoading(false)
    }
  }

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
        <section className="max-w-3xl mx-auto mb-8">
          <div>
            <Spin spinning={isLoading} tip="AI đang phân tích từng nốt mụn... vùi lòng đợi!">
              {previewUrl && scanError ? (
                <div className="w-full h-[500px] rounded-xl border-2 border-[#ef4444] border-dashed flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#fef2f2]">
                  <img src={previewUrl} alt="Preview" className="w-40 h-40 object-cover rounded-2xl mb-6 shadow-lg border-2 border-[#ef4444]" />
                  <h3 className="text-title-lg text-[#b91c1c] font-semibold mb-2 flex items-center gap-2">
                    <Icon name="error" className="text-xl" />
                    Ảnh không được chấp nhận
                  </h3>
                  <p className="text-body-md text-[#991b1b] text-center mb-8 max-w-sm">
                    {scanError}
                  </p>
                  <button 
                    onClick={() => { setScanError(null); setPreviewUrl(null); setSelectedFile(null); }}
                    className="px-8 py-2.5 rounded-full bg-[#ef4444] text-white text-label-md font-medium shadow-md hover:bg-[#dc2626] transition-colors"
                  >
                    Đổi ảnh khác
                  </button>
                </div>
              ) : previewUrl && !scanError ? (
                <div className="w-full h-[500px] rounded-xl border-2 border-green-500 border-dashed flex flex-col items-center justify-center p-6 relative overflow-hidden bg-green-50">
                  <h3 className="text-headline-sm text-green-600 font-bold mb-2 uppercase tracking-wide">ẢNH ĐÃ SẴN SÀNG</h3>
                  <p className="text-body-sm text-on-surface-variant mb-6 text-center max-w-sm">
                    Vui lòng kiểm tra lại ảnh. Đảm bảo ảnh rõ nét và không bị lóa sáng để AI phân tích chính xác nhất.
                  </p>
                  <img src={previewUrl} alt="Preview" className="w-48 h-48 object-cover rounded-2xl mb-8 shadow-md border-4 border-white" />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                      className="px-6 py-2.5 rounded-full border border-outline text-on-surface text-label-md font-medium hover:bg-surface-soft transition-colors"
                    >
                      Đổi ảnh khác
                    </button>
                    <button 
                      onClick={handleAnalyze}
                      className="px-6 py-2.5 rounded-full gradient-bg text-white text-label-md font-medium shadow-md hover:opacity-90 transition-all flex items-center gap-2"
                    >
                      <Icon name="psychology" className="text-xl" />
                      Phân tích ngay
                    </button>
                  </div>
                </div>
              ) : (
                <UploadDropzone onFileSelected={handleFileSelected} />
              )}
            </Spin>
          </div>
        </section>
      )}
    </div>
  )
}
