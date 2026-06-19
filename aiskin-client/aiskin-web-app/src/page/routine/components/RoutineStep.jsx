import Icon from '@/components/common/Icon'

/**
 * Một bước trong lộ trình chăm sóc da (timeline).
 */
const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-border-pink/50' }
}

export default function RoutineStep({ step, icon, category, title, instruction, frequency, isLast, colorTheme = 'primary', time = 'morning' }) {
  const theme = COLOR_MAP[colorTheme] || COLOR_MAP.primary
  const markerStyle = 'bg-black shadow-[0_2px_10px_rgba(0,0,0,0.15)]'

  return (
    <div className="flex gap-4">
      {/* Timeline marker */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 text-sm rounded-full text-white flex items-center justify-center font-bold shrink-0 mt-1 ${markerStyle}`}>
          {step}
        </div>
        {!isLast && <div className="w-0.5 grow my-1 rounded-full bg-slate-200" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 bg-surface-container-lowest border rounded-[10px] p-5 shadow-sm transition-colors hover:shadow-md ${theme.border}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${theme.bg} ${theme.text}`}>
              <Icon name={icon} className="text-[18px]" />
            </span>
            <div>
              <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${theme.text}`}>{category}</p>
              <h4 className="text-label-md font-bold text-on-surface leading-tight">{title}</h4>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${theme.bg} ${theme.text}`}>
            {frequency}
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant mt-3 leading-relaxed border-l-2 pl-3 ml-1" style={{ borderLeftColor: 'currentColor', color: 'inherit' }}>
          <span className="text-on-surface-variant">{instruction}</span>
        </p>
      </div>
    </div>
  )
}
