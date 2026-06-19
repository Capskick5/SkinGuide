import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { getScanHistory } from '@/api/scanApi'
import { Spin, message } from 'antd'

const CONDITION_METADATA = {
  Acne: 'Mụn',
  Blackheads: 'Đầu đen',
  Dark_Spots: 'Thâm/Sạm',
  Pigmentation: 'Nám',
  Pores: 'Lỗ chân lông',
  Redness: 'Mẩn đỏ',
  Wrinkles: 'Nếp nhăn',
  Healthy: 'Khỏe mạnh'
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getScanHistory()
        setHistory(res.data || [])
      } catch (error) {
        message.error(error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const handleViewDetail = (record) => {
    // Chuyển đổi format để AnalysisResultPage hiểu được
    const analysisResult = {
      skin_type: record.skinType,
      ultimate_analysis: record.ultimateAnalysis,
    }
    
    navigate(PATHS.ANALYSIS, {
      state: {
        result: analysisResult,
        originalImage: record.imageUrl
      }
    })
  }

  // Hàm helper tính điểm tương tự như AnalysisResultPage
  const calculateScore = (ultimateAnalysis) => {
    const topIssueConf = ultimateAnalysis?.[0]?.confidence || 0
    return Math.max(10, 100 - Math.round(topIssueConf * 0.8))
  }

  // Hàm format ngày
  const formatDate = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">Lịch sử quét da</h1>
        <p className="text-body-md text-on-surface-variant">
          Toàn bộ các lần phân tích da của bạn, sắp xếp theo thời gian.
        </p>
      </div>

      <Spin spinning={loading}>
        {history.length === 0 && !loading ? (
          <div className="text-center py-12 text-on-surface-variant">
            Bạn chưa có lịch sử quét nào.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((h) => {
              const score = calculateScore(h.ultimateAnalysis)
              const skinTypeLabel = h.skinType === 'Dry' ? 'Da khô' : h.skinType === 'Oily' ? 'Da dầu' : 'Da thường'
              const topIssues = h.ultimateAnalysis.slice(0, 2).map(i => CONDITION_METADATA[i.issue] || 'Khác')
              const tags = [skinTypeLabel, ...topIssues]

              return (
                <div
                  key={h._id}
                  className="bg-surface-container-lowest border border-border-pink rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => handleViewDetail(h)}
                >
                  <div className="w-14 h-14 rounded-xl bg-primary-light overflow-hidden shrink-0 border border-border-pink">
                    <img src={h.imageUrl} alt="Scan thumb" className="w-full h-full object-cover" />
                  </div>
                  <div className="grow">
                    <p className="text-label-md text-on-surface">{formatDate(h.createdAt)}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-surface-soft border border-border-pink/60 rounded-full text-caption text-on-surface-variant"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-headline-md font-bold text-primary leading-none">{score}</p>
                    <button type="button" className="text-caption text-primary hover:text-tertiary transition-colors">
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Spin>
    </div>
  )
}
