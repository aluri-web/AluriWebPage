'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { updateUserProfile } from './actions'

export interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  verification_status: string | null
  created_at: string
  metadata?: {
    telefono?: string
    ciudad?: string
    monto_inversion?: string
    [key: string]: string | undefined
  } | null
}

interface EditUserModalProps {
  user: UserProfile
  onClose: () => void
}

export default function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState(user.full_name || '')
  const [email, setEmail] = useState(user.email || '')
  const [verificationStatus, setVerificationStatus] = useState(user.verification_status || 'pending')
  const [role, setRole] = useState(user.role || 'inversionista')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await updateUserProfile({
        id: user.id,
        full_name: fullName,
        email: email !== user.email ? email : undefined,
        verification_status: verificationStatus,
        role: role
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1000)
      }
    } catch (err) {
      console.error('Error updating user:', err)
      setError('Error al actualizar usuario. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    }
  }

  const metadataLabels: Record<string, string> = {
    telefono: 'Telefono',
    ciudad: 'Ciudad',
    monto_inversion: 'Monto de Inversion',
    monto_disponible: 'Monto Disponible'
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Editar Usuario</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">Usuario actualizado exitosamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Informacion Basica</h3>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                  Correo Electronico
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-1">
                  Rol
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="inversionista">Inversionista</option>
                  <option value="propietario">Propietario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label htmlFor="verificationStatus" className="block text-sm font-medium text-slate-300 mb-1">
                  Estado de Verificacion
                </label>
                <select
                  id="verificationStatus"
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="pending">Pendiente</option>
                  <option value="verified">Verificado</option>
                  <option value="rejected">Rechazado</option>
                </select>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(verificationStatus)}`}>
                    {verificationStatus === 'verified' ? 'Verificado' : verificationStatus === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            {user.metadata && Object.keys(user.metadata).length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Datos Adicionales</h3>
                <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                  {Object.entries(user.metadata).map(([key, value]) => {
                    if (!value) return null
                    return (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{metadataLabels[key] || key}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* User ID and Created At */}
            <div className="space-y-2 pt-4 border-t border-slate-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">ID de Usuario</span>
                <span className="text-slate-500 font-mono text-xs">{user.id}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Fecha de Registro</span>
                <span className="text-slate-500">{new Date(user.created_at).toLocaleDateString('es-CO')}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-semibold rounded-lg transition-colors"
              >
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
