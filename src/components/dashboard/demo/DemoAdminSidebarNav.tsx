'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Wallet,
  HandCoins,
  Code2,
  Receipt,
  FolderOpen,
  ClipboardList
} from 'lucide-react'

const mainNavItems = [
  { href: '/dashboard/demo/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/demo/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/dashboard/demo/admin/inversiones', label: 'Tesoreria', icon: Wallet },
  { href: '/dashboard/demo/admin/colocaciones', label: 'Colocaciones', icon: HandCoins },
  { href: '/dashboard/demo/admin/solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { href: '/dashboard/demo/admin/pagos', label: 'Pagos', icon: Receipt },
  { href: '/dashboard/demo/admin/dataroom', label: 'Dataroom', icon: FolderOpen },
]

const configNavItems = [
  { href: '/dashboard/demo/admin/configuracion', label: 'Configuracion', icon: Settings },
  { href: '/dashboard/demo/admin/api', label: 'API', icon: Code2 },
]

export default function DemoAdminSidebarNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/demo/admin') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive(href)
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )

  return (
    <nav className="flex-1 px-4 py-6 overflow-y-auto">
      <div className="space-y-1">
        {mainNavItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-3">
          Sistema
        </p>
        <div className="space-y-1">
          {configNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  )
}
