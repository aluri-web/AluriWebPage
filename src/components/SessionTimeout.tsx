'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos de inactividad
const WARNING_MS = 5 * 60 * 1000  // Aviso 5 minutos antes

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const

export default function SessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningShownRef = useRef(false)

  const logout = useCallback(async () => {
    try {
      await fetch('/auth/signout', { method: 'POST' })
    } catch {
      // Best effort
    }
    router.push('/login?reason=timeout')
  }, [router])

  const resetTimer = useCallback(() => {
    if (warningShownRef.current) {
      warningShownRef.current = false
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)

    warningRef.current = setTimeout(() => {
      warningShownRef.current = true
      // Usar un evento custom para que otros componentes puedan escuchar
      window.dispatchEvent(new CustomEvent('session-timeout-warning', {
        detail: { minutesLeft: Math.ceil(WARNING_MS / 60_000) }
      }))
    }, TIMEOUT_MS - WARNING_MS)

    timeoutRef.current = setTimeout(() => {
      logout()
    }, TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    resetTimer()

    const handler = () => resetTimer()
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handler, { passive: true })
    }

    // Allow long-running processes (AI agents) to keep the session alive
    const pingHandler = () => resetTimer()
    window.addEventListener('session-activity-ping', pingHandler)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handler)
      }
      window.removeEventListener('session-activity-ping', pingHandler)
    }
  }, [resetTimer])

  // Este componente no renderiza nada visible
  return null
}
