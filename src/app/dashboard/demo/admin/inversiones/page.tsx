import { Wallet, Clock, TrendingUp, AlertTriangle, Banknote } from 'lucide-react'
import { DEMO_INVERSIONES, formatCOP, formatDate } from '@/lib/demo-data'

export default function DemoInversionesPage() {
  // Filter pending investments
  const investments = DEMO_INVERSIONES.filter(i => i.estado === 'pendiente')

  // Calculate stats
  const totalPendingAmount = investments.reduce((sum, inv) => sum + inv.monto_invertido, 0)
  const uniqueInvestors = new Set(investments.map(inv => inv.investor_email)).size
  const uniqueLoans = new Set(investments.map(inv => inv.credito_codigo)).size

  const formatCurrency = (amount: number) => formatCOP(amount)

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Gestion de Tesoreria</h1>
        <p className="text-slate-400 mt-2">
          Valida las inversiones pendientes contra el extracto bancario
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Inversiones Pendientes</p>
              <p className="text-3xl font-bold text-white mt-1">{investments.length}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Clock size={24} className="text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Monto Total Pendiente</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(totalPendingAmount)}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Wallet size={24} className="text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Inversionistas Unicos</p>
              <p className="text-3xl font-bold text-white mt-1">{uniqueInvestors}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TrendingUp size={24} className="text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Creditos Involucrados</p>
              <p className="text-3xl font-bold text-white mt-1">{uniqueLoans}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <AlertTriangle size={24} className="text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-400 font-medium">Instrucciones</p>
            <p className="text-slate-400 text-sm mt-1">
              Verifica cada inversion contra el extracto bancario antes de aprobar.
              Al aprobar, el monto se suma al total recaudado del credito.
              Al rechazar, se libera el cupo para otros inversionistas.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {investments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-900 rounded-xl border border-slate-800">
          <Banknote size={48} className="text-slate-700 mb-4" />
          <p className="text-slate-400 text-lg font-medium">No hay inversiones pendientes</p>
          <p className="text-slate-600 text-sm mt-1">Las inversiones apareceran aqui cuando los inversionistas reserven cupo</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">{investments.length} inversiones pendientes</span>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                      Fecha
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                      Inversionista
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                      Cedula
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                      Credito
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                      Monto Invertido
                    </th>
                    <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider px-6 py-4">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {investments.map((investment) => (
                    <tr key={investment.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatDateTime(investment.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {investment.investor_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {investment.investor_email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 font-mono">
                        {investment.investor_cedula || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs font-mono rounded">
                          {investment.credito_codigo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-amber-400">
                          {formatCurrency(investment.monto_invertido)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            disabled
                            className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg opacity-50 cursor-not-allowed"
                            title="No disponible en demo"
                          >
                            <span className="text-xs font-medium">Aprobar</span>
                          </button>
                          <button
                            disabled
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg opacity-50 cursor-not-allowed"
                            title="No disponible en demo"
                          >
                            <span className="text-xs font-medium">Rechazar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
