'use client'

import { useState, useMemo } from 'react'
import { Users, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import EditUserModal, { UserProfile } from './EditUserModal'
import ExportExcelButton from '@/components/dashboard/ExportExcelButton'

interface UsersTableProps {
  users: UserProfile[]
}

type SortKey = 'id' | 'full_name' | 'email' | 'role' | 'verification_status' | 'created_at'
type SortDirection = 'asc' | 'desc'

export default function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
        case 'full_name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '')
          break
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '')
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'verification_status':
          comparison = (a.verification_status || '').localeCompare(b.verification_status || '')
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [users, sortKey, sortDirection])

  // Preparar datos para exportar (respeta el orden actual)
  const exportData = useMemo(() => sortedUsers.map(u => ({
    id: u.id,
    nombre: u.full_name || '',
    email: u.email || '',
    rol: u.role,
    estado: u.verification_status || 'pendiente',
    fecha_registro: u.created_at,
  })), [sortedUsers])

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

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown size={14} className="text-slate-600" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-amber-400" />
      : <ChevronDown size={14} className="text-amber-400" />
  }

  const SortableHeader = ({
    columnKey,
    label,
  }: {
    columnKey: SortKey
    label: string
  }) => (
    <th
      className="pb-4 px-2 font-medium cursor-pointer hover:text-slate-200 transition-colors select-none"
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
  )

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
                <SortableHeader columnKey="id" label="ID" />
                <SortableHeader columnKey="full_name" label="Nombre" />
                <SortableHeader columnKey="email" label="Email" />
                <SortableHeader columnKey="role" label="Rol" />
                <SortableHeader columnKey="verification_status" label="Estado" />
                <SortableHeader columnKey="created_at" label="Fecha Registro" />
                <th className="pb-4 px-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => router.push(`/dashboard/admin/usuarios/${user.id}`)}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                >
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
                  <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
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
