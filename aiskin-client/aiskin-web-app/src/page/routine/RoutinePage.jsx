import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import RoutineStep from './components/RoutineStep'
import { PATHS } from '@/route/paths'
import { getScanHistory } from '@/api/scanApi'

const translateIssue = (issue) => {
  const dict = {
    'Acne': 'trị mụn',
    'Blackheads': 'giảm mụn đầu đen',
    'Pigmentation': 'mờ thâm nám',
    'Enlarged Pores': 'thu nhỏ lỗ chân lông',
    'Wrinkles': 'chống lão hóa',
    'Redness': 'làm dịu mẩn đỏ',
    'Oily': 'kiềm dầu',
    'Dry and dehydrated skin': 'cấp ẩm sâu',
    'Combination': 'cân bằng da',
    'Normal': 'duy trì da khỏe',
    'Sensitive': 'phục hồi da'
  }
  return dict[issue] || issue
}

const getIngredientDescription = (ing) => {
  // Dịch riêng các hoạt chất phổ biến để giao diện không bị lặp lại
  const name = ing.name?.toLowerCase() || ''
  if (name.includes('salicylic acid') || name.includes('bha')) return 'Tẩy tế bào chết sâu trong lỗ chân lông, đẩy lùi mụn ẩn và kiềm dầu hiệu quả.'
  if (name.includes('niacinamide')) return 'Làm sáng da, mờ thâm mụn, thu nhỏ lỗ chân lông và củng cố hàng rào bảo vệ da.'
  if (name.includes('vitamin c') || name.includes('ascorbic')) return 'Chống oxy hóa mạnh mẽ, làm sáng da, mờ thâm sạm và kích thích sinh collagen.'
  if (name.includes('retinol') || name.includes('retinoid')) return 'Kích thích tái tạo tế bào, làm phẳng nếp nhăn, chống lão hóa và hỗ trợ trị mụn.'
  if (name.includes('hyaluronic acid')) return 'Cấp nước đa tầng, giữ ẩm sâu giúp bề mặt da căng bóng và làm mờ nếp nhăn li ti.'
  if (name.includes('centella') || name.includes('cica') || name.includes('rau má')) return 'Làm dịu da tức thì, kháng viêm và đẩy nhanh quá trình phục hồi vùng da tổn thương.'
  if (name.includes('glycolic acid')) return 'AHA mạnh mẽ giúp bạt sừng bề mặt, làm sáng da, mờ thâm nám và chống lão hóa.'
  if (name.includes('lactic acid')) return 'AHA dịu nhẹ giúp tẩy tế bào chết bề mặt, vừa làm sáng vừa giữ ẩm cho da.'
  if (name.includes('panthenol') || name.includes('vitamin b5')) return 'Làm dịu da kích ứng, kháng viêm và phục hồi màng bảo vệ da cực kỳ hiệu quả.'
  if (name.includes('ceramide')) return 'Bổ sung màng bảo vệ da, khóa ẩm và ngăn chặn vi khuẩn, tác nhân gây hại xâm nhập.'
  if (name.includes('green tea')) return 'Chống oxy hóa, kháng khuẩn và làm dịu vùng da đang bị mụn viêm, mẩn đỏ.'
  if (name.includes('aloe vera')) return 'Cấp ẩm mỏng nhẹ, làm dịu vùng da cháy nắng hoặc đang kích ứng, phù hợp mọi loại da.'
  if (name.includes('azelaic acid')) return 'Kháng viêm mạnh, cực kỳ hiệu quả trong việc trị mụn viêm và làm mờ thâm sạm.'
  if (name.includes('peptide')) return 'Chuỗi axit amin giúp củng cố kết cấu, tăng độ đàn hồi và làm săn chắc da.'
  if (name.includes('squalane')) return 'Dầu dưỡng mỏng nhẹ, tương thích cao với bã nhờn tự nhiên, khóa ẩm mà không gây bít tắc.'
  if (name.includes('benzoyl peroxide')) return 'Tiêu diệt vi khuẩn gây mụn, giảm sưng viêm nhanh chóng cho mụn bọc, mụn mủ.'

  // Nếu không có trong từ điển, tự động sinh từ matched_issues
  const mappedIssues = ing.matched_issues?.map(translateIssue).join(', ') || 'cải thiện làn da'
  return `Hoạt chất y khoa được hệ thống AI đề xuất để giúp bạn ${mappedIssues}.`
}

