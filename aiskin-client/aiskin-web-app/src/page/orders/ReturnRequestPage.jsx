import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import ProtectedImage from '@/components/common/ProtectedImage'
import { App as AntApp, InputNumber } from 'antd'
import { resolveImageUrl } from '@/page/products/productUtils'
import httpClient from '@/api/httpClient'
import { API_BASE_URL } from '@/config/api'
import { tokenStorage } from '@/api/tokenStorage'
import { productApi } from '@/api/productApi'

function returnItemKey(item) {
  return [item.productId, item.variantId || '', item.sku || '', item.unit || ''].join('::')
}

// Loại vấn đề & cấu hình chi tiết từng loại
const CLAIM_TYPES = [
  {
    value: 'RETURN',
    icon: 'assignment_return',
    title: 'Hàng lỗi / Hư hỏng',
    description: 'Sản phẩm không hoạt động, bị hỏng, khác mô tả hoặc bạn muốn đổi trả.',
    color: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    selectedColor: 'border-primary bg-primary/5',
    iconColor: 'text-indigo-500',
    reasons: [
      'Hàng lỗi / Không hoạt động',
      'Hàng bị bể vỡ do vận chuyển',
      'Sản phẩm không giống mô tả / hình ảnh',
      'Hàng hết hạn sử dụng',
      'Không ưng ý / Muốn đổi loại khác',
      'Khác',
    ],
    needsItems: true,
    needsImages: true,
    imageHint: 'Chụp ảnh sản phẩm bị hỏng, lỗi, hoặc ảnh so sánh với mô tả',
    itemsLabel: 'Sản phẩm muốn trả lại',
    itemsHint: 'Chọn đúng sản phẩm bị lỗi và số lượng cần trả',
  },
  {
    value: 'MISSING_ITEM',
    icon: 'remove_shopping_cart',
    title: 'Giao thiếu hàng',
    description: 'Bạn nhận được đơn nhưng thiếu sản phẩm so với số lượng đã đặt.',
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    selectedColor: 'border-amber-500 bg-amber-50',
    iconColor: 'text-amber-500',
    reasons: [
      'Thiếu sản phẩm trong đơn',
      'Thiếu phụ kiện đi kèm (hộp, quà tặng...)',
      'Nhận được hàng nhưng số lượng ít hơn đặt',
    ],
    needsItems: true,
    needsImages: true,
    imageHint: 'Chụp ảnh toàn bộ đơn hàng nhận được (kiện hàng, sản phẩm bên trong) để làm bằng chứng',
    itemsLabel: 'Sản phẩm bị thiếu',
    itemsHint: 'Chọn những sản phẩm bạn CHƯA nhận được',
  },
  {
    value: 'WRONG_ITEM',
    icon: 'swap_horiz',
    title: 'Giao sai hàng',
    description: 'Bạn nhận được sản phẩm không đúng với sản phẩm đã đặt mua.',
    color: 'border-orange-200 bg-orange-50 text-orange-700',
    selectedColor: 'border-orange-500 bg-orange-50',
    iconColor: 'text-orange-500',
    reasons: [
      'Nhận sai sản phẩm hoàn toàn',
      'Sai màu sắc / kích cỡ / mùi hương',
      'Nhận được hàng của người khác',
    ],
    needsItems: true,
    needsImages: true,
    imageHint: 'Chụp ảnh sản phẩm nhận được cạnh đơn hàng / hóa đơn để chứng minh sai hàng',
    itemsLabel: 'Sản phẩm bị giao sai',
    itemsHint: 'Chọn sản phẩm đã đặt nhưng nhận được hàng không đúng',
  },
]

// Bước wizard
const STEPS = ['Loại vấn đề', 'Chi tiết', 'Bằng chứng', 'Xác nhận']

