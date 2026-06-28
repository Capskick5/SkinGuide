import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'
import { useAuth } from '@/hook/useAuth'
import httpClient from '@/api/httpClient'
import { resolveImageUrl } from '@/page/products/productUtils'

const ADDRESS_API_URL = 'https://provinces.open-api.vn/api'

function money(value) {
  if (!value && value !== 0) return '—'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

/* ─────────────────────────────────────────────
   Stepper
───────────────────────────────────────────── */
function Stepper({ currentStep }) {
  const steps = [
    { num: 1, label: 'Thông tin giao hàng', icon: 'local_shipping' },
    { num: 2, label: 'Phương thức thanh toán', icon: 'payments' },
    { num: 3, label: 'Xác nhận đặt hàng', icon: 'check_circle' },
  ]

  return (
    <div className="flex items-center gap-0 w-full mb-10">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${currentStep > step.num
                ? 'gradient-bg text-white shadow-ambient-pink'
                : currentStep === step.num
                  ? 'gradient-bg text-white shadow-ambient-pink ring-4 ring-primary/20'
                  : 'bg-surface-container-low text-on-surface-variant border border-border-pink'
                }`}
            >
              {currentStep > step.num ? (
                <Icon name="check" className="text-base" />
              ) : (
                <Icon name={step.icon} className="text-base" />
              )}
            </div>
            <span
              className={`text-caption mt-1.5 font-medium text-center ${currentStep >= step.num ? 'text-primary' : 'text-on-surface-variant'
                }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-2 mb-5 rounded transition-all duration-500 ${currentStep > step.num ? 'gradient-bg' : 'bg-border-pink'
                }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function AddressTextField({ icon, label, name, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-body-sm font-semibold text-on-surface mb-2">
        {label} <span className="text-error">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Icon name={icon} className="text-on-surface-variant" />
        </div>
        <input
          required
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border-pink bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface"
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

function AddressSelectField({ icon, label, name, value, onChange, placeholder, options, disabled }) {
  return (
    <div>
      <label className="block text-body-sm font-semibold text-on-surface mb-2">
        {label} <span className="text-error">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
          <Icon name={icon} className="text-on-surface-variant" />
        </div>
        <select
          required
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none pl-12 pr-11 py-3.5 rounded-2xl border border-border-pink bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant"
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Bước 1: Thông tin giao hàng
───────────────────────────────────────────── */
function StepAddress({ formData, onChange, onNext }) {
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])
  const [addressApiError, setAddressApiError] = useState('')
  const [loadingAddress, setLoadingAddress] = useState({
    provinces: false,
    districts: false,
    wards: false,
  })

  useEffect(() => {
    let cancelled = false

    async function loadProvinces() {
      setLoadingAddress((current) => ({ ...current, provinces: true }))
      setAddressApiError('')
      try {
        const response = await fetch(`${ADDRESS_API_URL}/p/`)
        if (!response.ok) throw new Error('Cannot load provinces')
        const data = await response.json()
        if (!cancelled) setProvinces(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setAddressApiError('Không tải được danh sách tỉnh thành. Bạn có thể nhập tay.')
      } finally {
        if (!cancelled) {
          setLoadingAddress((current) => ({ ...current, provinces: false }))
        }
      }
    }

    loadProvinces()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!formData.provinceCode) return
    let cancelled = false

    async function loadDistricts() {
      setLoadingAddress((current) => ({ ...current, districts: true }))
      setAddressApiError('')
      try {
        const response = await fetch(`${ADDRESS_API_URL}/p/${formData.provinceCode}?depth=2`)
        if (!response.ok) throw new Error('Cannot load districts')
        const data = await response.json()
        if (!cancelled) setDistricts(Array.isArray(data.districts) ? data.districts : [])
      } catch {
        if (!cancelled) setAddressApiError('Không tải được danh sách quận huyện. Bạn có thể nhập tay.')
      } finally {
        if (!cancelled) {
          setLoadingAddress((current) => ({ ...current, districts: false }))
        }
      }
    }

    loadDistricts()
    return () => {
      cancelled = true
    }
  }, [formData.provinceCode])

  useEffect(() => {
    if (!formData.districtCode) return
    let cancelled = false

    async function loadWards() {
      setLoadingAddress((current) => ({ ...current, wards: true }))
      setAddressApiError('')
      try {
        const response = await fetch(`${ADDRESS_API_URL}/d/${formData.districtCode}?depth=2`)
        if (!response.ok) throw new Error('Cannot load wards')
        const data = await response.json()
        if (!cancelled) setWards(Array.isArray(data.wards) ? data.wards : [])
      } catch {
        if (!cancelled) setAddressApiError('Không tải được danh sách phường xã. Bạn có thể nhập tay.')
      } finally {
        if (!cancelled) {
          setLoadingAddress((current) => ({ ...current, wards: false }))
        }
      }
    }

    loadWards()
    return () => {
      cancelled = true
    }
  }, [formData.districtCode])

  function emitFormChange(name, value) {
    onChange({ target: { name, value } })
  }

  function handleProvinceChange(event) {
    const code = event.target.value
    const province = provinces.find((item) => String(item.code) === code)
    setDistricts([])
    setWards([])
    emitFormChange('provinceCode', code)
    emitFormChange('city', province?.name || '')
    emitFormChange('districtCode', '')
    emitFormChange('district', '')
    emitFormChange('wardCode', '')
    emitFormChange('ward', '')
  }

  function handleDistrictChange(event) {
    const code = event.target.value
    const district = districts.find((item) => String(item.code) === code)
    setWards([])
    emitFormChange('districtCode', code)
    emitFormChange('district', district?.name || '')
    emitFormChange('wardCode', '')
    emitFormChange('ward', '')
  }

  function handleWardChange(event) {
    const code = event.target.value
    const ward = wards.find((item) => String(item.code) === code)
    emitFormChange('wardCode', code)
    emitFormChange('ward', ward?.name || '')
  }

  function handleSubmit(e) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Họ và tên */}
        <div className="sm:col-span-2">
          <label className="block text-body-sm font-semibold text-on-surface mb-2">
            Họ và tên người nhận <span className="text-error">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Icon name="person" className="text-on-surface-variant" />
            </div>
            <input
              required
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={onChange}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border-pink bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface"
              placeholder="Nguyễn Nhựt Huy"
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div>
          <label className="block text-body-sm font-semibold text-on-surface mb-2">
            Số điện thoại <span className="text-error">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Icon name="phone" className="text-on-surface-variant" />
            </div>
            <input
              required
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={onChange}
              pattern="[0-9]{9,11}"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border-pink bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface"
              placeholder="0901 234 567"
            />
          </div>
        </div>

        {addressApiError ? (
          <>
            <AddressTextField
              icon="location_city"
              label="Tỉnh / Thành phố"
              name="city"
              value={formData.city}
              onChange={onChange}
              placeholder="Hà Nội"
            />
            <AddressTextField
              icon="map"
              label="Quận / Huyện"
              name="district"
              value={formData.district}
              onChange={onChange}
              placeholder="Quận / Huyện"
            />
            <AddressTextField
              icon="pin_drop"
              label="Phường / Xã"
              name="ward"
              value={formData.ward}
              onChange={onChange}
              placeholder="Phường / Xã"
            />
          </>
        ) : (
          <>
            <AddressSelectField
              icon="location_city"
              label="Tỉnh / Thành phố"
              name="provinceCode"
              value={formData.provinceCode}
              onChange={handleProvinceChange}
              disabled={loadingAddress.provinces}
              placeholder={loadingAddress.provinces ? 'Đang tải tỉnh thành...' : 'Chọn tỉnh / thành phố'}
              options={provinces}
            />
            <AddressSelectField
              icon="map"
              label="Quận / Huyện"
              name="districtCode"
              value={formData.districtCode}
              onChange={handleDistrictChange}
              disabled={!formData.provinceCode || loadingAddress.districts}
              placeholder={loadingAddress.districts ? 'Đang tải quận huyện...' : 'Chọn quận / huyện'}
              options={districts}
            />
            <AddressSelectField
              icon="pin_drop"
              label="Phường / Xã"
              name="wardCode"
              value={formData.wardCode}
              onChange={handleWardChange}
              disabled={!formData.districtCode || loadingAddress.wards}
              placeholder={loadingAddress.wards ? 'Đang tải phường xã...' : 'Chọn phường / xã'}
              options={wards}
            />
          </>
        )}

        {/* Địa chỉ chi tiết */}
        <div className="sm:col-span-2">
          <label className="block text-body-sm font-semibold text-on-surface mb-2">
            Địa chỉ chi tiết <span className="text-error">*</span>
          </label>
          <div className="relative">
            <div className="absolute top-4 left-4 pointer-events-none">
              <Icon name="home" className="text-on-surface-variant" />
            </div>
            <textarea
              required
              name="addressDetail"
              value={formData.addressDetail}
              onChange={onChange}
              rows="3"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border-pink bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface resize-none"
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div className="sm:col-span-2">
          <label className="block text-body-sm font-semibold text-on-surface mb-2">
            Ghi chú cho đơn hàng <span className="text-on-surface-variant font-normal">(Tùy chọn)</span>
          </label>
          <div className="relative">
            <div className="absolute top-4 left-4 pointer-events-none">
              <Icon name="note" className="text-on-surface-variant" />
            </div>
            <textarea
              name="note"
              value={formData.note}
              onChange={onChange}
              rows="2"
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border-pink bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface resize-none"
              placeholder="Ví dụ: Gọi điện trước khi giao 30 phút..."
            />
          </div>
        </div>
      </div>

      {addressApiError && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-700">
          <Icon name="info" className="text-lg" />
          {addressApiError}
        </div>
      )}

      <button
        type="submit"
        className="w-full py-4 rounded-2xl gradient-bg text-white font-bold text-body-md shadow-ambient-pink hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
      >
        Tiếp tục
        <Icon name="arrow_forward" className="text-xl" />
      </button>
    </form>
  )
}

/* ─────────────────────────────────────────────
   Bước 2: Chọn thanh toán
───────────────────────────────────────────── */
function StepPayment({ selectedMethod, onSelect, onNext, onBack }) {
  const methods = [
    {
      id: 'MOMO',
      label: 'Ví MoMo',
      desc: 'Thanh toán qua ví điện tử MoMo',
      icon: 'account_balance_wallet',
      gradient: 'from-pink-500 to-rose-500',
      bg: 'bg-pink-50 border-pink-200 hover:border-pink-400',
      selected: 'border-pink-500 bg-pink-50 ring-2 ring-pink-300',
    },
    {
      id: 'COD',
      label: 'Tiền mặt khi nhận (COD)',
      desc: 'Thanh toán cho shipper khi nhận hàng',
      icon: 'payments',
      gradient: 'from-emerald-400 to-teal-500',
      bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
      selected: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300',
    },
  ]

  return (
    <div className="space-y-4">
      {methods.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left ${selectedMethod === m.id ? m.selected : m.bg
            }`}
        >
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shrink-0 shadow-md`}>
            <Icon name={m.icon} className="text-white text-2xl" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-body-md text-on-surface">{m.label}</p>
            <p className="text-caption text-on-surface-variant mt-0.5">{m.desc}</p>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selectedMethod === m.id ? 'border-primary gradient-bg' : 'border-border-pink'
            }`}>
            {selectedMethod === m.id && <Icon name="check" className="text-white text-xs" />}
          </div>
        </button>
      ))}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-2xl border border-border-pink text-on-surface-variant font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="arrow_back" className="text-xl" />
          Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!selectedMethod}
          className="flex-[2] py-4 rounded-2xl gradient-bg text-white font-bold shadow-ambient-pink hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Tiếp tục
          <Icon name="arrow_forward" className="text-xl" />
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Bước 3: Xác nhận
───────────────────────────────────────────── */
function StepConfirm({ formData, paymentMethod, items, totalPrice, onBack, onConfirm, loading }) {
  const payLabel = paymentMethod === 'MOMO' ? 'Ví MoMo' : 'Tiền mặt (COD)'
  const fullAddress = [formData.addressDetail, formData.ward, formData.district, formData.city]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-5">
      {/* Địa chỉ giao hàng */}
      <div className="rounded-2xl border border-border-pink overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-primary-light border-b border-border-pink">
          <Icon name="local_shipping" className="text-primary" />
          <span className="font-semibold text-body-sm text-on-surface">Địa chỉ giao hàng</span>
        </div>
        <div className="px-5 py-4 space-y-1">
          <p className="font-bold text-on-surface">{formData.customerName}</p>
          <p className="text-body-sm text-on-surface-variant">{formData.customerPhone}</p>
          <p className="text-body-sm text-on-surface-variant">{fullAddress}</p>
          {formData.note && (
            <p className="text-caption text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2 border border-amber-200">
              📝 {formData.note}
            </p>
          )}
        </div>
      </div>

      {/* Sản phẩm */}
      <div className="rounded-2xl border border-border-pink overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-primary-light border-b border-border-pink">
          <Icon name="shopping_bag" className="text-primary" />
          <span className="font-semibold text-body-sm text-on-surface">Sản phẩm đặt mua ({items.length})</span>
        </div>
        <div className="divide-y divide-border-pink">
          {items.map(item => {
            const img = resolveImageUrl(item.imageUrl || item.images?.[0])
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-border-pink shrink-0 bg-primary-light">
                  {img ? (
                    <img src={img} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon name="science" className="text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-body-sm text-on-surface truncate">{item.name}</p>
                  <p className="text-caption text-on-surface-variant">Số lượng: {item.qty} - Đơn giá: {money(item.price)}</p>
                </div>
                <p className="font-bold text-primary whitespace-nowrap">{money(item.price * item.qty)}</p>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between px-5 py-4 bg-primary-light/50 border-t border-border-pink">
          <div>
            <p className="text-caption text-on-surface-variant">Phương thức thanh toán</p>
            <p className="font-semibold text-body-sm text-on-surface">{payLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-caption text-on-surface-variant">Tổng thanh toán</p>
            <p className="text-title-md font-bold text-primary">{money(totalPrice)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-4 rounded-2xl border border-border-pink text-on-surface-variant font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Icon name="arrow_back" className="text-xl" />
          Quay lại
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-[2] py-4 rounded-2xl gradient-bg text-white font-bold shadow-ambient-pink hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Icon name="hourglass_empty" className="text-xl animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Icon name="check_circle" className="text-xl" />
              Đặt hàng
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Order Summary Sidebar
───────────────────────────────────────────── */
function OrderSummary({ items, totalPrice }) {
  return (
    <div className="h-fit rounded-2xl border border-border-pink bg-white overflow-hidden sticky top-4">
      <div className="px-5 py-4 border-b border-border-pink bg-primary-light">
        <p className="font-bold text-on-surface">Tóm tắt đơn hàng</p>
      </div>
      <div className="px-5 py-4 divide-y divide-border-pink/60">
        {items.map(item => {
          const img = resolveImageUrl(item.imageUrl || item.images?.[0])
          return (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="w-11 h-11 rounded-xl overflow-hidden border border-border-pink shrink-0 bg-primary-light relative">
                {img ? (
                  <img src={img} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="science" className="text-primary/40 text-sm" />
                  </div>
                )}
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full gradient-bg text-white text-[10px] font-bold flex items-center justify-center shadow">
                  {item.qty}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface truncate">{item.name}</p>
              </div>
              <p className="font-semibold text-body-sm text-on-surface whitespace-nowrap">{money(item.price * item.qty)}</p>
            </div>
          )
        })}
      </div>
      <div className="px-5 py-4 border-t border-border-pink space-y-2">
        <div className="flex justify-between text-body-sm text-on-surface-variant">
          <span>Tạm tính</span>
          <span>{money(totalPrice)}</span>
        </div>
        <div className="flex justify-between text-body-sm text-on-surface-variant">
          <span>Phí vận chuyển</span>
          <span className="text-emerald-600 font-medium">Miễn phí</span>
        </div>
        <div className="flex justify-between font-bold text-on-surface pt-2 border-t border-border-pink text-title-sm">
          <span>Tổng cộng</span>
          <span className="text-primary">{money(totalPrice)}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Trang Checkout chính
───────────────────────────────────────────── */
export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    customerName: user?.fullName || '',
    customerPhone: user?.phone || '',
    provinceCode: '',
    city: '',
    districtCode: '',
    district: '',
    wardCode: '',
    ward: '',
    addressDetail: '',
    note: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('')

  function handleChange(e) {
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }))
  }

  async function handlePlaceOrder() {
    setLoading(true)
    try {
      const shippingAddress = [formData.addressDetail, formData.ward, formData.district, formData.city]
        .filter(Boolean)
        .join(', ')
      const payload = {
        customerId: user?.id || 'GUEST',
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        shippingAddress,
        paymentMethod,
        items: items.map(i => ({
          productId: i.id,
          productName: i.name,
          imageUrl: i.imageUrl || i.images?.[0],
          quantity: i.qty,
          unit: i.unit || 'Cái',
          unitPrice: i.price,
        })),
      }

      const result = await httpClient.post('/orders', payload)

      if (paymentMethod === 'MOMO' && result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else {
        clearCart()
        navigate('/orders', { state: { orderCode: result.orderCode, success: true } })
      }
    } catch (err) {
      console.error(err)
      alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại!')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
        <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
          <Icon name="shopping_cart" className="text-5xl text-primary/40" />
        </div>
        <div>
          <p className="text-headline-sm font-bold text-on-surface mb-2">Giỏ hàng trống</p>
          <p className="text-body-md text-on-surface-variant">Bạn chưa có sản phẩm nào để thanh toán.</p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-primary border border-primary font-semibold hover:bg-primary-light transition-colors"
        >
          <Icon name="storefront" className="text-xl" />
          Khám phá sản phẩm
        </Link>
      </div>
    )
  }

  const stepTitle = ['Thông tin giao hàng', 'Phương thức thanh toán', 'Xác nhận đặt hàng']

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-caption text-on-surface-variant mb-1">
          <Link to="/cart" className="hover:text-primary transition-colors">Giỏ hàng</Link>
          <span className="mx-2">/</span>
          Thanh toán
        </p>
        <h1 className="text-headline-lg text-on-surface">Thanh toán</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        {/* Left: Stepper & Form */}
        <div>
          <Stepper currentStep={step} />

          {/* Step card */}
          <div className="bg-white rounded-3xl border border-border-pink shadow-[0_4px_24px_rgba(255,107,158,0.06)] overflow-hidden">
            <div className="gradient-bg px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold">{step}</span>
                </div>
                <h2 className="text-white font-bold text-title-md">{stepTitle[step - 1]}</h2>
              </div>
            </div>
            <div className="p-6">
              {step === 1 && (
                <StepAddress
                  formData={formData}
                  onChange={handleChange}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <StepPayment
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && (
                <StepConfirm
                  formData={formData}
                  paymentMethod={paymentMethod}
                  items={items}
                  totalPrice={totalPrice}
                  onBack={() => setStep(2)}
                  onConfirm={handlePlaceOrder}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <OrderSummary items={items} totalPrice={totalPrice} />
      </div>
    </div>
  )
}
