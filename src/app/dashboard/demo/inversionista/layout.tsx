import DemoSidebar from '@/components/dashboard/demo/DemoSidebar'
import DemoMobileSidebar from '@/components/dashboard/demo/DemoMobileSidebar'

export default function DemoInversionistaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userName = 'Maria Fernanda Lopez'
  const userEmail = 'maria.lopez@gmail.com'

  return (
    <div className="min-h-screen bg-black pt-10">
      {/* Desktop sidebar */}
      <DemoSidebar user={{ name: userName, email: userEmail }} />

      {/* Mobile sidebar */}
      <DemoMobileSidebar user={{ name: userName, email: userEmail }} />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
