import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import Logo from '@/components/common/Logo'
import { PATHS } from '@/route/paths'

/* ─── Mock Data ──────────────────────────────────────────────────────────── */

const MOCK_CONDITIONS = [
  { icon: 'coronavirus', title: 'Mụn & khuyết điểm',  label: 'Moderate', bar: 50, color: 'warning' },
  { icon: 'wb_sunny',    title: 'Thâm / Sạm',          label: 'Mild',     bar: 30, color: 'low' },
  { icon: 'trip_origin', title: 'Lỗ chân lông to',     label: 'Mild',     bar: 25, color: 'low' },
  { icon: 'water_drop',  title: 'Mẩn đỏ / Nhạy cảm',  label: 'Clear',    bar: 10, color: 'ok' },
]

const MOCK_ROUTINE_AM = [
  { step: 1, name: 'Sữa rửa mặt dịu nhẹ',    tip: 'Làm sạch nhẹ nhàng, không gây khô da',             icon: 'water_drop' },
  { step: 2, name: 'Toner cân bằng độ ẩm',    tip: 'Cân bằng pH, chuẩn bị cho các bước tiếp theo',    icon: 'opacity' },
  { step: 3, name: 'Serum Vitamin C',          tip: 'Chống oxy hoá, sáng da ban ngày',                  icon: 'auto_awesome' },
  { step: 4, name: 'Kem dưỡng ẩm',            tip: 'Dưỡng ẩm và bảo vệ hàng rào da',                  icon: 'spa' },
  { step: 5, name: 'Kem chống nắng SPF50+',   tip: 'Bảo vệ da khỏi tia UV — không bỏ qua bước này!', icon: 'wb_sunny' },
]

const MOCK_ROUTINE_PM = [
  { step: 1, name: 'Tẩy trang dầu / balm',       tip: 'Loại bỏ kem chống nắng và makeup',               icon: 'clean_hands' },
  { step: 2, name: 'Sữa rửa mặt tạo bọt',        tip: 'Làm sạch sâu sau ngày dài',                      icon: 'water_drop' },
  { step: 3, name: 'Toner BHA 2%',               tip: 'Tẩy tế bào chết nhẹ, thông thoáng lỗ chân lông', icon: 'grain' },
  { step: 4, name: 'Serum Retinol 0.1%',         tip: 'Tái tạo da, mờ thâm (dùng xen kẽ)',               icon: 'auto_fix_high' },
  { step: 5, name: 'Kem dưỡng phục hồi ban đêm', tip: 'Nuôi dưỡng da trong lúc ngủ',                    icon: 'bedtime' },
]

const MOCK_PRODUCTS = [
  { name: 'CeraVe Foaming Cleanser',      brand: 'CeraVe',         category: 'Sữa rửa mặt', price: '320.000đ', tag: 'Phù hợp da dầu',  tagColor: 'blue' },
  { name: 'Some By Mi AHA BHA PHA Toner', brand: 'Some By Mi',     category: 'Toner',        price: '290.000đ', tag: 'Bán chạy',         tagColor: 'amber' },
  { name: "Paula's Choice BHA 2%",        brand: "Paula's Choice", category: 'Serum',        price: '760.000đ', tag: 'Được AI gợi ý',   tagColor: 'primary' },
  { name: 'Laneige Water Sleeping Mask',  brand: 'Laneige',        category: 'Mặt nạ ngủ',  price: '480.000đ', tag: 'Phục hồi tốt',    tagColor: 'emerald' },
  { name: 'Neutrogena Hydro Boost',       brand: 'Neutrogena',     category: 'Kem dưỡng ẩm',price: '350.000đ', tag: 'Nhẹ dịu',         tagColor: 'violet' },
  { name: 'La Roche-Posay Effaclar',      brand: 'La Roche-Posay', category: 'Sữa rửa mặt', price: '420.000đ', tag: 'Cho da nhạy cảm', tagColor: 'rose' },
]

const PROGRESS_DATA = [
  { week: 'T1', score: 52 },
  { week: 'T2', score: 58 },
  { week: 'T3', score: 63 },
  { week: 'T4', score: 70 },
  { week: 'T5', score: 75 },
  { week: 'T6', score: 82 },
]