const mapAiRoutineToSteps = (aiRoutineArray) => {
  if (!aiRoutineArray || !Array.isArray(aiRoutineArray)) return []
  return aiRoutineArray.map((item, index) => {
    let icon = 'spa'
    let colorTheme = 'primary'
    
    if (item.step === 'cleanser' || item.step === 'makeup_remover') {
      icon = 'wash'
      colorTheme = 'blue'
    } else if (item.step === 'toner') {
      icon = 'water_drop'
      colorTheme = 'teal'
    } else if (item.step === 'serum' || item.step === 'treatment') {
      icon = 'science'
      colorTheme = 'purple'
    } else if (item.step === 'moisturizer') {
      icon = 'opacity'
      colorTheme = 'rose'
    } else if (item.step === 'sunscreen') {
      icon = 'wb_sunny'
      colorTheme = 'amber'
    } else if (item.step === 'exfoliant') {
      icon = 'auto_awesome'
      colorTheme = 'indigo'
    }

    let title = item.name
    let freq = 'Hằng ngày'
    if (item.step === 'exfoliant') freq = '2-3 lần/tuần'
    
    if (item.recommended_ingredients && item.recommended_ingredients.length > 0) {
      title += ` (ưu tiên chứa: ${item.recommended_ingredients.join(', ')})`
    }

    return {
      step: index + 1,
      icon: icon,
      category: item.name,
      title: title,
      instruction: item.reason,
      frequency: freq,
      colorTheme: colorTheme
    }
  })
}

