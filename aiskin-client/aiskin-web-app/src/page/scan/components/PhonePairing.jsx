import { QRCodeSVG } from 'qrcode.react'
import Icon from '@/components/common/Icon'
import { DEMO_SERVER } from '@/config/demoServer'

/** Cấu hình hiển thị theo trạng thái phiên ghép nối. */
const STATUS_META = {
  idle: { label: 'Chưa bắt đầu', color: 'text-on-surface-variant', dot: 'bg-outline' },
  waiting: { label: 'Đang chờ điện thoại kết nối…', color: 'text-warning', dot: 'bg-warning' },
  connected: { label: 'Điện thoại đã kết nối', color: 'text-success', dot: 'bg-success' },
  received: { label: 'Đang nhận ảnh từ điện thoại…', color: 'text-primary', dot: 'bg-primary' },
}

const STEPS = [
  { icon: 'phone_iphone', text: 'Mở app AiSkin trên điện thoại' },
  { icon: 'qr_code_scanner', text: 'Quét mã QR bên cạnh' },
  { icon: 'photo_camera', text: 'Chụp khuôn mặt và gửi lên' },
]

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

/**
 * Khu vực ghép nối điện thoại bằng QR + hướng dẫn + trạng thái real-time.
 */
export default function PhonePairing({ sessionId, status, secondsLeft, error, onStart, onReset }) {
  const meta = STATUS_META[status] ?? STATUS_META.idle
  const active = status !== 'idle'
  const expired = active && secondsLeft === 0

  // QR chứa địa chỉ server + sessionId để app điện thoại kết nối & upload.
  // Định dạng: aiskin://pair?server=<url>&session=<id>
  const qrValue = sessionId
    ? `aiskin://pair?server=${encodeURIComponent(DEMO_SERVER)}&session=${sessionId}`
    : 'aiskin://pair'

  return (
    <div className="rounded-xl border border-border-pink bg-surface-container-lowest shadow-[0_8px_30px_rgba(103,80,228,0.07)] p-6 lg:p-8 h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
        {/* QR */}
        <div className="flex flex-col items-center">
          <div className="relative p-4 bg-white rounded-2xl border border-border-pink">
            <div className={expired ? 'opacity-20 blur-sm' : active ? '' : 'opacity-30'}>
              <QRCodeSVG value={qrValue} size={180} fgColor="#6750e4" level="M" />
            </div>

            {/* Overlay khi chưa bắt đầu hoặc hết hạn */}
            {(!active || expired) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={onStart}
                  className="px-5 py-2.5 rounded-full gradient-bg text-white text-label-md font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Icon name={expired ? 'refresh' : 'qr_code_2'} className="text-base" />
                  {expired ? 'Tạo mã mới' : 'Tạo mã QR'}
                </button>
              </div>
            )}
          </div>

          {active && !expired && (
            <div className="mt-4 text-center">
              <p className="text-caption text-on-surface-variant">Mã phiên</p>
              <p className="text-label-md font-mono font-semibold text-on-surface tracking-wider">
                {sessionId}
              </p>
              <p className="text-caption text-on-surface-variant mt-1 flex items-center justify-center gap-1">
                <Icon name="timer" className="text-[14px]" />
                Hết hạn sau {formatTime(secondsLeft)}
              </p>
            </div>
          )}
        </div>

        {/* Hướng dẫn + trạng thái */}
        <div>
          <h3 className="text-headline-md text-on-surface mb-1">Quét từ điện thoại</h3>
          <p className="text-body-md text-on-surface-variant mb-5">
            Dùng app AiSkin trên điện thoại để chụp và gửi ảnh khuôn mặt lên đây.
          </p>

          <ol className="space-y-3 mb-6">
            {STEPS.map((s, i) => (
              <li key={s.text} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0 text-label-md font-semibold">
                  {i + 1}
                </span>
                <Icon name={s.icon} className="text-on-surface-variant text-xl" />
                <span className="text-body-md text-on-surface">{s.text}</span>
              </li>
            ))}
          </ol>

          {/* Trạng thái real-time */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-soft border border-border-pink/60">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot} ${active && !expired ? 'animate-pulse' : ''}`} />
              <span className={`text-label-md font-medium ${expired ? 'text-error' : meta.color}`}>
                {expired ? 'Phiên đã hết hạn' : meta.label}
              </span>
            </div>
            {active && (
              <button
                type="button"
                onClick={onReset}
                className="text-caption text-on-surface-variant hover:text-primary transition-colors"
              >
                Hủy
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 text-caption text-error flex items-center gap-1.5">
              <Icon name="error" className="text-[16px]" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
