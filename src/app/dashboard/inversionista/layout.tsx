import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '../../../components/dashboard/Sidebar'
import MobileSidebar from '../../../components/dashboard/MobileSidebar'

export default async function InversionistaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch user profile for name and role verification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Verify role
  if (profile?.role !== 'inversionista') {
    if (profile?.role === 'admin') {
      return redirect('/dashboard/admin')
    }
    return redirect('/dashboard/propietario')
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || ''
  const userEmail = user.email || ''

  return (
    <div className="min-h-screen bg-black">
      {/* Desktop sidebar */}
      <Sidebar user={{ name: userName, email: userEmail }} />

      {/* Mobile sidebar */}
      <MobileSidebar user={{ name: userName, email: userEmail }} />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
