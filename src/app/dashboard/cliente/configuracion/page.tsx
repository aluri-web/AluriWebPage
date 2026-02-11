'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/app/actions/change-password'
import { Lock, CheckCircle, XCircle } from 'lucide-react'

export default function ConfiguracionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        // Validation
        if (passwords.new.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres')
            return
        }

        if (passwords.new !== passwords.confirm) {
            setError('Las contraseñas nuevas no coinciden')
            return
        }

        if (passwords.current === passwords.new) {
            setError('La nueva contraseña debe ser diferente a la actual')
            return
        }

        setLoading(true)

        const result = await changePassword(passwords.current, passwords.new)

        setLoading(false)

        if (result.success) {
            setSuccess(true)
            setPasswords({ current: '', new: '', confirm: '' })
            setTimeout(() => {
                router.refresh()
            }, 2000)
        } else {
            setError(result.error || 'Error al cambiar contraseña')
        }
    }

    return (
        <div className="p-6 lg:p-8 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-500/10 rounded-xl">
                    <Lock size={24} className="text-teal-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Configuración</h1>
                    <p className="text-slate-400 text-sm">Gestiona la seguridad de tu cuenta</p>
                </div>
            </div>

            {/* Password Change Form */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                    <h2 className="font-semibold text-white">Cambiar Contraseña</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Actualiza tu contraseña para mantener tu cuenta segura
                    </p>
                </div>

                <div className="p-6">
                    {success && (
                        <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-3 text-emerald-400">
                            <CheckCircle size={20} />
                            <span>Contraseña actualizada exitosamente</span>
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
                                Contraseña Actual
                            </label>
                            <input
                                type="password"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                required
                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                placeholder="Ingresa tu contraseña actual"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1.5">
                                Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                required
                                minLength={8}
                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                placeholder="Mínimo 8 caracteres"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Usa una combinación de letras, números y símbolos
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1.5">
                                Confirmar Nueva Contraseña
                            </label>
                            <input
                                type="password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                required
                                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                placeholder="Repite la nueva contraseña"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 text-black disabled:text-slate-500 font-semibold rounded-xl transition-colors"
                        >
                            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
