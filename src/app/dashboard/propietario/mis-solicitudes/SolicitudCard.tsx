'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Upload,
  X,
  Loader2,
  AlertTriangle,
  MapPin,
  DollarSign,
} from 'lucide-react'
import { updateSolicitudDocumentos, type MiSolicitud } from './actions'
import { uploadFile, deleteFile } from '@/utils/uploadFile'

const DOCUMENT_TYPES = [
  { key: 'libertad_tradicion', label: 'Certificado de Libertad y Tradicion' },
  { key: 'escritura', label: 'Escritura de adquisicion del inmueble' },
  { key: 'cedula', label: 'Cedula de ciudadania (ambos lados)' },
  { key: 'extractos', label: 'Ultimos 3 extractos bancarios' },
  { key: 'declaracion_renta', label: 'Declaracion de renta o certificado laboral' },
]

const PHOTO_TYPES = [
  { key: 'fachada', label: 'Fachada exterior' },
  { key: 'sala', label: 'Sala / Comedor' },
  { key: 'cocina', label: 'Cocina' },
  { key: 'habitaciones', label: 'Habitaciones' },
  { key: 'banos', label: 'Banos' },
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
      return { label: 'Pendiente', class: 'bg-amber-50 text-amber-600 border-amber-200', icon: Clock }
    case 'en_revision':
      return { label: 'En Revision', class: 'bg-blue-50 text-blue-600 border-blue-200', icon: Eye }
    case 'aprobada':
      return { label: 'Aprobada', class: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle }
    case 'rechazada':
      return { label: 'Rechazada', class: 'bg-red-50 text-red-600 border-red-200', icon: XCircle }
    default:
      return { label: estado, class: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock }
  }
}

