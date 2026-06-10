import Icon from '@/components/common/Icon'
import logo from '@/assets/logo.png'

const FEATURES = [
  { icon: 'neurology', title: 'Phân tích AI', desc: 'Nhận diện tình trạng da theo thời gian thực.' },
  { icon: 'science', title: 'Độ chính xác lâm sàng', desc: 'Chuẩn hóa theo dữ liệu da liễu.' },
  { icon: 'spa', title: 'Lộ trình cá nhân hóa', desc: 'Gợi ý sản phẩm phù hợp riêng bạn.' },
]

/**
 * Cột branding bên trái của màn hình auth (ẩn trên mobile).
 * Thiết kế gọn, cân đối theo chiều cao cố định: logo · headline · feature list · footer.
 */
export default function AuthBranding() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden p-10 xl:p-12 bg-gradient-to-br from-primary-light via-surface-soft to-secondary-fixed">
      {/* Decorative glows */}
      <div className="absolute top-[-15%] left-[-10%] w-2/3 h-2/3 rounded-full bg-primary-container opacity-10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-15%] w-3/5 h-3/5 rounded-full bg-tertiary-container opacity-10 blur-[120px]" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-ambient-pink">
          <img src={logo} alt="AiSkin" className="w-full h-full object-contain p-1.5" />
        </div>
        <div>
          <h1 className="brand-wordmark text-[22px]">
            <span className="brand-ai">Ai</span>
            <span className="brand-skin">Skin</span>
          </h1>
          <p className="text-caption text-secondary">Chăm sóc da bằng AI</p>
        </div>
      </div>

      {/* Hero + features */}
      <div className="relative z-10 max-w-md">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rounded-full bg-white/60 backdrop-blur-sm border border-white/70 text-caption text-tertiary">
          <Icon name="auto_awesome" filled className="text-[15px]" />
          Công nghệ phân tích da thế hệ mới
        </span>

        <h2 className="text-headline-lg xl:text-display-hero leading-tight mb-4 text-on-surface">
          Khai phá <span className="gradient-text">tiềm năng</span> làn da của bạn.
        </h2>
        <p className="text-body-md text-on-surface-variant mb-8">
          Phân tích AI tiên tiến kết hợp độ chính xác lâm sàng để tạo nên lộ trình chăm sóc da riêng cho bạn.
        </p>

        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-white/70 backdrop-blur-sm border border-white/70 flex items-center justify-center shadow-sm">
                <Icon name={f.icon} filled className="text-[20px] text-primary" />
              </span>
              <div>
                <p className="text-label-md text-on-surface">{f.title}</p>
                <p className="text-caption text-on-surface-variant">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-caption text-on-surface-variant">
        <span>© 2024 AiSkin</span>
        <span className="flex items-center gap-1.5">
          <Icon name="verified_user" filled className="text-[15px] text-success" />
          Bảo mật & riêng tư
        </span>
      </div>
    </div>
  )
}
