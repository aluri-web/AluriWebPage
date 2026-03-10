'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  X,
  Zap,
  Download,
  Lock,
  Search,
  ShieldCheck,
  CreditCard,
  FileDown,
} from 'lucide-react'
import { uploadFile } from '@/utils/uploadFile'
import { type SolicitudSummary } from './actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Types ──────────────────────────────────────────────

interface DocumentSlot {
  url: string | null
  label: string
  uploading: boolean
}

type AgentStatus = 'idle' | 'procesando' | 'completado' | 'error'

interface AgentState {
  status: AgentStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
  error: string | null
  startedAt: number | null
  completedAt: number | null
}

// ── Constants ──────────────────────────────────────────

const AGENT_CONFIGS = [
  {
    key: 'titulos',
    label: 'Estudio de Titulos',
    icon: Search,
    docs: ['libertad_tradicion', 'escritura'],
    color: 'amber',
  },
  {
    key: 'kyc',
    label: 'KYC',
    icon: ShieldCheck,
    docs: ['cedula'],
    color: 'blue',
  },
  {
    key: 'credito',
    label: 'Estudio de Credito',
    icon: CreditCard,
    docs: ['extractos', 'declaracion_renta'],
    color: 'emerald',
  },
] as const

const DOC_LABELS: Record<string, string> = {
  libertad_tradicion: 'Certificado Libertad y Tradicion',
  escritura: 'Escritura',
  cedula: 'Cedula de ciudadania',
  extractos: 'Extractos bancarios',
  declaracion_renta: 'Declaracion de renta / Certificado de ingresos',
}

const INITIAL_SLOTS: Record<string, DocumentSlot> = Object.fromEntries(
  Object.entries(DOC_LABELS).map(([key, label]) => [key, { url: null, label, uploading: false }])
)

const INITIAL_AGENTS: Record<string, AgentState> = {
  titulos: { status: 'idle', result: null, error: null, startedAt: null, completedAt: null },
  kyc: { status: 'idle', result: null, error: null, startedAt: null, completedAt: null },
  credito: { status: 'idle', result: null, error: null, startedAt: null, completedAt: null },
  ficha: { status: 'idle', result: null, error: null, startedAt: null, completedAt: null },
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ── Elapsed Timer ──────────────────────────────────────

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return <span className="text-blue-400 text-xs font-mono">{elapsed}s</span>
}

// ── Main Component ─────────────────────────────────────

