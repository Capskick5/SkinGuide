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
  match,
  price,
  priceValue,
  rating,
  imageUrl,
  targetConcerns = [],
}) {
  const canRenderImage = imageUrl && (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('/'))
  const { addItem } = useCart()
  const { message } = AntApp.useApp()

  function handleQuickAdd() {
    if (!id) return

    addItem({
      id,
      name,
      price: priceValue || 0,
      imageUrl,
      slug,
    })
    message.success(`Đã thêm ${name} vào giỏ hàng`)
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-pink bg-surface-container-lowest shadow-[0_4px_20px_rgba(103,80,228,0.06)] transition-all hover:shadow-[0_8px_25px_rgba(103,80,228,0.12)]">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-primary-light">
        {canRenderImage ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Icon name="science" className="text-5xl text-primary/50" />
        )}
        {match ? (
          <span className="gradient-bg absolute right-3 top-3 rounded-full px-3 py-1 text-caption font-medium text-white">
            Phù hợp {match}%
          </span>
        ) : null}
      </div>

      <div className="flex grow flex-col p-5">
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

        <div className="mb-4 mt-auto flex items-center justify-between">
          <span className="text-body-lg font-semibold text-on-surface">{price}</span>
          {rating ? (
            <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
              <Icon name="star" filled className="text-base text-warning" />
              {rating}
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
            disabled={!id}
            title="Thêm nhanh vào giỏ hàng"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary-light text-primary transition-all hover:bg-primary hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="add_shopping_cart" className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}
