'use server'

import { createClient } from '../../utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export async function changeTemporaryPassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado' }
  }

  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!newPassword || !confirmPassword) {
    return { error: 'Debes ingresar y confirmar tu nueva contraseña' }
  }

  if (newPassword.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' }
  }

  // Update password via Supabase auth (user's session)
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { error: 'Error al cambiar contraseña: ' + updateError.message }
  }

  // Clear must_change_password flag using admin client
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const existingAppMeta = (user.app_metadata || {}) as Record<string, unknown>
  await adminSupabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...existingAppMeta,
      must_change_password: false,
    },
  })

  // Fetch role to redirect properly
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
