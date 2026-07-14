import { useEffect, useState } from 'react'
import { resolveApiAssetUrl } from '@/config/api'
import { tokenStorage } from '@/api/tokenStorage'

function requiresAuthorization(source) {
  try {
    return new URL(source, window.location.origin).pathname.startsWith('/api/orders/uploads/')
  } catch {
    return false
  }
}

export default function ProtectedImage({ source, preview = false, onClick, ...imageProps }) {
  const [resolvedSource, setResolvedSource] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''

    async function load() {
      if (!source) {
        setResolvedSource('')
        return
      }

      const url = resolveApiAssetUrl(source)
      if (!requiresAuthorization(source)) {
        setResolvedSource(url)
        return
      }

      const token = tokenStorage.getAccessToken()
      if (!token) return

      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error(`Protected image request failed (${response.status})`)
        objectUrl = URL.createObjectURL(await response.blob())
        if (active) setResolvedSource(objectUrl)
      } catch {
        if (active) setResolvedSource('')
      }
    }

    void load()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source])

  return (
    <img
      {...imageProps}
      src={resolvedSource || undefined}
      onClick={(event) => {
        onClick?.(event)
        if (preview && resolvedSource) window.open(resolvedSource, '_blank', 'noopener,noreferrer')
      }}
    />
  )
}
