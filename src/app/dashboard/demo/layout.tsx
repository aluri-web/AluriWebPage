import { createClient } from '../../../utils/supabase/server'
import { redirect } from 'next/navigation'
import DemoModeBanner from '../../../components/dashboard/demo/DemoModeBanner'

export default async function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // Fetch user profile for role verification
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only demo role users can access the demo dashboard
  if (profile?.role !== 'demo') {
    return redirect(`/dashboard/${profile?.role || 'inversionista'}`)
  }

  return (
    <div className="min-h-screen">
      <DemoModeBanner />
      {children}
    </div>
  )
}
