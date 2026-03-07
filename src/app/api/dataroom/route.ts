import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BUCKET = 'properties'
const FOLDER = 'dataroom'

/**
 * GET /api/dataroom
 * Lista todos los archivos HTML de la carpeta dataroom/ en el bucket properties.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: files, error } = await adminSupabase
      .storage
      .from(BUCKET)
      .list(FOLDER, { sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      console.error('Error listing dataroom files:', error)
      return NextResponse.json({ error: 'Error al listar archivos' }, { status: 500 })
    }

    const documents = (files || [])
      .filter(f => f.name.endsWith('.html'))
      .map(f => {
        const fullPath = `${FOLDER}/${f.name}`
        const { data: { publicUrl } } = adminSupabase
          .storage
          .from(BUCKET)
          .getPublicUrl(fullPath)

        // Extract display name: remove timestamp prefix and .html extension
        const displayName = f.name
          .replace(/^\d+_/, '')
          .replace(/\.html$/, '')
          .replace(/_/g, ' ')

        return {
          name: f.name,
          displayName,
          url: publicUrl,
          createdAt: f.created_at,
          size: f.metadata?.size || 0,
        }
      })

    return NextResponse.json({ success: true, documents })
  } catch (error) {
    console.error('Error in dataroom GET:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/dataroom
 * Sube un archivo HTML a la carpeta dataroom/. Solo admins.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 })
    }

    if (!file.name.endsWith('.html') && file.type !== 'text/html') {
      return NextResponse.json({ error: 'Solo se permiten archivos HTML' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede 10MB' }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${FOLDER}/${timestamp}_${sanitizedName}`

    const { error: uploadError } = await adminSupabase
      .storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'text/html',
      })

    if (uploadError) {
      console.error('Error uploading dataroom file:', uploadError)
      return NextResponse.json({ error: 'Error al subir: ' + uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase
      .storage
      .from(BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicUrl, name: sanitizedName })
  } catch (error) {
    console.error('Error in dataroom POST:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}

/**
 * DELETE /api/dataroom
 * Elimina un archivo de la carpeta dataroom/. Solo admins.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { fileName } = await request.json()

    if (!fileName) {
      return NextResponse.json({ error: 'No se proporciono nombre de archivo' }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fullPath = `${FOLDER}/${fileName}`

    const { error: deleteError } = await adminSupabase
      .storage
      .from(BUCKET)
      .remove([fullPath])

    if (deleteError) {
      console.error('Error deleting dataroom file:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar: ' + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in dataroom DELETE:', error)
    return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 })
  }
}