export default function SolicitudCard({ solicitud }: { solicitud: MiSolicitud }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Local state for docs/fotos so uploads reflect immediately
  const [docs, setDocs] = useState<{ tipo: string; url: string }[]>(solicitud.documentos)
  const [fotos, setFotos] = useState<{ tipo: string; url: string }[]>(solicitud.fotos)

  const status = getStatusConfig(solicitud.estado)
  const StatusIcon = status.icon
  const ltv = solicitud.valor_inmueble > 0 ? ((solicitud.monto_requerido / solicitud.valor_inmueble) * 100).toFixed(1) : '-'

  const docCount = DOCUMENT_TYPES.filter(dt => docs.some(d => d.tipo === dt.key)).length
  const photoCount = PHOTO_TYPES.filter(pt => fotos.some(f => f.tipo === pt.key)).length
  const totalProgress = docCount + photoCount
  const isEditable = solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision'

  const handleUpload = async (file: File, key: string, type: 'doc' | 'foto') => {
    setUploading(key)
    setError('')
    try {
      const result = await uploadFile(file, 'solicitudes')
      if (result.success && result.url) {
        const newItem = { tipo: key, url: result.url }
        let newDocs = docs
        let newFotos = fotos

        if (type === 'doc') {
          newDocs = [...docs.filter(d => d.tipo !== key), newItem]
          setDocs(newDocs)
        } else {
          newFotos = [...fotos.filter(f => f.tipo !== key), newItem]
          setFotos(newFotos)
        }

        // Save to DB
        startTransition(async () => {
          const saveResult = await updateSolicitudDocumentos(
            solicitud.id,
            type === 'doc' ? newDocs : docs,
            type === 'foto' ? newFotos : fotos
          )
          if (!saveResult.success) {
            setError(saveResult.error || 'Error al guardar')
          }
          router.refresh()
        })
      } else {
        setError(result.error || 'Error al subir archivo')
      }
    } catch {
      setError('Error al subir archivo')
    } finally {
      setUploading(null)
    }
  }

  const handleRemove = async (key: string, type: 'doc' | 'foto') => {
    const url = type === 'doc' ? docs.find(d => d.tipo === key)?.url : fotos.find(f => f.tipo === key)?.url
    if (!url) return

    await deleteFile(url)

    let newDocs = docs
    let newFotos = fotos

    if (type === 'doc') {
      newDocs = docs.filter(d => d.tipo !== key)
      setDocs(newDocs)
    } else {
      newFotos = fotos.filter(f => f.tipo !== key)
      setFotos(newFotos)
    }

    // Save to DB
    startTransition(async () => {
      await updateSolicitudDocumentos(solicitud.id, newDocs, newFotos)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <MapPin size={24} className="text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{solicitud.ciudad}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.class}`}>
                  <StatusIcon size={12} />
                  {status.label}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">{solicitud.direccion_inmueble}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-emerald-600 font-semibold">{formatCOP(solicitud.monto_requerido)}</p>
              <p className="text-xs text-gray-400">{formatDate(solicitud.created_at)}</p>
            </div>
            {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Progreso de documentacion</span>
            <span className="text-xs font-medium text-gray-700">{totalProgress}/10</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${totalProgress === 10 ? 'bg-emerald-500' : 'bg-amber-400'}`}
              style={{ width: `${(totalProgress / 10) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-gray-400">
            <span>{docCount}/5 documentos</span>
            <span>{photoCount}/5 fotos</span>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Property details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">Monto Solicitado</p>
              <p className="text-sm font-semibold text-emerald-600">{formatCOP(solicitud.monto_requerido)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Valor Inmueble</p>
              <p className="text-sm font-semibold text-gray-900">{formatCOP(solicitud.valor_inmueble)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">LTV</p>
              <p className="text-sm font-semibold text-gray-900">{ltv}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Hipoteca</p>
              <p className="text-sm font-semibold text-gray-900">{solicitud.tiene_hipoteca ? 'Si' : 'No'}</p>
            </div>
          </div>

          {/* Admin notes */}
          {solicitud.notas_admin && (
            <div className={`p-4 rounded-xl border mb-6 ${
              solicitud.estado === 'rechazada'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className={`text-sm font-medium mb-1 ${
                solicitud.estado === 'rechazada' ? 'text-red-700' : 'text-blue-700'
              }`}>
                Notas del equipo Aluri:
              </p>
              <p className={`text-sm ${
                solicitud.estado === 'rechazada' ? 'text-red-600' : 'text-blue-600'
              }`}>
                {solicitud.notas_admin}
              </p>
            </div>
          )}

          {/* Documents section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-emerald-500" />
              Documentos ({docCount}/5)
            </h4>
            <div className="space-y-2">
              {DOCUMENT_TYPES.map(dt => {
                const uploaded = docs.find(d => d.tipo === dt.key)
                return (
                  <div
                    key={dt.key}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      uploaded
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {uploaded ? (
                        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <DollarSign size={16} className="text-gray-300 shrink-0" />
                      )}
                      <span className={`text-sm truncate ${uploaded ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {dt.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {uploaded ? (
                        <>
                          <a
                            href={uploaded.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:underline"
                          >
                            Ver
                          </a>
                          {isEditable && (
                            <button
                              onClick={() => handleRemove(dt.key, 'doc')}
                              className="p-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </>
                      ) : isEditable ? (
                        <label className="cursor-pointer">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            uploading === dt.key
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}>
                            {uploading === dt.key ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                            Subir
                          </div>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            disabled={uploading === dt.key || isPending}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleUpload(file, dt.key, 'doc')
                              e.target.value = ''
                            }}
                          />
                        </label>
                      ) : (
                        <span className="text-xs text-gray-400">Faltante</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Photos section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Camera size={16} className="text-emerald-500" />
              Fotos del Inmueble ({photoCount}/5)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {PHOTO_TYPES.map(pt => {
                const uploaded = fotos.find(f => f.tipo === pt.key)
                return (
                  <div key={pt.key} className="space-y-1">
                    {uploaded ? (
                      <div className="relative">
                        <img
                          src={uploaded.url}
                          alt={pt.label}
                          className="w-full h-28 object-cover rounded-xl border border-emerald-200"
                        />
                        {isEditable && (
                          <button
                            onClick={() => handleRemove(pt.key, 'foto')}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/90 text-red-500 hover:bg-white shadow-sm transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ) : isEditable ? (
                      <label className="cursor-pointer block">
                        <div className={`flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed transition-colors ${
                          uploading === pt.key
                            ? 'border-gray-300 text-gray-400'
                            : 'border-gray-300 text-gray-400 hover:border-emerald-300 hover:text-emerald-500'
                        }`}>
                          {uploading === pt.key ? (
                            <Loader2 size={20} className="animate-spin mb-1" />
                          ) : (
                            <Camera size={20} className="mb-1" />
                          )}
                          <span className="text-xs">Subir</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading === pt.key || isPending}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleUpload(file, pt.key, 'foto')
                            e.target.value = ''
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-28 rounded-xl border border-gray-200 bg-gray-50">
                        <XCircle size={18} className="text-gray-300" />
                      </div>
                    )}
                    <p className={`text-xs text-center ${uploaded ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {pt.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
