import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  DEMO_CREDITOS,
  DEMO_INVERSIONES,
  DEMO_TRANSACCIONES,
  formatCOP,
  formatDate,
} from '@/lib/demo-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DemoColocacionDetailPage({ params }: PageProps) {
  const { id } = await params
  const credito = DEMO_CREDITOS.find(c => c.id === id)

  if (!credito) {
    return (
      <div className="p-8 text-white">
        <Link
          href="/dashboard/demo/admin/colocaciones"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span>Volver a Colocaciones</span>
        </Link>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400 text-lg">Credito no encontrado</p>
        </div>
      </div>
    )
  }

  // Get investors for this credit
  const investors = DEMO_INVERSIONES.filter(i => i.credito_id === credito.id)
  const activeInvestors = investors.filter(i => i.estado === 'activo')

  // Get transactions (payments) for this credit
  const transactions = DEMO_TRANSACCIONES.filter(t => t.credito_id === credito.id)

  // Group transactions by referencia_pago
  const pagosAgrupados: Record<string, {
    referencia: string
    fecha: string
    capital: number
    intereses: number
    mora: number
    total: number
  }> = {}

  for (const tx of transactions) {
    const ref = tx.referencia_pago
    if (!pagosAgrupados[ref]) {
      pagosAgrupados[ref] = {
        referencia: ref,
        fecha: tx.fecha_aplicacion,
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

  const pagos = Object.values(pagosAgrupados).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  const getStatusBadge = (estado: string) => {
    const styles: Record<string, string> = {
      activo: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      publicado: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      completado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      cancelado: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      fondeado: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    }
    const labels: Record<string, string> = {
      activo: 'Activo',
      publicado: 'Publicado',
      completado: 'Completado',
      cancelado: 'Cancelado',
      fondeado: 'Fondeado',
    }
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${styles[estado] || 'bg-slate-500/20 text-slate-400'}`}>
        {labels[estado] || estado}
      </span>
    )
  }

  return (
    <div className="p-8 text-white">
      {/* Back link */}
      <Link
        href="/dashboard/demo/admin/colocaciones"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        <span>Volver a Colocaciones</span>
      </Link>

      {/* Header */}
      <header className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white">{credito.codigo_credito}</h1>
          {getStatusBadge(credito.estado)}
          {credito.en_mora && (
            <span className="px-3 py-1 text-sm font-medium rounded-full border bg-red-500/20 text-red-400 border-red-500/30">
              En Mora
            </span>
          )}
        </div>
        <p className="text-slate-400 mt-1">
          Detalle del credito y flujo de pagos
        </p>
      </header>

      {/* Credit Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Credit Info */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Informacion del Credito</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Monto Solicitado</p>
              <p className="text-sm text-white font-medium">{formatCOP(credito.monto_solicitado)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Valor Colocado</p>
              <p className="text-sm text-teal-400 font-medium">{formatCOP(credito.valor_colocado)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Tasa NM</p>
              <p className="text-sm text-white">{credito.tasa_nominal}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Tasa EA</p>
              <p className="text-sm text-teal-400 font-medium">{credito.tasa_interes_ea}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Plazo</p>
              <p className="text-sm text-white">{credito.plazo} meses</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">LTV</p>
              <p className={`text-sm font-medium ${credito.ltv > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {credito.ltv.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Riesgo</p>
              <p className="text-sm text-white">{credito.risk_score || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Comision Deudor</p>
              <p className="text-sm text-white">{formatCOP(credito.comision_deudor)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Fecha Creacion</p>
              <p className="text-sm text-slate-300">{formatDate(credito.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Informacion del Inmueble</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Tipo</p>
              <p className="text-sm text-white">{credito.tipo_inmueble}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Ciudad</p>
              <p className="text-sm text-white">{credito.ciudad_inmueble}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-1">Direccion</p>
              <p className="text-sm text-white">{credito.direccion_inmueble}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Valor Comercial</p>
              <p className="text-sm text-white font-medium">{formatCOP(credito.valor_comercial)}</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-3">Deudor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nombre</p>
                <p className="text-sm text-white">{credito.cliente_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Cedula</p>
                <p className="text-sm text-slate-300 font-mono">{credito.cliente_cedula}</p>
              </div>
              {credito.co_deudor_name && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Co-Deudor</p>
                  <p className="text-sm text-white">{credito.co_deudor_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Saldos */}
      {(credito.estado === 'activo' || credito.en_mora) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Saldo Capital</p>
            <p className="text-2xl font-bold text-blue-400">{formatCOP(credito.saldo_capital)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Saldo Intereses</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCOP(credito.saldo_intereses)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Saldo Mora</p>
            <p className={`text-2xl font-bold ${credito.saldo_mora > 0 ? 'text-red-400' : 'text-slate-500'}`}>
              {formatCOP(credito.saldo_mora)}
            </p>
          </div>
        </div>
      )}

      {/* Investors */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">
          Inversionistas ({activeInvestors.length})
        </h2>
        {activeInvestors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Inversionista</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Email</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Cedula</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Monto</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {activeInvestors.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-white font-medium">{inv.investor_name}</td>
                    <td className="py-3 px-4 text-slate-300">{inv.investor_email}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{inv.investor_cedula}</td>
                    <td className="py-3 px-4 text-teal-400 font-medium text-right">{formatCOP(inv.monto_invertido)}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(inv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-6">No hay inversionistas para este credito</p>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">
          Historial de Pagos ({pagos.length})
        </h2>
        {pagos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Fecha</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Capital</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Intereses</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Mora</th>
                  <th className="text-right text-slate-400 font-medium py-3 px-4">Total</th>
                  <th className="text-left text-slate-400 font-medium py-3 px-4">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(pago => (
                  <tr key={pago.referencia} className="border-b border-slate-700/50">
                    <td className="py-3 px-4 text-slate-300">{formatDate(pago.fecha)}</td>
                    <td className="py-3 px-4 text-right">
                      {pago.capital > 0 ? (
                        <span className="text-blue-400">{formatCOP(pago.capital)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pago.intereses > 0 ? (
                        <span className="text-emerald-400">{formatCOP(pago.intereses)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {pago.mora > 0 ? (
                        <span className="text-red-400">{formatCOP(pago.mora)}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-white">{formatCOP(pago.total)}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">{pago.referencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-6">No hay pagos registrados para este credito</p>
        )}
      </div>
    </div>
  )
}
