import { useCallback, useEffect, useState } from 'react'

const FAVORITES_KEY = 'aiskin.products.favorites'
const COMPARE_KEY = 'aiskin.products.compare'
const CHANGE_EVENT = 'aiskin:product-collections-change'
const COMPARE_LIMIT = 3

function readIds(storageKey) {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((item) => String(item)).filter(Boolean))]
  } catch {
    return []
  }
}

function writeIds(storageKey, ids) {
  if (typeof window === 'undefined') return

  const next = [...new Set(ids.map((item) => String(item)).filter(Boolean))]
  localStorage.setItem(storageKey, JSON.stringify(next))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function toggleId(storageKey, id, limit) {
  if (!id) return []

  const current = readIds(storageKey)
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : limit && current.length >= limit
      ? [...current.slice(1), id]
      : [...current, id]

  writeIds(storageKey, next)
  return next
}

function clearIds(storageKey) {
  writeIds(storageKey, [])
}

function useStoredIds(storageKey, limit) {
  const [ids, setIds] = useState(() => readIds(storageKey))

  useEffect(() => {
    const sync = () => setIds(readIds(storageKey))

    window.addEventListener('storage', sync)
    window.addEventListener(CHANGE_EVENT, sync)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [storageKey])

  const toggle = useCallback(
    (id) => {
      const next = toggleId(storageKey, id, limit)
      setIds(next)
      return next
    },
    [limit, storageKey],
  )

  const clear = useCallback(() => {
    clearIds(storageKey)
    setIds([])
  }, [storageKey])

  return {
    ids,
    count: ids.length,
    hasId: useCallback((id) => ids.includes(id), [ids]),
    toggle,
    clear,
  }
}

export function useFavoriteProducts() {
  return useStoredIds(FAVORITES_KEY)
}

export function useComparedProducts() {
  return useStoredIds(COMPARE_KEY, COMPARE_LIMIT)
}

export function getFavoriteIds() {
  return readIds(FAVORITES_KEY)
}

export function getComparedIds() {
  return readIds(COMPARE_KEY)
}

export function formatCollectionCount(count) {
  return count > 0 ? String(count) : ''
}

export { COMPARE_LIMIT, COMPARE_KEY, FAVORITES_KEY }
