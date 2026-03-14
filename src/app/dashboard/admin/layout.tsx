import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '../../../components/dashboard/AdminSidebar'
import AdminMobileSidebar from '../../../components/dashboard/AdminMobileSidebar'
import SessionTimeout from '../../../components/SessionTimeout'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login/admin')
  }

  // Fetch user profile for name and role verification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Double-check role in layout (middleware already checks, but belt & suspenders)
  if (profile?.role !== 'admin') {
    return redirect('/dashboard/inversionista')
  }

  // Enforce MFA: if admin has TOTP enrolled but session is AAL1, redirect to verify
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal?.currentLevel === 'aal1') {
    return redirect('/login/mfa-verify')
  }

  const userName = profile?.full_name || user.user_metadata?.full_name || 'Administrador'
  const userEmail = user.email || ''

  return (
    <div className="min-h-screen bg-slate-900">
      <SessionTimeout />
      {/* Desktop sidebar */}
      <AdminSidebar user={{ name: userName, email: userEmail }} />

      {/* Mobile sidebar */}
      <AdminMobileSidebar user={{ name: userName, email: userEmail }} />

      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
