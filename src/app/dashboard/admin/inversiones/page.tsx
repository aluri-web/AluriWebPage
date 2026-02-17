import { getPendingInvestments } from './actions'
import InvestmentsTable from './InvestmentsTable'
import { Wallet, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

export default async function InversionesPage() {
  const { data: investments, error } = await getPendingInvestments()

  // Calculate stats
  const totalPendingAmount = investments.reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0)
  const uniqueInvestors = new Set(investments.map(inv => inv.investor?.email)).size
  const uniqueLoans = new Set(investments.map(inv => inv.credito?.codigo_credito)).size

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Gestión de Tesorería</h1>
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
              <p className="text-slate-500 text-sm">Inversionistas Únicos</p>
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
              <p className="text-slate-500 text-sm">Créditos Involucrados</p>
              <p className="text-3xl font-bold text-white mt-1">{uniqueLoans}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <AlertTriangle size={24} className="text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-400 text-sm">Error al cargar inversiones: {error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-400 font-medium">Instrucciones</p>
            <p className="text-slate-400 text-sm mt-1">
              Verifica cada inversión contra el extracto bancario antes de aprobar.
              Al aprobar, el monto se suma al total recaudado del crédito.
              Al rechazar, se libera el cupo para otros inversionistas.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <InvestmentsTable investments={investments} />
    </div>
  )
}