/* ─── Style maps ─────────────────────────────────────────────────────────── */

const SEVERITY_COLOR = {
  warning: { badge: 'bg-amber-100 text-amber-700 border-amber-200',       bar: 'bg-amber-400' },
  low:     { badge: 'bg-blue-100 text-blue-700 border-blue-200',          bar: 'bg-blue-400' },
  ok:      { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-400' },
}

const TAG_COLORS = {
  blue:    'bg-blue-100 text-blue-700',
  amber:   'bg-amber-100 text-amber-700',
  primary: 'bg-pink-100 text-pink-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  violet:  'bg-violet-100 text-violet-700',
  rose:    'bg-rose-100 text-rose-700',
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionHeader({ icon, title, subtitle, gradient }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className={`w-12 h-12 rounded-2xl ${gradient} flex items-center justify-center shrink-0 shadow-md`}>
        <Icon name={icon} className="text-white text-2xl" filled />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-on-surface">{title}</h2>
        <p className="text-body-md text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  )
}

function LockOverlay({ onAction }) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
      style={{
        background:
          'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.65) 28%, rgba(255,255,255,0.97) 58%)',
      }}
    >
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Icon name="lock" className="text-white text-2xl" filled />
        </div>
        <p className="text-headline-sm font-bold text-on-surface">Đăng ký để trải nghiệm đầy đủ</p>
        <p className="text-body-md text-on-surface-variant max-w-xs">
          Miễn phí · Kết quả trong 3 giây · Không cần thẻ tín dụng
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-1 px-8 py-3 rounded-full gradient-bg text-white font-bold text-label-md shadow-[0_6px_20px_rgba(177,14,107,0.35)] hover:opacity-90 hover:scale-[1.03] transition-all flex items-center gap-2"
        >
          <Icon name="person_add" />
          Đăng ký miễn phí
        </button>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function OverviewPage() {
  const navigate = useNavigate()
  const [routineTab, setRoutineTab] = useState('am')

  const maxScore = Math.max(...PROGRESS_DATA.map((d) => d.score))

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/85 backdrop-blur-md border-b border-border-pink/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo layout="inline" size={34} />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-primary-light border border-border-pink rounded-full text-caption text-primary font-medium">
              <Icon name="visibility" className="text-sm" />
              Chế độ xem thử
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(PATHS.LANDING)}
              className="hidden sm:flex px-4 py-2 rounded-full text-on-surface-variant text-label-md hover:text-primary transition-colors items-center gap-1"
            >
              <Icon name="arrow_back" className="text-base" />
              Trang chủ
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.LOGIN)}
              className="px-5 py-2 rounded-full border border-border-pink text-on-surface text-label-md hover:bg-surface-soft transition-colors"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.REGISTER)}
              className="px-5 py-2 rounded-full gradient-bg text-white text-label-md font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Đăng ký
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-28 max-w-6xl mx-auto px-4 sm:px-6 space-y-20">

        {/* Hero mini */}
        <section className="text-center py-10 relative">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-64 rounded-full blur-3xl -z-10"
            style={{ background: 'radial-gradient(ellipse, rgba(244,114,182,0.25), rgba(167,139,250,0.15))' }}
          />
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light border border-border-pink rounded-full text-label-md text-primary mb-5">
            <Icon name="preview" filled className="text-base" />
            Tổng quan tính năng AiSkin
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface mb-4 leading-tight">
            Khám phá trước,{' '}
            <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              trải nghiệm sau
            </span>
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto mb-8">
            Xem thử giao diện và dữ liệu mẫu của từng tính năng. Đăng ký miễn phí để bắt đầu hành trình da khỏe thực sự.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: 'document_scanner',       label: 'Quét da AI' },
              { icon: 'face_retouching_natural', label: 'Phân tích da' },
              { icon: 'calendar_today',          label: 'Lộ trình' },
              { icon: 'shopping_bag',            label: 'Sản phẩm' },
              { icon: 'trending_up',             label: 'Tiến trình' },
            ].map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest border border-border-pink rounded-full text-label-md text-on-surface shadow-sm"
              >
                <Icon name={f.icon} className="text-primary text-base" filled />
                {f.label}
              </span>
            ))}
          </div>
        </section>

        {/* ══ SECTION 1 — Quét da ═════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon="document_scanner"
            title="Quét da bằng AI"
            subtitle="Chụp hoặc tải ảnh khuôn mặt — AI phân tích tình trạng da trong vài giây"
            gradient="bg-gradient-to-br from-pink-500 to-rose-600"
          />
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dropzone mock */}
              <div className="bg-surface-container-lowest border-2 border-dashed border-border-pink rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]">
                <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center">
                  <Icon name="add_photo_alternate" className="text-primary text-4xl" />
                </div>
                <div className="text-center">
                  <p className="text-headline-sm font-semibold text-on-surface mb-1">Tải ảnh khuôn mặt lên</p>
                  <p className="text-body-md text-on-surface-variant">Kéo thả hoặc click để chọn ảnh từ thiết bị</p>
                </div>
                <div className="flex gap-2 text-caption text-on-surface-variant">
                  {['JPG', 'PNG', 'WEBP'].map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-surface-soft rounded border border-border-pink">{f}</span>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6">
                <h3 className="text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                  <Icon name="tips_and_updates" filled className="text-amber-500" />
                  Mẹo để có kết quả tốt nhất
                </h3>
                <ul className="space-y-3">
                  {[
                    { icon: 'light_mode', text: 'Chụp ảnh nơi có ánh sáng tự nhiên đủ sáng' },
                    { icon: 'face',       text: 'Khuôn mặt nhìn thẳng, không đeo kính / khẩu trang' },
                    { icon: 'block',      text: 'Không trang điểm để kết quả chính xác nhất' },
                    { icon: 'zoom_in',    text: 'Ảnh rõ nét, không mờ hoặc bị lóa sáng' },
                    { icon: 'crop_free',  text: 'Toàn bộ khuôn mặt nằm trong khung hình' },
                  ].map((tip) => (
                    <li key={tip.text} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name={tip.icon} className="text-primary text-sm" filled />
                      </span>
                      <span className="text-body-md text-on-surface-variant">{tip.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <LockOverlay onAction={() => navigate(PATHS.REGISTER)} />
          </div>
        </section>

        {/* ══ SECTION 2 — Phân tích da ════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon="face_retouching_natural"
            title="Phân tích da chuyên sâu"
            subtitle="AI phát hiện mụn, thâm, lỗ chân lông, mẩn đỏ và nhiều vấn đề khác"
            gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
          />
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Score panel */}
              <div className="lg:col-span-5 bg-surface-container-lowest border border-border-pink rounded-2xl p-6 flex flex-col gap-5 shadow-ambient-pink">
                <div className="flex items-center gap-4 p-4 bg-surface-soft rounded-xl border border-border-pink">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shrink-0">
                    <Icon name="face" className="text-white text-2xl" />
                  </div>
                  <div className="grow">
                    <p className="text-headline-sm font-bold text-on-surface">Sức khỏe tổng thể</p>
                    <p className="text-caption text-on-surface-variant">Phân tích AI · Vùng T + U</p>
                  </div>
                  {/* Gauge */}
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e4e0f3" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke="url(#og1)" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray="251.2"
                        strokeDashoffset="56"
                        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
                      />
                      <defs>
                        <linearGradient id="og1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-primary">78</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-label-md font-semibold text-on-surface">Chi tiết theo vùng da</p>
                  {[
                    { zone: 'Vùng chữ T (Trán, Mũi)', score: 70, barCls: 'from-amber-400 to-orange-500' },
                    { zone: 'Vùng chữ U (Má, Cằm)',   score: 85, barCls: 'from-emerald-400 to-teal-500' },
                  ].map((z) => (
                    <div key={z.zone} className="bg-surface-soft rounded-xl p-3 border border-border-pink">
                      <div className="flex justify-between mb-2">
                        <span className="text-body-md text-on-surface">{z.zone}</span>
                        <span className="text-label-md font-bold text-primary">{z.score}</span>
                      </div>
                      <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${z.barCls}`} style={{ width: `${z.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 flex-wrap">
                  <span className="px-4 py-2 bg-primary-light border border-border-pink rounded-full text-label-md font-bold text-primary">Da hỗn hợp</span>
                  <span className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-label-md font-bold text-amber-700">Nhạy cảm nhẹ</span>
                </div>
              </div>

              {/* Conditions */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <h3 className="text-headline-sm font-bold text-on-surface px-1">Vấn đề phát hiện (Dữ liệu mẫu)</h3>
                <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-body-sm text-on-surface">
                  <strong>💡 Hướng dẫn đọc:</strong> AI chia khuôn mặt thành 2 vùng (T-Zone & U-Zone). Mức độ: Clear → Mild → Moderate → Severe.
                </div>
                {MOCK_CONDITIONS.map((c) => {
                  const s = SEVERITY_COLOR[c.color] ?? SEVERITY_COLOR.ok
                  return (
                    <div key={c.title} className="bg-surface-container-lowest rounded-2xl p-4 border border-border-pink shadow-ambient-pink flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full bg-primary-light flex items-center justify-center text-primary shrink-0">
                        <Icon name={c.icon} filled />
                      </div>
                      <div className="grow">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <h4 className="text-body-lg font-semibold text-on-surface">{c.title}</h4>
                          <span className={`px-3 py-0.5 rounded-full text-caption font-medium border ${s.badge}`}>{c.label}</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-2 mt-2">
                          <div className={`${s.bar} h-2 rounded-full`} style={{ width: `${c.bar}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <LockOverlay onAction={() => navigate(PATHS.REGISTER)} />
          </div>
        </section>

        {/* ══ SECTION 3 — Lộ trình ════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon="calendar_today"
            title="Lộ trình skincare cá nhân hóa"
            subtitle="AI tùy chỉnh lộ trình sáng/tối hoàn toàn theo loại da và vấn đề của bạn"
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          />
          <div className="relative">
            <div className="flex gap-3 mb-6">
              {[
                { key: 'am', label: '☀️ Buổi sáng (AM)', from: 'from-amber-400', to: 'to-yellow-500' },
                { key: 'pm', label: '🌙 Buổi tối (PM)',  from: 'from-indigo-500', to: 'to-purple-600' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setRoutineTab(t.key)}
                  className={[
                    'px-6 py-2.5 rounded-full text-label-md font-semibold transition-all',
                    routineTab === t.key
                      ? `bg-gradient-to-r ${t.from} ${t.to} text-white shadow-md`
                      : 'bg-surface-container-lowest border border-border-pink text-on-surface-variant hover:text-primary',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(routineTab === 'am' ? MOCK_ROUTINE_AM : MOCK_ROUTINE_PM).map((step, idx, arr) => (
                <div
                  key={step.step}
                  className="bg-surface-container-lowest border border-border-pink rounded-2xl p-5 flex items-start gap-4 shadow-ambient-pink hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {step.step}
                    </div>
                    {idx < arr.length - 1 && <div className="w-0.5 h-4 bg-border-pink rounded-full" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name={step.icon} className="text-primary text-base" filled />
                      <h4 className="text-body-lg font-semibold text-on-surface">{step.name}</h4>
                    </div>
                    <p className="text-body-md text-on-surface-variant">{step.tip}</p>
                  </div>
                </div>
              ))}
            </div>
            <LockOverlay onAction={() => navigate(PATHS.REGISTER)} />
          </div>
        </section>

        {/* ══ SECTION 4 — Sản phẩm ════════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon="shopping_bag"
            title="Gợi ý sản phẩm thông minh"
            subtitle="AI gợi ý sản phẩm phù hợp nhất với hồ sơ da, ngân sách và ưu tiên của bạn"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <div className="relative">
            <div className="flex gap-3 mb-6">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-surface-container-lowest border border-border-pink rounded-xl">
                <Icon name="search" className="text-on-surface-variant text-xl" />
                <span className="text-body-md text-on-surface-variant">Tìm kiếm sản phẩm phù hợp với da bạn...</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-container-lowest border border-border-pink rounded-xl">
                <Icon name="tune" className="text-on-surface-variant" />
                <span className="text-body-md text-on-surface-variant hidden sm:inline">Lọc</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {MOCK_PRODUCTS.map((p) => (
                <div
                  key={p.name}
                  className="bg-surface-container-lowest border border-border-pink rounded-2xl p-5 shadow-ambient-pink hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-full h-36 bg-gradient-to-br from-primary-light to-purple-50 rounded-xl mb-4 flex items-center justify-center">
                    <Icon name="spa" className="text-primary text-5xl opacity-40" filled />
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-caption font-medium mb-2 ${TAG_COLORS[p.tagColor]}`}>
                    {p.tag}
                  </span>
                  <h4 className="text-body-lg font-semibold text-on-surface mb-1 line-clamp-2">{p.name}</h4>
                  <p className="text-body-md text-on-surface-variant mb-1">{p.brand} · {p.category}</p>
                  <p className="text-label-md font-bold text-primary">{p.price}</p>
                  <div className="flex gap-2 mt-3">
                    <button type="button" className="flex-1 py-2 rounded-full border border-border-pink text-body-md text-on-surface hover:bg-surface-soft transition-colors">
                      Chi tiết
                    </button>
                    <button type="button" className="w-9 h-9 rounded-full border border-border-pink flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
                      <Icon name="favorite_border" className="text-base" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <LockOverlay onAction={() => navigate(PATHS.REGISTER)} />
          </div>
        </section>

        {/* ══ SECTION 5 — Tiến trình ══════════════════════════════════════ */}
        <section>
          <SectionHeader
            icon="trending_up"
            title="Theo dõi tiến trình da"
            subtitle="Biểu đồ cải thiện theo thời gian — thấy rõ da bạn đang tiến bộ mỗi tuần"
            gradient="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stat cards */}
              <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
                {[
                  { label: 'Điểm da hiện tại', value: '82',   sub: '▲ +30 từ tuần 1', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                  { label: 'Số lần quét',       value: '6',    sub: 'trong 6 tuần',     color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
                  { label: 'Mụn cải thiện',     value: '-62%', sub: 'từ 8 → 3 nốt',    color: 'text-rose-600',   bg: 'bg-rose-50 border-rose-200' },
                  { label: 'Độ ẩm da',          value: '+45%', sub: 'từ 55 → 80%',      color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
                ].map((s) => (
                  <div key={s.label} className={`border rounded-2xl p-4 ${s.bg}`}>
                    <p className="text-caption text-on-surface-variant mb-1">{s.label}</p>
                    <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-caption text-on-surface-variant">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="lg:col-span-2 bg-surface-container-lowest border border-border-pink rounded-2xl p-6 shadow-ambient-pink">
                <h3 className="text-headline-sm font-bold text-on-surface mb-6">Điểm sức khỏe da qua 6 tuần</h3>
                <div className="flex items-end gap-3 h-40">
                  {PROGRESS_DATA.map((d) => (
                    <div key={d.week} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-caption font-bold text-primary">{d.score}</span>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-pink-500 to-purple-500 transition-all duration-700"
                        style={{ height: `${(d.score / maxScore) * 130}px` }}
                      />
                      <span className="text-[10px] text-on-surface-variant">{d.week}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-5 border-t border-border-pink flex flex-wrap gap-4">
                  {[
                    { styleCls: 'bg-gradient-to-r from-pink-500 to-purple-500', label: 'Điểm da tổng thể' },
                    { styleCls: 'bg-blue-400',  label: 'Độ ẩm (%)' },
                    { styleCls: 'bg-rose-400',  label: 'Số nốt mụn' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${l.styleCls}`} />
                      <span className="text-caption text-on-surface-variant">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <LockOverlay onAction={() => navigate(PATHS.REGISTER)} />
          </div>
        </section>

      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-md border-t border-border-pink/50 py-3 px-4 shadow-[0_-4px_20px_rgba(177,14,107,0.1)]">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-label-md font-bold text-on-surface">Sẵn sàng bắt đầu?</p>
            <p className="text-caption text-on-surface-variant">Miễn phí · Kết quả trong 3 giây · Không cần thẻ tín dụng</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(PATHS.LOGIN)}
              className="px-5 py-2.5 rounded-full border border-border-pink text-on-surface text-label-md font-medium hover:bg-surface-soft transition-colors"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              id="overview-cta-register"
              onClick={() => navigate(PATHS.REGISTER)}
              className="px-6 py-2.5 rounded-full gradient-bg text-white text-label-md font-bold shadow-[0_6px_20px_rgba(177,14,107,0.35)] hover:opacity-90 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <Icon name="document_scanner" />
              Quét da miễn phí
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
