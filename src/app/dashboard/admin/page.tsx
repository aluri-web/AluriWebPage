import { Users, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import { createClient } from '../../../utils/supabase/server'

// Helper para formatear moneda
function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Run all queries in parallel for faster page load
  const [
    { count: totalUsers },
    { count: activeLoans },
    { data: inversionesData },
    { count: defaultedLoans },
    { data: recentInvestments },
  ] = await Promise.all([
    // 1. Usuarios Totales
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    // 2. Créditos Activos
    supabase.from('creditos').select('*', { count: 'exact', head: true }).in('estado', ['activo', 'publicado']),
    // 3. Capital Total
    supabase.from('inversiones').select('monto_invertido'),
    // 4. Créditos En Mora
    supabase.from('creditos').select('*', { count: 'exact', head: true }).eq('en_mora', true),
    // 5. Actividad Reciente
    supabase.from('inversiones').select(`
      id,
      monto_invertido,
      created_at,
      investor:profiles!inversionista_id (full_name, email),
      credito:creditos!credito_id (codigo_credito, ciudad_inmueble)
    `).order('created_at', { ascending: false }).limit(5),
  ])

  const totalCapital = inversionesData?.reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0) || 0

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
          <p className="text-3xl font-bold text-white">{totalUsers ?? 0}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400">
              <FileText size={24} />
            </div>
            <span className="text-slate-400 text-sm">Creditos Activos</span>
          </div>
          <p className="text-3xl font-bold text-white">{activeLoans ?? 0}</p>
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
          <p className="text-3xl font-bold text-white">{defaultedLoans ?? 0}</p>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
        <h2 className="text-xl font-semibold mb-6">Actividad Reciente</h2>
        {recentInvestments && recentInvestments.length > 0 ? (
          <div className="space-y-4">
            {recentInvestments.map((investment) => {
              // Supabase puede devolver objeto o array dependiendo de la relación
              const investorData = investment.investor
              const creditoData = investment.credito

              // Extraer datos del inversor
              const investorName = Array.isArray(investorData)
                ? investorData[0]?.full_name || investorData[0]?.email
                : (investorData as { full_name?: string; email?: string } | null)?.full_name ||
                  (investorData as { full_name?: string; email?: string } | null)?.email

              // Extraer datos del crédito
              const creditoCode = Array.isArray(creditoData)
                ? creditoData[0]?.codigo_credito
                : (creditoData as { codigo_credito?: string } | null)?.codigo_credito

              const creditoCity = Array.isArray(creditoData)
                ? creditoData[0]?.ciudad_inmueble
                : (creditoData as { ciudad_inmueble?: string } | null)?.ciudad_inmueble

              return (
                <div key={investment.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <TrendingUp size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {investorName || 'Usuario'}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Invirtió en {creditoCode || 'Crédito'}
                        {creditoCity ? ` - ${creditoCity}` : ''}
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
              )
            })}
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
