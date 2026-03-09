'use client'

import { useState, useMemo } from 'react'
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { DEMO_SOLICITUDES, formatCOP, formatDate } from '@/lib/demo-data'

const DOCUMENT_TYPES = [
  { key: 'libertad_tradicion', label: 'Certificado Libertad y Tradicion' },
  { key: 'escritura', label: 'Escritura de adquisicion' },
  { key: 'cedula', label: 'Cedula de ciudadania' },
  { key: 'extractos', label: 'Extractos bancarios' },
  { key: 'declaracion_renta', label: 'Declaracion de renta' },
]

const PHOTO_TYPES = [
  { key: 'fachada', label: 'Fachada exterior' },
  { key: 'sala', label: 'Sala / Comedor' },
  { key: 'cocina', label: 'Cocina' },
  { key: 'habitaciones', label: 'Habitaciones' },
  { key: 'banos', label: 'Banos' },
]

type TabFilter = 'todas' | 'pendiente' | 'en_revision' | 'aprobada' | 'rechazada'

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'en_revision', label: 'En Revision' },
  { key: 'aprobada', label: 'Aprobadas' },
  { key: 'rechazada', label: 'Rechazadas' },
]

const getStatusConfig = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return { label: 'Pendiente', class: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock }
    case 'en_revision':
      return { label: 'En Revision', class: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Eye }
    case 'aprobada':
      return { label: 'Aprobada', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle }
    case 'rechazada':
      return { label: 'Rechazada', class: 'bg-red-500/10 text-red-400 border-red-500/30', icon: XCircle }
    default:
      return { label: estado, class: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: AlertCircle }
  }
}

function getDocCount(docs: { tipo: string; url: string }[]): number {
  const uploaded = new Set(docs.map(d => d.tipo))
  return DOCUMENT_TYPES.filter(dt => uploaded.has(dt.key)).length
}

function getPhotoCount(fotos: { tipo: string; url: string }[]): number {
  const uploaded = new Set(fotos.map(f => f.tipo))
  return PHOTO_TYPES.filter(pt => uploaded.has(pt.key)).length
}

