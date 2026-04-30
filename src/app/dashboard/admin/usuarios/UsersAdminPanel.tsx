'use client'

import { useMemo, useState } from 'react'
import { Users, Shield, Search, X } from 'lucide-react'
import UsersTable from './UsersTable'
import { UserProfile } from './EditUserModal'

interface UsersAdminPanelProps {
  users: UserProfile[]
}

type RoleFilter = 'admin' | 'inversionista' | 'propietario' | 'demo' | null

const FILTER_MATCHES: Record<Exclude<RoleFilter, null>, (role: string) => boolean> = {
  admin: r => r === 'admin',
  inversionista: r => r === 'inversionista' || r === 'inversor',
  propietario: r => r === 'propietario',
  demo: r => r === 'demo',
}

export default function UsersAdminPanel({ users }: UsersAdminPanelProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const counts = useMemo(() => ({
    admin: users.filter(u => u.role === 'admin').length,
    inversionista: users.filter(u => u.role === 'inversionista' || u.role === 'inversor').length,
    propietario: users.filter(u => u.role === 'propietario').length,
    demo: users.filter(u => u.role === 'demo').length,
  }), [users])

  const filteredUsers = useMemo(() => {
    let list = users
    if (roleFilter) {
      const match = FILTER_MATCHES[roleFilter]
      list = list.filter(u => match(u.role))
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(u => {
        const haystack = [
          u.full_name,
          u.email,
          u.role,
          u.verification_status,
          u.metadata?.telefono,
          u.metadata?.ciudad,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    return list
  }, [users, roleFilter, searchQuery])

  const toggleRole = (role: Exclude<RoleFilter, null>) => {
    setRoleFilter(prev => (prev === role ? null : role))
  }

  return (
    <>
      {/* Stats Cards (clickable filters) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <RoleCard
          icon={<Shield size={24} />}
          label="Administradores"
          count={counts.admin}
          accent="emerald"
          active={roleFilter === 'admin'}
          onClick={() => toggleRole('admin')}
        />
        <RoleCard
          icon={<Users size={24} />}
          label="Inversionistas"
          count={counts.inversionista}
          accent="emerald"
          active={roleFilter === 'inversionista'}
          onClick={() => toggleRole('inversionista')}
        />
        <RoleCard
          icon={<Users size={24} />}
          label="Propietarios"
          count={counts.propietario}
          accent="blue"
          active={roleFilter === 'propietario'}
          onClick={() => toggleRole('propietario')}
        />
        <RoleCard
          icon={<Users size={24} />}
          label="Demo"
          count={counts.demo}
          accent="purple"
          active={roleFilter === 'demo'}
          onClick={() => toggleRole('demo')}
        />
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Listado de Usuarios</h2>
            {roleFilter && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                Filtrado: {roleFilter}
                <button
                  onClick={() => setRoleFilter(null)}
                  className="hover:text-white"
                  title="Limpiar filtro de rol"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <div className="relative flex-1 sm:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email, rol o estado..."
              className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                title="Limpiar busqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <UsersTable users={filteredUsers} />
      </div>
    </>
  )
}

interface RoleCardProps {
  icon: React.ReactNode
  label: string
  count: number
  accent: 'emerald' | 'blue' | 'purple'
  active: boolean
  onClick: () => void
}

function RoleCard({ icon, label, count, accent, active, onClick }: RoleCardProps) {
  const accentColor: Record<RoleCardProps['accent'], string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }
  const ringActive: Record<RoleCardProps['accent'], string> = {
    emerald: 'border-emerald-500/60 ring-2 ring-emerald-500/30',
    blue: 'border-blue-500/60 ring-2 ring-blue-500/30',
    purple: 'border-purple-500/60 ring-2 ring-purple-500/30',
  }

  return (
    <button
      onClick={onClick}
      className={`text-left bg-slate-800 p-6 rounded-2xl border transition-all hover:border-slate-600 ${
        active ? ringActive[accent] : 'border-slate-700'
      }`}
    >
      <div className="flex items-center gap-4 mb-2">
        <div className={`p-3 rounded-full ${accentColor[accent]}`}>
          {icon}
        </div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{count}</p>
    </button>
  )
}
