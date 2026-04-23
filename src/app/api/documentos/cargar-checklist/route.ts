import { NextRequest, NextResponse } from 'next/server'
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

/**
 * POST /api/documentos/cargar-checklist
 * Body (JSON): { texto: string } — texto plano ya extraido del .docx en el cliente.
 *
 * Antes este endpoint recibia el .docx binario como multipart/form-data, pero
 * Vercel tiene un limite de ~4.5 MB para request bodies y con multipart overhead
 * los .docx de ~2.5 MB disparan "Request Entity Too Large". Ahora el cliente
 * extrae el texto con mammoth (browser build) y solo envia ~20 KB de texto.
 */
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => null)
    const texto = body?.texto

    if (typeof texto !== 'string' || texto.trim().length === 0) {
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
