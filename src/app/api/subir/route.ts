import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Helper function para verificar autenticación admin
async function verificarAuthAdmin(request: NextRequest): Promise<{
  success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
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
 * POST /api/subir
 *
 * Sube una imagen al storage de Supabase.
 * REQUIERE: Autenticación con rol 'admin'
 *
 * Headers requeridos:
 * - Authorization: Bearer <token>
 *
 * Body (FormData):
 * - archivo: archivo de imagen
 * - codigo_credito: código del crédito (opcional, default: 'default')
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación admin
    const authResult = await verificarAuthAdmin(request)
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const formData = await request.formData()
    const archivo = formData.get('archivo') as File || formData.get('file') as File
    const codigoCredito = formData.get('codigo_credito') as string || formData.get('loanCode') as string || 'default'

    if (!archivo) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!archivo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 })
    }

    // Validar tamaño del archivo (max 5MB)
    if (archivo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede 5MB' }, { status: 400 })
    }

    // Crear nombre de archivo único
    const timestamp = Date.now()
    const nombreSanitizado = archivo.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const ruta = `${codigoCredito}/${timestamp}_${nombreSanitizado}`

    // Subir a Supabase Storage
    const { error } = await supabase
      .storage
      .from('properties')
      .upload(ruta, archivo, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading to Supabase:', error)
      return NextResponse.json({ error: 'Error al subir archivo: ' + error.message }, { status: 500 })
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase
      .storage
      .from('properties')
      .getPublicUrl(ruta)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Error in subir route:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}

/**
 * DELETE /api/subir
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
    const authResult = await verificarAuthAdmin(request)
    if (!authResult.success || !authResult.supabase) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 500 }
      )
    }

    const supabase = authResult.supabase
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No se proporcionó URL' }, { status: 400 })
    }

    // Extraer ruta de la URL
    // Formato: .../storage/v1/object/public/properties/codigoCredito/filename
    const partesUrl = url.split('/properties/')
    if (partesUrl.length < 2) {
      return NextResponse.json({ error: 'Formato de URL inválido' }, { status: 400 })
    }

    const ruta = partesUrl[1]

    const { error } = await supabase
      .storage
      .from('properties')
      .remove([ruta])

    if (error) {
      console.error('Error deleting from Supabase:', error)
      return NextResponse.json({ error: 'Error al eliminar archivo: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in eliminar route:', error)
    return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 })
  }
}
