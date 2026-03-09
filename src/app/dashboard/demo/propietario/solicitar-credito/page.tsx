'use client'

import { useState } from 'react'
import { MapPin, FileText, Camera, ChevronRight, ChevronLeft, Upload, CheckCircle, AlertTriangle, Info } from 'lucide-react'

const DOCUMENT_TYPES = [
  { key: 'libertad_tradicion', label: 'Certificado de Libertad y Tradicion' },
  { key: 'escritura', label: 'Escritura de adquisicion del inmueble' },
  { key: 'cedula', label: 'Cedula de ciudadania (ambos lados)' },
  { key: 'extractos', label: 'Ultimos 3 extractos bancarios' },
  { key: 'declaracion_renta', label: 'Declaracion de renta o certificado laboral/de ingresos' },
]

const PHOTO_TYPES = [
  { key: 'fachada', label: 'Fachada exterior' },
  { key: 'sala', label: 'Sala / Comedor' },
  { key: 'cocina', label: 'Cocina' },
  { key: 'habitaciones', label: 'Habitaciones' },
  { key: 'banos', label: 'Banos' },
]

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

const STEPS = [
  { label: 'Datos del Inmueble', icon: MapPin },
  { label: 'Documentos', icon: FileText },
  { label: 'Fotos', icon: Camera },
]

export default function DemoSolicitarCreditoPage() {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [demoMessage, setDemoMessage] = useState('')

  // Step 1 fields
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [tieneHipoteca, setTieneHipoteca] = useState(false)
  const [aNombreSolicitante, setANombreSolicitante] = useState(true)
  const [montoRequerido, setMontoRequerido] = useState(0)
  const [valorInmueble, setValorInmueble] = useState(0)
  const [usoDinero, setUsoDinero] = useState('')

  // Step 2 & 3 - simulated uploads
  const [documentos, setDocumentos] = useState<Record<string, boolean>>({})
  const [fotos, setFotos] = useState<Record<string, boolean>>({})

  const ltv = valorInmueble > 0 ? (montoRequerido / valorInmueble) * 100 : 0
  const ltvValid = ltv <= 60
  const step1Valid = direccion.trim() !== '' && ciudad.trim() !== '' && montoRequerido > 0 && valorInmueble > 0 && ltvValid

  const handleSimulatedUpload = (key: string, type: 'doc' | 'foto') => {
    setDemoMessage('Upload simulado en modo demo')
    setTimeout(() => setDemoMessage(''), 2000)
    if (type === 'doc') {
      setDocumentos(prev => ({ ...prev, [key]: true }))
    } else {
      setFotos(prev => ({ ...prev, [key]: true }))
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <CheckCircle className="mx-auto mb-4 text-emerald-500" size={56} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitud enviada (Demo)</h2>
          <p className="text-gray-500">Esta es una simulacion. En el modo real, tu solicitud de credito seria recibida y revisada por nuestro equipo.</p>
          <button
            onClick={() => {
              setSubmitted(false)
              setStep(0)
              setDireccion('')
              setCiudad('')
              setTieneHipoteca(false)
              setANombreSolicitante(true)
              setMontoRequerido(0)
              setValorInmueble(0)
              setUsoDinero('')
              setDocumentos({})
              setFotos({})
            }}
            className="mt-6 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Crear otra solicitud
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Solicitar Credito</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => { if (i < step || (i === 1 && step1Valid) || (i === 2 && step1Valid)) setStep(i) }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full
                  ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isDone ? 'bg-gray-100 text-emerald-600' : 'bg-white text-gray-400 border border-gray-200'}`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-gray-300 shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* Demo message toast */}
      {demoMessage && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <Info size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-amber-600 text-sm">{demoMessage}</p>
        </div>
      )}

      {/* Step 1: Property Info */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-500" /> Datos del Inmueble
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Direccion del inmueble *</label>
              <input
                type="text"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Cra 10 #20-30, Barrio Centro"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Ciudad *</label>
              <input
                type="text"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Bogota"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Tiene hipoteca o embargo?</label>
              <select
                value={tieneHipoteca ? 'si' : 'no'}
                onChange={e => setTieneHipoteca(e.target.value === 'si')}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Esta a nombre del solicitante?</label>
              <select
                value={aNombreSolicitante ? 'si' : 'no'}
                onChange={e => setANombreSolicitante(e.target.value === 'si')}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Valor aproximado del inmueble *</label>
              <input
                type="number"
                value={valorInmueble || ''}
                onChange={e => setValorInmueble(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="300000000"
                min={0}
              />
              {valorInmueble > 0 && <p className="text-xs text-gray-500 mt-1">{formatCOP(valorInmueble)}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Monto requerido *</label>
              <input
                type="number"
                value={montoRequerido || ''}
                onChange={e => setMontoRequerido(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="150000000"
                min={0}
              />
              {montoRequerido > 0 && <p className="text-xs text-gray-500 mt-1">{formatCOP(montoRequerido)}</p>}
            </div>
          </div>

          {/* LTV indicator */}
          {valorInmueble > 0 && montoRequerido > 0 && (
            <div className={`p-3 rounded-lg border ${ltvValid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-medium ${ltvValid ? 'text-emerald-700' : 'text-red-600'}`}>
                LTV: {ltv.toFixed(1)}% {ltvValid ? '(Aprobado - maximo 60%)' : '(Excede el 60% del valor del inmueble)'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">Uso del dinero del prestamo</label>
            <textarea
              value={usoDinero}
              onChange={e => setUsoDinero(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[80px]"
              placeholder="Describe para que necesitas el prestamo..."
            />
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-emerald-500" /> Documentos
          </h2>
          <p className="text-sm text-gray-500">Sube los siguientes documentos. Esta seccion es opcional, puedes enviarlos despues.</p>

          {DOCUMENT_TYPES.map(doc => (
            <div key={doc.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm text-gray-900 font-medium">{doc.label}</p>
                {documentos[doc.key] && (
                  <p className="text-xs text-emerald-600 mt-1 truncate">Archivo simulado</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {documentos[doc.key] ? (
                  <CheckCircle size={18} className="text-emerald-500" />
                ) : (
                  <button
                    onClick={() => handleSimulatedUpload(doc.key, 'doc')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Upload size={14} />
                    Subir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Camera size={20} className="text-emerald-500" /> Fotos del Inmueble
          </h2>
          <p className="text-sm text-gray-500">Sube fotos del inmueble. Esta seccion es opcional.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PHOTO_TYPES.map(photo => (
              <div key={photo.key} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                {fotos[photo.key] ? (
                  <div className="relative">
                    <div className="w-full h-40 bg-emerald-50 flex items-center justify-center">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5">
                      <p className="text-xs text-white">{photo.label} (simulado)</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSimulatedUpload(photo.key, 'foto')}
                    className="w-full block"
                  >
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 hover:bg-gray-100 transition-colors">
                      <Camera size={24} className="mb-2" />
                      <p className="text-sm font-medium">{photo.label}</p>
                      <p className="text-xs text-gray-400 mt-1">Click para simular subida</p>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${step === 0 ? 'text-gray-300 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && !step1Valid}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${step === 0 && !step1Valid
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle size={16} />
            Enviar Solicitud
          </button>
        )}
      </div>
    </div>
  )
}
