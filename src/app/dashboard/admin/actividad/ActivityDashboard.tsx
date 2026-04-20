'use client'

import { useState } from 'react'
import { Target, TrendingUp, Users } from 'lucide-react'
import type { TopUser, EventVolume, FunnelStep } from './page'

interface Props {
  topUsers: TopUser[]
  eventVolume: EventVolume[]
  funnelInv: FunnelStep[]
  funnelProp: FunnelStep[]
}

export default function ActivityDashboard({ topUsers, eventVolume, funnelInv, funnelProp }: Props) {
  const [tab, setTab] = useState<'top' | 'volume' | 'funnels'>('top')

  return (
    <div className="space-y-8">
      <div className="flex gap-2 border-b border-slate-800">
        <TabButton active={tab === 'top'} onClick={() => setTab('top')}>
          <Users size={16} /> Top usuarios
        </TabButton>
        <TabButton active={tab === 'volume'} onClick={() => setTab('volume')}>
          <TrendingUp size={16} /> Volumen de eventos
        </TabButton>
        <TabButton active={tab === 'funnels'} onClick={() => setTab('funnels')}>
          <Target size={16} /> Funnels
        </TabButton>
      </div>

      {tab === 'top' && <TopUsersTable users={topUsers} />}
      {tab === 'volume' && <EventVolumeChart data={eventVolume} />}
      {tab === 'funnels' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Funnel title="Inversionistas" steps={funnelInv} />
          <Funnel title="Propietarios" steps={funnelProp} />
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-amber-400 text-amber-400'
          : 'border-transparent text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function TopUsersTable({ users }: { users: TopUser[] }) {
  if (users.length === 0) {
    return <EmptyState message="Sin actividad registrada en los últimos 30 días" />
  }
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/50">
          <tr className="text-left text-slate-400">
            <th className="px-6 py-3 font-medium">#</th>
            <th className="px-6 py-3 font-medium">Usuario</th>
            <th className="px-6 py-3 font-medium">Rol</th>
            <th className="px-6 py-3 font-medium text-right">Eventos</th>
            <th className="px-6 py-3 font-medium">Última actividad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {users.map((u, i) => (
            <tr key={u.user_id} className="hover:bg-slate-800/30">
              <td className="px-6 py-3 text-slate-500">{i + 1}</td>
              <td className="px-6 py-3">
                <div className="font-medium text-white">{u.full_name || '—'}</div>
                <div className="text-xs text-slate-500">{u.email || u.user_id.slice(0, 8)}</div>
              </td>
              <td className="px-6 py-3">
                <RoleBadge role={u.role} />
              </td>
              <td className="px-6 py-3 text-right font-mono text-amber-400">{u.event_count}</td>
              <td className="px-6 py-3 text-slate-400 text-xs">
                {new Date(u.last_event_at).toLocaleString('es-CO')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventVolumeChart({ data }: { data: EventVolume[] }) {
  if (data.length === 0) {
    return <EmptyState message="Sin eventos registrados" />
  }
  const max = Math.max(...data.map(d => d.count))
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Eventos disparados (últimos 30 días)</h3>
      <div className="space-y-3">
        {data.map(d => (
          <div key={d.event}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300 font-mono">{d.event}</span>
              <span className="text-amber-400 font-medium">{d.count}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Funnel({ title, steps }: { title: string; steps: FunnelStep[] }) {
  const max = Math.max(...steps.map(s => s.users), 1)
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Funnel — {title}</h3>
      <div className="space-y-3">
        {steps.map((s, i) => {
          const width = (s.users / max) * 100
          return (
            <div key={s.label}>
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-slate-300">{s.label}</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">{s.users}</span>
                  {i > 0 && (
                    <span className={`ml-2 text-xs font-medium ${
                      s.rate >= 50 ? 'text-emerald-400' : s.rate >= 20 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {s.rate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-slate-800 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-lg transition-all"
                  style={{ width: `${Math.max(width, 2)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string | null }) {
  const colors: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    propietario: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    inversionista: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  const cls = role && colors[role] ? colors[role] : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${cls}`}>
      {role || 'sin rol'}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
      <p className="text-slate-400">{message}</p>
    </div>
  )
}
