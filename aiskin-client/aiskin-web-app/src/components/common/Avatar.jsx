import { getInitials } from '@/data/currentUser'

/**
 * Avatar hình tròn hiển thị chữ cái đầu của tên trên nền gradient.
 * Props: name, size (px), className.
 */
export default function Avatar({ name = '', size = 40, className = '' }) {
  return (
    <div
      className={`rounded-full gradient-bg text-white font-bold flex items-center justify-center select-none ring-2 ring-white/80 shadow-[0_4px_12px_rgba(255,111,97,0.2)] transition-transform duration-200 hover:scale-105 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  )
}
