'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Banknote, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react'
import { LoanTableRow, InvestorOption } from './actions'
import AddInvestmentModal from './AddInvestmentModal'
import PaymentModal from './PaymentModal'
import EditCreditModal from './EditCreditModal'
import DeleteCreditModal from './DeleteCreditModal'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import ExportExcelButton from '@/components/dashboard/ExportExcelButton'

type SortField = 'code' | 'status' | 'debtor_name' | 'amount_requested' | 'ltv' | 'interest_rate_ea' | 'amount_funded' | 'created_at'
type SortDirection = 'asc' | 'desc'

interface LoansTableProps {
  loans: LoanTableRow[]
  investors: InvestorOption[]
}

type Tab = 'colocados' | 'no_colocados'

export default function LoansTable({ loans, investors }: LoansTableProps) {
  const [activeTab, setActiveTab] = useState<Tab>('colocados')
  const [selectedLoan, setSelectedLoan] = useState<LoanTableRow | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentLoan, setPaymentLoan] = useState<{ id: string; code: string; saldo_capital: number; saldo_intereses: number; saldo_mora: number } | null>(null)
  const [sortField, setSortField] = useState<SortField>('code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const drag = useRef({ isDown: false, moved: false, startX: 0, scrollLeft: 0 })
  const [longPressLoan, setLongPressLoan] = useState<LoanTableRow | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const [editCreditId, setEditCreditId] = useState<string | null>(null)
  const [deleteCreditId, setDeleteCreditId] = useState<string | null>(null)

  const colocados = useMemo(() => loans.filter(l => l.status !== 'cancelled'), [loans])
  const noColocados = useMemo(() => loans.filter(l => l.status === 'cancelled'), [loans])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const container = tableScrollRef.current
    if (!container) return
    drag.current = { isDown: true, moved: false, startX: e.pageX, scrollLeft: container.scrollLeft }
  }, [])

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d.isDown) return
      const dx = e.pageX - d.startX
      if (!d.moved && Math.abs(dx) > 5) {
        d.moved = true
        setIsDragging(true)
      }
      if (d.moved) {
        const container = tableScrollRef.current
        if (container) container.scrollLeft = d.scrollLeft - dx
      }
    }

    const handleDragEnd = () => {
      drag.current.isDown = false
      drag.current.moved = false
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [])

  const currentLoans = activeTab === 'colocados' ? colocados : noColocados

  // Sorted loans
  const sortedLoans = useMemo(() => {
    return [...currentLoans].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'code':
          comparison = (a.code || '').localeCompare(b.code || '')
          break
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '')
          break
        case 'debtor_name':
          comparison = (a.debtor_name || '').localeCompare(b.debtor_name || '')
          break
        case 'amount_requested':
          comparison = (a.amount_requested || 0) - (b.amount_requested || 0)
          break
        case 'ltv':
          comparison = (a.ltv || 0) - (b.ltv || 0)
          break
        case 'interest_rate_ea':
          comparison = (a.interest_rate_ea || 0) - (b.interest_rate_ea || 0)
          break
        case 'amount_funded':
          comparison = (a.amount_funded || 0) - (b.amount_funded || 0)
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [currentLoans, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
  }

  const SortableHeader = ({ field, children, className = '', sticky = false }: { field: SortField; children: React.ReactNode; className?: string; sticky?: boolean }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap ${className} ${sticky ? 'sticky left-0 z-10 bg-slate-800/95 backdrop-blur-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  )

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
      defaulted: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
    const labels: Record<string, string> = {
      fundraising: 'Colocando',
      active: 'Desembolsado',
      completed: 'Completado',
      defaulted: 'En Mora',
      cancelled: 'No Colocado'
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
    setPaymentLoan({ id: loan.id, code: loan.code, saldo_capital: loan.saldo_capital, saldo_intereses: loan.saldo_intereses, saldo_mora: loan.saldo_mora })
    setIsPaymentModalOpen(true)
  }

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false)
    setPaymentLoan(null)
  }

  const handleLongPressStart = useCallback((loan: LoanTableRow) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressLoan(loan)
    }, 500) // 500ms para activar long press
  }, [])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const closeLongPressMenu = useCallback(() => {
    setLongPressLoan(null)
  }, [])

  // Preparar datos para exportar
  const exportData = useMemo(() => loans.map(loan => ({
    codigo: loan.code,
    estado: loan.status,
    deudor: loan.debtor_name,
    cedula_deudor: loan.debtor_cedula,
    co_deudor: loan.co_debtor_name || '',
    ciudad: loan.property_city,
    avaluo: loan.property_value,
    monto_solicitado: loan.amount_requested,
    ltv: loan.ltv,
    riesgo: loan.risk_score,
    tasa_nm: loan.interest_rate_nm,
    tasa_ea: loan.interest_rate_ea,
    comision: loan.debtor_commission,
    fondeado: loan.amount_funded,
    saldo_capital: loan.saldo_capital,
    saldo_intereses: loan.saldo_intereses,
    inversionistas: loan.investors.join(', '),
    fecha: loan.created_at,
  })), [loans])

  const exportHeaders = {
    codigo: 'Codigo',
    estado: 'Estado',
    deudor: 'Deudor',
    cedula_deudor: 'Cedula Deudor',
    co_deudor: 'Co-Deudor',
    ciudad: 'Ciudad',
    avaluo: 'Avaluo',
    monto_solicitado: 'Monto Solicitado',
    ltv: 'LTV %',
    riesgo: 'Riesgo',
    tasa_nm: 'Tasa NM %',
    tasa_ea: 'Tasa EA %',
    comision: 'Comision',
    fondeado: 'Fondeado',
    saldo_capital: 'Saldo Capital',
    saldo_intereses: 'Saldo Intereses',
    inversionistas: 'Inversionistas',
    fecha: 'Fecha Creacion',
  }

  if (loans.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
        <p className="text-slate-500">No hay creditos registrados</p>
      </div>
    )
  }

  const emptyMessage = activeTab === 'colocados'
    ? 'No hay creditos colocados'
    : 'No hay creditos no colocados'

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('colocados')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'colocados'
              ? 'bg-teal-500 text-black'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          Colocados ({colocados.length})
        </button>
        <button
          onClick={() => setActiveTab('no_colocados')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'no_colocados'
              ? 'bg-teal-500 text-black'
              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          No Colocados ({noColocados.length})
        </button>
      </div>

      {currentLoans.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Header con botón de exportar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
          <span className="text-sm text-slate-400">{currentLoans.length} colocaciones</span>
          <ExportExcelButton
            data={exportData}
            filename="colocaciones_aluri"
            sheetName="Colocaciones"
            headers={exportHeaders}
          />
        </div>
        <div
          ref={tableScrollRef}
          className="overflow-x-auto scrollbar-visible cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
        >
          <table className="w-full min-w-[2200px]" style={{ userSelect: isDragging ? 'none' : undefined }}>
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <SortableHeader field="code" className="text-left" sticky>Codigo</SortableHeader>
                <SortableHeader field="status" className="text-left">Estado</SortableHeader>
                <SortableHeader field="debtor_name" className="text-left">Deudor</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Co-Deudor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Ciudad
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Avaluo
                </th>
                <SortableHeader field="amount_requested" className="text-right">Monto</SortableHeader>
                <SortableHeader field="ltv" className="text-right">LTV</SortableHeader>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Riesgo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Tasa NM
                </th>
                <SortableHeader field="interest_rate_ea" className="text-right">Tasa EA</SortableHeader>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Comision
                </th>
                <SortableHeader field="amount_funded" className="text-right">Fondeado</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Inversionistas
                </th>
                <SortableHeader field="created_at" className="text-left">Fecha</SortableHeader>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedLoans.map((loan) => {
                const requested = loan.amount_requested || 0
                const funded = loan.amount_funded || 0
                const remaining = requested - funded
                const canAddInvestment = remaining > 0

                return (
                  <tr
                    key={loan.id}
                    className="hover:bg-slate-800/30 transition-colors relative"
                    onMouseDown={() => handleLongPressStart(loan)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(loan)}
                    onTouchEnd={handleLongPressEnd}
                  >
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 bg-slate-900/95 backdrop-blur-sm shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                      <span className="px-2 py-1 bg-slate-800 text-teal-400 text-xs font-mono rounded">
                        {loan.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(loan.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm text-white">{loan.debtor_name || '-'}</p>
                        <p className="text-xs text-slate-500 font-mono">{loan.debtor_cedula || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                      {loan.co_debtor_name || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {loan.property_city || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 text-right">
                      {formatCurrency(loan.property_value)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium text-right">
                      {formatCurrency(loan.amount_requested)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {getLtvBadge(loan.ltv)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {getRiskBadge(loan.risk_score)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 text-right">
                      {loan.interest_rate_nm ? `${loan.interest_rate_nm}%` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-teal-400 font-medium text-right">
                      {loan.interest_rate_ea ? `${loan.interest_rate_ea}%` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300 text-right">
                      {formatCurrency(loan.debtor_commission)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <div>
                        <span className="text-teal-400 font-medium">{formatCurrency(loan.amount_funded)}</span>
                        {remaining > 0 && (
                          <p className="text-xs text-amber-400">Falta: {formatCurrency(remaining)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        {loan.investors.length > 0 ? (
                          loan.investors.slice(0, 3).map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded"
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(loan.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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

                        {/* Edit Credit Button */}
                        <button
                          onClick={() => setEditCreditId(loan.id)}
                          title="Editar Credito"
                          className="p-2 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>

                        {/* Delete Credit Button */}
                        <button
                          onClick={() => setDeleteCreditId(loan.id)}
                          title="Eliminar Credito"
                          className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>

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
      )}

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
          saldoCapital={paymentLoan.saldo_capital}
          saldoIntereses={paymentLoan.saldo_intereses}
          saldoMora={paymentLoan.saldo_mora}
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
        />
      )}

      {/* Edit Credit Modal */}
      {editCreditId && (
        <EditCreditModal
          creditId={editCreditId}
          isOpen={!!editCreditId}
          onClose={() => setEditCreditId(null)}
        />
      )}

      {/* Delete Credit Modal */}
      {deleteCreditId && (
        <DeleteCreditModal
          creditId={deleteCreditId}
          isOpen={!!deleteCreditId}
          onClose={() => setDeleteCreditId(null)}
        />
      )}

      {/* Long Press Actions Menu */}
      {longPressLoan && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={closeLongPressMenu}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-white font-semibold text-lg">Acciones - {longPressLoan.code}</h3>
              <p className="text-slate-400 text-sm">{longPressLoan.debtor_name}</p>
            </div>

            <div className="space-y-2">
              {/* Add Investment */}
              <button
                onClick={() => {
                  openAddInvestmentModal(longPressLoan)
                  closeLongPressMenu()
                }}
                disabled={longPressLoan.amount_requested - longPressLoan.amount_funded <= 0}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                  longPressLoan.amount_requested - longPressLoan.amount_funded > 0
                    ? 'border-teal-500/30 text-teal-400 hover:bg-teal-500/10'
                    : 'border-slate-700 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Banknote size={20} />
                <span className="font-medium">Agregar Inversión</span>
              </button>

              {/* Register Payment */}
              {(longPressLoan.status === 'active' || longPressLoan.status === 'defaulted') && (
                <button
                  onClick={() => {
                    openPaymentModal(longPressLoan)
                    closeLongPressMenu()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <DollarSign size={20} />
                  <span className="font-medium">Registrar Pago</span>
                </button>
              )}

              {/* Edit Credit */}
              <button
                onClick={() => {
                  setEditCreditId(longPressLoan.id)
                  closeLongPressMenu()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <Pencil size={20} />
                <span className="font-medium">Editar Credito</span>
              </button>

              {/* Delete Credit */}
              <button
                onClick={() => {
                  setDeleteCreditId(longPressLoan.id)
                  closeLongPressMenu()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={20} />
                <span className="font-medium">Eliminar Credito</span>
              </button>

              {/* View Details */}
              <Link
                href={`/dashboard/admin/colocaciones/${longPressLoan.id}`}
                onClick={closeLongPressMenu}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <MoreHorizontal size={20} />
                <span className="font-medium">Ver Detalles y Flujo</span>
              </Link>
            </div>

            <button
              onClick={closeLongPressMenu}
              className="w-full mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
