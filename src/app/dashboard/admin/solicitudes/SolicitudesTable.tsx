'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  ExternalLink,
  Loader2,
  Download,
} from 'lucide-react'
import { updateEstadoSolicitud, type SolicitudRow } from './actions'

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

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

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

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

function getFileExtension(url: string): string {
  const path = new URL(url).pathname
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext && ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) return `.${ext}`
  return ''
}

export default function SolicitudesTable({ solicitudes }: { solicitudes: SolicitudRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabFilter>('todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notas, setNotas] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const handleAction = async (id: string, estado: string) => {
    setActionLoading(`${id}-${estado}`)
    startTransition(async () => {
      const result = await updateEstadoSolicitud(id, estado, notas[id])
      if (!result.success) {
        alert(result.error || 'Error al actualizar')
      }
      setActionLoading(null)
      router.refresh()
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (solicitudes.length === 0) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
        <FileText size={48} className="mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400 font-medium">No hay solicitudes registradas</p>
      </div>
    )
  }

  return (
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
                const canApprove = docCount === 5 && photoCount === 5

                return (
                  <React.Fragment key={sol.id}>
                    {/* Clickable data row */}
                    <tr
                      onClick={() => toggleExpand(sol.id)}
                      className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-left text-slate-300 whitespace-nowrap">{formatDate(sol.created_at)}</td>
                      <td className="py-3 px-4 text-left text-white font-medium truncate max-w-[200px]">
                        {sol.solicitante?.full_name || 'Sin nombre'}
                      </td>
                      <td className="py-3 px-4 text-left text-slate-300 truncate max-w-[120px]">{sol.ciudad}</td>
                      <td className="py-3 px-4 text-right text-slate-300 whitespace-nowrap">{formatCOP(sol.monto_requerido)}</td>
                      <td className="py-3 px-4 text-right text-slate-300 whitespace-nowrap">{ltv}%</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`text-xs font-medium ${docCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {docCount}/5
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`text-xs font-medium ${photoCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {photoCount}/5
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.class}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                    <tr className="border-b border-slate-700/50">
                      <td colSpan={9} className="p-0">
                        <div className="px-6 pb-6 pt-2 bg-slate-800/50 border-t border-slate-700/50">
                          {/* Download all */}
                          {(docCount > 0 || photoCount > 0) && (
                            <div className="flex justify-end mb-4">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const allFiles = [
                                    ...sol.documentos.map(d => ({
                                      url: d.url,
                                      name: `${DOCUMENT_TYPES.find(dt => dt.key === d.tipo)?.label || d.tipo}${getFileExtension(d.url)}`,
                                    })),
                                    ...sol.fotos.map(f => ({
                                      url: f.url,
                                      name: `${PHOTO_TYPES.find(pt => pt.key === f.tipo)?.label || f.tipo}${getFileExtension(f.url)}`,
                                    })),
                                  ]
                                  for (const file of allFiles) {
                                    await downloadFile(file.url, file.name)
                                    await new Promise(r => setTimeout(r, 300))
                                  }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                              >
                                <Download size={14} />
                                Descargar todo ({docCount + photoCount} archivos)
                              </button>
                            </div>
                          )}

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
                                    {uploaded && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={e => {
                                            e.stopPropagation()
                                            downloadFile(uploaded.url, `${dt.label}${getFileExtension(uploaded.url)}`)
                                          }}
                                          className="p-1 hover:text-white transition-colors"
                                          title="Descargar"
                                        >
                                          <Download size={12} />
                                        </button>
                                        <a
                                          href={uploaded.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          className="p-1 hover:text-white transition-colors"
                                          title="Abrir en nueva pestaña"
                                        >
                                          <ExternalLink size={12} />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Photos */}
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                              <Camera size={14} /> Fotos ({photoCount}/5)
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                              {PHOTO_TYPES.map(pt => {
                                const uploaded = sol.fotos.find(f => f.tipo === pt.key)
                                return (
                                  <div key={pt.key} className="space-y-1">
                                    {uploaded ? (
                                      <div className="relative group/photo">
                                        <a
                                          href={uploaded.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={e => e.stopPropagation()}
                                          className="block"
                                        >
                                          <img
                                            src={uploaded.url}
                                            alt={pt.label}
                                            className="w-full h-24 object-cover rounded-lg border border-emerald-500/30"
                                          />
                                        </a>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation()
                                            downloadFile(uploaded.url, `${pt.label}${getFileExtension(uploaded.url)}`)
                                          }}
                                          className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-md text-white/70 hover:text-white opacity-0 group-hover/photo:opacity-100 transition-opacity"
                                          title="Descargar"
                                        >
                                          <Download size={12} />
                                        </button>
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

                          {/* Admin notes + actions */}
                          <div className="border-t border-slate-700 pt-4">
                            <label className="block text-xs text-slate-500 mb-2">Notas del administrador</label>
                            <textarea
                              value={notas[sol.id] ?? sol.notas_admin ?? ''}
                              onChange={e => setNotas(prev => ({ ...prev, [sol.id]: e.target.value }))}
                              placeholder="Agregar notas sobre esta solicitud..."
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-amber-500 focus:border-amber-500 min-h-[60px] mb-4"
                              disabled={sol.estado === 'aprobada' || sol.estado === 'rechazada'}
                            />

                            {(sol.estado === 'pendiente' || sol.estado === 'en_revision') && (
                              <div className="flex items-center gap-3 flex-wrap">
                                {sol.estado === 'pendiente' && (
                                  <button
                                    onClick={() => handleAction(sol.id, 'en_revision')}
                                    disabled={isPending || actionLoading !== null}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading === `${sol.id}-en_revision` ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                                    Marcar En Revision
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction(sol.id, 'aprobada')}
                                  disabled={isPending || actionLoading !== null || !canApprove}
                                  title={!canApprove ? 'Se requieren todos los documentos (5/5) y fotos (5/5)' : ''}
                                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoading === `${sol.id}-aprobada` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => handleAction(sol.id, 'rechazada')}
                                  disabled={isPending || actionLoading !== null}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === `${sol.id}-rechazada` ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                  Rechazar
                                </button>
                                {!canApprove && (
                                  <p className="text-xs text-amber-400">
                                    Faltan {5 - docCount} documento(s) y {5 - photoCount} foto(s) para aprobar
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
