import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { useAuth } from '@/hook/useAuth'

const STEPS = [
  {
    id: 'skin_type',
    title: 'Loại da của bạn là gì?',
    subtitle: 'Chọn loại da gần nhất với bạn. Điều này giúp AI cá nhân hóa lộ trình.',
    type: 'single',
    options: [
      { value: 'oily', label: 'Da dầu', icon: 'water_drop', desc: 'Bóng nhờn, lỗ chân lông to, dễ nổi mụn' },
      { value: 'dry', label: 'Da khô', icon: 'air', desc: 'Căng, bong tróc, dễ kích ứng' },
      { value: 'combination', label: 'Da hỗn hợp', icon: 'blur_on', desc: 'Vùng T dầu, má khô' },
      { value: 'sensitive', label: 'Da nhạy cảm', icon: 'favorite', desc: 'Dễ đỏ, ngứa, phản ứng với sản phẩm' },
      { value: 'normal', label: 'Da thường', icon: 'check_circle', desc: 'Cân bằng, ít vấn đề' },
    ],
  },
  {
    id: 'concerns',
    title: 'Vấn đề da bạn đang gặp?',
    subtitle: 'Chọn tất cả những vấn đề bạn muốn cải thiện.',
    type: 'multi',
    options: [
      { value: 'acne', label: 'Mụn', icon: 'coronavirus' },
      { value: 'dark_spots', label: 'Thâm / Nám', icon: 'wb_sunny' },
      { value: 'wrinkles', label: 'Nếp nhăn', icon: 'face' },
      { value: 'dryness', label: 'Khô da', icon: 'air' },
      { value: 'oiliness', label: 'Dầu nhờn', icon: 'water_drop' },
      { value: 'redness', label: 'Mẩn đỏ', icon: 'favorite' },
      { value: 'pores', label: 'Lỗ chân lông to', icon: 'blur_on' },
      { value: 'dullness', label: 'Da xỉn màu', icon: 'brightness_low' },
    ],
  },
  {
    id: 'routine_experience',
    title: 'Kinh nghiệm chăm sóc da?',
    subtitle: 'Điều này giúp chúng tôi điều chỉnh độ phức tạp của lộ trình.',
    type: 'single',
    options: [
      { value: 'beginner', label: 'Mới bắt đầu', icon: 'school', desc: 'Chỉ dùng sữa rửa mặt và kem dưỡng' },
      { value: 'intermediate', label: 'Đã có kinh nghiệm', icon: 'auto_awesome', desc: 'Đã biết các bước cơ bản' },
      { value: 'advanced', label: 'Chuyên sâu', icon: 'science', desc: 'Hiểu về hoạt chất, đã thử nhiều sản phẩm' },
    ],
  },
  {
    id: 'age_group',
    title: 'Độ tuổi của bạn?',
    subtitle: 'Nhu cầu da thay đổi theo độ tuổi.',
    type: 'single',
    options: [
      { value: 'teen', label: 'Dưới 20', icon: 'child_care' },
      { value: '20s', label: '20 – 29', icon: 'person' },
      { value: '30s', label: '30 – 39', icon: 'person_4' },
      { value: '40s', label: '40 – 49', icon: 'elderly' },
      { value: '50plus', label: '50+', icon: 'elderly_woman' },
    ],
  },
  {
    id: 'budget',
    title: 'Ngân sách skincare hàng tháng?',
    subtitle: 'Chúng tôi sẽ gợi ý sản phẩm phù hợp túi tiền của bạn.',
    type: 'single',
    options: [
      { value: 'low', label: 'Dưới 500k', icon: 'savings', desc: 'Ưu tiên sản phẩm nội địa, drugstore' },
      { value: 'mid', label: '500k – 1.5 triệu', icon: 'account_balance_wallet', desc: 'Cân bằng giá – chất lượng' },
      { value: 'high', label: '1.5 – 3 triệu', icon: 'diamond', desc: 'Sản phẩm cao cấp, nhập khẩu' },
      { value: 'luxury', label: 'Trên 3 triệu', icon: 'workspace_premium', desc: 'Không giới hạn ngân sách' },
    ],
  },
]

