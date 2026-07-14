import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import ProtectedImage from '@/components/common/ProtectedImage'
import { App as AntApp, Select, InputNumber } from 'antd'
import { resolveImageUrl } from '@/page/products/productUtils'
import httpClient from '@/api/httpClient'
import { API_BASE_URL } from '@/config/api'
import { tokenStorage } from '@/api/tokenStorage'

function returnItemKey(item) {
  return [item.productId, item.variantId || '', item.sku || '', item.unit || ''].join('::')
}

export default function ReturnRequestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  
  const [order, setOrder] = useState(null)
  const [returnItems, setReturnItems] = useState({}) // { [productId_unit]: quantity }
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('Hàng lỗi / Không hoạt động')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  
  // Edit mode variables
  const queryParams = new URLSearchParams(window.location.search)
  const isEdit = queryParams.get('edit') === 'true'
  const [existingReturnId, setExistingReturnId] = useState(null)

  const REASONS = [
    'Hàng lỗi / Không hoạt động',
    'Giao sai sản phẩm',
    'Thiếu sản phẩm / phụ kiện',
    'Hàng bị bể vỡ do vận chuyển',
    'Sản phẩm không giống mô tả',
    'Khác'
  ]

  useEffect(() => {
    async function loadOrderAndReturn() {
      try {
        const orderData = await httpClient.get(`/orders/${id}`)
        setOrder(orderData)

        if (isEdit) {
          const returnData = await httpClient.get(`/returns/order/${id}`)
          if (returnData) {
            setExistingReturnId(returnData.id)
            setReason(returnData.reason)
            setDescription(returnData.description)
            setImages(returnData.imageUrls || [])
            
            const itemsObj = {}
            returnData.items?.forEach(i => {
              const originalItem = orderData.items?.find(item =>
                item.productId === i.productId && (
                  (i.variantId && item.variantId === i.variantId) ||
                  (i.sku && item.sku === i.sku) ||
                  (!i.variantId && !i.sku && item.unit === i.unit)
                ))
              itemsObj[returnItemKey(originalItem || i)] = i.quantity
            })
            setReturnItems(itemsObj)
          }
        }
      } catch {
        message.error('Không tìm thấy thông tin')
        navigate('/orders')
      }
    }
    loadOrderAndReturn()
  }, [id, isEdit, message, navigate])

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    if (files.some((file) => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      message.error('Chỉ nhận ảnh JPEG/PNG, tối đa 5 MB mỗi ảnh')
      e.target.value = ''
      return
    }

    setUploading(true)
    const uploadedUrls = []

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        // Upload bằng fetch thuần để tránh bị JSON.stringify và mất boundary
        const res = await fetch(`${API_BASE_URL}/orders/uploads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenStorage.getAccessToken()}`
          },
          body: formData
        })
        
        if (!res.ok) throw new Error('Upload failed')
        const url = await res.text()
        uploadedUrls.push(url) 
      }
      setImages(prev => [...prev, ...uploadedUrls])
    } catch (err) {
      console.error(err)
      message.error('Lỗi khi tải ảnh lên')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!description.trim()) {
      return message.error('Vui lòng nhập mô tả chi tiết')
    }
    if (images.length === 0) {
      return message.error('Vui lòng cung cấp ít nhất 1 hình ảnh bằng chứng')
    }

    const itemsPayload = Object.entries(returnItems)
      .filter((entry) => entry[1] > 0)
      .map(([key, qty]) => {
        const item = order.items?.find(orderItem => returnItemKey(orderItem) === key)
        return item ? {
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          unit: item.unit,
          quantity: qty,
        } : null
      })
      .filter(Boolean)

    if (itemsPayload.length === 0) {
      return message.error('Vui lòng chọn ít nhất 1 sản phẩm để trả lại')
    }

    try {
      setLoading(true)
      const payload = {
        reason,
        description,
        imageUrls: images,
        items: itemsPayload
      }
      
      if (isEdit && existingReturnId) {
        await httpClient.put(`/returns/${existingReturnId}`, payload)
        message.success('Đã cập nhật yêu cầu khiếu nại')
      } else {
        await httpClient.post(`/returns/order/${id}`, payload)
        message.success('Đã gửi yêu cầu khiếu nại thành công')
      }
      
      navigate(`/orders/${id}`)
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo khiếu nại')
    } finally {
      setLoading(false)
    }
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center py-20">
        <Icon name="hourglass_empty" className="text-4xl text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(`/orders/${id}`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors"
        >
          <Icon name="arrow_back" className="text-on-surface" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">{isEdit ? 'Chỉnh sửa Khiếu nại / Trả hàng' : 'Yêu cầu Khiếu nại / Trả hàng'}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800">
            <p className="font-semibold mb-1">Mã đơn hàng: {order.orderCode}</p>
            <p className="text-sm">Vui lòng cung cấp đầy đủ thông tin, chọn sản phẩm cần trả và hình ảnh bằng chứng để chúng tôi xử lý nhanh chóng nhất.</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4">Sản phẩm cần trả lại <span className="text-error">*</span></h3>
            <div className="space-y-4">
              {order.items?.map(item => {
                const key = returnItemKey(item)
                const maxQty = item.quantity
                const currentQty = returnItems[key] || 0
                const isSelected = currentQty > 0
                
                return (
                  <div key={key} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
                    <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 line-clamp-1">{item.productName}</h4>
                      <p className="text-sm text-gray-500">{item.unit} • Đã mua: {maxQty}</p>
                      <p className="text-sm font-bold text-primary mt-1">{Number(item.unitPrice).toLocaleString('vi-VN')}đ</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-semibold text-gray-500">Số lượng trả:</span>
                      <InputNumber 
                        min={0} 
                        max={maxQty} 
                        value={currentQty}
                        onChange={(val) => setReturnItems(prev => ({ ...prev, [key]: val || 0 }))}
                        className="w-24"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lý do khiếu nại <span className="text-error">*</span>
              </label>
              <Select 
                value={reason}
                onChange={setReason}
                className="w-full h-12 custom-select"
                options={REASONS.map(r => ({ value: r, label: r }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mô tả chi tiết <span className="text-error">*</span>
              </label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Mô tả rõ vấn đề bạn đang gặp phải (hàng bị xước, hộp rách, lỗi chức năng...)"
                className="w-full p-4 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hình ảnh bằng chứng <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                {images.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl border border-gray-200 overflow-hidden group">
                    <ProtectedImage source={url} alt="Bằng chứng trả hàng" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Icon name="delete" className="text-2xl" />
                    </button>
                  </div>
                ))}
                {images.length < 4 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors bg-gray-50">
                    {uploading ? (
                      <Icon name="hourglass_empty" className="animate-spin text-3xl" />
                    ) : (
                      <>
                        <Icon name="add_photo_alternate" className="text-3xl mb-2" />
                        <span className="text-sm font-medium">Tải ảnh lên</span>
                      </>
                    )}
                    <input type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>
              <p className="text-sm text-gray-500">Tối đa 4 hình ảnh (Hỗ trợ định dạng JPG, PNG)</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:px-8 border-t border-gray-100 bg-gray-50 flex gap-4">
          <button 
            type="button" 
            onClick={() => navigate(`/orders/${id}`)}
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-100 transition-colors bg-white"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="flex-1 py-3.5 rounded-xl bg-primary font-bold text-white hover:bg-tertiary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Icon name="hourglass_empty" className="animate-spin" /> : <Icon name={isEdit ? 'save' : 'send'} />}
            {isEdit ? 'Lưu thay đổi' : 'Gửi yêu cầu khiếu nại'}
          </button>
        </div>
      </div>
    </div>
  )
}
