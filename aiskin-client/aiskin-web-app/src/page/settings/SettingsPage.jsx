import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useAuth } from '@/hook/useAuth'
import { PATHS } from '@/route/paths'

function SettingsSection({ title, icon, children }) {
  return (
    <section className="overflow-hidden rounded-md border border-border-pink bg-surface-container-lowest shadow-ambient-pink">
      <div className="flex items-center gap-3 border-b border-border-pink/50 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light text-primary">
          <Icon name={icon} className="text-lg" />
        </span>
        <h2 className="text-headline-sm font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="divide-y divide-border-pink/30">{children}</div>
    </section>
  )
}

function SettingsLink({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex min-h-20 items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-light/45"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-soft text-primary">
        <Icon name={icon} />
      </span>
      <span className="min-w-0 grow">
        <span className="block text-body-md font-medium text-on-surface">{title}</span>
        <span className="block text-caption text-on-surface-variant">{description}</span>
      </span>
      <Icon name="chevron_right" className="shrink-0 text-on-surface-variant transition-colors group-hover:text-primary" />
    </Link>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    await logout()
    navigate(PATHS.LOGIN, { replace: true })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-headline-lg text-on-surface">Tài khoản & dữ liệu</h1>
        <p className="text-body-md text-on-surface-variant">{user?.email || 'Tài khoản AiSkin'}</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-6">
        <SettingsSection title="Tài khoản" icon="manage_accounts">
          <SettingsLink
            to={PATHS.PROFILE}
            icon="person"
            title="Hồ sơ và mật khẩu"
            description="Cập nhật thông tin cá nhân, hồ sơ da và mật khẩu"
          />
          <div className="flex min-h-20 items-center gap-4 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-soft text-primary">
              <Icon name={user?.emailVerified ? 'verified_user' : 'mark_email_unread'} />
            </span>
            <div>
              <p className="text-body-md font-medium text-on-surface">Xác thực email</p>
              <p className="text-caption text-on-surface-variant">
                {user?.emailVerified ? 'Email đã được xác thực' : 'Email chưa được xác thực'}
              </p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Dữ liệu của tôi" icon="database">
          <SettingsLink
            to={PATHS.HISTORY}
            icon="history"
            title="Lịch sử quét da"
            description="Xem hoặc xóa từng kết quả quét đã lưu"
          />
          <SettingsLink
            to={PATHS.ORDERS}
            icon="receipt_long"
            title="Đơn hàng"
            description="Theo dõi trạng thái, hủy hoặc gửi yêu cầu trả hàng"
          />
        </SettingsSection>

        <SettingsSection title="Phiên đăng nhập" icon="security">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-md font-medium text-on-surface">Thiết bị hiện tại</p>
              <p className="text-caption text-on-surface-variant">Đăng xuất và thu hồi refresh token của phiên này</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="logout" />
              {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
