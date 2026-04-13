import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const CONTRACT_AGENT_URL = process.env.CONTRACT_AGENT_URL || 'http://127.0.0.1:8003'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const evaluationId = request.nextUrl.searchParams.get('id')
    if (!evaluationId) {
      return NextResponse.json({ error: 'Falta id de evaluación' }, { status: 400 })
    }

    const res = await fetch(`${CONTRACT_AGENT_URL}/api/contracts/prefill/${evaluationId}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
