import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, App as AntApp } from 'antd'
import Avatar from '@/components/common/Avatar'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { useAuth } from '@/hook/useAuth'
import EditProfileModal from './components/EditProfileModal'
import ChangePasswordModal from './components/ChangePasswordModal'

/** Một dòng thông tin trong thẻ hồ sơ. */
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary shrink-0">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-caption text-on-surface-variant">{label}</p>
        <p className="text-body-md text-on-surface font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

const SKIN_TYPE_LABELS = {
  normal: 'Da thường',
  oily: 'Da dầu',
  dry: 'Da khô',
  combination: 'Da hỗn hợp',
  sensitive: 'Da nhạy cảm',
}

/**
 * Trang Hồ sơ: hiển thị dữ liệu user thật từ user-service,
 * cho phép chỉnh sửa hồ sơ, đổi mật khẩu và đăng xuất.
 */
export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { message } = AntApp.useApp()
  const [editOpen, setEditOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)

  const email = user?.email || ''
  const displayName = user?.fullName || (email ? email.split('@')[0] : 'Người dùng')
  const profile = user?.skinProfile
  const skinTypeLabel = profile?.skinType ? SKIN_TYPE_LABELS[profile.skinType] || profile.skinType : 'Chưa cập nhật'
  const concerns = profile?.currentConcerns || []

  const handleLogout = async () => {
    await logout()
    message.success('Đã đăng xuất')
    navigate(PATHS.LOGIN, { replace: true })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">Hồ sơ của tôi</h1>
        <p className="text-body-md text-on-surface-variant">
          Quản lý thông tin cá nhân và hồ sơ làn da của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Thẻ hồ sơ chính */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 shadow-ambient-pink flex flex-col items-center text-center">
            <Avatar name={displayName} size={96} />
            <h2 className="text-headline-md text-on-surface mt-4">{displayName}</h2>
            <p className="text-body-md text-on-surface-variant break-all">{email}</p>
            <span className="mt-3 px-3 py-1 bg-primary-light text-tertiary rounded-full text-caption font-medium">
              {skinTypeLabel}
            </span>
            {user && (
              <span
                className={[
                  'mt-2 px-3 py-1 rounded-full text-caption font-medium',
                  user.emailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
                ].join(' ')}
              >
                {user.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
              </span>
            )}

            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-6 w-full py-2.5 rounded-full gradient-bg text-white text-label-md font-medium shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Icon name="edit" className="text-base" />
              Chỉnh sửa hồ sơ
            </button>
            <button
              type="button"
              onClick={() => setPwdOpen(true)}
              className="mt-3 w-full py-2.5 rounded-full border border-border-pink text-on-surface text-label-md hover:bg-surface-soft transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="lock" className="text-base" />
              Đổi mật khẩu
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full py-2.5 rounded-full border-2 border-error/30 text-error text-label-md hover:bg-error/10 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="logout" className="text-base" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 shadow-ambient-pink">
            <h3 className="text-headline-md text-on-surface mb-2">Thông tin cá nhân</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y sm:divide-y-0 divide-border-pink/50">
              <InfoRow icon="person" label="Họ và tên" value={user?.fullName} />
              <InfoRow icon="mail" label="Email" value={email} />
              <InfoRow icon="wc" label="Giới tính" value={profile?.gender} />
              <InfoRow
                icon="verified_user"
                label="Vai trò"
                value={(user?.roles || []).join(', ')}
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-border-pink rounded-2xl p-6 shadow-ambient-pink">
            <h3 className="text-headline-md text-on-surface mb-4">Hồ sơ làn da</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-body-md text-on-surface-variant">Loại da:</span>
              <span className="px-3 py-1 bg-primary-light text-tertiary rounded-full text-label-md">
                {skinTypeLabel}
              </span>
            </div>
            <p className="text-body-md text-on-surface-variant mb-2">Vấn đề quan tâm:</p>
            <div className="flex flex-wrap gap-2">
              {concerns.length > 0 ? (
                concerns.map((c) => (
                  <Tag key={c} className="!px-3 !py-1 !rounded-full !text-label-md">
                    {c}
                  </Tag>
                ))
              ) : (
                <span className="text-body-md text-on-surface-variant">Chưa cập nhật</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  )
}
