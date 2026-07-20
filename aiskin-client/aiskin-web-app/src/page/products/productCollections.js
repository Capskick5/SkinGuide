import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { favoriteApi } from '@/api/favoriteApi'

const FAVORITES_KEY = 'aiskin.products.favorites'
const COMPARE_KEY = 'aiskin.products.compare'
const CHANGE_EVENT = 'aiskin:product-collections-change'
const COMPARE_LIMIT = 3

function readIds(storageKey) {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((item) => String(item)).filter(Boolean))]
  } catch {
    return []
  }
}

function writeIds(storageKey, ids) {
  if (typeof window === 'undefined') return

  const next = [...new Set(ids.map((item) => String(item)).filter(Boolean))]
  localStorage.setItem(storageKey, JSON.stringify(next))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function toggleId(storageKey, id, limit) {
  if (!id) return []

  const current = readIds(storageKey)
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : limit && current.length >= limit
      ? [...current.slice(1), id]
      : [...current, id]

  writeIds(storageKey, next)
  return next
}

function clearIds(storageKey) {
  writeIds(storageKey, [])
}

/** Hook lưu id trong localStorage (dùng cho So sánh và cho Yêu thích khi chưa đăng nhập). */
function useStoredIds(storageKey, limit) {
  const [ids, setIds] = useState(() => readIds(storageKey))

  useEffect(() => {
    const sync = () => setIds(readIds(storageKey))

    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [storageKey])

  const toggle = useCallback(
    (id) => {
      const next = toggleId(storageKey, id, limit)
      setIds(next)
      return next
    },
    [limit, storageKey],
  )

  const clear = useCallback(() => {
    clearIds(storageKey)
    setIds([])
  }, [storageKey])

  return {
    ids,
    count: ids.length,
    hasId: useCallback((id) => ids.includes(id), [ids]),
    toggle,
    clear,
  }
}

/**
 * Yêu thích: persist trên server khi đã đăng nhập, localStorage khi là khách.
 * Khi đăng nhập, yêu thích lưu ở localStorage của khách được gộp (merge) lên server một lần.
 * Giữ nguyên interface { ids, count, hasId, toggle, clear } để các trang dùng không đổi.
 */
export function useFavoriteProducts() {
  const { isAuthenticated, user } = useAuth()
  const userId = user?.id ?? null
  const guest = useStoredIds(FAVORITES_KEY)
  const [serverIds, setServerIds] = useState([])
  // Gắn dữ liệu server theo userId đã tải để không lộ yêu thích của user trước khi đổi tài khoản.
  const [loadedFor, setLoadedFor] = useState(null)

  useEffect(() => {
    let alive = true

    if (!isAuthenticated || !userId) {
      // Khi chưa đăng nhập ta trả về hook localStorage (guest) nên không đụng tới serverIds.
      return undefined
    }

    void (async () => {
      try {
        const local = readIds(FAVORITES_KEY)
        const list = local.length > 0 ? await favoriteApi.merge(local) : await favoriteApi.list()
        if (!alive) return
        if (local.length > 0) clearIds(FAVORITES_KEY) // đã chuyển lên server
        setServerIds(Array.isArray(list) ? list.map(String) : [])
        setLoadedFor(userId)
      } catch {
        // giữ nguyên trạng thái; sẽ hiển thị guest cho tới khi tải được
      }
    })()

    return () => {
      alive = false
    }
  }, [isAuthenticated, userId])

  const toggle = useCallback(
    async (rawId) => {
      const id = rawId ? String(rawId) : ''
      if (!id) return
      const has = serverIds.includes(id)
      setServerIds((prev) => (has ? prev.filter((x) => x !== id) : [id, ...prev]))
      try {
        const list = has ? await favoriteApi.remove(id) : await favoriteApi.add(id)
        setServerIds(Array.isArray(list) ? list.map(String) : [])
      } catch {
        try {
          const list = await favoriteApi.list()
          setServerIds(Array.isArray(list) ? list.map(String) : [])
        } catch {
          // giữ trạng thái optimistic nếu không tải lại được
        }
      }
    },
    [serverIds],
  )

  const clear = useCallback(async () => {
    setServerIds([])
    try {
      await favoriteApi.clear()
    } catch {
      // bỏ qua lỗi mạng khi xóa
    }
  }, [])

  if (isAuthenticated && userId && loadedFor === userId) {
    return {
      ids: serverIds,
      count: serverIds.length,
      hasId: (id) => serverIds.includes(String(id)),
      toggle,
      clear,
    }
  }

  return guest
}

export function useComparedProducts() {
  return useStoredIds(COMPARE_KEY, COMPARE_LIMIT)
}

export function getFavoriteIds() {
  return readIds(FAVORITES_KEY)
}

export function getComparedIds() {
  return readIds(COMPARE_KEY)
}

export function formatCollectionCount(count) {
  return count > 0 ? String(count) : ''
}

export { COMPARE_LIMIT, COMPARE_KEY, FAVORITES_KEY }
