import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'
import { createClient } from '@/utils/supabase/server'
import { parseChecklistText } from '@/lib/documentos/parser/checklist'

export const runtime = 'nodejs'

async function verifyAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const archivo = formData.get('archivo')

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Archivo no recibido (campo "archivo" requerido)' },
        { status: 400 }
      )
    }

    if (!archivo.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json(
        { ok: false, error: 'El archivo debe ser .docx' },
        { status: 400 }
      )
    }

    const maxBytes = 20 * 1024 * 1024
    if (archivo.size > maxBytes) {
      return NextResponse.json(
        { ok: false, error: 'Archivo supera 20 MB' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await archivo.arrayBuffer())
    const { value: texto } = await mammoth.extractRawText({ buffer })

    if (!texto || texto.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'El documento no contiene texto extraible' },
        { status: 400 }
      )
    }

    const datos = parseChecklistText(texto)
    return NextResponse.json({ ok: true, datos })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
