'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import DemoAdminSidebarNav from './DemoAdminSidebarNav'
import UserInfo from '../UserInfo'

interface DemoAdminMobileSidebarProps {
  user: {
    name: string
    email: string
  }
}

export default function DemoAdminMobileSidebar({ user }: DemoAdminMobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with close button */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/AluriLogoBlackBG.png"
              alt="Aluri"
              width={80}
              height={32}
              className="h-6 w-auto"
            />
            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">
              ADMIN
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation - close on click */}
        <div onClick={() => setIsOpen(false)}>
          <DemoAdminSidebarNav />
        </div>

        {/* User Info */}
        <UserInfo name={user.name} email={user.email} />
      </aside>
    </>
  )
}
