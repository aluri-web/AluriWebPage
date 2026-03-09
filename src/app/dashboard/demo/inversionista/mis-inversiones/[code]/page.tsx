'use client'

import { useParams } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MapPin, Phone, CheckCircle, TrendingUp, Calendar, Building, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  DEMO_INVERSIONES,
  DEMO_CREDITOS,
  DEMO_TRANSACCIONES,
  formatCOP,
} from '@/lib/demo-data'

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80'
const INVESTOR_ID = 'demo-inv-001'

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Inline photo gallery
function DemoPhotoGallery({ images }: { images: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const goTo = useCallback((index: number) => {
    setSelectedIndex(((index % images.length) + images.length) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => goTo(selectedIndex - 1), [goTo, selectedIndex])
  const goNext = useCallback(() => goTo(selectedIndex + 1), [goTo, selectedIndex])

  useEffect(() => {
    if (!lightboxOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, goPrev, goNext])

  return (
    <>
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
        <div className="relative aspect-video cursor-pointer" onClick={() => setLightboxOpen(true)}>
          <Image src={images[selectedIndex]} alt="Propiedad" fill className="object-cover" unoptimized />
          <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-lg text-white text-sm">
            {selectedIndex + 1}/{images.length}
          </div>
        </div>
        {images.length > 1 && (
          <div className="p-4 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <div
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer ring-2 transition-all ${i === selectedIndex ? 'ring-teal-400' : 'ring-transparent hover:ring-zinc-500'}`}
              >
                <Image src={img} alt={`Propiedad ${i + 1}`} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"><X size={28} /></button>
          <div className="absolute top-4 left-4 text-white/70 text-sm z-10">{selectedIndex + 1} / {images.length}</div>
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); goPrev() }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full z-10 transition-colors"><ChevronLeft size={28} /></button>
          )}
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] mx-16" onClick={(e) => e.stopPropagation()}>
            <Image src={images[selectedIndex]} alt={`Propiedad ${selectedIndex + 1}`} fill className="object-contain" unoptimized />
          </div>
          {images.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); goNext() }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-3 rounded-full z-10 transition-colors"><ChevronRight size={28} /></button>
          )}
        </div>
      )}
    </>
  )
}

export default function DemoInvestmentDetailPage() {
  const params = useParams()
  const code = params.code as string

  // Find investment by credito codigo_credito for this investor
  const credito = DEMO_CREDITOS.find((c) => c.codigo_credito === code) || null
  const investment = credito
    ? DEMO_INVERSIONES.find(
        (i) => i.credito_id === credito.id && i.inversionista_id === INVESTOR_ID
      ) || null
    : null

  if (!credito || !investment) {
    return (
      <div className="text-white p-8">
        <div className="text-center py-20">
          <p className="text-2xl font-bold mb-2">Inversion no encontrada</p>
          <Link href="/dashboard/demo/inversionista/mis-inversiones" className="text-teal-400 hover:underline">
            Volver a Mis Inversiones
          </Link>
        </div>
      </div>
    )
  }

  // Calculate values
  const investedAmount = Number(investment.monto_invertido || 0)
  const rate = investment.interest_rate_investor
    ? investment.interest_rate_investor * 12
    : credito.tasa_interes_ea || 0
  const termMonths = credito.plazo || 12

  // Calculate monthly payment (cuota mensual) pro-rated by investor share
  const tasaMensual = (credito.tasa_nominal || 0) / 100
  const loanAmount = credito.monto_solicitado || 0
  let cuotaMensualTotal = 0
  if (credito.tipo_amortizacion === 'solo_interes') {
    cuotaMensualTotal = loanAmount * tasaMensual
  } else {
    cuotaMensualTotal = tasaMensual === 0
      ? loanAmount / termMonths
      : (loanAmount * tasaMensual * Math.pow(1 + tasaMensual, termMonths)) / (Math.pow(1 + tasaMensual, termMonths) - 1)
  }
  const cuotaMensualInvestor = cuotaMensualTotal * (loanAmount > 0 ? investedAmount / loanAmount : 0)

  const expectedTotalReturn = credito.tipo_amortizacion === 'solo_interes'
    ? Math.round(cuotaMensualInvestor * termMonths)
    : Math.round(cuotaMensualInvestor * termMonths - investedAmount)

  const propertyCity = credito.ciudad_inmueble || 'Colombia'
  const propertyAddress = credito.direccion_inmueble || 'Direccion no disponible'
  const propertyType = credito.tipo_inmueble || 'urbano'
  const propertyValue = credito.valor_comercial || 0

  // Funding progress
  const requested = credito.monto_solicitado || 0
  const allInversiones = DEMO_INVERSIONES.filter(
    (i) => i.credito_id === credito.id && (i.estado === 'activo' || i.estado === 'pendiente')
  )
  const funded = allInversiones.reduce((s, i) => s + (i.monto_invertido || 0), 0)

  // Calculate from transactions
  const txs = DEMO_TRANSACCIONES.filter((tx) => tx.credito_id === credito.id)
  const participationPercentage = requested > 0 ? investedAmount / requested : 0

  const totalLoanCapitalPaid = txs
    .filter((t) => t.tipo_transaccion === 'pago_capital')
    .reduce((sum, t) => sum + (t.monto || 0), 0)
  const totalLoanInterestPaid = txs
    .filter((t) => t.tipo_transaccion === 'pago_interes')
    .reduce((sum, t) => sum + (t.monto || 0), 0)

  const capitalRecuperado = totalLoanCapitalPaid * participationPercentage
  const interesesGanados = totalLoanInterestPaid * participationPercentage
  const recoveryProgress = investedAmount > 0 ? (capitalRecuperado / investedAmount) * 100 : 0

  // Status configuration
  const creditoEstado = credito.estado === 'finalizado' ? 'pagado' : credito.estado
  const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
    publicado: { label: 'Colocando', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' },
    activo: { label: 'Desembolsado', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
    pagado: { label: 'Pagado', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
    finalizado: { label: 'Completado', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400' },
    mora: { label: 'En Mora', bgClass: 'bg-red-500/10', textClass: 'text-red-400' },
    en_firma: { label: 'En Firma', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400' },
  }
  const status = statusConfig[creditoEstado] || { label: creditoEstado, bgClass: 'bg-zinc-500/10', textClass: 'text-zinc-400' }

  const fechaDesembolso = credito.fecha_desembolso || null

  let nextPaymentDate: string | null = null
  if (fechaDesembolso && creditoEstado !== 'pagado' && creditoEstado !== 'finalizado') {
    const desembolso = new Date(fechaDesembolso)
    const payDay = desembolso.getDate()
    const now = new Date()
    const candidate = new Date(now.getFullYear(), now.getMonth(), payDay)
    if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1)
    nextPaymentDate = candidate.toISOString()
  }

  const galleryImages = credito.fotos_inmueble && credito.fotos_inmueble.length > 0
    ? credito.fotos_inmueble
    : [PLACEHOLDER_IMAGE]

  return (
    <div className="text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/demo/inversionista/mis-inversiones"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-teal-400 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Volver a Mis Inversiones</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 bg-zinc-800 text-teal-400 text-sm font-mono rounded">
            {credito.codigo_credito}
          </span>
          <span className={`px-3 py-1 rounded text-sm font-medium ${status.bgClass} ${status.textClass}`}>
            {status.label}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-2">Detalle de Inversion</h1>
        <p className="text-zinc-500 text-sm mt-1">Credito respaldado por hipoteca en {propertyCity}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Images */}
          <DemoPhotoGallery images={galleryImages} />

          {/* Investment Performance */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">Mi Inversion</h2>
                <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs font-mono">
                  {credito.codigo_credito}
                </span>
              </div>
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
                  {credito.tipo_amortizacion === 'solo_interes' ? 'Solo Intereses' : 'Capital e Intereses'}
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

            {/* Capital Recovery Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">Capital Recuperado</span>
                <span className="text-sm text-zinc-400">{recoveryProgress.toFixed(0)}% recuperado</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${recoveryProgress >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${Math.min(100, recoveryProgress)}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>Recibido: {formatCOP(capitalRecuperado)}</span>
                <span>Meta: {formatCOP(investedAmount)}</span>
              </div>
            </div>

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

          {/* Timeline */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h2 className="text-lg font-semibold text-white mb-4">Fechas Importantes</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-500/10 rounded-lg"><Calendar size={18} className="text-teal-400" /></div>
                <div>
                  <p className="text-zinc-500 text-xs">Fecha de Firma</p>
                  <p className="text-white font-medium">{formatDate(credito.fecha_firma_programada)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-500/10 rounded-lg"><Calendar size={18} className="text-teal-400" /></div>
                <div>
                  <p className="text-zinc-500 text-xs">Fecha de Desembolso</p>
                  <p className="text-white font-medium">{formatDate(fechaDesembolso)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-500/10 rounded-lg"><Calendar size={18} className="text-teal-400" /></div>
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
                  {(creditoEstado === 'finalizado' || creditoEstado === 'pagado') && 'Credito finalizado exitosamente'}
                  {creditoEstado === 'mora' && 'Credito en proceso de recuperacion'}
                  {creditoEstado === 'en_firma' && 'Credito en proceso de firma'}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-1">Ubicacion</h3>
            <p className="text-zinc-500 text-xs mb-4">{propertyCity}, Colombia</p>
            <div className="h-48 bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-center">
                <MapPin size={32} className="text-teal-400 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">{propertyAddress}</p>
              </div>
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
