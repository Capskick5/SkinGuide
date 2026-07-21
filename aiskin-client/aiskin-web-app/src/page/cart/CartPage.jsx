import { Link, useNavigate } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'
import { resolveImageUrl } from '@/page/products/productUtils'
import { PATHS } from '@/route/paths'

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${Number(value).toLocaleString('vi-VN')} đ`
}

function QtyStepper({ value, onMinus, onPlus, canIncrease }) {
  return (
    <div className="inline-flex h-9 overflow-hidden rounded-md border border-outline-variant bg-white">
      <button
        type="button"
        onClick={onMinus}
        className="flex w-9 items-center justify-center text-on-surface-variant hover:bg-surface-container"
        aria-label="Giảm số lượng"
      >
        <Icon name="remove" className="text-base" />
      </button>
      <span className="flex w-11 items-center justify-center border-x border-outline-variant text-sm font-bold">
        {value}
      </span>
      <button
        type="button"
        onClick={onPlus}
        disabled={!canIncrease}
        className="flex w-9 items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Tăng số lượng"
      >
        <Icon name="add" className="text-base" />
      </button>
    </div>
  )
}

function CartRow({ item, onRemove, onUpdateQty }) {
  const imageSrc = resolveImageUrl(item.imageUrl || item.images?.[0])
  const lineTotal = (item.price || 0) * item.qty
  const hasKnownStock = item.availableQuantity !== null
    && item.availableQuantity !== undefined
    && Number.isFinite(Number(item.availableQuantity))
  const hasStockLimit = item.trackInventory !== false && hasKnownStock
  const unavailable = hasStockLimit && Number(item.availableQuantity) <= 0
  const canIncrease = !hasStockLimit || item.qty < Number(item.availableQuantity)

  return (
    <div className="grid gap-4 border-b border-outline-variant px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_136px_140px] md:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border border-outline-variant bg-surface-container">
          {imageSrc ? (
            <img src={imageSrc} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="spa" className="text-3xl text-secondary/50" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-secondary">{item.brand || 'AiSkin shop'}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold text-on-surface md:text-base">{item.name}</h3>
          {unavailable ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-error">
              <Icon name="error" className="text-base" />
              Sản phẩm hiện đã hết hàng
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {item.slug ? (
              <Link to={`/products/${item.slug}`} className="inline-flex items-center gap-1 text-secondary hover:text-primary">
                <Icon name="visibility" className="text-base" />
                Xem sản phẩm
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(item.lineId)}
              className="inline-flex items-center gap-1 text-on-surface-variant hover:text-error"
            >
              <Icon name="close" className="text-base" />
              Xóa
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-sm text-on-surface-variant md:hidden">Giá tiền</span>
        <div>
          <p className="font-black text-on-surface">{money(item.price || 0)}</p>
          <p className="text-xs text-on-surface-variant line-through">{money((item.price || 0) * 1.18)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-sm text-on-surface-variant md:hidden">Số lượng</span>
        <QtyStepper
          value={item.qty}
          onMinus={() => onUpdateQty(item.lineId, item.qty - 1)}
          onPlus={() => onUpdateQty(item.lineId, item.qty + 1)}
          canIncrease={canIncrease}
        />
      </div>

      <div className="flex items-center justify-between md:block md:text-right">
        <span className="text-sm text-on-surface-variant md:hidden">Thành tiền</span>
        <p className="text-lg font-black text-primary">{money(lineTotal)}</p>
      </div>
    </div>
  )
}

function InvoiceSummary({ totalCount, totalPrice, onCheckout, checkoutDisabled }) {
  return (
    <aside className="sticky top-6 h-fit border-t-4 border-secondary bg-white shadow-[0_20px_60px_rgba(23,32,38,0.08)]">
      <div className="border-b border-outline-variant px-5 py-4">
        <h2 className="text-xl font-black text-on-surface">Hóa đơn của bạn</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{totalCount} sản phẩm trong giỏ</p>
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Tạm tính</span>
          <span className="font-bold">{money(totalPrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Giảm giá</span>
          <span className="font-bold">0 đ</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Phí vận chuyển</span>
          <span className="font-bold text-secondary">Miễn phí</span>
        </div>
        <div className="border-t border-outline-variant pt-4">
          <div className="flex items-end justify-between">
            <span className="font-bold text-on-surface">Tổng cộng</span>
            <span className="text-2xl font-black text-[#ff5a00]">{money(totalPrice)}</span>
          </div>
          <p className="mt-1 text-right text-xs text-on-surface-variant">(Đã bao gồm VAT)</p>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={checkoutDisabled}
          className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-[#ff5a00] text-base font-black text-white shadow-[0_14px_28px_rgba(255,90,0,0.24)] transition-transform hover:scale-[1.01] hover:bg-[#f04f00] disabled:cursor-not-allowed disabled:bg-outline disabled:shadow-none disabled:hover:scale-100"
        >
          <Icon name="shopping_cart_checkout" filled />
          Tiến hành đặt hàng
        </button>
      </div>
      <div className="grid grid-cols-3 border-t border-outline-variant bg-surface-container-low text-center text-xs font-semibold text-on-surface-variant">
        <div className="px-2 py-3">
          <Icon name="verified_user" className="mx-auto mb-1 text-secondary" />
          Chính hãng
        </div>
        <div className="border-x border-outline-variant px-2 py-3">
          <Icon name="local_shipping" className="mx-auto mb-1 text-secondary" />
          Giao nhanh
        </div>
        <div className="px-2 py-3">
          <Icon name="support_agent" className="mx-auto mb-1 text-secondary" />
          Hỗ trợ
        </div>
      </div>
    </aside>
  )
}

export default function CartPage() {
  const { items, totalCount, totalPrice, removeItem, updateQty, clearCart } = useCart()
  const navigate = useNavigate()
  const hasUnavailableItems = items.some((item) => (
    item.trackInventory !== false
    && item.availableQuantity !== null
    && item.availableQuantity !== undefined
    && Number(item.availableQuantity) <= 0
  ))

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 rounded-md bg-[#fff1d8] px-4 py-3 text-sm font-bold text-[#b44200]">
        <Icon name="local_fire_department" filled className="mr-2 align-[-4px] text-[#ff5a00]" />
        Ưu đãi 1.7: miễn phí vận chuyển cho đơn hàng skincare hôm nay
      </div>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">
            <Link to={PATHS.PRODUCTS} className="hover:text-secondary">Trang chủ</Link>
            <span className="mx-2">/</span>
            Giỏ hàng
          </p>
          <h1 className="mt-2 text-3xl font-black text-on-surface">
            Giỏ hàng <span className="font-medium text-on-surface-variant">({totalCount} sản phẩm)</span>
          </h1>
        </div>
        <Link
          to={PATHS.PRODUCTS}
          className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary"
        >
          <Icon name="arrow_back" className="text-base" />
          Tiếp tục mua hàng
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white px-6 py-16 text-center shadow-[0_18px_45px_rgba(23,32,38,0.06)]">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-surface-container">
            <Icon name="shopping_cart" className="text-5xl text-secondary/55" />
          </div>
          <h2 className="mt-5 text-2xl font-black">Giỏ hàng đang trống</h2>
          <p className="mt-2 text-on-surface-variant">Khám phá sản phẩm skincare và thêm món bạn thích vào giỏ.</p>
          <Link
            to={PATHS.PRODUCTS}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-secondary px-6 font-black text-white hover:bg-primary"
          >
            <Icon name="storefront" />
            Xem sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden bg-white shadow-[0_18px_45px_rgba(23,32,38,0.06)]">
            <div className="hidden grid-cols-[minmax(0,1fr)_140px_136px_140px] bg-surface-container-low px-4 py-4 text-sm font-black text-on-surface md:grid">
              <span>Sản phẩm</span>
              <span>Giá tiền</span>
              <span>Số lượng</span>
              <span className="text-right">Thành tiền</span>
            </div>
            {items.map((item) => (
              <CartRow key={item.lineId} item={item} onRemove={removeItem} onUpdateQty={updateQty} />
            ))}
            <div className="flex flex-col gap-3 border-t border-outline-variant px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-error"
              >
                <Icon name="delete_sweep" className="text-base" />
                Xóa toàn bộ giỏ hàng
              </button>
              <div className="text-right">
                <p className="text-sm text-on-surface-variant">Tạm tính</p>
                <p className="text-xl font-black text-[#ff5a00]">{money(totalPrice)}</p>
              </div>
            </div>
          </section>

          <InvoiceSummary
            totalCount={totalCount}
            totalPrice={totalPrice}
            onCheckout={() => navigate(PATHS.CHECKOUT)}
            checkoutDisabled={hasUnavailableItems}
          />
        </div>
      )}
    </div>
  )
}
