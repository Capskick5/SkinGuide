import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import Logo from '@/components/common/Logo'

const FEATURES = [
  {
    icon: 'document_scanner',
    title: 'Quét da bằng AI',
    desc: 'Chụp ảnh khuôn mặt từ điện thoại hoặc tải ảnh lên. AI phân tích tình trạng da trong vài giây.',
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-rose-50',
  },
  {
    icon: 'face_retouching_natural',
    title: 'Phân tích chuyên sâu',
    desc: 'Phát hiện mụn, sạm nám, khô da, nếp nhăn và nhiều vấn đề khác với độ chính xác cao.',
    color: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-50',
  },
  {
    icon: 'auto_awesome',
    title: 'Lộ trình cá nhân hóa',
    desc: 'Nhận lộ trình skincare sáng/tối được AI tùy chỉnh hoàn toàn theo loại da và vấn đề của bạn.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
  },
  {
    icon: 'shopping_bag',
    title: 'Gợi ý sản phẩm thông minh',
    desc: 'AI gợi ý sản phẩm phù hợp nhất với hồ sơ da, ngân sách và mức độ ưu tiên của bạn.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: 'trending_up',
    title: 'Theo dõi tiến trình',
    desc: 'So sánh before/after, biểu đồ cải thiện theo thời gian. Thấy rõ da bạn đang tiến bộ.',
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
  },
  {
    icon: 'chat',
    title: 'Tư vấn AI 24/7',
    desc: 'Chatbot AI sẵn sàng giải đáp mọi câu hỏi về chăm sóc da, thành phần và lộ trình.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
  },
]

const TESTIMONIALS = [
  {
    name: 'Nguyễn Thị Lan',
    role: 'Sinh viên, 22 tuổi',
    text: 'Sau 6 tuần dùng lộ trình từ AiSkin, mụn của mình giảm rõ rệt. AI gợi ý đúng sản phẩm mà mình chưa từng nghĩ tới!',
    score: '+15 điểm',
    avatar: 'L',
    color: 'bg-rose-400',
  },
  {
    name: 'Trần Minh Khoa',
    role: 'Nhân viên văn phòng, 28 tuổi',
    text: 'Tính năng quét da qua điện thoại rất tiện. Chỉ cần 30 giây là có kết quả phân tích đầy đủ.',
    score: '+22 điểm',
    avatar: 'K',
    color: 'bg-blue-400',
  },
  {
    name: 'Phạm Thu Hương',
    role: 'Blogger làm đẹp, 31 tuổi',
    text: 'Là người dùng nhiều app skincare, AiSkin ấn tượng nhất ở khả năng cá nhân hóa. Lộ trình thật sự phù hợp với da mình.',
    score: '+18 điểm',
    avatar: 'H',
    color: 'bg-emerald-400',
  },
]

const STATS = [
  { value: '50K+', label: 'Người dùng' },
  { value: '200K+', label: 'Lần quét da' },
  { value: '94%', label: 'Hài lòng' },
  { value: '4.8★', label: 'Đánh giá' },
]

