'use client'

import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { getCreditForEdit, updateCredit, searchDebtorByCedula, CreditForEdit } from './actions'

interface EditCreditModalProps {
  creditId: string
  isOpen: boolean
  onClose: () => void
}

export default function EditCreditModal({ creditId, isOpen, onClose }: EditCreditModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [credit, setCredit] = useState<CreditForEdit | null>(null)

  // Form fields
  const [montoSolicitado, setMontoSolicitado] = useState(0)
  const [tasaNominal, setTasaNominal] = useState(0)
  const [tasaEa, setTasaEa] = useState(0)
  const [plazo, setPlazo] = useState(0)
  const [comisionDeudor, setComisionDeudor] = useState(0)
  const [comisionAluri, setComisionAluri] = useState(0)
  const [tipoContrato, setTipoContrato] = useState('hipotecario')
  const [tipoAmortizacion, setTipoAmortizacion] = useState('francesa')
  const [tipoLiquidacion, setTipoLiquidacion] = useState('vencida')
  const [tipoPersona, setTipoPersona] = useState('natural')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [tipoInmueble, setTipoInmueble] = useState('')
  const [valorComercial, setValorComercial] = useState(0)
  const [ingresos, setIngresos] = useState(0)
  const [profesion, setProfesion] = useState('')
  const [clase, setClase] = useState('')

  // Debtor
  const [debtorCedula, setDebtorCedula] = useState('')
  const [debtorName, setDebtorName] = useState('')
  const [debtorId, setDebtorId] = useState('')
  const [searchingDebtor, setSearchingDebtor] = useState(false)

  // Co-debtor
  const [coDebtorCedula, setCoDebtorCedula] = useState('')
  const [coDebtorName, setCoDebtorName] = useState('')
  const [coDebtorId, setCoDebtorId] = useState<string | null>(null)
  const [searchingCoDebtor, setSearchingCoDebtor] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    getCreditForEdit(creditId).then(({ data, error: fetchError }) => {
      if (fetchError || !data) {
        setError(fetchError || 'No se pudo cargar el credito.')
        setLoading(false)
        return
      }
      setCredit(data)
      setMontoSolicitado(data.monto_solicitado)
      setTasaNominal(data.tasa_nominal)
      setTasaEa(data.tasa_interes_ea || 0)
      setPlazo(data.plazo)
      setComisionDeudor(data.comision_deudor || 0)
      setComisionAluri(data.comision_aluri_pct || 0)
      setTipoContrato(data.tipo_contrato || 'hipotecario')
      setTipoAmortizacion(data.tipo_amortizacion || 'francesa')
      setTipoLiquidacion(data.tipo_liquidacion || 'vencida')
      setTipoPersona(data.tipo_persona || 'natural')
      setDireccion(data.direccion_inmueble || '')
      setCiudad(data.ciudad_inmueble || '')
      setTipoInmueble(data.tipo_inmueble || '')
      setValorComercial(data.valor_comercial || 0)
      setIngresos(data.ingresos_mensuales || 0)
      setProfesion(data.profesion || '')
      setClase(data.clase || '')
      setDebtorId(data.cliente_id)
      setDebtorName(data.debtor_name || '')
      setDebtorCedula(data.debtor_cedula || '')
      setCoDebtorId(data.co_deudor_id)
      setCoDebtorName(data.co_debtor_name || '')
      setCoDebtorCedula(data.co_debtor_cedula || '')
      setLoading(false)
    })
  }, [isOpen, creditId])

  // Auto-calculate EA when NM changes
  useEffect(() => {
    if (tasaNominal > 0) {
      const nm = tasaNominal / 100
      const ea = (Math.pow(1 + nm, 12) - 1) * 100
      setTasaEa(Math.round(ea * 100) / 100)
    }
  }, [tasaNominal])

  const handleSearchDebtor = async () => {
    if (!debtorCedula || debtorCedula.length < 5) return
    setSearchingDebtor(true)
    const result = await searchDebtorByCedula(debtorCedula)
    if (result.found && result.id) {
      setDebtorId(result.id)
      setDebtorName(result.full_name || '')
    } else {
      setError('Deudor no encontrado con cedula: ' + debtorCedula)
    }
    setSearchingDebtor(false)
  }

  const handleSearchCoDebtor = async () => {
    if (!coDebtorCedula || coDebtorCedula.length < 5) return
    setSearchingCoDebtor(true)
    const result = await searchDebtorByCedula(coDebtorCedula)
    if (result.found && result.id) {
      setCoDebtorId(result.id)
      setCoDebtorName(result.full_name || '')
    } else {
      setError('Co-deudor no encontrado con cedula: ' + coDebtorCedula)
    }
    setSearchingCoDebtor(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const result = await updateCredit({
      id: creditId,
      monto_solicitado: montoSolicitado,
      tasa_nominal: tasaNominal,
      plazo,
      comision_deudor: comisionDeudor,
      comision_aluri_pct: comisionAluri,
      tipo_contrato: tipoContrato,
      tipo_amortizacion: tipoAmortizacion,
      tipo_liquidacion: tipoLiquidacion,
      tipo_persona: tipoPersona,
      direccion_inmueble: direccion,
      ciudad_inmueble: ciudad,
      tipo_inmueble: tipoInmueble,
      valor_comercial: valorComercial,
      ingresos_mensuales: ingresos,
      profesion,
      clase,
      cliente_id: debtorId,
      co_deudor_id: coDebtorId,
    })

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => onClose(), 1000)
    }
    setSaving(false)
  }

  if (!isOpen) return null

  const inputClass = 'w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1'
  const selectClass = 'w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            Editar Credito {credit?.codigo_credito || ''}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando datos del credito...</div>
        ) : success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">Credito actualizado exitosamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Deudor */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Deudor</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Cedula Deudor</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={debtorCedula}
                      onChange={(e) => setDebtorCedula(e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleSearchDebtor}
                      disabled={searchingDebtor}
                      className="px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Nombre Deudor</label>
                  <input type="text" value={debtorName} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                </div>
              </div>
            </div>

            {/* Co-Deudor */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">
                Co-Deudor
                {coDebtorId && (
                  <button
                    type="button"
                    onClick={() => { setCoDebtorId(null); setCoDebtorName(''); setCoDebtorCedula('') }}
                    className="ml-2 text-xs text-red-400 hover:text-red-300"
                  >
                    Quitar
                  </button>
                )}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Cedula Co-Deudor</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coDebtorCedula}
                      onChange={(e) => setCoDebtorCedula(e.target.value)}
                      className={inputClass}
                      placeholder="Opcional"
                    />
                    <button
                      type="button"
                      onClick={handleSearchCoDebtor}
                      disabled={searchingCoDebtor}
                      className="px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Nombre Co-Deudor</label>
                  <input type="text" value={coDebtorName} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                </div>
              </div>
            </div>

            {/* Financiero */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Informacion Financiera</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Monto Solicitado ($)</label>
                  <input type="number" value={montoSolicitado} onChange={(e) => setMontoSolicitado(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tasa Nominal Mensual (%)</label>
                  <input type="number" step="0.01" value={tasaNominal} onChange={(e) => setTasaNominal(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tasa EA (%)</label>
                  <input type="number" step="0.01" value={tasaEa} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
                </div>
                <div>
                  <label className={labelClass}>Plazo (meses)</label>
                  <input type="number" value={plazo} onChange={(e) => setPlazo(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Comision Deudor ($)</label>
                  <input type="number" value={comisionDeudor} onChange={(e) => setComisionDeudor(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Comision Aluri (%)</label>
                  <input type="number" step="0.01" value={comisionAluri} onChange={(e) => setComisionAluri(Number(e.target.value))} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Configuracion del Contrato */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Configuracion del Contrato</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Tipo de Contrato</label>
                  <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} className={selectClass}>
                    <option value="hipotecario">Hipotecario</option>
                    <option value="retroventa">Retroventa</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tipo de Credito</label>
                  <select value={tipoAmortizacion} onChange={(e) => setTipoAmortizacion(e.target.value)} className={selectClass}>
                    <option value="francesa">Capital e Intereses</option>
                    <option value="solo_interes">Solo Intereses</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tipo de Liquidacion</label>
                  <select value={tipoLiquidacion} onChange={(e) => setTipoLiquidacion(e.target.value)} className={selectClass}>
                    <option value="vencida">Vencida</option>
                    <option value="anticipada">Anticipada</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tipo de Persona</label>
                  <select value={tipoPersona} onChange={(e) => setTipoPersona(e.target.value)} className={selectClass}>
                    <option value="natural">Persona Natural</option>
                    <option value="juridica">Persona Juridica</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inmueble */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Informacion del Inmueble</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="col-span-2 md:col-span-2">
                  <label className={labelClass}>Direccion</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tipo de Inmueble</label>
                  <select value={tipoInmueble} onChange={(e) => setTipoInmueble(e.target.value)} className={selectClass}>
                    <option value="">Seleccionar</option>
                    <option value="casa">Casa</option>
                    <option value="apartamento">Apartamento</option>
                    <option value="lote">Lote</option>
                    <option value="local">Local Comercial</option>
                    <option value="oficina">Oficina</option>
                    <option value="bodega">Bodega</option>
                    <option value="finca">Finca</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Avaluo Comercial ($)</label>
                  <input type="number" value={valorComercial} onChange={(e) => setValorComercial(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>LTV (%)</label>
                  <input
                    type="text"
                    value={valorComercial > 0 ? (Math.round((montoSolicitado / valorComercial) * 10000) / 100).toFixed(1) + '%' : '-'}
                    disabled
                    className={`${inputClass} opacity-60 cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>

            {/* Perfil de Riesgo */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider border-b border-slate-700 pb-2">Perfil de Riesgo</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Ingresos Mensuales ($)</label>
                  <input type="number" value={ingresos} onChange={(e) => setIngresos(Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Profesion</label>
                  <input type="text" value={profesion} onChange={(e) => setProfesion(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Analisis de Garantia</label>
                  <input type="text" value={clase} onChange={(e) => setClase(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-black font-semibold rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
