'use client'

import { useState } from 'react'
import { Settings, ArrowLeft, User, Lock, Camera, Check, X } from 'lucide-react'
import Link from 'next/link'
import { DEMO_PROPIETARIO_PROFILE } from '@/lib/demo-data/index'

export default function DemoConfiguracionPage() {
  const profile = DEMO_PROPIETARIO_PROFILE

  // Profile state
  const [fullName, setFullName] = useState(profile.full_name)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // No-op in demo mode
    setProfileMessage({ type: 'success', text: 'Perfil actualizado (simulado en modo demo)' })
    setTimeout(() => setProfileMessage(null), 3000)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Todos los campos son requeridos' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    // No-op in demo mode
    setPasswordMessage({ type: 'success', text: 'Contraseña actualizada (simulado en modo demo)' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordMessage(null), 3000)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/demo/propietario"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span>Volver al Panel</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-xl">
            <Settings size={24} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Administra tu perfil y seguridad
            </p>
          </div>
        </div>
      </header>

      {/* Foto de Perfil */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-50 rounded-xl">
            <Camera size={20} className="text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Foto de Perfil</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200">
              <div className="w-full h-full flex items-center justify-center">
                <User size={40} className="text-gray-400" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => alert('Upload de foto no disponible en modo demo')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer transition-colors"
            >
              <Camera size={16} />
              Cambiar foto
            </button>
            <p className="text-xs text-gray-400">JPG, PNG o WebP. Max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Informacion Personal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-50 rounded-xl">
            <User size={20} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Informacion Personal</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Correo electronico
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">El correo no se puede cambiar</p>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Rol
            </label>
            <input
              type="text"
              value={profile.role}
              disabled
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed capitalize"
            />
          </div>

          {profileMessage && (
            <div className={`flex items-center gap-2 text-sm ${profileMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {profileMessage.type === 'success' ? <Check size={14} /> : <X size={14} />}
              {profileMessage.text}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            Guardar cambios
          </button>
        </form>
      </div>

      {/* Cambiar Contraseña */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-50 rounded-xl">
            <Lock size={20} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Contraseña actual
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-400 mt-1">Minimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {passwordMessage && (
            <div className={`flex items-center gap-2 text-sm ${passwordMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {passwordMessage.type === 'success' ? <Check size={14} /> : <X size={14} />}
              {passwordMessage.text}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            Cambiar contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
