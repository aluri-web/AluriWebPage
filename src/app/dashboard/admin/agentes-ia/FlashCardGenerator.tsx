'use client'

import { useState, useCallback } from 'react'
import { Share2, Copy, Check, ChevronLeft, ChevronRight, Image as ImageIcon, AlertCircle, Download } from 'lucide-react'

interface FlashCardProps {
  operation: {
    property_type?: string
    city?: string
    payment_mode?: string
    guarantee_type?: string
    property_appraisal_value: number
    loan_amount: number
    interest_rate_monthly: number
    rate_type?: string
    net_rate_monthly?: number
    monthly_payment: number
    loan_term_months: number
    property_address?: string
  }
  applicantName: string
  photoUrls: string[]
}

const PROPERTY_LABELS: Record<string, string> = {
  casa: 'Casa',
  apartamento: 'Apto',
  local_comercial: 'Local comercial',
  oficina: 'Oficina',
  lote: 'Lote',
  finca: 'Finca',
  bodega: 'Bodega',
}

const GUARANTEE_LABELS: Record<string, string> = {
  hipoteca: 'Hipoteca en primer grado',
  retroventa: 'Retroventa',
}

function formatCOP(value: number): string {
  return '$' + value.toLocaleString('es-CO') + ' COP'
}

export default function FlashCardGenerator({ operation: op, photoUrls }: FlashCardProps) {
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const propertyLabel = PROPERTY_LABELS[op.property_type ?? ''] ?? op.property_type ?? 'Inmueble'
  const city = op.city ?? 'Colombia'
  const paymentMode = op.payment_mode === 'capital_intereses' ? 'Capital e intereses' : 'Solo intereses'
  const guaranteeLabel = GUARANTEE_LABELS[op.guarantee_type ?? ''] ?? op.guarantee_type ?? ''
  const rateTypeLabel = op.rate_type === 'vencido' ? 'Mes vencido' : 'Mes anticipado'
  const guaranteeTimes = (op.property_appraisal_value / op.loan_amount).toFixed(1)
  const netRate = op.net_rate_monthly ?? op.interest_rate_monthly * 0.8
  const netEA = (Math.pow(1 + netRate / 100, 12) - 1) * 100

  // Build WhatsApp-formatted text
  const flashText = [
    `🏠 *${propertyLabel} · ${city} · ${paymentMode}*`,
    guaranteeLabel,
    '',
    `Valor comercial del inmueble: ${formatCOP(op.property_appraisal_value)}`,
    `Valor del préstamo: ${formatCOP(op.loan_amount)}`,
    `Garantía: ${guaranteeTimes} veces el valor prestado`,
    `Tasa bruta: ${op.interest_rate_monthly}% ${rateTypeLabel}`,
    `Tasa neta para el prestamista: ~${netRate.toFixed(2)}% M.A. (~${netEA.toFixed(1)}% E.A.)`,
    `Cuota mensual: ${formatCOP(op.monthly_payment)} (${paymentMode})`,
    `Plazo: ${op.loan_term_months} meses`,
    '',
    '_aluri.co — WhatsApp: +57 320 6406648_',
  ].join('\n')

  const selectedPhotoUrl = photoUrls[selectedPhotoIdx] ?? null

  // Download photo as blob for sharing
  const getPhotoFile = useCallback(async (): Promise<File | null> => {
    if (!selectedPhotoUrl) return null
    try {
      // Try direct fetch first, then proxy via API to avoid CORS issues
      let res: Response
      try {
        res = await fetch(selectedPhotoUrl, { mode: 'cors' })
        if (!res.ok) throw new Error('Direct fetch failed')
      } catch {
        // Fallback: proxy through Next.js API
        res = await fetch(`/api/proxy-image?url=${encodeURIComponent(selectedPhotoUrl)}`)
      }
      const blob = await res.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      return new File([blob], `flash-aluri.${ext}`, { type: blob.type })
    } catch {
      return null
    }
  }, [selectedPhotoUrl])

  // Share via Web Share API (photo + text as single message)
  const handleShare = useCallback(async () => {
    setIsSharing(true)
    setShareError(null)
    try {
      const file = await getPhotoFile()

      if (!file) {
        // Photo failed to load — don't share without it
        setShareError('No se pudo cargar la foto. Descárgala manualmente y compártela con el texto copiado.')
        await navigator.clipboard.writeText(flashText)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
        setIsSharing(false)
        return
      }

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        // Native share: photo + text together
        await navigator.share({
          files: [file],
          text: flashText,
        })
      } else {
        // Browser doesn't support file sharing — download photo + copy text
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        await navigator.clipboard.writeText(flashText)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
        setShareError('Foto descargada + texto copiado. Pega el texto como caption al compartir la foto en WhatsApp.')
      }
    } catch (err) {
      // User cancelled share dialog — not an error
      if (err instanceof Error && err.name === 'AbortError') {
        // ignore
      } else {
        try {
          await navigator.clipboard.writeText(flashText)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch { /* ignore */ }
      }
    }
    setIsSharing(false)
  }, [flashText, getPhotoFile])

  // Download photo only
  const handleDownloadPhoto = useCallback(async () => {
    const file = await getPhotoFile()
    if (!file) return
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }, [getPhotoFile])

  // Copy text only
  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(flashText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }, [flashText])

  return (
    <div className="space-y-3">
      {/* Photo selector */}
      {photoUrls.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ImageIcon size={14} /> Foto:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPhotoIdx(Math.max(0, selectedPhotoIdx - 1))}
              disabled={selectedPhotoIdx === 0}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1">
              {photoUrls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPhotoIdx(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === selectedPhotoIdx ? 'border-teal-400 scale-105' : 'border-slate-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedPhotoIdx(Math.min(photoUrls.length - 1, selectedPhotoIdx + 1))}
              disabled={selectedPhotoIdx === photoUrls.length - 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-xs text-slate-500">{selectedPhotoIdx + 1}/{photoUrls.length}</span>
          </div>
        </div>
      )}

      {/* Preview: photo + text side by side */}
      <div className="flex gap-3 items-start">
        {/* Photo preview */}
        {selectedPhotoUrl && (
          <div className="w-48 flex-shrink-0 rounded-xl overflow-hidden border border-slate-700">
            <img
              src={selectedPhotoUrl}
              alt="Foto del inmueble"
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Text preview */}
        <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {flashText}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-lg transition-colors text-sm"
        >
          <Share2 size={14} />
          {isSharing ? 'Compartiendo...' : 'Compartir en WhatsApp'}
        </button>
        <button
          onClick={handleCopyText}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied ? 'Copiado!' : 'Copiar texto'}
        </button>
        {selectedPhotoUrl && (
          <button
            onClick={handleDownloadPhoto}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Download size={14} />
            Descargar foto
          </button>
        )}
      </div>

      {/* Error/info feedback */}
      {shareError && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-lg text-xs text-amber-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          {shareError}
        </div>
      )}
    </div>
  )
}
