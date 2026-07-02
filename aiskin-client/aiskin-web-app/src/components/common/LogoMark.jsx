import { useId } from 'react'

export default function LogoMark({ size = 44, rounded = 14, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const bgId = `aiskin-bg-${uid}`
  const glowId = `aiskin-glow-${uid}`

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
        <linearGradient id={bgId} x1="5" y1="4" x2="43" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f6f5d" />
          <stop offset="0.52" stopColor="#1f7a68" />
          <stop offset="1" stopColor="#ff8a72" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17 13) rotate(49) scale(32)">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.48" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="48" height="48" rx={rounded} fill={`url(#${bgId})`} />
      <rect x="1.5" y="1.5" width="45" height="45" rx={Math.max(rounded - 1.5, 0)} stroke="white" strokeOpacity="0.38" strokeWidth="3" />
      <circle cx="16" cy="13" r="17" fill={`url(#${glowId})`} />

      <path
        d="M24.3 9.4c5 5.4 8.7 10.1 8.7 15.1a8.9 8.9 0 0 1-17.8 0c0-5 4-9.7 9.1-15.1Z"
        fill="white"
        fillOpacity="0.96"
      />
      <path
        d="M19.2 25.4c2.8 2.3 7.1 2.4 10.1-.1"
        stroke="#1f7a68"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      <path
        d="M24.2 17.2l1.15 2.75 2.75 1.15-2.75 1.15L24.2 25l-1.15-2.75-2.75-1.15 2.75-1.15 1.15-2.75Z"
        fill="#ff6f61"
      />
      <path
        d="M12.2 31.4c5.8 5.3 16.6 6.8 24.2-1.8"
        stroke="white"
        strokeOpacity="0.82"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="36.9" cy="28.9" r="2.4" fill="white" />
    </svg>
  )
}
