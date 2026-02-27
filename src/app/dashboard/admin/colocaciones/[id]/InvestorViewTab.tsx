'use client'

import PhotoGallery from '@/components/shared/PhotoGallery'
import { MapPin, Building, TrendingUp, Calendar, CheckCircle, Users } from 'lucide-react'

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80'

interface Transaccion {
  tipo_transaccion: string
  monto: number
}

interface InversionRecord {
  monto_invertido: number
  estado: string
  inversionista: { full_name: string } | null
}

interface InvestorViewCredit {
  codigo_credito: string
  estado: string
  estado_credito: string | null
  tasa_interes_ea: number | null
  tasa_nominal: number | null
  monto_solicitado: number | null
  valor_colocado: number | null
  plazo: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  tipo_amortizacion: string | null
  fecha_desembolso: string | null
  fecha_firma: string | null
  fotos_inmueble: string[] | null
  saldo_capital: number | null
  saldo_intereses: number | null
  saldo_mora: number | null
  en_mora: boolean | null
  transacciones: Transaccion[]
  inversiones: InversionRecord[]
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function InvestorViewTab({ credit }: { credit: InvestorViewCredit }) {
  const valorColocado = credit.valor_colocado || credit.monto_solicitado || 0
  const rate = credit.tasa_interes_ea || 0
  const termMonths = credit.plazo || 12
  const expectedAnnualReturn = valorColocado * (rate / 100)

  const propertyCity = credit.ciudad_inmueble || 'Colombia'
  const propertyAddress = credit.direccion_inmueble || 'Direccion no disponible'
  const propertyType = credit.tipo_inmueble || 'urbano'
  const propertyValue = credit.valor_comercial || 0

  // Total payments from transacciones
  const transacciones = credit.transacciones || []
  const totalCapitalPaid = transacciones
    .filter(t => t.tipo_transaccion === 'pago_capital')
    .reduce((sum, t) => sum + (t.monto || 0), 0)
  const totalInterestPaid = transacciones
    .filter(t => t.tipo_transaccion === 'pago_interes')
    .reduce((sum, t) => sum + (t.monto || 0), 0)

  const recoveryProgress = valorColocado > 0 ? (totalCapitalPaid / valorColocado) * 100 : 0

  // Status config
  const estadoCredito = credit.estado_credito || ''
  const creditoEstado = estadoCredito === 'pagado' ? 'pagado' : (credit.estado || 'pending')
  const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
    publicado: { label: 'Colocando', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' },
    activo: { label: 'Desembolsado', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
    pagado: { label: 'Pagado', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
    finalizado: { label: 'Completado', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
    mora: { label: 'En Mora', bgClass: 'bg-red-500/10', textClass: 'text-red-400' },
    no_colocado: { label: 'No Colocado', bgClass: 'bg-slate-500/10', textClass: 'text-slate-400' },
  }
  const status = statusConfig[creditoEstado] || { label: creditoEstado, bgClass: 'bg-slate-500/10', textClass: 'text-slate-400' }

  // Dates
  const fechaFirma = credit.fecha_firma || null
  const fechaDesembolso = credit.fecha_desembolso || null

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

  // Investors
  const activeInvestors = (credit.inversiones || [])
    .filter(i => !['cancelado', 'rechazado'].includes(i.estado))

  const totalFunded = activeInvestors.reduce((s, i) => s + (i.monto_invertido || 0), 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Property Images */}
        <PhotoGallery
          images={
            credit.fotos_inmueble && credit.fotos_inmueble.length > 0
              ? credit.fotos_inmueble
              : [PLACEHOLDER_IMAGE]
          }
        />

        {/* Credit Performance */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Rendimiento del Credito</h2>
            <span className={`px-3 py-1 rounded text-sm font-medium ${status.bgClass} ${status.textClass}`}>
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Monto Colocado</p>
              <p className="text-lg lg:text-2xl font-bold text-white">{formatCOP(valorColocado)}</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Tasa E.A.</p>
              <p className="text-lg lg:text-2xl font-bold text-teal-400">{rate.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Plazo</p>
              <p className="text-lg lg:text-2xl font-bold text-white">{termMonths} <span className="text-sm font-normal text-slate-500">meses</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Tipo de Credito</p>
              <p className="text-lg font-bold text-white">
                {credit.tipo_amortizacion === 'solo_interes' ? 'Solo Intereses' : 'Capital e Intereses'}
              </p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-xl">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Retorno Esperado</p>
              <p className="text-lg lg:text-2xl font-bold text-emerald-400">{formatCOP(expectedAnnualReturn)}</p>
            </div>
          </div>

          {/* Capital Recovery Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400">Capital Recuperado</span>
              <span className="text-sm text-slate-400">{recoveryProgress.toFixed(0)}% recuperado</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  recoveryProgress >= 100 ? 'bg-emerald-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, recoveryProgress)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>Recibido: {formatCOP(totalCapitalPaid)}</span>
              <span>Meta: {formatCOP(valorColocado)}</span>
            </div>
          </div>

          {/* Interest earned */}
          {totalInterestPaid > 0 && (
            <div className="mt-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-medium">Intereses Recaudados</span>
                <span className="text-amber-400 font-bold text-lg">{formatCOP(totalInterestPaid)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Detalles del Inmueble</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} className="text-teal-400" />
                <span className="text-xs text-slate-500 uppercase">Ubicacion</span>
              </div>
              <p className="text-white font-medium">{propertyCity}</p>
              <p className="text-slate-500 text-sm">{propertyAddress}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Building size={16} className="text-teal-400" />
                <span className="text-xs text-slate-500 uppercase">Tipo de Predio</span>
              </div>
              <p className="text-white font-medium capitalize">{propertyType}</p>
            </div>
            {propertyValue > 0 && (
              <div className="p-4 bg-slate-800/50 rounded-xl col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-teal-400" />
                  <span className="text-xs text-slate-500 uppercase">Avaluo Comercial</span>
                </div>
                <p className="text-white font-medium">{formatCOP(propertyValue)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Fechas Importantes</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Calendar size={18} className="text-teal-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs">Fecha de Firma</p>
                <p className="text-white font-medium">{formatDate(fechaFirma)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Calendar size={18} className="text-teal-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs">Fecha de Desembolso</p>
                <p className="text-white font-medium">{formatDate(fechaDesembolso)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Calendar size={18} className="text-teal-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs">Siguiente Pago</p>
                <p className="text-white font-medium">{nextPaymentDate ? formatDate(nextPaymentDate) : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div className="space-y-6">
        {/* Status Card */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-white mb-4">Estado del Credito</h3>
          <div className={`flex items-center gap-3 p-4 rounded-lg ${status.bgClass}`}>
            <CheckCircle className={status.textClass} size={24} />
            <div>
              <span className={`font-medium ${status.textClass}`}>{status.label}</span>
              <p className="text-slate-500 text-xs mt-0.5">
                {creditoEstado === 'activo' && 'Credito desembolsado generando rendimientos'}
                {creditoEstado === 'publicado' && 'En proceso de colocacion'}
                {creditoEstado === 'finalizado' && 'Credito finalizado exitosamente'}
                {creditoEstado === 'mora' && 'Credito en proceso de recuperacion'}
              </p>
            </div>
          </div>
        </div>

        {/* Investors List */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Inversionistas ({activeInvestors.length})</h3>
          </div>
          {activeInvestors.length > 0 ? (
            <div className="space-y-3">
              {activeInvestors.map((inv, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">{inv.inversionista?.full_name || 'Sin nombre'}</span>
                  <span className="text-white font-medium">{formatCOP(inv.monto_invertido)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-800 flex justify-between text-sm">
                <span className="text-slate-500">Total Fondeado</span>
                <span className="text-teal-400 font-semibold">{formatCOP(totalFunded)}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Sin inversionistas registrados</p>
          )}
        </div>

        {/* Credit Summary */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-white mb-4">Resumen del Credito</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Monto colocado</span>
              <span className="text-white font-medium">{formatCOP(valorColocado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Rentabilidad</span>
              <span className="text-teal-400 font-medium">{rate.toFixed(1)}% E.A.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Plazo</span>
              <span className="text-white font-medium">{termMonths} meses</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Desembolso</span>
              <span className="text-white font-medium">{formatDate(fechaDesembolso)}</span>
            </div>
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Capital recuperado</span>
                <span className="text-blue-400 font-medium">{formatCOP(totalCapitalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Intereses recaudados</span>
                <span className="text-amber-400 font-medium">{formatCOP(totalInterestPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Retorno esperado anual</span>
                <span className="text-emerald-400 font-semibold">{formatCOP(expectedAnnualReturn)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
