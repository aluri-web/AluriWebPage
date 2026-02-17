'use client'

import { useState } from 'react'
import { Banknote, DollarSign } from 'lucide-react'
import { LoanTableRow, InvestorOption } from './actions'
import AddInvestmentModal from './AddInvestmentModal'
import PaymentModal from './PaymentModal'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

interface LoansTableProps {
  loans: LoanTableRow[]
  investors: InvestorOption[]
}

export default function LoansTable({ loans, investors }: LoansTableProps) {
  const [selectedLoan, setSelectedLoan] = useState<LoanTableRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentLoan, setPaymentLoan] = useState<{ id: string; code: string } | null>(null)

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
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
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      fundraising: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      defaulted: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    const labels: Record<string, string> = {
      fundraising: 'Fondeando',
      active: 'Activo',
      completed: 'Completado',
      defaulted: 'En Mora'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status] || 'bg-slate-500/20 text-slate-400'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getLtvBadge = (ltv: number | null) => {
    if (!ltv) return <span className="text-slate-500">-</span>
    let color = 'text-emerald-400'
    if (ltv > 70) color = 'text-red-400'
    else if (ltv > 50) color = 'text-amber-400'
    return <span className={`font-medium ${color}`}>{ltv.toFixed(1)}%</span>
  }

  const getRiskBadge = (score: string | null) => {
    if (!score) return <span className="text-slate-500">-</span>
    const styles: Record<string, string> = {
      'A1': 'bg-teal-400/10 text-teal-400 border-teal-400/30',
      'A2': 'bg-teal-400/10 text-teal-400 border-teal-400/30',
      'B1': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'B2': 'bg-red-500/10 text-red-400 border-red-500/30',
    }
    const labels: Record<string, string> = {
      'A1': 'Bajo',
      'A2': 'Moderado',
      'B1': 'Medio',
      'B2': 'Alto',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[score] || ''}`}>
        {score} - {labels[score] || score}
      </span>
    )
  }

  const openAddInvestmentModal = (loan: LoanTableRow) => {
    setSelectedLoan(loan)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedLoan(null)
  }

  const openPaymentModal = (loan: LoanTableRow) => {
    setPaymentLoan({ id: loan.id, code: loan.code })
    setIsPaymentModalOpen(true)
  }

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false)
    setPaymentLoan(null)
  }

  if (loans.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
        <p className="text-slate-500">No hay creditos registrados</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1600px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Codigo
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Deudor
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Co-Deudor
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ciudad
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Avaluo
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  LTV
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Riesgo
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tasa NM
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tasa EA
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Comision
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fondeado
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Inversionistas
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loans.map((loan) => {
                const requested = loan.amount_requested || 0
                const funded = loan.amount_funded || 0
                const remaining = requested - funded
                const canAddInvestment = remaining > 0

                return (
                  <tr key={loan.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-3">
                      <span className="px-2 py-1 bg-slate-800 text-teal-400 text-xs font-mono rounded">
                        {loan.code}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {getStatusBadge(loan.status)}
                    </td>
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-sm text-white">{loan.debtor_name || '-'}</p>
                        <p className="text-xs text-slate-500 font-mono">{loan.debtor_cedula || ''}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-400">
                      {loan.co_debtor_name || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-300">
                      {loan.property_city || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-300 text-right">
                      {formatCurrency(loan.property_value)}
                    </td>
                    <td className="px-3 py-3 text-sm text-white font-medium text-right">
                      {formatCurrency(loan.amount_requested)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right">
                      {getLtvBadge(loan.ltv)}
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      {getRiskBadge(loan.risk_score)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-300 text-right">
                      {loan.interest_rate_nm ? `${loan.interest_rate_nm}%` : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-teal-400 font-medium text-right">
                      {loan.interest_rate_ea ? `${loan.interest_rate_ea}%` : '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-300 text-right">
                      {formatCurrency(loan.debtor_commission)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right">
                      <div>
                        <span className="text-teal-400 font-medium">{formatCurrency(loan.amount_funded)}</span>
                        {remaining > 0 && (
                          <p className="text-xs text-amber-400">Falta: {formatCurrency(remaining)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {loan.investors.length > 0 ? (
                          loan.investors.slice(0, 3).map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded truncate max-w-[70px]"
                              title={name}
                            >
                              {name.split(' ')[0]}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                        {loan.investors.length > 3 && (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                            +{loan.investors.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500">
                      {formatDate(loan.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Add Investment Button */}
                        <button
                          onClick={() => openAddInvestmentModal(loan)}
                          disabled={!canAddInvestment}
                          title={canAddInvestment ? 'Agregar inversion' : 'Credito completamente fondeado'}
                          className={`p-2 rounded-lg border transition-colors ${canAddInvestment
                            ? 'border-teal-500/30 text-teal-400 hover:bg-teal-500/10 hover:border-teal-500/50'
                            : 'border-slate-700 text-slate-600 cursor-not-allowed'
                            }`}
                        >
                          <Banknote size={16} />
                        </button>

                        {/* Register Payment Button - only for active or defaulted loans */}
                        {(loan.status === 'active' || loan.status === 'defaulted') && (
                          <button
                            onClick={() => openPaymentModal(loan)}
                            title="Registrar Pago"
                            className="p-2 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-colors"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}

                        <Link
                          href={`/dashboard/admin/colocaciones/${loan.id}`}
                          title="Ver Detalles y Flujo"
                          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Investment Modal */}
      {selectedLoan && (
        <AddInvestmentModal
          loan={selectedLoan}
          investors={investors}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      )}

      {/* Payment Modal */}
      {paymentLoan && (
        <PaymentModal
          loanId={paymentLoan.id}
          loanCode={paymentLoan.code}
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
        />
      )}
    </>
  )
}
