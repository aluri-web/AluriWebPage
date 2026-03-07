'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { investInLoan } from './actions'
import { CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'

const MIN_INVESTMENT = 40_000_000
const MAX_INVESTORS = 5

interface InvestmentPanelProps {
  loanId: string
  amountRequested: number
  amountFunded: number
  investorCount: number
  interestRateEa: number | null
  termMonths: number | null
}

export default function InvestmentPanel({
  loanId,
  amountRequested,
  amountFunded,
  investorCount,
  interestRateEa,
  termMonths
}: InvestmentPanelProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const remainingAmount = amountRequested - amountFunded
  const progress = amountRequested > 0 ? (amountFunded / amountRequested) * 100 : 0
  const slotsLeft = MAX_INVESTORS - investorCount
  const availableSlots = Math.min(slotsLeft, Math.floor(remainingAmount / MIN_INVESTMENT))
  const canInvest = availableSlots > 0 && remainingAmount >= MIN_INVESTMENT
  const minInvestment = MIN_INVESTMENT
  const maxInvestment = remainingAmount

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`
    }
    return formatCurrency(value)
  }

  // Calculate estimated return using monthly rate derived from EA
  const estimatedReturn = useMemo(() => {
    const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0
    if (numericAmount <= 0 || !interestRateEa || !termMonths) return null

    // Convert EA to monthly rate: (1 + EA)^(1/12) - 1
    const monthlyRate = Math.pow(1 + interestRateEa / 100, 1 / 12) - 1
    const monthlyPayment = monthlyRate === 0
      ? numericAmount / termMonths
      : (numericAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)
    const totalReturn = monthlyPayment * termMonths
    const profit = totalReturn - numericAmount

    return {
      total: totalReturn,
      profit,
      percentage: interestRateEa
    }
  }, [amount, interestRateEa, termMonths])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setAmount(value)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const numericAmount = parseFloat(amount)

    if (!numericAmount || numericAmount <= 0) {
      setError('Ingresa un monto válido.')
      return
    }

    if (!canInvest) {
      setError('No hay cupos disponibles para invertir en este crédito.')
      return
    }

    if (numericAmount < MIN_INVESTMENT) {
      setError(`El monto mínimo de inversión es ${formatCurrency(MIN_INVESTMENT)}.`)
      return
    }

    if (numericAmount > remainingAmount) {
      setError(`El monto máximo disponible es ${formatCurrency(remainingAmount)}.`)
      return
    }

    setIsLoading(true)

    try {
      const result = await investInLoan(loanId, numericAmount)

      if (result.success) {
        setSuccess(result.message)
        setAmount('')
        setTimeout(() => {
          router.push('/dashboard/inversionista/mis-inversiones')
        }, 2000)
      } else {
        setError(result.error || 'Error al procesar la inversión.')
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden sticky top-6">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <h3 className="text-xl font-bold text-white tracking-tight">Invertir Ahora</h3>
      </div>

      <div className="p-5">
        {/* Investment Input */}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="amount" className="block text-sm text-gray-500 mb-3">
              ¿Cuánto quieres invertir?
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
              <input
                type="text"
                id="amount"
                value={amount ? Number(amount).toLocaleString('es-CO') : ''}
                onChange={handleAmountChange}
                placeholder="50,000,000"
                className="w-full pl-10 pr-4 py-4 bg-transparent border border-white/10 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-teal-400/50 transition-all placeholder-gray-700"
                disabled={isLoading || !canInvest}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-600">
              <span>Min: {formatCompactCurrency(minInvestment)}</span>
              <span>Max: {formatCompactCurrency(maxInvestment)}</span>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>Cupos: {investorCount}/{MAX_INVESTORS} inversionistas</span>
              {availableSlots > 0 && <span>{availableSlots} cupo{availableSlots !== 1 ? 's' : ''} disponible{availableSlots !== 1 ? 's' : ''}</span>}
            </div>
          </div>

          {/* Return Calculator */}
          {estimatedReturn && estimatedReturn.profit > 0 && (
            <div className="mb-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Retorno Estimado</span>
                <span className="text-teal-400 font-semibold">+ {estimatedReturn.percentage}%</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tu Ganancia</p>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {formatCurrency(estimatedReturn.profit)}
                </p>
                <p className="text-gray-600 text-sm mt-1">en {termMonths} meses</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Progreso de Fondeo</span>
              <span className="text-teal-400 text-sm font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-400 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-teal-400/10 border border-teal-400/20 rounded-xl flex items-start gap-3">
              <CheckCircle size={16} className="text-teal-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-teal-400 text-sm font-medium">{success}</p>
                <p className="text-teal-400/70 text-xs mt-1">Redirigiendo...</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !amount || !canInvest}
            className="w-full py-4 bg-teal-400 hover:bg-teal-400 disabled:bg-gray-800 disabled:cursor-not-allowed text-black disabled:text-gray-600 font-bold text-base rounded-xl transition-all shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] disabled:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Procesando...
              </span>
            ) : (
              'Confirmar Inversión'
            )}
          </button>

          {!canInvest && (
            <p className="text-center text-gray-600 text-sm mt-3">
              {remainingAmount <= 0
                ? 'Esta oportunidad ya está completamente financiada.'
                : investorCount >= MAX_INVESTORS
                  ? 'Este crédito ya alcanzó el máximo de 5 inversionistas.'
                  : `El monto restante ($${formatCompactCurrency(remainingAmount)}) no alcanza el mínimo de inversión ($${formatCompactCurrency(MIN_INVESTMENT)}).`
              }
            </p>
          )}
        </form>

        {/* Disclaimer */}
        <div className="mt-5 pt-5 border-t border-white/5">
          <p className="text-gray-600 text-xs leading-relaxed">
            Al confirmar, aceptas los Términos de Servicio y la Declaración de Riesgos para Inversiones Hipotecarias #{loanId.slice(0, 4)}.
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-gray-500 text-xs">
              Los fondos se mantienen en custodia hasta alcanzar el monto total. Si no se completa el fondeo en 14 días, tu inversión se devuelve en su totalidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
