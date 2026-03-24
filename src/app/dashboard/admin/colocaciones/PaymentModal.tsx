'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, DollarSign, Calendar, AlertCircle, CheckCircle, ArrowDown } from 'lucide-react'
import { registerLoanPayment } from './actions'

interface PaymentModalProps {
  loanId: string
  loanCode: string
  saldoCapital: number
  saldoIntereses: number
  saldoMora: number
  tipoAmortizacion?: string | null
  isOpen: boolean
  onClose: () => void
}

export default function PaymentModal({ loanId, loanCode, saldoCapital, saldoIntereses, saldoMora, tipoAmortizacion, isOpen, onClose }: PaymentModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [paymentDate, setPaymentDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [monto, setMonto] = useState<number>(0)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date().toISOString().split('T')[0])
      setMonto(0)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const esSoloInteres = tipoAmortizacion === 'solo_interes'

  // Simulate cascading distribution preview
  const calcDistribution = (total: number) => {
    let restante = total
    const mora = Math.min(restante, saldoMora)
    restante -= mora
    const intereses = Math.min(restante, saldoIntereses)
    restante -= intereses
    // Solo interés: no aplicar a capital (se paga al vencimiento)
    const capital = esSoloInteres ? 0 : Math.min(restante, saldoCapital)
    return { mora, intereses, capital }
  }

  const dist = calcDistribution(monto)
  const deudaTotal = saldoMora + saldoIntereses + saldoCapital

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await registerLoanPayment({
        loan_id: loanId,
        payment_date: paymentDate,
        monto: monto
      })

      if (!result.success) {
        setError(result.error || 'Error al registrar el pago')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)

      // Auto-close after showing success
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1500)

    } catch {
      setError('Error inesperado al registrar el pago')
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500/10 rounded-lg">
              <DollarSign size={20} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Registrar Pago</h2>
              <p className="text-sm text-slate-400">Credito {loanCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Pago Registrado</h3>
            <p className="text-slate-400">El pago se ha registrado y distribuido correctamente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Current balances */}
              <div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Saldos Pendientes</p>
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">Mora</span>
                  <span className="text-red-400 font-medium">{formatCurrency(saldoMora)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400">Intereses</span>
                  <span className="text-amber-400 font-medium">{formatCurrency(saldoIntereses)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400">Capital</span>
                  <span className="text-blue-400 font-medium">{formatCurrency(saldoCapital)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                  <span className="text-white font-medium">Deuda Total</span>
                  <span className="text-white font-bold">{formatCurrency(deudaTotal)}</span>
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <span className="flex items-center gap-2">
                    <Calendar size={14} />
                    Fecha de Pago
                  </span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Single Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Monto del Pago ($)
                </label>
                <p className="text-xs text-slate-500 mb-1.5">
                  {esSoloInteres
                    ? 'Solo interés: mora → intereses (sin abono a capital)'
                    : 'Se distribuye automaticamente: mora → intereses → capital'}
                </p>
                <input
                  type="number"
                  value={monto || ''}
                  onChange={(e) => setMonto(Number(e.target.value) || 0)}
                  min="0"
                  step="1"
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Cascading distribution preview */}
              {monto > 0 && (
                <div className="p-3 bg-teal-500/5 border border-teal-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDown size={14} className="text-teal-400" />
                    <p className="text-xs font-medium text-teal-400 uppercase tracking-wider">Distribucion del Pago</p>
                  </div>
                  {dist.mora > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-400">→ Mora</span>
                      <span className="text-red-400 font-medium">{formatCurrency(dist.mora)}</span>
                    </div>
                  )}
                  {dist.intereses > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-400">→ Intereses</span>
                      <span className="text-amber-400 font-medium">{formatCurrency(dist.intereses)}</span>
                    </div>
                  )}
                  {dist.capital > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-400">→ Capital</span>
                      <span className="text-blue-400 font-medium">{formatCurrency(dist.capital)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-slate-700 bg-slate-800/30">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || monto <= 0}
                className="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Registrar Pago'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
