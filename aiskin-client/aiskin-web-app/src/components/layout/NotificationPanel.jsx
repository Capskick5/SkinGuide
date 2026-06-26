import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/common/Icon'

const NOTIFICATIONS = [
  { id: 1, icon: 'schedule', color: 'text-primary', bg: 'bg-primary-light', title: 'Nhắc nhở skincare tối', body: 'Đã 8 giờ tối rồi! Đừng quên bước dưỡng da ban đêm nhé.', time: '5 phút trước', read: false },
  { id: 2, icon: 'auto_awesome', color: 'text-purple-600', bg: 'bg-purple-50', title: 'Lộ trình mới được tạo', body: 'AI đã tạo lộ trình chăm sóc da cá nhân hóa cho bạn dựa trên kết quả quét mới nhất.', time: '1 giờ trước', read: false },
  { id: 3, icon: 'trending_up', color: 'text-green-600', bg: 'bg-green-50', title: 'Tiến trình cải thiện!', body: 'Điểm da của bạn tăng 4 điểm so với tuần trước. Tiếp tục phát huy!', time: 'Hôm qua', read: true },
  { id: 4, icon: 'local_offer', color: 'text-amber-600', bg: 'bg-amber-50', title: 'Ưu đãi cho bạn', body: 'Giảm 15% cho Serum Niacinamide — sản phẩm AI đang gợi ý cho bạn.', time: '2 ngày trước', read: true },
  { id: 5, icon: 'document_scanner', color: 'text-blue-600', bg: 'bg-blue-50', title: 'Nhắc quét da', body: 'Đã 2 tuần kể từ lần quét gần nhất. Hãy quét để theo dõi tiến trình!', time: '3 ngày trước', read: true },
]

/**
 * Panel thông báo — dropdown từ bell icon trong TopNav.
 */
export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const panelRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  const markRead = (id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary hover:bg-white/60 transition-colors rounded-full"
        aria-label="Thông báo"
      >
        <Icon name="notifications" className="text-[22px]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id="notification-panel"
          className="absolute right-0 top-full mt-2 w-[380px] bg-surface-container-lowest border border-border-pink rounded-2xl shadow-[0_20px_60px_rgba(177,14,107,0.15)] z-50 overflow-hidden animate-slide-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-pink/50">
            <div className="flex items-center gap-2">
              <h3 className="text-headline-sm font-bold text-on-surface">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-primary text-white rounded-full text-[11px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-caption text-primary hover:text-tertiary transition-colors"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n.id)}
                className={[
                  'w-full flex items-start gap-3 px-5 py-4 text-left transition-colors border-b border-border-pink/30 last:border-0',
                  n.read ? 'hover:bg-surface-soft/50' : 'bg-primary-light/30 hover:bg-primary-light/50',
                ].join(' ')}
              >
                <span className={`w-10 h-10 rounded-xl ${n.bg} ${n.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon name={n.icon} filled className="text-lg" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={['text-label-md', n.read ? 'text-on-surface' : 'text-on-surface font-semibold'].join(' ')}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-caption text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed">
                    {n.body}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1">{n.time}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border-pink/50 text-center">
            <button
              type="button"
              className="text-caption text-primary hover:text-tertiary transition-colors"
            >
              Xem tất cả thông báo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
