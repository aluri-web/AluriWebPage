'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validate inputs
  if (!email || !password) {
    return { error: 'Por favor ingresa tu correo y contraseña' }
  }

  // Attempt login
  const { error, data } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  })

  if (error) {
    return { error: 'Credenciales inválidas' }
  }

  // Consultar rol del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  // Revalidate cache
  revalidatePath('/', 'layout')

  // Redirect según rol
  if (profile?.role === 'admin') {
    // Check if admin has MFA enrolled → redirect to verify
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasVerifiedTotp = factors?.totp?.some(f => f.status === 'verified')

    if (hasVerifiedTotp) {
      redirect('/login/mfa-verify')
    }

    redirect('/dashboard/admin/colocaciones')
  } else if (profile?.role === 'propietario') {
    redirect('/dashboard/propietario')
  } else if (profile?.role === 'demo') {
    redirect('/dashboard/demo')
  } else {
    redirect('/dashboard/inversionista')
  }
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Por favor ingresa tu correo electrónico' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: 'Error al enviar el correo de recuperación' }
  }

  return { success: 'Correo de recuperación enviado. Revisa tu bandeja de entrada.' }
}