export default function RoutinePage() {
  const [time, setTime] = useState('morning')
  const location = useLocation()
  const navigate = useNavigate()

  const [historyList, setHistoryList] = useState([])
  const [selectedScanId, setSelectedScanId] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [aiRoutine, setAiRoutine] = useState(location.state?.routine || null)
  const [topIngredients, setTopIngredients] = useState(location.state?.topIngredients || [])
  const [skinType, setSkinType] = useState(location.state?.skinType || '')
  
  const [translatedDescriptions, setTranslatedDescriptions] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getScanHistory()
        if (res.data && res.data.length > 0) {
          setHistoryList(res.data)
          
          if (!location.state?.routine) {
            handleSelectScan(res.data[0])
          } else {
            setSelectedScanId(res.data[0]._id)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, []) 

  // Dịch description tiếng Anh sang tiếng Việt thông qua Google Translate API (Client-side)
  useEffect(() => {
    if (!topIngredients || topIngredients.length === 0) return

    const translateAll = async () => {
      const newTranslations = { ...translatedDescriptions }
      let changed = false

      for (const ing of topIngredients) {
        if (!ing.description) continue
        if (newTranslations[ing.name]) continue // Đã dịch rồi thì bỏ qua

        try {
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(ing.description)}`)
          const data = await res.json()
          let translatedText = ''
          // Google Translate chia câu dài thành nhiều mảng con
          if (data && data[0]) {
            data[0].forEach(part => {
              if (part[0]) translatedText += part[0]
            })
          }
          if (translatedText) {
            newTranslations[ing.name] = translatedText
            changed = true
          }
        } catch (err) {
          console.error("Lỗi dịch:", err)
        }
      }

      if (changed) {
        setTranslatedDescriptions(newTranslations)
      }
    }

    translateAll()
  }, [topIngredients])

  const handleSelectScan = (scan) => {
    setSelectedScanId(scan._id)
    setAiRoutine(scan.recommendedRoutine || null)
    setTopIngredients(scan.topIngredients || [])
    const typeLabel = scan.skinType === 'Dry' ? 'Da khô' : scan.skinType === 'Oily' ? 'Da dầu' : 'Da thường'
    setSkinType(typeLabel)
  }

  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  }

  if (isLoading && !aiRoutine) {
    return (
      <div className="flex justify-center items-center h-64 text-on-surface-variant">
        <div className="animate-spin mr-3"><Icon name="refresh" /></div>
        Đang tải lộ trình...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-error">
        <Icon name="error" className="mr-2" />
        Đã có lỗi xảy ra: {error}
      </div>
    )
  }

  if (!aiRoutine && historyList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <Icon name="search" className="text-5xl" />
        </div>
        <h2 className="text-headline-md text-on-surface mb-4">Bạn chưa có Lộ trình chăm sóc da</h2>
        <p className="text-body-md text-on-surface-variant max-w-md mx-auto mb-8">
          Hệ thống cần phân tích da của bạn để tạo ra một lộ trình chuyên sâu phù hợp nhất. Vui lòng thực hiện quét da AI để bắt đầu!
        </p>
        <button
          onClick={() => navigate(PATHS.SCAN)}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium shadow-md hover:shadow-lg transition-all"
        >
          Quét da ngay
        </button>
      </div>
    )
  }

  const routinesData = aiRoutine ? {
    morning: mapAiRoutineToSteps(aiRoutine.morning),
    evening: mapAiRoutineToSteps(aiRoutine.evening)
  } : { morning: [], evening: [] }

  const steps = routinesData[time] || []

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-2">Lộ trình chăm sóc da AI</h1>
          <p className="text-body-md text-on-surface-variant">
            Cá nhân hóa cho <span className="font-semibold text-primary">{skinType}</span> · Lộ trình chuyên sâu 4–6 tuần
          </p>
        </div>
        
        {historyList.length > 0 && (
          <div className="relative z-10">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 bg-surface-container-lowest px-5 py-2.5 rounded-full border border-border-pink hover:border-primary hover:shadow-ambient-pink transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Icon name="history" className="text-sm" />
              </div>
              <div className="text-left">
                <p className="text-caption text-on-surface-variant leading-none mb-1">Lịch sử quét</p>
                <p className="text-label-md text-on-surface font-semibold leading-none">
                  {selectedScanId ? formatDate(historyList.find(h => h._id === selectedScanId)?.createdAt) : 'Chọn bản quét'}
                </p>
              </div>
              <Icon name={isDropdownOpen ? 'expand_less' : 'expand_more'} className="text-on-surface-variant ml-2" />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest border border-border-pink rounded-2xl shadow-[0_8px_30px_rgba(103,80,228,0.12)] overflow-hidden max-h-80 overflow-y-auto z-10 custom-scrollbar">
                  <div className="p-2">
                    {historyList.map(h => {
                      const isSelected = h._id === selectedScanId;
                      return (
                        <div
                          key={h._id}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors hover:bg-surface-soft mb-1 last:mb-0 ${isSelected ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'}`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-surface-container overflow-hidden shrink-0 border border-border-pink/30 cursor-pointer" onClick={() => {
                            handleSelectScan(h);
                            setIsDropdownOpen(false);
                          }}>
                            <img src={h.imageUrl} alt="thumb" className="w-full h-full object-cover" />
                          </div>
                          <div className="grow cursor-pointer" onClick={() => {
                            handleSelectScan(h);
                            setIsDropdownOpen(false);
                          }}>
                            <p className={`text-label-md font-semibold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                              {formatDate(h.createdAt)}
                            </p>
                            <p className="text-caption text-on-surface-variant">
                              {h.skinType === 'Dry' ? 'Da khô' : h.skinType === 'Oily' ? 'Da dầu' : 'Da thường'}
                            </p>
                          </div>
                          {isSelected && <Icon name="check_circle" className="text-primary text-sm shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!aiRoutine ? (
        <div className="flex flex-col items-center justify-center text-center py-10">
          <p className="text-body-md text-on-surface-variant">
            Bản quét này quá cũ và chưa có thông tin lộ trình. Vui lòng quét lại da.
          </p>
          <button
            onClick={() => navigate(PATHS.SCAN)}
            className="mt-4 px-6 py-2 rounded-full border-2 border-primary text-primary hover:bg-surface-soft transition-colors font-medium"
          >
            Quét lại da
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Controls row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-lowest p-2 rounded-full border border-border-pink shadow-sm">
            {/* Toggle */}
            <div className="flex p-1 bg-surface-container-low rounded-full w-full md:w-auto">
              {[
                { key: 'morning', label: 'Buổi sáng', icon: 'wb_sunny' },
                { key: 'evening', label: 'Buổi tối', icon: 'dark_mode' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTime(t.key)}
                  className={[
                    'flex-1 md:flex-none px-6 py-2 rounded-full text-label-md flex justify-center items-center gap-2 transition-all',
                    time === t.key ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white shadow-sm' : 'text-on-surface-variant hover:text-primary',
                  ].join(' ')}
                >
                  <Icon name={t.icon} className="text-sm" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex w-full md:w-auto gap-2 px-2 pb-2 md:pb-0">
              <button
                type="button"
                onClick={() => navigate(PATHS.PRODUCTS)}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-500 text-white text-label-md font-semibold shadow-sm hover:opacity-90 transition-all flex justify-center items-center gap-2 whitespace-nowrap"
              >
                Gợi ý mỹ phẩm <Icon name="shopping_bag" className="text-[16px]" />
              </button>
              <button
                type="button"
                onClick={() => navigate(PATHS.SCAN)}
                className="flex-1 md:flex-none px-5 py-2.5 rounded-full border-2 border-border-pink text-primary text-label-md font-semibold hover:bg-primary/5 transition-colors flex justify-center items-center gap-2 whitespace-nowrap"
              >
                Quét lại <Icon name="photo_camera" className="text-[16px]" />
              </button>
            </div>
          </div>

          {/* Routine Steps */}
          <div className="mt-4 px-2 md:px-6">
            {steps.length === 0 ? (
              <p className="text-center text-on-surface-variant py-8">Chưa có bước nào trong buổi này.</p>
            ) : (
              steps.map((s, i) => (
                <RoutineStep key={s.step} {...s} isLast={i === steps.length - 1} time={time} />
              ))
            )}
          </div>

          {/* Top Ingredients Box (Moved to bottom & Compact) */}
          {topIngredients.length > 0 && (
            <div className="mt-8 bg-gradient-to-b from-sky-50 to-indigo-50 border border-indigo-100 rounded-[10px] p-7 shadow-[0_8px_30px_rgba(99,102,241,0.1)]">
              <h3 className="text-title-lg text-indigo-700 mb-2 flex items-center gap-2 font-bold">
                <Icon name="science" />
                Thành phần Dược lý khuyên dùng
              </h3>
              <p className="text-body-sm text-indigo-600/80 mb-6 font-medium">
                Các hoạt chất tối ưu nhất được AI bác sĩ lựa chọn dựa trên 7 lớp phân tích da của bạn:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topIngredients.map((ing, idx) => {
                  // Dùng bản dịch trực tiếp, nếu chưa dịch xong thì dùng description gốc hoặc fallback
                  const description = translatedDescriptions[ing.name] 
                                      || getIngredientDescription(ing);
                  return (
                    <div key={idx} className="bg-white p-5 rounded-[10px] border border-indigo-100 hover:border-indigo-300 transition-colors shadow-sm flex flex-col justify-between group">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <h4 className="text-label-lg text-indigo-900 font-bold group-hover:text-indigo-600 transition-colors">
                          {ing.name}
                        </h4>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold whitespace-nowrap uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm">
                          <Icon name="verified" className="text-[12px]" />
                          Lý tưởng
                        </span>
                      </div>
                      <div className="flex items-start gap-2 bg-indigo-50/50 border border-indigo-50 p-3 rounded-[10px] h-32">
                        <Icon name="medical_information" className="text-indigo-500 text-sm mt-0.5 shrink-0" />
                        <div className="overflow-y-auto custom-scrollbar pr-1 h-full grow">
                          <p className="text-body-sm text-slate-600 leading-relaxed font-medium">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
