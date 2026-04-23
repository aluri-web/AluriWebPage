'use client'

import { useState } from 'react'
import { FilePlus, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'

export default function DocumentosPage() {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_CONTRATOS_URL
  const [reloadKey, setReloadKey] = useState(0)

  if (!agentUrl) {
    return (
      <div className="p-8 text-white">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <FilePlus className="text-amber-400" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-amber-400">Documentos</h1>
              <p className="text-slate-400 mt-1">Generador de contratos de mutuo/préstamo</p>
            </div>
          </div>
        </header>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex gap-4 items-start">
          <AlertCircle className="text-amber-400 shrink-0" size={24} />
          <div>
            <p className="text-amber-200 font-medium mb-2">Servicio no configurado</p>
            <p className="text-slate-300 text-sm mb-4">
              Falta definir la variable de entorno <code className="bg-slate-900 px-2 py-0.5 rounded text-amber-300">NEXT_PUBLIC_AGENT_CONTRATOS_URL</code>
              {' '}apuntando al servicio desplegado del generador de contratos.
            </p>
            <p className="text-slate-400 text-xs">
              Ejemplo: <code className="bg-slate-900 px-2 py-0.5 rounded">https://agente-contratos.onrender.com</code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen text-white">
      <header className="border-b border-slate-800 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FilePlus className="text-amber-400" size={24} />
          <div>
            <h1 className="text-xl font-bold text-amber-400">Documentos</h1>
            <p className="text-slate-500 text-xs">Generador de contratos de mutuo/préstamo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw size={14} />
            Recargar
          </button>
          <a
            href={agentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink size={14} />
            Nueva pestaña
          </a>
        </div>
      </header>
      <iframe
        key={reloadKey}
        src={agentUrl}
        className="flex-1 w-full border-0 bg-white"
        title="Generador de contratos"
        sandbox="allow-forms allow-scripts allow-same-origin allow-downloads allow-popups"
      />
    </div>
  )
}
