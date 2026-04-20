'use client'

import { useTrackEvent } from './useTrackEvent'

interface PageViewProps {
  event: string
  metadata?: Record<string, unknown>
}

/**
 * Componente que registra un evento de page view al montarse.
 * Se importa en server components y se usa como wrapper vacío.
 *
 *   <PageView event="ver_marketplace" />
 */
export default function PageView({ event, metadata }: PageViewProps) {
  useTrackEvent(event, metadata)
  return null
}
