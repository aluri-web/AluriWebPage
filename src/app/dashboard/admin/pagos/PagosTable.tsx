'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import ExportExcelButton from '@/components/dashboard/ExportExcelButton'

interface PagoAgrupado {
  referencia: string
  fecha: string
  credito_codigo: string
  credito_id: string
  propietario: string
  capital: number
  intereses: number
  mora: number
  total: number
}

interface PagosTableProps {
  pagos: PagoAgrupado[]
}

type SortKey = 'fecha' | 'credito_codigo' | 'propietario' | 'capital' | 'intereses' | 'mora' | 'total' | 'referencia'
type SortDirection = 'asc' | 'desc'

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function PagosTable({ pagos }: PagosTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('fecha')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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

  // Preparar datos para exportar
  const exportData = sortedPagos.map(p => ({
    fecha: p.fecha,
    credito: p.credito_codigo,
    propietario: p.propietario,
    capital: p.capital,
    intereses: p.intereses,
    mora: p.mora,
    total: p.total,
    referencia: p.referencia,
  }))

  const exportHeaders = {
    fecha: 'Fecha',
    credito: 'Credito',
    propietario: 'Propietario',
    capital: 'Capital',
    intereses: 'Intereses',
    mora: 'Mora',
    total: 'Total',
    referencia: 'Referencia',
  }

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
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header con botón de exportar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-800/30">
        <span className="text-sm text-slate-400">{pagos.length} pagos</span>
        <ExportExcelButton
          data={exportData}
          filename="pagos_aluri"
          sheetName="Pagos"
          headers={exportHeaders}
        />
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
                    href={`/dashboard/admin/colocaciones/${pago.credito_id}`}
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
                  {pago.referencia.substring(0, 20)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
