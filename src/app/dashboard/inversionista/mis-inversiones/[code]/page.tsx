import { createClient } from '../../../../../utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MapPin, Phone, CheckCircle, TrendingUp, Calendar, Percent, Building } from 'lucide-react'
import ExtractoModal from './ExtractoModal'
import PhotoGallery from '@/components/shared/PhotoGallery'

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80'

// Transaction record from transacciones table
interface Transaccion {
  tipo_transaccion: string
  monto: number
}

interface Credito {
  codigo_credito: string
  estado: string
  estado_credito: string | null
  tasa_interes_ea: number | null
  tasa_nominal: number | null
  monto_solicitado: number | null
  plazo: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  tipo_amortizacion: string | null
  fecha_desembolso: string | null
  fecha_firma: string | null
  fotos_inmueble: string[] | null
  transacciones: Transaccion[]
  inversiones: { monto_invertido: number; estado: string }[]
}

interface Inversion {
  id: string
  monto_invertido: number
  interest_rate_investor: number | null
  estado: string
  fecha_inversion: string | null
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

// Helper: Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Fetch inversion by credito codigo_credito using !inner join to filter directly
  const { data: investments, error } = await supabase
    .from('inversiones')
    .select(`
      id,
      monto_invertido,
      interest_rate_investor,
      estado,
      fecha_inversion,
      created_at,
      confirmed_at,
      credito_id,
      credito:creditos!inner (
        codigo_credito,
        estado,
        estado_credito,
        tasa_interes_ea,
        tasa_nominal,
        monto_solicitado,
        plazo,
        ciudad_inmueble,
        direccion_inmueble,
        tipo_inmueble,
        valor_comercial,
        tipo_amortizacion,
        fecha_desembolso,
        fecha_firma,
        fotos_inmueble,
        transacciones (
          tipo_transaccion,
          monto
        ),
        inversiones (
          monto_invertido,
          estado
        )
      )
    `)
    .eq('inversionista_id', user.id)
    .eq('credito.codigo_credito', code)

  if (error) {
    console.error('Error fetching investment:', error.message)
    notFound()
  }

  // Get first matching investment (should be unique per user+loan)
  const rawData = investments?.[0]

  if (!rawData) {
    notFound()
  }

  const investment = rawData as unknown as Inversion
  const credito = investment.credito

  // Calculate values
  const investedAmount = Number(investment.monto_invertido || 0)
  const rate = investment.interest_rate_investor || credito?.tasa_interes_ea || 0
  const termMonths = credito?.plazo || 12
  // Calculate monthly payment (cuota mensual) pro-rated by investor share
  const tasaMensual = (credito?.tasa_nominal || 0) / 100
  const loanAmount = credito?.monto_solicitado || 0
  let cuotaMensualTotal = 0
  if (credito?.tipo_amortizacion === 'solo_interes') {
    cuotaMensualTotal = loanAmount * tasaMensual
  } else {
    cuotaMensualTotal = tasaMensual === 0
      ? loanAmount / termMonths
      : (loanAmount * tasaMensual * Math.pow(1 + tasaMensual, termMonths)) / (Math.pow(1 + tasaMensual, termMonths) - 1)
  }
  const cuotaMensualInvestor = cuotaMensualTotal * (loanAmount > 0 ? investedAmount / loanAmount : 0)

  // Expected return = profit (ganancia) over the life of the credit
  // For francesa: total payments - invested capital (payments include capital repayment)
  // For solo_interes: total payments ARE the profit (capital returned separately at end)
  const expectedTotalReturn = credito?.tipo_amortizacion === 'solo_interes'
    ? Math.round(cuotaMensualInvestor * termMonths)
    : Math.round(cuotaMensualInvestor * termMonths - investedAmount)

  // Property info from separate columns
  const propertyCity = credito?.ciudad_inmueble || 'Colombia'
  const propertyAddress = credito?.direccion_inmueble || 'Direccion no disponible'
  const propertyType = credito?.tipo_inmueble || 'urbano'
  const propertyValue = credito?.valor_comercial || 0

  // Credito funding (calculated from inversiones sub-query)
  const requested = credito?.monto_solicitado || 0
  const funded = (credito?.inversiones || [])
    .filter(i => i.estado === 'activo' || i.estado === 'pendiente')
    .reduce((s, i) => s + (i.monto_invertido || 0), 0)

