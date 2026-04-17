'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import PropietarioSidebarNav from './PropietarioSidebarNav'
import PropietarioUserInfo from './PropietarioUserInfo'

interface PropietarioMobileSidebarProps {
  user: {
    name: string
    email: string
    avatarUrl: string | null
  }
}

export default function PropietarioMobileSidebar({ user }: PropietarioMobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={24} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with close button */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/AluriLogo.png"
              alt="Aluri"
              width={80}
              height={32}
              className="h-6 w-auto"
            />
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/30">
              PROPIETARIO
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Cerrar menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation - close on click */}
        <div onClick={() => setIsOpen(false)}>
          <PropietarioSidebarNav />
        </div>

        {/* User Info */}
        <PropietarioUserInfo name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
      </aside>
    </>
  )
}
