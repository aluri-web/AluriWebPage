import { NextRequest, NextResponse } from 'next/server'
import { verificarAuth } from '@/lib/api-keys'

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
    const authResult = await verificarAuth(request, 'admin')
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
    const authResult = await verificarAuth(request, 'admin')
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
