import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BUCKET = 'properties'
const FOLDER = 'dataroom'
const SUBFOLDER_PUBLICO = `${FOLDER}/publico`
const SUBFOLDER_PRIVADO = `${FOLDER}/privado`

type Visibility = 'publico' | 'privado'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDocuments(
  files: { name: string; created_at: string; metadata?: { size?: number } }[],
  folder: string,
  visibility: Visibility,
  adminSupabase: any
) {
  return files
    .filter((f) => f.name.endsWith('.html'))
    .map((f) => {
      const fullPath = `${folder}/${f.name}`
      const {
        data: { publicUrl },
      } = adminSupabase.storage.from(BUCKET).getPublicUrl(fullPath)

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
        visibility,
        folder,
      }
    })
}

/**
 * GET /api/dataroom
 * Lista archivos HTML del dataroom.
 * ?visibility=publico  → solo publicos (usado por demo)
 * ?visibility=privado  → solo privados
 * sin param            → todos (legacy root + publico + privado)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Proxy mode: download a specific file's content server-side
    const filePath = request.nextUrl.searchParams.get('file')
    if (filePath) {
      const { data, error: downloadError } = await adminSupabase.storage
        .from(BUCKET)
        .download(filePath)

      if (downloadError || !data) {
        return NextResponse.json({ error: 'Error al descargar archivo' }, { status: 500 })
      }

      const text = await data.text()
      return new NextResponse(text, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const visibilityParam = request.nextUrl.searchParams.get('visibility') as Visibility | null

    const allDocuments: ReturnType<typeof buildDocuments> = []

    // Fetch publico
    if (!visibilityParam || visibilityParam === 'publico') {
      const { data: publicFiles } = await adminSupabase.storage
        .from(BUCKET)
        .list(SUBFOLDER_PUBLICO, { sortBy: { column: 'name', order: 'asc' } })
      if (publicFiles) {
        allDocuments.push(...buildDocuments(publicFiles, SUBFOLDER_PUBLICO, 'publico', adminSupabase))
      }
    }

    // Fetch privado
    if (!visibilityParam || visibilityParam === 'privado') {
      const { data: privateFiles } = await adminSupabase.storage
        .from(BUCKET)
        .list(SUBFOLDER_PRIVADO, { sortBy: { column: 'name', order: 'asc' } })
      if (privateFiles) {
        allDocuments.push(...buildDocuments(privateFiles, SUBFOLDER_PRIVADO, 'privado', adminSupabase))
      }
    }

    // Legacy: archivos en dataroom/ raiz (tratados como privados)
    if (!visibilityParam || visibilityParam === 'privado') {
      const { data: rootFiles } = await adminSupabase.storage
        .from(BUCKET)
        .list(FOLDER, { sortBy: { column: 'name', order: 'asc' } })
      if (rootFiles) {
        // Solo archivos .html, ignorar subcarpetas (publico/, privado/)
        const htmlOnly = rootFiles.filter(
          (f) => f.name.endsWith('.html')
        )
        allDocuments.push(...buildDocuments(htmlOnly, FOLDER, 'privado', adminSupabase))
      }
    }

    return NextResponse.json({ success: true, documents: allDocuments })
  } catch (error) {
    console.error('Error in dataroom GET:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/dataroom
 * Sube un archivo HTML. Solo admins.
 * FormData: file + visibility ('publico' | 'privado', default 'privado')
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

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
    const visibility = (formData.get('visibility') as Visibility) || 'privado'

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

    const targetFolder = visibility === 'publico' ? SUBFOLDER_PUBLICO : SUBFOLDER_PRIVADO
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${targetFolder}/${timestamp}_${sanitizedName}`

    const { error: uploadError } = await adminSupabase.storage
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

    const {
      data: { publicUrl },
    } = adminSupabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: sanitizedName,
      visibility,
    })
  } catch (error) {
    console.error('Error in dataroom POST:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}

/**
 * DELETE /api/dataroom
 * Elimina un archivo. Solo admins.
 * Body: { fileName, folder } — folder es la ruta completa (dataroom/publico, dataroom/privado, o dataroom)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { fileName, folder } = await request.json()

    if (!fileName) {
      return NextResponse.json({ error: 'No se proporciono nombre de archivo' }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const targetFolder = folder || FOLDER
    const fullPath = `${targetFolder}/${fileName}`

    const { error: deleteError } = await adminSupabase.storage
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
