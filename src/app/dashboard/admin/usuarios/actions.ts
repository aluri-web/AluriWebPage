'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function crearUsuario(formData: FormData) {
  // Create admin client inside function to avoid module-level errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Configuracion del servidor incompleta. Contacta al administrador.' }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const documentId = formData.get('document_id') as string
  const role = formData.get('role') as string

  if (!email || !password || !fullName || !documentId || !role) {
    return { error: 'Todos los campos son requeridos' }
  }

  const validRoles = ['inversionista', 'propietario', 'admin', 'demo']
  if (!validRoles.includes(role)) {
    return { error: 'Rol invalido' }
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  // 1. Create user in Auth system with all metadata for the trigger
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      document_id: documentId,
      role: role
    }
  })

  if (error) {
    console.error('Error creating auth user:', error.message, error.status, error.name)
    // Provide more user-friendly error messages
    if (error.message.includes('already registered')) {
      return { error: 'Este correo ya está registrado.' }
    }
    if (error.message.includes('Database error')) {
      return { error: 'Error de base de datos. Verifica que el trigger de Supabase esté configurado correctamente o deshabilitado.' }
    }
    return { error: error.message }
  }

  // 2. Create profile directly (in case trigger fails or doesn't exist)
  // First check if profile was created by trigger
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single()

  if (!existingProfile) {
    // Profile wasn't created by trigger, create it manually
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        document_id: documentId,
        role: role,
        verification_status: 'pending'
      })

    if (profileError) {
      console.error('Error creating profile:', profileError.message)
      // User was created but profile failed - try to clean up
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      return { error: 'Error al crear perfil: ' + profileError.message }
    }
  } else {
    // Profile exists (created by trigger), update with all fields
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role, full_name: fullName, document_id: documentId })
      .eq('id', data.user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError.message)
      return { error: 'Error al actualizar rol: ' + updateError.message }
    }
  }

  // Revalidate the users page to show the new user
  revalidatePath('/dashboard/admin/usuarios')

  return { success: true, userId: data.user.id }
}

interface UpdateUserData {
  id: string
  full_name?: string
  email?: string
  role?: string
  verification_status?: string
}

export async function updateUserProfile(data: UpdateUserData) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Configuracion del servidor incompleta. Contacta al administrador.' }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  if (!data.id) {
    return { error: 'ID de usuario requerido' }
  }

  // Build update object with only provided fields
  const updateData: Record<string, string> = {}

  if (data.full_name !== undefined) {
    updateData.full_name = data.full_name
  }

  if (data.role !== undefined) {
    const validRoles = ['inversionista', 'propietario', 'admin', 'demo']
    if (!validRoles.includes(data.role)) {
      return { error: 'Rol invalido' }
    }
    updateData.role = data.role
  }

  if (data.verification_status !== undefined) {
    const validStatuses = ['pending', 'verified', 'rejected']
    if (!validStatuses.includes(data.verification_status)) {
      return { error: 'Estado de verificacion invalido' }
    }
    updateData.verification_status = data.verification_status
  }

  // Handle email change separately (requires auth update too)
  if (data.email !== undefined && data.email.trim() !== '') {
    updateData.email = data.email.trim()

    // Update email in auth system
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email.trim(),
    })

    if (authError) {
      console.error('Error updating auth email:', authError.message)
      if (authError.message.includes('already')) {
        return { error: 'Este correo ya esta registrado por otro usuario.' }
      }
      return { error: 'Error al actualizar email en auth: ' + authError.message }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'No hay datos para actualizar' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', data.id)

  if (error) {
    console.error('Error updating profile:', error.message)
    return { error: 'Error al actualizar perfil: ' + error.message }
  }

  revalidatePath('/dashboard/admin/usuarios')

  return { success: true }
}
