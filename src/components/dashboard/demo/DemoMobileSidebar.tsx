'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import DemoSidebarNav from './DemoSidebarNav'
import UserInfo from '../UserInfo'

interface DemoMobileSidebarProps {
  user: {
    name: string
    email: string
  }
}

export default function DemoMobileSidebar({ user }: DemoMobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 transition-colors"
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
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with close button */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <Image
            src="/images/AluriLogoBlackBG.png"
            alt="Aluri"
            width={100}
            height={40}
            className="h-8 w-auto"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation - close on click */}
        <div onClick={() => setIsOpen(false)}>
          <DemoSidebarNav />
        </div>

        {/* User Info */}
        <UserInfo name={user.name} email={user.email} />
      </aside>
    </>
  )
}
