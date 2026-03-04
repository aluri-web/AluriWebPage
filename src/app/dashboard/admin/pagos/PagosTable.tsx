'use client'

import Link from 'next/link'
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
  // Preparar datos para exportar
  const exportData = pagos.map(p => ({
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Credito
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Propietario
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Capital
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Intereses
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mora
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Referencia
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {pagos.map((pago) => (
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
