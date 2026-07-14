import assert from 'node:assert/strict'
import test from 'node:test'

import { cappedQuantity, cartLineId, normalizeCartItem } from './cartUtils.js'


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
  assert.equal(cappedQuantity({ trackInventory: false, availableQuantity: 0 }, 10), 10)
})
