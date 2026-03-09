'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Building2, CheckCircle2, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import {
  DEMO_CREDITOS,
  DEMO_INVERSIONES,
  formatCOP,
} from '@/lib/demo-data'

// Risk Analysis inline component (same as the real RiskAnalysis but inlined)
function RiskAnalysisInline({ ltv, propertyType, city }: { ltv: number; propertyType: string | undefined; city: string | undefined }) {
  const calculateRiskScore = () => {
    let score = 100
    if (ltv > 70) score -= 30
    else if (ltv > 60) score -= 20
    else if (ltv > 50) score -= 10
    else if (ltv > 40) score -= 5
    if (propertyType?.toLowerCase().includes('casa')) score += 5
    if (propertyType?.toLowerCase().includes('apartamento')) score += 3
    if (propertyType?.toLowerCase().includes('local')) score -= 5
    const majorCities = ['bogota', 'medellin', 'cali', 'barranquilla', 'cartagena']
    if (city && majorCities.some(c => city.toLowerCase().includes(c))) score += 5
    return Math.max(0, Math.min(100, score))
  }

  const riskScore = calculateRiskScore()

  const getRiskLevel = () => {
    if (riskScore >= 85) return { label: 'Riesgo Bajo', color: 'text-emerald-400', borderColor: 'border-emerald-500/50', bgColor: 'bg-emerald-500/10' }
    if (riskScore >= 70) return { label: 'Moderado', color: 'text-teal-400', borderColor: 'border-teal-500/50', bgColor: 'bg-teal-500/10' }
    if (riskScore >= 55) return { label: 'Medio', color: 'text-amber-400', borderColor: 'border-amber-500/50', bgColor: 'bg-amber-500/10' }
    return { label: 'Riesgo Alto', color: 'text-red-400', borderColor: 'border-red-500/50', bgColor: 'bg-red-500/10' }
  }

  const riskLevel = getRiskLevel()
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (riskScore / 100) * circumference
  const ltvMultiple = ltv > 0 ? (100 / ltv).toFixed(2) : '0'

  const analysisPoints = [
    `El avaluo del activo supera la solicitud de prestamo por ${ltvMultiple}x.`,
    'El historial crediticio del prestatario muestra patrones de pago consistentes en los ultimos 5 anos.',
    'Los planes de remodelacion estan verificados por auditoria de arquitecto externo.',
  ]

  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
            <Sparkles size={20} className="text-teal-400" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">Analisis de Riesgo Aluri AI</h3>
        </div>
        <span className={`px-3 py-1.5 ${riskLevel.bgColor} ${riskLevel.color} border ${riskLevel.borderColor} text-xs font-semibold rounded-full`}>
          {riskLevel.label}
        </span>
      </div>
      <div className="flex gap-6 items-start">
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" className="transform -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle cx="60" cy="60" r={radius} fill="none" stroke="url(#riskGradientDemo)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" style={{ filter: 'drop-shadow(0 0 6px rgba(45, 212, 191, 0.5))' }} />
            <defs>
              <linearGradient id="riskGradientDemo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{riskScore}</span>
            <span className="text-gray-600 text-xs uppercase tracking-wider">Puntuacion</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {analysisPoints.map((point, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 size={16} className="text-teal-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-400 text-sm leading-relaxed">{point}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 pt-5 border-t border-white/5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
          <span className="text-gray-500 text-xs">Garantia Verificada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
          <span className="text-gray-500 text-xs">Titulo Limpio</span>
        </div>
      </div>
    </div>
  )
}

// BentoMetrics inline
function BentoMetricsInline({ commercialValue, amountRequested, ltv, interestRateEa }: { commercialValue: number | null; amountRequested: number | null; ltv: string; interestRateEa: number | null }) {
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  }
  const ltvNumber = parseFloat(ltv.replace('%', '')) || 0
  const getLtvStatus = () => {
    if (ltvNumber <= 40) return { label: 'Muy Seguro', color: 'text-emerald-400' }
    if (ltvNumber <= 55) return { label: 'Seguro', color: 'text-teal-400' }
    if (ltvNumber <= 70) return { label: 'Moderado', color: 'text-amber-400' }
    return { label: 'Alto', color: 'text-red-400' }
  }
  const ltvStatus = getLtvStatus()

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Avaluo Comercial</p>
        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(commercialValue)}</p>
      </div>
      <div className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Monto Solicitado</p>
        <p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(amountRequested)}</p>
      </div>
      <div className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">LTV (Loan to Value)</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-teal-400 tracking-tight">{ltv}</p>
          <span className={`text-sm ${ltvStatus.color}`}>{ltvStatus.label}</span>
        </div>
      </div>
      <div className="bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
        <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Tasa (E.A.)</p>
        <p className="text-3xl font-bold text-white tracking-tight">{interestRateEa ? `${interestRateEa}%` : '-'}</p>
      </div>
    </div>
  )
}

