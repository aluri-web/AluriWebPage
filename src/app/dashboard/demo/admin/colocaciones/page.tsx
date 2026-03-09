'use client'

import { useState, useMemo } from 'react'
import { FileSpreadsheet, Plus, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { DEMO_CREDITOS, DEMO_INVERSIONES, formatCOP } from '@/lib/demo-data'

type SortField = 'code' | 'status' | 'debtor_name' | 'amount_requested' | 'ltv' | 'interest_rate_ea' | 'amount_funded' | 'created_at'
type SortDirection = 'asc' | 'desc'
type Tab = 'colocados' | 'no_colocados'

// Build loan table rows from demo data
function buildLoanRows() {
  return DEMO_CREDITOS.map(c => {
    const creditInvestors = DEMO_INVERSIONES
      .filter(i => i.credito_id === c.id && i.estado === 'activo')
      .map(i => i.investor_name)

    return {
      id: c.id,
      code: c.codigo_credito,
      status: c.estado === 'activo' ? 'active' :
              c.estado === 'publicado' ? 'fundraising' :
              c.estado === 'completado' ? 'completed' :
              c.estado === 'cancelado' ? 'cancelled' : c.estado,
      amount_requested: c.monto_solicitado,
      amount_funded: c.valor_colocado,
      interest_rate_nm: c.tasa_nominal,
      interest_rate_ea: c.tasa_interes_ea,
      debtor_commission: c.comision_deudor,
      debtor_name: c.cliente_name,
      debtor_cedula: c.cliente_cedula,
      co_debtor_name: c.co_deudor_name,
      property_city: c.ciudad_inmueble,
      property_value: c.valor_comercial,
      ltv: c.ltv,
      risk_score: c.risk_score,
      investors: creditInvestors,
      created_at: c.created_at,
      saldo_capital: c.saldo_capital,
      saldo_intereses: c.saldo_intereses,
      saldo_mora: c.saldo_mora,
      en_mora: c.en_mora,
    }
  })
}

export default function DemoColocacionesPage() {
  const loans = useMemo(() => buildLoanRows(), [])
  const [activeTab, setActiveTab] = useState<Tab>('colocados')
  const [sortField, setSortField] = useState<SortField>('code')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const colocados = useMemo(() => loans.filter(l => l.status !== 'cancelled'), [loans])
  const noColocados = useMemo(() => loans.filter(l => l.status === 'cancelled'), [loans])

  const currentLoans = activeTab === 'colocados' ? colocados : noColocados

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

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return formatCOP(amount)
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

  const emptyMessage = activeTab === 'colocados'
    ? 'No hay creditos colocados'
    : 'No hay creditos no colocados'

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl">
            <FileSpreadsheet size={24} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Colocaciones</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Gestiona todos los creditos registrados
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/demo/admin/colocaciones/nueva-colocacion"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Nueva Colocacion
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
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

      {/* Table */}
      {currentLoans.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
            <span className="text-sm text-slate-400">{currentLoans.length} colocaciones</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1600px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th
                    onClick={() => handleSort('code')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap sticky left-0 z-10 bg-slate-800/95 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-1.5">Codigo <SortIcon field="code" /></div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">Estado <SortIcon field="status" /></div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Mora
                  </th>
                  <th
                    onClick={() => handleSort('debtor_name')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">Deudor <SortIcon field="debtor_name" /></div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Ciudad
                  </th>
                  <th
                    onClick={() => handleSort('amount_requested')}
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5 justify-end">Monto <SortIcon field="amount_requested" /></div>
                  </th>
                  <th
                    onClick={() => handleSort('interest_rate_ea')}
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5 justify-end">Tasa EA <SortIcon field="interest_rate_ea" /></div>
                  </th>
                  <th
                    onClick={() => handleSort('ltv')}
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5 justify-end">LTV <SortIcon field="ltv" /></div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Inversionistas
                  </th>
                  <th
                    onClick={() => handleSort('amount_funded')}
                    className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5 justify-end">Fondeado <SortIcon field="amount_funded" /></div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedLoans.map((loan) => {
                  const requested = loan.amount_requested || 0
                  const funded = loan.amount_funded || 0
                  const remaining = requested - funded

                  return (
                    <tr key={loan.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 bg-slate-900/95 backdrop-blur-sm">
                        <span className="px-2 py-1 bg-slate-800 text-teal-400 text-xs font-mono rounded">
                          {loan.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(loan.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {loan.status === 'active' || loan.status === 'defaulted' ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${
                            loan.en_mora
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {loan.en_mora ? 'En Mora' : 'Al Dia'}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-white">{loan.debtor_name || '-'}</p>
                          <p className="text-xs text-slate-500 font-mono">{loan.debtor_cedula || ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                        {loan.property_city || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-medium text-right">
                        {formatCurrency(loan.amount_requested)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-teal-400 font-medium text-right">
                        {loan.interest_rate_ea ? `${loan.interest_rate_ea}%` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {getLtvBadge(loan.ltv)}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <div>
                          <span className="text-teal-400 font-medium">{formatCurrency(loan.amount_funded)}</span>
                          {remaining > 0 && (
                            <p className="text-xs text-amber-400">Falta: {formatCurrency(remaining)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Link
                          href={`/dashboard/demo/admin/colocaciones/${loan.id}`}
                          title="Ver Detalles"
                          className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors inline-flex"
                        >
                          <MoreHorizontal size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
