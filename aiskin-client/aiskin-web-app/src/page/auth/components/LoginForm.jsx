import { Form, Input, Checkbox, Button, App as AntApp } from 'antd'
import { MailOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PATHS } from '@/route/paths'
import { useAuth } from '@/hook/useAuth'

/**
 * Form đăng nhập. Gọi user-service qua AuthContext.
 * Thành công -> điều hướng về trang trước đó (hoặc Dashboard).
 */
export default function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { message } = AntApp.useApp()
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from?.pathname || PATHS.DASHBOARD

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const loggedUser = await login({ email: values.email, password: values.password })
      message.success('Đăng nhập thành công')
      // Admin → admin dashboard, otherwise → previous page or user dashboard
      const isAdmin = loggedUser?.roles?.includes('ADMIN')
      const dest = isAdmin ? PATHS.ADMIN_DASHBOARD : redirectTo
      navigate(dest, { replace: true })
    } catch (err) {
      if (err.status === 401) {
        message.error('Email hoặc mật khẩu không đúng')
      } else {
        message.error(err.message || 'Đăng nhập thất bại, vui lòng thử lại')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form layout="vertical" requiredMark={false} onFinish={onFinish} className="space-y-2">
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

      <Form.Item
        label={<span className="text-label-md text-on-surface">Mật khẩu</span>}
        name="password"
        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
      >
        <Input.Password size="large" prefix={<LockOutlined className="text-outline" />} placeholder="••••••••" />
      </Form.Item>

      <div className="flex items-center justify-between mb-4">
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox>
            <span className="text-body-md text-on-surface-variant">Ghi nhớ trong 30 ngày</span>
          </Checkbox>
        </Form.Item>
        <button
          type="button"
          onClick={() => navigate(PATHS.FORGOT_PASSWORD)}
          className="text-caption text-primary hover:text-tertiary transition-colors"
        >
          Quên mật khẩu?
        </button>
      </div>

      <Button
        htmlType="submit"
        block
        size="large"
        loading={loading}
        className="!h-12 !rounded-full !border-0 gradient-bg !text-white !font-semibold shadow-ambient-pink"
        icon={<ArrowRightOutlined />}
        iconPosition="end"
      >
        Đăng nhập
      </Button>
    </Form>
  )
}
