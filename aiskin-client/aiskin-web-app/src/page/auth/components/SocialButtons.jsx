import { useAuth } from '@/hook/useAuth'
import { useNavigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useEffect, useRef } from 'react'
import { PATHS } from '@/route/paths'

/**
 * Nút đăng nhập bằng mạng xã hội (Google).
 */
export default function SocialButtons() {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const googleButtonRef = useRef(null)

  const handleGoogleCredential = async (credential) => {
    try {
      const loggedUser = await loginWithGoogle(credential)
      message.success('Đăng nhập bằng Google thành công')
      
      const hasAdminAccess = loggedUser?.roles?.some(role => role !== 'USER')
      const dest = hasAdminAccess ? PATHS.ADMIN_DASHBOARD : PATHS.PRODUCTS
      navigate(dest, { replace: true })
    } catch (err) {
      message.error(err.message || 'Đăng nhập Google thất bại, vui lòng thử lại')
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID bị thiếu trong file .env")
      return
    }

    const renderGoogleButton = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              handleGoogleCredential(response.credential)
            }
          },
        })
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: '100%',
          text: 'continue_with'
        })
      }
    }

    if (window.google) {
      renderGoogleButton()
    } else {
      const scriptInterval = setInterval(() => {
        if (window.google) {
          clearInterval(scriptInterval)
          renderGoogleButton()
        }
      }, 100)
      return () => clearInterval(scriptInterval)
    }
  }, [])

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

      <div className="mt-6 flex justify-center w-full">
        <div className="w-full flex justify-center bg-white rounded-full overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border-pink">
          <div ref={googleButtonRef} className="w-full flex justify-center [&>div]:w-full" />
        </div>
      </div>
    </div>
  )
}
