import tokenStorage from './tokenStorage'
import { AI_SCAN_API_URL, RECOMMENDATION_API_URL, resolveAiScanAssetUrl } from '@/config/serviceUrls'

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

function resolveScanImage(record) {
  if (!record || typeof record !== 'object') return record
  return { ...record, imageUrl: resolveAiScanAssetUrl(record.imageUrl) }
}

export async function validateSkin(file) {
  const formData = new FormData()
  formData.append('image', file)

  return requestJson(
    `${AI_SCAN_API_URL}/validate`,
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

  const response = await requestJson(
    `${AI_SCAN_API_URL}/analyze`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    },
    'Phân tích ảnh thất bại',
  )
  if (response.scan_result) response.scan_result = resolveScanImage(response.scan_result)
  return response
}

export async function deleteScanHistory(scanId) {
  return requestJson(
    `${AI_SCAN_API_URL}/history/${scanId}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    'Không thể xóa bản quét này',
  )
}

export async function getScanHistory() {
  const response = await requestJson(
    `${AI_SCAN_API_URL}/history`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Không thể tải lịch sử quét',
  )
  response.data = (response.data || []).map(resolveScanImage)
  return response
}

export async function getScanHistoryDetail(scanId) {
  const response = await requestJson(
    `${AI_SCAN_API_URL}/history/${scanId}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Không thể tải chi tiết bản quét',
  )
  response.data = resolveScanImage(response.data)
  return response
}

export async function generateRoutine(scanId) {
  return requestJson(
    `${AI_SCAN_API_URL}/${scanId}/routine`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Không thể tạo lộ trình',
  )
}

export async function getScanRoutine(scanId) {
  const res = await fetch(`${AI_SCAN_API_URL}/${scanId}/routine`, {
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
    `${RECOMMENDATION_API_URL}/routine/${routineId}`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
    'Không thể tạo gợi ý mỹ phẩm',
  )
}

export async function getRoutineRecommendations(routineId) {
  return requestJson(
    `${RECOMMENDATION_API_URL}/routine/${routineId}`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
    'Không thể lấy gợi ý mỹ phẩm',
  )
}
