import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import RoutineStep from './components/RoutineStep'
import { PATHS } from '@/route/paths'
import { getScanHistory, generateRoutine, generateRecommendations, getScanRoutine, getRoutineRecommendations } from '@/api/scanApi'
import { useCart } from '@/hook/useCart'

const translateIssue = (issue) => {
  const dict = {
    'Acne': 'Trị mụn',
    'Blackheads': 'Giảm mụn đầu đen',
    'Pigmentation': 'Mờ thâm nám',
    'Enlarged Pores': 'Thu nhỏ lỗ chân lông',
    'Wrinkles': 'Chống lão hóa',
    'Redness': 'Làm dịu mẩn đỏ',
    'Oily': 'Kiềm dầu',
    'Dry and dehydrated skin': 'Cấp ẩm sâu',
    'Combination': 'Cân bằng da',
    'Normal': 'Duy trì da khỏe',
    'Sensitive': 'Phục hồi da'
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
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [aiRoutine, setAiRoutine] = useState(location.state?.routine || null)
  const [topIngredients, setTopIngredients] = useState(location.state?.topIngredients || [])
  const [focusAreas, setFocusAreas] = useState(location.state?.focusAreas || [])
  const [skinType, setSkinType] = useState(location.state?.skinType || '')
  const [productRecommendations, setProductRecommendations] = useState(location.state?.productRecommendations || [])

  const [translatedDescriptions, setTranslatedDescriptions] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(null)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [error, setError] = useState(null)
  
  const { addMultipleItems, addItem } = useCart()

  const handleAddTierToCart = (tier) => {
    setIsAddingToCart(tier)
    const selectedProducts = []
    
    productRecommendations.forEach(stepRec => {
      if (stepRec.products && stepRec.products.length > 0) {
        // Sắp xếp sản phẩm theo giá tăng dần
        const sortedProducts = [...stepRec.products].sort((a, b) => (a.price || 0) - (b.price || 0))
        
        let selectedProduct = null
        if (tier === 'cheap') {
          selectedProduct = sortedProducts[0]
        } else if (tier === 'premium') {
          selectedProduct = sortedProducts[sortedProducts.length - 1]
        } else if (tier === 'mid') {
          selectedProduct = sortedProducts[Math.floor(sortedProducts.length / 2)]
        }
        
        if (selectedProduct && !selectedProducts.find(ext => ext.id === selectedProduct.id)) {
          selectedProducts.push({
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            imageUrl: selectedProduct.imageUrl || selectedProduct.images?.[0],
            slug: selectedProduct.slug
          })
        }
      }
    })
    
    if (selectedProducts.length > 0) {
      addMultipleItems(selectedProducts)
      setTimeout(() => {
        navigate('/cart')
      }, 600)
    } else {
      setIsAddingToCart(null)
    }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getScanHistory()
        if (res.data && res.data.length > 0) {
          setHistoryList(res.data)

          if (location.state?.scanId) {
            const targetScan = res.data.find(h => h._id === location.state.scanId)
            if (targetScan) {
              await handleSelectScan(targetScan)
              if (location.state?.needsGeneration && !targetScan.hasRoutine) {
                // Auto generate if coming from scan page
                handleGenerateRoutine(targetScan._id)
              }
            } else {
              await handleSelectScan(res.data[0])
            }
          } else {
            await handleSelectScan(res.data[0])
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

  async function handleGenerateRoutine(scanId) {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await generateRoutine(scanId)
      if (res.status === 'success') {
        // Tải lại lịch sử để cập nhật lộ trình mới
        const histRes = await getScanHistory()
        if (histRes.data) {
          setHistoryList(histRes.data)
          const updatedScan = histRes.data.find(h => h._id === scanId)
          if (updatedScan) {
            await handleSelectScan(updatedScan)
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateRecommendations() {
    if (!selectedRoutineId) return
    setIsGeneratingRecs(true)
    setError(null)
    try {
      const scan = historyList.find(h => h._id === selectedScanId)
      const res = await generateRecommendations(selectedRoutineId, scan?.userId || '')
      if (res.status === 'success') {
        setProductRecommendations(res.data)
        const updatedHistory = historyList.map(h => {
          if (h._id === selectedScanId) return { ...h, productRecommendations: res.data }
          return h
        })
        setHistoryList(updatedHistory)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGeneratingRecs(false)
    }
  }

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

  async function handleSelectScan(scan) {
    setSelectedScanId(scan._id)
    const typeLabel = scan.skinType === 'Dry' ? 'Da khô' : scan.skinType === 'Oily' ? 'Da dầu' : 'Da thường'
    setSkinType(typeLabel)
    
    // Reset state before loading new data
    setAiRoutine(null)
    setTopIngredients([])
    setFocusAreas([])
    setProductRecommendations([])
    setSelectedRoutineId('')
    
    if (scan.hasRoutine) {
      setIsLoadingRoutine(true)
      try {
        const routineRes = await getScanRoutine(scan._id)
        if (routineRes.status === 'success' && routineRes.data) {
          const rData = routineRes.data
          setAiRoutine(rData.routine || null)
          setTopIngredients(rData.topIngredients || [])
          setFocusAreas(rData.focusAreas || [])
          setSelectedRoutineId(rData._id || '')
          
          // Fetch recommendations
          const recRes = await getRoutineRecommendations(rData._id)
          if (recRes.status === 'success' && recRes.data) {
             setProductRecommendations(recRes.data)
          }
        }
      } catch(err) {
        console.error("Lỗi khi fetch chi tiết routine:", err)
      } finally {
        setIsLoadingRoutine(false)
      }
    }
  }

  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-on-surface-variant">
        <div className="animate-spin mr-3"><Icon name="refresh" /></div>
        Đang tải dữ liệu...
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

  if (isLoadingRoutine) {
    return (
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-lg text-on-surface mb-2">Lộ trình chăm sóc da AI</h1>
            <p className="text-body-md text-on-surface-variant">
              Cá nhân hóa cho <span className="font-semibold text-primary">{skinType}</span> · Lộ trình chuyên sâu 4–6 tuần
            </p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64 text-primary">
          <div className="animate-spin mr-3"><Icon name="refresh" /></div>
          Đang lấy thông tin Lộ trình & Sản phẩm gợi ý...
        </div>
      </div>
    )
  }

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
                  {selectedScanId ? formatDate(historyList.find(h => h._id === selectedScanId)?.analyzedAt) : 'Chọn bản quét'}
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
                              {formatDate(h.analyzedAt)}
                            </p>
                            <p className="text-caption text-on-surface-variant">
                              {h.skinType?.predicted ? (h.skinType.predicted === 'Dry' ? 'Da khô' : h.skinType.predicted === 'Oily' ? 'Da dầu' : 'Da thường') : (h.skinType === 'Dry' ? 'Da khô' : h.skinType === 'Oily' ? 'Da dầu' : 'Da thường')}
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
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Icon name="auto_awesome" className="text-4xl" />
          </div>
          <p className="text-body-md text-on-surface-variant max-w-sm mb-6">
            Bản quét này chưa có lộ trình chăm sóc da. Nhấn nút bên dưới để AI tổng hợp dữ liệu và tạo lộ trình chuyên sâu cho bạn.
          </p>
          <button
            onClick={() => handleGenerateRoutine(selectedScanId)}
            disabled={isGenerating}
            className={`px-8 py-3 rounded-full text-white font-medium shadow-md transition-all flex items-center justify-center gap-2 ${isGenerating ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg'}`}
          >
            {isGenerating ? (
              <><div className="animate-spin mr-2"><Icon name="refresh" /></div> Đang tạo lộ trình...</>
            ) : (
              <>Tạo lộ trình ngay <Icon name="arrow_forward" /></>
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Focus Areas Box */}
          {focusAreas.length > 0 && (
            <div className="bg-primary/10 rounded-2xl p-4 border border-border-pink">
              <h3 className="text-label-lg font-bold text-primary mb-2">🎯 Mục tiêu ưu tiên trị liệu</h3>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white text-on-surface rounded-full text-label-md border border-border-pink shadow-sm">
                    {translateIssue(area)}
                  </span>
                ))}
              </div>
            </div>
          )}

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
                Cửa hàng <Icon name="shopping_bag" className="text-[16px]" />
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

          {/* Prompt Generate Recommendations */}
          {productRecommendations.length === 0 && (
            <div className="bg-surface-container-lowest border border-border-pink rounded-xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="science" className="text-3xl" />
              </div>
              <h3 className="text-title-md text-on-surface mb-2 font-bold">Chưa có Gợi ý Mỹ phẩm</h3>
              <p className="text-body-md text-on-surface-variant mb-6 max-w-lg mx-auto">
                Hãy để AI phân tích sâu hơn kho dữ liệu mỹ phẩm và tìm ra các sản phẩm xịn xò, phù hợp nhất với loại da của bạn trong Lộ trình này.
              </p>
              <button
                onClick={handleGenerateRecommendations}
                disabled={isGeneratingRecs}
                className={`px-8 py-2.5 rounded-full text-white font-medium shadow-md transition-all flex items-center justify-center gap-2 mx-auto ${isGeneratingRecs ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-500 hover:shadow-lg'}`}
              >
                {isGeneratingRecs ? (
                  <><div className="animate-spin mr-2"><Icon name="refresh" /></div> Đang AI phân tích...</>
                ) : (
                  <><Icon name="auto_awesome" /> Tạo gợi ý mỹ phẩm bằng AI</>
                )}
              </button>
            </div>
          )}

          {/* Add All To Cart Button */}
          {productRecommendations.length > 0 && (
            <div className="mt-4 mx-2 md:mx-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center justify-between shadow-sm gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-title-md font-bold text-indigo-900 mb-1">Gợi ý sản phẩm đã hoàn tất!</h3>
                <p className="text-body-sm text-indigo-700">Hãy chọn mức giá phù hợp để tự động gom 1 bộ sản phẩm đầy đủ vào giỏ hàng.</p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAddTierToCart('cheap')}
                  disabled={isAddingToCart !== null}
                  className={`px-3 py-1.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 shadow-sm transition-all border ${isAddingToCart === 'cheap' ? 'bg-success text-white border-success' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                >
                  <Icon name={isAddingToCart === 'cheap' ? "check" : "savings"} className="text-[15px]" />
                  Tiết kiệm
                </button>
                
                <button
                  onClick={() => handleAddTierToCart('mid')}
                  disabled={isAddingToCart !== null}
                  className={`px-3 py-1.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 shadow-sm transition-all border ${isAddingToCart === 'mid' ? 'bg-success text-white border-success' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                >
                  <Icon name={isAddingToCart === 'mid' ? "check" : "balance"} className="text-[15px]" />
                  Tầm trung
                </button>

                <button
                  onClick={() => handleAddTierToCart('premium')}
                  disabled={isAddingToCart !== null}
                  className={`px-3 py-1.5 rounded-full font-semibold text-[13px] flex items-center gap-1.5 shadow-sm transition-all border ${isAddingToCart === 'premium' ? 'bg-success text-white border-success' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent hover:shadow-md'}`}
                >
                  <Icon name={isAddingToCart === 'premium' ? "check" : "diamond"} className="text-[15px]" />
                  Cao cấp
                </button>
              </div>
            </div>
          )}

          {/* Routine Steps */}
          <div className="mt-4 px-2 md:px-6">
            {steps.length === 0 ? (
              <p className="text-center text-on-surface-variant py-8">Chưa có bước nào trong buổi này.</p>
            ) : (
              steps.map((s, i) => {
                const stepRecs = productRecommendations.find(r => r.step === s.category)
                const products = stepRecs ? stepRecs.products : []
                return (
                  <RoutineStep
                    key={s.step}
                    {...s}
                    isLast={i === steps.length - 1}
                    time={time}
                    recommendedProducts={products}
                    onQuickView={setQuickViewProduct}
                  />
                )
              })
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

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setQuickViewProduct(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors z-10"
            >
              <Icon name="close" className="text-xl" />
            </button>
            
            <div className="h-48 md:h-64 bg-gray-50 flex-shrink-0 relative border-b border-gray-100">
              <img 
                src={quickViewProduct.imageUrl || `https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80`} 
                alt="product" 
                className="w-full h-full object-contain mix-blend-multiply py-4"
              />
              {quickViewProduct.match_score && (
                <div className="absolute bottom-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Icon name="verified" className="text-[14px]" /> Phù hợp { (quickViewProduct.match_score * 100).toFixed(0) }%
                </div>
              )}
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">{quickViewProduct.brand || 'Thương hiệu chưa xác định'}</p>
              <h3 className="text-title-md font-bold text-gray-800 leading-tight mb-2">{quickViewProduct.name}</h3>
              <p className="text-title-lg font-bold text-green-600 mb-4">
                {quickViewProduct.price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(quickViewProduct.price) : 'Liên hệ'}
              </p>
              
              {quickViewProduct.ingredients && (
                <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <h4 className="text-label-sm font-bold text-gray-700 mb-1 flex items-center gap-1"><Icon name="science" className="text-[14px] text-primary" /> Thành phần nổi bật:</h4>
                  <p className="text-body-sm text-gray-600">{quickViewProduct.ingredients}</p>
                </div>
              )}

              {quickViewProduct.description && (
                <div className="mb-4">
                  <h4 className="text-label-sm font-bold text-gray-700 mb-1">Mô tả:</h4>
                  <p className="text-body-sm text-gray-600 line-clamp-4">{quickViewProduct.description}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
              <button 
                onClick={() => navigate(`/products/${quickViewProduct.slug}`)}
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors text-center"
              >
                Xem chi tiết
              </button>
              <button 
                onClick={() => {
                  addItem({
                    id: quickViewProduct.id,
                    name: quickViewProduct.name,
                    price: quickViewProduct.price,
                    imageUrl: quickViewProduct.imageUrl || quickViewProduct.images?.[0],
                    slug: quickViewProduct.slug
                  })
                  setQuickViewProduct(null)
                  // Có thể báo toast ở đây nếu có
                }}
                className="flex-1 px-4 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary-dark shadow-md transition-colors flex justify-center items-center gap-2"
              >
                <Icon name="add_shopping_cart" className="text-[18px]" /> Thêm vào giỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
