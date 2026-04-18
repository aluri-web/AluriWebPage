'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = ((formData.get('email') as string) || '').trim().toLowerCase()
  const password = ((formData.get('password') as string) || '').trim()

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
    // Distinguir errores comunes para facilitar diagnostico
    const msg = (error.message || '').toLowerCase()
    if (msg.includes('rate') || msg.includes('too many')) {
      return { error: 'Demasiados intentos fallidos. Espera unos minutos antes de reintentar.' }
    }
    if (msg.includes('not confirmed') || msg.includes('confirm')) {
      return { error: 'Tu correo no esta confirmado. Contacta al administrador.' }
    }
    if (msg.includes('invalid') || msg.includes('credentials')) {
      return { error: 'Correo o contraseña incorrectos. Verifica que no tenga espacios extra.' }
    }
    return { error: 'No se pudo iniciar sesion: ' + (error.message || 'error desconocido') }
  }

  // Consultar rol del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  // Registrar sesión de usuario
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  const { data: sessionData } = await supabase.from('user_sessions').insert({
    user_id: data.user.id,
    ip_address: ip,
    user_agent: userAgent,
  }).select('id').single()

  // Guardar session_id en cookie para poder cerrarla después
  if (sessionData?.id) {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    cookieStore.set('session_tracking_id', sessionData.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    })
  }

  // Revalidate cache
  revalidatePath('/', 'layout')

  // Si la cuenta tiene contraseña temporal, forzar cambio antes del dashboard
  const mustChangePassword = (data.user.app_metadata as Record<string, unknown> | undefined)?.must_change_password
  if (mustChangePassword) {
    redirect('/change-password')
  }

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
    // Auto-rotar contraseña demo para que sea de un solo uso
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      fetch(`${siteUrl}/api/demo-access`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        },
      }).catch(() => {}) // fire-and-forget, no bloquear el login
    } catch {}
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
