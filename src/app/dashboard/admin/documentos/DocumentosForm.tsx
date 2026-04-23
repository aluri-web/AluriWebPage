'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  FileDown,
  FileText,
  Eraser,
  Upload,
  Users,
  UserPlus,
  Banknote,
  Home,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import {
  DeudorForm,
  CodeudorForm,
  AcreedorForm,
  InmuebleForm,
  PrestamoForm,
  TipoContrato,
  ChecklistPayload,
  ESTADOS_CIVILES,
  MAX_ACREEDORES,
  MAX_CODEUDORES,
  MAX_DEUDORES,
  emptyAcreedor,
  emptyCodeudor,
  emptyDeudor,
  emptyInmueble,
  emptyPrestamo,
} from '@/lib/documentos/types'

type ToastKind = 'success' | 'error' | 'info'
interface ToastState {
  msg: string
  kind: ToastKind
}

function formatearMonto(valor: string): string {
  const soloDigitos = valor.replace(/[^0-9]/g, '')
  if (!soloDigitos) return ''
  return parseInt(soloDigitos, 10).toLocaleString('es-CO').replace(/,/g, '.')
}

function montoANumero(valor: string): number {
  const soloDigitos = (valor || '').replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '')
  return soloDigitos ? parseInt(soloDigitos, 10) : 0
}

