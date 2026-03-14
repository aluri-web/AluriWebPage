'use client'

import { useState, useTransition } from 'react'
import { MapPin, FileText, Camera, ChevronRight, ChevronLeft, Upload, X, CheckCircle, AlertTriangle, Loader2, User } from 'lucide-react'
import { submitCreditRequest } from './actions'
import { uploadFile, deleteFile } from '@/utils/uploadFile'

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
  { label: 'Solicitante', icon: User },
  { label: 'Documentos', icon: FileText },
  { label: 'Fotos', icon: Camera },
]

const SELECT_CLASS = 'w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
const INPUT_CLASS = 'w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

export default function SolicitarCreditoPage() {
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Step 0: Property fields
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [tieneHipoteca, setTieneHipoteca] = useState(false)
  const [aNombreSolicitante, setANombreSolicitante] = useState(true)
  const [montoRequerido, setMontoRequerido] = useState(0)
  const [valorInmueble, setValorInmueble] = useState(0)
  const [plazoMeses, setPlazoMeses] = useState(12)
  const [usoDinero, setUsoDinero] = useState('')

  // Step 1: Solicitante fields (common)
  const [rolDiligencia, setRolDiligencia] = useState<'deudor' | 'codeudor'>('deudor')
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('natural')

  // Step 1: Persona Natural
  const [nombreDeudor, setNombreDeudor] = useState('')
  const [tipoIngreso, setTipoIngreso] = useState('')

  // Step 1: Persona Juridica
  const [nombreEmpresa, setNombreEmpresa] = useState('')
  const [tipoSociedad, setTipoSociedad] = useState('')
  const [fechaConstitucion, setFechaConstitucion] = useState('')
  const [tamanoEmpresa, setTamanoEmpresa] = useState('')
  const [resultadoOperativo, setResultadoOperativo] = useState('')
  const [endeudamientoTotal, setEndeudamientoTotal] = useState('')
  const [coberturaDSCR, setCoberturaDSCR] = useState('')

  // Step 2 & 3 uploads
  const [documentos, setDocumentos] = useState<Record<string, string>>({})
  const [fotos, setFotos] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)

  const ltv = valorInmueble > 0 ? (montoRequerido / valorInmueble) * 100 : 0
  const ltvValid = ltv <= 60
  const step0Valid = direccion.trim() !== '' && ciudad.trim() !== '' && montoRequerido > 0 && valorInmueble > 0 && ltvValid

  const step1NaturalValid = nombreDeudor.trim() !== '' && tipoIngreso !== ''
  const step1JuridicaValid = nombreEmpresa.trim() !== '' && tipoSociedad !== '' && fechaConstitucion !== '' && tamanoEmpresa !== '' && resultadoOperativo !== '' && endeudamientoTotal !== '' && coberturaDSCR !== ''
  const step1Valid = tipoPersona === 'natural' ? step1NaturalValid : step1JuridicaValid

  const canAdvance = (fromStep: number) => {
    if (fromStep === 0) return step0Valid
    if (fromStep === 1) return step1Valid
    return true
  }

  const handleUpload = async (file: File, key: string, type: 'doc' | 'foto') => {
    setUploading(key)
    try {
      const result = await uploadFile(file, 'solicitudes')
      if (result.success && result.url) {
        if (type === 'doc') {
          setDocumentos(prev => ({ ...prev, [key]: result.url! }))
        } else {
          setFotos(prev => ({ ...prev, [key]: result.url! }))
        }
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
    const url = type === 'doc' ? documentos[key] : fotos[key]
    if (!url) return

    await deleteFile(url)

    if (type === 'doc') {
      setDocumentos(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      setFotos(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleSubmit = () => {
    setError('')
    startTransition(async () => {
      const docsArray = Object.entries(documentos).map(([tipo, url]) => ({ tipo, url }))
      const fotosArray = Object.entries(fotos).map(([tipo, url]) => ({ tipo, url }))

      const solicitante = tipoPersona === 'natural'
        ? {
            rol: rolDiligencia,
            tipo_persona: 'natural' as const,
            nombre: nombreDeudor,
            tipo_ingreso: tipoIngreso,
          }
        : {
            rol: rolDiligencia,
            tipo_persona: 'juridica' as const,
            nombre_empresa: nombreEmpresa,
            tipo_sociedad: tipoSociedad,
            fecha_constitucion: fechaConstitucion,
            tamano_empresa: tamanoEmpresa,
            resultado_operativo: resultadoOperativo,
            endeudamiento_total: endeudamientoTotal,
            cobertura_dscr: coberturaDSCR,
          }

      const result = await submitCreditRequest({
        direccion_inmueble: direccion,
        ciudad,
        tiene_hipoteca: tieneHipoteca,
        a_nombre_solicitante: aNombreSolicitante,
        monto_requerido: montoRequerido,
        valor_inmueble: valorInmueble,
        plazo_meses: plazoMeses,
        uso_dinero: usoDinero,
        solicitante,
        documentos: docsArray,
        fotos: fotosArray,
      })

      if (result.success) {
        setSubmitted(true)
      } else {
        setError(result.error || 'Error al enviar la solicitud.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <CheckCircle className="mx-auto mb-4 text-emerald-500" size={56} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
          <p className="text-gray-500">Tu solicitud de credito ha sido recibida. Nuestro equipo la revisara y te contactara pronto.</p>
        </div>
      </div>
    )
  }

  const lastStep = STEPS.length - 1

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
                onClick={() => { if (i <= step) setStep(i) }}
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Step 0: Property Info */}
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
                className={INPUT_CLASS}
                placeholder="Cra 10 #20-30, Barrio Centro"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Ciudad *</label>
              <input
                type="text"
                value={ciudad}
                onChange={e => setCiudad(e.target.value)}
                className={INPUT_CLASS}
                placeholder="Bogota"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Tiene hipoteca o embargo?</label>
              <select
                value={tieneHipoteca ? 'si' : 'no'}
                onChange={e => setTieneHipoteca(e.target.value === 'si')}
                className={SELECT_CLASS}
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
                className={SELECT_CLASS}
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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
                placeholder="150000000"
                min={0}
              />
              {montoRequerido > 0 && <p className="text-xs text-gray-500 mt-1">{formatCOP(montoRequerido)}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Plazo del prestamo *</label>
              <select
                value={plazoMeses}
                onChange={e => setPlazoMeses(Number(e.target.value))}
                className={SELECT_CLASS}
              >
                <option value={6}>6 meses</option>
                <option value={12}>12 meses (1 ano)</option>
                <option value={18}>18 meses</option>
                <option value={24}>24 meses (2 anos)</option>
                <option value={36}>36 meses (3 anos)</option>
                <option value={48}>48 meses (4 anos)</option>
                <option value={60}>60 meses (5 anos)</option>
              </select>
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
              className={`${INPUT_CLASS} min-h-[80px]`}
              placeholder="Describe para que necesitas el prestamo..."
            />
          </div>
        </div>
      )}

      {/* Step 1: Solicitante Info */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User size={20} className="text-emerald-500" /> Informacion del Solicitante
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Common questions */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">De quien va a diligenciar la informacion? *</label>
              <select value={rolDiligencia} onChange={e => setRolDiligencia(e.target.value as 'deudor' | 'codeudor')} className={SELECT_CLASS}>
                <option value="deudor">Deudor</option>
                <option value="codeudor">Codeudor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo de persona *</label>
              <select value={tipoPersona} onChange={e => setTipoPersona(e.target.value as 'natural' | 'juridica')} className={SELECT_CLASS}>
                <option value="natural">Natural</option>
                <option value="juridica">Juridica</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Persona Natural fields */}
          {tipoPersona === 'natural' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Persona Natural</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Nombre del {rolDiligencia} *</label>
                  <input
                    type="text"
                    value={nombreDeudor}
                    onChange={e => setNombreDeudor(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tipo de ingresos o vinculacion laboral *</label>
                  <select value={tipoIngreso} onChange={e => setTipoIngreso(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Seleccionar...</option>
                    <option value="pensionado">Pensionado</option>
                    <option value="independiente">Independiente</option>
                    <option value="asalariado">Asalariado</option>
                  </select>
                </div>

              </div>
            </div>
          )}

          {/* Persona Juridica fields */}
          {tipoPersona === 'juridica' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Persona Juridica</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Nombre de la empresa *</label>
                  <input
                    type="text"
                    value={nombreEmpresa}
                    onChange={e => setNombreEmpresa(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Razon social"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tipo de sociedad *</label>
                  <select value={tipoSociedad} onChange={e => setTipoSociedad(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Seleccionar...</option>
                    <option value="sas">SAS</option>
                    <option value="limitada">Limitada</option>
                    <option value="anonima">Anonima</option>
                    <option value="comandita_simple">Comandita Simple</option>
                    <option value="comandita_acciones">Comandita por Acciones</option>
                    <option value="unipersonal">Unipersonal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha de constitucion *</label>
                  <input
                    type="date"
                    value={fechaConstitucion}
                    onChange={e => setFechaConstitucion(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tamano de la empresa segun activos *</label>
                  <select value={tamanoEmpresa} onChange={e => setTamanoEmpresa(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Seleccionar...</option>
                    <option value="micro">Micro (Hasta 500 SMMLV)</option>
                    <option value="pequena">Pequena (Mas de 500 y hasta 5.000 SMMLV)</option>
                    <option value="mediana">Mediana (Mas de 5.000 y hasta 30.000 SMMLV)</option>
                    <option value="grande">Grande (Mas de 30.000 SMMLV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Resultado operativo ultimo ano *</label>
                  <select value={resultadoOperativo} onChange={e => setResultadoOperativo(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Seleccionar...</option>
                    <option value="negativo">Negativo</option>
                    <option value="0_50m">Entre 0 y 50 millones</option>
                    <option value="50_200m">Entre 50 y 200 millones</option>
                    <option value="200_1000m">Entre 200 y 1.000 millones</option>
                    <option value="mas_1000m">Mas de 1.000 millones</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Endeudamiento total (Pasivo / Activo) *</label>
                  <select value={endeudamientoTotal} onChange={e => setEndeudamientoTotal(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Seleccionar...</option>
                    <option value="menos_40">Menos de 40%</option>
                    <option value="40_60">Entre 40% y 60%</option>
                    <option value="60_75">Entre 60% y 75%</option>
                    <option value="mas_75">Mas del 75%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cobertura del Servicio de la Deuda (DSCR) *</label>
                  <select value={coberturaDSCR} onChange={e => setCoberturaDSCR(e.target.value)} className={SELECT_CLASS}>
                    <option value="">Seleccionar...</option>
                    <option value="gte_1_5">{'\u2265'} 1.5x</option>
                    <option value="1_2_1_49">1.2x - 1.49x</option>
                    <option value="1_0_1_19">1.0x - 1.19x</option>
                    <option value="lt_1_0">{'<'} 1.0x</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Documents */}
      {step === 2 && (
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
                  <p className="text-xs text-emerald-600 mt-1 truncate">Archivo subido</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {documentos[doc.key] ? (
                  <>
                    <CheckCircle size={18} className="text-emerald-500" />
                    <button
                      onClick={() => handleRemove(doc.key, 'doc')}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${uploading === doc.key ? 'bg-gray-200 text-gray-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                      {uploading === doc.key ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Subir
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploading === doc.key}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(file, doc.key, 'doc')
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 3 && (
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
                    <img
                      src={fotos[photo.key]}
                      alt={photo.label}
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() => handleRemove(photo.key, 'foto')}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-red-500 hover:bg-white transition-colors shadow-sm"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5">
                      <p className="text-xs text-white">{photo.label}</p>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className={`flex flex-col items-center justify-center h-40 transition-colors
                      ${uploading === photo.key ? 'text-gray-400' : 'text-gray-500 hover:bg-gray-100'}`}>
                      {uploading === photo.key ? (
                        <Loader2 size={24} className="animate-spin mb-2" />
                      ) : (
                        <Camera size={24} className="mb-2" />
                      )}
                      <p className="text-sm font-medium">{photo.label}</p>
                      <p className="text-xs text-gray-400 mt-1">Click para subir</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading === photo.key}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(file, photo.key, 'foto')
                        e.target.value = ''
                      }}
                    />
                  </label>
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

        {step < lastStep ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance(step)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${!canAdvance(step)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {isPending ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        )}
      </div>
    </div>
  )
}