  // Calculate capital recovery progress from actual transacciones
  const participationPercentage = requested > 0 ? investedAmount / requested : 0

  // Sum transacciones by tipo_transaccion
  const transacciones = credito?.transacciones || []
  const totalLoanCapitalPaid = transacciones
    .filter(t => t.tipo_transaccion === 'pago_capital')
    .reduce((sum, t) => sum + (t.monto || 0), 0)
  const totalLoanInterestPaid = transacciones
    .filter(t => t.tipo_transaccion === 'pago_interes')
    .reduce((sum, t) => sum + (t.monto || 0), 0)

  // Pro-rate by investor's share
  const capitalRecuperado = totalLoanCapitalPaid * participationPercentage
  const interesesGanados = totalLoanInterestPaid * participationPercentage

  // Progress = capital recovered / amount invested
  const recoveryProgress = investedAmount > 0 ? (capitalRecuperado / investedAmount) * 100 : 0

  // Status configuration — estado_credito 'pagado' tiene prioridad sobre estado general
  const estadoCredito = credito?.estado_credito || ''
  const creditoEstado = estadoCredito === 'pagado' ? 'pagado' : (credito?.estado || 'pending')
  const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
    publicado: { label: 'Colocando', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' },
    activo: { label: 'Desembolsado', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
    pagado: { label: 'Pagado', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
    finalizado: { label: 'Completado', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
    mora: { label: 'En Mora', bgClass: 'bg-red-500/10', textClass: 'text-red-400' },
    no_colocado: { label: 'No Colocado', bgClass: 'bg-zinc-500/10', textClass: 'text-zinc-400' },
  }
  const status = statusConfig[creditoEstado] || { label: creditoEstado, bgClass: 'bg-zinc-500/10', textClass: 'text-zinc-400' }

  // Dates
  const fechaFirma = credito?.fecha_firma || null
  const fechaDesembolso = credito?.fecha_desembolso || null

  // Next payment date: same day of month as disbursement, next upcoming month
  let nextPaymentDate: string | null = null
  if (fechaDesembolso && creditoEstado !== 'pagado' && creditoEstado !== 'finalizado') {
    const desembolso = new Date(fechaDesembolso)
    const payDay = desembolso.getDate()
    const now = new Date()
    const candidate = new Date(now.getFullYear(), now.getMonth(), payDay)
    if (candidate <= now) {
      candidate.setMonth(candidate.getMonth() + 1)
    }
    nextPaymentDate = candidate.toISOString()
  }

  return (
    <div className="text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/inversionista/mis-inversiones"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-teal-400 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Volver a Mis Inversiones</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 bg-zinc-800 text-teal-400 text-sm font-mono rounded">
            {credito?.codigo_credito || 'N/A'}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${status.bgClass} ${status.textClass}`}>
            {status.label}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-2">
          Detalle de Inversion
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Credito respaldado por hipoteca en {propertyCity}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Images */}
          <PhotoGallery
            images={
              credito?.fotos_inmueble && credito.fotos_inmueble.length > 0
                ? credito.fotos_inmueble
                : [PLACEHOLDER_IMAGE]
            }
          />

          {/* Investment Performance */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Mi Inversion</h2>
              <span className={`px-3 py-1 rounded text-sm font-medium ${status.bgClass} ${status.textClass}`}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Monto Invertido</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{formatCOP(investedAmount)}</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Tasa E.A.</p>
                <p className="text-lg lg:text-2xl font-bold text-teal-400">{rate.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Plazo</p>
                <p className="text-lg lg:text-2xl font-bold text-white">{termMonths} <span className="text-sm font-normal text-zinc-500">meses</span></p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Tipo de Credito</p>
                <p className="text-lg font-bold text-white">
                  {credito?.tipo_amortizacion === 'solo_interes' ? 'Solo Intereses' : 'Capital e Intereses'}
                </p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Cuota Mensual</p>
                <p className="text-lg lg:text-2xl font-bold text-amber-400">{formatCOP(Math.round(cuotaMensualInvestor))}</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Retorno Esperado</p>
                <p className="text-lg lg:text-2xl font-bold text-emerald-400">{formatCOP(expectedTotalReturn)}</p>
              </div>
            </div>

            {/* Capital Recovery Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">Capital Recuperado</span>
                <span className="text-sm text-zinc-400">{recoveryProgress.toFixed(0)}% recuperado</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    recoveryProgress >= 100 ? 'bg-emerald-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(100, recoveryProgress)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>Recibido: {formatCOP(capitalRecuperado)}</span>
                <span>Meta: {formatCOP(investedAmount)}</span>
              </div>
            </div>

            {/* Earnings Section */}
            {interesesGanados > 0 && (
              <div className="mt-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-amber-400 font-medium">Intereses Ganados</span>
                  <span className="text-amber-400 font-bold text-lg">{formatCOP(interesesGanados)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h2 className="text-lg font-semibold text-white mb-4">Detalles del Inmueble</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-teal-400" />
                  <span className="text-xs text-zinc-500 uppercase">Ubicacion</span>
                </div>
                <p className="text-white font-medium">{propertyCity}</p>
                <p className="text-zinc-500 text-sm">{propertyAddress}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Building size={16} className="text-teal-400" />
                  <span className="text-xs text-zinc-500 uppercase">Tipo de Predio</span>
                </div>
                <p className="text-white font-medium capitalize">{propertyType}</p>
              </div>
              {propertyValue > 0 && (
                <div className="p-4 bg-zinc-800/50 rounded-xl col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-teal-400" />
                    <span className="text-xs text-zinc-500 uppercase">Avaluo Comercial</span>
                  </div>
                  <p className="text-white font-medium">{formatCOP(propertyValue)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents — habilitado cuando se ejecute migración documentos_inmueble */}

          {/* Timeline */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h2 className="text-lg font-semibold text-white mb-4">Fechas Importantes</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <Calendar size={18} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Fecha de Firma</p>
                  <p className="text-white font-medium">{formatDate(fechaFirma)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <Calendar size={18} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Fecha de Desembolso</p>
                  <p className="text-white font-medium">{formatDate(fechaDesembolso)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-500/10 rounded-lg">
                  <Calendar size={18} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Siguiente Pago</p>
                  <p className="text-white font-medium">{nextPaymentDate ? formatDate(nextPaymentDate) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-4">Estado del Credito</h3>
            <div className={`flex items-center gap-3 p-4 rounded-lg ${status.bgClass}`}>
              <CheckCircle className={status.textClass} size={24} />
              <div>
                <span className={`font-medium ${status.textClass}`}>{status.label}</span>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {creditoEstado === 'activo' && 'Credito desembolsado generando rendimientos'}
                  {creditoEstado === 'publicado' && 'En proceso de colocacion'}
                  {creditoEstado === 'finalizado' && 'Credito finalizado exitosamente'}
                  {creditoEstado === 'mora' && 'Credito en proceso de recuperacion'}
                </p>
              </div>
            </div>
          </div>

          {/* Location Map */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-1">Ubicacion</h3>
            <p className="text-zinc-500 text-xs mb-4">{propertyCity}, Colombia</p>

            <div className="h-48 bg-zinc-800 rounded-lg overflow-hidden mb-4">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(`${propertyAddress}, ${propertyCity}, Colombia`)}&output=embed`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <p className="text-zinc-500 text-sm mb-4">Soporte sobre esta inversion</p>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-teal-400 transition-colors">
                <Phone size={18} />
                Contactar a Aluri
              </button>
              <ExtractoModal creditoId={investment.credito_id} codigoCredito={credito?.codigo_credito || ''} />
            </div>
          </div>

          {/* Investment Summary */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-4">Resumen de Inversion</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Monto invertido</span>
                <span className="text-white font-medium">{formatCOP(investedAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Rentabilidad</span>
                <span className="text-teal-400 font-medium">{rate.toFixed(1)}% E.A.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Plazo</span>
                <span className="text-white font-medium">{termMonths} meses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Desembolso</span>
                <span className="text-white font-medium">{formatDate(fechaDesembolso)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 text-sm">Participacion</span>
                <span className="text-white font-medium">{(participationPercentage * 100).toFixed(1)}%</span>
              </div>
              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Capital recuperado</span>
                  <span className="text-blue-400 font-medium">{formatCOP(capitalRecuperado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Intereses ganados</span>
                  <span className="text-amber-400 font-medium">{formatCOP(interesesGanados)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 text-sm">Retorno esperado</span>
                  <span className="text-emerald-400 font-semibold">{formatCOP(expectedTotalReturn)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
