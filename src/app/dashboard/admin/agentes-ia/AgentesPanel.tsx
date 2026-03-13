'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
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
  const [interestRate, setInterestRate] = useState(1.5)
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

  // ── Orchestrator execution ──

  const handleProcesar = async () => {
    setIsProcessing(true)
    setFichaPdfUrl(null)

    const now = Date.now()
    // Set all agents + ficha as processing
    setAgents({
      titulos: { status: 'procesando', result: null, error: null, startedAt: now, completedAt: null },
      kyc: { status: 'procesando', result: null, error: null, startedAt: now, completedAt: null },
      credito: { status: 'procesando', result: null, error: null, startedAt: now, completedAt: null },
      ficha: { status: 'procesando', result: null, error: null, startedAt: now, completedAt: null },
    })

    try {
      // Build document map: field name → Supabase Storage URL
      const documents: Record<string, string> = {}
      if (slots.libertad_tradicion?.url) documents.libertad_tradicion = slots.libertad_tradicion.url
      if (slots.escritura?.url) documents.escritura = slots.escritura.url
      if (slots.cedula?.url) documents.cedula = slots.cedula.url
      if (slots.extractos?.url) documents.extractos = slots.extractos.url
      if (slots.declaracion_renta?.url) documents.declaracion_renta = slots.declaracion_renta.url

      // Build operation data from solicitud
      // Monthly payment formula (French amortization): M = P * r / (1 - (1+r)^-n)
      const calcMonthlyPayment = (principal: number, rateMonthly: number, months: number) => {
        const r = rateMonthly / 100
        if (r === 0) return Math.round(principal / months)
        return Math.round(principal * r / (1 - Math.pow(1 + r, -months)))
      }

      const operation = selectedSolicitud
        ? {
            operation_id: selectedSolicitud.id,
            loan_amount: selectedSolicitud.monto_requerido,
            loan_term_months: selectedSolicitud.plazo_meses || 12,
            interest_rate_monthly: interestRate,
            monthly_payment: calcMonthlyPayment(
              selectedSolicitud.monto_requerido,
              interestRate,
              selectedSolicitud.plazo_meses || 12
            ),
            guarantee_type: 'hipoteca' as const,
            property_appraisal_value: selectedSolicitud.valor_inmueble,
            ltv_percent: Math.round((selectedSolicitud.monto_requerido / selectedSolicitud.valor_inmueble) * 100),
            loan_purpose: 'Crédito hipotecario',
          }
        : {
            operation_id: `MANUAL-${Date.now()}`,
            loan_amount: 250000000,
            loan_term_months: 12,
            interest_rate_monthly: interestRate,
            monthly_payment: calcMonthlyPayment(250000000, interestRate, 12),
            guarantee_type: 'hipoteca' as const,
            property_appraisal_value: 450000000,
            ltv_percent: 56,
            loan_purpose: 'Crédito hipotecario',
          }

      const applicant = selectedSolicitud?.solicitante
        ? { name: selectedSolicitud.solicitante.full_name || 'Sin nombre', cedula: '0000000000' }
        : { name: 'Solicitante Manual', cedula: '0000000000' }

      const res = await fetch('/api/orchestrator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant, operation, documents }),
      })

      const data = await res.json()
      const completedAt = Date.now()

      if (res.ok && data.evaluationId) {
        // Map orchestrator sections to agent cards
        const sections = data.report?.sections || {}

        setAgents({
          titulos: {
            status: 'completado',
            result: {
              resumen: sections['1_descripcion_inmueble']?.substring(0, 300) || 'Análisis completado',
              riesgo: data.riskLevel,
            },
            error: null,
            startedAt: now,
            completedAt,
          },
          kyc: {
            status: 'completado',
            result: {
              resumen: sections['4_perfil_solicitante']?.substring(0, 300) || 'Verificación completada',
            },
            error: null,
            startedAt: now,
            completedAt,
          },
          credito: {
            status: 'completado',
            result: {
              resumen: sections['5_analisis_financiero']?.substring(0, 300) || 'Análisis financiero completado',
            },
            error: null,
            startedAt: now,
            completedAt,
          },
          ficha: {
            status: 'completado',
            result: {
              resumen_general: sections['6_evaluacion_riesgo']?.substring(0, 300) || 'Evaluación completada',
              recomendacion: data.verdict,
              nivel_riesgo_global: `${data.riskLevel?.toUpperCase()} (${data.riskScore}/10)`,
            },
            error: null,
            startedAt: now,
            completedAt,
          },
        })

        // Use the PDF URL from the orchestrator (Supabase Storage signed URL)
        if (data.pdfUrl) {
          setFichaPdfUrl(data.pdfUrl)
        }
      } else {
        const errorMsg = data.error || 'Error del orquestador'
        setAgents({
          titulos: { status: 'error', result: null, error: errorMsg, startedAt: now, completedAt },
          kyc: { status: 'error', result: null, error: errorMsg, startedAt: now, completedAt },
          credito: { status: 'error', result: null, error: errorMsg, startedAt: now, completedAt },
          ficha: { status: 'error', result: null, error: errorMsg, startedAt: now, completedAt },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de conexión'
      const completedAt = Date.now()
      setAgents({
        titulos: { status: 'error', result: null, error: message, startedAt: now, completedAt },
        kyc: { status: 'error', result: null, error: message, startedAt: now, completedAt },
        credito: { status: 'error', result: null, error: message, startedAt: now, completedAt },
        ficha: { status: 'error', result: null, error: message, startedAt: now, completedAt },
      })
    }

    setIsProcessing(false)
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

      {/* Section 3: Interest Rate + Process Button */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Tasa mensual (%)</label>
          <input
            type="number"
            value={interestRate}
            onChange={e => setInterestRate(Number(e.target.value))}
            step={0.1}
            min={0.1}
            max={5}
            disabled={isProcessing}
            className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>

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
