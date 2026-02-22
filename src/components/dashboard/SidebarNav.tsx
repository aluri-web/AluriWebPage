'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Store,
  PiggyBank,
  Wallet,
  User,
  Settings,
  FileText
} from 'lucide-react'

const mainNavItems = [
  { href: '/dashboard/inversionista', label: 'Inicio', icon: Home },
  { href: '/dashboard/inversionista/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/inversionista/mis-inversiones', label: 'Mis Inversiones', icon: PiggyBank },
  { href: '/dashboard/inversionista/billetera', label: 'Billetera', icon: Wallet },
  { href: '/dashboard/inversionista/extractos', label: 'Extractos', icon: FileText },
]

const accountNavItems = [
  { href: '/dashboard/inversionista/configuracion', label: 'Configuracion', icon: Settings },
]

export default function SidebarNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/inversionista') {
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
