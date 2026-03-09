import Image from 'next/image'
import DemoSidebarNav from './DemoSidebarNav'
import UserInfo from '../UserInfo'

interface DemoSidebarProps {
  user: {
    name: string
    email: string
  }
}

export default function DemoSidebar({ user }: DemoSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 h-screen bg-black border-r border-zinc-800 flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <Image
          src="/images/AluriLogoBlackBG.png"
          alt="Aluri"
          width={100}
          height={40}
          className="h-8 w-auto"
        />
      </div>

      {/* Navigation */}
      <DemoSidebarNav />

      {/* User Info */}
      <UserInfo name={user.name} email={user.email} />
    </aside>
  )
}
