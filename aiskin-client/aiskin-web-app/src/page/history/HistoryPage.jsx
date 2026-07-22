import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { getScanHistory, deleteScanHistory } from '@/api/scanApi'
import { Spin, message, Popconfirm } from 'antd'

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

  const handleDelete = async (e, record) => {
    if (e) e.stopPropagation() // Ngăn không cho click vào cha (ViewDetail)
    
    try {
      setLoading(true)
      await deleteScanHistory(record._id)
      setHistory(prev => prev.filter(h => h._id !== record._id))
      message.success("Đã xóa bản quét thành công")
    } catch (error) {
      message.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewRoutine = (record) => {
    navigate(PATHS.ROUTINE, {
      state: {
        scanId: record._id,
        routine: record.routine,
        topIngredients: record.topIngredients,
        focusAreas: record.focusAreas,
        skinType: record.skinType,
      }
    })
  }

  const handleViewAnalysis = (e, record) => {
    e.stopPropagation()
    navigate(PATHS.HISTORY_DETAIL.replace(':id', record._id))
  }

  // Trích xuất vấn đề
  const getTopIssues = (zones) => {
    if (!zones) return []
    const flatIssues = [...(zones.issues || [])]
    if (zones.t_zone?.issues) flatIssues.push(...zones.t_zone.issues)
    if (zones.u_zone?.issues) flatIssues.push(...zones.u_zone.issues)
    
    return Array.from(new Set(flatIssues.map(i => i.name)))
      .filter(name => name !== 'Healthy')
      .slice(0, 2)
      .map(name => CONDITION_METADATA[name] || name)
  }

  // Hàm format ngày
  const formatDate = (isoString) => {
    if (!isoString) return 'Chưa rõ'
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
          <div className="rounded-xl border border-border-pink bg-surface-container-lowest px-6 py-12 text-center text-on-surface-variant">
            <Icon name="face_retouching_natural" className="mb-3 text-5xl text-primary/40" />
            <p className="font-semibold text-on-surface">Bạn chưa có lịch sử quét nào</p>
            <p className="mt-1 text-sm">Thực hiện lần quét đầu tiên để theo dõi thay đổi của làn da.</p>
            <button type="button" onClick={() => navigate(PATHS.SCAN)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-white hover:bg-tertiary">
              <Icon name="document_scanner" className="text-lg" />
              Bắt đầu quét da
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((h) => {
              const skinTypeObj = h.skinType || {}
              const skinTypeStr = skinTypeObj.predicted || h.skinType || 'Normal'
              const skinTypeLabel = skinTypeStr === 'Dry' ? 'Da khô' : skinTypeStr === 'Oily' ? 'Da dầu' : 'Da thường'
              
              const topIssues = getTopIssues(h.facialZones)
              const tags = [skinTypeLabel, ...topIssues]

              return (
                <div
                  key={h._id}
                  className="bg-surface-container-lowest border border-border-pink rounded-xl p-4 flex items-center gap-4 hover:border-primary transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary-light overflow-hidden shrink-0 border border-border-pink flex items-center justify-center">
                    {h.imageUrl ? (
                      <img src={h.imageUrl} alt="Ảnh quét da" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name="face" className="text-2xl text-primary/50" />
                    )}
                  </div>
                  <div className="grow">
                    <p className="text-label-md text-on-surface">{formatDate(h.analyzedAt || h.createdAt || h.scanDate)}</p>
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
                  <div className="flex flex-col items-end gap-2 text-right">
                    <p className="text-label-md font-bold text-primary leading-none">
                      {h.modelHealth?.skinIssueModel === 'loaded' ? `${topIssues.length} dấu hiệu` : 'Loại da'}
                    </p>
                    <div className="flex items-center gap-3">
                      <Popconfirm
                        title="Xóa lịch sử quét"
                        description="Bạn có chắc chắn muốn xóa bản quét này không?"
                        onConfirm={(e) => handleDelete(e, h)}
                        onCancel={(e) => e.stopPropagation()}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                      >
                        <button 
                          type="button" 
                          onClick={(e) => e.stopPropagation()}
                          className="text-error/70 hover:text-error hover:bg-error/10 p-1.5 rounded-full transition-colors flex items-center justify-center"
                          title="Xóa bản quét"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </Popconfirm>
                      <button 
                        type="button" 
                        onClick={(e) => handleViewAnalysis(e, h)}
                        className="text-caption text-primary hover:text-tertiary transition-colors flex items-center gap-1"
                      >
                        <Icon name="analytics" className="text-[14px]"/> Xem phân tích AI
                      </button>
                      <span className="text-border-pink">|</span>
                      <button type="button" onClick={() => handleViewRoutine(h)} className="text-caption text-primary hover:text-tertiary transition-colors flex items-center gap-1">
                        Xem lộ trình <Icon name="arrow_forward" className="text-[14px]"/>
                      </button>
                    </div>
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
