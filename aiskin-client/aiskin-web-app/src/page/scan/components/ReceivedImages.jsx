import Icon from '@/components/common/Icon'

/**
 * Lưới ảnh điện thoại đã gửi lên, kèm nút "Phân tích".
 * Hiển thị khi có ít nhất 1 ảnh.
 */
export default function ReceivedImages({ images = [], onAnalyze }) {
  if (images.length === 0) return null

  return (
    <div className="rounded-xl border border-border-pink bg-surface-container-lowest shadow-[0_8px_30px_rgba(103,80,228,0.07)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-headline-md text-on-surface flex items-center gap-2">
          <Icon name="cloud_done" className="text-primary" />
          Ảnh đã nhận ({images.length})
        </h3>
        <button
          type="button"
          onClick={onAnalyze}
          className="px-5 py-2.5 rounded-full gradient-bg text-white text-label-md font-medium shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Icon name="auto_awesome" className="text-base" />
          Phân tích ngay
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative aspect-[3/4] rounded-xl bg-primary-light border border-border-pink flex flex-col items-center justify-center overflow-hidden group"
          >
            {img.src ? (
              <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
            ) : (
              <Icon name="face" className="text-5xl text-primary/40" />
            )}
            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-success text-white flex items-center justify-center">
              <Icon name="check" className="text-sm" />
            </span>
            <span className="absolute bottom-0 inset-x-0 bg-white/80 backdrop-blur-sm text-caption text-on-surface text-center py-1">
              {img.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
