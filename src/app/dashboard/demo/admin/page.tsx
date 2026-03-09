import { Users, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import {
  DEMO_USERS,
  DEMO_CREDITOS,
  DEMO_INVERSIONES,
  formatCOP,
} from '@/lib/demo-data'

export default function DemoAdminDashboard() {
  // Compute stats from fake data
  const totalUsers = DEMO_USERS.length
  const activeCredits = DEMO_CREDITOS.filter(c => ['activo', 'publicado'].includes(c.estado)).length
  const totalCapital = DEMO_INVERSIONES
    .filter(i => i.estado === 'activo')
    .reduce((sum, i) => sum + i.monto_invertido, 0)
  const creditosEnMora = DEMO_CREDITOS.filter(c => c.en_mora).length

  // Recent investments (last 5)
  const recentInvestments = DEMO_INVERSIONES
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-emerald-400">Panel de Administracion</h1>
        <p className="text-slate-400 mt-1">
          Bienvenido, Administrador
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <Users size={24} />
            </div>
            <span className="text-slate-400 text-sm">Usuarios Totales</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalUsers}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <FileText size={24} />
            </div>
            <span className="text-slate-400 text-sm">Creditos Activos</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeCredits}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
              <TrendingUp size={24} />
            </div>
            <span className="text-slate-400 text-sm">Capital Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCOP(totalCapital)}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-red-500/10 rounded-full text-red-400">
              <AlertCircle size={24} />
            </div>
            <span className="text-slate-400 text-sm">En Mora</span>
          </div>
          <p className="text-3xl font-bold text-white">{creditosEnMora}</p>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-xl font-semibold mb-6">Actividad Reciente</h2>
        {recentInvestments.length > 0 ? (
          <div className="space-y-4">
            {recentInvestments.map((investment) => {
              const relatedCredito = DEMO_CREDITOS.find(c => c.id === investment.credito_id)
              const creditoCiudad = relatedCredito?.ciudad_inmueble || ''
              return (
              <div key={investment.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <TrendingUp size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {investment.investor_name}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Invirtio en {investment.credito_codigo}
                      {creditoCiudad ? ` - ${creditoCiudad}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold">{formatCOP(investment.monto_invertido)}</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(investment.created_at).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <p>No hay actividad reciente</p>
          </div>
        )}
      </div>
    </div>
  )
}
