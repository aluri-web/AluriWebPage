'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Store,
  PiggyBank,
  Wallet,
  Bell,
  User,
  Settings
} from 'lucide-react'

const unreadCount = 3

const mainNavItems = [
  { href: '/dashboard/demo/inversionista', label: 'Inicio', icon: Home },
  { href: '/dashboard/demo/inversionista/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/demo/inversionista/mis-inversiones', label: 'Mis Inversiones', icon: PiggyBank },
  { href: '/dashboard/demo/inversionista/billetera', label: 'Billetera', icon: Wallet },
  { href: '/dashboard/demo/inversionista/notificaciones', label: 'Notificaciones', icon: Bell },
]

const accountNavItems = [
  { href: '/dashboard/demo/inversionista/configuracion', label: 'Configuracion', icon: Settings },
]

export default function DemoSidebarNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/demo/inversionista') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        isActive(href)
          ? 'bg-primary text-black font-semibold'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
      }`}
    >
      <div className="relative">
        <Icon size={20} />
        {href === '/dashboard/demo/inversionista/notificaciones' && unreadCount > 0 && (
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
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-4 mb-3">
          Cuenta
        </p>
        <div className="space-y-1">
          {accountNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  )
}
