'use client'

import { useState, useMemo } from 'react'
import { FileText, Building2, DollarSign, Hash, Calendar, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
import AbonosTable from '../../../../components/dashboard/AbonosTable'
import ExtractoModal from './ExtractoModal'

type SortField = 'codigo' | 'estado' | 'monto' | 'fecha'
type SortDirection = 'asc' | 'desc'

interface Transaccion {
  id: string
  tipo_transaccion: string
  monto: number
  fecha_aplicacion: string
  referencia_pago: string | null
}

interface Credito {
  id: string
  codigo_credito: string
  estado: string
  monto_solicitado: number
  valor_colocado: number | null
  tasa_nominal: number | null
  tasa_interes_ea: number | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  created_at: string
  inversiones: { monto_invertido: number }[]
  transacciones: Transaccion[]
}

interface CreditosListProps {
  creditos: Credito[]
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const getStatusLabel = (estado: string) => {
  switch (estado) {
    case 'solicitado': return 'Solicitado'
    case 'aprobado': return 'Aprobado'
    case 'publicado': return 'Colocando'
    case 'en_firma': return 'En Firma'
    case 'firmado': return 'Firmado'
    case 'activo': return 'Desembolsado'
    case 'finalizado': return 'Completado'
    case 'castigado': return 'Castigado'
    case 'mora': return 'En Mora'
    case 'anulado': return 'Anulado'
    case 'no_colocado': return 'No Colocado'
    default: return estado
  }
}

const getStatusClass = (estado: string) => {
  switch (estado) {
    case 'solicitado': return 'bg-gray-100 text-gray-600 border-gray-200'
    case 'aprobado': return 'bg-blue-50 text-blue-600 border-blue-200'
    case 'publicado': return 'bg-amber-50 text-amber-600 border-amber-200'
    case 'en_firma': return 'bg-purple-50 text-purple-600 border-purple-200'
    case 'firmado': return 'bg-indigo-50 text-indigo-600 border-indigo-200'
    case 'activo': return 'bg-emerald-50 text-emerald-600 border-emerald-200'
    case 'finalizado': return 'bg-teal-50 text-teal-600 border-teal-200'
    case 'castigado': return 'bg-orange-50 text-orange-600 border-orange-200'
    case 'mora': return 'bg-red-50 text-red-600 border-red-200'
    case 'anulado': return 'bg-gray-100 text-gray-400 border-gray-200'
    case 'no_colocado': return 'bg-gray-100 text-gray-400 border-gray-200'
    default: return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const getPropertyTypeLabel = (type: string | undefined) => {
  const types: Record<string, string> = {
    casa: 'Casa',
    apartamento: 'Apartamento',
    lote: 'Lote',
    predio_rural: 'Predio Rural',
    oficina: 'Oficina',
    bodega: 'Bodega',
    local_comercial: 'Local Comercial',
  }
  return type ? types[type] || type : 'No especificado'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getFunded = (credito: Credito): number => {
  const inversiones = credito.inversiones
  if (!inversiones || !Array.isArray(inversiones)) return 0
  return inversiones.reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0)
}

export default function CreditosList({ creditos }: CreditosListProps) {
  const [sortField, setSortField] = useState<SortField>('fecha')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedAbonos, setExpandedAbonos] = useState<Set<string>>(new Set())

  const toggleAbonos = (creditId: string) => {
    setExpandedAbonos(prev => {
      const next = new Set(prev)
      if (next.has(creditId)) next.delete(creditId)
      else next.add(creditId)
      return next
    })
  }

  const sortedCreditos = useMemo(() => {
    return [...creditos].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'codigo':
          comparison = (a.codigo_credito || '').localeCompare(b.codigo_credito || '')
          break
        case 'estado':
          comparison = (a.estado || '').localeCompare(b.estado || '')
          break
        case 'monto':
          comparison = (a.monto_solicitado || 0) - (b.monto_solicitado || 0)
          break
        case 'fecha':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [creditos, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
        sortField === field
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
      ) : (
        <ArrowUpDown size={14} className="opacity-40" />
      )}
    </button>
  )

  if (!creditos || creditos.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600 font-medium">No tienes creditos registrados</p>
        <p className="text-sm text-gray-400 mt-2">Contacta a soporte para mas informacion</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">Ordenar por:</span>
        <SortButton field="codigo" label="Codigo" />
        <SortButton field="estado" label="Estado" />
        <SortButton field="monto" label="Monto" />
        <SortButton field="fecha" label="Fecha" />
      </div>

      {/* Credits List */}
      {sortedCreditos.map((credito) => {
        const amountFunded = getFunded(credito)
        const fundingProgress = credito.monto_solicitado > 0
          ? Math.round((amountFunded / credito.monto_solicitado) * 100)
          : 0

        return (
          <div key={credito.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <Building2 size={24} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{credito.codigo_credito}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(credito.estado)}`}>
                        {getStatusLabel(credito.estado)}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {credito.ciudad_inmueble || 'Sin ubicacion'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Creado</p>
                  <p className="text-sm text-gray-600">{formatDate(credito.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Codigo */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Hash size={14} />
                    <span>Codigo</span>
                  </div>
                  <p className="text-gray-900 font-semibold">{credito.codigo_credito}</p>
                </div>

                {/* Estado */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Calendar size={14} />
                    <span>Estado</span>
                  </div>
                  <p className="text-gray-900 font-semibold">{getStatusLabel(credito.estado)}</p>
                </div>

                {/* Valor Inmueble */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Building2 size={14} />
                    <span>Valor Inmueble</span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {credito.valor_comercial
                      ? formatCOP(credito.valor_comercial)
                      : 'No registrado'}
                  </p>
                </div>

                {/* Monto Solicitado */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <DollarSign size={14} />
                    <span>Monto Solicitado</span>
                  </div>
                  <p className="text-emerald-600 font-semibold">{formatCOP(credito.monto_solicitado)}</p>
                </div>
              </div>

              {/* Additional Info Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
                {/* Tipo de Predio */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Building2 size={14} />
                    <span>Tipo de Predio</span>
                  </div>
                  <p className="text-gray-900">{getPropertyTypeLabel(credito.tipo_inmueble)}</p>
                </div>

                {/* Tasa EA */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <TrendingUp size={14} />
                    <span>Tasa EA</span>
                  </div>
                  <p className="text-gray-900">{credito.tasa_interes_ea ? `${credito.tasa_interes_ea}%` : '-'}</p>
                </div>

                {/* Direccion */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Hash size={14} />
                    <span>Direccion</span>
                  </div>
                  <p className="text-gray-900">{credito.direccion_inmueble || 'No registrada'}</p>
                </div>

                {/* Monto Fondeado */}
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <DollarSign size={14} />
                    <span>Monto Fondeado</span>
                  </div>
                  <p className="text-gray-900">{formatCOP(amountFunded)}</p>
                </div>
              </div>

              {/* Funding Progress Bar */}
              {(credito.estado === 'publicado' || credito.estado === 'activo') && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Progreso de Fondeo</span>
                    <span className="text-sm font-medium text-gray-900">{fundingProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(fundingProgress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>{formatCOP(amountFunded)} fondeado</span>
                    <span>{formatCOP(credito.monto_solicitado)} objetivo</span>
                  </div>
                </div>
              )}

              {/* Pagar Cuota + Abonos Toggle */}
              <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <a
                    href="https://backend.paymentsway.co/Linkabierto/OGMzNGY2N2UtZTFiMC00ZmU0LTg5N2QtYWVlMTdmYzdiMDQ3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Pagar cuota
                  </a>
                  <ExtractoModal creditoId={credito.id} codigoCredito={credito.codigo_credito} />
                </div>
                {credito.transacciones && credito.transacciones.length > 0 && (
                  <button
                    onClick={() => toggleAbonos(credito.id)}
                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {expandedAbonos.has(credito.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {expandedAbonos.has(credito.id) ? 'Ocultar Abonos' : 'Ver Abonos'}
                  </button>
                )}
              </div>
              {credito.transacciones && credito.transacciones.length > 0 && expandedAbonos.has(credito.id) && (
                <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
                  <AbonosTable
                    transacciones={credito.transacciones}
                    valorColocado={credito.valor_colocado || credito.monto_solicitado}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
