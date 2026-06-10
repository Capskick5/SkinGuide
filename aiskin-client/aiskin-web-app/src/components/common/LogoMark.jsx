/**
 * LogoMark - biểu tượng thương hiệu AiSkin (SVG, không phụ thuộc ảnh).
 * Kết hợp giọt nước (cấp ẩm / làn da) và tia sáng AI trên nền gradient tím.
 * Props:
 *  - size: kích thước (px)
 *  - rounded: bo góc khung nền (px)
 *  - className
 */
export default function LogoMark({ size = 44, rounded = 14, className = '' }) {
  const gid = 'aiskin-logo-grad'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="AiSkin"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A78F0" />
          <stop offset="0.55" stopColor="#6750E4" />
          <stop offset="1" stopColor="#4F7CFA" />
        </linearGradient>
      </defs>

      {/* Nền bo góc */}
      <rect width="48" height="48" rx={rounded} fill={`url(#${gid})`} />

      {/* Giọt nước - tượng trưng cấp ẩm / làn da */}
      <path
        d="M24 11c4.6 5.1 8 9.3 8 13.6A8 8 0 1 1 16 24.6C16 20.3 19.4 16.1 24 11Z"
        fill="#ffffff"
        fillOpacity="0.95"
      />

      {/* Tia sáng AI bên trong giọt nước */}
      <path
        d="M24 19.5l1.5 3.6 3.6 1.5-3.6 1.5L24 29.7l-1.5-3.6L18.9 24.6l3.6-1.5L24 19.5Z"
        fill={`url(#${gid})`}
      />
    </svg>
  )
}
