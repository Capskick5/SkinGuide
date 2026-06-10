import { useEffect } from 'react'
import { Modal, Form, Input, Select, Switch, App as AntApp } from 'antd'
import { useAuth } from '@/hook/useAuth'

const SKIN_TYPES = [
  { value: 'normal', label: 'Da thường' },
  { value: 'oily', label: 'Da dầu' },
  { value: 'dry', label: 'Da khô' },
  { value: 'combination', label: 'Da hỗn hợp' },
  { value: 'sensitive', label: 'Da nhạy cảm' },
]

const GENDERS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

const CONCERN_OPTIONS = ['acne', 'dark_spots', 'wrinkles', 'pores', 'redness', 'oiliness', 'dryness']

/**
 * Modal chỉnh sửa hồ sơ: tên + hồ sơ da (loại da, giới tính, vấn đề, da nhạy cảm).
 * Gọi PUT /api/users/me qua AuthContext.updateProfile.
 */
export default function EditProfileModal({ open, onClose }) {
  const { user, updateProfile } = useAuth()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm()

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        fullName: user.fullName,
        skinType: user.skinProfile?.skinType,
        gender: user.skinProfile?.gender,
        currentConcerns: user.skinProfile?.currentConcerns || [],
        allergies: user.skinProfile?.allergies || [],
        sensitiveSkin: user.skinProfile?.sensitiveSkin || false,
      })
    }
  }, [open, user, form])

  const handleOk = async () => {
    const values = await form.validateFields()
    try {
      await updateProfile({
        fullName: values.fullName,
        skinProfile: {
          skinType: values.skinType || null,
          gender: values.gender || null,
          currentConcerns: values.currentConcerns || [],
          allergies: values.allergies || [],
          sensitiveSkin: !!values.sensitiveSkin,
        },
      })
      message.success('Cập nhật hồ sơ thành công')
      onClose()
    } catch (err) {
      message.error(err.message || 'Cập nhật thất bại')
    }
  }

  return (
    <Modal
      title="Chỉnh sửa hồ sơ"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Lưu"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} className="mt-4">
        <Form.Item label="Họ và tên" name="fullName">
          <Input size="large" placeholder="Nguyễn Văn A" />
        </Form.Item>
        <Form.Item label="Loại da" name="skinType">
          <Select size="large" allowClear options={SKIN_TYPES} placeholder="Chọn loại da" />
        </Form.Item>
        <Form.Item label="Giới tính" name="gender">
          <Select size="large" allowClear options={GENDERS} placeholder="Chọn giới tính" />
        </Form.Item>
        <Form.Item label="Vấn đề quan tâm" name="currentConcerns">
          <Select
            size="large"
            mode="tags"
            allowClear
            options={CONCERN_OPTIONS.map((c) => ({ value: c, label: c }))}
            placeholder="Vd: acne, dark_spots"
          />
        </Form.Item>
        <Form.Item label="Dị ứng thành phần" name="allergies">
          <Select size="large" mode="tags" allowClear placeholder="Vd: fragrance, alcohol" />
        </Form.Item>
        <Form.Item label="Da nhạy cảm" name="sensitiveSkin" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  )
}
