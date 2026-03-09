import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BUCKET = 'properties'

/**
 * POST /api/upload
 * Upload a property photo or PDF to Supabase Storage.
 * Uses cookie-based auth (no Bearer token needed from client).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const loanCode = formData.get('loanCode') as string || 'default'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen o PDF' }, { status: 400 })
    }

    const maxSize = isPdf ? 25 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: `El archivo excede ${isPdf ? '25' : '5'}MB` }, { status: 400 })
    }

    // Use service role for storage upload (bypasses RLS)
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const path = `${loanCode}/${timestamp}_${sanitizedName}`

    // Convert File to Buffer for reliable upload of large files
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await adminSupabase
      .storage
      .from(BUCKET)
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Error uploading:', uploadError)
      return NextResponse.json({ error: 'Error al subir: ' + uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase
      .storage
      .from(BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Error in upload route:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}

/**
 * DELETE /api/upload
 * Delete a property photo from Supabase Storage.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No se proporcionó URL' }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Extract path from URL: .../storage/v1/object/public/properties/CODE/filename
    const parts = url.split('/properties/')
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Formato de URL inválido' }, { status: 400 })
    }

    const filePath = parts[1]

    const { error: deleteError } = await adminSupabase
      .storage
      .from(BUCKET)
      .remove([filePath])

    if (deleteError) {
      console.error('Error deleting:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar: ' + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete route:', error)
    return NextResponse.json({ error: 'Error al eliminar archivo' }, { status: 500 })
  }
}
