import DemoPropietarioSidebar from '@/components/dashboard/demo/DemoPropietarioSidebar'
import DemoPropietarioMobileSidebar from '@/components/dashboard/demo/DemoPropietarioMobileSidebar'

const DEMO_USER = {
  name: 'Juan Pablo Moreno',
  email: 'juanpablo.moreno@gmail.com',
}

export default function DemoPropietarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <DemoPropietarioSidebar user={DEMO_USER} />

      {/* Mobile sidebar */}
      <DemoPropietarioMobileSidebar user={DEMO_USER} />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-10">
        {children}
      </main>
    </div>
  )
}
