import tokenStorage from './tokenStorage'

const AI_SCAN_BASE_URL =
  import.meta.env.VITE_AI_SCAN_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000'

const RECOMMENDATION_BASE_URL =
  import.meta.env.VITE_RECOMMENDATION_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5001'

function authHeaders(extraHeaders = {}) {
  const token = tokenStorage.getAccessToken()
  return token
    ? { ...extraHeaders, Authorization: `Bearer ${token}` }
    : extraHeaders
}

async function readError(res, fallbackMessage) {
  let message = fallbackMessage
  try {
    const data = await res.json()
    message = data.detail || data.message || message
  } catch {
    try {
      const text = await res.text()
      if (text) message = text
    } catch {
      // Keep the fallback message.
    }
  }

  if (res.status === 401 || res.status === 403) {
    return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
  }

  return message
}

async function requestJson(url, options, fallbackMessage) {
  const res = await fetch(url, options)

  if (!res.ok) {
    throw new Error(await readError(res, fallbackMessage))
  }

  return res.json()
}

export async function validateSkin(file) {
  const formData = new FormData()
  formData.append('image', file)

  return requestJson(
    `${AI_SCAN_BASE_URL}/api/scans/validate`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    },
    'Ảnh không hợp lệ',
  )
}

export async function analyzeSkin(file) {
  const formData = new FormData()
  formData.append('image', file)

  return requestJson(
    `${AI_SCAN_BASE_URL}/api/scans/analyze`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    },
    'Phân tích ảnh thất bại',
  )
}

export async function deleteScanHistory(scanId) {
  return requestJson(
    `${AI_SCAN_BASE_URL}/api/scans/history/${scanId}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Không thể xóa bản quét này',
  )
}

export async function getScanHistory() {
  return requestJson(
    `${AI_SCAN_BASE_URL}/api/scans/history`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Không thể tải lịch sử quét',
  )
}

export async function generateRoutine(scanId) {
  return requestJson(
    `${AI_SCAN_BASE_URL}/api/scans/${scanId}/routine`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Không thể tạo lộ trình',
  )
}

export async function getScanRoutine(scanId) {
  const res = await fetch(`${AI_SCAN_BASE_URL}/api/scans/${scanId}/routine`, {
    method: 'GET',
    headers: authHeaders(),
  })

  if (!res.ok) {
    if (res.status === 404) return { status: 'not_found' }
    throw new Error(await readError(res, 'Không thể lấy thông tin lộ trình'))
  }

  return res.json()
}

export async function generateRecommendations(routineId) {
  return requestJson(
    `${RECOMMENDATION_BASE_URL}/api/v1/recommend/routine/${routineId}`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Không thể tạo gợi ý mỹ phẩm',
  )
}

export async function getRoutineRecommendations(routineId) {
  return requestJson(
    `${RECOMMENDATION_BASE_URL}/api/v1/recommend/routine/${routineId}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Không thể lấy gợi ý mỹ phẩm',
  )
}
