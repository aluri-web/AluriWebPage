import { Bot } from 'lucide-react'
import { getSolicitudesForAgents } from './actions'
import AgentesPanel from './AgentesPanel'

export default async function AgentesIAPage() {
  const { data: solicitudes } = await getSolicitudesForAgents()

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

      <AgentesPanel solicitudes={solicitudes} />
    </div>
  )
}
