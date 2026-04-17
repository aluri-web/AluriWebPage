'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PropietarioUserInfoProps {
  name: string
  email: string
  avatarUrl?: string | null
}

export default function PropietarioUserInfo({ name, email, avatarUrl }: PropietarioUserInfoProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/auth/signout', {
        method: 'POST',
      })
      if (response.redirected) {
        router.push('/login')
      } else {
        router.push('/login')
      }
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/login')
    }
  }

  return (
    <div className="p-4 border-t border-gray-200 mt-auto">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name || 'Avatar'}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-semibold text-sm">
            {initials || email[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name || 'Usuario'}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        disabled={isLoading}
        className="flex items-center gap-2 w-full px-4 py-2 mt-4 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
      >
        <LogOut size={18} />
        <span>{isLoading ? 'Cerrando...' : 'Cerrar Sesion'}</span>
      </button>
    </div>
  )
}
