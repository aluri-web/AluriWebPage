import { ClipboardList } from 'lucide-react'
import { getSolicitudes } from './actions'
import SolicitudesTable from './SolicitudesTable'

export default async function SolicitudesPage() {
  const { data: solicitudes } = await getSolicitudes()

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <header className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-xl">
          <ClipboardList size={24} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes de Credito</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Revisa y gestiona las solicitudes de los propietarios
          </p>
        </div>
      </header>

      <SolicitudesTable solicitudes={solicitudes} />
    </div>
  )
}
