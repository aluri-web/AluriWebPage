import { Code2, ArrowLeft, Key, Copy, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

// Fake masked API keys
const DEMO_API_KEYS = [
  {
    id: 'key-001',
    name: 'Production API Key',
    key: 'aluri_prod_sk_••••••••••••••••••••••4f8a',
    created: '15 ene 2024',
    lastUsed: '09 mar 2026',
    status: 'active',
  },
  {
    id: 'key-002',
    name: 'Development API Key',
    key: 'aluri_dev_sk_••••••••••••••••••••••b2c1',
    created: '20 feb 2024',
    lastUsed: '05 mar 2026',
    status: 'active',
  },
  {
    id: 'key-003',
    name: 'MCP Server Key',
    key: 'aluri_mcp_sk_••••••••••••••••••••••9d3e',
    created: '01 mar 2024',
    lastUsed: '08 mar 2026',
    status: 'active',
  },
]

function EndpointItem({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColor = method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'

  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`px-2 py-0.5 text-xs font-mono font-semibold rounded ${methodColor}`}>
        {method}
      </span>
      <code className="text-slate-300 text-sm font-mono">{path}</code>
      <span className="text-slate-500 text-sm">&mdash; {description}</span>
    </div>
  )
}

export default function DemoApiPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/demo/admin"
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
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">API Keys</h2>
          </div>
          <button
            disabled
            className="px-4 py-2 bg-slate-700 text-slate-400 rounded-xl text-sm font-medium cursor-not-allowed opacity-50"
          >
            + Crear Key
          </button>
        </div>

        <div className="space-y-3">
          {DEMO_API_KEYS.map(apiKey => (
            <div key={apiKey.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{apiKey.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-xs text-slate-400 font-mono">{apiKey.key}</code>
                  <span className="px-2 py-0.5 text-xs rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {apiKey.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Creada: {apiKey.created} | Ultimo uso: {apiKey.lastUsed}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled
                  className="p-2 text-slate-600 cursor-not-allowed"
                  title="No disponible en demo"
                >
                  <Copy size={16} />
                </button>
                <button
                  disabled
                  className="p-2 text-slate-600 cursor-not-allowed"
                  title="No disponible en demo"
                >
                  <EyeOff size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400">
            La gestion de API Keys no esta disponible en modo demo.
          </p>
        </div>
      </section>

      {/* Token Section (JWT) */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Token de Sesion (JWT)</h2>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <code className="text-xs text-slate-500 font-mono break-all">
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXItaWQiLCJlbWFpbCI6ImNhcmxvcy5yb2RyaWd1ZXpAYWx1cmkuY28iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDk5MjAwMDAsImV4cCI6MTcwOTkyMzYwMH0.••••••••••••••••••••••••••••
          </code>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Este es un token de ejemplo. En produccion, usa una API Key en lugar del JWT.
        </p>
      </section>

      {/* API Documentation */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Endpoints Disponibles</h2>
        <div className="space-y-3">
          <EndpointItem
            method="GET"
            path="/api/creditos"
            description="Lista todos los creditos"
          />
          <EndpointItem
            method="GET"
            path="/api/pagos?credito_id=X"
            description="Historial de pagos de un credito"
          />
          <EndpointItem
            method="POST"
            path="/api/pagos"
            description="Registrar un nuevo pago"
          />
          <EndpointItem
            method="GET"
            path="/api/pagos/distribucion?credito_id=X"
            description="Distribucion a inversionistas"
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
