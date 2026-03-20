import { NextRequest, NextResponse } from 'next/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001'

export async function GET(req: NextRequest) {
  const evaluationId = req.nextUrl.searchParams.get('id')
  if (!evaluationId) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
  }

  try {
    // Get fresh signed URL from orchestrator (follows redirect)
    const res = await fetch(`${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}/pdf`, {
      redirect: 'follow',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'PDF not found' }, { status: res.status })
    }

    const blob = await res.blob()
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ficha-tecnica-${evaluationId}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 })
  }
}
