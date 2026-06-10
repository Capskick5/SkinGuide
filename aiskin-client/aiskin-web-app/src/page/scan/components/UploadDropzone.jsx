import { useRef, useState } from 'react'
import Icon from '@/components/common/Icon'

/**
 * Vùng kéo-thả / chọn ảnh khuôn mặt.
 * onFileSelected(file) được gọi khi người dùng chọn ảnh hợp lệ.
 */
export default function UploadDropzone({ onFileSelected }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')

  const handleFiles = (files) => {
    if (files && files.length > 0) {
      setFileName(files[0].name)
      onFileSelected?.(files[0])
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragActive(false)
      }}
      onDrop={onDrop}
      className={[
        'w-full h-[500px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative overflow-hidden group shadow-[0_8px_30px_rgba(103,80,228,0.06)]',
        dragActive
          ? 'border-primary bg-primary-light'
          : 'border-border-pink bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-soft',
      ].join(' ')}
    >
      <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
        <Icon name="face" className="text-5xl text-primary" />
      </div>
      <h3 className="text-headline-md text-on-surface mb-2">
        {fileName ? `Đã chọn: ${fileName}` : 'Kéo & thả ảnh vào đây'}
      </h3>
      <p className="text-body-md text-on-surface-variant mb-8">
        hoặc nhấn để chọn ảnh từ thiết bị
      </p>
      <span className="px-8 py-3 rounded-full gradient-bg text-white text-label-md font-medium shadow-md hover:shadow-lg transition-all">
        Chọn ảnh
      </span>
      <p className="text-caption text-outline mt-6 flex items-center gap-2">
        <Icon name="info" className="text-[16px]" />
        Hỗ trợ JPG, PNG (tối đa 10MB)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
