import Icon from '@/components/common/Icon'

/**
 * Map mức độ nghiêm trọng -> style badge + thanh tiến trình.
 */
const SEVERITY_STYLES = {
  optimal: { badge: 'bg-success/10 text-success border-success/20', bar: 'bg-success' },
  moderate: { badge: 'bg-warning/10 text-warning border-warning/20', bar: 'gradient-bg' },
  high: { badge: 'bg-error/10 text-error border-error/20', bar: 'gradient-bg' },
}

/**
 * Thẻ hiển thị một tình trạng da được phát hiện (acne, pigmentation...).
 */
export default function ConditionCard({ icon, title, severityLabel, severity = 'moderate', description, level = 50 }) {
  const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.moderate

  return (
    <div className="bg-surface-container-lowest rounded-[1.5rem] p-5 border border-border-pink shadow-ambient-pink flex items-start gap-4 hover:border-primary transition-colors group">
      <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
        <Icon name={icon} filled />
      </div>
      <div className="grow">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="text-body-lg font-semibold text-on-surface">{title}</h3>
          <span className={`px-3 py-1 rounded-full text-caption font-medium border ${styles.badge}`}>
            {severityLabel}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant mb-3">{description}</p>
        <div className="w-full bg-surface-variant rounded-full h-2 overflow-hidden">
          <div className={`${styles.bar} h-full rounded-full`} style={{ width: `${level}%` }} />
        </div>
      </div>
    </div>
  )
}
