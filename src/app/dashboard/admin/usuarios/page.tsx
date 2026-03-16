import { createClient } from '../../../../utils/supabase/server'
import { Users, Shield } from 'lucide-react'
import NuevoUsuarioButton from './NuevoUsuarioButton'
import UsersTable from './UsersTable'
import { UserProfile } from './EditUserModal'

export default async function AdminUsuariosPage() {
  const supabase = await createClient()

  // Fetch all users from profiles table
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, verification_status, metadata, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error.message)
  }

  const usersList = (users || []) as UserProfile[]

  // Count by role
  const adminCount = usersList.filter(u => u.role === 'admin').length
  const inversorCount = usersList.filter(u => u.role === 'inversionista' || u.role === 'inversor').length
  const propietarioCount = usersList.filter(u => u.role === 'propietario').length
  const demoCount = usersList.filter(u => u.role === 'demo').length

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">Panel de Administracion de Usuarios</h1>
          <p className="text-slate-400 mt-1">
            Bienvenido, Administrador
          </p>
        </div>
        <NuevoUsuarioButton />
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
              <Users size={24} />
            </div>
            <span className="text-slate-400 text-sm">Demo</span>
          </div>
          <p className="text-3xl font-bold text-white">{demoCount}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-xl font-semibold mb-6">Listado de Usuarios</h2>
        <UsersTable users={usersList} />
      </div>
    </div>
  )
}
