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
  imageUrl,
  targetConcerns = [],
  variants = [],
  totalAvailableQuantity,
  totalOnHandQuantity,
}) {
  const canRenderImage = imageUrl && (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('/'))
  const { addItem } = useCart()
  const { message } = AntApp.useApp()
  const activeVariants = variants.filter((variant) => variant.isActive !== false)
  const hasUntrackedInventory = variants.length > 0 ? activeVariants.some((variant) => variant.trackInventory === false) : false
  
  // Tính availableQuantity từ product property hoặc từ variant reduce
  const availableQuantity = totalAvailableQuantity ?? totalOnHandQuantity ?? (variants.length > 0 ? activeVariants.reduce(
    (total, variant) => total + Math.max(0, Number(variant.availableQuantity || variant.onHandQuantity || 0)),
    0,
  ) : 0)

  const sellableVariant = variants.length > 0 
    ? (variants.find((variant) => (
        variant.isActive !== false
        && (variant.trackInventory === false || Number(variant.availableQuantity || variant.onHandQuantity || availableQuantity) > 0)
      )) || activeVariants[0])
    : {
        id: null,
        name: name,
        price: priceValue,
        imageUrl: imageUrl,
        availableQuantity: availableQuantity,
        trackInventory: true
      }

  function handleQuickAdd() {
    if (!id || !sellableVariant) return

    addItem({
      id,
      name,
      price: sellableVariant.price || priceValue || 0,
      imageUrl: sellableVariant.imageUrl || imageUrl,
      slug,
      variantId: sellableVariant.id,
      variantName: sellableVariant.name,
      sku: sellableVariant?.sku,
      unit: sellableVariant?.unit,
      availableQuantity: sellableVariant?.availableQuantity ?? availableQuantity,
      trackInventory: sellableVariant?.trackInventory,
    })
    message.success(`Đã thêm ${name} vào giỏ hàng`)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-pink bg-surface-container-lowest shadow-[0_4px_20px_rgba(103,80,228,0.06)] transition-all hover:shadow-[0_8px_25px_rgba(103,80,228,0.12)]">
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-primary-light">
        {canRenderImage ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Icon name="science" className="text-5xl text-primary/50" />
        )}
        <span className={`absolute right-3 top-3 rounded-md px-2.5 py-1 text-caption font-semibold ${sellableVariant && (hasUntrackedInventory || availableQuantity > 0) ? 'bg-[#e5f5ed] text-[#256247]' : 'bg-[#fde8e8] text-[#a33a3a]'}`}>
          {sellableVariant && (hasUntrackedInventory || availableQuantity > 0) ? 'Còn hàng' : 'Hết hàng'}
        </span>
      </div>

      <div className="flex grow flex-col p-4">
        <p className="text-caption text-on-surface-variant">{brand}</p>
        <h3 className="mb-2 min-h-14 text-body-lg font-semibold text-on-surface line-clamp-2">{name}</h3>

        <span className="mb-2 self-start rounded-full bg-primary-light px-3 py-1 text-caption text-tertiary">
          {category}
        </span>

        {targetConcerns?.length > 0 && (
          <div className="mb-auto flex flex-wrap gap-1">
            {targetConcerns.slice(0, 2).map((concern, i) => (
              <span key={i} className="rounded-md bg-surface-soft px-2 py-0.5 text-[10px] text-on-surface-variant">
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
          <span className="text-body-lg font-semibold text-on-surface">{price}</span>
          {sellableVariant ? (
            <span className="text-right text-caption text-on-surface-variant">
              {hasUntrackedInventory ? 'Đang bán' : `Kho: ${availableQuantity}`}
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
            disabled={!id || !sellableVariant || (!hasUntrackedInventory && availableQuantity <= 0)}
            title={sellableVariant && (hasUntrackedInventory || availableQuantity > 0) ? 'Thêm nhanh vào giỏ hàng' : 'Sản phẩm đang hết hàng'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary-light text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="add_shopping_cart" className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}