export default function AgentesPanel({ solicitudes }: { solicitudes: SolicitudSummary[] }) {
  const [mode, setMode] = useState<'solicitud' | 'manual'>('solicitud')
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, DocumentSlot>>({ ...INITIAL_SLOTS })
  const [agents, setAgents] = useState<Record<string, AgentState>>({ ...INITIAL_AGENTS })
  const [isProcessing, setIsProcessing] = useState(false)
  const [fichaPdfUrl, setFichaPdfUrl] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const selectedSolicitud = solicitudes.find((s) => s.id === selectedSolicitudId) || null

  // Check which agents have all required docs
  const agentReady = (agentKey: string) => {
    const config = AGENT_CONFIGS.find((a) => a.key === agentKey)
    if (!config) return false
    return config.docs.every((docKey) => slots[docKey]?.url)
  }

  const anyAgentReady = AGENT_CONFIGS.some((a) => agentReady(a.key))
  const allAgentsReady = AGENT_CONFIGS.every((a) => agentReady(a.key))

  const filledCount = Object.values(slots).filter((s) => s.url).length

  // ── Solicitud selection ──

  const handleSolicitudChange = useCallback(
    (solicitudId: string) => {
      setSelectedSolicitudId(solicitudId)
      const sol = solicitudes.find((s) => s.id === solicitudId)
      if (!sol) return

      const newSlots = { ...INITIAL_SLOTS }
      for (const doc of sol.documentos) {
        if (newSlots[doc.tipo]) {
          newSlots[doc.tipo] = { ...newSlots[doc.tipo], url: doc.url }
        }
      }
      setSlots(newSlots)
      setAgents({ ...INITIAL_AGENTS })
      setFichaPdfUrl(null)
    },
    [solicitudes]
  )

  // ── File upload per slot ──

  const handleFileUpload = async (docKey: string, file: File) => {
    setSlots((prev) => ({
      ...prev,
      [docKey]: { ...prev[docKey], uploading: true },
    }))

    try {
      const result = await uploadFile(file, 'agentes-ia')
      setSlots((prev) => ({
        ...prev,
        [docKey]: { ...prev[docKey], url: result.url || null, uploading: false },
      }))
    } catch {
      alert('Error al subir archivo')
      setSlots((prev) => ({
        ...prev,
        [docKey]: { ...prev[docKey], uploading: false },
      }))
    }
  }

  const clearSlot = (docKey: string) => {
    setSlots((prev) => ({
      ...prev,
      [docKey]: { ...prev[docKey], url: null },
    }))
  }

  // ── Agent execution ──

  const runAgent = async (agentKey: string) => {
    const config = AGENT_CONFIGS.find((a) => a.key === agentKey)
    if (!config) return null

    const documentos = config.docs
      .map((docKey) => ({ tipo: docKey, url: slots[docKey]?.url }))
      .filter((d) => d.url)

    setAgents((prev) => ({
      ...prev,
      [agentKey]: { status: 'procesando', result: null, error: null, startedAt: Date.now(), completedAt: null },
    }))

    try {
      const res = await fetch('/api/agentes-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agente: agentKey, documentos }),
      })
      const data = await res.json()

      if (data.success) {
        setAgents((prev) => ({
          ...prev,
          [agentKey]: {
            status: 'completado',
            result: data.resultado,
            error: null,
            startedAt: prev[agentKey].startedAt,
            completedAt: Date.now(),
          },
        }))
        return data.resultado
      } else {
        throw new Error(data.error || 'Error desconocido')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de conexion'
      setAgents((prev) => ({
        ...prev,
        [agentKey]: {
          status: 'error',
          result: null,
          error: message,
          startedAt: prev[agentKey].startedAt,
          completedAt: Date.now(),
        },
      }))
      return null
    }
  }

  const handleProcesar = async () => {
    setIsProcessing(true)
    setFichaPdfUrl(null)
    setAgents({ ...INITIAL_AGENTS })

    // Run ready agents in parallel
    const readyAgents = AGENT_CONFIGS.filter((a) => agentReady(a.key))
    const results = await Promise.allSettled(readyAgents.map((a) => runAgent(a.key)))

    // Check if all 3 main agents succeeded
    const allSucceeded =
      readyAgents.length === 3 && results.every((r) => r.status === 'fulfilled' && r.value !== null)

    if (allSucceeded) {
      // Run ficha agent
      setAgents((prev) => ({
        ...prev,
        ficha: { status: 'procesando', result: null, error: null, startedAt: Date.now(), completedAt: null },
      }))

      try {
        const res = await fetch('/api/agentes-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agente: 'ficha',
            documentos: results.map((r) => (r.status === 'fulfilled' ? r.value : null)),
          }),
        })
        const data = await res.json()

        if (data.success) {
          setAgents((prev) => ({
            ...prev,
            ficha: {
              status: 'completado',
              result: data.resultado,
              error: null,
              startedAt: prev.ficha.startedAt,
              completedAt: Date.now(),
            },
          }))

          // Generate PDF
          const pdfUrl = generateFichaPDF(data.resultado)
          setFichaPdfUrl(pdfUrl)
        }
      } catch {
        setAgents((prev) => ({
          ...prev,
          ficha: {
            status: 'error',
            result: null,
            error: 'Error al generar ficha tecnica',
            startedAt: prev.ficha.startedAt,
            completedAt: Date.now(),
          },
        }))
      }
    }

    setIsProcessing(false)
  }

  // ── PDF Generation ──

  const generateFichaPDF = (fichaResult: Record<string, string>) => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(30, 30, 30)
    doc.text('Ficha Tecnica - Analisis IA', 20, 20)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Generada: ${new Date().toLocaleDateString('es-CO')} | Aluri Platform`, 20, 27)
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 30, 190, 30)

    let y = 38

    // Solicitud info
    if (selectedSolicitud) {
      doc.setFontSize(13)
      doc.setTextColor(30, 30, 30)
      doc.text('Datos de la Solicitud', 20, y)
      y += 3
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
        head: [['Campo', 'Valor']],
        body: [
          ['Solicitante', selectedSolicitud.solicitante?.full_name || 'N/A'],
          ['Ciudad', selectedSolicitud.ciudad],
          ['Direccion', selectedSolicitud.direccion_inmueble],
          ['Monto Requerido', formatCOP(selectedSolicitud.monto_requerido)],
        ],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10
    }

    // Estudio de Titulos
    const titulosResult = agents.titulos.result
    if (titulosResult) {
      doc.setFontSize(13)
      doc.text('Estudio de Titulos', 20, y)
      y += 3
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [217, 119, 6] },
        head: [['Indicador', 'Resultado']],
        body: [
          ['Riesgo', titulosResult.riesgo],
          ['Propietario verificado', titulosResult.propietario_verificado ? 'Si' : 'No'],
          ['Gravamenes', titulosResult.gravamenes ? 'Si' : 'No'],
          ['Embargos', titulosResult.embargos ? 'Si' : 'No'],
          ['Anotaciones', String(titulosResult.anotaciones)],
          ['Matricula', titulosResult.matricula_inmobiliaria || 'N/A'],
        ],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 4
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(titulosResult.resumen || '', 170)
      doc.text(lines, 20, y)
      y += lines.length * 4 + 8
      doc.setTextColor(30, 30, 30)
    }

    // KYC
    const kycResult = agents.kyc.result
    if (kycResult) {
      doc.setFontSize(13)
      doc.text('KYC - Verificacion de Identidad', 20, y)
      y += 3
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        head: [['Indicador', 'Resultado']],
        body: [
          ['Identidad verificada', kycResult.identidad_verificada ? 'Si' : 'No'],
          ['Nombre coincide', kycResult.nombre_coincide ? 'Si' : 'No'],
          ['Documento vigente', kycResult.documento_vigente ? 'Si' : 'No'],
          ['Listas restrictivas', kycResult.listas_restrictivas ? 'ALERTA' : 'Limpio'],
          ['PEP', kycResult.peps ? 'Si' : 'No'],
          ['Lugar expedicion', kycResult.lugar_expedicion || 'N/A'],
        ],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 4
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(kycResult.resumen || '', 170)
      doc.text(lines, 20, y)
      y += lines.length * 4 + 8
      doc.setTextColor(30, 30, 30)
    }

    // Estudio de Credito
    const creditoResult = agents.credito.result
    if (creditoResult) {
      if (y > 240) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(13)
      doc.text('Estudio de Credito', 20, y)
      y += 3
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        head: [['Indicador', 'Resultado']],
        body: [
          ['Capacidad de pago', creditoResult.capacidad_pago],
          ['Ingresos mensuales', formatCOP(creditoResult.ingresos_mensuales)],
          ['Gastos fijos', formatCOP(creditoResult.gastos_fijos)],
          ['Endeudamiento', `${creditoResult.endeudamiento_porcentaje}%`],
          ['Score crediticio', `${creditoResult.score_crediticio}/999`],
          ['Creditos activos', String(creditoResult.historial_creditos)],
          ['Creditos en mora', String(creditoResult.creditos_en_mora)],
          ['Patrimonio estimado', formatCOP(creditoResult.patrimonio_estimado)],
        ],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 4
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(creditoResult.resumen || '', 170)
      doc.text(lines, 20, y)
      y += lines.length * 4 + 8
      doc.setTextColor(30, 30, 30)
    }

    // Conclusion
    if (fichaResult) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(13)
      doc.text('Conclusion General', 20, y)
      y += 6
      doc.setFontSize(10)
      doc.text(`Recomendacion: ${fichaResult.recomendacion || 'N/A'}`, 20, y)
      y += 5
      doc.text(`Nivel de riesgo global: ${fichaResult.nivel_riesgo_global || 'N/A'}`, 20, y)
      y += 5
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const lines = doc.splitTextToSize(fichaResult.resumen_general || '', 170)
      doc.text(lines, 20, y)
    }

    return doc.output('bloburl') as unknown as string
  }

  // ── Render ───────────────────────────────────────────

  const completedCount = Object.values(agents).filter((a) => a.status === 'completado').length
  const mainCompleted = ['titulos', 'kyc', 'credito'].filter((k) => agents[k].status === 'completado').length

  return (
    <div className="space-y-6">
      {/* Section 1: Source Selection */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => {
                setMode('solicitud')
                setSlots({ ...INITIAL_SLOTS })
                setAgents({ ...INITIAL_AGENTS })
                setSelectedSolicitudId(null)
                setFichaPdfUrl(null)
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'solicitud'
                  ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Seleccionar Solicitud
            </button>
            <button
              onClick={() => {
                setMode('manual')
                setSlots({ ...INITIAL_SLOTS })
                setAgents({ ...INITIAL_AGENTS })
                setSelectedSolicitudId(null)
                setFichaPdfUrl(null)
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'manual'
                  ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Subir Documentos
            </button>
          </div>
        </div>

        {mode === 'solicitud' && (
          <div>
            <select
              value={selectedSolicitudId || ''}
              onChange={(e) => e.target.value && handleSolicitudChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Seleccionar una solicitud...</option>
              {solicitudes.map((sol) => (
                <option key={sol.id} value={sol.id} className="bg-slate-900">
                  {sol.solicitante?.full_name || 'Sin nombre'} — {sol.ciudad} — {formatCOP(sol.monto_requerido)}
                </option>
              ))}
            </select>

            {selectedSolicitud && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  {selectedSolicitud.solicitante?.full_name} · {selectedSolicitud.ciudad}
                </span>
                <span className={`font-medium ${filledCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {filledCount}/5 documentos disponibles
                </span>
              </div>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <p className="text-sm text-slate-400">
            Sube los documentos directamente en las casillas de cada agente.
          </p>
        )}
      </div>

      {/* Section 2: Document Assignment by Agent */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">
          Documentos por Agente
        </h3>

        <div className="space-y-6">
          {AGENT_CONFIGS.map((agent) => {
            const AgentIcon = agent.icon
            const ready = agentReady(agent.key)

            return (
              <div key={agent.key}>
                <div className="flex items-center gap-2 mb-3">
                  <AgentIcon size={16} className={`text-${agent.color}-400`} />
                  <span className="text-sm font-medium text-white">{agent.label}</span>
                  {ready && <CheckCircle size={14} className="text-emerald-400" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agent.docs.map((docKey) => {
                    const slot = slots[docKey]
                    return (
                      <div
                        key={docKey}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                          slot.url
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/30 border-slate-600/30 text-slate-400'
                        }`}
                      >
                        {slot.uploading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : slot.url ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} className="text-slate-500" />
                        )}

                        <span className="flex-1 truncate">{slot.label}</span>

                        {slot.url ? (
                          <div className="flex items-center gap-1">
                            <a
                              href={slot.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:text-white transition-colors"
                              title="Ver documento"
                            >
                              <ExternalLink size={12} />
                            </a>
                            {!isProcessing && (
                              <button
                                onClick={() => clearSlot(docKey)}
                                className="p-1 hover:text-red-400 transition-colors"
                                title="Remover"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <input
                              ref={(el) => { fileInputRefs.current[docKey] = el }}
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(docKey, file)
                                e.target.value = ''
                              }}
                            />
                            <button
                              onClick={() => fileInputRefs.current[docKey]?.click()}
                              disabled={slot.uploading || isProcessing}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded text-xs transition-colors disabled:opacity-50"
                            >
                              <Upload size={11} />
                              Subir
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 3: Process Button */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handleProcesar}
          disabled={isProcessing || !anyAgentReady}
          className="flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Zap size={18} />
              Procesar con Agentes IA
            </>
          )}
        </button>

        {!allAgentsReady && anyAgentReady && !isProcessing && (
          <p className="text-xs text-amber-400">
            Algunos agentes no tienen todos los documentos
          </p>
        )}
      </div>

      {/* Section 4: Agent Progress & Results */}
      {(isProcessing || Object.values(agents).some((a) => a.status !== 'idle')) && (
        <div>
          {/* Overall progress */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 4) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0">{completedCount}/4 agentes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3 main agents */}
            {AGENT_CONFIGS.map((config) => {
              const agent = agents[config.key]
              const AgentIcon = config.icon
              return (
                <AgentCard
                  key={config.key}
                  label={config.label}
                  icon={<AgentIcon size={18} />}
                  agent={agent}
                />
              )
            })}

            {/* Ficha Tecnica card */}
            <div
              className={`bg-slate-800 rounded-xl border p-5 transition-all ${
                agents.ficha.status === 'completado'
                  ? 'border-emerald-500/30'
                  : agents.ficha.status === 'procesando'
                    ? 'border-blue-500/30'
                    : agents.ficha.status === 'error'
                      ? 'border-red-500/30'
                      : 'border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileDown size={18} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">Ficha Tecnica</span>
                </div>
                <AgentStatusBadge status={agents.ficha.status} />
              </div>

              {agents.ficha.status === 'idle' && mainCompleted < 3 && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Lock size={12} />
                  Esperando resultados de los 3 agentes ({mainCompleted}/3)
                </div>
              )}

              {agents.ficha.status === 'procesando' && agents.ficha.startedAt && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <Loader2 size={12} className="animate-spin" />
                  Generando ficha... <ElapsedTimer startedAt={agents.ficha.startedAt} />
                </div>
              )}

              {agents.ficha.status === 'error' && (
                <p className="text-xs text-red-400">{agents.ficha.error}</p>
              )}

              {agents.ficha.status === 'completado' && fichaPdfUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-400">
                    {agents.ficha.result?.resumen_general}
                  </p>
                  <a
                    href={fichaPdfUrl}
                    download={`ficha-tecnica-${selectedSolicitudId || 'manual'}-${Date.now()}.pdf`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors text-sm"
                  >
                    <Download size={14} />
                    Descargar Ficha Tecnica PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────

function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const config = {
    idle: { label: 'Pendiente', class: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
    procesando: { label: 'Procesando', class: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    completado: { label: 'Completado', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    error: { label: 'Error', class: 'bg-red-500/10 text-red-400 border-red-500/30' },
  }
  const c = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.class}`}>
      {status === 'procesando' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse" />}
      {c.label}
    </span>
  )
}

function AgentCard({
  label,
  icon,
  agent,
}: {
  label: string
  icon: React.ReactNode
  agent: AgentState
}) {
  return (
    <div
      className={`bg-slate-800 rounded-xl border p-5 transition-all ${
        agent.status === 'completado'
          ? 'border-emerald-500/30'
          : agent.status === 'procesando'
            ? 'border-blue-500/30'
            : agent.status === 'error'
              ? 'border-red-500/30'
              : 'border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-300">
          {icon}
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {agent.status === 'procesando' && agent.startedAt && (
            <ElapsedTimer startedAt={agent.startedAt} />
          )}
          {agent.status === 'completado' && agent.startedAt && agent.completedAt && (
            <span className="text-emerald-400 text-xs font-mono">
              {((agent.completedAt - agent.startedAt) / 1000).toFixed(1)}s
            </span>
          )}
          <AgentStatusBadge status={agent.status} />
        </div>
      </div>

      {agent.status === 'procesando' && (
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <Loader2 size={12} className="animate-spin" />
          Analizando documentos...
        </div>
      )}

      {agent.status === 'error' && <p className="text-xs text-red-400">{agent.error}</p>}

      {agent.status === 'completado' && agent.result && (
        <p className="text-xs text-slate-400 leading-relaxed">{agent.result.resumen}</p>
      )}
    </div>
  )
}
