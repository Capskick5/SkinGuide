import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import AnalysisResultPage from '@/page/analysis/AnalysisResultPage'
import { getScanHistoryDetail } from '@/api/scanApi'
import { PATHS } from '@/route/paths'

export default function HistoryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadScan() {
      try {
        const response = await getScanHistoryDetail(id)
        if (active) setScan(response.data)
      } catch (requestError) {
        if (active) setError(requestError.message || 'Không thể tải bản quét này.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadScan()
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-on-surface-variant">
        <Icon name="progress_activity" className="mr-2 animate-spin" />
        Đang tải bản quét...
      </div>
    )
  }

  if (!scan || error) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
        <Icon name="search_off" className="text-5xl text-primary/50" />
        <div>
          <h1 className="text-headline-md text-on-surface">Không thể mở bản quét</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">{error || 'Bản quét không tồn tại.'}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(PATHS.HISTORY)}
          className="rounded-full border border-border-pink px-5 py-2.5 font-semibold text-primary"
        >
          Quay lại lịch sử
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(PATHS.HISTORY)}
        className="mb-5 inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-lg" />
        Lịch sử quét da
      </button>
      <AnalysisResultPage
        result={{ scan_result: scan }}
        originalImage={scan.imageUrl}
        onScanAgain={() => navigate(PATHS.SCAN)}
      />
    </div>
  )
}
