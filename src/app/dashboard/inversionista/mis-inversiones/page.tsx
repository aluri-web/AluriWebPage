import { createClient } from '../../../../utils/supabase/server'
import { Briefcase } from 'lucide-react'
import Link from 'next/link'
import InvestmentsTabs from './InvestmentsTabs'

// Transaction record from transacciones table
interface Transaccion {
  tipo_transaccion: string
  monto: number
  fecha_aplicacion: string | null
}

// Updated interface with new creditos schema
interface Credito {
  codigo_credito: string
  estado: string
  tasa_interes_ea: number | null
  monto_solicitado: number | null
  valor_colocado: number | null
  plazo: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  saldo_capital: number | null
  saldo_intereses: number | null
  saldo_mora: number | null
  tasa_nominal: number | null
  estado_credito: string | null
  fecha_ultimo_pago: string | null
  en_mora: boolean | null
  transacciones: Transaccion[]
  inversiones: { monto_invertido: number; estado: string }[]
  cliente: { full_name: string } | null
}

interface Inversion {
  id: string
  monto_invertido: number
  interest_rate_investor: number | null
  estado: string
  created_at: string
  confirmed_at: string | null
  credito_id: string
  credito: Credito | null
}

// Helper: Format currency as COP
function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function MisInversionesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch ALL inversiones with transacciones for real progress tracking
  const { data: rawData, error } = await supabase
    .from('inversiones')
    .select(`
      *,
      credito:creditos!inner (
        *,
        cliente:profiles!cliente_id (full_name),
        transacciones (
          tipo_transaccion,
          monto,
          fecha_aplicacion
        ),
        inversiones (
          monto_invertido,
          estado
        )
      )
    `)
    .eq('inversionista_id', user?.id)
    .not('estado', 'in', '("cancelado","rechazado")')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching investments:', JSON.stringify(error, null, 2))
  }

  const investments = (rawData || []) as unknown as Inversion[]

  // Filter for KPI calculations (activo + mora credito status)
  const activeInvestments = investments.filter(inv =>
    inv.credito?.estado === 'activo' || inv.credito?.estado === 'mora'
  )

  // KPI Calculations
  const cantidadInversiones = investments.length
  const cantidadActivas = activeInvestments.length
  const montoInvertidoTotal = investments.reduce((sum, inv) => sum + Number(inv.monto_invertido || 0), 0)

  // Calculate weighted average rate using interest_rate_investor or credito's tasa_interes_ea
  const rentabilidadPromedio = montoInvertidoTotal > 0
    ? investments.reduce((acc, inv) => {
        const rate = inv.interest_rate_investor || inv.credito?.tasa_interes_ea || 0
        return acc + (Number(inv.monto_invertido) * Number(rate))
      }, 0) / montoInvertidoTotal
    : 0

  // Calculate REAL collected amounts based on transacciones (pro-rated by participation)
  let totalCapitalRecuperado = 0
  let totalInteresesGanados = 0

  investments.forEach(inv => {
    const credito = inv.credito
    if (!credito || !credito.transacciones) return

    const montoSolicitado = credito.monto_solicitado || 0
    const montoInvertido = inv.monto_invertido || 0

    // Calculate investor's share (participation percentage)
    const share = montoSolicitado > 0 ? montoInvertido / montoSolicitado : 0

    // Sum payments by tipo_transaccion
    const totalLoanCapital = credito.transacciones
      .filter(t => t.tipo_transaccion === 'pago_capital')
      .reduce((sum, t) => sum + (t.monto || 0), 0)
    const totalLoanInterest = credito.transacciones
      .filter(t => t.tipo_transaccion === 'pago_interes')
      .reduce((sum, t) => sum + (t.monto || 0), 0)

    // Pro-rate by investor's share
    totalCapitalRecuperado += totalLoanCapital * share
    totalInteresesGanados += totalLoanInterest * share
  })

  const recaudadoTotal = totalCapitalRecuperado + totalInteresesGanados

  // Capital vigente = saldo_capital + saldo_intereses + saldo_mora (almacenados en migración/cron)
  let capitalVigente = 0
  investments.forEach(inv => {
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
        <p className="text-zinc-500 mt-1">
          Estado de cuenta detallado
        </p>
      </header>

      {/* KPI Summary Card */}
      <div className="mb-8">
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
          <h2 className="text-xl font-semibold mb-6 text-white">Resumen de Inversiones</h2>
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
              <span className="text-2xl font-bold text-teal-400">{rentabilidadPromedio.toFixed(2)}% E.A.</span>
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
        <h2 className="text-xl font-semibold mb-6 text-white">Detalle de Inversiones</h2>

        {investments.length > 0 ? (
          <InvestmentsTabs investments={investments} />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-700">
            <Briefcase size={48} className="mb-4 opacity-50" />
            <p>No se encontraron inversiones.</p>
            <Link
              href="/dashboard/inversionista/marketplace"
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
