import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/common/Icon'
import ProductCard from './ProductCard'
import { money, toProductCard } from '../productUtils'

function countdownLabel(endsAt, now) {
  if (!now) return ['--', '--', '--']
  const remaining = Math.max(0, new Date(endsAt).getTime() - now)
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0'))
}

export default function FlashDealsSection({ deals, brandMap, categoryMap, favorites, compared }) {
  const trackRef = useRef(null)
  const [now, setNow] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const cards = useMemo(() => deals.map(deal => {
    const card = toProductCard(deal.product, brandMap, categoryMap)
    const discountedVariants = (card.variants || []).map(variant => ({
      ...variant,
      price: Math.round((Number(variant.price) || 0) * (100 - deal.discountPercent) / 100),
    }))
    return {
      ...card,
      priceValue: deal.dealPrice,
      price: money(deal.dealPrice),
      originalPrice: money(deal.originalPrice),
      discountPercent: deal.discountPercent,
      variants: discountedVariants,
    }
  }), [brandMap, categoryMap, deals])

  if (!cards.length) return null
  const [hours, minutes, seconds] = countdownLabel(deals[0].endsAt, now)
  const scroll = direction => trackRef.current?.scrollBy({ left: direction * 620, behavior: 'smooth' })

  return (
    <section className="mb-7 overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#e95f52_0%,#f47d60_58%,#ea946f_100%)] p-4 shadow-[0_18px_42px_rgba(233,95,82,0.20)] md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold md:text-3xl">Flash Deal</h2>
          <div className="flex items-center gap-1.5" aria-label={`Còn ${hours} giờ ${minutes} phút ${seconds} giây`}>
            {[hours, minutes, seconds].map((value, index) => (
              <span key={`${value}-${index}`} className="flex items-center gap-1.5">
                <span className="min-w-11 rounded-lg bg-[#17212b] px-2 py-1.5 text-center font-black tabular-nums">{value}</span>
                {index < 2 ? <span className="font-black">:</span> : null}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Lướt Flash Deal sang trái" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#ef4b2f] shadow hover:bg-white">
            <Icon name="chevron_left" className="text-2xl" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Lướt Flash Deal sang phải" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#ef4b2f] shadow hover:bg-white">
            <Icon name="chevron_right" className="text-2xl" />
          </button>
        </div>
      </div>

      <div ref={trackRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map(product => (
          <div key={product.id} className="w-[250px] shrink-0 snap-start sm:w-[275px]">
            <ProductCard
              {...product}
              isFavorite={favorites.hasId(product.id)}
              isCompared={compared.hasId(product.id)}
              onFavoriteToggle={() => favorites.toggle(product.id)}
              onCompareToggle={() => compared.toggle(product.id)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
