import { TrendingUp, Percent, Activity } from 'lucide-react'
import PortfolioChart from '@/components/dashboard/PortfolioChart'
import BalancePieChart from '@/components/dashboard/BalancePieChart'
import {
  DEMO_INVERSIONES,
  DEMO_CREDITOS,
  DEMO_TRANSACCIONES,
  formatCOP,
} from '@/lib/demo-data'

export default function DemoInvestorDashboard() {
  const INVESTOR_ID = 'demo-inv-001'
  const userName = 'Maria Fernanda'

  // Get investments for this investor
  const myInvestments = DEMO_INVERSIONES.filter(
    (i) => i.inversionista_id === INVESTOR_ID && i.estado !== 'cancelado' && i.estado !== 'rechazado'
  )

  // Enrich with credito data
  const investmentsWithCredito = myInvestments.map((inv) => {
    const credito = DEMO_CREDITOS.find((c) => c.id === inv.credito_id) || null
    return { ...inv, credito }
  })

  // Filter to active credits only (activo, mora, publicado)
  const activeInvestments = investmentsWithCredito.filter(
    (i) =>
      i.credito?.estado === 'activo' ||
      i.credito?.estado === 'mora' ||
      i.credito?.estado === 'publicado'
  )

  const totalInvested = activeInvestments.reduce(
    (sum, item) => sum + Number(item.monto_invertido || 0),
    0
  )

  // Calculate weighted average ROI
  const weightedRoi =
    totalInvested > 0
      ? activeInvestments.reduce((acc, item) => {
          const rate = item.interest_rate_investor
            ? item.interest_rate_investor * 12
            : item.credito?.tasa_interes_ea || 0
          return acc + Number(item.monto_invertido) * Number(rate)
        }, 0) / totalInvested
      : 0

  // Actual collected returns: sum of pago_capital + pago_interes, pro-rated by investor share
  const actualCollected = activeInvestments.reduce((total, inv) => {
    const credito = inv.credito
    if (!credito) return total
    const txs = DEMO_TRANSACCIONES.filter((tx) => tx.credito_id === credito.id)
    const montoSolicitado = credito.monto_solicitado || 0
    const share = montoSolicitado > 0 ? inv.monto_invertido / montoSolicitado : 0
    return (
      total +
      txs
        .filter(
          (tx) =>
            tx.tipo_transaccion === 'pago_capital' ||
            tx.tipo_transaccion === 'pago_interes'
        )
        .reduce((sum, tx) => sum + Math.round(tx.monto * share), 0)
    )
  }, 0)

  // Per-credit breakdown for Balance pie chart
  const balanceChartData = activeInvestments.map((i) => ({
    name: i.credito?.codigo_credito || 'N/A',
    value: Number(i.monto_invertido || 0),
  }))

  // Per-credit annual return for Retorno pie chart
  const returnChartData = activeInvestments
    .map((i) => {
      const rate = i.interest_rate_investor
        ? i.interest_rate_investor * 12
        : Number(i.credito?.tasa_interes_ea || 0)
      return {
        name: i.credito?.codigo_credito || 'N/A',
        value: Math.round((Number(i.monto_invertido || 0) * rate) / 100),
        rate,
      }
    })
    .filter((i) => i.value > 0)

  // Extract recent activities from all transacciones, pro-rated by investor share
  const recentActivities = investmentsWithCredito
    .flatMap((inv) => {
      const credito = inv.credito
      if (!credito) return []
      const txs = DEMO_TRANSACCIONES.filter((tx) => tx.credito_id === credito.id)
      const montoSolicitado = credito.monto_solicitado || 0
      const share = montoSolicitado > 0 ? inv.monto_invertido / montoSolicitado : 0
      return txs.map((tx) => ({
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
        <h1 className="text-3xl font-bold text-white">
          Bienvenido, {userName}
        </h1>
        <p className="text-zinc-500 mt-1">
          Resumen de tus inversiones y rendimiento actual.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-sm">Balance Total</span>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-lg font-bold text-white mb-1">
            {formatCOP(totalInvested)}
          </p>
          <div className="flex-1">
            <BalancePieChart data={balanceChartData} />
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-sm">Retorno Anual (E.A.)</span>
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Percent size={20} />
            </div>
          </div>
          <p className="text-lg font-bold text-white mb-1">
            {weightedRoi.toFixed(1)}%{' '}
            <span className="text-zinc-500 text-xs font-normal">
              Promedio ponderado
            </span>
          </p>
          <div className="flex-1">
            <BalancePieChart data={returnChartData} tooltipMode="rate" />
          </div>
        </div>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700 min-h-[160px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-500 text-sm">Distribucion</span>
          </div>
          <p className="text-lg font-bold text-white mb-1">
            {formatCOP(totalInvested + actualCollected)}
          </p>
          <div className="flex-1">
            <PortfolioChart invested={totalInvested} collected={actualCollected} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
        <h2 className="text-lg font-semibold mb-6 text-white">
          Ultimas Actividades
        </h2>

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
                  const tipoConfig: Record<
                    string,
                    { label: string; class: string }
                  > = {
                    pago_capital: {
                      label: 'Capital',
                      class: 'bg-blue-500/20 text-blue-400',
                    },
                    pago_interes: {
                      label: 'Intereses',
                      class: 'bg-amber-500/20 text-amber-400',
                    },
                    pago_mora: {
                      label: 'Mora',
                      class: 'bg-red-500/20 text-red-400',
                    },
                  }
                  const tipo = tipoConfig[act.tipo] || {
                    label: act.tipo,
                    class: 'bg-zinc-500/20 text-zinc-400',
                  }

                  const fechaFormatted = new Date(
                    act.fecha
                  ).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })

                  return (
                    <tr
                      key={`${act.referencia}-${act.tipo}-${i}`}
                      className="border-b border-zinc-700/50 hover:bg-zinc-800/30"
                    >
                      <td className="py-4 text-zinc-400">{fechaFormatted}</td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-zinc-800 text-teal-400 text-xs font-mono rounded">
                          {act.codigoCredito}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${tipo.class}`}
                        >
                          {tipo.label}
                        </span>
                      </td>
                      <td className="py-4 text-right text-white font-medium">
                        {formatCOP(act.monto)}
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
