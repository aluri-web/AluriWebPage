import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import ChangePasswordForm from './ChangePasswordForm'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // If already cleared, send to dashboard
  const mustChange = (user.app_metadata as Record<string, unknown> | undefined)?.must_change_password
  if (!mustChange) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') redirect('/dashboard/admin/colocaciones')
    if (profile?.role === 'propietario') redirect('/dashboard/propietario')
    if (profile?.role === 'demo') redirect('/dashboard/demo')
    redirect('/dashboard/inversionista')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Cambia tu contraseña</h1>
          <p className="text-slate-400 text-sm">
            Estas usando una contraseña temporal. Antes de continuar, debes establecer una contraseña definitiva.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <ChangePasswordForm />
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Minimo 8 caracteres. Usa una combinacion de letras, numeros y simbolos.
        </p>
      </div>
    </div>
  )
}
