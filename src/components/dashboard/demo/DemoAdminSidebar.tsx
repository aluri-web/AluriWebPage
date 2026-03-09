import Image from 'next/image'
import DemoAdminSidebarNav from './DemoAdminSidebarNav'
import UserInfo from '../UserInfo'

interface DemoAdminSidebarProps {
  user: {
    name: string
    email: string
  }
}

export default function DemoAdminSidebar({ user }: DemoAdminSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 h-screen bg-slate-900 border-r border-slate-800 flex-col fixed left-0 top-0 z-40">
      {/* Logo + Admin Badge */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Image
            src="/images/AluriLogoBlackBG.png"
            alt="Aluri"
            width={100}
            height={40}
            className="h-8 w-auto"
          />
          <span className="px-2 py-1 text-xs font-semibold bg-amber-500/20 text-amber-400 rounded-md border border-amber-500/30">
            ADMIN
          </span>
        </div>
      </div>

      {/* Navigation */}
      <DemoAdminSidebarNav />

      {/* User Info */}
      <UserInfo name={user.name} email={user.email} />
    </aside>
  )
}
