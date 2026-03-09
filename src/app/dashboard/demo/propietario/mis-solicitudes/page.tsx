'use client'

import { useState } from 'react'
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  FileText,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MapPin,
} from 'lucide-react'
import { DEMO_SOLICITUDES, formatCOP } from '@/lib/demo-data/index'

const PROPIETARIO_ID = 'demo-prop-001'

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

function DemoSolicitudCard({ solicitud }: { solicitud: typeof DEMO_SOLICITUDES[number] }) {
  const [expanded, setExpanded] = useState(false)

  const status = getStatusConfig(solicitud.estado)
  const StatusIcon = status.icon
  const ltv = solicitud.valor_inmueble > 0 ? ((solicitud.monto_requerido / solicitud.valor_inmueble) * 100).toFixed(1) : '-'

  const docCount = DOCUMENT_TYPES.filter(dt => solicitud.documentos.some(d => d.tipo === dt.key)).length
  const photoCount = PHOTO_TYPES.filter(pt => solicitud.fotos.some(f => f.tipo === pt.key)).length
  const totalProgress = docCount + photoCount

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
                const uploaded = solicitud.documentos.find(d => d.tipo === dt.key)
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
                        <XCircle size={16} className="text-gray-300 shrink-0" />
                      )}
                      <span className={`text-sm truncate ${uploaded ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {dt.label}
                      </span>
                    </div>
                    <div className="shrink-0">
                      {uploaded ? (
                        <span className="text-xs text-emerald-600">Subido</span>
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
                const uploaded = solicitud.fotos.find(f => f.tipo === pt.key)
                return (
                  <div key={pt.key} className="space-y-1">
                    {uploaded ? (
                      <div className="relative">
                        <img
                          src={uploaded.url}
                          alt={pt.label}
                          className="w-full h-28 object-cover rounded-xl border border-emerald-200"
                        />
                      </div>
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

export default function DemoMisSolicitudesPage() {
  const solicitudes = DEMO_SOLICITUDES.filter(s => s.solicitante_id === PROPIETARIO_ID)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <ClipboardList size={24} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Revisa el estado de tus solicitudes y completa documentos pendientes
          </p>
        </div>
      </header>

      {solicitudes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
          <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium">No tienes solicitudes registradas</p>
          <p className="text-sm text-gray-400 mt-2">
            Puedes crear una nueva solicitud desde &quot;Solicitar Credito&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {solicitudes.map(sol => (
            <DemoSolicitudCard key={sol.id} solicitud={sol} />
          ))}
        </div>
      )}
    </div>
  )
}
