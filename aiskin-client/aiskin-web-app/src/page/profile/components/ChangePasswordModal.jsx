import { Modal, Form, Input, App as AntApp } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hook/useAuth'
import { PATHS } from '@/route/paths'

/**
 * Modal đổi mật khẩu. Gọi POST /api/users/me/change-password.
 * Backend thu hồi mọi phiên -> sau khi đổi, đăng xuất và yêu cầu đăng nhập lại.
 */
export default function ChangePasswordModal({ open, onClose }) {
  const { changePassword, logout } = useAuth()
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      message.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại')
      form.resetFields()
      onClose()
      await logout()
      navigate(PATHS.LOGIN, { replace: true })
    } catch (err) {
      if (err.status === 400) {
        message.error('Mật khẩu hiện tại không đúng')
      } else {
        message.error(err.message || 'Đổi mật khẩu thất bại')
      }
    }
  }

  return (
    <Modal
      title="Đổi mật khẩu"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      okText="Đổi mật khẩu"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} className="mt-4">
        <Form.Item
          label="Mật khẩu hiện tại"
          name="currentPassword"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
        >
          <Input.Password size="large" placeholder="••••••••" />
        </Form.Item>
        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 8, message: 'Tối thiểu 8 ký tự' },
          ]}
        >
          <Input.Password size="large" placeholder="••••••••" />
        </Form.Item>
        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirm"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                return Promise.reject(new Error('Mật khẩu không khớp'))
              },
            }),
          ]}
        >
          <Input.Password size="large" placeholder="••••••••" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
