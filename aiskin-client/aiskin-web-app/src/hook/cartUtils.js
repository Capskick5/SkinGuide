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

  const available = Number(item.availableQuantity)
  return Number.isFinite(available) && available > 0
    ? Math.min(requested, available)
    : requested
}
