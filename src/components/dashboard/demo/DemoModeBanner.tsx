'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

const roles = [
  { label: 'Admin', href: '/dashboard/demo/admin', key: 'admin' },
  { label: 'Propietario', href: '/dashboard/demo/propietario', key: 'propietario' },
  { label: 'Inversionista', href: '/dashboard/demo/inversionista', key: 'inversionista' },
]

export default function DemoModeBanner() {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const activeRole = (key: string) => pathname.startsWith(`/dashboard/demo/${key}`)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await fetch('/auth/signout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-violet-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      {/* Left: Label */}
      <span className="font-bold tracking-wide">MODO DEMO</span>

      {/* Center: Role switcher */}
      <div className="flex items-center gap-2">
        {roles.map((role) => (
          <Link
            key={role.key}
            href={role.href}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              activeRole(role.key)
                ? 'bg-white text-violet-700'
                : 'bg-violet-500 hover:bg-violet-400 text-white'
            }`}
          >
            {role.label}
          </Link>
        ))}
      </div>

      {/* Right: Exit */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="font-semibold hover:underline disabled:opacity-50"
      >
        {signingOut ? 'Saliendo...' : 'Salir'}
      </button>
    </div>
  )
}
