import tokenStorage from './tokenStorage'

export async function analyzeSkin(file) {
  const formData = new FormData()
  formData.append('image', file)
  
  const token = tokenStorage.getAccessToken()
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  // Trỏ thẳng sang cổng 5000 của AI Scan Service
  const res = await fetch('http://localhost:5000/api/scans/analyze', {
    method: 'POST',
    headers,
    body: formData,
  })
  
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Phân tích thất bại')
  }
  
  return res.json()
}

export async function getScanHistory() {
  const token = tokenStorage.getAccessToken()
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch('http://localhost:5000/api/scans/history', {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || 'Không thể tải lịch sử quét')
  }

  return res.json()
}
