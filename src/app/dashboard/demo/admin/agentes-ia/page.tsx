'use client'

import { useState } from 'react'
import {
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  Zap,
  Download,
  Search,
  ShieldCheck,
  CreditCard,
  FileDown,
  Upload,
  Info,
} from 'lucide-react'

// ── Demo data ──────────────────────────────────────────

const DEMO_SOLICITUDES = [
  { id: '1', name: 'Juan Pablo Moreno Castaño', ciudad: 'Bogota', monto: 200000000, docsCount: 5 },
  { id: '2', name: 'Ana Maria Gutierrez Pardo', ciudad: 'Medellin', monto: 180000000, docsCount: 3 },
  { id: '3', name: 'Roberto Sanchez Villa', ciudad: 'Cali', monto: 100000000, docsCount: 2 },
]

const AGENT_CONFIGS = [
  { key: 'titulos', label: 'Estudio de Titulos', icon: Search, color: 'amber', docs: ['Certificado Libertad y Tradicion', 'Escritura'] },
  { key: 'kyc', label: 'KYC', icon: ShieldCheck, color: 'blue', docs: ['Cedula de ciudadania'] },
  { key: 'credito', label: 'Estudio de Credito', icon: CreditCard, color: 'emerald', docs: ['Extractos bancarios', 'Declaracion de renta'] },
] as const

const DEMO_RESULTS: Record<string, { resumen: string }> = {
  titulos: { resumen: 'El inmueble se encuentra libre de gravamenes y embargos. Matricula inmobiliaria vigente. Tradicion de los ultimos 20 anos verificada sin inconsistencias. Propietario registrado coincide con el solicitante.' },
  kyc: { resumen: 'Identidad verificada exitosamente. No se encontraron registros en listas restrictivas (OFAC, ONU, PEPs). Cedula vigente y datos coinciden con registraduria.' },
  credito: { resumen: 'Capacidad de pago verificada. Ingresos mensuales promedio: $8.500.000. Relacion cuota/ingreso: 28%. Score crediticio favorable. Sin reportes negativos en centrales de riesgo.' },
}

type AgentStatus = 'idle' | 'procesando' | 'completado'

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

// ── Component ──────────────────────────────────────────