export default function DocumentosForm() {
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>('')
  const [deudores, setDeudores] = useState<DeudorForm[]>([emptyDeudor()])
  const [codeudores, setCodeudores] = useState<CodeudorForm[]>([])
  const [acreedores, setAcreedores] = useState<AcreedorForm[]>([emptyAcreedor(), emptyAcreedor()])
  const [mostrarInmueble, setMostrarInmueble] = useState(false)
  const [inmueble, setInmueble] = useState<InmuebleForm>(emptyInmueble())
  const [mostrarPrestamo, setMostrarPrestamo] = useState(false)
  const [prestamo, setPrestamo] = useState<PrestamoForm>(emptyPrestamo())
  const [toast, setToast] = useState<ToastState | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── Derivados ───────────────────────────────────────────────
  const montoTotalDeudores = useMemo(
    () => deudores.reduce((acc, d) => acc + montoANumero(d.participacion_monto), 0),
    [deudores]
  )

  const deudoresConPct = useMemo(() => {
    const total = montoTotalDeudores
    return deudores.map((d) => {
      const monto = montoANumero(d.participacion_monto)
      let pct = ''
      if (deudores.length === 1 && monto > 0) pct = '100%'
      else if (total > 0 && monto > 0) pct = `${Math.round((monto / total) * 100)}%`
      return { ...d, participacion_porcentaje: pct }
    })
  }, [deudores, montoTotalDeudores])

  const acreedoresConPct = useMemo(() => {
    return acreedores.map((a) => {
      const monto = montoANumero(a.participacion_monto)
      let pct = ''
      if (montoTotalDeudores > 0 && monto > 0) {
        pct = `${Math.round((monto / montoTotalDeudores) * 100)}%`
      }
      return { ...a, participacion_porcentaje: pct }
    })
  }, [acreedores, montoTotalDeudores])

  const comisionAluri = useMemo(() => {
    if (montoTotalDeudores <= 0) return ''
    const c = Math.round(montoTotalDeudores * 0.05)
    return c.toLocaleString('es-CO').replace(/,/g, '.')
  }, [montoTotalDeudores])

  const montoPrestamoFmt = useMemo(() => {
    if (montoTotalDeudores <= 0) return ''
    return montoTotalDeudores.toLocaleString('es-CO').replace(/,/g, '.')
  }, [montoTotalDeudores])

  // ── Handlers ────────────────────────────────────────────────
  const mostrarToast = (msg: string, kind: ToastKind = 'info') => {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), 4000)
  }

  const agregarDeudor = () => {
    if (deudores.length >= MAX_DEUDORES) {
      mostrarToast(`Maximo ${MAX_DEUDORES} deudores permitidos`, 'error')
      return
    }
    setDeudores([...deudores, emptyDeudor()])
  }
  const quitarDeudor = (i: number) => setDeudores(deudores.filter((_, idx) => idx !== i))
  const updateDeudor = (i: number, field: keyof DeudorForm, value: string) => {
    const next = [...deudores]
    next[i] = { ...next[i], [field]: value }
    setDeudores(next)
  }

  const agregarCodeudor = () => {
    if (codeudores.length >= MAX_CODEUDORES) {
      mostrarToast(`Maximo ${MAX_CODEUDORES} codeudores permitidos`, 'error')
      return
    }
    setCodeudores([...codeudores, emptyCodeudor()])
  }
  const quitarCodeudor = (i: number) => setCodeudores(codeudores.filter((_, idx) => idx !== i))
  const updateCodeudor = (i: number, field: keyof CodeudorForm, value: string) => {
    const next = [...codeudores]
    next[i] = { ...next[i], [field]: value }
    setCodeudores(next)
  }

  const agregarAcreedor = () => {
    if (acreedores.length >= MAX_ACREEDORES) {
      mostrarToast(`Maximo ${MAX_ACREEDORES} acreedores permitidos`, 'error')
      return
    }
    setAcreedores([...acreedores, emptyAcreedor()])
  }
  const quitarAcreedor = (i: number) => setAcreedores(acreedores.filter((_, idx) => idx !== i))
  const updateAcreedor = (i: number, field: keyof AcreedorForm, value: string) => {
    const next = [...acreedores]
    next[i] = { ...next[i], [field]: value }
    setAcreedores(next)
  }

  // ── Acciones ────────────────────────────────────────────────
  const limpiar = () => {
    if (!window.confirm('Se borraran todos los datos del formulario. Continuar?')) return
    setTipoContrato('')
    setDeudores([emptyDeudor()])
    setCodeudores([])
    setAcreedores([emptyAcreedor(), emptyAcreedor()])
    setInmueble(emptyInmueble())
    setMostrarInmueble(false)
    setPrestamo(emptyPrestamo())
    setMostrarPrestamo(false)
    mostrarToast('Formulario limpiado', 'info')
  }

  const recopilar = (): ChecklistPayload => ({
    tipo_contrato: tipoContrato,
    deudores: deudoresConPct,
    codeudores,
    acreedores: acreedoresConPct,
    inmueble,
    prestamo: {
      ...prestamo,
      monto: montoPrestamoFmt,
      comision_aluri: comisionAluri,
    },
    fecha_creacion: new Date().toISOString(),
  })

  const validarBasico = (): string | null => {
    const d1 = deudores[0]
    if (!d1 || !d1.nombre.trim()) return 'Ingrese al menos el nombre del deudor principal'
    if (!d1.cc.trim()) return 'Cedula del deudor principal'
    const a1 = acreedores[0]
    if (!a1 || !a1.nombre.trim()) return 'Nombre del acreedor 1'
    if (!a1.cc.trim()) return 'Cedula del acreedor 1'
    if (!montoPrestamoFmt) return 'Monto del prestamo (se calcula automaticamente desde los deudores)'
    if (!prestamo.plazo_meses) return 'Plazo en meses'
    if (!prestamo.tasa_mensual) return 'Tasa mensual'
    return null
  }

  const generar = async (formato: 'docx' | 'pdf') => {
    const err = validarBasico()
    if (err) {
      mostrarToast(err, 'error')
      return
    }
    setBusy(true)
    try {
      const datos = recopilar()
      // TODO Fase 3-5: POST a /api/documentos/generar-contrato o /generar-pdf
      console.log(`[Fase 2 placeholder] Generar ${formato}:`, datos)
      mostrarToast(`Payload listo (${formato.toUpperCase()}) — API llegara en Fase 3-5`, 'info')
    } catch (e) {
      mostrarToast(`Error: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const cargarChecklist = () => {
    fileInputRef.current?.click()
  }

  const onArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('archivo', file)
      const res = await fetch('/api/documentos/cargar-checklist', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        mostrarToast(`Error: ${data.error || 'No se pudo procesar el checklist'}`, 'error')
        return
      }

      const d = data.datos
      setTipoContrato((d.tipo_contrato || '') as TipoContrato)

      const deudoresParsed: DeudorForm[] =
        Array.isArray(d.deudores) && d.deudores.length > 0 ? d.deudores : [emptyDeudor()]
      setDeudores(deudoresParsed)

      setCodeudores(Array.isArray(d.codeudores) ? d.codeudores : [])

      const acreedoresParsed: AcreedorForm[] =
        Array.isArray(d.acreedores) && d.acreedores.length > 0
          ? d.acreedores
          : [emptyAcreedor(), emptyAcreedor()]
      setAcreedores(acreedoresParsed)

      const inm = d.inmueble || {}
      if (
        inm.matricula_inmobiliaria ||
        inm.cedula_catastral ||
        inm.chip ||
        inm.direccion ||
        inm.descripcion ||
        inm.linderos
      ) {
        setInmueble({
          matricula_inmobiliaria: inm.matricula_inmobiliaria || '',
          cedula_catastral: inm.cedula_catastral || '',
          chip: inm.chip || '',
          direccion: inm.direccion || '',
          descripcion: inm.descripcion || '',
          linderos: inm.linderos || '',
        })
        setMostrarInmueble(true)
      }

      const p = d.prestamo || {}
      if (
        p.plazo_meses ||
        p.tasa_mensual ||
        p.cuota_mensual ||
        p.forma_pago ||
        p.observaciones ||
        p.monto
      ) {
        setPrestamo({
          monto: p.monto || '',
          plazo_meses: p.plazo_meses || '',
          tasa_mensual: p.tasa_mensual || '',
          cuota_mensual: p.cuota_mensual || '',
          forma_pago: (p.forma_pago || '') as PrestamoForm['forma_pago'],
          comision_aluri: p.comision_aluri || '',
          observaciones: p.observaciones || '',
        })
        setMostrarPrestamo(true)
      }

      mostrarToast('Check List cargado exitosamente', 'success')
    } catch (err) {
      mostrarToast(
        `Error de conexion: ${err instanceof Error ? err.message : String(err)}`,
        'error'
      )
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-32">
      {/* Tipo contrato */}
      <Seccion titulo="Tipo de contrato" icon={FileText}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Tipo de contrato" requerido>
            <select
              value={tipoContrato}
              onChange={(e) => setTipoContrato(e.target.value as TipoContrato)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="">Seleccionar...</option>
              <option value="Hipoteca">Hipoteca</option>
              <option value="Compraventa con Pacto de Retroventa">
                Compraventa con Pacto de Retroventa
              </option>
            </select>
          </Campo>
        </div>
      </Seccion>

      {/* Deudores */}
      <Seccion
        titulo="Informacion del(los) deudor(es)"
        badge="OBLIGATORIO"
        badgeColor="amber"
        icon={Users}
      >
        <div className="space-y-4">
          {deudoresConPct.map((d, i) => (
            <PersonaCard
              key={`deudor-${i}`}
              titulo={i === 0 ? 'Deudor principal' : `Deudor ${i + 1}`}
              onRemove={i === 0 && deudores.length === 1 ? undefined : () => quitarDeudor(i)}
            >
              <PersonaCamposBasicos
                idPrefix={`deudor-${i}`}
                persona={d}
                onChange={(field, val) => updateDeudor(i, field as keyof DeudorForm, val)}
              />
              <Campo label="Participacion $">
                <input
                  type="text"
                  value={d.participacion_monto}
                  onChange={(e) => updateDeudor(i, 'participacion_monto', formatearMonto(e.target.value))}
                  placeholder="180.000.000"
                  className={inputCls}
                />
              </Campo>
              <Campo label="Participacion %">
                <input
                  type="text"
                  value={d.participacion_porcentaje}
                  readOnly
                  className={`${inputCls} bg-slate-900/50`}
                />
              </Campo>
            </PersonaCard>
          ))}
          <BotonAgregar onClick={agregarDeudor} disabled={deudores.length >= MAX_DEUDORES}>
            Agregar deudor
          </BotonAgregar>
        </div>
      </Seccion>

      {/* Codeudores */}
      <Seccion
        titulo="Codeudores"
        badge="OPCIONAL"
        badgeColor="slate"
        icon={UserPlus}
      >
        <div className="space-y-4">
          {codeudores.map((c, i) => (
            <PersonaCard
              key={`codeudor-${i}`}
              titulo={`Codeudor ${i + 1}`}
              onRemove={() => quitarCodeudor(i)}
            >
              <PersonaCamposBasicos
                idPrefix={`codeudor-${i}`}
                persona={c}
                onChange={(field, val) => updateCodeudor(i, field as keyof CodeudorForm, val)}
              />
            </PersonaCard>
          ))}
          <BotonAgregar onClick={agregarCodeudor} disabled={codeudores.length >= MAX_CODEUDORES}>
            Agregar codeudor
          </BotonAgregar>
        </div>
      </Seccion>

      {/* Acreedores */}
      <Seccion
        titulo="Informacion de acreedores"
        badge="OBLIGATORIO"
        badgeColor="amber"
        icon={Banknote}
      >
        <div className="space-y-4">
          {acreedoresConPct.map((a, i) => (
            <PersonaCard
              key={`acreedor-${i}`}
              titulo={`Acreedor ${i + 1}`}
              onRemove={() => quitarAcreedor(i)}
            >
              <PersonaCamposBasicos
                idPrefix={`acreedor-${i}`}
                persona={a}
                onChange={(field, val) => updateAcreedor(i, field as keyof AcreedorForm, val)}
              />
              <Campo label="Participacion $">
                <input
                  type="text"
                  value={a.participacion_monto}
                  onChange={(e) => updateAcreedor(i, 'participacion_monto', formatearMonto(e.target.value))}
                  placeholder="90.000.000"
                  className={inputCls}
                />
              </Campo>
              <Campo label="Participacion %">
                <input
                  type="text"
                  value={a.participacion_porcentaje}
                  readOnly
                  className={`${inputCls} bg-slate-900/50`}
                />
              </Campo>
              <Campo label="Cuenta bancaria" full>
                <input
                  type="text"
                  value={a.cuenta_bancaria}
                  onChange={(e) => updateAcreedor(i, 'cuenta_bancaria', e.target.value)}
                  placeholder="Cuenta de ahorros No. XXXXX de Bancolombia"
                  className={inputCls}
                />
              </Campo>
            </PersonaCard>
          ))}
          <BotonAgregar onClick={agregarAcreedor} disabled={acreedores.length >= MAX_ACREEDORES}>
            Agregar acreedor
          </BotonAgregar>
        </div>
      </Seccion>

      {/* Inmueble */}
      <Seccion
        titulo="Informacion del inmueble"
        badge="OBLIGATORIO"
        badgeColor="amber"
        icon={Home}
        collapsible
        isOpen={mostrarInmueble}
        onToggle={() => setMostrarInmueble(!mostrarInmueble)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="No. matricula inmobiliaria" requerido>
            <input
              type="text"
              value={inmueble.matricula_inmobiliaria}
              onChange={(e) => setInmueble({ ...inmueble, matricula_inmobiliaria: e.target.value })}
              placeholder="50S-XXXXXX"
              className={inputCls}
            />
          </Campo>
          <Campo label="Cedula catastral">
            <input
              type="text"
              value={inmueble.cedula_catastral}
              onChange={(e) => setInmueble({ ...inmueble, cedula_catastral: e.target.value })}
              placeholder="BS 23S 61 44 2"
              className={inputCls}
            />
          </Campo>
          <Campo label="Codigo CHIP">
            <input
              type="text"
              value={inmueble.chip}
              onChange={(e) => setInmueble({ ...inmueble, chip: e.target.value })}
              placeholder="AAA0000XXXX"
              className={inputCls}
            />
          </Campo>
          <Campo label="Direccion del inmueble" full requerido>
            <input
              type="text"
              value={inmueble.direccion}
              onChange={(e) => setInmueble({ ...inmueble, direccion: e.target.value })}
              placeholder="Direccion completa del inmueble"
              className={inputCls}
            />
          </Campo>
          <Campo label="Descripcion del inmueble" full>
            <textarea
              value={inmueble.descripcion}
              onChange={(e) => setInmueble({ ...inmueble, descripcion: e.target.value })}
              rows={4}
              placeholder="Area, numero de pisos, distribucion, etc."
              className={inputCls}
            />
          </Campo>
          <Campo label="Linderos" full>
            <textarea
              value={inmueble.linderos}
              onChange={(e) => setInmueble({ ...inmueble, linderos: e.target.value })}
              rows={4}
              placeholder="Linderos del inmueble segun escritura"
              className={inputCls}
            />
          </Campo>
        </div>
      </Seccion>

      {/* Prestamo */}
      <Seccion
        titulo="Condiciones del prestamo"
        badge="OBLIGATORIO"
        badgeColor="amber"
        icon={Banknote}
        collapsible
        isOpen={mostrarPrestamo}
        onToggle={() => setMostrarPrestamo(!mostrarPrestamo)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Monto del prestamo (suma de deudores)" requerido>
            <input
              type="text"
              value={montoPrestamoFmt}
              readOnly
              placeholder="180.000.000"
              className={`${inputCls} bg-slate-900/50`}
            />
          </Campo>
          <Campo label="Plazo (meses)" requerido>
            <input
              type="number"
              value={prestamo.plazo_meses}
              onChange={(e) => setPrestamo({ ...prestamo, plazo_meses: e.target.value })}
              min={1}
              max={360}
              placeholder="60"
              className={inputCls}
            />
          </Campo>
          <Campo label="Tasa mensual anticipada" requerido>
            <input
              type="text"
              value={prestamo.tasa_mensual}
              onChange={(e) => setPrestamo({ ...prestamo, tasa_mensual: e.target.value })}
              placeholder="1.80%"
              className={inputCls}
            />
          </Campo>
          <Campo label="Valor cuota mensual">
            <input
              type="text"
              value={prestamo.cuota_mensual}
              onChange={(e) => setPrestamo({ ...prestamo, cuota_mensual: formatearMonto(e.target.value) })}
              placeholder="3.240.000"
              className={inputCls}
            />
          </Campo>
          <Campo label="Forma de pago" requerido>
            <select
              value={prestamo.forma_pago}
              onChange={(e) => setPrestamo({ ...prestamo, forma_pago: e.target.value as PrestamoForm['forma_pago'] })}
              className={inputCls}
            >
              <option value="">Seleccionar...</option>
              <option value="Solo intereses">Solo intereses</option>
              <option value="Interes y capital">Interes y capital</option>
            </select>
          </Campo>
          <Campo label="Comision Aluri (5% del monto)">
            <input
              type="text"
              value={comisionAluri}
              readOnly
              placeholder="9.000.000"
              className={`${inputCls} bg-slate-900/50`}
            />
          </Campo>
          <Campo label="Observaciones" full>
            <textarea
              value={prestamo.observaciones}
              onChange={(e) => setPrestamo({ ...prestamo, observaciones: e.target.value })}
              rows={3}
              placeholder="Condiciones especiales, notas adicionales..."
              className={inputCls}
            />
          </Campo>
        </div>
      </Seccion>

      {/* Barra de acciones fija */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-slate-900/95 border-t border-slate-700 backdrop-blur-sm p-4 z-10">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={limpiar}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm disabled:opacity-50"
          >
            <Eraser size={16} />
            Limpiar
          </button>
          <button
            onClick={cargarChecklist}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm disabled:opacity-50"
          >
            <Upload size={16} />
            Cargar Check List (.docx)
          </button>
          <button
            onClick={() => generar('docx')}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Generar contrato (.docx)
          </button>
          <button
            onClick={() => generar('pdf')}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Descargar formulario (.pdf)
          </button>
        </div>
      </div>

      {/* Input oculto para cargar .docx */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        style={{ display: 'none' }}
        onChange={onArchivoSeleccionado}
      />

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Datalist estado civil */}
      <datalist id="opciones-estado-civil">
        {ESTADOS_CIVILES.map((ec) => (
          <option key={ec} value={ec} />
        ))}
      </datalist>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Subcomponentes
// ═══════════════════════════════════════════════════════════════

const inputCls =
  'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600'

function Seccion({
  titulo,
  badge,
  badgeColor = 'amber',
  icon: Icon,
  collapsible,
  isOpen,
  onToggle,
  children,
}: {
  titulo: string
  badge?: string
  badgeColor?: 'amber' | 'slate'
  icon?: typeof Users
  collapsible?: boolean
  isOpen?: boolean
  onToggle?: () => void
  children: React.ReactNode
}) {
  const badgeCls =
    badgeColor === 'amber'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-slate-700 text-slate-300 border-slate-600'
  return (
    <section className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <header
        className={`flex items-center justify-between px-6 py-4 border-b border-slate-700 ${
          collapsible ? 'cursor-pointer hover:bg-slate-700/30' : ''
        }`}
        onClick={collapsible ? onToggle : undefined}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} className="text-amber-400" />}
          <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{titulo}</h2>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-lg border ${badgeCls}`}>{badge}</span>
          )}
        </div>
        {collapsible && (
          <span className="text-slate-400">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        )}
      </header>
      {(!collapsible || isOpen) && <div className="p-6">{children}</div>}
      {collapsible && !isOpen && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-amber-400 hover:bg-slate-700/30"
        >
          <Plus size={16} />
          Agregar datos
        </button>
      )}
    </section>
  )
}

