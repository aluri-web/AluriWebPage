'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, AlertCircle, Banknote } from 'lucide-react'
import { approveInvestment, rejectInvestment, PendingInvestment } from './actions'

interface InvestmentsTableProps {
  investments: PendingInvestment[]
}

export default function InvestmentsTable({ investments }: InvestmentsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleApprove = async (investmentId: string) => {
    setLoadingId(investmentId)
    setActionType('approve')

    startTransition(async () => {
      const result = await approveInvestment(investmentId)

      if (result.success) {
        showToast('success', 'Inversión aprobada exitosamente')
        router.refresh()
      } else {
        showToast('error', result.error || 'Error al aprobar la inversión')
      }

      setLoadingId(null)
      setActionType(null)
    })
  }

  const handleReject = async (investmentId: string) => {
    setLoadingId(investmentId)
    setActionType('reject')

    startTransition(async () => {
      const result = await rejectInvestment(investmentId)

      if (result.success) {
        showToast('success', 'Inversión rechazada')
        router.refresh()
      } else {
        showToast('error', result.error || 'Error al rechazar la inversión')
      }

      setLoadingId(null)
      setActionType(null)
    })
  }

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900 rounded-xl border border-slate-800">
        <Banknote size={48} className="text-slate-700 mb-4" />
        <p className="text-slate-400 text-lg font-medium">No hay inversiones pendientes</p>
        <p className="text-slate-600 text-sm mt-1">Las inversiones aparecerán aquí cuando los inversionistas reserven cupo</p>
      </div>
    )
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
          toast.type === 'success'
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                  Fecha
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                  Inversionista
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                  Cédula
                </th>
                <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                  Crédito
                </th>
                <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                  Monto Invertido
                </th>
                <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {investments.map((investment) => {
                const isLoading = loadingId === investment.id

                return (
                  <tr key={investment.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(investment.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {investment.investor?.full_name || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {investment.investor?.email || 'Sin email'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                      {investment.investor?.document_id || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs font-mono rounded">
                        {investment.credito?.codigo_credito || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-amber-400">
                        {formatCurrency(investment.monto_invertido)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(investment.id)}
                          disabled={isPending}
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Aprobar inversión"
                        >
                          {isLoading && actionType === 'approve' ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Check size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(investment.id)}
                          disabled={isPending}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Rechazar inversión"
                        >
                          {isLoading && actionType === 'reject' ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <X size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
