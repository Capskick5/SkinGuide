import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import ConditionCard from './components/ConditionCard'

const CONDITION_METADATA = {
  Acne: { icon: 'coronavirus', label: 'Mụn & khuyết điểm', desc: 'Có thể do bít tắc lỗ chân lông hoặc nội tiết tố.' },
  Blackheads: { icon: 'grain', label: 'Mụn đầu đen', desc: 'Sự oxy hóa bã nhờn tại lỗ chân lông hở.' },
  Dark_Spots: { icon: 'wb_sunny', label: 'Thâm / Sạm', desc: 'Sự tăng sắc tố sau viêm hoặc do ánh nắng.' },
  Pigmentation: { icon: 'lens_blur', label: 'Nám / Tàn nhang', desc: 'Phân bổ melanin không đều do yếu tố bên trong/ngoài.' },
  Pores: { icon: 'trip_origin', label: 'Lỗ chân lông to', desc: 'Sự giãn nở nang lông do lượng bã nhờn dư thừa.' },
  Redness: { icon: 'water_drop', label: 'Mẩn đỏ / Nhạy cảm', desc: 'Dấu hiệu hàng rào bảo vệ da đang bị tổn thương.' },
  Wrinkles: { icon: 'waves', label: 'Nếp nhăn', desc: 'Dấu hiệu lão hóa, suy giảm collagen và elastin.' },
  Healthy: { icon: 'check_circle', label: 'Khỏe mạnh', desc: 'Làn da trong trạng thái khá tốt.' }
}

