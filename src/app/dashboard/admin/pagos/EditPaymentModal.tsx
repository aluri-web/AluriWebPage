'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import { getPaymentDetail, updatePayment, PaymentDetail } from './actions'

interface EditPaymentModalProps {
  referencia: string
  isOpen: boolean
  onClose: () => void
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function EditPaymentModal({ referencia, isOpen, onClose }: EditPaymentModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [detail, setDetail] = useState<PaymentDetail | null>(null)

  // Form fields
  const [fecha, setFecha] = useState('')
  const [capital, setCapital] = useState(0)
  const [intereses, setIntereses] = useState(0)
  const [mora, setMora] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    getPaymentDetail(referencia).then(({ data, error: fetchError }) => {
      if (fetchError || !data) {
        setError(fetchError || 'No se pudo cargar el pago.')
        setLoading(false)
        return
      }
      setDetail(data)
      setFecha(data.fecha)
      setCapital(data.capital)
      setIntereses(data.intereses)
      setMora(data.mora)
      setLoading(false)
    })
  }, [isOpen, referencia])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (capital + intereses + mora <= 0) {
      setError('El pago debe tener al menos un monto mayor a cero.')
      return
    }

    setSaving(true)
    setError(null)

    const result = await updatePayment({
      referencia,
      fecha,
      capital,
      intereses,
      mora,
    })

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1200)
    }
    setSaving(false)
  }

  if (!isOpen) return null

  const nuevoTotal = capital + intereses + mora

  const inputClass = 'w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Editar Pago</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando datos del pago...</div>
        ) : success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <p className="text-emerald-400 font-medium">Pago actualizado exitosamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Info del pago */}
            {detail && (
              <div className="p-3 bg-slate-900/50 rounded-lg space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Credito</span>
                  <span className="text-teal-400 font-mono">{detail.credito_codigo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Propietario</span>
                  <span className="text-white">{detail.propietario}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Referencia</span>
                  <span className="text-slate-500 font-mono text-xs">{detail.referencia.substring(0, 24)}...</span>
                </div>
              </div>
            )}

            {/* Fecha */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1"><Calendar size={12} /> Fecha del Pago</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {/* Montos */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Mora ($)</label>
                <input
                  type="number"
                  value={mora || ''}
                  onChange={(e) => setMora(Number(e.target.value) || 0)}
                  min="0"
                  step="1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Intereses ($)</label>
                <input
                  type="number"
                  value={intereses || ''}
                  onChange={(e) => setIntereses(Number(e.target.value) || 0)}
                  min="0"
                  step="1"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Capital ($)</label>
                <input
                  type="number"
                  value={capital || ''}
                  onChange={(e) => setCapital(Number(e.target.value) || 0)}
                  min="0"
                  step="1"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Total preview */}
            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
              <span className="text-sm text-slate-400">Nuevo Total</span>
              <span className="text-lg font-bold text-white">{formatCOP(nuevoTotal)}</span>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || nuevoTotal <= 0}
                className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
