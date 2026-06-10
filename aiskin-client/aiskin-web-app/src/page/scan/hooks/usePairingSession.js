import { useCallback, useEffect, useRef, useState } from 'react'
import { DEMO_SERVER, wsUrl } from '@/config/demoServer'

/**
 * Hook phiên ghép nối điện thoại - kết nối relay server thật.
 *
 * Luồng:
 *  1. startSession(): POST /api/session -> nhận sessionId.
 *  2. Mở WebSocket /ws?session=... để nhận trạng thái + ảnh real-time.
 *  3. Điện thoại quét QR (chứa server URL + sessionId), kết nối và upload ảnh.
 *  4. Server broadcast -> hook cập nhật images & status.
 *
 * status: 'idle' | 'waiting' | 'connected' | 'received'
 */
const SESSION_TTL = 600 // giây (khớp server)

export function usePairingSession() {
  const [sessionId, setSessionId] = useState('')
  const [status, setStatus] = useState('idle')
  const [secondsLeft, setSecondsLeft] = useState(SESSION_TTL)
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const wsRef = useRef(null)

  const closeWs = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const startSession = useCallback(async () => {
    setError('')
    try {
      const res = await fetch(`${DEMO_SERVER}/api/session`, { method: 'POST' })
      if (!res.ok) throw new Error('Không tạo được phiên')
      const { sessionId: id } = await res.json()

      setSessionId(id)
      setStatus('waiting')
      setSecondsLeft(SESSION_TTL)
      setImages([])

      // Mở WebSocket lắng nghe.
      closeWs()
      const ws = new WebSocket(wsUrl(id))
      wsRef.current = ws
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'status') {
          setStatus((prev) => (prev === 'received' ? prev : msg.status))
        } else if (msg.type === 'image') {
          setStatus('received')
          setImages((prev) => {
            if (prev.some((p) => p.id === msg.image.id)) return prev
            return [...prev, { ...msg.image, src: `${DEMO_SERVER}${msg.image.url}` }]
          })
        }
      }
      ws.onerror = () => setError('Mất kết nối tới server demo.')
    } catch (e) {
      setError(e.message || 'Lỗi kết nối server demo. Đã chạy `npm start` chưa?')
      setStatus('idle')
    }
  }, [])

  const reset = useCallback(() => {
    closeWs()
    setStatus('idle')
    setSessionId('')
    setImages([])
    setError('')
    setSecondsLeft(SESSION_TTL)
  }, [])

  // Đếm ngược.
  useEffect(() => {
    if (status === 'idle') return undefined
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => () => closeWs(), [])

  return { sessionId, status, secondsLeft, images, error, startSession, reset }
}

export default usePairingSession
