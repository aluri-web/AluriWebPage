import { createClient } from '../../../../utils/supabase/server'
import { Activity, Clock, LogIn, LogOut } from 'lucide-react'
import SessionsTable from './SessionsTable'

export interface UserSession {
  id: string
  user_id: string
  login_at: string
  logout_at: string | null
  duration_seconds: number | null
  logout_reason: string | null
  ip_address: string | null
  user_agent: string | null
  full_name: string | null
  email: string | null
  role: string | null
}

export default async function AdminSesionesPage() {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('user_sessions')
    .select(`
      id,
      user_id,
      login_at,
      logout_at,
      duration_seconds,
      logout_reason,
      ip_address,
      user_agent
    `)
    .order('login_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching sessions:', error.message)
  }

  // Fetch profiles for user names
  const userIds = [...new Set((sessions || []).map(s => s.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles || []).map(p => [p.id, p])
  )

  const sessionsList: UserSession[] = (sessions || []).map(s => ({
    ...s,
    full_name: profileMap.get(s.user_id)?.full_name || null,
    email: profileMap.get(s.user_id)?.email || null,
    role: profileMap.get(s.user_id)?.role || null,
  }))

  // Stats
  const activeSessions = sessionsList.filter(s => !s.logout_at).length
  const todaySessions = sessionsList.filter(s => {
    const loginDate = new Date(s.login_at).toDateString()
    return loginDate === new Date().toDateString()
  }).length
  const avgDuration = sessionsList
    .filter(s => s.duration_seconds && s.duration_seconds > 0)
    .reduce((acc, s, _, arr) => acc + (s.duration_seconds || 0) / arr.length, 0)
  const timeoutCount = sessionsList.filter(s => s.logout_reason === 'timeout').length

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-emerald-400">Sesiones de Usuarios</h1>
        <p className="text-slate-400 mt-1">
          Historial de acceso a la plataforma
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <Activity size={24} />
            </div>
            <span className="text-slate-400 text-sm">Activas ahora</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeSessions}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
              <LogIn size={24} />
            </div>
            <span className="text-slate-400 text-sm">Hoy</span>
          </div>
          <p className="text-3xl font-bold text-white">{todaySessions}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-400">
              <Clock size={24} />
            </div>
            <span className="text-slate-400 text-sm">Duración promedio</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {avgDuration > 0 ? `${Math.round(avgDuration / 60)}m` : '-'}
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-500/10 rounded-full text-red-400">
              <LogOut size={24} />
            </div>
            <span className="text-slate-400 text-sm">Timeouts</span>
          </div>
          <p className="text-3xl font-bold text-white">{timeoutCount}</p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-xl font-semibold mb-6">Historial de Sesiones</h2>
        <SessionsTable sessions={sessionsList} />
      </div>
    </div>
  )
}
