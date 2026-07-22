export function cartLineId(item) {
  return `${item.id}::${item.variantId || 'default'}`
}

export function normalizeCartItem(item) {
  return {
    ...item,
    lineId: cartLineId(item),
    qty: Math.max(1, Number(item.qty) || 1),
  }
}

export function cappedQuantity(item, requestedQuantity) {
  const requested = Math.max(1, Number(requestedQuantity) || 1)
  if (item.trackInventory === false) return requested

  if (item.availableQuantity === null || item.availableQuantity === undefined) return requested
  const available = Number(item.availableQuantity)
  return Number.isFinite(available)
    ? Math.min(requested, Math.max(0, available))
    : requested
}

export const GUEST_CART_STORAGE_KEY = 'aiskin.cart.guest'

export function cartStorageKey(userId) {
  return userId ? `aiskin.cart.user.${userId}` : GUEST_CART_STORAGE_KEY
}

export function mergeCarts(local = [], server = []) {
  const byId = new Map()
  server.forEach((item) => {
    const normalized = normalizeCartItem(item)
    byId.set(normalized.lineId, normalized)
  })
  local.forEach((item) => {
    const normalized = normalizeCartItem(item)
    const existing = byId.get(normalized.lineId)
    if (!existing) {
      byId.set(normalized.lineId, normalized)
      return
    }
    byId.set(normalized.lineId, {
      ...existing,
      qty: cappedQuantity(existing, Math.max(existing.qty, normalized.qty)),
    })
  })
  return [...byId.values()]
}
