'use server'

import { createClient } from '../../../../utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado' }
  }

  const fullName = formData.get('fullName') as string

  if (!fullName || fullName.trim().length < 2) {
    return { error: 'El nombre debe tener al menos 2 caracteres' }
  }

  // Update profile in database
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError.message)
    return { error: 'Error al actualizar perfil: ' + profileError.message }
  }

  // Also update user metadata in auth
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName.trim() }
  })

  if (authError) {
    console.error('Error updating auth metadata:', authError.message)
  }

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/configuracion')

  return { success: true, message: 'Nombre actualizado correctamente' }
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado' }
  }

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'Todos los campos son requeridos' }
  }

  if (newPassword.length < 6) {
    return { error: 'La nueva contraseña debe tener al menos 6 caracteres' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden' }
  }

  // Verify current password using a standalone client (no cookies)
  // This prevents overwriting the current AAL2 session with a new AAL1 session
  const verifyClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword
  })

  if (signInError) {
    return { error: 'La contraseña actual es incorrecta' }
  }

  // Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (updateError) {
    console.error('Error changing password:', updateError.message)
    return { error: 'Error al cambiar contraseña: ' + updateError.message }
  }

  return { success: true, message: 'Contraseña actualizada correctamente' }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado' }
  }

  const file = formData.get('avatar') as File

  if (!file || file.size === 0) {
    return { error: 'No se selecciono ningun archivo' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Solo se permiten imagenes JPG, PNG o WebP' }
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    return { error: 'La imagen no puede superar 2MB' }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Date.now()}.${fileExt}`
  const filePath = `avatars/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('profiles')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError.message)
    return { error: 'Error al subir imagen: ' + uploadError.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('profiles')
    .getPublicUrl(filePath)

  // Update profile with avatar URL
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating avatar URL:', profileError.message)
    return { error: 'Error al actualizar perfil: ' + profileError.message }
  }

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/admin/configuracion')

  return { success: true, message: 'Foto actualizada correctamente', avatarUrl: publicUrl }
}

// =====================
// TASAS OFICIALES
// =====================

export async function getTasas() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data, error } = await supabase
    .from('tasas_oficiales')
    .select('id, tipo, tasa_ea, vigencia_desde, vigencia_hasta, created_at')
    .order('vigencia_desde', { ascending: false })

  if (error) {
    console.error('Error fetching tasas:', error.message)
    return { error: 'Error al obtener tasas' }
  }

  return { data: data || [] }
}

export async function createTasa(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Solo administradores pueden modificar tasas' }
  }

  const tipo = formData.get('tipo') as string
  const tasa_ea = parseFloat(formData.get('tasa_ea') as string)
  const vigencia_desde = formData.get('vigencia_desde') as string
  const vigencia_hasta = formData.get('vigencia_hasta') as string

  if (!tipo || !vigencia_desde || !vigencia_hasta) {
    return { error: 'Todos los campos son requeridos' }
  }

  if (isNaN(tasa_ea) || tasa_ea <= 0 || tasa_ea > 100) {
    return { error: 'La tasa debe estar entre 0 y 100' }
  }

  if (vigencia_hasta < vigencia_desde) {
    return { error: 'La fecha hasta no puede ser anterior a la fecha desde' }
  }

  const { error } = await supabase
    .from('tasas_oficiales')
    .insert({
      tipo,
      tasa_ea,
      vigencia_desde,
      vigencia_hasta,
      created_by: user.id
    })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe una tasa de ese tipo para ese periodo' }
    }
    console.error('Error creating tasa:', error.message)
    return { error: 'Error al crear tasa: ' + error.message }
  }

  revalidatePath('/dashboard/admin/configuracion')
  return { success: true, message: 'Tasa agregada correctamente' }
}

export async function deleteTasa(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Solo administradores pueden eliminar tasas' }
  }

  const { error } = await supabase
    .from('tasas_oficiales')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting tasa:', error.message)
    return { error: 'Error al eliminar tasa: ' + error.message }
  }

  revalidatePath('/dashboard/admin/configuracion')
  return { success: true, message: 'Tasa eliminada' }
}

export async function getProfile() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error.message)
    return { error: 'Error al obtener perfil' }
  }

  return {
    data: {
      ...profile,
      email: profile.email || user.email
    }
  }
}