function Campo({
  label,
  requerido,
  full,
  children,
}: {
  label: string
  requerido?: boolean
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
        {requerido && <span className="text-amber-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function PersonaCard({
  titulo,
  onRemove,
  children,
}: {
  titulo: string
  onRemove?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-700/70 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-amber-400">{titulo}</h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

interface CamposBasicosPersona {
  nombre: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
}

function PersonaCamposBasicos({
  persona,
  onChange,
}: {
  idPrefix: string
  persona: CamposBasicosPersona
  onChange: (field: string, value: string) => void
}) {
  return (
    <>
      <Campo label="Nombre completo" full requerido>
        <input
          type="text"
          value={persona.nombre}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre completo"
          className={inputCls}
        />
      </Campo>
      <Campo label="No. cedula" requerido>
        <input
          type="text"
          value={persona.cc}
          onChange={(e) => onChange('cc', e.target.value)}
          placeholder="XX.XXX.XXX"
          className={inputCls}
        />
      </Campo>
      <Campo label="Expedida en">
        <input
          type="text"
          value={persona.cc_expedicion}
          onChange={(e) => onChange('cc_expedicion', e.target.value)}
          placeholder="Ciudad"
          className={inputCls}
        />
      </Campo>
      <Campo label="Direccion de notificacion" full>
        <input
          type="text"
          value={persona.direccion}
          onChange={(e) => onChange('direccion', e.target.value)}
          placeholder="Direccion completa"
          className={inputCls}
        />
      </Campo>
      <Campo label="Correo electronico">
        <input
          type="email"
          value={persona.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="correo@ejemplo.com"
          className={inputCls}
        />
      </Campo>
      <Campo label="Telefono">
        <input
          type="text"
          value={persona.telefono}
          onChange={(e) => onChange('telefono', e.target.value)}
          placeholder="300 000 0000"
          className={inputCls}
        />
      </Campo>
      <Campo label="Estado civil" full>
        <input
          type="text"
          list="opciones-estado-civil"
          value={persona.estado_civil}
          onChange={(e) => onChange('estado_civil', e.target.value)}
          placeholder="Escriba o seleccione..."
          className={inputCls}
        />
      </Campo>
    </>
  )
}

function BotonAgregar({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-400 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Plus size={16} />
      {children}
    </button>
  )
}

function Toast({ msg, kind, onClose }: ToastState & { onClose: () => void }) {
  const cls =
    kind === 'error'
      ? 'bg-red-500/10 border-red-500/30 text-red-300'
      : kind === 'success'
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      : 'bg-slate-800 border-slate-600 text-slate-200'
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle : FileText
  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${cls}`}
      onClick={onClose}
    >
      <Icon size={18} />
      <span className="text-sm">{msg}</span>
    </div>
  )
}
