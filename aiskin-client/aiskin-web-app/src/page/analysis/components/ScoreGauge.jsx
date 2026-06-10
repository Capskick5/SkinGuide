/**
 * Vòng tròn hiển thị điểm sức khỏe da tổng thể (0-100).
 * Dùng SVG circle với gradient hồng.
 */
export default function ScoreGauge({ score = 82, size = 80 }) {
  const radius = 45
  const circumference = 2 * Math.PI * radius // ~283
  const offset = circumference * (1 - score / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e4e0f3" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8A78F0" />
            <stop offset="100%" stopColor="#6750E4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-headline-md font-bold text-primary">{score}</div>
    </div>
  )
}
