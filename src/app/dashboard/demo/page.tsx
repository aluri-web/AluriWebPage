import Link from 'next/link'
import { Shield, Home, TrendingUp } from 'lucide-react'

const dashboards = [
  {
    title: 'Admin',
    description: 'Gestiona usuarios, inversiones, colocaciones y configuraciones del sistema.',
    href: '/dashboard/demo/admin',
    icon: Shield,
    color: 'amber',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    iconClass: 'text-amber-500',
    hoverClass: 'hover:border-amber-500/40 hover:bg-amber-500/5',
  },
  {
    title: 'Propietario',
    description: 'Administra creditos, solicitudes y el estado financiero de tus propiedades.',
    href: '/dashboard/demo/propietario',
    icon: Home,
    color: 'emerald',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    iconClass: 'text-emerald-500',
    hoverClass: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
  },
  {
    title: 'Inversionista',
    description: 'Explora el marketplace, gestiona inversiones y revisa tu billetera.',
    href: '/dashboard/demo/inversionista',
    icon: TrendingUp,
    color: 'cyan',
    bgClass: 'bg-cyan-500/10 border-cyan-500/20',
    iconClass: 'text-cyan-500',
    hoverClass: 'hover:border-cyan-500/40 hover:bg-cyan-500/5',
  },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Modo Demo
          </h1>
          <p className="text-gray-500 text-lg">
            Selecciona un dashboard para explorar la plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => {
            const Icon = dashboard.icon
            return (
              <Link
                key={dashboard.href}
                href={dashboard.href}
                className={`block p-8 rounded-2xl border-2 transition-all duration-200 ${dashboard.bgClass} ${dashboard.hoverClass}`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${dashboard.bgClass}`}>
                  <Icon size={28} className={dashboard.iconClass} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {dashboard.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {dashboard.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
