import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import Icon from '@/components/common/Icon'
import { productApi } from '@/api/productApi'

const FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
]

const MOVEMENT_LABELS = {
  RESERVE: 'Giữ hàng',
  RELEASE: 'Trả hàng giữ',
  COMMIT_SALE: 'Chốt bán',
  STOCK_RECEIPT: 'Nhập hàng',
  STOCK_COUNT: 'Kiểm kê',
  STOCK_WRITE_OFF: 'Xuất hủy',
  ADJUSTMENT: 'Điều chỉnh',
}

const INVENTORY_OPERATIONS = [
  { value: 'RECEIPT', label: 'Nhập hàng', inputLabel: 'Số lượng nhận thêm', placeholder: 'Ví dụ: 20' },
  { value: 'COUNT', label: 'Kiểm kê', inputLabel: 'Tồn thực tế đếm được', placeholder: 'Ví dụ: 35' },
  { value: 'WRITE_OFF', label: 'Xuất hủy', inputLabel: 'Số lượng loại bỏ', placeholder: 'Ví dụ: 3' },
]

function toArray(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  return []
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function stockTone(available, lowStock) {
  if (available <= 0) return 'bg-red-50 text-red-700 border-red-200'
  if (lowStock) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [adjustTarget, setAdjustTarget] = useState(null)
  const [adjustment, setAdjustment] = useState({ operationType: 'RECEIPT', quantity: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadProducts = useCallback(async () => {
    const response = await productApi.listProducts()
    setProducts(toArray(response))
  }, [])

  const loadMovements = useCallback(async (productId = '') => {
    const response = await productApi.listInventoryMovements({ productId, size: 30 })
    setMovements(response?.content || [])
  }, [])

  const loadPage = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadProducts(), loadMovements()])
    } catch (error) {
      message.error(error?.message || 'Không tải được dữ liệu kho')
    } finally {
      setLoading(false)
    }
  }, [loadMovements, loadProducts])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(), 0)
    return () => window.clearTimeout(timer)
  }, [loadPage])

  const summary = useMemo(() => products.reduce((result, product) => ({
    onHand: result.onHand + (product.totalOnHandQuantity || 0),
    reserved: result.reserved + (product.totalReservedQuantity || 0),
    available: result.available + (product.totalAvailableQuantity || 0),
    low: result.low + (product.hasLowStock ? 1 : 0),
    out: result.out + ((product.totalAvailableQuantity || 0) <= 0 ? 1 : 0),
  }), { onHand: 0, reserved: 0, available: 0, low: 0, out: 0 }), [products])

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return products.filter((product) => {
      const variantSearchValues = (product.variants || []).flatMap((variant) => [variant.name, variant.sku])
      const matchesQuery = !keyword || [product.name, product.slug, product.brandName, ...variantSearchValues]
        .some((value) => String(value || '').toLowerCase().includes(keyword))
      const available = product.totalAvailableQuantity || 0
      const matchesFilter = filter === 'all'
        || (filter === 'low' && product.hasLowStock)
        || (filter === 'out' && available <= 0)
      return matchesQuery && matchesFilter
    })
  }, [filter, products, query])

  const selectProduct = async (product) => {
    try {
      const detail = await productApi.getProduct(product.id)
      setSelectedProduct(detail)
      await loadMovements(product.id)
    } catch (error) {
      message.error(error?.message || 'Không tải được chi tiết tồn kho')
    }
  }

  const showAllMovements = async () => {
    setSelectedProduct(null)
    try {
      await loadMovements()
    } catch (error) {
      message.error(error?.message || 'Không tải được lịch sử kho')
    }
  }

  const openAdjustment = (product, variant) => {
    const level = variant.inventoryLevels?.[0]
    setAdjustTarget({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      sku: variant.sku,
      warehouseId: level?.warehouseId || 'MAIN_WAREHOUSE',
      onHand: variant.onHandQuantity || 0,
      reserved: variant.reservedQuantity || 0,
    })
    setAdjustment({ operationType: 'RECEIPT', quantity: '', reason: '' })
  }

  const submitAdjustment = async (event) => {
    event.preventDefault()
    const quantity = Number.parseInt(adjustment.quantity, 10)
    if (!Number.isInteger(quantity) || quantity < 0 || (adjustment.operationType !== 'COUNT' && quantity === 0)) {
      message.error('Vui lòng nhập số lượng nguyên hợp lệ')
      return
    }
    const quantityDelta = adjustment.operationType === 'COUNT'
      ? quantity - adjustTarget.onHand
      : adjustment.operationType === 'WRITE_OFF' ? -quantity : quantity
    if (quantityDelta === 0) {
      message.info('Tồn kho không thay đổi')
      return
    }
    if (!adjustment.reason.trim()) {
      message.error('Vui lòng nhập lý do cập nhật kho')
      return
    }

    setSubmitting(true)
    try {
      await productApi.adjustInventory({
        productId: adjustTarget.productId,
        variantId: adjustTarget.variantId,
        warehouseId: adjustTarget.warehouseId,
        operationType: adjustment.operationType,
        quantityDelta,
        targetQuantity: adjustment.operationType === 'COUNT' ? quantity : null,
        reason: adjustment.reason.trim(),
      })
      message.success('Đã cập nhật kho và ghi lịch sử')
      setAdjustTarget(null)
      await loadProducts()
      const detail = await productApi.getProduct(adjustTarget.productId)
      setSelectedProduct(detail)
      await loadMovements(adjustTarget.productId)
    } catch (error) {
      message.error(error?.message || 'Cập nhật kho thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Quản lý kho</h1>
        <p className="mt-1 text-sm text-gray-500">Theo dõi tồn vật lý, hàng đang giữ, lượng có thể bán và lịch sử thay đổi.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Tồn vật lý" value={summary.onHand} icon="inventory_2" />
        <Metric label="Đang giữ" value={summary.reserved} icon="lock_clock" />
        <Metric label="Có thể bán" value={summary.available} icon="shopping_cart" />
        <Metric label="Sắp hết" value={summary.low} icon="warning" tone="text-amber-600" />
        <Metric label="Hết hàng" value={summary.out} icon="remove_shopping_cart" tone="text-red-600" />
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm sản phẩm, SKU, thương hiệu"
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${filter === item.value ? 'bg-gray-950 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">On hand</th>
                <th className="px-4 py-3">Reserved</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                const available = product.totalAvailableQuantity || 0
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.variantCount || 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{product.totalOnHandQuantity || 0}</td>
                    <td className="px-4 py-3 text-indigo-600">{product.totalReservedQuantity || 0}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{available}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${stockTone(available, product.hasLowStock)}`}>
                        {available <= 0 ? 'Hết hàng' : product.hasLowStock ? 'Sắp hết' : 'Còn hàng'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => selectProduct(product)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" title="Xem chi tiết kho">
                        <Icon name="visibility" className="text-lg" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!loading && filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Không có dữ liệu kho phù hợp</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProduct ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-950">Variants: {selectedProduct.name}</h2>
              <p className="text-xs text-gray-500">Nhập hàng, kiểm kê hoặc xuất hủy theo từng SKU.</p>
            </div>
            <button type="button" onClick={showAllMovements} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Đóng chi tiết">
              <Icon name="close" className="text-lg" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Variant / SKU</th>
                  <th className="px-3 py-2">Kho</th>
                  <th className="px-3 py-2">On hand</th>
                  <th className="px-3 py-2">Reserved</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Sold</th>
                  <th className="px-3 py-2 text-right">Thao tác kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(selectedProduct.variants || []).map((variant) => (
                  <tr key={variant.id}>
                    <td className="px-3 py-3"><p className="font-semibold text-gray-900">{variant.name}</p><p className="text-xs text-gray-400">{variant.sku}</p></td>
                    <td className="px-3 py-3 text-gray-600">{variant.inventoryLevels?.[0]?.warehouseName || 'Kho chính'}</td>
                    <td className="px-3 py-3">{variant.onHandQuantity || 0}</td>
                    <td className="px-3 py-3 text-indigo-600">{variant.reservedQuantity || 0}</td>
                    <td className="px-3 py-3 font-semibold">{variant.availableQuantity || 0}</td>
                    <td className="px-3 py-3">{variant.soldQuantity || 0}</td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => openAdjustment(selectedProduct, variant)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <Icon name="inventory" className="text-sm" /> Cập nhật kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-bold text-gray-950">Lịch sử kho</h2>
          <p className="text-xs text-gray-500">{selectedProduct ? `Đang lọc theo ${selectedProduct.name}` : 'Tất cả movement gần nhất'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Sản phẩm / SKU</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Số lượng</th>
                <th className="px-4 py-3">On hand</th>
                <th className="px-4 py-3">Reserved</th>
                <th className="px-4 py-3">Tham chiếu / Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(movement.createdAt)}</td>
                  <td className="px-4 py-3"><p className="font-medium text-gray-900">{movement.productName}</p><p className="text-xs text-gray-400">{movement.sku}</p></td>
                  <td className="px-4 py-3 font-medium text-gray-700">{MOVEMENT_LABELS[movement.type] || movement.type}</td>
                  <td className={`px-4 py-3 font-bold ${movement.quantity < 0 ? 'text-red-600' : 'text-gray-900'}`}>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{movement.onHandBefore} → {movement.onHandAfter}</td>
                  <td className="px-4 py-3 text-gray-600">{movement.reservedBefore} → {movement.reservedAfter}</td>
                  <td className="px-4 py-3"><p className="text-xs font-medium text-gray-700">{movement.referenceId || '—'}</p><p className="text-xs text-gray-400">{movement.reason || '—'}</p></td>
                </tr>
              ))}
              {movements.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Chưa có lịch sử kho</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {adjustTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitAdjustment} className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div><h3 className="font-bold text-gray-950">Cập nhật kho</h3><p className="text-xs text-gray-500">{adjustTarget.productName} · {adjustTarget.sku}</p></div>
              <button type="button" onClick={() => setAdjustTarget(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" title="Đóng"><Icon name="close" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Loại cập nhật kho">
                {INVENTORY_OPERATIONS.map((operation) => (
                  <button
                    key={operation.value}
                    type="button"
                    onClick={() => setAdjustment((current) => ({ ...current, operationType: operation.value, quantity: '' }))}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold ${adjustment.operationType === operation.value ? 'border-gray-950 bg-gray-950 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {operation.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center text-xs">
                <div><p className="text-gray-400">Tồn vật lý</p><p className="mt-1 font-bold text-gray-900">{adjustTarget.onHand}</p></div>
                <div><p className="text-gray-400">Đang giữ</p><p className="mt-1 font-bold text-indigo-600">{adjustTarget.reserved}</p></div>
                <div><p className="text-gray-400">Có thể bán</p><p className="mt-1 font-bold text-emerald-600">{adjustTarget.onHand - adjustTarget.reserved}</p></div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">{INVENTORY_OPERATIONS.find((item) => item.value === adjustment.operationType)?.inputLabel}</label>
                <input type="number" min="0" step="1" value={adjustment.quantity} onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))} placeholder={INVENTORY_OPERATIONS.find((item) => item.value === adjustment.operationType)?.placeholder} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
                <p className="mt-1 text-xs text-gray-400">
                  {adjustment.operationType === 'RECEIPT' && 'Số này được cộng thêm vào tồn hiện tại.'}
                  {adjustment.operationType === 'COUNT' && 'Nhập tổng số thực tế đang có sau khi đếm.'}
                  {adjustment.operationType === 'WRITE_OFF' && 'Dùng cho hàng hỏng, mất hoặc không còn bán được.'}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Lý do</label>
                <textarea value={adjustment.reason} onChange={(event) => setAdjustment((current) => ({ ...current, reason: event.target.value }))} rows={3} placeholder="Ví dụ: Nhận lô hàng tháng 7, kiểm kê cuối ngày..." className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button type="button" onClick={() => setAdjustTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600">Hủy</button>
              <button type="submit" disabled={submitting} className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Đang lưu...' : 'Xác nhận'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function Metric({ label, value, icon, tone = 'text-gray-950' }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><Icon name={icon} className={`text-xl ${tone}`} /></div>
      <p className={`mt-3 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}
