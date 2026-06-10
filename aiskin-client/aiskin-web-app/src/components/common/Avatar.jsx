import { getInitials } from '@/data/currentUser'

/**
 * Avatar hình tròn hiển thị chữ cái đầu của tên trên nền gradient.
 * Props: name, size (px), className.
 */
export default function Avatar({ name = '', size = 40, className = '' }) {
  return (
    <div
      className={`rounded-full gradient-bg text-white font-bold flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  )
}
