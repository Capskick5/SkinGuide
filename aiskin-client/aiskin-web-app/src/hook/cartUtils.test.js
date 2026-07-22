import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GUEST_CART_STORAGE_KEY,
  cappedQuantity,
  cartLineId,
  cartStorageKey,
  mergeCarts,
  normalizeCartItem,
} from './cartUtils.js'


test('variants of the same product have different cart line ids', () => {
  assert.notEqual(
    cartLineId({ id: 'p1', variantId: '50ml' }),
    cartLineId({ id: 'p1', variantId: '100ml' }),
  )
})

test('legacy cart item receives a stable default line id', () => {
  assert.equal(normalizeCartItem({ id: 'p1', qty: 2 }).lineId, 'p1::default')
})

test('tracked inventory caps cart quantity', () => {
  assert.equal(cappedQuantity({ availableQuantity: 3 }, 10), 3)
  assert.equal(cappedQuantity({ trackInventory: true, availableQuantity: 0 }, 1), 0)
  assert.equal(cappedQuantity({ trackInventory: false, availableQuantity: 0 }, 10), 10)
  assert.equal(cappedQuantity({}, 4), 4)
})

test('cart storage is isolated for guests and each user', () => {
  assert.equal(cartStorageKey(null), GUEST_CART_STORAGE_KEY)
  assert.equal(cartStorageKey('user-1'), 'aiskin.cart.user.user-1')
  assert.notEqual(cartStorageKey('user-1'), cartStorageKey('user-2'))
})

test('cart merge keeps server metadata and the largest valid quantity', () => {
  const merged = mergeCarts(
    [{ id: 'p1', variantId: '50ml', qty: 4, name: 'Old name' }],
    [{ id: 'p1', variantId: '50ml', qty: 2, name: 'Fresh name', availableQuantity: 3 }],
  )

  assert.equal(merged.length, 1)
  assert.equal(merged[0].name, 'Fresh name')
  assert.equal(merged[0].qty, 3)
})
