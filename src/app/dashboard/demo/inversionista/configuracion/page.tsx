'use client'

import { useState } from 'react'
import { Lock, CheckCircle, XCircle } from 'lucide-react'

export default function DemoConfiguracionPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (passwords.new.length < 8) {
      setError('La nueva contrasena debe tener al menos 8 caracteres')
      return
    }

    if (passwords.new !== passwords.confirm) {
      setError('Las contrasenas nuevas no coinciden')
      return
    }

    if (passwords.current === passwords.new) {
      setError('La nueva contrasena debe ser diferente a la actual')
      return
    }

    // Demo: just show success
    setSuccess(true)
    setPasswords({ current: '', new: '', confirm: '' })
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-teal-500/10 rounded-xl">
          <Lock size={24} className="text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configuracion</h1>
          <p className="text-slate-400 text-sm">
            Gestiona la seguridad de tu cuenta
          </p>
        </div>
      </div>

      {/* Password Change Form */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Cambiar Contrasena</h2>
          <p className="text-sm text-slate-400 mt-1">
            Actualiza tu contrasena para mantener tu cuenta segura
          </p>
        </div>

        <div className="p-6">
          {success && (
            <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-400">
              <CheckCircle size={20} />
              <span>Contrasena actualizada exitosamente (simulado)</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
              <XCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Contrasena Actual
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                required
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                placeholder="Ingresa tu contrasena actual"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Nueva Contrasena
              </label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                required
                minLength={8}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                placeholder="Minimo 8 caracteres"
              />
              <p className="text-xs text-slate-500 mt-1">
                Usa una combinacion de letras, numeros y simbolos
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Confirmar Nueva Contrasena
              </label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                required
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                placeholder="Repite la nueva contrasena"
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-colors"
            >
              Cambiar Contrasena
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