/**
 * Landing Page — hiển thị cho người dùng chưa đăng nhập.
 * Route: /welcome (public)
 */
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-border-pink/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo layout="inline" size={36} />
          <div className="flex items-center gap-3">
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
              Dùng miễn phí
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl translate-y-1/2" />

        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light border border-border-pink rounded-full text-label-md text-primary mb-6">
            <Icon name="auto_awesome" className="text-sm" filled />
            AI phân tích da chính xác đến 94%
          </span>

          <h1 className="text-4xl md:text-6xl font-extrabold text-on-surface mb-6 leading-tight">
            Làn da khỏe đẹp bắt đầu từ{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                hiểu đúng da bạn
              </span>
            </span>
          </h1>

          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
            AiSkin dùng trí tuệ nhân tạo để phân tích da mụn, đề xuất lộ trình skincare cá nhân hóa
            và gợi ý sản phẩm phù hợp nhất — hoàn toàn miễn phí.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              id="landing-cta-btn"
              onClick={() => navigate(PATHS.REGISTER)}
              className="px-8 py-4 rounded-2xl gradient-bg text-white text-label-md font-bold shadow-[0_8px_30px_rgba(177,14,107,0.35)] hover:opacity-90 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Icon name="document_scanner" />
              Quét da miễn phí ngay
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.OVERVIEW)}
              className="px-8 py-4 rounded-2xl border-2 border-border-pink text-on-surface text-label-md font-semibold hover:bg-surface-soft transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="visibility" />
              Xem tổng quan
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.LOGIN)}
              className="px-8 py-4 rounded-2xl border-2 border-border-pink/60 text-on-surface-variant text-label-md font-semibold hover:bg-surface-soft transition-colors flex items-center justify-center gap-2 sm:hidden"
            >
              <Icon name="login" />
              Đăng nhập
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 flex-wrap">
            {[
              { icon: 'lock', text: 'Bảo mật dữ liệu' },
              { icon: 'verified', text: 'AI chứng nhận' },
              { icon: 'favorite', text: 'Miễn phí hoàn toàn' },
            ].map((b) => (
              <span key={b.text} className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                <Icon name={b.icon} className="text-primary text-base" filled />
                {b.text}
              </span>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="relative bg-gradient-to-br from-primary-light via-white to-purple-50 rounded-3xl p-8 border border-border-pink shadow-[0_30px_80px_rgba(177,14,107,0.15)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center">
                <Icon name="face" className="text-3xl text-white" />
              </div>
              <div>
                <p className="text-headline-sm font-bold text-on-surface">Kết quả phân tích AI</p>
                <p className="text-caption text-on-surface-variant">Phân tích xong trong 3 giây</p>
              </div>
              <span className="ml-auto text-3xl font-extrabold text-primary">82</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Mụn', level: 60, color: 'bg-amber-400' },
                { label: 'Độ ẩm', level: 85, color: 'bg-blue-400' },
                { label: 'Sạm nám', level: 40, color: 'bg-emerald-400' },
              ].map((item) => (
                <div key={item.label} className="bg-white/70 rounded-xl p-3 text-center border border-border-pink/40">
                  <div className="h-16 flex items-end justify-center mb-2">
                    <div
                      className={`w-6 ${item.color} rounded-t-lg transition-all`}
                      style={{ height: `${item.level}%` }}
                    />
                  </div>
                  <p className="text-caption font-medium text-on-surface">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-surface-container-low border-y border-border-pink/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-body-md text-on-surface-variant mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-4">
              Mọi thứ bạn cần cho làn da khỏe
            </h2>
            <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
              Từ phân tích đến lộ trình, từ sản phẩm đến theo dõi — AiSkin lo tất cả.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-surface-container-lowest border border-border-pink rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(177,14,107,0.12)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center mb-4`}>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center`}>
                    <Icon name={f.icon} className="text-white text-xl" filled />
                  </div>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface mb-2">{f.title}</h3>
                <p className="text-body-md text-on-surface-variant leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => navigate(PATHS.OVERVIEW)}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-border-pink text-on-surface text-label-md font-semibold hover:bg-surface-soft transition-colors"
            >
              <Icon name="visibility" />
              Xem thử giao diện thực tế
            </button>
          </div>

        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary-light/30 to-purple-50/30 border-y border-border-pink/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-on-surface mb-4">Người dùng nói gì?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 shadow-ambient-pink"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-lg`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-label-md font-semibold text-on-surface">{t.name}</p>
                    <p className="text-caption text-on-surface-variant">{t.role}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 gradient-bg text-white text-caption font-bold rounded-full">
                    {t.score}
                  </span>
                </div>
                <p className="text-body-md text-on-surface-variant leading-relaxed italic">"{t.text}"</p>
                <div className="flex gap-0.5 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} name="star" filled className="text-amber-400 text-sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-purple-50 opacity-60" />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-4">
            Bắt đầu hành trình da khỏe ngay hôm nay
          </h2>
          <p className="text-body-lg text-on-surface-variant mb-8">
            Miễn phí · Không cần thẻ tín dụng · Kết quả trong 3 giây
          </p>
          <button
            type="button"
            onClick={() => navigate(PATHS.REGISTER)}
            className="px-10 py-5 rounded-2xl gradient-bg text-white text-label-md font-bold shadow-[0_10px_40px_rgba(177,14,107,0.4)] hover:opacity-90 transition-all hover:scale-[1.02] flex items-center gap-3 mx-auto"
          >
            <Icon name="document_scanner" className="text-2xl" />
            Quét da miễn phí ngay
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-border-pink/40 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo layout="inline" size={32} />
          <p className="text-caption text-on-surface-variant">
            © 2026 AiSkin. Được xây dựng với ❤️ tại Việt Nam.
          </p>
          <div className="flex gap-6">
            {['Điều khoản', 'Bảo mật', 'Liên hệ'].map((l) => (
              <button key={l} type="button" className="text-caption text-on-surface-variant hover:text-primary transition-colors">
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
