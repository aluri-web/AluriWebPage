import { getInvestorsForSelect, getAllLoansWithDetails } from './actions'
import LoansTable from './LoansTable'
import { FileSpreadsheet, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ColocacionesPage() {
  const [investorsResult, loansResult] = await Promise.all([
    getInvestorsForSelect(),
    getAllLoansWithDetails(),
  ])

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl">
            <FileSpreadsheet size={24} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Colocaciones</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Gestiona todos los creditos registrados
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/admin/colocaciones/nueva-colocacion"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Nueva Colocacion
        </Link>
      </header>

      {/* Table Section */}
      <section>
        <LoansTable loans={loansResult.data} investors={investorsResult.data} />
      </section>
    </div>
  )
}