export default function DemoSolicitudesPage() {
  const solicitudes = DEMO_SOLICITUDES
  const [activeTab, setActiveTab] = useState<TabFilter>('todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (activeTab === 'todas') return solicitudes
    return solicitudes.filter(s => s.estado === activeTab)
  }, [solicitudes, activeTab])

  const countByEstado = useMemo(() => {
    const counts: Record<string, number> = { todas: solicitudes.length }
    solicitudes.forEach(s => {
      counts[s.estado] = (counts[s.estado] || 0) + 1
    })
    return counts
  }, [solicitudes])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <ClipboardList size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes de Credito</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Revisa y gestiona las solicitudes de los propietarios
          </p>
        </div>
      </header>

      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {tab.label}
              {countByEstado[tab.key] !== undefined && (
                <span className="ml-2 text-xs opacity-70">({countByEstado[tab.key] || 0})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 font-medium">No hay solicitudes en esta categoria</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Fecha</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Solicitante</th>
                    <th className="text-left text-slate-400 font-medium py-3 px-4">Ciudad</th>
                    <th className="text-right text-slate-400 font-medium py-3 px-4">Monto</th>
                    <th className="text-right text-slate-400 font-medium py-3 px-4">LTV</th>
                    <th className="text-center text-slate-400 font-medium py-3 px-4">Docs</th>
                    <th className="text-center text-slate-400 font-medium py-3 px-4">Fotos</th>
                    <th className="text-center text-slate-400 font-medium py-3 px-4">Estado</th>
                    <th className="text-center text-slate-400 font-medium py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sol => {
                    const status = getStatusConfig(sol.estado)
                    const StatusIcon = status.icon
                    const docCount = getDocCount(sol.documentos)
                    const photoCount = getPhotoCount(sol.fotos)
                    const ltv = sol.valor_inmueble > 0 ? ((sol.monto_requerido / sol.valor_inmueble) * 100).toFixed(1) : '-'
                    const isExpanded = expandedId === sol.id

                    return (
                      <tr key={sol.id} className="border-b border-slate-700/50 last:border-0">
                        <td colSpan={9} className="p-0">
                          {/* Row */}
                          <button
                            onClick={() => toggleExpand(sol.id)}
                            className="w-full flex items-center hover:bg-slate-700/30 transition-colors"
                          >
                            <span className="py-3 px-4 text-left text-slate-300 w-[110px] shrink-0">{formatDate(sol.created_at)}</span>
                            <span className="py-3 px-4 text-left text-white font-medium flex-1 min-w-0 truncate">
                              {sol.solicitante?.full_name || 'Sin nombre'}
                            </span>
                            <span className="py-3 px-4 text-left text-slate-300 w-[120px] shrink-0 truncate">{sol.ciudad}</span>
                            <span className="py-3 px-4 text-right text-slate-300 w-[140px] shrink-0">{formatCOP(sol.monto_requerido)}</span>
                            <span className="py-3 px-4 text-right text-slate-300 w-[70px] shrink-0">{ltv}%</span>
                            <span className="py-3 px-4 text-center w-[70px] shrink-0">
                              <span className={`text-xs font-medium ${docCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {docCount}/5
                              </span>
                            </span>
                            <span className="py-3 px-4 text-center w-[70px] shrink-0">
                              <span className={`text-xs font-medium ${photoCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {photoCount}/5
                              </span>
                            </span>
                            <span className="py-3 px-4 text-center w-[120px] shrink-0">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.class}`}>
                                <StatusIcon size={12} />
                                {status.label}
                              </span>
                            </span>
                            <span className="py-3 px-4 text-center w-[40px] shrink-0">
                              {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                            </span>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="px-6 pb-6 pt-2 bg-slate-800/50 border-t border-slate-700/50">
                              {/* Property info */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Direccion</p>
                                  <p className="text-sm text-slate-200">{sol.direccion_inmueble}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Valor Inmueble</p>
                                  <p className="text-sm text-slate-200">{formatCOP(sol.valor_inmueble)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Hipoteca/Embargo</p>
                                  <p className="text-sm text-slate-200">{sol.tiene_hipoteca ? 'Si' : 'No'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">A nombre del solicitante</p>
                                  <p className="text-sm text-slate-200">{sol.a_nombre_solicitante ? 'Si' : 'No'}</p>
                                </div>
                                {sol.solicitante?.email && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Email</p>
                                    <p className="text-sm text-slate-200">{sol.solicitante.email}</p>
                                  </div>
                                )}
                                {sol.solicitante?.document_id && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Documento</p>
                                    <p className="text-sm text-slate-200">{sol.solicitante.document_id}</p>
                                  </div>
                                )}
                                {sol.uso_dinero && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Uso del dinero</p>
                                    <p className="text-sm text-slate-200">{sol.uso_dinero}</p>
                                  </div>
                                )}
                              </div>

                              {/* Documents */}
                              <div className="mb-6">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                  <FileText size={14} /> Documentos ({docCount}/5)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {DOCUMENT_TYPES.map(dt => {
                                    const uploaded = sol.documentos.find(d => d.tipo === dt.key)
                                    return (
                                      <div
                                        key={dt.key}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                                          uploaded
                                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                            : 'bg-slate-700/30 border-slate-600/30 text-slate-500'
                                        }`}
                                      >
                                        {uploaded ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                        <span className="flex-1 truncate">{dt.label}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Photos */}
                              <div className="mb-6">
                                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                                  Fotos ({photoCount}/5)
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                  {PHOTO_TYPES.map(pt => {
                                    const uploaded = sol.fotos.find(f => f.tipo === pt.key)
                                    return (
                                      <div key={pt.key} className="space-y-1">
                                        {uploaded ? (
                                          <div className="w-full h-24 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-center">
                                            <CheckCircle size={18} className="text-emerald-400" />
                                          </div>
                                        ) : (
                                          <div className="w-full h-24 rounded-lg border border-slate-600/30 bg-slate-700/30 flex items-center justify-center">
                                            <XCircle size={18} className="text-slate-500" />
                                          </div>
                                        )}
                                        <p className={`text-xs text-center ${uploaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                                          {pt.label}
                                        </p>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Admin notes (read-only in demo) */}
                              {sol.notas_admin && (
                                <div className="border-t border-slate-700 pt-4">
                                  <label className="block text-xs text-slate-500 mb-2">Notas del administrador</label>
                                  <p className="text-sm text-slate-300 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2">
                                    {sol.notas_admin}
                                  </p>
                                </div>
                              )}

                              {/* Demo notice */}
                              <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                <p className="text-xs text-amber-400">
                                  Las acciones (aprobar, rechazar, marcar en revision) no estan disponibles en modo demo.
                                </p>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
