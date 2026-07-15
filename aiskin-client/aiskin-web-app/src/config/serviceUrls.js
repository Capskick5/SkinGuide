import { API_BASE_URL, resolveApiAssetUrl } from './api'

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '')
}

function serviceUrl(directBaseUrl, directPath, gatewayPath) {
  const direct = trimTrailingSlash(directBaseUrl)
  if (direct) return `${direct}${directPath}`
  return `${trimTrailingSlash(API_BASE_URL)}${gatewayPath}`
}

export const AI_SCAN_API_URL = serviceUrl(
  import.meta.env.VITE_AI_SCAN_BASE_URL,
  '/api/scans',
  '/scans',
)

export const RECOMMENDATION_API_URL = serviceUrl(
  import.meta.env.VITE_RECOMMENDATION_BASE_URL,
  '/api/v1/recommend',
  '/v1/recommend',
)

export function resolveAiScanAssetUrl(value) {
  if (!value || /^(https?:|blob:|data:)/i.test(value)) return value || ''
  const direct = trimTrailingSlash(import.meta.env.VITE_AI_SCAN_BASE_URL)
  if (direct) return `${direct}/${String(value).replace(/^\/+/, '')}`
  return resolveApiAssetUrl(value)
}