// ImageGallery inline
function ImageGalleryInline({ images, propertyTitle }: { images: string[]; propertyTitle: string }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden">
      <div className="relative h-[320px] bg-[#0a0a0a]">
        <Image src={images[selectedImageIndex] || images[0]} alt={propertyTitle} fill className="object-cover" />
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-lg">
          {selectedImageIndex + 1}/{images.length}
        </div>
      </div>
      <div className="p-4 bg-[#111] flex gap-3">
        {images.map((img, index) => (
          <div
            key={index}
            className={`relative w-20 h-16 rounded-lg overflow-hidden border cursor-pointer ${index === selectedImageIndex ? 'border-cyan-500/50' : 'border-white/10 hover:border-cyan-500/50'} transition-colors`}
            onClick={() => setSelectedImageIndex(index)}
          >
            <Image src={img} alt={`Vista ${index + 1}`} fill className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}

const MIN_INVESTMENT = 40_000_000
const MAX_INVESTORS = 5

export default function DemoOpportunityDetailPage() {
  const params = useParams()
  const id = params.id as string

  const loan = DEMO_CREDITOS.find((c) => c.id === id)
  const [amount, setAmount] = useState('')
  const [showToast, setShowToast] = useState(false)

  if (!loan) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">Oportunidad no encontrada</p>
          <Link href="/dashboard/demo/inversionista/marketplace" className="text-teal-400 hover:underline">
            Volver al Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const activeInvestments = DEMO_INVERSIONES.filter(
    (i) => i.credito_id === loan.id && (i.estado === 'activo' || i.estado === 'pendiente')
  )
  const amountFunded = activeInvestments.reduce((s, i) => s + (i.monto_invertido || 0), 0)
  const investorCount = activeInvestments.length

  const getPropertyTitle = () => loan.tipo_inmueble || 'Remodelacion'
  const getPropertySubtitle = () => loan.ciudad_inmueble || 'Norte'

  const ltv = loan.ltv ?? 0
  const ltvString = ltv > 0 ? `${ltv.toFixed(1)}%` : '-'

  const galleryImages = loan.fotos_inmueble && loan.fotos_inmueble.length > 0
    ? loan.fotos_inmueble
    : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop&q=80']

  // Investment panel calculations
  const remainingAmount = (loan.monto_solicitado || 0) - amountFunded
  const progress = loan.monto_solicitado ? (amountFunded / loan.monto_solicitado) * 100 : 0
  const slotsLeft = MAX_INVESTORS - investorCount
  const canInvest = slotsLeft > 0 && remainingAmount >= MIN_INVESTMENT

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`
    return formatCurrency(value)
  }

  const estimatedReturn = useMemo(() => {
    const numericAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0
    if (numericAmount <= 0 || !loan.tasa_interes_ea || !loan.plazo) return null
    const monthlyRate = Math.pow(1 + loan.tasa_interes_ea / 100, 1 / 12) - 1
    const monthlyPayment = monthlyRate === 0
      ? numericAmount / loan.plazo
      : (numericAmount * monthlyRate * Math.pow(1 + monthlyRate, loan.plazo)) / (Math.pow(1 + monthlyRate, loan.plazo) - 1)
    const totalReturn = monthlyPayment * loan.plazo
    const profit = totalReturn - numericAmount
    return { total: totalReturn, profit, percentage: loan.tasa_interes_ea }
  }, [amount, loan.tasa_interes_ea, loan.plazo])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setAmount(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-teal-400/10 border border-teal-400/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-right">
          <CheckCircle size={16} className="text-teal-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-teal-400 text-sm font-medium">Inversion simulada</p>
            <p className="text-teal-400/70 text-xs mt-1">Este es un demo. No se proceso ninguna inversion real.</p>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/demo/inversionista/marketplace"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              <span>Oportunidades</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30">
                ABIERTO PARA FONDEO
              </span>
              <span className="px-3 py-1.5 bg-white/5 text-gray-400 text-xs font-mono rounded-lg border border-white/10">
                ID: {loan.codigo_credito}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <ImageGalleryInline images={galleryImages} propertyTitle={getPropertyTitle()} />

            {/* Title Section */}
            <div className="space-y-2">
              <p className="text-cyan-400 text-sm font-medium">Solicitud #{loan.codigo_credito}</p>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {getPropertyTitle()} {getPropertySubtitle()}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Oportunidad de hipoteca de primer grado respaldada por una propiedad residencial premium en proceso de renovacion. El capital se utilizara para finalizar acabados interiores y mejoras de paisajismo.
              </p>
            </div>

            {/* Bento Metrics */}
            <BentoMetricsInline
              commercialValue={loan.valor_comercial || null}
              amountRequested={loan.monto_solicitado}
              ltv={ltvString}
              interestRateEa={loan.tasa_interes_ea}
            />

            {/* Location Section */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white tracking-wide">Ubicacion</h2>
                <span className="text-gray-500 text-sm">{loan.ciudad_inmueble || 'Colombia'}, CO</span>
              </div>
              <div className="h-48 bg-[#0d0d0d] flex items-center justify-center relative">
                <div className="text-center">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-cyan-500/30">
                    <MapPin size={20} className="text-cyan-400" />
                  </div>
                  <p className="text-gray-500 text-sm">{loan.direccion_inmueble || 'Direccion Verificada'}</p>
                </div>
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }} />
              </div>
            </div>

            {/* Risk Analysis */}
            <RiskAnalysisInline
              ltv={ltv}
              propertyType={loan.tipo_inmueble ?? undefined}
              city={loan.ciudad_inmueble ?? undefined}
            />

            {/* Verified Badges */}
            <div className="flex items-center gap-6 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-cyan-400" />
                <span className="text-gray-400 text-sm">Garantia Verificada</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-cyan-400" />
                <span className="text-gray-400 text-sm">Titulo Limpio</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-cyan-400" />
                <span className="text-gray-400 text-sm">{loan.tipo_inmueble || 'Residencial'}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Investment Panel (demo, read-only submit) */}
          <div className="lg:col-span-1">
            <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden sticky top-6">
              <div className="p-5 border-b border-white/10">
                <h3 className="text-xl font-bold text-white tracking-tight">Invertir Ahora</h3>
              </div>

              <div className="p-5">
                <form onSubmit={handleSubmit}>
                  <div className="mb-5">
                    <label htmlFor="amount" className="block text-sm text-gray-500 mb-3">
                      Cuanto quieres invertir?
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                      <input
                        type="text"
                        id="amount"
                        value={amount ? Number(amount).toLocaleString('es-CO') : ''}
                        onChange={handleAmountChange}
                        placeholder="50,000,000"
                        className="w-full pl-10 pr-4 py-4 bg-transparent border border-white/10 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-teal-400/50 transition-all placeholder-gray-700"
                        disabled={!canInvest}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-600">
                      <span>Min: {formatCompactCurrency(MIN_INVESTMENT)}</span>
                      <span>Max: {formatCompactCurrency(remainingAmount)}</span>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-600">
                      <span>Cupos: {investorCount}/{MAX_INVESTORS} inversionistas</span>
                      {slotsLeft > 0 && (
                        <span>{slotsLeft} cupo{slotsLeft !== 1 ? 's' : ''} disponible{slotsLeft !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  {estimatedReturn && estimatedReturn.profit > 0 && (
                    <div className="mb-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Retorno Estimado</span>
                        <span className="text-teal-400 font-semibold">+ {estimatedReturn.percentage}%</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tu Ganancia</p>
                        <p className="text-3xl font-bold text-white tracking-tight">
                          {formatCurrency(estimatedReturn.profit)}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">en {loan.plazo} meses</p>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mb-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-500 text-xs uppercase tracking-wider">Progreso de Fondeo</span>
                      <span className="text-teal-400 text-sm font-semibold">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-400 to-teal-400 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!amount || !canInvest}
                    className="w-full py-4 bg-teal-400 hover:bg-teal-400 disabled:bg-gray-800 disabled:cursor-not-allowed text-black disabled:text-gray-600 font-bold text-base rounded-xl transition-all shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] disabled:shadow-none"
                  >
                    Confirmar Inversion (Demo)
                  </button>

                  {!canInvest && (
                    <p className="text-center text-gray-600 text-sm mt-3">
                      {remainingAmount <= 0
                        ? 'Esta oportunidad ya esta completamente financiada.'
                        : investorCount >= MAX_INVESTORS
                          ? 'Este credito ya alcanzo el maximo de 5 inversionistas.'
                          : `El monto restante (${formatCompactCurrency(remainingAmount)}) no alcanza el minimo de inversion (${formatCompactCurrency(MIN_INVESTMENT)}).`}
                    </p>
                  )}
                </form>

                <div className="mt-5 pt-5 border-t border-white/5">
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Al confirmar, aceptas los Terminos de Servicio y la Declaracion de Riesgos para Inversiones Hipotecarias.
                  </p>
                </div>

                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-500 text-xs">
                      Los fondos se mantienen en custodia hasta alcanzar el monto total. Si no se completa el fondeo en 14 dias, tu inversion se devuelve en su totalidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
