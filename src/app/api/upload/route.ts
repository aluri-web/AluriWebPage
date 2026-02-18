import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Helper function para verificar autenticación admin
async function verifyAdminAuth(request: NextRequest): Promise<{
  success: boolean
  supabase?: ReturnType<typeof createSupabaseClient>
  error?: string
  status?: number
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return { success: false, error: 'Configuración del servidor incompleta', status: 500 }
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'No autorizado. Se requiere token de autenticación.', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')

  const supabaseAuth = createSupabaseClient(supabaseUrl, anonKey)
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

  if (authError || !user) {
    return { success: false, error: 'Token inválido o expirado', status: 401 }
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return { success: false, error: 'Acceso denegado. Se requiere rol de administrador.', status: 403 }
  }

  return { success: true, supabase }
}

/**
 * POST /api/upload
 *
 * Sube una imagen al storage de Supabase.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * Body (FormData):
 * - file: archivo de imagen
 * - loanCode: código del préstamo (opcional, default: 'default')
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación admin
    const authResult = await verifyAdminAuth(request)
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const formData = await request.formData()
    const file = formData.get('file') as File
    const loanCode = formData.get('loanCode') as string || 'default'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB' }, { status: 400 })
    }

    // Create unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const path = `${loanCode}/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const { error } = await supabase
      .storage
      .from('properties')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading to Supabase:', error)
      return NextResponse.json({ error: 'Error uploading file: ' + error.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('properties')
      .getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Error in upload route:', error)
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
  }
}

/**
 * DELETE /api/upload
 *
 * Elimina una imagen del storage de Supabase.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * Body (JSON):
 * - url: URL pública de la imagen a eliminar
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación admin
    const authResult = await verifyAdminAuth(request)
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Extract path from URL
    // Format: .../storage/v1/object/public/properties/loanCode/filename
    const urlParts = url.split('/properties/')
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const path = urlParts[1]

    const { error } = await supabase
      .storage
      .from('properties')
      .remove([path])

    if (error) {
      console.error('Error deleting from Supabase:', error)
      return NextResponse.json({ error: 'Error deleting file: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete route:', error)
    return NextResponse.json({ error: 'Error deleting file' }, { status: 500 })
  }
}
