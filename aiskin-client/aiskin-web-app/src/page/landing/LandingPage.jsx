import { useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import Logo from '@/components/common/Logo'
import { PATHS } from '@/route/paths'

const METRICS = [
  { value: '94%', label: 'độ hài lòng' },
  { value: '3s', label: 'trả kết quả' },
  { value: '24/7', label: 'tư vấn AI' },
]

const FEATURES = [
  {
    icon: 'document_scanner',
    title: 'Quét da thông minh',
    desc: 'Nhận diện tình trạng da từ ảnh khuôn mặt và trả điểm tổng quan rõ ràng.',
  },
  {
    icon: 'calendar_month',
    title: 'Lộ trình cá nhân',
    desc: 'Gợi ý routine sáng và tối dựa trên loại da, mục tiêu và mức độ ưu tiên.',
  },
  {
    icon: 'shopping_bag',
    title: 'Sản phẩm phù hợp',
    desc: 'Lọc sản phẩm theo hồ sơ da để giảm thử sai và chọn mua tự tin hơn.',
  },
]

const STEPS = [
  { icon: 'add_a_photo', title: 'Tải ảnh', desc: 'Ảnh rõ mặt, ánh sáng tự nhiên.' },
  { icon: 'neurology', title: 'AI phân tích', desc: 'Đọc các dấu hiệu nổi bật trên da.' },
  { icon: 'spa', title: 'Nhận routine', desc: 'Theo dõi cải thiện qua từng lần quét.' },
]

const INSIGHTS = [
  { label: 'Độ ẩm', value: '82', tone: 'bg-secondary' },
  { label: 'Mụn viêm', value: 'Thấp', tone: 'bg-primary' },
  { label: 'Đều màu', value: '76', tone: 'bg-tertiary' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between rounded-lg border border-white/60 bg-white/75 px-4 shadow-[0_16px_50px_rgba(23,32,38,0.12)] backdrop-blur-xl md:px-6">
          <Logo layout="inline" size={34} />
          <div className="hidden items-center gap-6 text-sm font-medium text-on-surface-variant md:flex">
            <a href="#experience" className="hover:text-primary transition-colors">Trải nghiệm</a>
            <a href="#routine" className="hover:text-primary transition-colors">Lộ trình</a>
            <a href="#insight" className="hover:text-primary transition-colors">Phân tích</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(PATHS.LOGIN)}
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-soft sm:inline-flex"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.REGISTER)}
              className="inline-flex items-center gap-2 rounded-lg bg-on-surface px-4 py-2 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,32,38,0.22)] transition-transform hover:scale-[1.02]"
            >
              <Icon name="arrow_forward" className="text-base" />
              Bắt đầu
            </button>
          </div>
        </div>
      </nav>

      <header className="relative min-h-[92vh] overflow-hidden">
        <img
          src="/aiskin-hero.png"
          alt="AiSkin skincare AI"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,250,248,0.94)_0%,rgba(247,250,248,0.78)_42%,rgba(23,32,38,0.2)_100%)]" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl items-center px-6 pt-24">
          <div className="max-w-2xl pb-16">
            <span className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/65 px-3 py-2 text-sm font-semibold text-secondary backdrop-blur">
              <Icon name="auto_awesome" filled className="text-base" />
              AI skincare companion
            </span>
            <h1 className="text-[44px] font-black leading-[1.02] text-on-surface md:text-[72px]">
              AiSkin
              <span className="block text-primary">hiểu làn da của bạn.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-on-surface-variant">
              Quét da, đọc kết quả và xây routine chăm sóc cá nhân hóa trong một trải nghiệm nhẹ, đẹp và dễ tin cậy.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                id="landing-cta-btn"
                onClick={() => navigate(PATHS.REGISTER)}
                className="inline-flex items-center justify-center gap-2 rounded-lg gradient-bg px-6 py-4 text-sm font-black text-white shadow-[0_18px_40px_rgba(255,111,97,0.28)] transition-transform hover:scale-[1.02]"
              >
                <Icon name="document_scanner" filled />
                Quét da miễn phí
              </button>
              <button
                type="button"
                onClick={() => navigate(PATHS.OVERVIEW)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/80 bg-white/70 px-6 py-4 text-sm font-bold text-on-surface shadow-[0_14px_34px_rgba(23,32,38,0.1)] backdrop-blur transition-colors hover:bg-white"
              >
                <Icon name="visibility" />
                Xem demo
              </button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {METRICS.map((item) => (
                <div key={item.label} className="rounded-lg border border-white/70 bg-white/62 p-4 backdrop-blur">
                  <p className="text-2xl font-black text-on-surface">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-on-surface-variant">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="experience" className="bg-canvas px-6 py-18 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase text-primary">Beauty tech, không rối</p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                Một giao diện đủ đẹp để dùng mỗi ngày, đủ rõ để ra quyết định.
              </h2>
              <p className="mt-5 text-base leading-7 text-on-surface-variant">
                AiSkin gom phân tích, routine, sản phẩm và tiến trình vào cùng một luồng. Người dùng không phải đoán bước tiếp theo.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_18px_45px_rgba(23,32,38,0.08)]"
                >
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light text-primary">
                    <Icon name={feature.icon} filled />
                  </span>
                  <h3 className="text-lg font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">{feature.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="routine" className="bg-[linear-gradient(135deg,#172026_0%,#1f7a68_52%,#356dff_100%)] px-6 py-18 text-white md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="grid gap-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="grid grid-cols-[56px_1fr] gap-4 rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-on-surface">
                    <Icon name={step.icon} filled />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-white/55">Bước {index + 1}</p>
                    <h3 className="mt-1 text-xl font-black">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-black uppercase text-primary-fixed-dim">Routine rõ ràng</p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                Từ ảnh chụp đến kế hoạch chăm sóc chỉ trong vài phút.
              </h2>
              <p className="mt-5 text-base leading-7 text-white/74">
                Mỗi đề xuất được trình bày theo buổi sáng, buổi tối và mục tiêu da để người dùng dễ theo dõi tiến trình.
              </p>
              <button
                type="button"
                onClick={() => navigate(PATHS.REGISTER)}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-4 text-sm font-black text-on-surface transition-transform hover:scale-[1.02]"
              >
                <Icon name="spa" filled />
                Tạo lộ trình của tôi
              </button>
            </div>
          </div>
        </section>

        <section id="insight" className="bg-surface px-6 py-18 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase text-secondary">Skin insight</p>
              <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                Kết quả phân tích dễ đọc, đẹp mắt và có hành động tiếp theo.
              </h2>
              <p className="mt-5 text-base leading-7 text-on-surface-variant">
                Các chỉ số được gom theo mức ưu tiên để người dùng biết nên tập trung vào điều gì trước.
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant bg-white p-5 shadow-[0_24px_70px_rgba(23,32,38,0.12)]">
              <div className="flex items-center justify-between border-b border-outline-variant pb-4">
                <div>
                  <p className="text-sm font-bold text-on-surface-variant">Điểm da hôm nay</p>
                  <p className="mt-1 text-5xl font-black">82</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Icon name="face_retouching_natural" filled className="text-3xl" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {INSIGHTS.map((item) => (
                  <div key={item.label} className="rounded-lg bg-surface-container-low p-4">
                    <span className={`mb-4 block h-2 w-12 rounded-full ${item.tone}`} />
                    <p className="text-sm font-semibold text-on-surface-variant">{item.label}</p>
                    <p className="mt-1 text-2xl font-black">{item.value}</p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate(PATHS.REGISTER)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-on-surface px-5 py-4 text-sm font-black text-white transition-transform hover:scale-[1.01]"
              >
                <Icon name="arrow_forward" />
                Xem phân tích đầy đủ
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <Logo layout="inline" size={30} />
          <p className="text-sm text-on-surface-variant">© 2026 AiSkin. Skincare made clearer.</p>
          <div className="flex gap-5 text-sm font-semibold text-on-surface-variant">
            <button type="button" className="hover:text-primary">Điều khoản</button>
            <button type="button" className="hover:text-primary">Bảo mật</button>
            <button type="button" className="hover:text-primary">Liên hệ</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
