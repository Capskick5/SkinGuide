import LogoMark from './LogoMark'

/**
 * Logo thương hiệu AiSkin (dùng LogoMark SVG).
 * Props:
 *  - layout: 'stacked' (logo trên, chữ dưới - cho sidebar) | 'inline' (logo cạnh chữ)
 *  - size: kích thước biểu tượng (px)
 *  - showWordmark: có hiển thị chữ "AiSkin" không
 */
export default function Logo({ layout = 'inline', size = 40, showWordmark = true, className = '' }) {
  const stacked = layout === 'stacked'

  return (
    <div
      className={[
        'flex items-center',
        stacked ? 'flex-col gap-1.5' : 'gap-2.5',
        className,
      ].join(' ')}
    >
      <LogoMark size={size} rounded={size * 0.32} className="shadow-[0_6px_16px_rgba(103,80,228,0.28)]" />
      {showWordmark && (
        <span
          className="brand-wordmark"
          style={{ fontSize: stacked ? 19 : size * 0.52 }}
        >
          <span className="brand-ai">Ai</span>
          <span className="brand-skin">Skin</span>
        </span>
      )}
    </div>
  )
}
