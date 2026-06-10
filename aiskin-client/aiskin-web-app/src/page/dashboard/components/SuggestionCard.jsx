import { Link } from 'react-router-dom'
import Icon from '@/components/common/Icon'

/**
 * Card gợi ý hành động trên trang chủ.
 */
export default function SuggestionCard({ icon, title, description, cta, to }) {
  return (
    <Link
      to={to}
      className="bg-surface-container-lowest border border-border-pink rounded-lg p-6 shadow-[0_4px_20px_rgba(103,80,228,0.06)] hover:shadow-[0_8px_25px_rgba(103,80,228,0.1)] transition-all duration-300 flex flex-col h-full group"
    >
      <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
        <Icon name={icon} />
      </div>
      <h3 className="text-headline-md text-on-surface mb-2">{title}</h3>
      <p className="text-body-md text-on-surface-variant grow mb-6">{description}</p>
      <div className="mt-auto flex items-center text-primary text-label-md group-hover:translate-x-1 transition-transform">
        {cta}
        <Icon name="arrow_forward" className="text-sm ml-1" />
      </div>
    </Link>
  )
}
