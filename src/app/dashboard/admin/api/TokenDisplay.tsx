'use client'

import { useState } from 'react'
import { Copy, Check, Eye, EyeOff, RefreshCw, Key } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface TokenDisplayProps {
  accessToken: string
}

export default function TokenDisplay({ accessToken }: TokenDisplayProps) {
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentToken, setCurrentToken] = useState(accessToken)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const refreshToken = async () => {
    setIsRefreshing(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.refreshSession()
      if (data?.session?.access_token) {
        setCurrentToken(data.session.access_token)
      }
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Mask token for display
  const maskedToken = currentToken
    ? `${currentToken.substring(0, 20)}${'•'.repeat(30)}${currentToken.substring(currentToken.length - 10)}`
    : ''

  // Calculate expiration (JWT tokens typically expire in 1 hour)
  const getTokenExpiry = () => {
    try {
      const payload = JSON.parse(atob(currentToken.split('.')[1]))
      const expDate = new Date(payload.exp * 1000)
      const now = new Date()
      const diffMinutes = Math.round((expDate.getTime() - now.getTime()) / 60000)

      if (diffMinutes <= 0) return 'Expirado'
      if (diffMinutes < 60) return `${diffMinutes} min`
      return `${Math.round(diffMinutes / 60)} horas`
    } catch {
      return 'Desconocido'
    }
  }

  return (
    <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Key size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Token de Acceso</h2>
            <p className="text-slate-400 text-xs">
              Expira en: <span className="text-amber-400">{getTokenExpiry()}</span>
            </p>
          </div>
        </div>
        <button
          onClick={refreshToken}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Renovar
        </button>
      </div>

      {/* Token Display */}
      <div className="bg-slate-900 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <code className="text-sm text-slate-300 font-mono break-all flex-1">
            {showToken ? currentToken : maskedToken}
          </code>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowToken(!showToken)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={showToken ? 'Ocultar token' : 'Mostrar token'}
            >
              {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Copiar token"
            >
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <p className="text-amber-400 text-sm">
          <strong>Importante:</strong> Este token da acceso completo como administrador.
          No lo compartas y renuévalo si sospechas que fue comprometido.
        </p>
      </div>

      {/* Quick Copy for MCP */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <p className="text-slate-400 text-sm mb-2">Copia rápida para .mcp.json:</p>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(`"ALURI_AUTH_TOKEN": "${currentToken}"`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl transition-colors"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copiado!' : 'Copiar línea ALURI_AUTH_TOKEN'}
        </button>
      </div>
    </section>
  )
}
