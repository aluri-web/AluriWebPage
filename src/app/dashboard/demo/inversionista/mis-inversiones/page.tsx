'use client'

import { useState, useMemo } from 'react'
import { Briefcase, Eye, TrendingUp, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import {
  DEMO_INVERSIONES,
  DEMO_CREDITOS,
  DEMO_TRANSACCIONES,
  formatCOP,
} from '@/lib/demo-data'

type SortField = 'codigo' | 'monto' | 'tasa' | 'progreso'
type SortDirection = 'asc' | 'desc'

const INVESTOR_ID = 'demo-inv-001'

// Build enriched investment data
function useInvestmentData() {
  const myInvestments = DEMO_INVERSIONES.filter(
    (i) =>
      i.inversionista_id === INVESTOR_ID &&
      i.estado !== 'cancelado' &&
      i.estado !== 'rechazado'
  )

  return myInvestments.map((inv) => {
    const credito = DEMO_CREDITOS.find((c) => c.id === inv.credito_id) || null
    const txs = credito
      ? DEMO_TRANSACCIONES.filter((tx) => tx.credito_id === credito.id)
      : []

    // Build nested structure matching real page
    const inversiones = DEMO_INVERSIONES.filter(
      (i) => i.credito_id === inv.credito_id
    ).map((i) => ({ monto_invertido: i.monto_invertido, estado: i.estado }))

    const transacciones = txs.map((tx) => ({
      tipo_transaccion: tx.tipo_transaccion,
      monto: tx.monto,
      fecha_aplicacion: tx.fecha_aplicacion,
    }))

    return {
      id: inv.id,
      monto_invertido: inv.monto_invertido,
      interest_rate_investor: inv.interest_rate_investor,
      estado: inv.estado,
      created_at: inv.created_at,
      confirmed_at: inv.confirmed_at,
      credito_id: inv.credito_id,
      credito: credito
        ? {
            codigo_credito: credito.codigo_credito,
            estado: credito.estado,
            estado_credito: credito.estado === 'finalizado' ? 'pagado' : null,
            tasa_interes_ea: credito.tasa_interes_ea,
            tasa_nominal: credito.tasa_nominal,
            monto_solicitado: credito.monto_solicitado,
            valor_colocado: credito.valor_colocado,
            plazo: credito.plazo,
            ciudad_inmueble: credito.ciudad_inmueble,
            direccion_inmueble: credito.direccion_inmueble,
            tipo_inmueble: credito.tipo_inmueble,
            valor_comercial: credito.valor_comercial,
            saldo_capital: credito.saldo_capital,
            saldo_intereses: credito.saldo_intereses,
            saldo_mora: credito.saldo_mora,
            fecha_ultimo_pago: null as string | null,
            en_mora: credito.en_mora,
            transacciones,
            inversiones,
            cliente: { full_name: credito.cliente_name },
          }
        : null,
    }
  })
}

type Credito = NonNullable<ReturnType<typeof useInvestmentData>[0]['credito']>
type Investment = ReturnType<typeof useInvestmentData>[0]

function calculateInvestmentProgress(inv: Investment) {
  const credito = inv.credito
  if (!credito || !credito.transacciones || credito.transacciones.length === 0) {
    return { share: 0, capitalRecuperado: 0, interesesGanados: 0, progressPercent: 0 }
  }
  const montoSolicitado = credito.monto_solicitado || 0
  const montoInvertido = inv.monto_invertido || 0
  const share = montoSolicitado > 0 ? montoInvertido / montoSolicitado : 0

  const totalLoanCapital = credito.transacciones
    .filter((t) => t.tipo_transaccion === 'pago_capital')
    .reduce((sum, t) => sum + (t.monto || 0), 0)
  const totalLoanInterest = credito.transacciones
    .filter((t) => t.tipo_transaccion === 'pago_interes')
    .reduce((sum, t) => sum + (t.monto || 0), 0)

  const capitalRecuperado = totalLoanCapital * share
  const interesesGanados = totalLoanInterest * share

  const estadoCredito = credito.estado_credito || ''
  const progressPercent =
    estadoCredito === 'pagado'
      ? 100
      : montoInvertido > 0
        ? (capitalRecuperado / montoInvertido) * 100
        : 0

  return { share, capitalRecuperado, interesesGanados, progressPercent }
}

export default function DemoMisInversionesPage() {
  const investments = useInvestmentData()

  // Filter for KPI calculations (activo + mora credito status)
  const activeInvestments = investments.filter(
    (inv) => inv.credito?.estado === 'activo' || inv.credito?.estado === 'mora'
  )

  // KPI Calculations
  const cantidadInversiones = investments.length
  const cantidadActivas = activeInvestments.length
  const montoInvertidoTotal = investments.reduce(
    (sum, inv) => sum + Number(inv.monto_invertido || 0),
    0
  )

  const rentabilidadPromedio =
    montoInvertidoTotal > 0
      ? investments.reduce((acc, inv) => {
          const rate = inv.interest_rate_investor
            ? inv.interest_rate_investor * 12
            : inv.credito?.tasa_interes_ea || 0
          return acc + Number(inv.monto_invertido) * Number(rate)
        }, 0) / montoInvertidoTotal
      : 0

  let totalCapitalRecuperado = 0
  let totalInteresesGanados = 0

  investments.forEach((inv) => {
    const credito = inv.credito
    if (!credito || !credito.transacciones) return
    const montoSolicitado = credito.monto_solicitado || 0
    const montoInvertido = inv.monto_invertido || 0
    const share = montoSolicitado > 0 ? montoInvertido / montoSolicitado : 0

    const totalLoanCapital = credito.transacciones
      .filter((t) => t.tipo_transaccion === 'pago_capital')
      .reduce((sum, t) => sum + (t.monto || 0), 0)
    const totalLoanInterest = credito.transacciones
      .filter((t) => t.tipo_transaccion === 'pago_interes')
      .reduce((sum, t) => sum + (t.monto || 0), 0)

    totalCapitalRecuperado += totalLoanCapital * share
    totalInteresesGanados += totalLoanInterest * share
  })

  const recaudadoTotal = totalCapitalRecuperado + totalInteresesGanados

  let capitalVigente = 0
  investments.forEach((inv) => {
    const credito = inv.credito
    if (!credito) return
    const montoSolicitado = credito.monto_solicitado || 0
    const montoInvertido = inv.monto_invertido || 0
    const share = montoSolicitado > 0 ? montoInvertido / montoSolicitado : 0
    const saldoCapital = credito.saldo_capital || 0
    const saldoIntereses = credito.saldo_intereses || 0
    const saldoMora = credito.saldo_mora || 0
    capitalVigente += (saldoCapital + saldoIntereses + saldoMora) * share
  })

  return (
    <div className="text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Mis Inversiones</h1>
        <p className="text-zinc-500 mt-1">Estado de cuenta detallado</p>
      </header>

      {/* KPI Summary Card */}
      <div className="mb-8">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
          <h2 className="text-xl font-semibold mb-6 text-white">
            Resumen de Inversiones
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Total de Inversiones</span>
              <span className="text-2xl font-bold text-white">{cantidadInversiones}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Inversiones Activas</span>
              <span className="text-2xl font-bold text-teal-400">{cantidadActivas}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Monto Invertido Total</span>
              <span className="text-2xl font-bold text-white">{formatCOP(montoInvertidoTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Rentabilidad Promedio</span>
              <span className="text-2xl font-bold text-teal-400">
                {rentabilidadPromedio.toFixed(2)}% E.A.
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Capital Invertido Vigente</span>
              <span className="text-2xl font-bold text-white">{formatCOP(capitalVigente)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Capital Recuperado</span>
              <span className="text-2xl font-bold text-blue-400">{formatCOP(totalCapitalRecuperado)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-zinc-500">Intereses Ganados</span>
              <span className="text-2xl font-bold text-amber-400">{formatCOP(totalInteresesGanados)}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-zinc-500">Recaudado Total</span>
              <span className="text-2xl font-bold text-emerald-400">{formatCOP(recaudadoTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Investment Tabs */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-white">
          Detalle de Inversiones
        </h2>

        {investments.length > 0 ? (
          <DemoInvestmentsTabs investments={investments} />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-700">
            <Briefcase size={48} className="mb-4 opacity-50" />
            <p>No se encontraron inversiones.</p>
            <Link
              href="/dashboard/demo/inversionista/marketplace"
              className="mt-4 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Explorar Marketplace
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline DemoInvestmentsTabs component
function DemoInvestmentsTabs({ investments }: { investments: Investment[] }) {
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active')

  const activeInvestments = investments.filter(
    (inv) =>
      (inv.credito?.estado === 'activo' || inv.credito?.estado === 'mora') &&
      inv.credito?.estado_credito !== 'pagado'
  )
  const pendingInvestments = investments.filter(
    (inv) => !activeInvestments.includes(inv)
  )

  const getMoraBadge = (credito: Credito | null) => {
    if (!credito) return null
    const estadoCredito = credito.estado_credito || ''
    if (estadoCredito === 'pagado') {
      return <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-400">Pagado</span>
    }
    if (credito.en_mora) {
      return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500 text-white">Si</span>
    }
    return <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-500 text-white">No</span>
  }

  return (
    <div>
      <div className="flex border-b border-zinc-700 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'active' ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} />
            Portafolio Activo
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'active' ? 'bg-teal-500/20 text-teal-400' : 'bg-zinc-700 text-zinc-400'}`}>
              {activeInvestments.length}
            </span>
          </div>
          {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'pending' ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            En Fondeo / Historico
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'pending' ? 'bg-teal-500/20 text-teal-400' : 'bg-zinc-700 text-zinc-400'}`}>
              {pendingInvestments.length}
            </span>
          </div>
          {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400" />}
        </button>
      </div>

      {activeTab === 'active' ? (
        <ActiveTable investments={activeInvestments} getMoraBadge={getMoraBadge} />
      ) : (
        <PendingTable investments={pendingInvestments} getMoraBadge={getMoraBadge} />
      )}
    </div>
  )
}

function ActiveTable({ investments, getMoraBadge }: { investments: Investment[]; getMoraBadge: (c: Credito | null) => JSX.Element | null }) {
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedInvestments = useMemo(() => {
    return [...investments].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'codigo':
          comparison = (a.credito?.codigo_credito || '').localeCompare(b.credito?.codigo_credito || '')
          break
        case 'monto':
          comparison = (a.monto_invertido || 0) - (b.monto_invertido || 0)
          break
        case 'tasa': {
          const rateA = a.interest_rate_investor ? a.interest_rate_investor * 12 : a.credito?.tasa_interes_ea || 0
          const rateB = b.interest_rate_investor ? b.interest_rate_investor * 12 : b.credito?.tasa_interes_ea || 0
          comparison = rateA - rateB
          break
        }
        case 'progreso':
          comparison = calculateInvestmentProgress(a).progressPercent - calculateInvestmentProgress(b).progressPercent
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [investments, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30" />
    return sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-700">
        <TrendingUp size={40} className="mb-3 opacity-50" />
        <p>No tienes inversiones activas en este momento.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/50">
              <th onClick={() => handleSort('codigo')} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center gap-1">Codigo <SortIcon field="codigo" /></div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Propietario</th>
              <th onClick={() => handleSort('monto')} className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center justify-end gap-1">Mi Inversion <SortIcon field="monto" /></div>
              </th>
              <th onClick={() => handleSort('tasa')} className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center justify-end gap-1">Tasa <SortIcon field="tasa" /></div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Mora</th>
              <th onClick={() => handleSort('progreso')} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center gap-1">Progreso / Ganancias <SortIcon field="progreso" /></div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedInvestments.map((inv) => {
              const credito = inv.credito
              const propietarioName = credito?.cliente?.full_name || 'Sin asignar'
              const rate = inv.interest_rate_investor ? inv.interest_rate_investor * 12 : credito?.tasa_interes_ea || 0
              const { capitalRecuperado, interesesGanados, progressPercent } = calculateInvestmentProgress(inv)

              return (
                <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-zinc-800 text-teal-400 text-xs font-mono rounded">
                      {credito?.codigo_credito || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4"><span className="text-white text-sm">{propietarioName}</span></td>
                  <td className="px-4 py-4 text-right"><span className="text-white font-medium">{formatCOP(inv.monto_invertido)}</span></td>
                  <td className="px-4 py-4 text-right"><span className="text-teal-400 font-medium">{rate.toFixed(1)}% E.A.</span></td>
                  <td className="px-4 py-4 text-center">{getMoraBadge(credito)}</td>
                  <td className="px-4 py-4">
                    <div className="w-36">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-500">Capital: {progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                          style={{ width: `${Math.min(100, progressPercent)}%` }}
                        />
                      </div>
                      <div className="text-xs">
                        <span className="text-amber-400 font-medium">Intereses: {formatCOP(interesesGanados)}</span>
                      </div>
                      {capitalRecuperado > 0 && (
                        <div className="text-xs mt-0.5">
                          <span className="text-blue-400">Recuperado: {formatCOP(capitalRecuperado)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link
                      href={`/dashboard/demo/inversionista/mis-inversiones/${credito?.codigo_credito || inv.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-400 border border-teal-500/30 rounded-lg hover:bg-teal-500/10 transition-colors"
                    >
                      <Eye size={14} />
                      Ver Detalles
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PendingTable({ investments, getMoraBadge }: { investments: Investment[]; getMoraBadge: (c: Credito | null) => JSX.Element | null }) {
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedInvestments = useMemo(() => {
    return [...investments].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'codigo':
          comparison = (a.credito?.codigo_credito || '').localeCompare(b.credito?.codigo_credito || '')
          break
        case 'monto':
          comparison = (a.monto_invertido || 0) - (b.monto_invertido || 0)
          break
        case 'tasa': {
          const rA = a.interest_rate_investor ? a.interest_rate_investor * 12 : a.credito?.tasa_interes_ea || 0
          const rB = b.interest_rate_investor ? b.interest_rate_investor * 12 : b.credito?.tasa_interes_ea || 0
          comparison = rA - rB
          break
        }
        case 'progreso': {
          const getProgress = (inv: Investment) => {
            const requested = inv.credito?.monto_solicitado || 0
            const funded = (inv.credito?.inversiones || [])
              .filter((i) => !['cancelado', 'rechazado'].includes(i.estado))
              .reduce((s, i) => s + (i.monto_invertido || 0), 0)
            return requested > 0 ? (funded / requested) * 100 : 0
          }
          comparison = getProgress(a) - getProgress(b)
          break
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [investments, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30" />
    return sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  if (investments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-700">
        <Clock size={40} className="mb-3 opacity-50" />
        <p>No tienes inversiones en fondeo o historicas.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/50">
              <th onClick={() => handleSort('codigo')} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center gap-1">Codigo <SortIcon field="codigo" /></div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Propietario</th>
              <th onClick={() => handleSort('monto')} className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center justify-end gap-1">Mi Inversion <SortIcon field="monto" /></div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Mora</th>
              <th onClick={() => handleSort('progreso')} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200">
                <div className="flex items-center gap-1">Progreso Fondeo <SortIcon field="progreso" /></div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedInvestments.map((inv) => {
              const credito = inv.credito
              const propietarioName = credito?.cliente?.full_name || 'Sin asignar'
              const requested = credito?.monto_solicitado || 0
              const funded = (credito?.inversiones || [])
                .filter((i) => !['cancelado', 'rechazado'].includes(i.estado))
                .reduce((s, i) => s + (i.monto_invertido || 0), 0)
              const fundingProgress = requested > 0 ? (funded / requested) * 100 : 0

              return (
                <tr key={inv.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-zinc-800 text-teal-400 text-xs font-mono rounded">
                      {credito?.codigo_credito || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-4"><span className="text-white text-sm">{propietarioName}</span></td>
                  <td className="px-4 py-4 text-right"><span className="text-white font-medium">{formatCOP(inv.monto_invertido)}</span></td>
                  <td className="px-4 py-4 text-center">{getMoraBadge(credito)}</td>
                  <td className="px-4 py-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-500">{fundingProgress.toFixed(0)}%</span>
                        <span className="text-zinc-500">{formatCOP(funded)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${fundingProgress >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                          style={{ width: `${Math.min(100, fundingProgress)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Link
                      href={`/dashboard/demo/inversionista/mis-inversiones/${credito?.codigo_credito || inv.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-400 border border-teal-500/30 rounded-lg hover:bg-teal-500/10 transition-colors"
                    >
                      <Eye size={14} />
                      Ver Detalles
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
