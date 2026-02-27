'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  FileText,
  Bell,
  Settings
} from 'lucide-react'
import { getUnreadCount } from '../../app/dashboard/propietario/notificaciones/actions'

const mainNavItems = [
  { href: '/dashboard/propietario', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/propietario/creditos', label: 'Mis Creditos', icon: FileText },
  { href: '/dashboard/propietario/notificaciones', label: 'Notificaciones', icon: Bell },
]

const configNavItems = [
  { href: '/dashboard/propietario/configuracion', label: 'Configuracion', icon: Settings },
]

export default function PropietarioSidebarNav() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    getUnreadCount().then(setUnreadCount)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/dashboard/propietario') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive(href)
          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <div className="relative">
        <Icon size={20} />
        {href === '/dashboard/propietario/notificaciones' && unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">
          Cuenta
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
