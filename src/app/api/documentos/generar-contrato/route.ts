import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generarContrato } from '@/lib/documentos/contract/generate'
import { saveContrato } from '@/lib/documentos/storage/saveContrato'
import type { ChecklistPayload } from '@/lib/documentos/types'

export const runtime = 'nodejs'

async function getAdminContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, userId: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return { ok: profile?.role === 'admin', userId: user.id }
}

export async function POST(request: NextRequest) {
  const { ok, userId } = await getAdminContext()
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as ChecklistPayload

    if (!body || !Array.isArray(body.deudores) || body.deudores.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Payload invalido: se requiere al menos un deudor' },
        { status: 400 }
      )
    }

    const { buffer, filename } = generarContrato(body)

    // Persistencia best-effort: no bloqueamos la descarga si falla
    let savedId: string | null = null
    try {
      const saved = await saveContrato({
        payload: body,
        createdBy: userId,
        docxBuffer: buffer,
        docxFilename: filename,
      })
      savedId = saved.id
    } catch (saveErr) {
      console.error('[generar-contrato] fallo guardado en storage:', saveErr)
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        ...(savedId ? { 'X-Contrato-Id': savedId } : {}),
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
