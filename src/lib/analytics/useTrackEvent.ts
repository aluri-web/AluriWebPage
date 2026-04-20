'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const body = JSON.stringify({
    event,
    metadata: metadata ?? {},
    path: window.location.pathname,
  })
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {
    // fall through to fetch
  }
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => { /* swallow */ })
}

/**
 * Dispara un evento una sola vez al montar el componente.
 */
export function useTrackEvent(event: string, metadata?: Record<string, unknown>) {
  const fired = useRef(false)
  const pathname = usePathname()
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackEvent(event, { ...metadata, path: pathname })
  }, [event, metadata, pathname])
}
