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

export default function RoutineStep({ step, icon, category, title, instruction, frequency, isLast, colorTheme = 'primary', time = 'morning', recommendedProducts = [] }) {
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

        {/* Sản phẩm gợi ý từ AI */}
        {recommendedProducts && recommendedProducts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-dashed border-gray-200">
            <h5 className="text-[12px] uppercase font-bold text-gray-500 mb-3">AI Đề xuất sản phẩm cho bước này</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendedProducts.map((prod, idx) => {
                const seed = encodeURIComponent(prod.brand || prod.name || 'skincare');
                const imgUrl = `https://images.unsplash.com/photo-1620916566398-39f1143ab7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80&seed=${seed}`;
                const matchPercent = prod.match_score ? (prod.match_score * 100).toFixed(0) : null;
                
                return (
                  <div key={idx} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <div className="h-28 w-full bg-gray-100 relative">
                      <img src={imgUrl} alt="product" className="w-full h-full object-cover mix-blend-multiply opacity-90" />
                      {matchPercent && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Phù hợp {matchPercent}%
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5 truncate">{prod.brand || 'No Brand'}</p>
                        <h6 className="text-[13px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">{prod.name}</h6>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-600 mb-1">{prod.price || 'Liên hệ'}</p>
                        {prod.ingredients && (
                          <p className="text-[10px] text-gray-500 line-clamp-1" title={prod.ingredients}>
                            <span className="font-semibold text-gray-600">Gồm:</span> {prod.ingredients}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
