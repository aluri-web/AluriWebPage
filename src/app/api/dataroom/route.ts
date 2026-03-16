import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BUCKET = 'properties'
const FOLDER = 'dataroom'
const SUBFOLDER_PUBLICO = `${FOLDER}/publico`
const SUBFOLDER_PRIVADO = `${FOLDER}/privado`

type Visibility = 'publico' | 'privado'

const ALLOWED_EXTENSIONS: Record<string, { contentType: string; category: string }> = {
  html: { contentType: 'text/html', category: 'html' },
  pdf: { contentType: 'application/pdf', category: 'pdf' },
  doc: { contentType: 'application/msword', category: 'office' },
  docx: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'office' },
  xlsx: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'office' },
  xls: { contentType: 'application/vnd.ms-excel', category: 'office' },
  csv: { contentType: 'text/csv', category: 'text' },
  pptx: { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'office' },
  ppt: { contentType: 'application/vnd.ms-powerpoint', category: 'office' },
  jpg: { contentType: 'image/jpeg', category: 'image' },
  jpeg: { contentType: 'image/jpeg', category: 'image' },
  png: { contentType: 'image/png', category: 'image' },
  webp: { contentType: 'image/webp', category: 'image' },
  gif: { contentType: 'image/gif', category: 'image' },
  svg: { contentType: 'image/svg+xml', category: 'image' },
  txt: { contentType: 'text/plain', category: 'text' },
  md: { contentType: 'text/markdown', category: 'text' },
}

function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || ''
}

function getFileCategory(name: string): string {
  const ext = getFileExt(name)
  return ALLOWED_EXTENSIONS[ext]?.category || 'unknown'
}

function isValidPath(path: string): boolean {
  return !path.includes('..') && path.startsWith(FOLDER + '/')
}

function getVisibilityFromPath(path: string): Visibility {
  if (path.startsWith(SUBFOLDER_PUBLICO)) return 'publico'
  return 'privado'
}

