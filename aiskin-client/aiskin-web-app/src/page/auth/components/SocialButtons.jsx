import { useAuth } from '@/hook/useAuth'
import { useNavigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useEffect } from 'react'
import { PATHS } from '@/route/paths'

/**
 * Nút đăng nhập bằng mạng xã hội (Google).
 */
export default function SocialButtons() {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  const handleGoogleCredential = async (credential) => {
    try {
      await loginWithGoogle(credential)
      message.success('Đăng nhập bằng Google thành công')
      navigate(PATHS.DASHBOARD, { replace: true })
    } catch (err) {
      message.error(err.message || 'Đăng nhập Google thất bại, vui lòng thử lại')
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (window.google && clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            handleGoogleCredential(response.credential)
          }
        },
      })
    }
  }, [])

  const onGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (window.google && clientId) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap prompt is blocked or skipped, fallback to mock prompt in dev or log it
          console.log('One Tap prompt is skipped/blocked, rendering mock or alert')
          fallbackPrompt()
        }
      })
    } else {
      fallbackPrompt()
    }
  }

  const fallbackPrompt = () => {
    const mockEmail = window.prompt(
      'Vui lòng nhập Email Google để giả lập đăng nhập (Chế độ DEV):',
      'google-test@gmail.com'
    )
    if (mockEmail) {
      if (!mockEmail.includes('@')) {
        message.error('Email không hợp lệ')
        return
      }
      handleGoogleCredential(`mock-google-token-${mockEmail.trim().toLowerCase()}`)
    }
  }

  return (
    <div className="mt-8">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-pink" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-surface-container-lowest text-on-surface-variant text-caption">
            Hoặc tiếp tục với
          </span>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onGoogleClick}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-border-pink bg-white text-on-surface text-label-md hover:bg-surface-soft transition-colors shadow-sm cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
      </div>
    </div>
  )
}
