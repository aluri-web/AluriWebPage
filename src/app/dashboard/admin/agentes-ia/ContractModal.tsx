'use client'

import { useState, useEffect } from 'react'
import { X, FileText, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface ContractModalProps {
  evaluationId: string
  applicantName: string
  onClose: () => void
}

interface FormData {
  vendedor_razon_social: string
  vendedor_nit: string
  vendedor_ciudad_domicilio: string
  vendedor_representante_nombre: string
  vendedor_representante_cedula: string
  tenedor_nombre: string
  tenedor_cedula: string
  tenedor_ciudad: string
  escritura_numero: string
  escritura_notaria: string
  escritura_circulo: string
  escritura_fecha: string
  porcentaje_pago_inicial: number
}

interface PrefillData {
  comprador_nombre: string
  comprador_cedula: string
  codeudor_nombre: string
  codeudor_cedula: string
  ciudad: string
  tipo_garantia: string
  valor_inmueble: number
  monto_prestamo: number
  folio: string
  propietario_actual: string
  verdict: string | null
}

function formatCOP(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
}

export default function ContractModal({ evaluationId, applicantName, onClose }: ContractModalProps) {
  const [form, setForm] = useState<FormData>({
    vendedor_razon_social: '',
    vendedor_nit: '',
    vendedor_ciudad_domicilio: 'Barranquilla',
    vendedor_representante_nombre: '',
    vendedor_representante_cedula: '',
    tenedor_nombre: '',
    tenedor_cedula: '',
    tenedor_ciudad: '',
    escritura_numero: '',
    escritura_notaria: '',
    escritura_circulo: '',
    escritura_fecha: '',
    porcentaje_pago_inicial: 20,
  })
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; docx_url?: string; message?: string } | null>(null)

  // Load prefill data from evaluation
  useEffect(() => {
    fetch(`/api/contracts/prefill?id=${evaluationId}`)
      .then(res => res.ok ? res.json() : null)
      .then((data: PrefillData | null) => {
        if (data) {
          setPrefill(data)
          setForm(prev => ({
            ...prev,
            tenedor_ciudad: data.ciudad || prev.tenedor_ciudad,
            escritura_circulo: data.ciudad || prev.escritura_circulo,
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [evaluationId])

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'porcentaje_pago_inicial' ? Number(e.target.value) : e.target.value
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const canSubmit =
    form.vendedor_razon_social &&
    form.vendedor_nit &&
    form.vendedor_representante_nombre &&
    form.vendedor_representante_cedula &&
    form.tenedor_nombre &&
    form.tenedor_cedula &&
    form.tenedor_ciudad

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)

    try {
      const res = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: evaluationId,
          ...form,
        }),
      })

      if (!res.ok) {
        let errMsg = `Error ${res.status}`
        try {
          const errData = await res.json()
          errMsg = errData.error || errData.detail || errMsg
        } catch {
          errMsg = await res.text().catch(() => errMsg)
        }
        setResult({ success: false, message: errMsg })
        return
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ success: false, message: `Error de conexion: ${err instanceof Error ? err.message : err}` })
    } finally {
      setGenerating(false)
    }
  }

  const pagoInicial = prefill ? prefill.valor_inmueble * (form.porcentaje_pago_inicial / 100) : 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-teal-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Generar Pagare</h2>
              <p className="text-xs text-slate-400">
                {prefill?.comprador_nombre || applicantName} &middot; Evaluacion {evaluationId.substring(0, 8)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            Cargando datos de la evaluacion...
          </div>
        ) : (
          <>
            {/* Evaluation data summary */}
            {prefill && (
              <div className="mx-5 mt-5 p-4 bg-slate-900/60 border border-slate-700 rounded-xl space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Datos de la evaluacion</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <InfoRow label="Comprador" value={prefill.comprador_nombre} />
                  <InfoRow label="Cedula" value={prefill.comprador_cedula} />
                  {prefill.codeudor_nombre && (
                    <>
                      <InfoRow label="Codeudor" value={prefill.codeudor_nombre} />
                      <InfoRow label="Cedula codeudor" value={prefill.codeudor_cedula} />
                    </>
                  )}
                  <InfoRow label="Ciudad" value={prefill.ciudad} />
                  <InfoRow label="Folio" value={prefill.folio} />
                  <InfoRow label="Valor inmueble" value={formatCOP(prefill.valor_inmueble)} />
                  <InfoRow label="Monto prestamo" value={formatCOP(prefill.monto_prestamo)} />
                  <InfoRow label="Garantia" value={prefill.tipo_garantia} />
                  <InfoRow label="Propietario" value={prefill.propietario_actual} />
                </div>
                {pagoInicial > 0 && (
                  <div className="pt-2 border-t border-slate-700 text-sm">
                    <InfoRow label={`Pago inicial (${form.porcentaje_pago_inicial}%)`} value={formatCOP(pagoInicial)} highlight />
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <div className="p-5 space-y-5">
              {/* Vendedor / SAS */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Vendedor (SAS)
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Razon social" value={form.vendedor_razon_social} onChange={set('vendedor_razon_social')} placeholder="Aluri Inversiones S.A.S." />
                  <Field label="NIT" value={form.vendedor_nit} onChange={set('vendedor_nit')} placeholder="901.234.567-8" />
                  <Field label="Representante legal" value={form.vendedor_representante_nombre} onChange={set('vendedor_representante_nombre')} />
                  <Field label="Cedula representante" value={form.vendedor_representante_cedula} onChange={set('vendedor_representante_cedula')} />
                  <Field label="Ciudad domicilio" value={form.vendedor_ciudad_domicilio} onChange={set('vendedor_ciudad_domicilio')} />
                </div>
              </fieldset>

              {/* Tenedor / Inversionista */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Tenedor / Inversionista
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre completo" value={form.tenedor_nombre} onChange={set('tenedor_nombre')} />
                  <Field label="Cedula" value={form.tenedor_cedula} onChange={set('tenedor_cedula')} />
                  <Field label="Ciudad (lugar de pago)" value={form.tenedor_ciudad} onChange={set('tenedor_ciudad')} />
                </div>
              </fieldset>

              {/* Escritura (opcional) */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Escritura <span className="text-slate-500 normal-case">(opcional — dejar vacio si aun no existe)</span>
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Numero escritura" value={form.escritura_numero} onChange={set('escritura_numero')} placeholder="1234" />
                  <Field label="Notaria" value={form.escritura_notaria} onChange={set('escritura_notaria')} placeholder="Tercera" />
                  <Field label="Circulo" value={form.escritura_circulo} onChange={set('escritura_circulo')} />
                  <Field label="Fecha" value={form.escritura_fecha} onChange={set('escritura_fecha')} placeholder="15 de marzo de 2025" />
                </div>
              </fieldset>

              {/* Porcentaje */}
              <fieldset>
                <legend className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Condiciones
                </legend>
                <div className="w-48">
                  <Field
                    label="% pago inicial"
                    value={String(form.porcentaje_pago_inicial)}
                    onChange={set('porcentaje_pago_inicial')}
                    type="number"
                  />
                </div>
              </fieldset>
            </div>

            {/* Result */}
            {result && (
              <div className={`mx-5 mb-4 p-4 rounded-xl border ${
                result.success
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                {result.success ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <CheckCircle size={16} />
                      Pagare generado exitosamente
                    </div>
                    {result.docx_url && (
                      <a
                        href={result.docx_url}
                        download="pagare.docx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors text-sm"
                      >
                        <Download size={14} />
                        Descargar DOCX
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {result.message}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canSubmit || generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-600 disabled:text-slate-400 text-black font-semibold rounded-xl transition-colors text-sm"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Generar Pagare
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-slate-500 text-xs">{label}:</span>
      <span className={`text-xs ${highlight ? 'text-teal-400 font-semibold' : 'text-white'}`}>{value || '—'}</span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors"
      />
    </div>
  )
}
