'use client'

import { useState, useMemo } from 'react'
import { Receipt, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import Link from 'next/link'
import { DEMO_TRANSACCIONES, formatCOP } from '@/lib/demo-data'

type SortKey = 'fecha' | 'credito_codigo' | 'propietario' | 'capital' | 'intereses' | 'mora' | 'total' | 'referencia'
type SortDirection = 'asc' | 'desc'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Build grouped pagos from demo transactions
function buildPagos() {
  const pagosAgrupados: Record<string, {
    referencia: string
    fecha: string
    credito_codigo: string
    credito_id: string
    propietario: string
    capital: number
    intereses: number
    mora: number
    total: number
  }> = {}

  for (const tx of DEMO_TRANSACCIONES) {
    const ref = tx.referencia_pago || tx.id
    if (!pagosAgrupados[ref]) {
      pagosAgrupados[ref] = {
        referencia: ref,
        fecha: tx.fecha_aplicacion,
        credito_codigo: tx.credito_codigo,
        credito_id: tx.credito_id,
        propietario: tx.propietario_name,
        capital: 0,
        intereses: 0,
        mora: 0,
        total: 0,
      }
    }

    const pago = pagosAgrupados[ref]
    if (tx.tipo_transaccion === 'pago_capital') pago.capital += tx.monto
    else if (tx.tipo_transaccion === 'pago_interes') pago.intereses += tx.monto
    else if (tx.tipo_transaccion === 'pago_mora') pago.mora += tx.monto
    pago.total = pago.capital + pago.intereses + pago.mora
  }

  return Object.values(pagosAgrupados).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )
}

export default function DemoPagosPage() {
  const pagos = useMemo(() => buildPagos(), [])
  const [sortKey, setSortKey] = useState<SortKey>('fecha')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Calcular totales
  const totalCapital = pagos.reduce((sum, p) => sum + p.capital, 0)
  const totalIntereses = pagos.reduce((sum, p) => sum + p.intereses, 0)
  const totalMora = pagos.reduce((sum, p) => sum + p.mora, 0)
  const totalGeneral = totalCapital + totalIntereses + totalMora

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedPagos = useMemo(() => {
    return [...pagos].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'fecha':
          comparison = new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
          break
        case 'credito_codigo':
          comparison = a.credito_codigo.localeCompare(b.credito_codigo)
          break
        case 'propietario':
          comparison = a.propietario.localeCompare(b.propietario)
          break
        case 'capital':
          comparison = a.capital - b.capital
          break
        case 'intereses':
          comparison = a.intereses - b.intereses
          break
        case 'mora':
          comparison = a.mora - b.mora
          break
        case 'total':
          comparison = a.total - b.total
          break
        case 'referencia':
          comparison = a.referencia.localeCompare(b.referencia)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [pagos, sortKey, sortDirection])

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown size={14} className="text-slate-600" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-amber-400" />
      : <ChevronDown size={14} className="text-amber-400" />
  }

  const SortableHeader = ({
    columnKey,
    label,
    align = 'left'
  }: {
    columnKey: SortKey
    label: string
    align?: 'left' | 'right'
  }) => (
    <th
      className={`px-4 py-3 text-${align} text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none`}
      onClick={() => handleSort(columnKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
  )

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <Receipt className="text-emerald-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Historial de Pagos</h1>
            <p className="text-slate-400 mt-1">
              {pagos.length} pagos registrados
            </p>
          </div>
        </div>
      </header>

      {/* Resumen de Totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-1">Total Recaudado</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCOP(totalGeneral)}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-1">Capital</p>
          <p className="text-xl font-bold text-blue-400">{formatCOP(totalCapital)}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-1">Intereses</p>
          <p className="text-xl font-bold text-emerald-400">{formatCOP(totalIntereses)}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-sm mb-1">Mora</p>
          <p className="text-xl font-bold text-red-400">{formatCOP(totalMora)}</p>
        </div>
      </div>

      {/* Tabla de Pagos */}
      {pagos.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <Receipt className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
            <span className="text-sm text-slate-400">{pagos.length} pagos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <SortableHeader columnKey="fecha" label="Fecha" />
                  <SortableHeader columnKey="credito_codigo" label="Credito" />
                  <SortableHeader columnKey="propietario" label="Propietario" />
                  <SortableHeader columnKey="capital" label="Capital" align="right" />
                  <SortableHeader columnKey="intereses" label="Intereses" align="right" />
                  <SortableHeader columnKey="mora" label="Mora" align="right" />
                  <SortableHeader columnKey="total" label="Total" align="right" />
                  <SortableHeader columnKey="referencia" label="Referencia" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedPagos.map((pago) => (
                  <tr key={pago.referencia} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
                      {formatDate(pago.fecha)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/dashboard/demo/admin/colocaciones/${pago.credito_id}`}
                        className="px-2 py-1 bg-slate-800 text-teal-400 text-xs font-mono rounded hover:bg-slate-700 transition-colors"
                      >
                        {pago.credito_codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                      {pago.propietario}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {pago.capital > 0 ? (
                        <span className="text-blue-400">{formatCOP(pago.capital)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {pago.intereses > 0 ? (
                        <span className="text-emerald-400">{formatCOP(pago.intereses)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {pago.mora > 0 ? (
                        <span className="text-red-400">{formatCOP(pago.mora)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-white">
                      {formatCOP(pago.total)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {pago.referencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
