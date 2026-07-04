import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import UploadDropzone from '@/page/scan/components/UploadDropzone'
import AnalysisResultPage from '@/page/analysis/AnalysisResultPage'
import { analyzeSkin, validateSkin } from '@/api/scanApi'
import { Spin } from 'antd'

/**
 * Trang "Quét da": tải ảnh khuôn mặt lên web và xem kết quả phân tích ngay trên cùng trang.
 */
export default function DashboardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(location.state?.originalImage || null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(location.state?.result || null)
  const [analysisImage, setAnalysisImage] = useState(location.state?.originalImage || null)

  const handleFileSelected = async (file) => {
    if (!file) return
    setIsLoading(true)
    setScanError(null)
    setAnalysisResult(null)
    setAnalysisImage(null)

    try {
      const data = await validateSkin(file)
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
      setAnalysisResult(result)
      setAnalysisImage(previewUrl)
      navigate(PATHS.SCAN, {
        replace: true,
        state: {
          result,
          originalImage: previewUrl,
        },
      })
    } catch (error) {
      setScanError(error.message || 'Có lỗi xảy ra khi phân tích ảnh!')
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanAgain = () => {
    setAnalysisResult(null)
    setAnalysisImage(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setScanError(null)
    navigate(PATHS.SCAN, { replace: true })
  }

  if (analysisResult && analysisImage) {
    return (
      <AnalysisResultPage
        result={analysisResult}
        originalImage={analysisImage}
        onScanAgain={handleScanAgain}
      />
    )
  }

  return (
    <div>
      <section className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-headline-sm md:text-headline-md text-on-surface font-semibold mb-2">
          Quét &amp; phân tích làn da
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
          Tải ảnh khuôn mặt của bạn trực tiếp lên đây để AI phân tích tình trạng da.
        </p>
      </section>

      <section className="max-w-3xl mx-auto mb-8">
        <Spin spinning={isLoading} tip="AI đang phân tích từng nốt mụn... vui lòng đợi!">
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
                type="button"
                onClick={() => { setScanError(null); setPreviewUrl(null); setSelectedFile(null) }}
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
                  type="button"
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null) }}
                  className="px-6 py-2.5 rounded-full border border-outline text-on-surface text-label-md font-medium hover:bg-surface-soft transition-colors"
                >
                  Đổi ảnh khác
                </button>
                <button
                  type="button"
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
      </section>
    </div>
  )
}
