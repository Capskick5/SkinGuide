import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { App as AntApp, Select } from 'antd'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'
import { useAuth } from '@/hook/useAuth'
import httpClient from '@/api/httpClient'
import { addressApi } from '@/api/addressApi'
import { voucherApi } from '@/api/voucherApi'
import { resolveImageUrl } from '@/page/products/productUtils'

function money(value) {
  if (!value && value !== 0) return '-'
  return `${Number(value).toLocaleString('vi-VN')}đ`
}

const steps = [
  { id: 1, label: 'Giao hàng', icon: 'local_shipping' },
  { id: 2, label: 'Thanh toán', icon: 'payments' },
  { id: 3, label: 'Xác nhận', icon: 'check_circle' },
]

function Stepper({ currentStep }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-2" role="list" aria-label="Tiến trình thanh toán">
      {steps.map((step) => {
        const active = currentStep === step.id
        const done = currentStep > step.id
        return (
          <div
            key={step.id}
            role="listitem"
            aria-current={active ? 'step' : undefined}
            className={[
              'flex min-h-14 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors',
              active || done ? 'bg-primary text-white' : 'bg-surface-soft text-on-surface-variant',
            ].join(' ')}
          >
            <Icon name={done ? 'check' : step.icon} className="text-lg" />
            <span className="truncate">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function TextField({ icon, label, name, value, onChange, placeholder, type = 'text', required = true }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-on-surface">
        {label} {required ? <span className="text-error">*</span> : null}
      </span>
      <div className="relative">
        <Icon name={icon} className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant" />
        <input
          required={required}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="h-12 w-full rounded-lg border border-border-pink bg-white pl-11 pr-3 text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder={placeholder}
        />
      </div>
    </label>
  )
}

function SelectField({ icon, label, value, onChange, placeholder, options, disabled }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-on-surface">
        {label} <span className="text-error">*</span>
      </span>
      <div className="relative">
        <Icon name={icon} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-xl text-on-surface-variant pointer-events-none" />
        <Select
          showSearch
          value={value || undefined}
          onChange={(val) => onChange({ target: { value: val } })}
          disabled={disabled}
          placeholder={placeholder}
          options={options.map((opt) => ({ value: String(opt.code), label: opt.name }))}
          optionFilterProp="label"
          className="h-12 w-full [&_.ant-select-selector]:!h-12 [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-border-pink [&_.ant-select-selector]:!pl-10 [&_.ant-select-selection-item]:!leading-[46px] [&_.ant-select-selection-placeholder]:!leading-[46px] [&_.ant-select-selection-item]:!text-body-md"
        />
      </div>
    </label>
  )
}

/** Sổ địa chỉ: chọn 1 địa chỉ có sẵn hoặc chuyển sang form thêm mới. */
function AddressListPicker({ addresses, selectedId, onSelect, savingAddress, onUseSelected, onAddNew }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {addresses.map((address) => {
          const active = address.id === selectedId
          const fullAddress = [address.addressDetail, address.ward, address.district, address.city].filter(Boolean).join(', ')
          return (
            <button
              key={address.id}
              type="button"
              onClick={() => onSelect(address.id)}
              className={[
                'flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
                active ? 'border-primary bg-primary-light/40' : 'border-border-pink bg-white hover:border-primary/40',
              ].join(' ')}
            >
              <Icon name={active ? 'radio_button_checked' : 'radio_button_unchecked'} className="mt-0.5 shrink-0 text-xl text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold text-on-surface">
                  {address.label || 'Địa chỉ giao hàng'}
                  {address.isDefault ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Mặc định</span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm font-semibold text-on-surface">{address.customerName} · {address.customerPhone}</span>
                <span className="mt-1 block text-sm leading-6 text-on-surface-variant">{fullAddress}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <button
          type="button"
          onClick={onAddNew}
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-primary bg-white px-2 text-sm font-semibold text-primary transition hover:bg-primary-light"
        >
          <Icon name="add_location_alt" className="text-lg" />
          Thêm mới
        </button>
        <button
          type="button"
          onClick={onUseSelected}
          disabled={!selectedId || savingAddress}
          className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white transition hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingAddress ? 'Đang xử lý...' : 'Giao đến địa chỉ này'}
          <Icon name={savingAddress ? 'hourglass_empty' : 'arrow_forward'} className={savingAddress ? 'animate-spin text-xl' : 'text-xl'} />
        </button>
      </div>
    </div>
  )
}

function AddressForm({ formData, savingAddress, onChange, onCancel, onNext, showLabelField }) {
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])
  const [loading, setLoading] = useState({ provinces: false, districts: false, wards: false })
  const [addressApiError, setAddressApiError] = useState('')
  const [addressValidationError, setAddressValidationError] = useState('')
  const [addressReloadKey, setAddressReloadKey] = useState(0)
  const emit = useCallback((name, value) => {
    onChange({ target: { name, value } })
  }, [onChange])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading((current) => ({ ...current, provinces: true }))
      setAddressApiError('')
      try {
        const res = await httpClient.get('/ghn/provinces')
        if (!Array.isArray(res) || res.length === 0) throw new Error('GHN không trả về dữ liệu tỉnh thành')
        if (!cancelled) setProvinces(res.map(p => ({ code: p.ProvinceID, name: p.ProvinceName })))
      } catch (error) {
        if (!cancelled) setAddressApiError(error?.message || 'Không tải được danh sách tỉnh thành.')
      } finally {
        if (!cancelled) setLoading((current) => ({ ...current, provinces: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [addressReloadKey])

  useEffect(() => {
    if (!formData.provinceCode) return
    let cancelled = false
    async function load() {
      setLoading((current) => ({ ...current, districts: true }))
      setAddressApiError('')
      try {
        const res = await httpClient.get(`/ghn/districts?provinceId=${formData.provinceCode}`)
        if (!Array.isArray(res) || res.length === 0) throw new Error('GHN không trả về dữ liệu quận huyện')
        if (!cancelled) setDistricts(res.map(d => ({ code: d.DistrictID, name: d.DistrictName })))
      } catch (error) {
        if (!cancelled) setAddressApiError(error?.message || 'Không tải được danh sách quận huyện.')
      } finally {
        if (!cancelled) setLoading((current) => ({ ...current, districts: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [addressReloadKey, formData.provinceCode])

  useEffect(() => {
    if (!formData.districtCode) return
    let cancelled = false
    async function load() {
      setLoading((current) => ({ ...current, wards: true }))
      setAddressApiError('')
      try {
        const res = await httpClient.get(`/ghn/wards?districtId=${formData.districtCode}`)
        if (!Array.isArray(res) || res.length === 0) throw new Error('GHN không trả về dữ liệu phường xã')
        if (!cancelled) setWards(res.map(w => ({ code: w.WardCode, name: w.WardName })))
      } catch (error) {
        if (!cancelled) setAddressApiError(error?.message || 'Không tải được danh sách phường xã.')
      } finally {
        if (!cancelled) setLoading((current) => ({ ...current, wards: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [addressReloadKey, formData.districtCode])
  
  function handleProvinceChange(event) {
    const code = event.target.value
    setAddressValidationError('')
    const province = provinces.find((item) => String(item.code) === code)
    setDistricts([])
    setWards([])
    emit('provinceCode', code)
    emit('city', province?.name || '')
    emit('districtCode', '')
    emit('district', '')
    emit('wardCode', '')
    emit('ward', '')
    emit('shippingFee', 0)
  }

  function handleDistrictChange(event) {
    const code = event.target.value
    setAddressValidationError('')
    const district = districts.find((item) => String(item.code) === code)
    setWards([])
    emit('districtCode', code)
    emit('district', district?.name || '')
    emit('wardCode', '')
    emit('ward', '')
    emit('shippingFee', 0)
  }

  function handleWardChange(event) {
    const code = event.target.value
    setAddressValidationError('')
    const ward = wards.find((item) => String(item.code) === code)
    emit('wardCode', code)
    emit('ward', ward?.name || '')
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!formData.provinceCode || !formData.districtCode || !formData.wardCode) {
          setAddressValidationError('Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện và phường/xã.')
          return
        }
        onNext()
      }}
      className="space-y-5"
    >
      {onCancel ? (
        <div className="flex items-center justify-between rounded-lg border border-border-pink bg-surface-soft px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Icon name="edit_location_alt" className="text-lg text-primary" />
            Thêm địa chỉ mới
          </span>
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-on-surface-variant transition hover:text-primary">
            Hủy
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showLabelField ? (
          <div className="sm:col-span-2">
            <TextField icon="label" label="Nhãn địa chỉ" name="label" value={formData.label || ''} onChange={onChange} placeholder="Nhà, Công ty..." required={false} />
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <TextField icon="person" label="Người nhận" name="customerName" value={formData.customerName} onChange={onChange} placeholder="Nguyễn Nhật Huy" />
        </div>
        <TextField icon="phone" label="Số điện thoại" name="customerPhone" value={formData.customerPhone} onChange={onChange} placeholder="0901234567" type="tel" />

        {addressApiError ? (
          <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <span className="flex items-center gap-2"><Icon name="error" className="text-lg" />{addressApiError}</span>
            <button type="button" onClick={() => setAddressReloadKey((key) => key + 1)} className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-red-100">Thử lại</button>
          </div>
        ) : null}
        <SelectField icon="location_city" label="Tỉnh / Thành phố" value={formData.provinceCode} onChange={handleProvinceChange} disabled={loading.provinces} placeholder={loading.provinces ? 'Đang tải...' : 'Chọn tỉnh / thành phố'} options={provinces} />
        <SelectField icon="map" label="Quận / Huyện" value={formData.districtCode} onChange={handleDistrictChange} disabled={!formData.provinceCode || loading.districts} placeholder={loading.districts ? 'Đang tải...' : 'Chọn quận / huyện'} options={districts} />
        <SelectField icon="pin_drop" label="Phường / Xã" value={formData.wardCode} onChange={handleWardChange} disabled={!formData.districtCode || loading.wards} placeholder={loading.wards ? 'Đang tải...' : 'Chọn phường / xã'} options={wards} />
        {addressValidationError ? <p className="sm:col-span-2 text-sm font-medium text-red-600">{addressValidationError}</p> : null}

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-on-surface">
            Địa chỉ chi tiết <span className="text-error">*</span>
          </span>
          <textarea
            required
            name="addressDetail"
            value={formData.addressDetail}
            onChange={onChange}
            rows={3}
            className="w-full rounded-lg border border-border-pink bg-white px-3 py-3 text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="Số nhà, tên đường, tòa nhà..."
          />
        </label>

        <div className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-on-surface">Ghi chú</span>
          <textarea
            name="note"
            value={formData.note}
            onChange={onChange}
            rows={2}
            className="w-full rounded-lg border border-border-pink bg-white px-3 py-3 text-body-md text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="Gọi trước khi giao, thời gian nhận hàng..."
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {['Giao giờ hành chính', 'Gọi trước khi giao', 'Gửi bảo vệ'].map(s => (
              <button 
                key={s} 
                type="button" 
                onClick={() => {
                   const newNote = formData.note ? formData.note + ', ' + s : s;
                   onChange({ target: { name: 'note', value: newNote }})
                }}
                className="rounded-full border border-border-pink bg-surface-soft px-3 py-1 text-xs text-on-surface hover:border-primary hover:text-primary transition"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {addressApiError ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Icon name="info" className="text-lg" />
          {addressApiError}
        </div>
      ) : null}

      <button type="submit" disabled={savingAddress} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white transition hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-60">
        {savingAddress ? 'Đang lưu địa chỉ...' : 'Lưu địa chỉ & Tiếp tục'}
        <Icon name={savingAddress ? 'hourglass_empty' : 'arrow_forward'} className={savingAddress ? 'animate-spin text-xl' : 'text-xl'} />
      </button>
    </form>
  )
}

function PaymentMethodStep({ selectedMethod, availability, onSelect, onBack, onNext }) {
  const methods = [
    {
      id: 'COD',
      label: 'Thanh toán khi nhận hàng (COD)',
      desc: 'Thanh toán bằng tiền mặt khi nhận hàng',
      icon: 'local_shipping',
      badge: 'Truyền thống',
      accent: 'border-primary bg-primary/5 text-primary',
    },
    {
      id: 'BANK_TRANSFER',
      label: 'Chuyển khoản ngân hàng',
      desc: 'Chuyển khoản qua quét mã QR (VietQR)',
      icon: 'account_balance',
      badge: 'Thủ công',
      accent: 'border-green-600 bg-green-50 text-green-700',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-pink bg-white p-4">
        <p className="mb-1 flex items-center gap-2 font-bold text-on-surface">
          <Icon name="payments" className="text-primary" />
          Chọn phương thức thanh toán
        </p>
        <p className="text-sm text-on-surface-variant">Chọn một trong các phương thức thanh toán có sẵn</p>
      </div>

      <div className="space-y-3">
        {methods.map((method) => {
          const active = selectedMethod === method.id
          const available = availability?.[method.id] !== false
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => available && onSelect(method.id)}
              disabled={!available}
              className={[
                'flex w-full items-center gap-4 rounded-lg border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                active ? method.accent : 'border-border-pink bg-white hover:border-primary/40',
              ].join(' ')}
            >
              <span className={['flex h-12 w-12 shrink-0 items-center justify-center rounded-lg', active ? 'bg-white/80' : 'bg-surface-soft'].join(' ')}>
                <Icon name={method.icon} className="text-2xl" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-bold text-on-surface">
                  {method.label}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                    {available ? method.badge : 'Chưa cấu hình'}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-on-surface-variant">{method.desc}</span>
              </span>
              <Icon name={active ? 'radio_button_checked' : 'radio_button_unchecked'} className="text-2xl" />
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border-pink bg-white font-semibold text-on-surface-variant transition hover:bg-surface-soft">
          <Icon name="arrow_back" className="text-xl" />
          Quay lại
        </button>
        <button type="button" onClick={onNext} disabled={!selectedMethod || availability?.[selectedMethod] === false} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white transition hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-50">
          Xác nhận
          <Icon name="arrow_forward" className="text-xl" />
        </button>
      </div>
    </div>
  )
}

function VoucherBox({ voucherCode, onVoucherCodeChange, onApply, onRemove, appliedVoucher, checking, error }) {
  return (
    <div className="rounded-lg border border-border-pink bg-white p-4">
      <p className="mb-3 flex items-center gap-2 font-bold text-on-surface">
        <Icon name="local_offer" className="text-primary" />
        Mã giảm giá
      </p>
      {appliedVoucher ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <span className="flex items-center gap-2">
            <Icon name="check_circle" className="text-lg" />
            Áp dụng mã <strong>{appliedVoucher.code}</strong> — giảm {money(appliedVoucher.discountAmount)}
          </span>
          <button type="button" onClick={onRemove} className="shrink-0 text-xs font-semibold text-on-surface-variant underline hover:text-primary">
            Bỏ mã
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={voucherCode}
            onChange={(event) => onVoucherCodeChange(event.target.value.toUpperCase())}
            placeholder="Nhập mã giảm giá"
            className="h-11 flex-1 rounded-lg border border-border-pink bg-white px-3 text-body-md uppercase text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="button"
            onClick={onApply}
            disabled={checking || !voucherCode.trim()}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? 'Đang kiểm tra...' : 'Áp dụng'}
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  )
}

function ConfirmStep({ formData, items, paymentMethod, onBack, onConfirm, loading, voucherCode, onVoucherCodeChange, onApplyVoucher, onRemoveVoucher, appliedVoucher, voucherChecking, voucherError }) {
  const fullAddress = [formData.addressDetail, formData.ward, formData.district, formData.city].filter(Boolean).join(', ')

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-pink bg-white p-4">
        <p className="mb-3 flex items-center gap-2 font-bold text-on-surface">
          <Icon name="local_shipping" className="text-primary" />
          Thông tin nhận hàng
        </p>
        <p className="font-semibold text-on-surface">{formData.customerName}</p>
        <p className="text-sm text-on-surface-variant">{formData.customerPhone}</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{fullAddress}</p>
        {formData.note ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{formData.note}</p> : null}
      </div>

      <div className="rounded-lg border border-border-pink bg-white p-4">
        <p className="mb-3 flex items-center gap-2 font-bold text-on-surface">
          <Icon name="payments" className="text-primary" />
          Phương thức thanh toán
        </p>
        <p className="font-semibold text-on-surface">
          {paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Thanh toán khi nhận hàng (COD)'}
        </p>
      </div>

      <VoucherBox
        voucherCode={voucherCode}
        onVoucherCodeChange={onVoucherCodeChange}
        onApply={onApplyVoucher}
        onRemove={onRemoveVoucher}
        appliedVoucher={appliedVoucher}
        checking={voucherChecking}
        error={voucherError}
      />

      <div className="overflow-hidden rounded-lg border border-border-pink bg-white">
        <div className="border-b border-border-pink bg-primary-light px-4 py-3 font-bold text-on-surface">
          Sản phẩm ({items.length})
        </div>
        <div className="divide-y divide-border-pink">
          {items.map((item) => {
            const img = resolveImageUrl(item.imageUrl || item.images?.[0])
            return (
              <div key={item.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3">
                <div className="h-12 w-12 overflow-hidden rounded-md border border-border-pink bg-primary-light">
                  {img ? <img src={img} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <Icon name="science" className="m-3 text-primary/50" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-on-surface">{item.name}</p>
                  <p className="text-sm text-on-surface-variant">SL {item.qty} x {money(item.price)}</p>
                </div>
                <p className="whitespace-nowrap font-bold text-primary">{money(item.price * item.qty)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <button type="button" onClick={onBack} disabled={loading} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border-pink bg-white font-semibold text-on-surface-variant transition hover:bg-surface-soft disabled:opacity-50">
          <Icon name="arrow_back" className="text-xl" />
          Quay lại
        </button>
        <button type="button" onClick={onConfirm} disabled={loading} className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white transition hover:bg-tertiary disabled:cursor-not-allowed disabled:opacity-50">
          <Icon name={loading ? 'hourglass_empty' : 'check_circle'} className={loading ? 'animate-spin text-xl' : 'text-xl'} />
          {loading ? 'Đang xử lý...' : 'Xác nhận & Đặt hàng'}
        </button>
      </div>
    </div>
  )
}

function OrderSummary({ items, totalPrice, shippingFee = 0, discountAmount = 0 }) {
  const finalPrice = Math.max(0, totalPrice + shippingFee - discountAmount)
  return (
    <aside className="rounded-lg border border-border-pink bg-white lg:sticky lg:top-4">
      <div className="border-b border-border-pink px-4 py-3">
        <p className="font-bold text-on-surface">Tóm tắt đơn hàng</p>
        <p className="text-sm text-on-surface-variant">{items.length} sản phẩm trong giỏ</p>
      </div>
      <div className="max-h-[360px] divide-y divide-border-pink overflow-auto px-4">
        {items.map((item) => {
          const img = resolveImageUrl(item.imageUrl || item.images?.[0])
          return (
            <div key={item.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-md border border-border-pink bg-primary-light">
                {img ? <img src={img} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <Icon name="science" className="m-3 text-primary/50" />}
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-bl-md bg-primary px-1 text-[10px] font-bold text-white">{item.qty}</span>
              </div>
              <p className="min-w-0 truncate text-sm font-semibold text-on-surface">{item.name}</p>
              <p className="whitespace-nowrap text-sm font-bold text-on-surface">{money(item.price * item.qty)}</p>
            </div>
          )
        })}
      </div>
      <div className="space-y-2 border-t border-border-pink px-4 py-4">
        <div className="flex justify-between text-sm text-on-surface-variant">
          <span>Tạm tính</span>
          <span>{money(totalPrice)}</span>
        </div>
        <div className="flex justify-between text-sm text-on-surface-variant">
          <span>Vận chuyển</span>
          <span className="font-semibold text-on-surface">{shippingFee > 0 ? money(shippingFee) : '-'}</span>
        </div>
        {discountAmount > 0 ? (
          <div className="flex justify-between text-sm text-green-700">
            <span>Giảm giá</span>
            <span className="font-semibold">-{money(discountAmount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-border-pink pt-3 text-lg font-bold text-on-surface">
          <span>Tổng cộng</span>
          <span className="text-primary">{money(finalPrice)}</span>
        </div>
      </div>
    </aside>
  )
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const { user } = useAuth()
  const isLoggedIn = !!user?.id
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const idempotencyKeyRef = useRef(crypto.randomUUID())
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [paymentAvailability, setPaymentAvailability] = useState({ COD: true, MOMO: false, VNPAY: false })
  // Mã giảm giá (tùy chọn). appliedVoucher chỉ được set sau khi backend xác nhận hợp lệ qua /vouchers/validate.
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState(null)
  const [voucherChecking, setVoucherChecking] = useState(false)
  const [voucherError, setVoucherError] = useState('')
  // Sổ địa chỉ (chỉ áp dụng cho người dùng đã đăng nhập).
  const [addressBook, setAddressBook] = useState([])
  const [addressBookMode, setAddressBookMode] = useState(isLoggedIn ? null : 'form') // 'list' | 'form' | null (đang tải)
  const [addressBookLoading, setAddressBookLoading] = useState(isLoggedIn)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
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
    label: '',
    note: '',
    shippingFee: 0,
  })

  useEffect(() => {
    let cancelled = false
    httpClient.get('/orders/payment/methods')
      .then((availability) => {
        if (!cancelled && availability) setPaymentAvailability(availability)
      })
      .catch((error) => console.error('Không tải được phương thức thanh toán', error))
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = useCallback((event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }))
  }, [])

  // Nạp sổ địa chỉ từ server khi đã đăng nhập; nếu chưa có địa chỉ nào thì mở luôn form thêm mới.
  useEffect(() => {
    // Khách chưa đăng nhập: addressBookMode đã được khởi tạo là 'form', không có sổ địa chỉ để tải.
    if (!isLoggedIn) return
    let cancelled = false
    async function load() {
      setAddressBookLoading(true)
      try {
        const list = await addressApi.list()
        if (cancelled) return
        const safeList = list || []
        setAddressBook(safeList)
        if (safeList.length > 0) {
          const defaultAddress = safeList.find((address) => address.isDefault) || safeList[0]
          setSelectedAddressId(defaultAddress.id)
          setFormData((current) => ({ ...current, ...defaultAddress }))
          setAddressBookMode('list')
        } else {
          setAddressBookMode('form')
        }
      } catch (error) {
        console.error('Không tải được sổ địa chỉ', error)
        if (!cancelled) setAddressBookMode('form')
      } finally {
        if (!cancelled) setAddressBookLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  // Tính phí ship GHN ngay khi có đủ mã quận/phường, bất kể địa chỉ đến từ đâu (form mới hay chọn trong sổ).
  useEffect(() => {
    if (!formData.districtCode || !formData.wardCode) return
    let cancelled = false
    async function calcFee() {
      try {
        const res = await httpClient.post('/ghn/fee', {
          to_district_id: Number(formData.districtCode),
          to_ward_code: String(formData.wardCode),
          weight: 500, // Mặc định 500g
        })
        if (!cancelled && res?.total) {
          handleChange({ target: { name: 'shippingFee', value: res.total } })
        }
      } catch (err) {
        console.error('Không tính được phí ship', err)
      }
    }
    calcFee()
    return () => {
      cancelled = true
    }
  }, [handleChange, formData.districtCode, formData.wardCode])

  /** Người dùng chọn 1 địa chỉ có sẵn trong sổ rồi bấm "Giao đến địa chỉ này". */
  function handleUseSelectedAddress() {
    const address = addressBook.find((item) => item.id === selectedAddressId)
    if (address) {
      setFormData((current) => ({ ...current, ...address }))
    }
    setStep(2)
  }

  /** Thêm địa chỉ mới vào sổ (người dùng đã đăng nhập) rồi dùng luôn địa chỉ đó để giao hàng. */
  async function handleCreateAddress() {
    setSavingAddress(true)
    try {
      const payload = {
        label: formData.label || '',
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        provinceCode: formData.provinceCode,
        city: formData.city,
        districtCode: formData.districtCode,
        district: formData.district,
        wardCode: formData.wardCode,
        ward: formData.ward,
        addressDetail: formData.addressDetail,
      }
      const list = await addressApi.create(payload)
      setAddressBook(list)
      const created = list[list.length - 1]
      if (created) {
        setSelectedAddressId(created.id)
        setFormData((current) => ({ ...current, ...created }))
      }
      setAddressBookMode('list')
      setStep(2)
    } catch (err) {
      console.error('Không lưu được địa chỉ vào sổ địa chỉ', err)
      message.error(err?.message || 'Không lưu được địa chỉ. Vui lòng thử lại.')
    } finally {
      setSavingAddress(false)
    }
  }

  /** Khách chưa đăng nhập: không có sổ địa chỉ, chỉ cần điền form rồi tiếp tục. */
  function handleGuestAddressNext() {
    setStep(2)
  }

  /** Gọi backend xem trước mã giảm giá dựa trên subtotal hàng (không tính ship). */
  async function handleApplyVoucher() {
    const code = voucherCodeInput.trim().toUpperCase()
    if (!code) return
    setVoucherChecking(true)
    setVoucherError('')
    try {
      const result = await voucherApi.validate(code, totalPrice)
      setAppliedVoucher({ code: result.code || code, discountAmount: Number(result.discountAmount) || 0 })
      setVoucherCodeInput('')
    } catch (err) {
      setAppliedVoucher(null)
      setVoucherError(err?.message || 'Mã giảm giá không hợp lệ.')
    } finally {
      setVoucherChecking(false)
    }
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null)
    setVoucherCodeInput('')
    setVoucherError('')
  }

  async function handlePlaceOrder() {
    setLoading(true)
    try {
      const shippingAddress = [formData.addressDetail, formData.ward, formData.district, formData.city].filter(Boolean).join(', ')
      const payload = {
        customerId: user?.id || 'GUEST',
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        shippingAddress,
        ghnDistrictId: formData.districtCode ? Number(formData.districtCode) : null,
        ghnWardCode: formData.wardCode ? String(formData.wardCode) : null,
        shippingFee: formData.shippingFee,
        customerNote: formData.note,
        paymentMethod,
        voucherCode: appliedVoucher?.code || undefined,
        items: items.map((item) => ({
          productId: item.id,
          variantId: item.variantId || null,
          productName: item.name,
          imageUrl: item.imageUrl || item.images?.[0],
          quantity: item.qty,
          unit: item.unit || 'Cái',
          unitPrice: item.price,
        })),
      }

      const result = await httpClient.post('/orders', payload, {
        headers: { 'Idempotency-Key': idempotencyKeyRef.current },
      })



      clearCart()

      if (paymentMethod === 'BANK_TRANSFER') {
        navigate(`/payment/bank-transfer/${result.orderCode}`)
        return
      }

      navigate('/orders', { state: { orderCode: result.orderCode, success: true } })
    } catch (err) {
      console.error(err)
      message.error(err?.message || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
          <Icon name="shopping_cart" className="text-5xl text-primary/40" />
        </div>
        <div>
          <p className="mb-2 text-headline-sm font-bold text-on-surface">Giỏ hàng trống</p>
          <p className="text-body-md text-on-surface-variant">Bạn chưa có sản phẩm nào để thanh toán.</p>
        </div>
        <Link to="/products" className="inline-flex h-12 items-center gap-2 rounded-lg border border-primary bg-white px-5 font-semibold text-primary transition hover:bg-primary-light">
          <Icon name="storefront" className="text-xl" />
          Khám phá sản phẩm
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <p className="mb-1 text-caption text-on-surface-variant">
          <Link to="/cart" className="hover:text-primary">Giỏ hàng</Link>
          <span className="mx-2">/</span>
          Thanh toán
        </p>
        <h1 className="text-headline-lg text-on-surface">Thanh toán</h1>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main>
          {step <= 3 && <Stepper currentStep={step} />}
          <section className="rounded-lg border border-border-pink bg-white p-5 shadow-[0_4px_24px_rgba(255,107,158,0.06)]">
            {step === 1 ? (
              isLoggedIn && addressBookLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-on-surface-variant">
                  <Icon name="hourglass_empty" className="animate-spin text-xl" />
                  Đang tải sổ địa chỉ...
                </div>
              ) : isLoggedIn && addressBookMode === 'list' ? (
                <AddressListPicker
                  addresses={addressBook}
                  selectedId={selectedAddressId}
                  onSelect={setSelectedAddressId}
                  savingAddress={savingAddress}
                  onUseSelected={handleUseSelectedAddress}
                  onAddNew={() => setAddressBookMode('form')}
                />
              ) : (
                <AddressForm
                  formData={formData}
                  savingAddress={savingAddress}
                  onChange={handleChange}
                  onCancel={isLoggedIn && addressBook.length > 0 ? () => setAddressBookMode('list') : null}
                  onNext={isLoggedIn ? handleCreateAddress : handleGuestAddressNext}
                  showLabelField={isLoggedIn}
                />
              )
            ) : null}
            {step === 2 ? (
              <PaymentMethodStep
                selectedMethod={paymentMethod}
                availability={paymentAvailability}
                onSelect={setPaymentMethod}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            ) : null}
            {step === 3 ? (
              <ConfirmStep
                formData={formData}
                items={items}
                paymentMethod={paymentMethod}
                onBack={() => setStep(2)}
                onConfirm={handlePlaceOrder}
                loading={loading}
                voucherCode={voucherCodeInput}
                onVoucherCodeChange={setVoucherCodeInput}
                onApplyVoucher={handleApplyVoucher}
                onRemoveVoucher={handleRemoveVoucher}
                appliedVoucher={appliedVoucher}
                voucherChecking={voucherChecking}
                voucherError={voucherError}
              />
            ) : null}
          </section>
        </main>

        {step <= 3 && (
          <OrderSummary
            items={items}
            totalPrice={totalPrice}
            shippingFee={formData.shippingFee}
            discountAmount={appliedVoucher?.discountAmount || 0}
          />
        )}
      </div>
    </div>
  )
}
