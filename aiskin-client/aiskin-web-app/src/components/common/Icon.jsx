/**
 * Icon - wrapper cho Material Symbols Outlined.
 * Props:
 *  - name: tên icon (vd "dashboard", "face")
 *  - filled: dùng biến thể fill
 *  - className: tailwind classes (size, color...)
 */
export default function Icon({ name, filled = false, className = '', style }) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' icon-filled' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
