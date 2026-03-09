import { ClipboardList } from 'lucide-react'
import { getMisSolicitudes } from './actions'
import SolicitudCard from './SolicitudCard'

export default async function MisSolicitudesPage() {
  const { data: solicitudes } = await getMisSolicitudes()

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <ClipboardList size={24} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Solicitudes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Revisa el estado de tus solicitudes y completa documentos pendientes
          </p>
        </div>
      </header>

      {solicitudes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
          <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium">No tienes solicitudes registradas</p>
          <p className="text-sm text-gray-400 mt-2">
            Puedes crear una nueva solicitud desde &quot;Solicitar Credito&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {solicitudes.map(sol => (
            <SolicitudCard key={sol.id} solicitud={sol} />
          ))}
        </div>
      )}
    </div>
  )
}