export default function AnalysisResultPage({
  result: providedResult,
  originalImage: providedOriginalImage,
  onScanAgain,
} = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const result = providedResult || location.state?.result
  const originalImage = providedOriginalImage || location.state?.originalImage
  
  useEffect(() => {
    if (!onScanAgain && (!result || !originalImage)) {
      navigate(PATHS.SCAN)
    }
  }, [result, originalImage, navigate, onScanAgain])

  const [activeZone, setActiveZone] = useState('t_zone')

  if (!result || !result.scan_result) return null

  const scanResult = result.scan_result
  // Xử lý dữ liệu AI trả về
  const skinType = scanResult.skinType?.predicted === 'Dry' ? 'Da khô' : scanResult.skinType?.predicted === 'Oily' ? 'Da dầu' : 'Da thường'
  const skinTypeReliable = scanResult.skinType?.reliable !== false
  const skinTypeConfidence = Math.round((scanResult.skinType?.confidence || 0) * 100)
  
  const zones = scanResult.facialZones || { t_zone: { issues: [] }, u_zone: { issues: [] } }
  const issueModelAvailable = scanResult.modelHealth?.skinIssueModel === 'loaded'
  const wholeFaceIssues = zones.issues || []
  const analysisUsesZones = wholeFaceIssues.length === 0
  const currentIssues = analysisUsesZones ? (zones[activeZone]?.issues || []) : wholeFaceIssues

  // Map issues sang CONDITIONS
  const CONDITIONS = currentIssues.map(item => {
    const meta = CONDITION_METADATA[item.name] || CONDITION_METADATA.Healthy
    
    // Legacy checkpoints may contain severity; the current contract reports detection probability only.
    let severityColor = 'optimal'
    if (item.severity === 'Severe') severityColor = 'high'
    else if (item.severity === 'Moderate') severityColor = 'moderate'
    else if (item.severity === 'Mild') severityColor = 'low'
    else if (item.detected) severityColor = 'moderate'

    const probabilityPercent = Math.round((item.probability || 0) * 100)
    const severityLabel = item.detected
      ? `Phát hiện (${probabilityPercent}%)`
      : item.severity === 'Clear'
        ? 'Không phát hiện'
        : `${item.severity} (${probabilityPercent}%)`
    
    return {
      icon: meta.icon,
      title: meta.label,
      severityLabel,
      severity: severityColor,
      level: probabilityPercent,
      description: meta.desc
    }
  })

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-background mb-2">
            Kết quả phân tích
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Kết quả hỗ trợ phân loại loại da từ ảnh khuôn mặt đã kiểm định.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-primary-light text-tertiary rounded-full text-label-md font-bold">
            {skinType}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: photo + score */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-border-pink shadow-ambient-pink flex flex-col items-center">
            
            <div className="relative w-full rounded-2xl overflow-hidden mb-6 bg-surface-container flex items-center justify-center">
              <img 
                src={originalImage} 
                alt="Scan" 
                className="w-full h-auto object-contain block"
              />
            </div>

            <div className="flex items-center justify-between w-full bg-surface-soft p-4 rounded-xl border border-border-pink">
              <div>
                <h3 className="text-headline-md text-on-surface">Dấu hiệu da</h3>
                <p className="text-caption text-on-surface-variant">
                  {issueModelAvailable ? 'Kết quả hỗ trợ, không phải chẩn đoán' : 'Chưa có model đủ bằng chứng'}
                </p>
              </div>
              <span className="text-headline-md font-bold text-on-surface-variant">
                {issueModelAvailable ? currentIssues.length : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: conditions */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h2 className="text-headline-md text-on-surface mb-2 px-2">Vấn đề da phát hiện</h2>

          {!issueModelAvailable && (
            <div className="bg-warning/10 p-4 rounded-xl border border-warning/30 mb-2">
              <p className="text-body-sm text-on-surface">
                Model nhận diện vấn đề da chưa khả dụng. Kết quả hiện tại chỉ xác định loại da và lộ trình nền tảng, không kết luận tình trạng da.
              </p>
            </div>
          )}

          {!skinTypeReliable && (
            <div className="bg-warning/10 p-4 rounded-xl border border-warning/30 mb-2">
              <p className="text-body-sm text-on-surface">
                Độ tin cậy loại da hiện là {skinTypeConfidence}%, dưới ngưỡng 60%. Hãy quét lại với ảnh chính diện, đủ sáng trước khi tạo lộ trình.
              </p>
            </div>
          )}
          
          {issueModelAvailable && <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 mb-2">
            <p className="text-body-sm text-on-surface">
              AI có thể phát hiện đồng thời nhiều dấu hiệu nhìn thấy được. Phần trăm là độ tin cậy so với threshold của từng nhãn, không phải mức độ bệnh.
            </p>
          </div>}

          {/* Tabs T-Zone / U-Zone */}
          {issueModelAvailable && analysisUsesZones && <div className="flex gap-2 mb-4 bg-surface-container-low p-1 rounded-full border border-border-pink">
            <button 
              onClick={() => setActiveZone('t_zone')}
              className={`flex-1 py-2 rounded-full text-label-md font-bold transition-all ${activeZone === 't_zone' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Vùng chữ T (Trán, Mũi)
            </button>
            <button 
              onClick={() => setActiveZone('u_zone')}
              className={`flex-1 py-2 rounded-full text-label-md font-bold transition-all ${activeZone === 'u_zone' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Vùng chữ U (Má, Cằm)
            </button>
          </div>}

          {CONDITIONS.length > 0 ? CONDITIONS.map((c, i) => (
            <ConditionCard key={i} {...c} />
          )) : (
            <div className="p-4 text-center text-on-surface-variant">
              {issueModelAvailable
                ? 'Không phát hiện vấn đề nghiêm trọng nào ở vùng này.'
                : 'Chưa có kết quả nhận diện vấn đề da.'}
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            {onScanAgain ? (
              <button
                type="button"
                onClick={onScanAgain}
                className="flex-1 bg-surface-container-lowest border-2 border-border-pink text-primary py-3 rounded-full text-label-md hover:bg-surface-soft transition-colors flex justify-center items-center gap-2"
              >
                <Icon name="refresh" /> Quét lại
              </button>
            ) : (
              <button
                type="button"
                className="flex-1 bg-surface-container-lowest border-2 border-border-pink text-primary py-3 rounded-full text-label-md hover:bg-surface-soft transition-colors flex justify-center items-center gap-2"
              >
                <Icon name="download" /> Tải báo cáo
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(PATHS.ROUTINE, { 
                state: { 
                  scanId: scanResult._id,
                  skinType: skinType,
                  needsGeneration: true
                } 
              })}
              disabled={!skinTypeReliable}
              className="flex-1 gradient-bg text-white py-3 rounded-full text-label-md shadow-sm hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Xem lộ trình gợi ý <Icon name="arrow_forward" />
            </button>
          </div>

          <p className="text-caption text-on-surface-variant italic mt-2 px-2">
            Kết quả phân tích từ AI Scan Service chỉ mang tính tham khảo và không thay thế bác sĩ da liễu chuyên môn.
          </p>
        </div>
      </div>
    </div>
  )
}
