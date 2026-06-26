import { useState } from 'react'
import Icon from '@/components/common/Icon'

function SettingsSection({ title, icon, children }) {
  return (
    <div className="bg-surface-container-lowest border border-border-pink rounded-2xl shadow-ambient-pink overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-pink/50">
        <span className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-primary">
          <Icon name={icon} className="text-lg" />
        </span>
        <h2 className="text-headline-sm font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="divide-y divide-border-pink/30">{children}</div>
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-body-md font-medium text-on-surface">{label}</p>
        {desc && <p className="text-caption text-on-surface-variant">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          'relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0',
          value ? 'gradient-bg' : 'bg-surface-soft border border-border-pink',
        ].join(' ')}
        aria-checked={value}
        role="switch"
      >
        <span
          className={[
            'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
            value ? 'left-7' : 'left-1',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

function SelectRow({ label, desc, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      <div>
        <p className="text-body-md font-medium text-on-surface">{label}</p>
        {desc && <p className="text-caption text-on-surface-variant">{desc}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border-pink bg-surface-soft text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/**
 * Trang Cài đặt — riêng biệt với Profile.
 * Bao gồm: Thông báo, Giao diện, Quyền riêng tư, Tài khoản.
 */
export default function SettingsPage() {
  const [notifRoutine, setNotifRoutine] = useState(true)
  const [notifProgress, setNotifProgress] = useState(true)
  const [notifPromo, setNotifPromo] = useState(false)
  const [notifScanReminder, setNotifScanReminder] = useState(true)
  const [theme, setTheme] = useState('light')
  const [language, setLanguage] = useState('vi')
  const [reminderTime, setReminderTime] = useState('21:00')
  const [dataSharing, setDataSharing] = useState(true)
  const [analyticsConsent, setAnalyticsConsent] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">Cài đặt</h1>
        <p className="text-body-md text-on-surface-variant">
          Quản lý thông báo, giao diện và quyền riêng tư của bạn.
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">

        {/* Thông báo */}
        <SettingsSection title="Thông báo" icon="notifications">
          <ToggleRow
            label="Nhắc nhở lộ trình skincare"
            desc="Nhắc bạn theo dõi lộ trình hàng ngày"
            value={notifRoutine}
            onChange={setNotifRoutine}
          />
          <ToggleRow
            label="Cập nhật tiến trình"
            desc="Thông báo khi điểm da của bạn thay đổi"
            value={notifProgress}
            onChange={setNotifProgress}
          />
          <ToggleRow
            label="Nhắc quét da định kỳ"
            desc="Nhắc bạn quét da sau 2 tuần"
            value={notifScanReminder}
            onChange={setNotifScanReminder}
          />
          <ToggleRow
            label="Ưu đãi & khuyến mãi"
            desc="Thông báo về deal sản phẩm phù hợp với da bạn"
            value={notifPromo}
            onChange={setNotifPromo}
          />
          {notifRoutine && (
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-body-md font-medium text-on-surface">Giờ nhắc nhở</p>
                <p className="text-caption text-on-surface-variant">Giờ nhắc skincare tối</p>
              </div>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border-pink bg-surface-soft text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
        </SettingsSection>

        {/* Giao diện */}
        <SettingsSection title="Giao diện & Ngôn ngữ" icon="palette">
          <SelectRow
            label="Giao diện"
            desc="Chọn chế độ hiển thị"
            value={theme}
            options={[
              { value: 'light', label: '☀️ Sáng' },
              { value: 'dark', label: '🌙 Tối' },
              { value: 'system', label: '💻 Theo hệ thống' },
            ]}
            onChange={setTheme}
          />
          <SelectRow
            label="Ngôn ngữ"
            value={language}
            options={[
              { value: 'vi', label: '🇻🇳 Tiếng Việt' },
              { value: 'en', label: '🇬🇧 English' },
            ]}
            onChange={setLanguage}
          />
        </SettingsSection>

        {/* Quyền riêng tư */}
        <SettingsSection title="Quyền riêng tư & Dữ liệu" icon="security">
          <ToggleRow
            label="Chia sẻ dữ liệu ẩn danh"
            desc="Giúp cải thiện AI phân tích da (không bao gồm thông tin cá nhân)"
            value={dataSharing}
            onChange={setDataSharing}
          />
          <ToggleRow
            label="Phân tích sử dụng"
            desc="Cho phép thu thập dữ liệu để cải thiện trải nghiệm"
            value={analyticsConsent}
            onChange={setAnalyticsConsent}
          />
          <div className="px-6 py-4">
            <button
              type="button"
              className="text-label-md text-primary hover:text-tertiary transition-colors flex items-center gap-2"
            >
              <Icon name="download" className="text-base" />
              Tải xuống dữ liệu của tôi
            </button>
          </div>
        </SettingsSection>

        {/* Tài khoản */}
        <SettingsSection title="Tài khoản" icon="manage_accounts">
          <div className="px-6 py-4">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left group"
            >
              <div>
                <p className="text-body-md font-medium text-on-surface">Đổi mật khẩu</p>
                <p className="text-caption text-on-surface-variant">Cập nhật mật khẩu đăng nhập</p>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant group-hover:text-primary transition-colors" />
            </button>
          </div>
          <div className="px-6 py-4">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left group"
            >
              <div>
                <p className="text-body-md font-medium text-on-surface">Phiên đăng nhập</p>
                <p className="text-caption text-on-surface-variant">Quản lý các thiết bị đang đăng nhập</p>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant group-hover:text-primary transition-colors" />
            </button>
          </div>
          <div className="px-6 py-4">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-label-md text-red-500 hover:text-red-700 transition-colors flex items-center gap-2"
              >
                <Icon name="delete_forever" className="text-base" />
                Xóa tài khoản
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-body-sm font-semibold text-red-700 mb-1">Bạn chắc chắn muốn xóa tài khoản?</p>
                <p className="text-caption text-red-500 mb-3">Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-xl border border-border-pink text-on-surface text-caption hover:bg-surface-soft transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2 rounded-xl bg-red-500 text-white text-caption font-semibold hover:bg-red-600 transition-colors"
                  >
                    Xóa vĩnh viễn
                  </button>
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* App version */}
        <p className="text-caption text-center text-on-surface-variant/60 pb-4">
          AiSkin v1.0.0 · Được xây dựng với ❤️ bởi đội ngũ AiSkin
        </p>
      </div>
    </div>
  )
}
