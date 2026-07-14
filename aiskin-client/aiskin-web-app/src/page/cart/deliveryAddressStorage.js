const STORAGE_PREFIX = 'skinguide.delivery-address'

const ADDRESS_FIELDS = [
  'customerName',
  'customerPhone',
  'provinceCode',
  'city',
  'districtCode',
  'district',
  'wardCode',
  'ward',
  'addressDetail',
]

function storageKey(userId) {
  return `${STORAGE_PREFIX}.${userId}`
}

function isCompleteAddress(address) {
  return ADDRESS_FIELDS.every((field) => String(address?.[field] ?? '').trim())
}

export function getSavedDeliveryAddress(userId) {
  if (!userId) return null

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)))
    return isCompleteAddress(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveDeliveryAddress(userId, formData) {
  if (!userId) return null

  const address = Object.fromEntries(
    ADDRESS_FIELDS.map((field) => [field, String(formData[field] ?? '').trim()]),
  )

  if (!isCompleteAddress(address)) return null

  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(address))
    return address
  } catch {
    return address
  }
}
