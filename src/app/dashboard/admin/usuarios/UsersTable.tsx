'use client'

import { useState, useMemo } from 'react'
import { Users } from 'lucide-react'
import EditUserModal, { UserProfile } from './EditUserModal'
import ExportExcelButton from '@/components/dashboard/ExportExcelButton'

interface UsersTableProps {
  users: UserProfile[]
}

export default function UsersTable({ users }: UsersTableProps) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  // Preparar datos para exportar
  const exportData = useMemo(() => users.map(u => ({
    id: u.id,
    nombre: u.full_name || '',
    email: u.email || '',
    rol: u.role,
    estado: u.verification_status || 'pendiente',
    fecha_registro: u.created_at,
  })), [users])

  const exportHeaders = {
    id: 'ID',
    nombre: 'Nombre',
    email: 'Email',
    rol: 'Rol',
    estado: 'Estado',
    fecha_registro: 'Fecha Registro',
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'inversionista':
      case 'inversor':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'propietario':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const getStatusBadgeClass = (status: string | null) => {
    switch (status) {
      case 'verified':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    }
  }

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'verified':
        return 'Verificado'
      case 'rejected':
        return 'Rechazado'
      default:
        return 'Pendiente'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <>
      {users.length > 0 ? (
        <div>
          {/* Header con botón de exportar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">{users.length} usuarios</span>
            <ExportExcelButton
              data={exportData}
              filename="usuarios_aluri"
              sheetName="Usuarios"
              headers={exportHeaders}
            />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-700 uppercase tracking-wider">
                <th className="pb-4 px-2 font-medium">ID</th>
                <th className="pb-4 px-2 font-medium">Nombre</th>
                <th className="pb-4 px-2 font-medium">Email</th>
                <th className="pb-4 px-2 font-medium">Rol</th>
                <th className="pb-4 px-2 font-medium">Estado</th>
                <th className="pb-4 px-2 font-medium">Fecha Registro</th>
                <th className="pb-4 px-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-4 px-2 font-mono text-slate-400 text-xs">
                    {user.id.slice(0, 8)}...
                  </td>
                  <td className="py-4 px-2 font-medium text-white">
                    {user.full_name || 'Sin nombre'}
                  </td>
                  <td className="py-4 px-2 text-slate-300">
                    {user.email || '-'}
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(user.verification_status)}`}>
                      {getStatusLabel(user.verification_status)}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-slate-300">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="py-4 px-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Users size={48} className="mb-4 opacity-50" />
          <p>No se encontraron usuarios.</p>
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  )
}
