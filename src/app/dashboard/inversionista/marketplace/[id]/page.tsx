import { getLoanDetail } from './actions'
import { ArrowLeft, MapPin, Building2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import InvestmentPanel from './InvestmentPanel'
import BentoMetrics from './BentoMetrics'
import RiskAnalysis from './RiskAnalysis'
import ImageGallery from './ImageGallery'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params

  const { data: loan, error } = await getLoanDetail(id)

  if (error || !loan) {
    notFound()
  }

  const getPropertyTitle = () => {
    const propertyType = loan.property_info?.property_type || 'Remodelación'
    return propertyType
  }

  const getPropertySubtitle = () => {
    return loan.property_info?.city || 'Norte'
  }

  // Calculate LTV
  const calculateLTV = () => {
    const commercialValue = loan.property_info?.commercial_value
    const amountRequested = loan.amount_requested
    if (!commercialValue || !amountRequested) return 0
    return (amountRequested / commercialValue) * 100
  }

  const ltv = calculateLTV()
  const ltvString = ltv > 0 ? `${ltv.toFixed(1)}%` : '-'

  // Gallery images - use real photos from database or fallback to placeholders
  const galleryImages = loan.property_info?.photos && loan.property_info.photos.length > 0 
    ? loan.property_info.photos
    : [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop&q=80'
      ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Navigation */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/inversionista/marketplace"
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
                ID: {loan.code}
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
            <ImageGallery images={galleryImages} propertyTitle={getPropertyTitle()} />

            {/* Title Section */}
            <div className="space-y-2">
              <p className="text-cyan-400 text-sm font-medium">Solicitud #{loan.code}</p>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {getPropertyTitle()} {getPropertySubtitle()}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Oportunidad de hipoteca de primer grado respaldada por una propiedad residencial premium en proceso de renovación. El capital se utilizará para finalizar acabados interiores y mejoras de paisajismo.
              </p>
            </div>

            {/* Bento Metrics */}
            <BentoMetrics
              commercialValue={loan.property_info?.commercial_value || null}
              amountRequested={loan.amount_requested}
              ltv={ltvString}
              interestRateEa={loan.interest_rate_ea}
            />

            {/* Location Section */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white tracking-wide">Ubicación</h2>
                <span className="text-gray-500 text-sm">{loan.property_info?.city || 'Medellín'}, CO</span>
              </div>
              <div className="h-48 bg-[#0d0d0d] flex items-center justify-center relative">
                <div className="text-center">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-cyan-500/30">
                    <MapPin size={20} className="text-cyan-400" />
                  </div>
                  <p className="text-gray-500 text-sm">{loan.property_info?.address || 'Dirección Verificada'}</p>
                </div>
                {/* Map grid overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                  backgroundSize: '30px 30px'
                }} />
              </div>
            </div>

            {/* Risk Analysis */}
            <RiskAnalysis
              ltv={ltv}
              propertyType={loan.property_info?.property_type}
              city={loan.property_info?.city}
            />

            {/* Verified Badges Section */}
            <div className="flex items-center gap-6 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-cyan-400" />
                <span className="text-gray-400 text-sm">Garantía Verificada</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-cyan-400" />
                <span className="text-gray-400 text-sm">Título Limpio</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-cyan-400" />
                <span className="text-gray-400 text-sm">{loan.property_info?.property_type || 'Residencial'}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Investment Panel */}
          <div className="lg:col-span-1">
            <InvestmentPanel
              loanId={loan.id}
              amountRequested={loan.amount_requested || 0}
              amountFunded={loan.amount_funded || 0}
              interestRateEa={loan.interest_rate_ea}
              termMonths={loan.term_months}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
