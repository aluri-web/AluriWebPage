import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function DemoNuevaColocacionPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/demo/admin/colocaciones"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span>Volver a Colocaciones</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">Crear Nueva Colocacion</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Registra un nuevo credito en la plataforma
        </p>
      </header>

      {/* Demo notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8 text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
        <h2 className="text-xl font-semibold text-white mb-2">
          Formulario no disponible en modo demo
        </h2>
        <p className="text-slate-400 max-w-md mx-auto">
          La creacion de nuevas colocaciones requiere acceso completo al sistema.
          En modo demo, puedes explorar las colocaciones existentes con datos de ejemplo.
        </p>
        <Link
          href="/dashboard/demo/admin/colocaciones"
          className="inline-flex items-center gap-2 px-6 py-3 mt-6 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-colors"
        >
          Ver Colocaciones Existentes
        </Link>
      </div>

      {/* Form preview (read-only) */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 opacity-50">
        <h2 className="text-lg font-semibold text-white mb-6">Vista Previa del Formulario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Cedula del Deudor</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Ej: 1020304050
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre del Deudor</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Se autocompleta con la cedula
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Monto Solicitado</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Ej: $150.000.000
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Valor Comercial Inmueble</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Ej: $350.000.000
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Ciudad del Inmueble</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Ej: Bogota
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tasa de Interes (NM %)</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Ej: 1.8%
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Plazo (meses)</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Ej: 12
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">LTV Calculado</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              Se calcula automaticamente
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
