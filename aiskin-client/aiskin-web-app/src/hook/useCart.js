import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hook/useAuth'
import { cartApi } from '@/api/cartApi'
import {
  GUEST_CART_STORAGE_KEY,
  cappedQuantity,
  cartLineId,
  cartStorageKey,
  mergeCarts,
  normalizeCartItem,
} from './cartUtils'

const LEGACY_CART_KEY = 'aiskin.cart'
const CHANGE_EVENT = 'aiskin:cart-change'

function readCart(storageKey = GUEST_CART_STORAGE_KEY) {
  if (typeof window === 'undefined') return []
  try {
    let raw = localStorage.getItem(storageKey)
    if (!raw && storageKey === GUEST_CART_STORAGE_KEY) {
      raw = localStorage.getItem(LEGACY_CART_KEY)
    }
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem) : []
  } catch {
    return []
  }
}

function writeCart(items, storageKey = GUEST_CART_STORAGE_KEY) {
  if (typeof window === 'undefined') return
  localStorage.setItem(storageKey, JSON.stringify(items))
  if (storageKey === GUEST_CART_STORAGE_KEY) localStorage.removeItem(LEGACY_CART_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function clearStoredCart(storageKey) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey)
  if (storageKey === GUEST_CART_STORAGE_KEY) localStorage.removeItem(LEGACY_CART_KEY)
}

export function useCart() {
  const { isAuthenticated, user } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState(() => readCart(GUEST_CART_STORAGE_KEY))
  const storageKeyRef = useRef(GUEST_CART_STORAGE_KEY)
  const authRef = useRef({ isAuthenticated: false, userId: null })
  const syncQueueRef = useRef(Promise.resolve())
  const loadedForRef = useRef(null)

  useEffect(() => {
    authRef.current = { isAuthenticated: isAuthenticated && !!userId, userId }
  }, [isAuthenticated, userId])

  // Serialize writes so a slower, older request cannot overwrite a newer cart snapshot.
  const enqueueServerSync = useCallback((targetUserId, operation) => {
    syncQueueRef.current = syncQueueRef.current
      .catch(() => {})
      .then(() => {
        if (authRef.current.userId !== targetUserId) return undefined
        return operation()
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const sync = () => setItems(readCart(storageKeyRef.current))
    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  // Keep guest carts separate, then merge them into only the user who signs in.
  useEffect(() => {
    let alive = true
    if (!isAuthenticated || !userId) {
      loadedForRef.current = null
      storageKeyRef.current = GUEST_CART_STORAGE_KEY
      queueMicrotask(() => {
        if (alive) setItems(readCart(GUEST_CART_STORAGE_KEY))
      })
      return () => {
        alive = false
      }
    }

    const userStorageKey = cartStorageKey(userId)
    storageKeyRef.current = userStorageKey
    const pendingLocal = mergeCarts(
      readCart(userStorageKey),
      readCart(GUEST_CART_STORAGE_KEY),
    )
    writeCart(pendingLocal, userStorageKey)
    clearStoredCart(GUEST_CART_STORAGE_KEY)
    if (loadedForRef.current === userId) return undefined

    void (async () => {
      try {
        const server = await cartApi.get()
        if (!alive) return
        const merged = mergeCarts(pendingLocal, Array.isArray(server) ? server : [])
        writeCart(merged, userStorageKey)
        setItems(merged)
        loadedForRef.current = userId
        enqueueServerSync(userId, () => cartApi.replace(merged))
      } catch {
        // Local cart remains usable while the service is temporarily unavailable.
      }
    })()

    return () => {
      alive = false
    }
  }, [enqueueServerSync, isAuthenticated, userId])

  const commit = useCallback((next) => {
    writeCart(next, storageKeyRef.current)
    setItems(next)
    const auth = authRef.current
    if (auth.isAuthenticated) {
      enqueueServerSync(auth.userId, () => cartApi.replace(next))
    }
    return next
  }, [enqueueServerSync])

  const addItem = useCallback((product, qty = 1) => {
    const current = readCart(storageKeyRef.current)
    const normalizedProduct = normalizeCartItem(product)
    const lineId = cartLineId(normalizedProduct)
    const idx = current.findIndex((item) => item.lineId === lineId)
    let next
    if (idx >= 0) {
      next = current.map((item, index) => (
        index === idx
          ? { ...item, qty: cappedQuantity(item, item.qty + qty) }
          : item
      )).filter((item) => item.qty > 0)
    } else {
      const capped = cappedQuantity(normalizedProduct, qty)
      next = capped > 0 ? [...current, { ...normalizedProduct, qty: capped }] : current
    }
    return commit(next)
  }, [commit])

  const addMultipleItems = useCallback((products) => {
    let current = readCart(storageKeyRef.current)
    products.forEach((product) => {
      const normalizedProduct = normalizeCartItem(product)
      const lineId = cartLineId(normalizedProduct)
      const idx = current.findIndex((item) => item.lineId === lineId)
      if (idx >= 0) {
        current = current.map((item, index) => (
          index === idx
            ? { ...item, qty: cappedQuantity(item, item.qty + 1) }
            : item
        )).filter((item) => item.qty > 0)
      } else {
        const capped = cappedQuantity(normalizedProduct, 1)
        if (capped > 0) current = [...current, { ...normalizedProduct, qty: capped }]
      }
    })
    return commit(current)
  }, [commit])

  const removeItem = useCallback((lineId) => {
    commit(readCart(storageKeyRef.current).filter((item) => item.lineId !== lineId))
  }, [commit])

  const updateQty = useCallback((lineId, qty) => {
    if (qty <= 0) {
      commit(readCart(storageKeyRef.current).filter((item) => item.lineId !== lineId))
      return
    }
    const next = readCart(storageKeyRef.current).map((item) => (
      item.lineId === lineId ? { ...item, qty: cappedQuantity(item, qty) } : item
    )).filter((item) => item.qty > 0)
    commit(next)
  }, [commit])

  const clearCart = useCallback(() => {
    writeCart([], storageKeyRef.current)
    setItems([])
    const auth = authRef.current
    if (auth.isAuthenticated) {
      enqueueServerSync(auth.userId, () => cartApi.clear())
    }
  }, [enqueueServerSync])

  const totalCount = items.reduce((sum, item) => sum + item.qty, 0)
  const totalPrice = items.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0)

  return { items, totalCount, totalPrice, addItem, addMultipleItems, removeItem, updateQty, clearCart }
}

export function getCartItems() {
  return readCart(GUEST_CART_STORAGE_KEY)
}
