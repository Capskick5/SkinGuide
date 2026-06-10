import { useState } from 'react'
import Icon from '@/components/common/Icon'
import RoutineStep from './components/RoutineStep'

/** Dữ liệu demo - sau này lấy từ Skincare Service (SkincareRoutine + RoutineStep). */
const ROUTINES = {
  morning: [
    { step: 1, icon: 'wash', category: 'Sữa rửa mặt', title: 'Sữa rửa mặt tạo bọt dịu nhẹ', instruction: 'Massage lên da ẩm trong 30 giây, sau đó rửa lại bằng nước ấm.', frequency: 'Hằng ngày' },
    { step: 2, icon: 'science', category: 'Serum', title: 'Serum Vitamin C', instruction: 'Thoa 3-4 giọt để làm sáng da và bảo vệ khỏi tác hại môi trường.', frequency: 'Hằng ngày' },
    { step: 3, icon: 'opacity', category: 'Dưỡng ẩm', title: 'Kem dưỡng không dầu', instruction: 'Thoa đều một lớp để cấp ẩm mà không gây bít tắc lỗ chân lông.', frequency: 'Hằng ngày' },
    { step: 4, icon: 'wb_sunny', category: 'Chống nắng', title: 'Kem chống nắng SPF 50', instruction: 'Thoa một lớp dày. Thoa lại sau mỗi 2 giờ khi ở ngoài trời.', frequency: 'Hằng ngày' },
  ],
  evening: [
    { step: 1, icon: 'wash', category: 'Làm sạch', title: 'Làm sạch kép', instruction: 'Dùng dầu tẩy trang trước, sau đó dùng sữa rửa mặt để loại bỏ bụi bẩn.', frequency: 'Hằng ngày' },
    { step: 2, icon: 'spa', category: 'Đặc trị', title: 'Đặc trị Retinol', instruction: 'Thoa một lượng bằng hạt đậu để cải thiện nếp nhăn và kết cấu da.', frequency: '3 lần/tuần' },
    { step: 3, icon: 'opacity', category: 'Dưỡng ẩm', title: 'Kem dưỡng ban đêm', instruction: 'Khóa ẩm các hoạt chất và hỗ trợ phục hồi da qua đêm.', frequency: 'Hằng ngày' },
  ],
}

/**
 * Trang lộ trình chăm sóc da với toggle Morning / Evening.
 */
export default function RoutinePage() {
  const [time, setTime] = useState('morning')
  const steps = ROUTINES[time]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">Lộ trình chăm sóc da</h1>
        <p className="text-body-md text-on-surface-variant">
          Cá nhân hóa cho da hỗn hợp · Lộ trình 4–6 tuần
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Steps */}
        <div className="lg:col-span-8">
          {/* Toggle */}
          <div className="inline-flex p-1 bg-surface-container-low rounded-full border border-border-pink/50 mb-8">
            {[
              { key: 'morning', label: 'Buổi sáng', icon: 'wb_sunny' },
              { key: 'evening', label: 'Buổi tối', icon: 'dark_mode' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTime(t.key)}
                className={[
                  'px-6 py-2 rounded-full text-label-md flex items-center gap-2 transition-all',
                  time === t.key ? 'gradient-bg text-white shadow-sm' : 'text-on-surface-variant hover:text-primary',
                ].join(' ')}
              >
                <Icon name={t.icon} className="text-sm" />
                {t.label}
              </button>
            ))}
          </div>

          <div>
            {steps.map((s, i) => (
              <RoutineStep key={s.step} {...s} isLast={i === steps.length - 1} />
            ))}
          </div>
        </div>

        {/* Summary panel */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container-lowest border border-border-pink rounded-xl p-6 shadow-ambient-pink">
            <h3 className="text-headline-md text-on-surface mb-4">Tóm tắt lộ trình</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center justify-between text-body-md">
                <span className="text-on-surface-variant">Tổng số bước</span>
                <span className="font-semibold text-on-surface">{steps.length}</span>
              </li>
              <li className="flex items-center justify-between text-body-md">
                <span className="text-on-surface-variant">Thời gian ước tính</span>
                <span className="font-semibold text-on-surface">~8 phút</span>
              </li>
              <li className="flex items-center justify-between text-body-md">
                <span className="text-on-surface-variant">Thời lượng lộ trình</span>
                <span className="font-semibold text-on-surface">4–6 tuần</span>
              </li>
            </ul>
            <button
              type="button"
              className="w-full py-3 rounded-full gradient-bg text-white text-label-md font-medium shadow-sm hover:opacity-90 transition-opacity mb-3"
            >
              Bắt đầu theo dõi
            </button>
            <button
              type="button"
              className="w-full py-3 rounded-full border-2 border-border-pink text-primary text-label-md hover:bg-surface-soft transition-colors"
            >
              Tạo lại lộ trình
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
