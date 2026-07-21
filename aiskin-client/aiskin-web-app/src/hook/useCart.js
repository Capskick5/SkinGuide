/**
 * useCart – quản lý giỏ hàng toàn cục qua localStorage.
 * Hỗ trợ: thêm, xóa, cập nhật số lượng, xóa toàn bộ, tính tổng tiền.
 */
import { useCallback, useEffect, useState } from 'react'
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

export function useCart() {
  const [items, setItems] = useState(() => readCart())

  useEffect(() => {
    const sync = () => setItems(readCart())
    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
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
    writeCart(next)
    setItems(next)
    return next
  }, [])

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
    writeCart(current)
    setItems(current)
    return current
  }, [])

  /** Xóa 1 sản phẩm khỏi giỏ */
  const removeItem = useCallback((lineId) => {
    const next = readCart().filter((item) => item.lineId !== lineId)
    writeCart(next)
    setItems(next)
  }, [])

  /** Cập nhật số lượng */
  const updateQty = useCallback((lineId, qty) => {
    if (qty <= 0) {
      const next = readCart().filter((item) => item.lineId !== lineId)
      writeCart(next)
      setItems(next)
      return
    }
    const next = readCart().map((item) => (
      item.lineId === lineId ? { ...item, qty: cappedQuantity(item, qty) } : item
    )).filter((item) => item.qty > 0)
    writeCart(next)
    setItems(next)
  }, [])

  /** Xóa toàn bộ giỏ hàng */
  const clearCart = useCallback(() => {
    writeCart([])
    setItems([])
  }, [])

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPrice = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0)

  return { items, totalCount, totalPrice, addItem, addMultipleItems, removeItem, updateQty, clearCart }
}

export function getCartItems() {
  return readCart()
}
