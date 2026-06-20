import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const CartDrawerContext = createContext(null)

export function CartDrawerProvider({ children }) {
  const [open, setOpen] = useState(false)
  const openCart = useCallback(() => setOpen(true), [])
  const closeCart = useCallback(() => setOpen(false), [])

  const value = useMemo(() => ({ open, openCart, closeCart }), [open, openCart, closeCart])
  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext)
  if (!ctx) throw new Error('useCartDrawer must be used inside CartDrawerProvider')
  return ctx
}
