'use client'

import { useEffect, useState } from 'react'
import { getActiveLoans, MarketplaceLoan } from './actions'
import { Store, MapPin, Calendar, Shield, Clock, DollarSign, Search, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Risk calculation helper
const calculateRiskScore = (loan: MarketplaceLoan) => {
  const ltv = loan.property_info?.commercial_value && loan.amount_requested
    ? (loan.amount_requested / loan.property_info.commercial_value) * 100
    : 50

  if (ltv <= 40) return { score: 'A1', label: 'Bajo Riesgo', borderColor: 'border-teal-400/50', textColor: 'text-teal-400', bgColor: 'bg-teal-400/10' }
  if (ltv <= 55) return { score: 'A2', label: 'Riesgo Moderado', borderColor: 'border-teal-400/50', textColor: 'text-teal-400', bgColor: 'bg-teal-400/10' }
  if (ltv <= 70) return { score: 'B1', label: 'Riesgo Medio', borderColor: 'border-amber-500/50', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10' }
  return { score: 'B2', label: 'Riesgo Alto', borderColor: 'border-red-500/50', textColor: 'text-red-400', bgColor: 'bg-red-500/10' }
}

// Property images array for variety
const propertyImages = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop&q=80'
]

export default function MarketplacePage() {
  const [loans, setLoans] = useState<MarketplaceLoan[]>([])
  const [filteredLoans, setFilteredLoans] = useState<MarketplaceLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')

  useEffect(() => {
    async function fetchLoans() {
      const result = await getActiveLoans()
      if (result.error) {
        setError(result.error)
      } else {
        setLoans(result.data)
        setFilteredLoans(result.data)
      }
      setLoading(false)
    }
    fetchLoans()
  }, [])

  useEffect(() => {
    let filtered = loans

    if (searchTerm) {
      filtered = filtered.filter(loan =>
        loan.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.property_info?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.property_info?.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(loan => {
        const risk = calculateRiskScore(loan)
        return risk.score === riskFilter
      })
    }

    setFilteredLoans(filtered)
  }, [searchTerm, riskFilter, loans])

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0'
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(0)}B COP`
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(0)}M COP`
    }
    return formatCurrency(amount)
  }

  const getPropertyTitle = (loan: MarketplaceLoan) => {
    const propertyType = loan.property_info?.property_type || 'Inmueble'
    const city = loan.property_info?.city || 'Colombia'
    return `${propertyType} ${city}`
  }

  const getFundingProgress = (loan: MarketplaceLoan) => {
    const requested = loan.amount_requested || 0
    const funded = loan.amount_funded || 0
    if (requested === 0) return 0
    return Math.min((funded / requested) * 100, 100)
  }

  const getLTV = (loan: MarketplaceLoan) => {
    const commercialValue = loan.property_info?.commercial_value
    const amountRequested = loan.amount_requested
    if (!commercialValue || !amountRequested) return '-'
    return `${((amountRequested / commercialValue) * 100).toFixed(0)}%`
  }

  const getPaymentFrequency = () => {
    const frequencies = ['Mensual', 'Trimestral', 'Vencimiento']
    return frequencies[Math.floor(Math.random() * frequencies.length)]
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-12 w-80 bg-white/5 rounded-lg mb-3"></div>
            <div className="h-5 w-96 bg-white/5 rounded mb-10"></div>
            <div className="h-16 bg-white/5 rounded-2xl mb-8"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-[#111] rounded-2xl h-[480px] border border-white/5"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Marketplace de Inversión
          </h1>
          <p className="text-gray-500 mt-3 text-lg tracking-wide">
            Oportunidades hipotecarias disponibles para fondeo inmediato
          </p>
        </header>

        {/* Filter Bar */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search Input */}
            <div className="flex-1 relative w-full lg:max-w-xs">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-teal-400/50 transition-all text-sm"
              />
            </div>

            {/* Risk Filter */}
            <div className="relative">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="pl-4 pr-10 py-3 bg-transparent border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:border-teal-400/50 transition-all cursor-pointer text-sm min-w-[160px]"
              >
                <option value="all" className="bg-[#111]">Todos (A-C)</option>
                <option value="A1" className="bg-[#111]">A1 - Bajo</option>
                <option value="A2" className="bg-[#111]">A2 - Moderado</option>
                <option value="B1" className="bg-[#111]">B1 - Medio</option>
                <option value="B2" className="bg-[#111]">B2 - Alto</option>
              </select>
              <SlidersHorizontal size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            {/* Clear Filters */}
            {(searchTerm || riskFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setRiskFilter('all'); }}
                className="flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <X size={16} />
                Limpiar
              </button>
            )}

            {/* Results count */}
            <div className="lg:ml-auto text-sm text-gray-500">
              {filteredLoans.length} oportunidades
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-sm">Error al cargar las oportunidades: {error}</p>
          </div>
        )}

        {filteredLoans.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLoans.map((loan, index) => {
              const progress = getFundingProgress(loan)
              const risk = calculateRiskScore(loan)
              const ltv = getLTV(loan)
              // Use real property photo or fallback to placeholder
              const imageUrl = loan.property_info?.photos && loan.property_info.photos.length > 0
                ? loan.property_info.photos[0]
                : propertyImages[index % propertyImages.length]

              return (
                <div
                  key={loan.id}
                  className="group bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-teal-400/30 transition-all duration-500"
                >
                  {/* Image Header */}
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={getPropertyTitle(loan)}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />


                    {/* Risk Badge - Minimalist */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1.5 ${risk.bgColor} ${risk.textColor} border ${risk.borderColor} text-xs font-semibold rounded-full backdrop-blur-sm`}>
                        RIESGO {risk.score}
                      </span>
                    </div>

                    {/* Rate overlay on image */}
                    <div className="absolute bottom-4 right-4 text-right">
                      <p className="text-3xl font-bold text-teal-400 drop-shadow-lg">
                        {loan.interest_rate_ea ? `${loan.interest_rate_ea}%` : '-'}
                        <span className="text-sm font-normal text-white/70 ml-1">E.A.</span>
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white mb-1 tracking-tight line-clamp-1">
                      {getPropertyTitle(loan)}
                    </h3>

                    {loan.property_info?.city && (
                      <p className="text-gray-500 text-sm flex items-center gap-1.5 mb-5">
                        <MapPin size={13} />
                        {loan.property_info.city}, Colombia
                      </p>
                    )}

                    {/* Mini Data Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">LTV</p>
                        <p className="text-white font-semibold">{ltv}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Plazo</p>
                        <p className="text-white font-semibold">{loan.term_months ? `${loan.term_months}m` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Monto</p>
                        <p className="text-white font-semibold">{formatCompactCurrency(loan.amount_requested)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Pago</p>
                        <p className="text-white font-semibold">{getPaymentFrequency()}</p>
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="mb-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-xs uppercase tracking-wider">Progreso</span>
                        <span className="text-teal-400 font-semibold text-sm">{progress.toFixed(0)}% Fondeado</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-400 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Link
                        href={`/dashboard/inversionista/marketplace/${loan.id}`}
                        className="flex-1 py-3 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-center font-medium rounded-xl transition-all border border-white/10 hover:border-white/20 text-sm"
                      >
                        Ver Detalle
                      </Link>
                      <Link
                        href={`/dashboard/inversionista/marketplace/${loan.id}`}
                        className="flex-1 py-3 bg-teal-400 hover:bg-teal-300 text-black text-center font-bold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)]"
                      >
                        Invertir
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 bg-[#111] rounded-2xl border border-white/5">
            <Store size={56} className="text-gray-700 mb-4" />
            <p className="text-gray-400 text-xl font-medium tracking-tight">No hay oportunidades disponibles</p>
            <p className="text-gray-600 text-sm mt-2">Vuelve pronto para ver nuevas inversiones</p>
          </div>
        )}
      </div>
    </div>
  )
}
