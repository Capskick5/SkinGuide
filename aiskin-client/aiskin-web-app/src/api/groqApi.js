import tokenStorage from './tokenStorage'

const RECOMMENDATION_BASE_URL =
  import.meta.env.VITE_RECOMMENDATION_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5001'

// ─── Streaming — yields text chunks ──────────────────────────────────────────
export async function* streamToGroq({ history, userMessage }) {
  const token = tokenStorage.getAccessToken()
  const res = await fetch(`${RECOMMENDATION_BASE_URL}/api/v1/recommend/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message: userMessage,
      history: history
        .filter((item) => ['user', 'assistant', 'model'].includes(item.role))
        .slice(-10)
        .map((item) => ({
          role: item.role === 'model' ? 'assistant' : item.role,
          content: item.text,
        })),
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || 'Không thể kết nối trợ lý AI. Vui lòng thử lại.')
  }
  yield data.data?.content || ''
}
