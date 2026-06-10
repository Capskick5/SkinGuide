import Icon from '@/components/common/Icon'

const TIPS = [
  {
    ok: true,
    title: 'Ánh sáng tốt',
    desc: 'Dùng ánh sáng tự nhiên, đứng đối diện cửa sổ nếu có thể. Tránh bóng đổ mạnh từ đèn trên cao hoặc ngược sáng.',
  },
  {
    ok: true,
    title: 'Mặt mộc',
    desc: 'Tẩy sạch lớp trang điểm, tháo kính và vén tóc ra khỏi trán và má.',
  },
  {
    ok: true,
    title: 'Biểu cảm trung tính',
    desc: 'Giữ khuôn mặt thư giãn hoàn toàn và nhìn thẳng vào ống kính ngang tầm mắt.',
  },
  {
    ok: false,
    title: 'Tránh dùng filter',
    desc: 'Không dùng bộ lọc làm đẹp, hiệu ứng làm mịn da hay chế độ chân dung làm mờ chi tiết.',
  },
]

/**
 * Thẻ "Tips for best results" hiển thị bên phải vùng upload.
 */
export default function TipsCard() {
  return (
    <div className="rounded-xl border border-border-pink bg-surface-container-lowest shadow-[0_8px_30px_rgba(103,80,228,0.08)] p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-surface-soft flex items-center justify-center text-primary">
          <Icon name="lightbulb" />
        </div>
        <h3 className="text-headline-md text-on-surface">Mẹo để có kết quả tốt nhất</h3>
      </div>

      <ul className="space-y-6 grow">
        {TIPS.map((tip) => (
          <li key={tip.title} className="flex items-start gap-4">
            <Icon
              name={tip.ok ? 'check_circle' : 'cancel'}
              filled
              className={`mt-0.5 text-xl ${tip.ok ? 'text-success' : 'text-error'}`}
            />
            <div>
              <h4 className="text-label-md text-on-surface mb-1">{tip.title}</h4>
              <p className="text-caption text-on-surface-variant leading-relaxed">{tip.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 p-4 bg-surface-soft rounded-lg border border-border-pink/50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Icon name="help" />
          <span className="text-caption">Cần xem ví dụ?</span>
        </div>
        <button type="button" className="text-label-md text-primary hover:text-tertiary transition-colors">
          Xem hướng dẫn
        </button>
      </div>
    </div>
  )
}
