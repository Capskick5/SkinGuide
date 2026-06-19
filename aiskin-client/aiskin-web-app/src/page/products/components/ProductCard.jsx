import Icon from '@/components/common/Icon'

export default function ProductCard({
  id,
  brand,
  name,
  category,
  match,
  price,
  rating,
  ingredients = [],
  reason,
  imageUrl,
  onViewDetails,
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

        <span className="self-start px-3 py-1 bg-primary-light text-tertiary rounded-full text-caption mb-3">
          {category}
        </span>

        {ingredients.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {ingredients.map((ing) => (
              <span
                key={ing}
                className="px-2.5 py-1 bg-surface-soft border border-border-pink/60 rounded-full text-caption text-on-surface-variant"
              >
                {ing}
              </span>
            ))}
          </div>
        ) : null}

        <p className="text-caption text-on-surface-variant mb-4 grow">{reason}</p>

        <div className="flex items-center justify-between mb-4">
          <span className="text-body-lg font-semibold text-on-surface">{price}</span>
          {rating ? (
            <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
              <Icon name="star" filled className="text-warning text-base" />
              {rating}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewDetails?.(id)}
            className="flex-1 py-2.5 rounded-full gradient-bg text-white text-label-md hover:opacity-90 transition-opacity"
          >
            Xem chi tiết
          </button>
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-border-pink flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
            aria-label="Lưu"
          >
            <Icon name="favorite" className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}
