import { createClient } from '@/utils/supabase/server'
import { Receipt, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'

interface TransaccionPago {
  id: string
  credito_id: string
  tipo_transaccion: string
  monto: number
  fecha_aplicacion: string
  referencia_pago: string | null
  created_at: string
  credito: {
    codigo_credito: string
    cliente: {
      full_name: string | null
    } | null
  } | null
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

function getTipoLabel(tipo: string): { label: string; color: string } {
  switch (tipo) {
    case 'pago_capital':
      return { label: 'Capital', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
    case 'pago_interes':
      return { label: 'Intereses', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
    case 'pago_mora':
      return { label: 'Mora', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    default:
      return { label: tipo, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  }
}

export default async function PagosPage() {
  const supabase = await createClient()

  // Obtener todas las transacciones de tipo pago
  const { data: transacciones, error } = await supabase
    .from('transacciones')
    .select(`
      id,
      credito_id,
      tipo_transaccion,
      monto,
      fecha_aplicacion,
      referencia_pago,
      created_at,
      credito:creditos!credito_id (
        codigo_credito,
        cliente:profiles!cliente_id (
          full_name
        )
      )
    `)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
    .order('fecha_aplicacion', { ascending: false })
    .limit(200)

  // Agrupar por referencia_pago para mostrar pagos consolidados
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
    created_at: string
  }> = {}

  for (const tx of (transacciones || [])) {
    const ref = tx.referencia_pago || tx.id
    // Handle Supabase returning array or object for relations
    const creditoRaw = tx.credito as unknown
    const creditoData = Array.isArray(creditoRaw) ? creditoRaw[0] : creditoRaw as { codigo_credito?: string; cliente?: unknown } | null
    const codigo = creditoData?.codigo_credito || 'N/A'

    const clienteRaw = creditoData?.cliente
    const clienteData = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw as { full_name?: string } | null
    const propietario = clienteData?.full_name || 'Sin nombre'

    if (!pagosAgrupados[ref]) {
      pagosAgrupados[ref] = {
        referencia: ref,
        fecha: tx.fecha_aplicacion,
        credito_codigo: codigo,
        credito_id: tx.credito_id,
        propietario,
        capital: 0,
        intereses: 0,
        mora: 0,
        total: 0,
        created_at: tx.created_at,
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

  // Calcular totales
  const totalCapital = pagos.reduce((sum, p) => sum + p.capital, 0)
  const totalIntereses = pagos.reduce((sum, p) => sum + p.intereses, 0)
  const totalMora = pagos.reduce((sum, p) => sum + p.mora, 0)
  const totalGeneral = totalCapital + totalIntereses + totalMora

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
      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          Error al cargar pagos: {error.message}
        </div>
      ) : pagos.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <Receipt className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
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
      )}
    </div>
  )
}
