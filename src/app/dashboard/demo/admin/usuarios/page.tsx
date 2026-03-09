'use client'

import { useState, useMemo } from 'react'
import { Users, Shield, Search } from 'lucide-react'
import { DEMO_USERS, formatDate } from '@/lib/demo-data'

export default function DemoUsuariosPage() {
  const [search, setSearch] = useState('')

  const usersList = DEMO_USERS

  // Count by role
  const adminCount = usersList.filter(u => u.role === 'admin').length
  const inversorCount = usersList.filter(u => u.role === 'inversionista').length
  const propietarioCount = usersList.filter(u => u.role === 'propietario').length

  // Filter by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return usersList
    const q = search.toLowerCase()
    return usersList.filter(
      u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q)
    )
  }, [usersList, search])

  const getStatusBadge = (status: string) => {
    if (status === 'verified') {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          Verificado
        </span>
      )
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded border bg-amber-500/10 text-amber-400 border-amber-500/30">
        Pendiente
      </span>
    )
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      inversionista: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      propietario: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    }
    const labels: Record<string, string> = {
      admin: 'Admin',
      inversionista: 'Inversionista',
      propietario: 'Propietario',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[role] || 'bg-slate-500/10 text-slate-400'}`}>
        {labels[role] || role}
      </span>
    )
  }

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">Panel de Administracion de Usuarios</h1>
          <p className="text-slate-400 mt-1">
            Bienvenido, Administrador
          </p>
        </div>
        <button
          disabled
          className="px-4 py-2.5 bg-slate-700 text-slate-400 rounded-xl font-semibold cursor-not-allowed opacity-50"
        >
          + Nuevo Usuario
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <Shield size={24} />
            </div>
            <span className="text-slate-400 text-sm">Administradores</span>
          </div>
          <p className="text-3xl font-bold text-white">{adminCount}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <Users size={24} />
            </div>
            <span className="text-slate-400 text-sm">Inversionistas</span>
          </div>
          <p className="text-3xl font-bold text-white">{inversorCount}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
              <Users size={24} />
            </div>
            <span className="text-slate-400 text-sm">Propietarios</span>
          </div>
          <p className="text-3xl font-bold text-white">{propietarioCount}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Listado de Usuarios</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 font-medium py-3 px-4">Nombre</th>
                <th className="text-left text-slate-400 font-medium py-3 px-4">Email</th>
                <th className="text-center text-slate-400 font-medium py-3 px-4">Rol</th>
                <th className="text-center text-slate-400 font-medium py-3 px-4">Estado</th>
                <th className="text-left text-slate-400 font-medium py-3 px-4">Ciudad</th>
                <th className="text-left text-slate-400 font-medium py-3 px-4">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{user.full_name || '-'}</td>
                  <td className="py-3 px-4 text-slate-300">{user.email || '-'}</td>
                  <td className="py-3 px-4 text-center">{getRoleBadge(user.role)}</td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(user.verification_status || 'pending')}</td>
                  <td className="py-3 px-4 text-slate-300">{user.city || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(user.created_at)}</td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
