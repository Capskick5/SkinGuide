import { useState } from 'react'
import { Popover } from 'antd'
import { useNavigate } from 'react-router-dom'
import Avatar from '@/components/common/Avatar'
import Icon from '@/components/common/Icon'
import { PATHS } from '@/route/paths'
import { useAuth } from '@/hook/useAuth'

/**
 * Avatar ở TopNav + popover thông tin nhanh người dùng:
 * hiển thị tên/email, link tới Hồ sơ, Cài đặt và nút Đăng xuất.
 */
export default function UserMenu() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  // Backend hiện chỉ trả email; tên hiển thị tạm lấy từ phần trước @.
  const email = user?.email || ''
  const displayName = email ? email.split('@')[0] : 'Người dùng'

  const go = (path) => {
    setOpen(false)
    navigate(path)
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate(PATHS.LOGIN, { replace: true })
  }

  const content = (
    <div className="w-64">
      {/* Thông tin nhanh */}
      <div className="flex items-center gap-3 px-1 pb-3">
        <Avatar name={displayName} size={48} />
        <div className="min-w-0">
          <p className="text-label-md font-semibold text-on-surface truncate">
            {displayName}
          </p>
          <p className="text-caption text-on-surface-variant truncate">{email}</p>
        </div>
      </div>

      <div className="h-px bg-border-pink/70 my-1" />

      {/* Hành động */}
      <button
        type="button"
        onClick={() => go(PATHS.PROFILE)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-on-surface hover:bg-primary-light/60 transition-colors"
      >
        <Icon name="person" className="text-xl text-on-surface-variant" />
        <span className="text-body-md">Hồ sơ của tôi</span>
      </button>
      <button
        type="button"
        onClick={() => go(PATHS.SETTINGS)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-on-surface hover:bg-primary-light/60 transition-colors"
      >
        <Icon name="settings" className="text-xl text-on-surface-variant" />
        <span className="text-body-md">Cài đặt</span>
      </button>

      <div className="h-px bg-border-pink/70 my-1" />

      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-error hover:bg-error/10 transition-colors"
      >
        <Icon name="logout" className="text-xl" />
        <span className="text-body-md font-medium">Đăng xuất</span>
      </button>
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
    >
      <button
        type="button"
        className="rounded-full ring-2 ring-white hover:ring-primary/40 transition-all"
        aria-label="Tài khoản"
      >
        <Avatar name={displayName} size={36} />
      </button>
    </Popover>
  )
}
