import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/route/paths'
import Logo from '@/components/common/Logo'
import AuthBranding from './components/AuthBranding'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import SocialButtons from './components/SocialButtons'

/**
 * Trang xác thực dùng chung cho Login & Register.
 * Prop `mode` quyết định form hiển thị; tab điều hướng giữa /login và /register.
 */
export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const isLogin = mode === 'login'

  return (
    <div className="flex w-full h-screen overflow-hidden bg-surface-soft">
      <AuthBranding />

      {/* Form column */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface-container-lowest relative overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-8 left-8">
          <Logo layout="inline" size={36} />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-headline-lg-mobile lg:text-headline-lg text-on-surface mb-2">
              {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {isLogin ? 'Vui lòng nhập thông tin để đăng nhập.' : 'Bắt đầu hành trình chăm sóc da cá nhân hóa.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-surface-container-low rounded-xl mb-8 border border-border-pink/50">
            <button
              type="button"
              onClick={() => navigate(PATHS.LOGIN)}
              className={[
                'flex-1 py-2 px-4 rounded-lg text-label-md transition-all',
                isLogin ? 'bg-white shadow-sm text-primary font-semibold' : 'text-on-surface-variant hover:text-primary',
              ].join(' ')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => navigate(PATHS.REGISTER)}
              className={[
                'flex-1 py-2 px-4 rounded-lg text-label-md transition-all',
                !isLogin ? 'bg-white shadow-sm text-primary font-semibold' : 'text-on-surface-variant hover:text-primary',
              ].join(' ')}
            >
              Đăng ký
            </button>
          </div>

          {isLogin ? <LoginForm /> : <RegisterForm />}

          <p className="mt-8 text-center text-body-md text-on-surface-variant">
            {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              type="button"
              onClick={() => navigate(isLogin ? PATHS.REGISTER : PATHS.LOGIN)}
              className="text-label-md text-primary font-semibold hover:text-tertiary transition-colors"
            >
              {isLogin ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
