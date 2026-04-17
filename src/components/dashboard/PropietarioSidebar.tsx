import Image from 'next/image'
import PropietarioSidebarNav from './PropietarioSidebarNav'
import PropietarioUserInfo from './PropietarioUserInfo'

interface PropietarioSidebarProps {
  user: {
    name: string
    email: string
    avatarUrl: string | null
  }
}

export default function PropietarioSidebar({ user }: PropietarioSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 h-screen bg-white border-r border-gray-200 flex-col fixed left-0 top-0 z-40">
      {/* Logo + Propietario Badge */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Image
            src="/images/AluriLogo.png"
            alt="Aluri"
            width={100}
            height={40}
            className="h-8 w-auto"
          />
          <span className="px-2 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/30">
            PROPIETARIO
          </span>
        </div>
      </div>

      {/* Navigation */}
      <PropietarioSidebarNav />

      {/* User Info */}
      <PropietarioUserInfo name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
    </aside>
  )
}
