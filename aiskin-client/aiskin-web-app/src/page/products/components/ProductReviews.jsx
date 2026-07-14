import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { message, Popconfirm } from 'antd'
import Icon from '@/components/common/Icon'
import { reviewApi } from '@/api/reviewApi'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
}

function StarRating({ value, onChange, readonly = false }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(rating)}
          className={`flex h-8 w-8 items-center justify-center ${readonly ? 'cursor-default' : 'rounded-md hover:bg-amber-50'}`}
          aria-label={readonly ? undefined : `Chọn ${rating} sao`}
        >
          <Icon
            name={rating <= value ? 'star' : 'star_border'}
            filled={rating <= value}
            className="text-xl text-amber-500"
          />
        </button>
      ))}
    </div>
  )
}

export default function ProductReviews({ productId, isAuthenticated }) {
  const [summary, setSummary] = useState(null)
  const [eligibility, setEligibility] = useState(null)
  const [page, setPage] = useState(0)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSummary = useCallback(async (nextPage = 0) => {
    const data = await reviewApi.getSummary(productId, nextPage, PAGE_SIZE)
    setSummary(data)
    setPage(data.page || 0)
  }, [productId])

  const loadEligibility = useCallback(async () => {
    if (!isAuthenticated) {
      setEligibility(null)
      return
    }
    const data = await reviewApi.getEligibility(productId)
    setEligibility(data)
    if (data.existingReview) {
      setRating(data.existingReview.rating)
      setComment(data.existingReview.comment)
    }
  }, [isAuthenticated, productId])

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      Promise.all([loadSummary(0), loadEligibility()])
        .catch((error) => {
          if (active) message.error(error?.message || 'Không tải được đánh giá sản phẩm')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [loadEligibility, loadSummary])

  async function submitReview(event) {
    event.preventDefault()
    const trimmedComment = comment.trim()
    if (!trimmedComment) {
      message.error('Vui lòng nhập nội dung đánh giá')
      return
    }
    setSaving(true)
    try {
      const payload = { rating, comment: trimmedComment }
      if (eligibility?.existingReview) {
        await reviewApi.update(eligibility.existingReview.id, payload)
        message.success('Đã cập nhật đánh giá')
      } else {
        await reviewApi.create(productId, payload)
        message.success('Đã gửi đánh giá')
      }
      await Promise.all([loadSummary(0), loadEligibility()])
    } catch (error) {
      message.error(error?.message || 'Không lưu được đánh giá')
    } finally {
      setSaving(false)
    }
  }

  async function deleteReview() {
    if (!eligibility?.existingReview) return
    setSaving(true)
    try {
      await reviewApi.delete(eligibility.existingReview.id)
      setComment('')
      setRating(5)
      message.success('Đã xóa đánh giá')
      await Promise.all([loadSummary(0), loadEligibility()])
    } catch (error) {
      message.error(error?.message || 'Không xóa được đánh giá')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-lg border border-border-pink bg-surface-soft" />
  }

  const totalReviews = summary?.totalReviews || 0
  const totalPages = summary?.totalPages || 0

  return (
    <section className="space-y-5 border-t border-border-pink pt-6">
      <div>
        <h3 className="text-title-md font-semibold text-on-surface">Đánh giá từ khách đã mua</h3>
        <p className="text-body-sm text-on-surface-variant">Chỉ đơn đã giao thành công mới được gửi đánh giá.</p>
      </div>

      <div className="grid gap-5 rounded-lg border border-border-pink bg-surface-container-lowest p-5 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center justify-center border-b border-border-pink pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-5">
          <p className="text-4xl font-bold text-on-surface">{Number(summary?.averageRating || 0).toFixed(1)}</p>
          <StarRating value={Math.round(summary?.averageRating || 0)} readonly />
          <p className="text-caption text-on-surface-variant">{totalReviews} đánh giá</p>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary?.ratingBreakdown?.[star] || 0
            const percent = totalReviews ? Math.round((count / totalReviews) * 100) : 0
            return (
              <div key={star} className="grid grid-cols-[36px_1fr_32px] items-center gap-3 text-caption text-on-surface-variant">
                <span>{star} sao</span>
                <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent}%` }} />
                </div>
                <span className="text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {isAuthenticated ? (
        eligibility?.eligible ? (
          <form onSubmit={submitReview} className="space-y-4 rounded-lg border border-border-pink bg-surface-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-on-surface">
                  {eligibility.existingReview ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá'}
                </h4>
                <p className="text-caption text-success">Đã xác minh mua hàng</p>
              </div>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Sản phẩm phù hợp với loại da của bạn như thế nào?"
              className="w-full resize-y rounded-lg border border-border-pink bg-white p-3 text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <div className="flex flex-wrap justify-between gap-3">
              <span className="text-caption text-on-surface-variant">{comment.length}/1000</span>
              <div className="flex gap-2">
                {eligibility.existingReview ? (
                  <Popconfirm title="Xóa đánh giá này?" onConfirm={deleteReview} okText="Xóa" cancelText="Hủy">
                    <button type="button" disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-error/30 px-4 py-2 text-label-md text-error disabled:opacity-50">
                      <Icon name="delete" /> Xóa
                    </button>
                  </Popconfirm>
                ) : null}
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-label-md font-semibold text-white hover:bg-tertiary disabled:opacity-50">
                  <Icon name={saving ? 'hourglass_top' : 'send'} />
                  {saving ? 'Đang lưu' : eligibility.existingReview ? 'Cập nhật' : 'Gửi đánh giá'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="rounded-lg border border-border-pink bg-surface-soft p-4 text-body-sm text-on-surface-variant">
            {eligibility?.reason || 'Chỉ khách đã nhận sản phẩm mới có thể đánh giá.'}
          </div>
        )
      ) : (
        <div className="rounded-lg border border-border-pink bg-surface-soft p-4 text-body-sm text-on-surface-variant">
          <Link to="/login" className="font-semibold text-primary hover:text-tertiary">Đăng nhập</Link> để kiểm tra quyền đánh giá.
        </div>
      )}

      <div className="space-y-3">
        {(summary?.reviews || []).map((review) => (
          <article key={review.id} className="rounded-lg border border-border-pink bg-surface-container-lowest p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-on-surface">{review.reviewerName}</p>
                <p className="text-caption text-success">Đã mua hàng · {formatDate(review.createdAt)}</p>
              </div>
              <StarRating value={review.rating} readonly />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-body-md leading-6 text-on-surface-variant">{review.comment}</p>
          </article>
        ))}
        {totalReviews === 0 ? (
          <p className="rounded-lg border border-dashed border-border-pink p-5 text-center text-body-md text-on-surface-variant">Chưa có đánh giá cho sản phẩm này.</p>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <button type="button" disabled={page <= 0} onClick={() => loadSummary(page - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-pink disabled:opacity-40" title="Trang trước">
            <Icon name="chevron_left" />
          </button>
          <span className="text-caption text-on-surface-variant">Trang {page + 1}/{totalPages}</span>
          <button type="button" disabled={page + 1 >= totalPages} onClick={() => loadSummary(page + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-pink disabled:opacity-40" title="Trang sau">
            <Icon name="chevron_right" />
          </button>
        </div>
      ) : null}
    </section>
  )
}
