/**
 * Địa chỉ relay server demo.
 * - Ưu tiên biến môi trường VITE_DEMO_SERVER (đặt trong .env).
 * - Mặc định: cùng host với web đang mở, cổng 4000.
 *   (Mở web bằng IP LAN -> điện thoại cùng mạng kết nối được.)
 */
const fromEnv = import.meta.env.VITE_DEMO_SERVER

export const DEMO_SERVER =
  fromEnv && fromEnv.length > 0
    ? fromEnv.replace(/\/$/, '')
    : `http://${window.location.hostname}:4000`

/** URL WebSocket tương ứng. */
export function wsUrl(sessionId) {
  const httpUrl = `${DEMO_SERVER}/ws?session=${encodeURIComponent(sessionId)}`
  return httpUrl.replace(/^http/, 'ws')
}

export default DEMO_SERVER
