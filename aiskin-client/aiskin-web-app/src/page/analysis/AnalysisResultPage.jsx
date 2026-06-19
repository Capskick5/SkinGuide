import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import ScoreGauge from './components/ScoreGauge'
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

export default function AnalysisResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const result = location.state?.result
  const originalImage = location.state?.originalImage
  
  const [imgDims, setImgDims] = useState({ w: 1, h: 1 })

  useEffect(() => {
    if (!result || !originalImage) {
      navigate(PATHS.SCAN)
    }
  }, [result, originalImage, navigate])

  if (!result) return null

  // Xử lý dữ liệu AI trả về
  const skinType = result.skin_type === 'Dry' ? 'Da khô' : result.skin_type === 'Oily' ? 'Da dầu' : 'Da thường'
  
  // Tính điểm tổng thể (Chỉ dựa vào Siêu AI 7 Lớp)
  const topIssueConf = result.ultimate_analysis?.[0]?.confidence || 0
  const overallScore = Math.max(10, 100 - Math.round(topIssueConf * 0.8))

  // Map ultimate_analysis sang CONDITIONS
  const CONDITIONS = result.ultimate_analysis.map(item => {
    const meta = CONDITION_METADATA[item.issue] || CONDITION_METADATA.Healthy
    return {
      icon: meta.icon,
      title: meta.label,
      severityLabel: `${item.confidence.toFixed(1)}%`,
      severity: item.confidence > 50 ? 'high' : item.confidence > 20 ? 'moderate' : 'optimal',
      level: Math.round(item.confidence),
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
            Phân tích chi tiết tình trạng sức khỏe làn da của bạn dựa trên Siêu AI.
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
                <h3 className="text-headline-md text-on-surface">Sức khỏe tổng thể</h3>
                <p className="text-caption text-on-surface-variant">Dựa trên AI phân tích</p>
              </div>
              <ScoreGauge score={overallScore} />
            </div>
          </div>
        </div>

        {/* Right: conditions */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h2 className="text-headline-md text-on-surface mb-2 px-2">Top Vấn đề phát hiện</h2>
          
          <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 mb-2">
            <p className="text-body-sm text-on-surface">
              <strong>💡 Hướng dẫn đọc thông số:</strong> Số phần trăm (%) hiển thị bên phải các mục dưới đây là <strong>Độ tự tin (Khả năng chắc chắn) của Trí Tuệ Nhân Tạo</strong> khi chẩn đoán. Tỷ lệ % càng cao đồng nghĩa với việc AI càng tin chắc vùng da đó đang gặp tổn thương, và bạn nên ưu tiên điều trị vấn đề đó trước tiên.
            </p>
          </div>

          {CONDITIONS.map((c, i) => (
            <ConditionCard key={i} {...c} />
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
              onClick={() => navigate(PATHS.ROUTINE, { 
                state: { 
                  routine: result.recommended_routine, 
                  topIngredients: result.top_ingredients,
                  skinType: skinType
                } 
              })}
              className="flex-1 gradient-bg text-white py-3 rounded-full text-label-md shadow-sm hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
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
