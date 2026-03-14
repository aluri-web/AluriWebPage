import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import PropietarioSidebar from '../../../components/dashboard/PropietarioSidebar'
import PropietarioMobileSidebar from '../../../components/dashboard/PropietarioMobileSidebar'
import SessionTimeout from '../../../components/SessionTimeout'

export default async function PropietarioLayout({
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
  if (profile?.role !== 'propietario') {
    if (profile?.role === 'admin') {
      return redirect('/dashboard/admin')
    }
    return redirect('/dashboard/inversionista')
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || 'Propietario'
  const userEmail = user.email || ''

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionTimeout />
      {/* Desktop sidebar */}
      <PropietarioSidebar user={{ name: userName, email: userEmail }} />

      {/* Mobile sidebar */}
      <PropietarioMobileSidebar user={{ name: userName, email: userEmail }} />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
