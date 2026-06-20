import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

/**
 * CartContext – quản lý giỏ hàng toàn cục, lưu localStorage.
 * Mỗi item trong giỏ: { id, brand, name, category, price, priceNum, rating, image, match, qty }
 */

const CART_KEY = 'aiskin_cart'

// ---------- helpers ----------
/** Chuyển chuỗi giá "599.000₫" -> số 599000 */
function parsePrice(str = '') {
  return Number(str.replace(/[^\d]/g, '')) || 0
}

// ---------- reducer ----------
function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const idx = state.findIndex((i) => i.id === action.item.id)
      if (idx >= 0) {
        return state.map((i, index) => (index === idx ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...state, { ...action.item, qty: 1 }]
    }
    case 'REMOVE':
      return state.filter((i) => i.id !== action.id)
    case 'SET_QTY': {
      const qty = Math.max(1, action.qty)
      return state.map((i) => (i.id === action.id ? { ...i, qty } : i))
    }
    case 'CLEAR':
      return []
    case 'INIT':
      return action.items
    default:
      return state
  }
}

// ---------- context ----------
const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [])

  // Khởi tạo từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) dispatch({ type: 'INIT', items: JSON.parse(saved) })
    } catch {
      // ignore
    }
  }, [])

  // Đồng bộ localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product) => {
    const item = {
      id: product.id || product.name,
      brand: product.brand,
      name: product.name,
      category: product.category,
      price: product.price,
      priceNum: product.priceNum ?? parsePrice(product.price),
      rating: product.rating,
      match: product.match,
    }
    dispatch({ type: 'ADD', item })
  }, [])

  const removeItem = useCallback((id) => dispatch({ type: 'REMOVE', id }), [])
  const setQty = useCallback((id, qty) => dispatch({ type: 'SET_QTY', id, qty }), [])
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.priceNum * i.qty, 0), [items])

  const value = useMemo(
    () => ({ items, addItem, removeItem, setQty, clearCart, totalItems, subtotal }),
    [items, addItem, removeItem, setQty, clearCart, totalItems, subtotal],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