export default function DemoAgentesIAPage() {
  const [mode, setMode] = useState<'solicitud' | 'manual'>('solicitud')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [agents, setAgents] = useState<Record<string, AgentStatus>>({ titulos: 'idle', kyc: 'idle', credito: 'idle', ficha: 'idle' })
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [demoMessage, setDemoMessage] = useState('')

  const selectedSol = DEMO_SOLICITUDES.find(s => s.id === selectedId)

  const handleProcesar = () => {
    setIsProcessing(true)
    setShowResults(true)
    setAgents({ titulos: 'procesando', kyc: 'procesando', credito: 'procesando', ficha: 'procesando' })

    // Simulate agents completing one by one
    setTimeout(() => setAgents(prev => ({ ...prev, titulos: 'completado' })), 1500)
    setTimeout(() => setAgents(prev => ({ ...prev, kyc: 'completado' })), 2500)
    setTimeout(() => setAgents(prev => ({ ...prev, credito: 'completado' })), 3500)
    setTimeout(() => {
      setAgents(prev => ({ ...prev, ficha: 'completado' }))
      setIsProcessing(false)
    }, 4500)
  }

  const handleReset = () => {
    setAgents({ titulos: 'idle', kyc: 'idle', credito: 'idle', ficha: 'idle' })
    setShowResults(false)
    setIsProcessing(false)
  }

  const showDemoToast = (msg: string) => {
    setDemoMessage(msg)
    setTimeout(() => setDemoMessage(''), 2000)
  }

  const completedCount = Object.values(agents).filter(s => s === 'completado').length

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <Bot size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Agentes IA</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Analisis automatizado de documentos con inteligencia artificial
          </p>
        </div>
      </header>

      {/* Demo toast */}
      {demoMessage && (
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-center gap-2">
          <Info size={14} className="text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">{demoMessage}</p>
        </div>
      )}

      {/* Section 1: Source Selection */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => { setMode('solicitud'); handleReset() }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'solicitud' ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Seleccionar Solicitud
            </button>
            <button
              onClick={() => { setMode('manual'); handleReset(); setSelectedId(null) }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'manual' ? 'bg-amber-500/10 text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Subir Documentos
            </button>
          </div>
        </div>

        {mode === 'solicitud' && (
          <div>
            <select
              value={selectedId || ''}
              onChange={e => { setSelectedId(e.target.value || null); handleReset() }}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Seleccionar una solicitud...</option>
              {DEMO_SOLICITUDES.map(sol => (
                <option key={sol.id} value={sol.id} className="bg-slate-900">
                  {sol.name} — {sol.ciudad} — {formatCOP(sol.monto)}
                </option>
              ))}
            </select>

            {selectedSol && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="text-slate-400">{selectedSol.name} · {selectedSol.ciudad}</span>
                <span className={`font-medium ${selectedSol.docsCount === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedSol.docsCount}/5 documentos disponibles
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
          {AGENT_CONFIGS.map(agent => {
            const AgentIcon = agent.icon
            const allUploaded = mode === 'solicitud' && selectedId

            return (
              <div key={agent.key}>
                <div className="flex items-center gap-2 mb-3">
                  <AgentIcon size={16} className={`text-${agent.color}-400`} />
                  <span className="text-sm font-medium text-white">{agent.label}</span>
                  {allUploaded && <CheckCircle size={14} className="text-emerald-400" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agent.docs.map(docLabel => (
                    <div
                      key={docLabel}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
                        allUploaded
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700/30 border-slate-600/30 text-slate-400'
                      }`}
                    >
                      {allUploaded ? <CheckCircle size={14} /> : <XCircle size={14} className="text-slate-500" />}
                      <span className="flex-1 truncate">{docLabel}</span>
                      {!allUploaded && (
                        <button
                          onClick={() => showDemoToast('Upload simulado en modo demo')}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded text-xs transition-colors"
                        >
                          <Upload size={11} />
                          Subir
                        </button>
                      )}
                    </div>
                  ))}
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
            defaultValue={1.5}
            step={0.1}
            min={0.1}
            max={5}
            disabled={isProcessing}
            className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleProcesar}
          disabled={isProcessing || (!selectedId && mode === 'solicitud')}
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
      </div>

      {/* Section 4: Agent Progress & Results */}
      {showResults && (
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
            {AGENT_CONFIGS.map(config => {
              const status = agents[config.key]
              const AgentIcon = config.icon
              return (
                <div
                  key={config.key}
                  className={`bg-slate-800 rounded-xl border p-5 transition-all ${
                    status === 'completado' ? 'border-emerald-500/30' : status === 'procesando' ? 'border-blue-500/30' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <AgentIcon size={18} />
                      <span className="text-sm font-semibold text-white">{config.label}</span>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  {status === 'procesando' && (
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <Loader2 size={12} className="animate-spin" />
                      Analizando documentos...
                    </div>
                  )}

                  {status === 'completado' && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {DEMO_RESULTS[config.key]?.resumen}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Ficha Tecnica card */}
            <div
              className={`bg-slate-800 rounded-xl border p-5 transition-all ${
                agents.ficha === 'completado' ? 'border-emerald-500/30' : agents.ficha === 'procesando' ? 'border-blue-500/30' : 'border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileDown size={18} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">Ficha Tecnica</span>
                </div>
                <StatusBadge status={agents.ficha} />
              </div>

              {agents.ficha === 'idle' && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Lock size={12} />
                  Esperando resultados de los 3 agentes
                </div>
              )}

              {agents.ficha === 'procesando' && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <Loader2 size={12} className="animate-spin" />
                  Generando ficha...
                </div>
              )}

              {agents.ficha === 'completado' && (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-400">
                    Riesgo: BAJO (3/10). Recomendacion: APROBADO. Inmueble libre de gravamenes, solicitante con buen perfil crediticio.
                  </p>
                  <button
                    onClick={() => showDemoToast('Descarga simulada en modo demo')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors text-sm"
                  >
                    <Download size={14} />
                    Descargar Ficha Tecnica PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Demo notice */}
          <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-400">
              Los resultados mostrados son simulados. En el modo real, los agentes IA analizan los documentos con nuestro modelo AI y generan una ficha tecnica PDF.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const config = {
    idle: { label: 'Pendiente', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
    procesando: { label: 'Procesando', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    completado: { label: 'Completado', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  }
  const c = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.cls}`}>
      {status === 'procesando' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5 animate-pulse" />}
      {c.label}
    </span>
  )
}
