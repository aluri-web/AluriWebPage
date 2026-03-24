'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, AlertTriangle } from 'lucide-react'
import { deletePayment } from './actions'

interface DeletePaymentModalProps {
  referencia: string
  creditoCodigo: string
  propietario: string
  total: number
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

export default function DeletePaymentModal({
  referencia,
  creditoCodigo,
  propietario,
  total,
  isOpen,
  onClose,
}: DeletePaymentModalProps) {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const confirmWord = 'ELIMINAR'

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return
    setProcessing(true)
    setError(null)

    const result = await deletePayment(referencia)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1200)
    }
    setProcessing(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Eliminar Pago</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">Pago eliminado y saldos revertidos</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Esta accion no se puede deshacer</p>
                <p className="text-red-400/70 text-sm mt-1">
                  Se eliminaran las transacciones y se revertiran los saldos del credito.
                </p>
              </div>
            </div>

            {/* Payment info */}
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Credito</span>
                <span className="text-teal-400 font-mono">{creditoCodigo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Propietario</span>
                <span className="text-white">{propietario}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Monto total</span>
                <span className="text-white font-bold">{formatCOP(total)}</span>
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Escribe <span className="font-mono font-bold text-red-400">{confirmWord}</span> para confirmar:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmWord}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
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
                type="button"
                onClick={handleDelete}
                disabled={processing || confirmText !== confirmWord}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-600/30 disabled:text-red-400/50 text-white font-semibold rounded-lg transition-colors"
              >
                {processing ? 'Eliminando...' : 'Eliminar Pago'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
