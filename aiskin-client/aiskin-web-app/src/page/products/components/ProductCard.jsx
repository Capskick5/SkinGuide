import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'
import ProductCollectionButtons from './ProductCollectionButtons'

export default function ProductCard({
  slug,
  brand,
  name,
  category,
  match,
  price,
  rating,
  imageUrl,
  isFavorite = false,
  isCompared = false,
  onFavoriteToggle,
  onCompareToggle,
}) {
  const canRenderImage = imageUrl && (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith('/'))

  return (
    <div className="bg-surface-container-lowest border border-border-pink rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(103,80,228,0.06)] hover:shadow-[0_8px_25px_rgba(103,80,228,0.12)] transition-all flex flex-col">
      <div className="relative h-40 bg-primary-light flex items-center justify-center overflow-hidden">
        {canRenderImage ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="science" className="text-5xl text-primary/50" />
        )}
        {match ? (
          <span className="absolute top-3 right-3 px-3 py-1 gradient-bg text-white rounded-full text-caption font-medium">
            Phù hợp {match}%
          </span>
        ) : null}
      </div>

      <div className="p-5 flex flex-col grow">
        <p className="text-caption text-on-surface-variant">{brand}</p>
        <h3 className="text-body-lg font-semibold text-on-surface mb-2">{name}</h3>

        <span className="self-start px-3 py-1 bg-primary-light text-tertiary rounded-full text-caption mb-auto">
          {category}
        </span>

        <div className="flex items-center justify-between mb-4">
          <span className="text-body-lg font-semibold text-on-surface">{price}</span>
          {rating ? (
            <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
              <Icon name="star" filled className="text-warning text-base" />
              {rating}
            </span>
          ) : null}
        </div>

        <Link
          to={`/products/${slug}`}
          className="w-full py-2.5 rounded-full bg-primary text-white text-label-md font-semibold hover:bg-tertiary transition-colors text-center shadow-[0_8px_24px_rgba(103,80,228,0.18)] mb-3"
        >
          Xem chi tiết
        </Link>

        <ProductCollectionButtons
          compact
          isFavorite={isFavorite}
          isCompared={isCompared}
          onFavoriteToggle={onFavoriteToggle}
          onCompareToggle={onCompareToggle}
        />
      </div>
    </div>
  )
}
