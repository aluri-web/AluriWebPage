import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generarContratoCorretaje } from '@/lib/documentos/contract/auxiliary'
import type { ChecklistPayload } from '@/lib/documentos/types'

export const runtime = 'nodejs'

async function isAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json() as { payload: ChecklistPayload }
    const { payload } = body

    if (!payload || !Array.isArray(payload.deudores) || payload.deudores.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Payload inválido: se requiere al menos un deudor' },
        { status: 400 }
      )
    }

    const { buffer, filename } = generarContratoCorretaje(payload)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
