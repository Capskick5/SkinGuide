import { Form, Input, Button, App as AntApp } from 'antd'
import { MailOutlined, LockOutlined, UserOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/route/paths'
import { useAuth } from '@/hook/useAuth'

/**
 * Form đăng ký. Gọi user-service qua AuthContext.
 * Backend hiện chỉ nhận email + password; họ tên giữ cho UX, dùng sau.
 */
export default function RegisterForm() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { message } = AntApp.useApp()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await register({ email: values.email, password: values.password, fullName: values.fullName })
      message.success('Tạo tài khoản thành công')
      navigate(PATHS.PRODUCTS, { replace: true })
    } catch (err) {
      if (err.status === 409) {
        message.error('Email đã được sử dụng')
      } else if (err.fieldErrors) {
        message.error(Object.values(err.fieldErrors)[0] || 'Dữ liệu không hợp lệ')
      } else {
        message.error(err.message || 'Đăng ký thất bại, vui lòng thử lại')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
      <Form.Item
        label={<span className="text-label-md text-on-surface">Họ và tên</span>}
        name="fullName"
        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
      >
        <Input size="large" prefix={<UserOutlined className="text-outline" />} placeholder="Nguyễn Văn A" />
      </Form.Item>

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
        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }, { min: 8, message: 'Tối thiểu 8 ký tự' }]}
      >
        <Input.Password size="large" prefix={<LockOutlined className="text-outline" />} placeholder="••••••••" />
      </Form.Item>

      <Form.Item
        label={<span className="text-label-md text-on-surface">Xác nhận mật khẩu</span>}
        name="confirm"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Vui lòng xác nhận mật khẩu' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) return Promise.resolve()
              return Promise.reject(new Error('Mật khẩu không khớp'))
            },
          }),
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
        icon={<ArrowRightOutlined />}
        iconPosition="end"
      >
        Tạo tài khoản
      </Button>
    </Form>
  )
}
