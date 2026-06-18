export async function analyzeSkin(file) {
  const formData = new FormData()
  formData.append('image', file)
  
  // Trỏ thẳng sang cổng 5000 của AI Scan Service
  const res = await fetch('http://localhost:5000/api/scans/analyze', {
    method: 'POST',
    body: formData,
  })
  
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Phân tích thất bại')
  }
  
  return res.json()
}
