import { Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DEMO_ADMIN_PROFILE, DEMO_TASAS } from '@/lib/demo-data'

export default function DemoConfiguracionPage() {
  const profile = DEMO_ADMIN_PROFILE
  const tasas = DEMO_TASAS

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/demo/admin"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span>Volver al Panel</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-500/10 rounded-xl">
            <Settings size={24} className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Configuracion</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Administra tu perfil, seguridad y tasas oficiales
            </p>
          </div>
        </div>
      </header>

      {/* Profile Section (read-only) */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Perfil del Administrador</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre completo</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm">
              {profile.full_name}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Correo electronico</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm">
              {profile.email}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Telefono</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm">
              {profile.phone}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-400">
            La edicion de perfil no esta disponible en modo demo.
          </p>
        </div>
      </section>

      {/* Security Section (read-only) */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Seguridad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Contrasena actual</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-500 text-sm">
              ••••••••••
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nueva contrasena</label>
            <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-600 text-sm">
              No disponible en demo
            </div>
          </div>
        </div>
      </section>

      {/* Tasas Oficiales */}
      <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Tasas y Comisiones Oficiales</h2>
          <button
            disabled
            className="px-4 py-2 bg-slate-700 text-slate-400 rounded-xl text-sm font-medium cursor-not-allowed opacity-50"
          >
            + Nueva Tasa
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left text-slate-400 font-medium py-3 px-4">Nombre</th>
                <th className="text-left text-slate-400 font-medium py-3 px-4">Tipo</th>
                <th className="text-right text-slate-400 font-medium py-3 px-4">Valor</th>
                <th className="text-left text-slate-400 font-medium py-3 px-4">Descripcion</th>
                <th className="text-center text-slate-400 font-medium py-3 px-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tasas.map(tasa => (
                <tr key={tasa.id} className="border-b border-slate-700/50">
                  <td className="py-3 px-4 text-white font-medium">{tasa.nombre}</td>
                  <td className="py-3 px-4 text-slate-300 capitalize">{tasa.tipo}</td>
                  <td className="py-3 px-4 text-right text-teal-400 font-medium">
                    {tasa.tipo === 'porcentaje' ? `${tasa.valor}%` : tasa.valor}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{tasa.descripcion}</td>
                  <td className="py-3 px-4 text-center">
                    {tasa.activa ? (
                      <span className="px-2 py-1 text-xs font-medium rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Activa
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded border bg-slate-500/10 text-slate-400 border-slate-500/30">
                        Inactiva
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
