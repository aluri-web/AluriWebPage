'use client'

import { useState, useMemo } from 'react'
import { Activity, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { UserSession } from './page'
import ExportExcelButton from '@/components/dashboard/ExportExcelButton'

type SortKey = 'full_name' | 'login_at' | 'logout_at' | 'duration_seconds' | 'logout_reason' | 'role'
type SortDirection = 'asc' | 'desc'

export default function SessionsTable({ sessions }: { sessions: UserSession[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('login_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterUser, setFilterUser] = useState('')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const filteredSessions = useMemo(() => {
    if (!filterUser) return sessions
    const q = filterUser.toLowerCase()
    return sessions.filter(s =>
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    )
  }, [sessions, filterUser])

  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      let comparison = 0
      switch (sortKey) {
        case 'full_name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '')
          break
        case 'login_at':
          comparison = new Date(a.login_at).getTime() - new Date(b.login_at).getTime()
          break
        case 'logout_at':
          comparison = (a.logout_at ? new Date(a.logout_at).getTime() : Infinity) -
                       (b.logout_at ? new Date(b.logout_at).getTime() : Infinity)
          break
        case 'duration_seconds':
          comparison = (a.duration_seconds || 0) - (b.duration_seconds || 0)
          break
        case 'logout_reason':
          comparison = (a.logout_reason || '').localeCompare(b.logout_reason || '')
          break
        case 'role':
          comparison = (a.role || '').localeCompare(b.role || '')
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredSessions, sortKey, sortDirection])

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return '-'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    const h = Math.floor(seconds / 3600)
    const m = Math.round((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const getReasonBadge = (reason: string | null, logoutAt: string | null) => {
    if (!logoutAt) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Activa</span>
    }
    switch (reason) {
      case 'manual':
        return <span className="px-2 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-400 border-blue-500/30">Manual</span>
      case 'timeout':
        return <span className="px-2 py-1 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30">Timeout</span>
      case 'expired':
        return <span className="px-2 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-400 border-red-500/30">Expirada</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium border bg-slate-500/20 text-slate-400 border-slate-500/30">{reason || 'Desconocido'}</span>
    }
  }

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'inversionista':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'propietario':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const exportData = useMemo(() => sortedSessions.map(s => ({
    usuario: s.full_name || '',
    email: s.email || '',
    rol: s.role || '',
    login: s.login_at,
    logout: s.logout_at || '',
    duracion_minutos: s.duration_seconds ? Math.round(s.duration_seconds / 60) : '',
    razon_salida: s.logout_reason || 'activa',
    ip: s.ip_address || '',
  })), [sortedSessions])

  const exportHeaders = {
    usuario: 'Usuario',
    email: 'Email',
    rol: 'Rol',
    login: 'Login',
    logout: 'Logout',
    duracion_minutos: 'Duración (min)',
    razon_salida: 'Razón Salida',
    ip: 'IP',
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ChevronsUpDown size={14} className="text-slate-600" />
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-amber-400" />
      : <ChevronDown size={14} className="text-amber-400" />
  }

  const SortableHeader = ({ columnKey, label }: { columnKey: SortKey; label: string }) => (
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
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
          <span className="text-sm text-slate-400">{sortedSessions.length} sesiones</span>
        </div>
        <ExportExcelButton
          data={exportData}
          filename="sesiones_aluri"
          sheetName="Sesiones"
          headers={exportHeaders}
        />
      </div>

      {sortedSessions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-sm border-b border-slate-700 uppercase tracking-wider">
                <SortableHeader columnKey="full_name" label="Usuario" />
                <SortableHeader columnKey="role" label="Rol" />
                <SortableHeader columnKey="login_at" label="Login" />
                <SortableHeader columnKey="logout_at" label="Logout" />
                <SortableHeader columnKey="duration_seconds" label="Duración" />
                <SortableHeader columnKey="logout_reason" label="Salida" />
                <th className="pb-4 px-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedSessions.map((session) => (
                <tr key={session.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-4 px-2">
                    <div>
                      <span className="font-medium text-white">{session.full_name || 'Sin nombre'}</span>
                      <p className="text-xs text-slate-500">{session.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getRoleBadge(session.role)}`}>
                      {session.role || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-slate-300">
                    {formatDateTime(session.login_at)}
                  </td>
                  <td className="py-4 px-2 text-slate-300">
                    {session.logout_at ? formatDateTime(session.logout_at) : '-'}
                  </td>
                  <td className="py-4 px-2 text-slate-300 font-mono">
                    {formatDuration(session.duration_seconds)}
                  </td>
                  <td className="py-4 px-2">
                    {getReasonBadge(session.logout_reason, session.logout_at)}
                  </td>
                  <td className="py-4 px-2 text-slate-500 text-xs font-mono">
                    {session.ip_address || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Activity size={48} className="mb-4 opacity-50" />
          <p>No se encontraron sesiones.</p>
        </div>
      )}
    </>
  )
}
