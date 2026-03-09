import DemoAdminSidebar from '@/components/dashboard/demo/DemoAdminSidebar'
import DemoAdminMobileSidebar from '@/components/dashboard/demo/DemoAdminMobileSidebar'

export default function DemoAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userName = 'Carlos Rodriguez'
  const userEmail = 'carlos.rodriguez@aluri.co'

  return (
    <div className="min-h-screen bg-slate-900 pt-10">
      {/* Desktop sidebar */}
      <DemoAdminSidebar user={{ name: userName, email: userEmail }} />

      {/* Mobile sidebar */}
      <DemoAdminMobileSidebar user={{ name: userName, email: userEmail }} />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
