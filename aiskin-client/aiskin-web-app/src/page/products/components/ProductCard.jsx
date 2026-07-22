import { Link } from 'react-router-dom'
import { App as AntApp } from 'antd'
import Icon from '@/components/common/Icon'
import { useCart } from '@/hook/useCart'

export default function ProductCard({
  id,
  slug,
  brand,
  name,
  category,
  price,
  priceValue,
  originalPrice,
  discountPercent,
  imageUrl,
  targetConcerns = [],
  variants = [],
  totalAvailableQuantity,
  totalOnHandQuantity,
  isFavorite = false,
  isCompared = false,
  onFavoriteToggle,
  onCompareToggle,
}) {
  const canRenderImage = imageUrl && (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('/'))
  const { addItem } = useCart()
  const { message } = AntApp.useApp()
  const activeVariants = variants.filter((variant) => variant.isActive !== false)
  
  // Tính availableQuantity từ product property hoặc từ variant reduce
  const availableQuantity = totalAvailableQuantity ?? totalOnHandQuantity ?? (variants.length > 0 ? activeVariants.reduce(
    (total, variant) => total + Math.max(0, Number(variant.availableQuantity || variant.onHandQuantity || 0)),
    0,
  ) : 0)

  const sellableVariant = variants.length > 0 
    ? (variants.find((variant) => (
        variant.isActive !== false
        && (variant.trackInventory === false || Number(variant.availableQuantity ?? variant.onHandQuantity ?? 0) > 0)
      )) || activeVariants[0])
    : {
        id: null,
        name: name,
        price: priceValue,
        imageUrl: imageUrl,
        availableQuantity: availableQuantity,
        trackInventory: true
      }
  const sellableAvailableQuantity = sellableVariant
    ? Math.max(0, Number(sellableVariant.availableQuantity ?? sellableVariant.onHandQuantity ?? availableQuantity ?? 0))
    : 0
  const hasUntrackedInventory = sellableVariant?.trackInventory === false
  const isSellable = Boolean(sellableVariant) && (hasUntrackedInventory || sellableAvailableQuantity > 0)

  function handleQuickAdd() {
    if (!id || !sellableVariant) return

    addItem({
      id,
      name,
      price: sellableVariant.price ?? priceValue ?? 0,
      imageUrl: sellableVariant.imageUrl || imageUrl,
      slug,
      variantId: sellableVariant.id,
      variantName: sellableVariant.name,
      sku: sellableVariant?.sku,
      unit: sellableVariant?.unit,
      availableQuantity: sellableAvailableQuantity,
      trackInventory: sellableVariant?.trackInventory,
    })
    message.success(`Đã thêm ${name} vào giỏ hàng`)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-pink bg-surface-container-lowest shadow-[0_4px_20px_rgba(103,80,228,0.06)] transition-all hover:shadow-[0_8px_25px_rgba(103,80,228,0.12)]">
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-primary-light">
        {canRenderImage ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
          />
        ) : (
          <Icon name="science" className="text-5xl text-primary/50" />
        )}
        <span className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-caption font-semibold ${isSellable ? 'bg-[#e5f5ed] text-[#256247]' : 'bg-[#fde8e8] text-[#a33a3a]'}`}>
          {isSellable ? 'Còn hàng' : 'Hết hàng'}
        </span>
        {discountPercent ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-[#ff5a36] px-2.5 py-1 text-xs font-black text-white shadow-sm">
            -{discountPercent}%
          </span>
        ) : null}
        <div className="absolute right-3 top-3 flex gap-2">
          {typeof onFavoriteToggle === 'function' ? (
            <button
              type="button"
              onClick={onFavoriteToggle}
              title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors ${isFavorite ? 'border-error/20 text-error' : 'border-border-pink text-on-surface-variant hover:border-primary hover:text-primary'}`}
            >
              <Icon name={isFavorite ? 'favorite' : 'favorite_border'} filled={isFavorite} className="text-lg" />
            </button>
          ) : null}
          {typeof onCompareToggle === 'function' ? (
            <button
              type="button"
              onClick={onCompareToggle}
              title={isCompared ? 'Bỏ so sánh' : 'Thêm vào so sánh'}
              aria-label={isCompared ? 'Bỏ so sánh' : 'Thêm vào so sánh'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors ${isCompared ? 'border-primary/20 text-primary' : 'border-border-pink text-on-surface-variant hover:border-primary hover:text-primary'}`}
            >
              <Icon name={isCompared ? 'check_circle' : 'compare_arrows'} className="text-lg" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex grow flex-col p-4">
        <p className="text-caption text-on-surface-variant">{brand}</p>
        <h3 className="mb-2 min-h-14 text-body-lg font-semibold text-on-surface line-clamp-2">
          <Link to={`/products/${slug}`} className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {name}
          </Link>
        </h3>

        <span className="mb-2 self-start rounded-full bg-primary-light px-3 py-1 text-caption text-tertiary">
          {category}
        </span>

        {targetConcerns?.length > 0 && (
          <div className="mb-auto flex flex-wrap gap-1">
            {targetConcerns.slice(0, 2).map((concern) => (
              <span key={concern} className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] text-on-surface-variant">
                {concern}
              </span>
            ))}
            {targetConcerns.length > 2 && (
              <span className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] text-on-surface-variant">
                +{targetConcerns.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="mb-4 mt-auto flex items-end justify-between gap-3">
          <span>
            <span className={`block text-body-lg font-black ${discountPercent ? 'text-[#ef4b2f]' : 'text-on-surface'}`}>{price}</span>
            {originalPrice ? <span className="text-xs text-on-surface-variant line-through">{originalPrice}</span> : null}
          </span>
          {sellableVariant ? (
            <span className="text-right text-caption text-on-surface-variant">
              {hasUntrackedInventory ? 'Đang bán' : `Kho: ${sellableAvailableQuantity}`}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link
            to={`/products/${slug}`}
            className="min-h-11 rounded-full bg-primary px-4 py-2.5 text-center text-label-md font-semibold text-white shadow-[0_8px_24px_rgba(103,80,228,0.18)] transition-colors hover:bg-tertiary"
          >
            Xem chi tiết
          </Link>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!id || !isSellable}
            title={isSellable ? 'Thêm nhanh vào giỏ hàng' : 'Sản phẩm đang hết hàng'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary-light text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="add_shopping_cart" className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}