export default function SkinQuizPage() {
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()
  const { message } = AntApp.useApp()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const current = STEPS[step]
  const total = STEPS.length
  const progress = ((step + 1) / total) * 100

  const getAnswer = (id) => answers[id] ?? (current?.type === 'multi' ? [] : null)

  const handleSingle = (val) => {
    setAnswers((prev) => ({ ...prev, [current.id]: val }))
  }

  const handleMulti = (val) => {
    setAnswers((prev) => {
      const existing = prev[current.id] || []
      const updated = existing.includes(val)
        ? existing.filter((v) => v !== val)
        : [...existing, val]
      return { ...prev, [current.id]: updated }
    })
  }

  const canNext = () => {
    const ans = getAnswer(current.id)
    if (current.type === 'single') return !!ans
    return Array.isArray(ans) && ans.length > 0
  }

  const handleNext = () => {
    if (step < total - 1) setStep((s) => s + 1)
    else handleSubmit()
  }

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1)
    else navigate(-1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await updateProfile({
        fullName: user?.fullName || '',
        skinProfile: {
          skinType: answers.skin_type || user?.skinProfile?.skinType || null,
          gender: user?.skinProfile?.gender || null,
          currentConcerns: answers.concerns || user?.skinProfile?.currentConcerns || [],
          allergies: user?.skinProfile?.allergies || [],
          sensitiveSkin:
            answers.skin_type === 'sensitive' || !!user?.skinProfile?.sensitiveSkin,
        },
      })
      message.success('Đã lưu hồ sơ da của bạn')
      navigate(PATHS.PRODUCTS)
    } catch (err) {
      message.error(err.message || 'Không thể lưu hồ sơ da, vui lòng thử lại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-border-pink hover:bg-surface-soft transition-colors"
          >
            <Icon name="arrow_back" className="text-on-surface" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption text-on-surface-variant">
                Bước {step + 1} / {total}
              </span>
              <span className="text-caption text-primary font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full gradient-bg rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-surface-container-lowest border border-border-pink rounded-3xl p-8 shadow-ambient-pink">
          <div className="mb-6">
            <h1 className="text-headline-lg text-on-surface mb-2">{current.title}</h1>
            <p className="text-body-md text-on-surface-variant">{current.subtitle}</p>
          </div>

          {/* Options */}
          <div
            className={
              current.options.length > 4
                ? 'grid grid-cols-2 sm:grid-cols-4 gap-3'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
            }
          >
            {current.options.map((opt) => {
              const ans = getAnswer(current.id)
              const selected =
                current.type === 'single' ? ans === opt.value : (ans || []).includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    current.type === 'single' ? handleSingle(opt.value) : handleMulti(opt.value)
                  }
                  className={[
                    'group flex flex-col items-center text-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    selected
                      ? 'border-primary bg-primary-light shadow-[0_0_0_3px_rgba(177,14,107,0.1)]'
                      : 'border-border-pink hover:border-primary/50 hover:bg-surface-soft',
                    current.options.length > 4 ? 'py-4' : 'py-5',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-11 h-11 flex items-center justify-center rounded-xl transition-colors',
                      selected ? 'gradient-bg text-white' : 'bg-primary-light text-primary',
                    ].join(' ')}
                  >
                    <Icon name={opt.icon} filled={selected} className="text-xl" />
                  </span>
                  <span
                    className={[
                      'text-label-md font-semibold',
                      selected ? 'text-primary' : 'text-on-surface',
                    ].join(' ')}
                  >
                    {opt.label}
                  </span>
                  {opt.desc && (
                    <span className="text-caption text-on-surface-variant leading-snug hidden sm:block">
                      {opt.desc}
                    </span>
                  )}
                  {current.type === 'multi' && selected && (
                    <Icon name="check_circle" filled className="text-primary text-sm" />
                  )}
                </button>
              )
            })}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext() || submitting}
            className={[
              'mt-8 w-full py-4 rounded-2xl gradient-bg text-white text-label-md font-bold',
              'transition-all flex items-center justify-center gap-2',
              'shadow-[0_6px_20px_rgba(177,14,107,0.25)]',
              !canNext() || submitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
            ].join(' ')}
          >
            {submitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : step < total - 1 ? (
              <>
                Tiếp theo <Icon name="arrow_forward" />
              </>
            ) : (
              <>
                <Icon name="auto_awesome" />
                Tạo lộ trình của tôi
              </>
            )}
          </button>
        </div>

        {/* Skip */}
        <p className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigate(PATHS.PRODUCTS)}
            className="text-caption text-on-surface-variant hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            Bỏ qua, tôi sẽ làm sau
          </button>
        </p>
      </div>
    </div>
  )
}
