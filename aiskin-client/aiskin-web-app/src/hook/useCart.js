/**
 * useCart – quản lý giỏ hàng toàn cục.
 * - localStorage là store trực tiếp (UX tức thì + đồng bộ đa tab).
 * - Khi đã đăng nhập: mirror mọi thay đổi lên server và merge giỏ khách ↔ server lúc đăng nhập,
 *   để giỏ đồng bộ đa thiết bị. Giá/tồn kho vẫn được kiểm chứng lại ở bước checkout.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { cartApi } from '@/api/cartApi'
import { cappedQuantity, cartLineId, normalizeCartItem } from './cartUtils'

const CART_KEY = 'aiskin.cart'
const CHANGE_EVENT = 'aiskin:cart-change'

function readCart() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem) : []
  } catch {
    return []
  }
}

function writeCart(items) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * Gộp giỏ local (khách) với giỏ server. Union theo lineId, lấy qty lớn hơn (không cộng dồn)
 * để reload khi đang đăng nhập không nhân đôi số lượng. Giữ snapshot của server khi trùng dòng.
 */
function mergeCarts(local, server) {
  const byId = new Map()
  server.forEach((item) => {
    const norm = normalizeCartItem(item)
    byId.set(norm.lineId, norm)
  })
  local.forEach((item) => {
    const norm = normalizeCartItem(item)
    const existing = byId.get(norm.lineId)
    if (!existing) {
      byId.set(norm.lineId, norm)
    } else {
      byId.set(norm.lineId, { ...existing, qty: cappedQuantity(existing, Math.max(existing.qty, norm.qty)) })
    }
  })
  return [...byId.values()]
}

export function useCart() {
  const { isAuthenticated, user } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState(() => readCart())
  // Đọc trạng thái auth mới nhất trong các callback ổn định (deps rỗng).
  const authRef = useRef({ isAuthenticated: false })
  useEffect(() => {
    authRef.current = { isAuthenticated: isAuthenticated && !!userId }
  }, [isAuthenticated, userId])

  useEffect(() => {
    const sync = () => setItems(readCart())
    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  // Đăng nhập: gộp giỏ khách với giỏ server một lần cho mỗi user, rồi mirror kết quả.
  const loadedForRef = useRef(null)
  useEffect(() => {
    let alive = true
    if (!isAuthenticated || !userId || loadedForRef.current === userId) return undefined

    void (async () => {
      try {
        const server = await cartApi.get()
        if (!alive) return
        const merged = mergeCarts(readCart(), Array.isArray(server) ? server : [])
        writeCart(merged)
        setItems(merged)
        loadedForRef.current = userId
        await cartApi.replace(merged)
      } catch {
        // Không đồng bộ được thì vẫn dùng giỏ local; sẽ thử lại ở thay đổi sau.
      }
    })()

    return () => {
      alive = false
    }
  }, [isAuthenticated, userId])

  /** Ghi giỏ vào local + state, và mirror lên server nếu đã đăng nhập. */
  const commit = useCallback((next) => {
    writeCart(next)
    setItems(next)
    if (authRef.current.isAuthenticated) {
      void cartApi.replace(next).catch(() => {})
    }
    return next
  }, [])

  /** Thêm sản phẩm vào giỏ (nếu đã có thì tăng qty) */
  const addItem = useCallback((product, qty = 1) => {
    const current = readCart()
    const normalizedProduct = normalizeCartItem(product)
    const lineId = cartLineId(normalizedProduct)
    const idx = current.findIndex((item) => item.lineId === lineId)
    let next
    if (idx >= 0) {
      next = current.map((i, index) =>
        index === idx ? { ...i, qty: cappedQuantity(i, i.qty + qty) } : i,
      ).filter((item) => item.qty > 0)
    } else {
      const capped = cappedQuantity(normalizedProduct, qty)
      next = capped > 0 ? [...current, { ...normalizedProduct, qty: capped }] : current
    }
    return commit(next)
  }, [commit])

  /** Thêm nhiều sản phẩm cùng lúc */
  const addMultipleItems = useCallback((products) => {
    let current = readCart()
    products.forEach((product) => {
      const qty = 1
      const normalizedProduct = normalizeCartItem(product)
      const lineId = cartLineId(normalizedProduct)
      const idx = current.findIndex((item) => item.lineId === lineId)
      if (idx >= 0) {
        current = current.map((i, index) =>
          index === idx ? { ...i, qty: cappedQuantity(i, i.qty + qty) } : i,
        ).filter((item) => item.qty > 0)
      } else {
        const capped = cappedQuantity(normalizedProduct, qty)
        if (capped > 0) current = [...current, { ...normalizedProduct, qty: capped }]
      }
    })
    return commit(current)
  }, [commit])

  /** Xóa 1 sản phẩm khỏi giỏ */
  const removeItem = useCallback((lineId) => {
    commit(readCart().filter((item) => item.lineId !== lineId))
  }, [commit])

  /** Cập nhật số lượng */
  const updateQty = useCallback((lineId, qty) => {
    if (qty <= 0) {
      commit(readCart().filter((item) => item.lineId !== lineId))
      return
    }
    const next = readCart().map((item) => (
      item.lineId === lineId ? { ...item, qty: cappedQuantity(item, qty) } : item
    )).filter((item) => item.qty > 0)
    commit(next)
  }, [commit])

  /** Xóa toàn bộ giỏ hàng */
  const clearCart = useCallback(() => {
    writeCart([])
    setItems([])
    if (authRef.current.isAuthenticated) {
      void cartApi.clear().catch(() => {})
    }
  }, [])

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPrice = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0)

  return { items, totalCount, totalPrice, addItem, addMultipleItems, removeItem, updateQty, clearCart }
}

export function getCartItems() {
  return readCart()
}
