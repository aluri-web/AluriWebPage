import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

const bodySchema = z.object({
  event: z.string().min(1).max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
  path: z.string().max(500).optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || null
    const userAgent = request.headers.get('user-agent') || null

    await supabase.from('user_events').insert({
      user_id: user.id,
      role: profile?.role ?? null,
      event: parsed.data.event,
      source: 'client',
      metadata: parsed.data.metadata ?? {},
      path: parsed.data.path ?? null,
      ip_address: ip,
      user_agent: userAgent,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