export default function ReturnRequestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  const [order, setOrder] = useState(null)
  const [returnItems, setReturnItems] = useState({})
  const [loading, setLoading] = useState(false)

  // Wizard step: 0=loại vấn đề, 1=chi tiết, 2=bằng chứng, 3=xác nhận
  const [step, setStep] = useState(0)

  // Form state
  const [claimType, setClaimType] = useState(null)   // 'RETURN' | 'MISSING_ITEM' | 'WRONG_ITEM'
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState(null)
  const [wrongItem, setWrongItem] = useState(null)
  const [catalogProducts, setCatalogProducts] = useState([])
  const [wrongProductDetail, setWrongProductDetail] = useState(null)
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)

  // Edit mode
  const queryParams = new URLSearchParams(window.location.search)
  const isEdit = queryParams.get('edit') === 'true'
  const [existingReturnId, setExistingReturnId] = useState(null)

  const selectedClaim = CLAIM_TYPES.find(c => c.value === claimType)
  const selectedWrongProduct = wrongProductDetail?.id === wrongItem?.productId
    ? wrongProductDetail
    : catalogProducts.find(product => product.id === wrongItem?.productId)

  useEffect(() => {
    async function loadOrderAndReturn() {
      try {
        const orderData = await httpClient.get(`/orders/${id}`)
        setOrder(orderData)

        if (isEdit) {
          const returnData = await httpClient.get(`/returns/order/${id}`)
          if (returnData) {
            setExistingReturnId(returnData.id)
            setClaimType(returnData.claimType || 'RETURN')
            setResolution(returnData.resolution || null)
            setReason(returnData.reason)
            setDescription(returnData.description)
            setImages(returnData.imageUrls || [])
            setWrongItem(returnData.wrongItems?.[0] || null)

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
            // Edit mode: bắt đầu ở step cuối để review
            setStep(3)
          }
        }
      } catch {
        message.error('Không tìm thấy thông tin đơn hàng')
        navigate('/orders')
      }
    }
    loadOrderAndReturn()
  }, [id, isEdit, message, navigate])

  useEffect(() => {
    if (claimType !== 'WRONG_ITEM' || catalogProducts.length > 0) return
    productApi.listActiveProducts()
      .then(result => {
        const products = Array.isArray(result) ? result : (result?.content || result?.data || [])
        setCatalogProducts(products)
      })
      .catch(() => message.error('Không thể tải danh sách sản phẩm để xác định hàng giao sai'))
  }, [claimType, catalogProducts.length, message])

  useEffect(() => {
    if (claimType !== 'WRONG_ITEM' || !wrongItem?.productId
        || wrongProductDetail?.id === wrongItem.productId) return
    productApi.getProduct(wrongItem.productId)
      .then(setWrongProductDetail)
      .catch(() => setWrongProductDetail(null))
  }, [claimType, wrongItem?.productId, wrongProductDetail?.id])

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    if (images.length + files.length > 5) {
      message.error('Chỉ được đính kèm tối đa 5 ảnh')
      e.target.value = ''
      return
    }
    if (files.some(file => !['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
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
        const res = await fetch(`${API_BASE_URL}/orders/uploads`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${tokenStorage.getAccessToken()}` },
          body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        const url = await res.text()
        uploadedUrls.push(url)
      }
      setImages(prev => [...prev, ...uploadedUrls])
      e.target.value = ''
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

  // Validate từng bước
  const canGoNextStep0 = !!claimType
  const selectedItemsCount = Object.values(returnItems).filter(q => q > 0).length
  const hasWrongItem = claimType !== 'WRONG_ITEM'
    || (wrongItem?.productId && wrongItem?.variantId && Number(wrongItem?.quantity) > 0)
  const canGoNextStep1 = selectedItemsCount > 0 && reason.trim() !== ''
    && description.trim().length >= 20 && !!resolution && hasWrongItem
  const canGoNextStep2 = images.length >= 1
  
  const validateStep = (targetStep) => {
    if (targetStep > 0 && !canGoNextStep0) {
      message.warning('Vui lòng chọn loại vấn đề trước')
      return false
    }
    if (targetStep > 1 && !canGoNextStep1) {
      if (selectedItemsCount === 0) message.warning('Vui lòng chọn ít nhất 1 sản phẩm')
      else if (!reason) message.warning('Vui lòng chọn lý do cụ thể')
      else if (!resolution) message.warning('Vui lòng chọn hoàn tiền hoặc giao lại')
      else if (!hasWrongItem) message.warning('Vui lòng xác định sản phẩm thực tế đã nhận sai')
      else message.warning('Mô tả chi tiết cần ít nhất 20 ký tự')
      return false
    }
    if (targetStep > 2 && !canGoNextStep2) {
      message.warning('Vui lòng cung cấp ít nhất 1 hình ảnh bằng chứng')
      return false
    }
    return true
  }

  const goToStep = (target) => {
    if (target > step && !validateStep(target)) return
    setStep(target)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    const itemsPayload = Object.entries(returnItems)
      .filter(([, qty]) => qty > 0)
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

    try {
      setLoading(true)
      const wrongItems = claimType === 'WRONG_ITEM' && wrongItem ? [wrongItem] : []
      const payload = { claimType, resolution, reason, description, imageUrls: images, items: itemsPayload, wrongItems }

      if (isEdit && existingReturnId) {
        await httpClient.put(`/returns/${existingReturnId}`, payload)
        message.success('Đã cập nhật yêu cầu khiếu nại')
      } else {
        await httpClient.post(`/returns/order/${id}`, payload)
        message.success('Đã gửi yêu cầu khiếu nại thành công!')
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(`/orders/${id}`)}
          aria-label="Quay lại chi tiết đơn hàng"
          className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Icon name="arrow_back" className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-950">
            {isEdit ? 'Chỉnh sửa khiếu nại' : 'Yêu cầu khiếu nại / Trả hàng'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Đơn hàng {order.orderCode}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-0">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              className={`flex flex-col items-center gap-1 ${index < step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                index < step
                  ? 'bg-primary text-white'
                  : index === step
                  ? 'bg-primary text-white ring-4 ring-primary/20'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {index < step ? <Icon name="check" className="text-base" /> : index + 1}
              </div>
              <span className={`hidden sm:block text-xs font-medium ${index === step ? 'text-primary' : index < step ? 'text-gray-700' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-1rem] sm:mt-[-1.5rem] transition-all ${index < step ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── BƯỚC 0: Chọn loại vấn đề ── */}
        {step === 0 && (
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-950 mb-1">Vấn đề bạn gặp phải là gì?</h2>
            <p className="text-sm text-gray-500 mb-6">Chọn đúng loại vấn đề giúp chúng tôi xử lý nhanh hơn cho bạn.</p>

            <div className="space-y-3">
              {CLAIM_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setClaimType(ct.value)}
                  className={`w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    claimType === ct.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    claimType === ct.value ? 'bg-primary text-white' : `${ct.color}`
                  }`}>
                    <Icon name={ct.icon} className="text-2xl" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-950">{ct.title}</p>
                      {claimType === ct.value && (
                        <Icon name="check_circle" className="text-primary text-xl" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">{ct.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Lưu ý:</span> Chọn đúng loại vấn đề giúp đội ngũ của chúng tôi xử lý yêu cầu nhanh và chính xác nhất cho bạn. Bạn có thể chỉnh sửa lại nếu cần.
              </p>
            </div>
          </div>
        )}

        {/* ── BƯỚC 1: Chi tiết sản phẩm & lý do ── */}
        {step === 1 && selectedClaim && (
          <div className="p-6 md:p-8 space-y-6">
            {/* Header loại vấn đề đã chọn */}
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${selectedClaim.color}`}>
              <Icon name={selectedClaim.icon} className="text-2xl shrink-0" />
              <div>
                <p className="font-bold">{selectedClaim.title}</p>
                <p className="text-xs mt-0.5 opacity-80">{selectedClaim.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="ml-auto text-xs underline opacity-70 hover:opacity-100 whitespace-nowrap"
              >
                Đổi loại
              </button>
            </div>

            {/* Chọn sản phẩm */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900">
                  {selectedClaim.itemsLabel} <span className="text-rose-500">*</span>
                </label>
                {selectedItemsCount > 0 && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                    Đã chọn {selectedItemsCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">{selectedClaim.itemsHint}</p>

              <div className="space-y-3">
                {order.items?.map(item => {
                  const key = returnItemKey(item)
                  const maxQty = item.quantity
                  const currentQty = returnItems[key] || 0
                  const isSelected = currentQty > 0

                  return (
                    <div
                      key={key}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImageUrl(item.imageUrl)}
                          alt={item.productName}
                          loading="lazy"
                          className="h-14 w-14 shrink-0 rounded-lg border border-gray-100 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-950 line-clamp-1">{item.productName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.unit} · Đã mua: {maxQty}</p>
                          <p className="text-sm font-bold text-primary mt-1">
                            {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-xs font-semibold text-gray-600">Số lượng khiếu nại:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReturnItems(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border font-bold transition-colors ${currentQty > 0 ? 'border-primary bg-primary text-white hover:bg-primary/80' : 'border-gray-200 text-gray-300'}`}
                            disabled={currentQty === 0}
                          >
                            <Icon name="remove" className="text-base" />
                          </button>
                          <span className={`min-w-8 text-center text-sm font-bold ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setReturnItems(prev => ({ ...prev, [key]: Math.min(maxQty, (prev[key] || 0) + 1) }))}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border font-bold transition-colors ${currentQty < maxQty ? 'border-primary bg-primary text-white hover:bg-primary/80' : 'border-gray-200 text-gray-300'}`}
                            disabled={currentQty >= maxQty}
                          >
                            <Icon name="add" className="text-base" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedItemsCount === 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
                  <Icon name="error" className="text-sm" />
                  Cần chọn ít nhất 1 sản phẩm
                </div>
              )}
            </div>

            {claimType === 'WRONG_ITEM' && (
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50/40 p-4">
                <label className="block text-sm font-bold text-gray-900">
                  Sản phẩm thực tế bạn đã nhận nhầm <span className="text-rose-500">*</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Thông tin này giúp kho nhập lại đúng sản phẩm, không cộng nhầm vào món bạn đã đặt.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <select
                    value={wrongItem?.productId || ''}
                    onChange={async event => {
                      const product = catalogProducts.find(item => item.id === event.target.value)
                      if (!product) {
                        setWrongProductDetail(null)
                        setWrongItem(null)
                        return
                      }
                      try {
                        const detail = await productApi.getProduct(product.id)
                        const variant = detail?.variants?.[0]
                        setWrongProductDetail(detail)
                        setWrongItem({
                          productId: product.id,
                          variantId: variant?.id || '',
                          sku: variant?.sku || '',
                          productName: product.name,
                          variantName: variant?.name || variant?.unit || '',
                          quantity: 1,
                        })
                      } catch {
                        message.error('Không thể tải biến thể của sản phẩm đã nhận nhầm')
                      }
                    }}
                    className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Chọn sản phẩm đã nhận nhầm</option>
                    {catalogProducts.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  <select
                    value={wrongItem?.variantId || ''}
                    disabled={!selectedWrongProduct}
                    onChange={event => {
                      const variant = selectedWrongProduct?.variants?.find(item => item.id === event.target.value)
                      setWrongItem(previous => previous ? {
                        ...previous,
                        variantId: variant?.id || '',
                        sku: variant?.sku || '',
                        variantName: variant?.name || variant?.unit || '',
                      } : previous)
                    }}
                    className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-primary disabled:bg-gray-100"
                  >
                    <option value="">Chọn biến thể/SKU</option>
                    {selectedWrongProduct?.variants?.map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.name || variant.unit || variant.sku} {variant.sku ? `· ${variant.sku}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {wrongItem && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Số lượng thực tế nhận sai</span>
                    <InputNumber
                      min={1}
                      max={20}
                      value={wrongItem.quantity}
                      onChange={value => setWrongItem(previous => ({ ...previous, quantity: value || 1 }))}
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Bạn muốn SkinGuide xử lý như thế nào? <span className="text-rose-500">*</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: 'REFUND',
                    icon: 'payments',
                    title: 'Hoàn tiền',
                    description: 'Sau khi yêu cầu đủ điều kiện, bạn sẽ cung cấp tài khoản nhận tiền.',
                  },
                  {
                    value: 'REDELIVER',
                    icon: 'local_shipping',
                    title: claimType === 'MISSING_ITEM' ? 'Giao bù hàng thiếu' : 'Giao lại sản phẩm đúng',
                    description: 'SkinGuide chịu toàn bộ phí vận chuyển phát sinh.',
                  },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setResolution(option.value)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      resolution === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-950">
                      <Icon name={option.icon} className={resolution === option.value ? 'text-primary' : 'text-gray-500'} />
                      {option.title}
                      {resolution === option.value && <Icon name="check_circle" className="ml-auto text-primary" />}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Lý do cụ thể */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Lý do cụ thể <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {selectedClaim.reasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                      reason === r
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${reason === r ? 'border-primary' : 'border-gray-300'}`}>
                      {reason === r && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    {r}
                  </button>
                ))}
              </div>
              {!reason && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
                  <Icon name="error" className="text-sm" />
                  Vui lòng chọn lý do
                </div>
              )}
            </div>

            {/* Mô tả chi tiết */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-900">
                  Mô tả chi tiết <span className="text-rose-500">*</span>
                </label>
                <span className={`text-xs font-semibold ${description.length < 20 ? 'text-rose-500' : 'text-gray-400'}`}>
                  {description.length}/1000
                </span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder={
                  claimType === 'MISSING_ITEM'
                    ? 'Mô tả chi tiết: đơn hàng thiếu gì, nhận được bao nhiêu sp, kiện hàng có bị mở không...'
                    : claimType === 'WRONG_ITEM'
                    ? 'Mô tả chi tiết: bạn đã đặt sản phẩm gì, thực tế nhận được gì (màu sắc, mùi, tên sp...)'
                    : 'Mô tả chi tiết vấn đề: sản phẩm bị lỗi như thế nào, khi nào phát hiện, đã sử dụng chưa...'
                }
                className={`w-full resize-none rounded-xl border-2 p-4 text-sm outline-none transition-all ${
                  description.length < 20 && description.length > 0
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary'
                }`}
              />
              {description.length > 0 && description.length < 20 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-500">
                  <Icon name="error" className="text-sm" />
                  Cần ít nhất 20 ký tự để mô tả rõ vấn đề
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BƯỚC 2: Hình ảnh bằng chứng ── */}
        {step === 2 && selectedClaim && (
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-950 mb-1">Hình ảnh bằng chứng</h2>
              <p className="text-sm text-gray-500">Ảnh rõ ràng giúp chúng tôi xử lý nhanh hơn cho bạn.</p>
            </div>

            {/* Hướng dẫn chụp ảnh theo loại */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold flex items-center gap-2 mb-2">
                <Icon name="photo_camera" className="text-base" />
                Hướng dẫn chụp ảnh cho yêu cầu "{selectedClaim.title}":
              </p>
              <p className="leading-relaxed">{selectedClaim.imageHint}</p>
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-amber-700">
                <li>Ảnh rõ nét, đủ sáng, không bị mờ</li>
                <li>Có thể chụp nhiều góc khác nhau</li>
                <li>Không chỉnh sửa hoặc photoshop ảnh</li>
              </ul>
            </div>

            {/* Upload ảnh */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-900">
                  Ảnh bằng chứng <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-gray-500">{images.length}/5 ảnh</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {images.map((url, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-gray-200">
                    <ProtectedImage source={url} alt={`Bằng chứng ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      aria-label={`Xóa ảnh ${idx + 1}`}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 rounded-xl"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-white">
                        <Icon name="delete" className="text-xl" />
                      </div>
                    </button>
                    <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-bold text-white">
                      {idx + 1}
                    </div>
                  </div>
                ))}

                {images.length < 5 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-all hover:border-primary hover:bg-primary/5 hover:text-primary">
                    {uploading ? (
                      <>
                        <div className="h-7 w-7 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                        <span className="text-xs font-medium">Đang tải...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="add_photo_alternate" className="text-3xl" />
                        <span className="text-xs font-medium text-center px-2">Thêm ảnh</span>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {images.length === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500">
                  <Icon name="error" className="text-sm" />
                  Cần ít nhất 1 hình ảnh bằng chứng
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Hỗ trợ JPG, PNG · Tối đa 5 MB/ảnh</p>
            </div>
          </div>
        )}

        {/* ── BƯỚC 3: Xác nhận ── */}
        {step === 3 && selectedClaim && (
          <div className="p-6 md:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-950 mb-1">Xác nhận thông tin</h2>
              <p className="text-sm text-gray-500">Kiểm tra lại trước khi gửi. Bạn có thể quay lại để chỉnh sửa.</p>
            </div>

            {/* Loại vấn đề */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide">Loại vấn đề</p>
                <button type="button" onClick={() => setStep(0)} className="text-xs font-semibold text-primary hover:underline">Sửa</button>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${selectedClaim.color}`}>
                <Icon name={selectedClaim.icon} className="text-base" />
                {selectedClaim.title}
              </div>
            </div>

            {/* Sản phẩm */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide">{selectedClaim.itemsLabel}</p>
                <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-primary hover:underline">Sửa</button>
              </div>
              <div className="space-y-2">
                {Object.entries(returnItems)
                  .filter(([, qty]) => qty > 0)
                  .map(([key, qty]) => {
                    const item = order.items?.find(oi => returnItemKey(oi) === key)
                    if (!item) return null
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className="h-10 w-10 rounded-lg border border-gray-100 object-cover" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-950 line-clamp-1">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.unit}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-950">×{qty}</span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {claimType === 'WRONG_ITEM' && wrongItem && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Hàng thực tế nhận nhầm</p>
                <p className="mt-2 text-sm font-bold text-orange-950">{wrongItem.productName}</p>
                <p className="text-xs text-orange-700">
                  {wrongItem.variantName || wrongItem.sku} · Số lượng {wrongItem.quantity}
                </p>
              </div>
            )}

            <div className={`rounded-xl border p-4 ${
              resolution === 'REFUND'
                ? 'border-teal-200 bg-teal-50'
                : 'border-indigo-200 bg-indigo-50'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Phương án bạn yêu cầu</p>
              <p className="mt-2 flex items-center gap-2 font-bold">
                <Icon name={resolution === 'REFUND' ? 'payments' : 'local_shipping'} />
                {resolution === 'REFUND'
                  ? 'Hoàn tiền'
                  : claimType === 'MISSING_ITEM' ? 'Giao bù hàng thiếu' : 'Giao lại sản phẩm đúng'}
              </p>
              <p className="mt-1 text-xs opacity-80">SkinGuide chịu toàn bộ phí vận chuyển phát sinh.</p>
            </div>

            {/* Lý do & mô tả */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide">Lý do & Mô tả</p>
                <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-primary hover:underline">Sửa</button>
              </div>
              <p className="text-sm font-semibold text-gray-950">{reason}</p>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{description}</p>
            </div>

            {/* Ảnh bằng chứng */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase text-gray-400 tracking-wide">Hình ảnh bằng chứng ({images.length})</p>
                <button type="button" onClick={() => setStep(2)} className="text-xs font-semibold text-primary hover:underline">Sửa</button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {images.map((url, idx) => (
                  <div key={idx} className="aspect-square overflow-hidden rounded-lg border border-gray-100">
                    <ProtectedImage source={url} alt={`Bằng chứng ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Cam kết */}
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-semibold flex items-center gap-1.5">
                <Icon name="gavel" className="text-base" />
                Cam kết thông tin trung thực
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Bằng cách gửi yêu cầu này, bạn xác nhận rằng tất cả thông tin và hình ảnh cung cấp là trung thực và chính xác. Việc cung cấp thông tin sai sự thật có thể dẫn đến từ chối yêu cầu và khóa tài khoản.
              </p>
            </div>
          </div>
        )}

        {/* ── Nút điều hướng ── */}
        <div className="border-t border-gray-100 bg-gray-50 p-5 flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <Icon name="arrow_back" className="text-base" />
              Quay lại
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/orders/${id}`)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Hủy bỏ
            </button>
          )}

          <div className="flex-1" />

          {step < 3 ? (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              disabled={
                (step === 0 && !canGoNextStep0) ||
                (step === 1 && !canGoNextStep1) ||
                (step === 2 && !canGoNextStep2)
              }
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Tiếp theo
              <Icon name="arrow_forward" className="text-base" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || uploading}
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Icon name={isEdit ? 'save' : 'send'} className="text-base" />
              )}
              {isEdit ? 'Lưu thay đổi' : 'Gửi yêu cầu khiếu nại'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
