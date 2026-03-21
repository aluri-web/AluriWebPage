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
  History,
  Clock,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react'
import { uploadFile } from '@/utils/uploadFile'
import { type SolicitudSummary, type EvaluacionIA, saveEvaluation } from './actions'
import FlashCardGenerator from './FlashCardGenerator'

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
    docs: ['cedula', 'reporte_auco'],
    color: 'blue',
  },
  {
    key: 'credito',
    label: 'Estudio de Credito',
    icon: CreditCard,
    docs: ['extractos', 'declaracion_renta', 'certificado_ingresos', 'estados_financieros'],
    color: 'emerald',
  },
] as const

// Docs to hide based on persona type
// Docs that are optional (not required for agent readiness)
const OPTIONAL_DOCS = ['reporte_auco', 'certificado_ingresos', 'estados_financieros', 'declaracion_renta']

const PERSONA_HIDDEN_DOCS: Record<string, string[]> = {
  persona_natural: ['estados_financieros'],
  persona_juridica: ['certificado_ingresos'],
}

const DOC_LABELS: Record<string, string> = {
  libertad_tradicion: 'Certificado Libertad y Tradicion',
  escritura: 'Escritura',
  cedula: 'Cedula de ciudadania',
  extractos: 'Extractos bancarios',
  declaracion_renta: 'Declaracion de renta',
  certificado_ingresos: 'Certificado laboral / de ingresos',
  estados_financieros: 'Estados financieros',
  reporte_auco: 'Reporte AUCO (PDF)',
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

export default function AgentesPanel({
  solicitudes,
  previousEvaluations = [],
}: {
  solicitudes: SolicitudSummary[]
  previousEvaluations?: EvaluacionIA[]
}) {
  const [mode, setMode] = useState<'solicitud' | 'manual'>('solicitud')
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, DocumentSlot>>({ ...INITIAL_SLOTS })
  const [agents, setAgents] = useState<Record<string, AgentState>>({ ...INITIAL_AGENTS })
  const [isProcessing, setIsProcessing] = useState(false)
  const [fichaPdfUrl, setFichaPdfUrl] = useState<string | null>(null)
  const [interestRate, setInterestRate] = useState(1.5)
  const [netRate, setNetRate] = useState(1.2)
  const [rateType, setRateType] = useState<'anticipado' | 'vencido'>('anticipado')
  const [paymentMode, setPaymentMode] = useState<'solo_intereses' | 'capital_intereses'>('solo_intereses')
  const [propertyType, setPropertyType] = useState('casa')
  const [guaranteeType, setGuaranteeType] = useState<'hipoteca' | 'retroventa'>('hipoteca')
  // Applicant name/cedula: sent as hint to orchestrator, but KYC extracts the real identity from documents
  const [applicantName, setApplicantName] = useState('')
  const [manualLoanAmount, setManualLoanAmount] = useState<number | ''>('')
  const [manualLoanTerm, setManualLoanTerm] = useState<number | ''>(12)
  const [manualPropertyValue, setManualPropertyValue] = useState<number | ''>('')
  const [personaType, setPersonaType] = useState<'persona_natural' | 'persona_juridica'>('persona_natural')
  const [declaredIncome, setDeclaredIncome] = useState<number | ''>('')
  const [declaredAppraisal, setDeclaredAppraisal] = useState<number | ''>('')
  const [adminNotes, setAdminNotes] = useState('')
  const [evaluations, setEvaluations] = useState<EvaluacionIA[]>(previousEvaluations)
  const [showHistory, setShowHistory] = useState(false)
  const [lastOperation, setLastOperation] = useState<Record<string, unknown> | null>(null)
  const [lastPhotoUrls, setLastPhotoUrls] = useState<string[]>([])
  const [manualPhotos, setManualPhotos] = useState<string[]>([])
  const [lastApplicantName, setLastApplicantName] = useState('')
  const [viewingEvaluation, setViewingEvaluation] = useState<EvaluacionIA | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const selectedSolicitud = solicitudes.find((s) => s.id === selectedSolicitudId) || null

  // Keep session alive while AI is processing (prevents timeout logout)
  useEffect(() => {
    if (!isProcessing) return
    const interval = setInterval(() => {
      window.dispatchEvent(new CustomEvent('session-activity-ping'))
    }, 60_000) // ping every 60s
    // Ping immediately on start
    window.dispatchEvent(new CustomEvent('session-activity-ping'))
    return () => clearInterval(interval)
  }, [isProcessing])

  // Check which agents have all required docs
  const agentReady = (agentKey: string) => {
    const config = AGENT_CONFIGS.find((a) => a.key === agentKey)
    if (!config) return false
    const hidden = PERSONA_HIDDEN_DOCS[personaType] || []
    return config.docs.filter(d => !hidden.includes(d) && !OPTIONAL_DOCS.includes(d)).every((docKey) => slots[docKey]?.url)
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
      setApplicantName(sol.solicitante?.full_name || '')
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

  const handlePhotoUpload = async (file: File) => {
    try {
      const result = await uploadFile(file, 'agentes-ia-fotos')
      if (result.url) {
        setManualPhotos(prev => [...prev, result.url!])
      }
    } catch {
      alert('Error al subir foto')
    }
  }

  const removePhoto = (index: number) => {
    setManualPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const clearSlot = (docKey: string) => {
    setSlots((prev) => ({
      ...prev,
      [docKey]: { ...prev[docKey], url: null },
    }))
  }

  // ── Load a previous evaluation into the agent cards ──

  const loadEvaluation = useCallback((ev: EvaluacionIA) => {
    const sections = ev.sections || {}
    const now = Date.now()

    setAgents({
      titulos: {
        status: 'completado',
        result: {
          resumen: sections['1_descripcion_inmueble']?.substring(0, 300) || 'Análisis completado',
          riesgo: ev.risk_level,
        },
        error: null,
        startedAt: now,
        completedAt: now + (ev.processing_ms || 0),
      },
      kyc: {
        status: 'completado',
        result: {
          resumen: sections['4_perfil_solicitante']?.substring(0, 300) || 'Verificación completada',
        },
        error: null,
        startedAt: now,
        completedAt: now + (ev.processing_ms || 0),
      },
      credito: {
        status: 'completado',
        result: {
          resumen: sections['5_analisis_financiero']?.substring(0, 300) || 'Análisis financiero completado',
        },
        error: null,
        startedAt: now,
        completedAt: now + (ev.processing_ms || 0),
      },
      ficha: {
        status: 'completado',
        result: {
          resumen_general: sections['6_evaluacion_riesgo']?.substring(0, 300) || 'Evaluación completada',
          recomendacion: ev.verdict,
          nivel_riesgo_global: `${ev.risk_level?.toUpperCase()} (${ev.risk_score}/10)`,
        },
        error: null,
        startedAt: now,
        completedAt: now + (ev.processing_ms || 0),
      },
    })

    setFichaPdfUrl(ev.pdf_url || null)
    setViewingEvaluation(ev)

    // Set solicitud if it matches one we have
    if (ev.solicitud_id) {
      setSelectedSolicitudId(ev.solicitud_id)
    }
  }, [])

  const clearViewingEvaluation = () => {
    setAgents({ ...INITIAL_AGENTS })
    setFichaPdfUrl(null)
    setViewingEvaluation(null)
  }

  // ── Orchestrator execution ──

  const handleProcesar = async () => {
    setViewingEvaluation(null)
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
      if (slots.certificado_ingresos?.url) documents.certificado_ingresos = slots.certificado_ingresos.url
      if (slots.estados_financieros?.url) documents.estados_financieros = slots.estados_financieros.url
      if (slots.reporte_auco?.url) documents.reporte_auco = slots.reporte_auco.url

      // Build operation data from solicitud
      // Monthly payment formula (French amortization): M = P * r / (1 - (1+r)^-n)
      const calcMonthlyPayment = (principal: number, rateMonthly: number, months: number) => {
        const r = rateMonthly / 100
        if (r === 0) return Math.round(principal / months)
        return Math.round(principal * r / (1 - Math.pow(1 + r, -months)))
      }

      const loanAmount = manualLoanAmount || (selectedSolicitud ? selectedSolicitud.monto_requerido : 0)
      const loanTerm = manualLoanTerm || (selectedSolicitud ? (selectedSolicitud.plazo_meses || 12) : 12)
      const propertyValue = manualPropertyValue || (selectedSolicitud ? selectedSolicitud.valor_inmueble : 0)

      if (!loanAmount || !propertyValue) {
        alert('Ingrese el monto requerido y el valor del inmueble')
        setIsProcessing(false)
        return
      }

      const monthlyPayment = paymentMode === 'solo_intereses'
        ? Math.round(loanAmount * interestRate / 100)
        : calcMonthlyPayment(loanAmount, interestRate, loanTerm)

      const operation = {
        operation_id: selectedSolicitud ? selectedSolicitud.id : `MANUAL-${Date.now()}`,
        loan_amount: loanAmount,
        loan_term_months: loanTerm,
        interest_rate_monthly: interestRate,
        monthly_payment: monthlyPayment,
        guarantee_type: guaranteeType,
        property_appraisal_value: propertyValue,
        ltv_percent: Math.round((loanAmount / propertyValue) * 100),
        loan_purpose: selectedSolicitud?.uso_dinero || 'Crédito hipotecario',
        // New flash card fields
        property_type: propertyType,
        city: selectedSolicitud?.ciudad || 'Sin ciudad',
        payment_mode: paymentMode,
        rate_type: rateType,
        net_rate_monthly: netRate,
        property_address: selectedSolicitud?.direccion_inmueble || '',
        // Admin-declared values for contrast
        ...(declaredIncome ? { declared_income_cop: declaredIncome } : {}),
        ...(declaredAppraisal ? { declared_appraisal_cop: declaredAppraisal } : {}),
        persona_type: personaType,
      }

      const applicant = {
        name: applicantName || selectedSolicitud?.solicitante?.full_name || 'Sin nombre',
        cedula: 'pending-kyc',
      }

      // Collect photo URLs from solicitud + manual uploads
      const solicitudPhotos = (selectedSolicitud?.fotos || [])
        .filter(f => f.url)
        .map(f => f.url)
      const photoUrls = [...solicitudPhotos, ...manualPhotos]

      // ── Step 1: Start evaluation (returns immediately with evaluationId) ──
      const res = await fetch('/api/orchestrator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant, operation, documents, photo_urls: photoUrls, ...(adminNotes ? { admin_notes: adminNotes } : {}) }),
      })

      const startData = await res.json()

      if (!res.ok || !startData.evaluationId) {
        throw new Error(startData.error || 'Error al iniciar evaluación')
      }

      const evaluationId = startData.evaluationId

      // ── Step 2: Poll for results every 5 seconds ──
      const POLL_INTERVAL = 5000
      const MAX_POLLS = 180 // 15 minutes max

      for (let poll = 0; poll < MAX_POLLS; poll++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL))

        const statusRes = await fetch(`/api/orchestrator/status?id=${evaluationId}`)
        if (!statusRes.ok) continue

        const statusData = await statusRes.json()
        const evaluation = statusData.evaluation

        if (!evaluation) continue

        if (evaluation.status === 'completed' || evaluation.status === 'failed') {
          const completedAt = Date.now()
          const sections = evaluation.unifier_output?.report?.sections || {}
          const verdict = evaluation.verdict
          const riskLevel = evaluation.global_risk_level
          const riskScore = evaluation.global_risk_score

          setAgents({
            titulos: {
              status: 'completado',
              result: {
                resumen: sections['1_descripcion_inmueble']?.substring(0, 300) || 'Análisis completado',
                riesgo: riskLevel,
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
                recomendacion: verdict,
                nivel_riesgo_global: `${riskLevel?.toUpperCase()} (${riskScore}/10)`,
                evaluationId,
              },
              error: null,
              startedAt: now,
              completedAt,
            },
          })

          // Get fresh PDF URL
          if (evaluation.pdf_storage_path) {
            setFichaPdfUrl(`/api/orchestrator/pdf?id=${evaluationId}`)
          }

          // Store operation data for flash card
          setLastOperation(operation)
          setLastPhotoUrls(photoUrls)
          setLastApplicantName(applicant.name)

          // Persist to frontend DB
          const savedDocuments: Record<string, string> = {}
          for (const [k, v] of Object.entries(documents)) {
            savedDocuments[k] = v
          }

          saveEvaluation({
            solicitud_id: selectedSolicitudId,
            applicant,
            operation,
            documents: savedDocuments,
            verdict: verdict || null,
            risk_level: riskLevel || null,
            risk_score: riskScore ?? null,
            sections: sections || null,
            pdf_url: evaluation.pdf_storage_path ? `/api/orchestrator/pdf?id=${evaluationId}` : null,
            evaluation_id: evaluationId,
            interest_rate: interestRate,
            processing_ms: completedAt - now,
            photo_urls: photoUrls.length > 0 ? photoUrls : null,
          }).then(({ data: saved }) => {
            if (saved) {
              setEvaluations(prev => [{
                id: saved.id,
                solicitud_id: selectedSolicitudId,
                admin_id: '',
                applicant,
                operation,
                documents: savedDocuments,
                verdict: verdict || null,
                risk_level: riskLevel || null,
                risk_score: riskScore ?? null,
                sections: sections || null,
                pdf_url: evaluation.pdf_storage_path ? `/api/orchestrator/pdf?id=${evaluationId}` : null,
                evaluation_id: evaluationId,
                interest_rate: interestRate,
                processing_ms: completedAt - now,
                photo_urls: photoUrls.length > 0 ? photoUrls : null,
                created_at: new Date().toISOString(),
              }, ...prev])
            }
          }).catch(() => {
            console.error('[AgentesPanel] Error saving evaluation')
          })

          setIsProcessing(false)
          return
        }
      }

      // If we get here, polling timed out
      throw new Error('Timeout: la evaluación tardó más de 15 minutos')
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
                  {agent.docs.filter((docKey) => !(PERSONA_HIDDEN_DOCS[personaType] || []).includes(docKey)).map((docKey) => {
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

      {/* Section 2.5: Photo uploads */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 font-medium">Fotos del inmueble (opcional)</p>
        <div className="flex flex-wrap gap-2">
          {manualPhotos.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-600" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          ))}
          <label className="w-20 h-20 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                const files = e.target.files
                if (files) {
                  Array.from(files).forEach(f => handlePhotoUpload(f))
                }
                e.target.value = ''
              }}
            />
            <Upload size={16} className="text-slate-500" />
          </label>
        </div>
      </div>

      {/* Section 3: Operation Parameters */}
      <div className="space-y-3">
        {/* Loan details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Monto requerido (COP) *</label>
            <input
              type="number"
              value={manualLoanAmount}
              onChange={e => setManualLoanAmount(e.target.value ? Number(e.target.value) : '')}
              placeholder={selectedSolicitud ? String(selectedSolicitud.monto_requerido) : 'Ej: 250000000'}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Valor inmueble (COP) *</label>
            <input
              type="number"
              value={manualPropertyValue}
              onChange={e => setManualPropertyValue(e.target.value ? Number(e.target.value) : '')}
              placeholder={selectedSolicitud ? String(selectedSolicitud.valor_inmueble) : 'Ej: 450000000'}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder-slate-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Plazo (meses)</label>
            <input
              type="number"
              value={manualLoanTerm}
              onChange={e => setManualLoanTerm(e.target.value ? Number(e.target.value) : '')}
              min={1}
              max={360}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Tipo de inmueble */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Tipo inmueble</label>
            <select
              value={propertyType}
              onChange={e => setPropertyType(e.target.value)}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="local_comercial">Local comercial</option>
              <option value="oficina">Oficina</option>
              <option value="lote">Lote</option>
              <option value="finca">Finca</option>
              <option value="bodega">Bodega</option>
            </select>
          </div>

          {/* Garantía */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Garantía</label>
            <select
              value={guaranteeType}
              onChange={e => setGuaranteeType(e.target.value as 'hipoteca' | 'retroventa')}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="hipoteca">Hipoteca</option>
              <option value="retroventa">Retroventa</option>
            </select>
          </div>

          {/* Modalidad de pago */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Modalidad</label>
            <select
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value as 'solo_intereses' | 'capital_intereses')}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="solo_intereses">Solo intereses</option>
              <option value="capital_intereses">Capital e intereses</option>
            </select>
          </div>

          {/* Tipo de tasa */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Tipo tasa</label>
            <select
              value={rateType}
              onChange={e => setRateType(e.target.value as 'anticipado' | 'vencido')}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="anticipado">Mes anticipado</option>
              <option value="vencido">Mes vencido</option>
            </select>
          </div>

          {/* Tasa bruta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Tasa bruta (%)</label>
            <input
              type="number"
              value={interestRate}
              onChange={e => setInterestRate(Number(e.target.value))}
              step={0.01}
              min={0.1}
              max={5}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>

          {/* Tasa neta */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Tasa neta (%)</label>
            <input
              type="number"
              value={netRate}
              onChange={e => setNetRate(Number(e.target.value))}
              step={0.01}
              min={0.1}
              max={5}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Additional context fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
          {/* Tipo de persona */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Tipo persona</label>
            <select
              value={personaType}
              onChange={e => setPersonaType(e.target.value as 'persona_natural' | 'persona_juridica')}
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              <option value="persona_natural">Persona natural</option>
              <option value="persona_juridica">Persona jurídica</option>
            </select>
          </div>

          {/* Ingresos declarados */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Ingresos declarados (COP)</label>
            <input
              type="number"
              value={declaredIncome}
              onChange={e => setDeclaredIncome(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ej: 13000000"
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder-slate-500"
            />
          </div>

          {/* Avalúo indicado */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Avalúo indicado (COP)</label>
            <input
              type="number"
              value={declaredAppraisal}
              onChange={e => setDeclaredAppraisal(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ej: 450000000"
              disabled={isProcessing}
              className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Observaciones del administrador */}
        <div className="mt-3">
          <label className="text-xs text-slate-400">Observaciones del administrador</label>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            placeholder="Ej: La persona tiene un codeudor con ingresos de $X, el inmueble tiene parqueadero independiente..."
            disabled={isProcessing}
            rows={2}
            maxLength={2000}
            className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50 placeholder-slate-500 resize-none"
          />
        </div>

        {/* Process button */}
        <div className="flex items-center justify-center gap-4 mt-3">
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
      </div>

      {/* Section 4: Agent Progress & Results */}
      {viewingEvaluation && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3">
          <div className="flex items-center gap-3">
            <History size={16} className="text-amber-400" />
            <span className="text-sm text-amber-300">
              Viendo evaluación de <span className="font-semibold text-white">{viewingEvaluation.applicant?.name}</span>
              {' — '}
              {new Date(viewingEvaluation.created_at).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <button
            onClick={clearViewingEvaluation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            <X size={12} />
            Cerrar
          </button>
        </div>
      )}

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
                    href={`/api/orchestrator/pdf?id=${viewingEvaluation?.evaluation_id || agents.ficha.result?.evaluationId || ''}`}
                    download={`ficha-tecnica-${viewingEvaluation?.evaluation_id || agents.ficha.result?.evaluationId || 'report'}.pdf`}
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

      {/* Flash Card Generator — from current eval or from viewing a previous one */}
      {(() => {
        const flashOp = viewingEvaluation?.operation ?? lastOperation
        // Fallback: if evaluation has no photo_urls saved, try to get them from the linked solicitud
        const evalPhotos = viewingEvaluation?.photo_urls
        const fallbackPhotos = viewingEvaluation?.solicitud_id
          ? (solicitudes.find(s => s.id === viewingEvaluation.solicitud_id)?.fotos || [])
              .filter(f => f.url).map(f => f.url)
          : []
        const flashPhotos = evalPhotos ?? (fallbackPhotos.length > 0 ? fallbackPhotos : lastPhotoUrls)
        const flashName = viewingEvaluation?.applicant?.name ?? lastApplicantName
        const showFlash = viewingEvaluation ? true : (lastOperation && agents.ficha.status === 'completado')
        if (!flashOp || !showFlash) return null
        return (
          <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ImageIcon size={16} className="text-teal-400" />
              Flash para WhatsApp
            </h3>
            <FlashCardGenerator
              operation={flashOp as any}
              applicantName={flashName}
              photoUrls={flashPhotos ?? []}
            />
          </div>
        )
      })()}

      {/* Section 5: Evaluation History */}
      {evaluations.length > 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <History size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Evaluaciones Anteriores ({evaluations.length})
              </h3>
            </div>
            {showHistory ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {evaluations.map((ev) => (
                <EvaluationHistoryCard
                  key={ev.id}
                  evaluation={ev}
                  isActive={viewingEvaluation?.id === ev.id}
                  onLoad={() => loadEvaluation(ev)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────

function EvaluationHistoryCard({
  evaluation,
  isActive,
  onLoad,
}: {
  evaluation: EvaluacionIA
  isActive: boolean
  onLoad: () => void
}) {
  const date = new Date(evaluation.created_at)
  const formattedDate = date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const verdictColor =
    evaluation.verdict === 'APROBAR'
      ? 'text-emerald-400'
      : evaluation.verdict === 'RECHAZAR'
        ? 'text-red-400'
        : 'text-amber-400'

  const riskColor =
    evaluation.risk_level === 'bajo'
      ? 'text-emerald-400'
      : evaluation.risk_level === 'medio'
        ? 'text-amber-400'
        : evaluation.risk_level === 'alto'
          ? 'text-orange-400'
          : 'text-red-400'

  return (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 border transition-colors ${
      isActive
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/40'
    }`}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <Clock size={12} />
          {formattedDate}
        </div>
        <span className="text-sm text-white truncate">
          {evaluation.applicant?.name || 'Sin nombre'}
        </span>
        {evaluation.verdict && (
          <span className={`text-xs font-semibold ${verdictColor}`}>
            {evaluation.verdict}
          </span>
        )}
        {evaluation.risk_level && (
          <span className={`text-xs ${riskColor}`}>
            Riesgo: {evaluation.risk_level} ({evaluation.risk_score}/10)
          </span>
        )}
        {evaluation.processing_ms && (
          <span className="text-xs text-slate-500">
            {(evaluation.processing_ms / 1000).toFixed(0)}s
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onLoad}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isActive
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
          }`}
        >
          <ExternalLink size={12} />
          {isActive ? 'Viendo' : 'Ver'}
        </button>
        {evaluation.evaluation_id && (
          <a
            href={`/api/orchestrator/pdf?id=${evaluation.evaluation_id}`}
            download={`ficha-tecnica-${evaluation.evaluation_id}.pdf`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-medium transition-colors"
          >
            <Download size={12} />
            PDF
          </a>
        )}
      </div>
    </div>
  )
}

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
