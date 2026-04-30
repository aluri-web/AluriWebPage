import { createClient } from '../../../../utils/supabase/server'
import NuevoUsuarioButton from './NuevoUsuarioButton'
import UsersAdminPanel from './UsersAdminPanel'
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

      <UsersAdminPanel users={usersList} />
    </div>
  )
}
