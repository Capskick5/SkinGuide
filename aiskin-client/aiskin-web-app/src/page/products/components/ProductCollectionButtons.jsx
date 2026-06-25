import Icon from '@/components/common/Icon'

export default function ProductCollectionButtons({
  onFavoriteToggle,
  onCompareToggle,
  isFavorite = false,
  isCompared = false,
  favoriteLabel = 'Yêu thích',
  compareLabel = 'So sánh',
  compact = false,
}) {
  const baseButton = compact
    ? 'w-10 h-10 rounded-full border flex items-center justify-center transition-colors'
    : 'px-4 py-2.5 rounded-lg border flex items-center justify-center gap-2 text-label-md font-medium transition-colors'

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-2'}>
      <button
        type="button"
        onClick={onFavoriteToggle}
        className={[
          baseButton,
          isFavorite
            ? 'border-error/20 bg-error/10 text-error'
            : 'border-border-pink text-on-surface-variant hover:text-primary hover:border-primary',
        ].join(' ')}
        aria-pressed={isFavorite}
        aria-label={favoriteLabel}
        title={favoriteLabel}
      >
        <Icon name={isFavorite ? 'favorite' : 'favorite_border'} filled={isFavorite} className="text-xl" />
        {!compact ? favoriteLabel : null}
      </button>

      <button
        type="button"
        onClick={onCompareToggle}
        className={[
          baseButton,
          isCompared
            ? 'border-primary/20 bg-primary-light text-primary'
            : 'border-border-pink text-on-surface-variant hover:text-primary hover:border-primary',
        ].join(' ')}
        aria-pressed={isCompared}
        aria-label={compareLabel}
        title={compareLabel}
      >
        <Icon name="compare_arrows" className="text-xl" />
        {!compact ? compareLabel : null}
      </button>
    </div>
  )
}
