import { createClient } from '../../../../utils/supabase/server'
import { BarChart3, Users, TrendingUp, Target, Activity as ActivityIcon } from 'lucide-react'
import ActivityDashboard from './ActivityDashboard'

export interface UserEvent {
  id: number
  user_id: string | null
  role: string | null
  event: string
  source: string
  metadata: Record<string, unknown>
  path: string | null
  created_at: string
}

export interface ActivityStats {
  dau: number
  wau: number
  mau: number
  dauByRole: Record<string, number>
  wauByRole: Record<string, number>
  mauByRole: Record<string, number>
}

export interface TopUser {
  user_id: string
  full_name: string | null
  email: string | null
  role: string | null
  event_count: number
  last_event_at: string
}

export interface EventVolume {
  event: string
  count: number
}

export interface FunnelStep {
  label: string
  users: number
  rate: number  // % of previous step
}

export default async function ActividadPage() {
  const supabase = await createClient()

  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Últimos 30 días de eventos (suficiente para todas las vistas)
  const { data: allEvents } = await supabase
    .from('user_events')
    .select('user_id, role, event, source, created_at, metadata')
    .gte('created_at', monthAgo)
    .order('created_at', { ascending: false })
    .limit(10000)

  const events = (allEvents || []) as Array<Pick<UserEvent, 'user_id' | 'role' | 'event' | 'source' | 'created_at' | 'metadata'>>

  // ── Stats DAU/WAU/MAU ────────────────────────────────────────
  const uniqueBy = (list: typeof events, since: string) => {
    const set = new Set<string>()
    list.forEach(e => {
      if (e.user_id && e.created_at >= since) set.add(e.user_id)
    })
    return set.size
  }

  const uniqueByRole = (list: typeof events, since: string) => {
    const map: Record<string, Set<string>> = {}
    list.forEach(e => {
      if (e.user_id && e.created_at >= since) {
        const r = e.role || 'sin_rol'
        if (!map[r]) map[r] = new Set()
        map[r].add(e.user_id)
      }
    })
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.size]))
  }

  const stats: ActivityStats = {
    dau: uniqueBy(events, dayAgo),
    wau: uniqueBy(events, weekAgo),
    mau: uniqueBy(events, monthAgo),
    dauByRole: uniqueByRole(events, dayAgo),
    wauByRole: uniqueByRole(events, weekAgo),
    mauByRole: uniqueByRole(events, monthAgo),
  }

  // ── Top 10 usuarios más activos (últimos 30 días) ────────────
  const userEventCounts = new Map<string, { count: number; last: string; role: string | null }>()
  events.forEach(e => {
    if (!e.user_id) return
    const existing = userEventCounts.get(e.user_id)
    if (existing) {
      existing.count += 1
      if (e.created_at > existing.last) existing.last = e.created_at
    } else {
      userEventCounts.set(e.user_id, { count: 1, last: e.created_at, role: e.role })
    }
  })

  const topUserIds = Array.from(userEventCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id]) => id)

  const { data: topProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', topUserIds)

  const profileMap = new Map((topProfiles || []).map(p => [p.id, p]))

  const topUsers: TopUser[] = topUserIds.map(id => {
    const p = profileMap.get(id)
    const e = userEventCounts.get(id)!
    return {
      user_id: id,
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
      role: p?.role ?? e.role ?? null,
      event_count: e.count,
      last_event_at: e.last,
    }
  })

  // ── Volumen por tipo de evento (últimos 30 días) ─────────────
  const eventCounts = new Map<string, number>()
  events.forEach(e => {
    eventCounts.set(e.event, (eventCounts.get(e.event) ?? 0) + 1)
  })
  const eventVolume: EventVolume[] = Array.from(eventCounts.entries())
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)

  // ── Funnel inversionista: marketplace → detalle → inversión ──
  const inversionistaEvents = events.filter(e => e.role === 'inversionista')
  const funnelInv = (() => {
    const usersAtStep = (ev: string) => new Set(
      inversionistaEvents.filter(e => e.event === ev && e.user_id).map(e => e.user_id!)
    )
    const s1 = usersAtStep('ver_marketplace')
    const s2 = usersAtStep('ver_credito_detalle')
    const s3 = usersAtStep('inversion_completada')
    const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0
    const steps: FunnelStep[] = [
      { label: 'Ver marketplace', users: s1.size, rate: 100 },
      { label: 'Ver detalle crédito', users: s2.size, rate: pct(s2.size, s1.size) },
      { label: 'Inversión completada', users: s3.size, rate: pct(s3.size, s2.size) },
    ]
    return steps
  })()

  // ── Funnel propietario: solicitud iniciada → enviada → aprobada
  const propietarioEvents = events.filter(e => e.role === 'propietario')
  const { data: solicitudesAprobadas } = await supabase
    .from('solicitudes_credito')
    .select('solicitante_id')
    .eq('estado', 'aprobada')
    .gte('created_at', monthAgo)

  const funnelProp = (() => {
    const usersAtEvent = (ev: string) => new Set(
      propietarioEvents.filter(e => e.event === ev && e.user_id).map(e => e.user_id!)
    )
    const s1 = usersAtEvent('solicitud_iniciada')
    const s2 = usersAtEvent('solicitud_enviada')
    const s3 = new Set((solicitudesAprobadas || []).map(s => s.solicitante_id as string))
    const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 1000) / 10 : 0
    const steps: FunnelStep[] = [
      { label: 'Solicitud iniciada', users: s1.size, rate: 100 },
      { label: 'Solicitud enviada', users: s2.size, rate: pct(s2.size, s1.size) },
      { label: 'Solicitud aprobada', users: s3.size, rate: pct(s3.size, s2.size) },
    ]
    return steps
  })()

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-amber-400" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Actividad de la Plataforma</h1>
            <p className="text-slate-400 mt-1">
              Métricas de uso por inversionistas y propietarios (últimos 30 días)
            </p>
          </div>
        </div>
      </header>

      {/* Stats Cards DAU/WAU/MAU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon={ActivityIcon} label="DAU (24h)" value={stats.dau} byRole={stats.dauByRole} color="emerald" />
        <StatCard icon={Users} label="WAU (7d)" value={stats.wau} byRole={stats.wauByRole} color="blue" />
        <StatCard icon={TrendingUp} label="MAU (30d)" value={stats.mau} byRole={stats.mauByRole} color="amber" />
      </div>

      <ActivityDashboard
        topUsers={topUsers}
        eventVolume={eventVolume}
        funnelInv={funnelInv}
        funnelProp={funnelProp}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  byRole,
  color
}: {
  icon: typeof Users
  label: string
  value: number
  byRole: Record<string, number>
  color: 'emerald' | 'blue' | 'amber'
}) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }
  return (
    <div className={`rounded-2xl border p-6 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium opacity-80">{label}</span>
        <Icon size={20} />
      </div>
      <div className="text-4xl font-bold mb-3">{value}</div>
      <div className="space-y-1 text-xs opacity-75">
        {Object.entries(byRole).map(([role, n]) => (
          <div key={role} className="flex justify-between">
            <span className="capitalize">{role}</span>
            <span>{n}</span>
          </div>
        ))}
        {Object.keys(byRole).length === 0 && (
          <div className="text-slate-500">Sin datos</div>
        )}
      </div>
    </div>
  )
}
