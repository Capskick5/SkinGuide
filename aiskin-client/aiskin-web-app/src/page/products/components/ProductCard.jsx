import { useState } from 'react'
import Icon from '@/components/common/Icon'
import { useCart } from '@/context/CartContext'
import { useCartDrawer } from '@/context/CartDrawerContext'

/**
 * Thẻ sản phẩm gợi ý với badge % phù hợp và thành phần chính.
 * Có nút "Thêm vào giỏ" tích hợp CartContext.
 */
export default function ProductCard({ brand, name, category, match, price, rating, ingredients = [], reason }) {
  const { addItem } = useCart()
  const { openCart } = useCartDrawer()
  const [added, setAdded] = useState(false)

  function handleAddToCart() {
    addItem({ brand, name, category, match, price, rating })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="bg-surface-container-lowest border border-border-pink rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(103,80,228,0.06)] hover:shadow-[0_8px_25px_rgba(103,80,228,0.12)] transition-all flex flex-col">
      {/* Image placeholder + match badge */}
      <div className="relative h-40 bg-primary-light flex items-center justify-center">
        <Icon name="science" className="text-5xl text-primary/50" />
        <span className="absolute top-3 right-3 px-3 py-1 gradient-bg text-white rounded-full text-caption font-medium">
          Phù hợp {match}%
        </span>
      </div>

      <div className="p-5 flex flex-col grow">
        <p className="text-caption text-on-surface-variant">{brand}</p>
        <h3 className="text-body-lg font-semibold text-on-surface mb-2">{name}</h3>

        <span className="self-start px-3 py-1 bg-primary-light text-tertiary rounded-full text-caption mb-3">
          {category}
        </span>

        <div className="flex flex-wrap gap-2 mb-4">
          {ingredients.map((ing) => (
            <span key={ing} className="px-2.5 py-1 bg-surface-soft border border-border-pink/60 rounded-full text-caption text-on-surface-variant">
              {ing}
            </span>
          ))}
        </div>

        <p className="text-caption text-on-surface-variant mb-4 grow">{reason}</p>

        <div className="flex items-center justify-between mb-4">
          <span className="text-body-lg font-semibold text-on-surface">{price}</span>
          <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
            <Icon name="star" filled className="text-warning text-base" />
            {rating}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Add to cart */}
          <button
            type="button"
            id={`add-to-cart-${name.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={handleAddToCart}
            className={[
              'flex-1 py-2.5 rounded-full text-label-md font-semibold transition-all flex items-center justify-center gap-1.5',
              added
                ? 'bg-green-500 text-white scale-95'
                : 'gradient-bg text-white hover:opacity-90 hover:scale-[1.02]',
            ].join(' ')}
          >
            <Icon name={added ? 'check_circle' : 'add_shopping_cart'} className="text-base" />
            {added ? 'Đã thêm!' : 'Thêm vào giỏ'}
          </button>

          {/* Wishlist */}
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-border-pink flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
            aria-label="Lưu"
          >
            <Icon name="favorite" className="text-xl" />
          </button>
        </div>

        {/* Quick view cart link (after add) */}
        {added && (
          <button
            type="button"
            onClick={openCart}
            className="mt-2 text-caption text-primary font-medium hover:underline transition-all text-center"
          >
            Xem giỏ hàng →
          </button>
        )}
      </div>
    </div>
  )
}
