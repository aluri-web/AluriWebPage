import { createClient } from '../../../utils/supabase/server'
import { TrendingUp, Briefcase, Percent, Activity } from 'lucide-react'
import PortfolioChart from '../../../components/dashboard/PortfolioChart'

interface TransaccionData {
  tipo_transaccion: string
  monto: number
  fecha_transaccion: string
  referencia_pago: string | null
}

interface CreditoData {
  codigo_credito: string
  estado: string
  tasa_interes_ea: number | null
  monto_solicitado: number | null
  plazo: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  inversiones: { monto_invertido: number; estado: string }[]
  transacciones: TransaccionData[]
}

interface Inversion {
  id: string
  monto_invertido: number
  interest_rate_investor: number | null
  estado: string
  created_at: string
  credito_id: string
  credito: CreditoData | null
}

export default async function InvestorDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  const userName = profile?.full_name?.split(' ')[0] || 'Inversionista'

  // CONSULTA MANUAL SIN FILTROS (INICIO)
  const { data: investments, error } = await supabase
    .from('inversiones')
    .select('*, credito:creditos!inner(*, inversiones(monto_invertido, estado), transacciones(tipo_transaccion, monto, fecha_transaccion, referencia_pago))')
    .eq('inversionista_id', user?.id)
    .not('estado', 'in', '("cancelado","rechazado")')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching investments:', JSON.stringify(error, null, 2))
  }

  const investmentsData = (investments || []) as unknown as Inversion[]

  // Calculations - include both active and defaulted creditos in active count
  const totalInvested = investmentsData.reduce((sum, item) => sum + Number(item.monto_invertido || 0), 0)
  const activeProjects = investmentsData.filter(i =>
    i.credito?.estado === 'activo' ||
    i.credito?.estado === 'mora' ||
    i.credito?.estado === 'publicado'
  ).length

  // Calculate weighted average ROI based on interest_rate_investor or credito's tasa_interes_ea
  const weightedRoi = totalInvested > 0
    ? investmentsData.reduce((acc, item) => {
        const rate = item.interest_rate_investor || item.credito?.tasa_interes_ea || 0
        return acc + (Number(item.monto_invertido) * Number(rate))
      }, 0) / totalInvested
    : 0

  // Calculate expected return (simple calculation based on annual rate)
  const totalExpectedReturn = investmentsData.reduce((acc, item) => {
    const rate = item.interest_rate_investor || item.credito?.tasa_interes_ea || 0
    return acc + (Number(item.monto_invertido) * (1 + Number(rate) / 100))
  }, 0)

  const simulatedCollected = totalExpectedReturn * 0.15

  // Extract recent activities from all transacciones, pro-rated by investor share
  const recentActivities = investmentsData
    .flatMap(inv => {
      const credito = inv.credito
      if (!credito?.transacciones) return []
      const montoSolicitado = credito.monto_solicitado || 0
      const share = montoSolicitado > 0 ? inv.monto_invertido / montoSolicitado : 0
      return credito.transacciones.map(tx => ({
        codigoCredito: credito.codigo_credito,
        tipo: tx.tipo_transaccion,
        monto: Math.round(tx.monto * share),
        fecha: tx.fecha_transaccion,
        referencia: tx.referencia_pago,
      }))
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10)

  return (
    <div className="text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Bienvenido, {userName}</h1>
        <p className="text-zinc-500 mt-1">
          Resumen de tus inversiones y rendimiento actual.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-sm">Balance Total</span>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              ${totalInvested.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-sm">Retorno Anual (E.A.)</span>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Percent size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{weightedRoi.toFixed(1)}%</p>
            <p className="text-zinc-500 text-sm mt-1">Promedio ponderado</p>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-sm">Inversiones Activas</span>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Briefcase size={20} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeProjects}</p>
            <p className="text-zinc-500 text-sm mt-1">Proyectos financiados</p>
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col">
          <h2 className="text-zinc-500 text-sm mb-2">Distribucion</h2>
          <div className="flex-1">
            <PortfolioChart invested={totalInvested} collected={simulatedCollected} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
        <h2 className="text-lg font-semibold mb-6 text-white">Ultimas Actividades</h2>

        {recentActivities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-zinc-500 text-sm border-b border-zinc-700">
                  <th className="pb-4 font-medium">FECHA</th>
                  <th className="pb-4 font-medium">CREDITO</th>
                  <th className="pb-4 font-medium">TIPO</th>
                  <th className="pb-4 font-medium text-right">MONTO</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentActivities.map((act, i) => {
                  const tipoConfig: Record<string, { label: string; class: string }> = {
                    pago_capital: { label: 'Capital', class: 'bg-blue-500/20 text-blue-400' },
                    pago_interes: { label: 'Intereses', class: 'bg-amber-500/20 text-amber-400' },
                    pago_mora: { label: 'Mora', class: 'bg-red-500/20 text-red-400' },
                  }
                  const tipo = tipoConfig[act.tipo] || { label: act.tipo, class: 'bg-zinc-500/20 text-zinc-400' }

                  const fechaFormatted = new Date(act.fecha).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })

                  return (
                    <tr key={`${act.referencia}-${act.tipo}-${i}`} className="border-b border-zinc-700/50 hover:bg-zinc-800/30">
                      <td className="py-4 text-zinc-400">{fechaFormatted}</td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-zinc-800 text-teal-400 text-xs font-mono rounded">
                          {act.codigoCredito}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${tipo.class}`}>
                          {tipo.label}
                        </span>
                      </td>
                      <td className="py-4 text-right text-white font-medium">
                        ${act.monto.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <Activity size={48} className="mb-4 opacity-50" />
            <p>No se han registrado pagos aun.</p>
          </div>
        )}
      </div>
    </div>
  )
}
