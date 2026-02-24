import { Code2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TokenDisplay from './TokenDisplay'
import ApiKeyManager from './ApiKeyManager'

export default async function APIPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login/admin')
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span>Volver al Panel</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl">
            <Code2 size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">API & Integraciones</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Token de acceso para MCP y APIs externas
            </p>
          </div>
        </div>
      </header>

      {/* API Keys Section */}
      <ApiKeyManager />

      {/* Token Section (JWT) */}
      <TokenDisplay accessToken={session.access_token} />

      {/* API Documentation */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Endpoints Disponibles</h2>
        <div className="space-y-3">
          <EndpointItem
            method="GET"
            path="/api/creditos"
            description="Lista todos los créditos"
          />
          <EndpointItem
            method="GET"
            path="/api/pagos?credito_id=X"
            description="Historial de pagos de un crédito"
          />
          <EndpointItem
            method="POST"
            path="/api/pagos"
            description="Registrar un nuevo pago"
          />
          <EndpointItem
            method="GET"
            path="/api/pagos/distribucion?credito_id=X"
            description="Distribución a inversionistas"
          />
          <EndpointItem
            method="GET"
            path="/api/inversionistas"
            description="Lista de inversionistas"
          />
          <EndpointItem
            method="GET"
            path="/api/propietarios"
            description="Lista de propietarios/deudores"
          />
          <EndpointItem
            method="GET"
            path="/api/usuarios"
            description="Lista de usuarios del sistema"
          />
        </div>
      </section>

      {/* MCP Configuration */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Configuracion MCP</h2>
        <p className="text-slate-400 text-sm mb-4">
          Copia esta configuracion en tu archivo <code className="text-amber-400">claude_desktop_config.json</code> para usar las herramientas de Aluri con Claude.
          <br />
          <span className="text-emerald-400">Recomendado:</span> Usa una API Key en lugar del JWT para evitar expiraciones.
        </p>
        <pre className="bg-slate-900 rounded-xl p-4 text-sm text-slate-300 overflow-x-auto">
{`{
  "mcpServers": {
    "aluri": {
      "command": "node",
      "args": ["./mcp-payments-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://aluri.co/api",
        "ALURI_API_KEY": "<tu-api-key-aqui>"
      }
    }
  }
}`}
        </pre>
      </section>
    </div>
  )
}

function EndpointItem({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColor = method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'

  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`px-2 py-0.5 text-xs font-mono font-semibold rounded ${methodColor}`}>
        {method}
      </span>
      <code className="text-slate-300 text-sm font-mono">{path}</code>
      <span className="text-slate-500 text-sm">— {description}</span>
    </div>
  )
}
