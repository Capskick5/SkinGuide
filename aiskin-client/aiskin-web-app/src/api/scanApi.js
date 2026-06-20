import tokenStorage from './tokenStorage'

export async function validateSkin(file) {
  const formData = new FormData()
  formData.append('image', file)
  
  const token = tokenStorage.getAccessToken()
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch('http://localhost:5000/api/scans/validate', {
    method: 'POST',
    headers,
    body: formData,
  })
  
  if (!res.ok) {
    let errMsg = 'Ảnh không hợp lệ'
    try {
      const errorData = await res.json()
      errMsg = errorData.detail || errorData.message || errMsg
    } catch {
      const errText = await res.text()
      errMsg = errText || errMsg
    }
    throw new Error(errMsg)
  }
  
  return res.json()
}

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
    let errMsg = 'Phân tích thất bại'
    try {
      const errorData = await res.json()
      errMsg = errorData.detail || errorData.message || errMsg
    } catch {
      const errText = await res.text()
      errMsg = errText || errMsg
    }
    throw new Error(errMsg)
  }
  
  return res.json()
}

export async function deleteScanHistory(scanId) {
  const token = tokenStorage.getAccessToken()
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`http://localhost:5000/api/scans/history/${scanId}`, {
    method: 'DELETE',
    headers,
  })

  if (!res.ok) {
    let errMsg = 'Không thể xóa bản quét này'
    try {
      const errorData = await res.json()
      errMsg = errorData.detail || errorData.message || errMsg
    } catch {
      const errText = await res.text()
      errMsg = errText || errMsg
    }
    throw new Error(errMsg)
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
    let errMsg = 'Không thể tải lịch sử quét'
    try {
      const errorData = await res.json()
      errMsg = errorData.detail || errorData.message || errMsg
    } catch {
      const errText = await res.text()
      errMsg = errText || errMsg
    }
    throw new Error(errMsg)
  }

  return res.json()
}
