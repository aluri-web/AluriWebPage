import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const BUCKET = 'properties'

/**
 * POST /api/upload/signed-url
 * Generate a signed upload URL so the client can upload directly to Supabase Storage,
 * bypassing Next.js body size limits.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { fileName, fileType, fileSize, loanCode = 'default' } = await request.json()

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName y fileType son requeridos' }, { status: 400 })
    }

    const isImage = fileType.startsWith('image/')
    const isPdf = fileType === 'application/pdf'
    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen o PDF' }, { status: 400 })
    }

    const maxSize = isPdf ? 25 * 1024 * 1024 : 5 * 1024 * 1024
    if (fileSize > maxSize) {
      return NextResponse.json({ error: `El archivo excede ${isPdf ? '25' : '5'}MB` }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.]/g, '_')
    const path = `${loanCode}/${timestamp}_${sanitizedName}`

    const { data, error: signError } = await adminSupabase
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (signError || !data) {
      console.error('Error creating signed URL:', signError)
      return NextResponse.json({ error: 'Error al generar URL de subida' }, { status: 500 })
    }

    const { data: { publicUrl } } = adminSupabase
      .storage
      .from(BUCKET)
      .getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl,
    })
  } catch (error) {
    console.error('Error in signed-url route:', error)
    return NextResponse.json({ error: 'Error al generar URL' }, { status: 500 })
  }
}
