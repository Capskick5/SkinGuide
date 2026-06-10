import Icon from '@/components/common/Icon'

/**
 * Một bước trong lộ trình chăm sóc da (timeline).
 */
export default function RoutineStep({ step, icon, category, title, instruction, frequency, isLast }) {
  return (
    <div className="flex gap-4">
      {/* Timeline marker */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full gradient-bg text-white flex items-center justify-center font-semibold shrink-0">
          {step}
        </div>
        {!isLast && <div className="w-0.5 grow bg-border-pink my-1" />}
      </div>

      {/* Card */}
      <div className="flex-1 mb-4 bg-surface-container-lowest border border-border-pink rounded-[1.25rem] p-5 shadow-[0_4px_20px_rgba(103,80,228,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary">
              <Icon name={icon} />
            </span>
            <div>
              <p className="text-caption text-on-surface-variant uppercase tracking-wide">{category}</p>
              <h4 className="text-body-lg font-semibold text-on-surface">{title}</h4>
            </div>
          </div>
          <span className="px-3 py-1 bg-primary-light text-tertiary rounded-full text-caption font-medium whitespace-nowrap">
            {frequency}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant mt-3">{instruction}</p>
      </div>
    </div>
  )
}
