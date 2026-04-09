'use client'

import { useState } from 'react'
import {
  KeyRound,
  Copy,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function DemoAccessPage() {
  const [password, setPassword] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(true)

  async function generatePassword() {
    setLoading(true)
    setError(null)
    setCopied(false)

    try {
      const res = await fetch('/api/demo-access', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error generando contraseña')
        return
      }

      setPassword(data.password)
      setGeneratedAt(data.generated_at)
      setShowPassword(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (!password) return
    const text = `Acceso Demo Aluri\nCorreo: demo@aluri.co\nContraseña: ${password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  function copyPasswordOnly() {
    if (!password) return
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <KeyRound size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Acceso Demo</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Genera contraseñas de un solo uso para la cuenta demo
          </p>
        </div>
      </header>

      <div className="max-w-xl space-y-6">
        {/* How it works */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Como funciona</h3>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-amber-400 font-semibold">1.</span>
              Genera una contraseña temporal con el boton de abajo
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 font-semibold">2.</span>
              Comparte las credenciales con el prospecto
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 font-semibold">3.</span>
              Cuando el prospecto hace login, la contraseña se invalida automaticamente
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 font-semibold">4.</span>
              Para el siguiente prospecto, genera una nueva contraseña
            </li>
          </ol>
        </div>

        {/* Generate Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Generar contraseña</h2>
            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded-lg">
              demo@aluri.co
            </span>
          </div>

          {/* Password display */}
          {password && (
            <div className="space-y-3">
              <div className="bg-slate-900 rounded-xl border border-slate-600 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Correo</span>
                </div>
                <p className="text-slate-300 font-mono text-sm">demo@aluri.co</p>

                <div className="flex items-center justify-between mt-4 mb-2">
                  <span className="text-xs text-slate-500">Contraseña (un solo uso)</span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-amber-400 font-mono text-lg tracking-wider">
                  {showPassword ? password : '••••••••'}
                </p>

                {generatedAt && (
                  <p className="text-xs text-slate-600 mt-3">
                    Generada: {new Date(generatedAt).toLocaleString('es-CO')}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
                >
                  {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  {copied ? 'Copiado' : 'Copiar credenciales'}
                </button>
                <button
                  onClick={copyPasswordOnly}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors text-sm"
                  title="Copiar solo contraseña"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generatePassword}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold rounded-xl transition-colors text-sm disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            {password ? 'Generar nueva contraseña' : 'Generar contraseña'}
          </button>

          {/* Warning */}
          {password && (
            <p className="text-xs text-amber-500/70 text-center">
              Esta contraseña se invalidara despues del primer login
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
