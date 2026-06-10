import { useState } from 'react'
import { Form, Input, Button, App as AntApp } from 'antd'
import { MailOutlined, LockOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import Logo from '@/components/common/Logo'
import AuthBranding from './components/AuthBranding'
import { PATHS } from '@/route/paths'
import { authApi } from '@/api/authApi'

/**
 * Quên mật khẩu - luồng 2 bước:
 *  1) Nhập email -> nhận OTP (mock email; dev trả OTP về để test).
 *  2) Nhập OTP + mật khẩu mới -> đặt lại.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const requestOtp = async (values) => {
    setLoading(true)
    try {
      const res = await authApi.forgotPassword(values.email)
      setEmail(values.email)
      setStep(2)
      // Dev: backend trả devOtp để tiện test khi chưa gắn email thật.
      if (res?.devOtp) {
        message.info(`Mã OTP (dev): ${res.devOtp}`, 8)
      } else {
        message.success('Đã gửi mã OTP tới email của bạn')
      }
    } catch (err) {
      message.error(err.message || 'Không gửi được mã, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (values) => {
    setLoading(true)
    try {
      await authApi.resetPassword({ email, otp: values.otp, newPassword: values.newPassword })
      message.success('Đặt lại mật khẩu thành công, vui lòng đăng nhập')
      navigate(PATHS.LOGIN, { replace: true })
    } catch (err) {
      if (err.status === 400) {
        message.error('Mã OTP không đúng hoặc đã hết hạn')
      } else {
        message.error(err.message || 'Đặt lại mật khẩu thất bại')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-surface-soft">
      <AuthBranding />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-surface-container-lowest relative overflow-y-auto">
        <div className="lg:hidden absolute top-8 left-8">
          <Logo layout="inline" size={36} />
        </div>

        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => navigate(PATHS.LOGIN)}
            className="flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary transition-colors mb-6"
          >
            <ArrowLeftOutlined /> Quay lại đăng nhập
          </button>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-headline-lg-mobile lg:text-headline-lg text-on-surface mb-2">
              {step === 1 ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {step === 1
                ? 'Nhập email để nhận mã xác thực đặt lại mật khẩu.'
                : `Nhập mã OTP đã gửi tới ${email} và mật khẩu mới.`}
            </p>
          </div>

          {step === 1 ? (
            <Form layout="vertical" requiredMark={false} onFinish={requestOtp}>
              <Form.Item
                label={<span className="text-label-md text-on-surface">Email</span>}
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email' },
                  { type: 'email', message: 'Email không hợp lệ' },
                ]}
              >
                <Input size="large" prefix={<MailOutlined className="text-outline" />} placeholder="ten@example.com" />
              </Form.Item>
              <Button
                htmlType="submit"
                block
                size="large"
                loading={loading}
                className="!h-12 !rounded-full !border-0 gradient-bg !text-white !font-semibold shadow-ambient-pink"
              >
                Gửi mã xác thực
              </Button>
            </Form>
          ) : (
            <Form layout="vertical" requiredMark={false} onFinish={resetPassword}>
              <Form.Item
                label={<span className="text-label-md text-on-surface">Mã OTP</span>}
                name="otp"
                rules={[{ required: true, message: 'Vui lòng nhập mã OTP' }]}
              >
                <Input size="large" prefix={<SafetyOutlined className="text-outline" />} placeholder="123456" />
              </Form.Item>
              <Form.Item
                label={<span className="text-label-md text-on-surface">Mật khẩu mới</span>}
                name="newPassword"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 8, message: 'Tối thiểu 8 ký tự' },
                ]}
              >
                <Input.Password size="large" prefix={<LockOutlined className="text-outline" />} placeholder="••••••••" />
              </Form.Item>
              <Button
                htmlType="submit"
                block
                size="large"
                loading={loading}
                className="!h-12 !rounded-full !border-0 gradient-bg !text-white !font-semibold shadow-ambient-pink"
              >
                Đặt lại mật khẩu
              </Button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full mt-4 text-caption text-primary hover:text-tertiary transition-colors"
              >
                Gửi lại mã
              </button>
            </Form>
          )}
        </div>
      </div>
    </div>
  )
}
