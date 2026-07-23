import { API_BASE_URL } from '@/config/api'
import { tokenStorage } from './tokenStorage'

/**
 * Lỗi API chuẩn hóa, mang theo status + message từ backend (ErrorResponse).
 */
export class ApiError extends Error {
  constructor(status, message, fieldErrors) {
    super(message || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors || null
  }
}

// Hàm refresh được AuthContext gắn vào để httpClient gọi lại khi gặp 401.
let refreshHandler = null
export function setRefreshHandler(fn) {
  refreshHandler = fn
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Gọi API.
 * @param {string} path - đường dẫn bắt đầu bằng '/', vd '/auth/login'
 * @param {object} options - { method, body, auth, _retry }
 */
export async function request(path, { method = 'GET', body, auth = true, headers: extraHeaders = {}, _retry = false } = {}) {
  const headers = { ...extraHeaders }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = tokenStorage.getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // API quản trị phải luôn lấy trạng thái mới nhất khi người dùng bấm làm mới.
    cache: method === 'GET' ? 'no-store' : 'default',
  })

  // Access token hết hạn -> thử refresh một lần rồi gọi lại.
  if (res.status === 401 && auth && !_retry && refreshHandler) {
    const refreshed = await refreshHandler()
    if (refreshed) {
      return request(path, { method, body, auth, headers: extraHeaders, _retry: true })
    }
  }

  if (res.status === 204) return null

  const data = await parseBody(res)

  if (!res.ok) {
    const message = data?.message || (typeof data === 'string' ? data : null)
    throw new ApiError(res.status, message, data?.fieldErrors)
  }

  // Unwrap ApiResponse if it's from a service that wraps responses
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data
  }

  return data
}

export const httpClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
}

export default httpClient