function formatDisplayName(name: string): string {
  return name
    .replace(/^\d+_/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ')
}

/**
 * GET /api/dataroom
 *
 * Modes:
 *  ?file=<path>           → download/proxy a specific file
 *  ?path=<folder_path>    → list files and subfolders at path
 *  ?visibility=publico    → legacy: flat list of public files (backward compat)
 */
export async function GET(request: NextRequest) {
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

    // --- File download proxy ---
    const filePath = request.nextUrl.searchParams.get('file')
    if (filePath) {
      if (!isValidPath(filePath)) {
        return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 })
      }

      const { data, error: downloadError } = await adminSupabase.storage
        .from(BUCKET)
        .download(filePath)

      if (downloadError || !data) {
        return NextResponse.json({ error: 'Error al descargar archivo' }, { status: 500 })
      }

      const ext = getFileExt(filePath)
      const contentType = ALLOWED_EXTENSIONS[ext]?.contentType || 'application/octet-stream'
      const fileName = filePath.split('/').pop() || 'file'

      const arrayBuffer = await data.arrayBuffer()
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Content-Length': String(arrayBuffer.byteLength),
          'X-Frame-Options': 'SAMEORIGIN',
        },
      })
    }

    // --- Folder listing ---
    const pathParam = request.nextUrl.searchParams.get('path')

    if (pathParam) {
      if (!isValidPath(pathParam)) {
        return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 })
      }

      const { data: items, error: listError } = await adminSupabase.storage
        .from(BUCKET)
        .list(pathParam, { sortBy: { column: 'name', order: 'asc' } })

      if (listError) {
        return NextResponse.json({ error: 'Error al listar carpeta' }, { status: 500 })
      }

      const folders = (items || [])
        .filter(item => item.id === null)
        .map(item => ({
          type: 'folder' as const,
          name: item.name,
          path: `${pathParam}/${item.name}`,
        }))

      const files = (items || [])
        .filter(item => item.id !== null && item.name !== '.folder')
        .map(item => {
          const ext = getFileExt(item.name)
          return {
            type: 'file' as const,
            name: item.name,
            displayName: formatDisplayName(item.name),
            path: `${pathParam}/${item.name}`,
            ext,
            category: getFileCategory(item.name),
            size: item.metadata?.size || 0,
            createdAt: item.created_at,
            visibility: getVisibilityFromPath(pathParam),
          }
        })

      return NextResponse.json({ success: true, folders, files })
    }

    // --- Legacy flat list (backward compat for ?visibility=) ---
    const visibilityParam = request.nextUrl.searchParams.get('visibility') as Visibility | null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function listRecursive(folder: string, vis: Visibility, adminSupa: any) {
      const results: {
        name: string; displayName: string; path: string; ext: string;
        category: string; size: number; createdAt: string; visibility: Visibility; folder: string;
        url: string;
      }[] = []

      const { data: items } = await adminSupa.storage
        .from(BUCKET)
        .list(folder, { sortBy: { column: 'name', order: 'asc' } })

      if (!items) return results

      for (const item of items) {
        if (item.id === null) {
          // Recurse into subfolder
          const sub = await listRecursive(`${folder}/${item.name}`, vis, adminSupa)
          results.push(...sub)
        } else if (item.name !== '.folder') {
          const fullPath = `${folder}/${item.name}`
          const { data: { publicUrl } } = adminSupa.storage.from(BUCKET).getPublicUrl(fullPath)
          results.push({
            name: item.name,
            displayName: formatDisplayName(item.name),
            path: fullPath,
            ext: getFileExt(item.name),
            category: getFileCategory(item.name),
            size: item.metadata?.size || 0,
            createdAt: item.created_at,
            visibility: vis,
            folder,
            url: publicUrl,
          })
        }
      }

      return results
    }

    const allDocuments: Awaited<ReturnType<typeof listRecursive>> = []

    if (!visibilityParam || visibilityParam === 'publico') {
      allDocuments.push(...await listRecursive(SUBFOLDER_PUBLICO, 'publico', adminSupabase))
    }
    if (!visibilityParam || visibilityParam === 'privado') {
      allDocuments.push(...await listRecursive(SUBFOLDER_PRIVADO, 'privado', adminSupabase))
    }

    // Legacy root files
    if (!visibilityParam || visibilityParam === 'privado') {
      const { data: rootFiles } = await adminSupabase.storage
        .from(BUCKET)
        .list(FOLDER, { sortBy: { column: 'name', order: 'asc' } })
      if (rootFiles) {
        for (const f of rootFiles) {
          if (f.id !== null && f.name !== '.folder') {
            const fullPath = `${FOLDER}/${f.name}`
            const { data: { publicUrl } } = adminSupabase.storage.from(BUCKET).getPublicUrl(fullPath)
            allDocuments.push({
              name: f.name,
              displayName: formatDisplayName(f.name),
              path: fullPath,
              ext: getFileExt(f.name),
              category: getFileCategory(f.name),
              size: f.metadata?.size || 0,
              createdAt: f.created_at,
              visibility: 'privado',
              folder: FOLDER,
              url: publicUrl,
            })
          }
        }
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
 *
 * Upload file:  FormData with file + path (target folder)
 * Create folder: JSON with { action: 'create-folder', name, path }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

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

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const contentType = request.headers.get('content-type') || ''

    // --- Create folder ---
    if (contentType.includes('application/json')) {
      const body = await request.json()

      if (body.action === 'create-folder') {
        const { name, path: parentPath } = body

        if (!name || typeof name !== 'string') {
          return NextResponse.json({ error: 'Nombre de carpeta requerido' }, { status: 400 })
        }

        const sanitizedName = name.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._\- ]/g, '_')
        if (!sanitizedName) {
          return NextResponse.json({ error: 'Nombre de carpeta invalido' }, { status: 400 })
        }

        const targetPath = parentPath || SUBFOLDER_PRIVADO
        if (!isValidPath(targetPath)) {
          return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 })
        }

        const folderPath = `${targetPath}/${sanitizedName}/.folder`

        const { error: uploadError } = await adminSupabase.storage
          .from(BUCKET)
          .upload(folderPath, new Blob(['']), {
            cacheControl: '3600',
            upsert: false,
            contentType: 'text/plain',
          })

        if (uploadError) {
          if (uploadError.message?.includes('already exists') || uploadError.message?.includes('Duplicate')) {
            return NextResponse.json({ error: 'La carpeta ya existe' }, { status: 409 })
          }
          console.error('Error creating folder:', uploadError)
          return NextResponse.json({ error: 'Error al crear carpeta' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          folder: { name: sanitizedName, path: `${targetPath}/${sanitizedName}` },
        })
      }

      return NextResponse.json({ error: 'Accion no reconocida' }, { status: 400 })
    }

    // --- Upload file ---
    const formData = await request.formData()
    const file = formData.get('file') as File
    const targetPath = (formData.get('path') as string) || SUBFOLDER_PRIVADO

    if (!file) {
      return NextResponse.json({ error: 'No se proporciono archivo' }, { status: 400 })
    }

    if (!isValidPath(targetPath)) {
      return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 })
    }

    const ext = getFileExt(file.name)
    if (!ALLOWED_EXTENSIONS[ext]) {
      const allowed = Object.keys(ALLOWED_EXTENSIONS).join(', ')
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Permitidos: ${allowed}` },
        { status: 400 }
      )
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede 50MB' }, { status: 400 })
    }

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${targetPath}/${timestamp}_${sanitizedName}`

    const { error: uploadError } = await adminSupabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: ALLOWED_EXTENSIONS[ext].contentType,
      })

    if (uploadError) {
      console.error('Error uploading dataroom file:', uploadError)
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase.storage.from(BUCKET).getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: sanitizedName,
      path: storagePath,
      visibility: getVisibilityFromPath(targetPath),
    })
  } catch (error) {
    console.error('Error in dataroom POST:', error)
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 })
  }
}

/**
 * DELETE /api/dataroom
 *
 * Delete file:   { filePath }
 * Delete folder: { folderPath, action: 'delete-folder' }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

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

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()

    // --- Delete folder recursively ---
    if (body.action === 'delete-folder') {
      const { folderPath } = body
      if (!folderPath || !isValidPath(folderPath)) {
        return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 })
      }

      async function deleteFolderRecursive(path: string) {
        const { data: items } = await adminSupabase.storage
          .from(BUCKET)
          .list(path, { sortBy: { column: 'name', order: 'asc' } })

        if (!items || items.length === 0) return

        const filePaths = items
          .filter(i => i.id !== null)
          .map(i => `${path}/${i.name}`)

        if (filePaths.length > 0) {
          await adminSupabase.storage.from(BUCKET).remove(filePaths)
        }

        const subfolders = items.filter(i => i.id === null)
        for (const sub of subfolders) {
          await deleteFolderRecursive(`${path}/${sub.name}`)
        }
      }

      await deleteFolderRecursive(folderPath)
      return NextResponse.json({ success: true })
    }

    // --- Delete single file ---
    const { filePath, fileName, folder } = body
    const resolvedPath = filePath || (fileName && folder ? `${folder}/${fileName}` : null)

    if (!resolvedPath || !isValidPath(resolvedPath)) {
      return NextResponse.json({ error: 'Ruta no permitida' }, { status: 400 })
    }

    const { error: deleteError } = await adminSupabase.storage
      .from(BUCKET)
      .remove([resolvedPath])

    if (deleteError) {
      console.error('Error deleting dataroom file:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in dataroom DELETE:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
