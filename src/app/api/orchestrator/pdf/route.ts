import { NextRequest, NextResponse } from 'next/server'

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001'

// Map of supported PDF types to their orchestrator query param + filename label
const PDF_TYPES: Record<string, { type: string; label: string }> = {
  ficha:                  { type: '',                       label: 'ficha-tecnica'           },
  anexo_juridico:         { type: 'anexo_juridico',         label: 'anexo-juridico'          },
  anexo_credito:          { type: 'anexo_credito',          label: 'anexo-credito'           },
  anexo_kyc:              { type: 'anexo_kyc',              label: 'anexo-kyc'               },
  anexo_credito_codeudor: { type: 'anexo_credito_codeudor', label: 'anexo-credito-codeudor' },
  anexo_kyc_codeudor:     { type: 'anexo_kyc_codeudor',     label: 'anexo-kyc-codeudor'     },
}

export async function GET(req: NextRequest) {
  const evaluationId = req.nextUrl.searchParams.get('id')
  const docType = req.nextUrl.searchParams.get('type') || 'ficha'
  if (!evaluationId) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
  }
  const cfg = PDF_TYPES[docType]
  if (!cfg) {
    return NextResponse.json(
      { error: `Invalid type '${docType}'. Use: ${Object.keys(PDF_TYPES).join(', ')}` },
      { status: 400 },
    )
  }

  try {
    // Build orchestrator URL with optional ?type= for annexes
    const upstream = cfg.type
      ? `${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}/pdf?type=${cfg.type}`
      : `${ORCHESTRATOR_URL}/api/evaluations/${evaluationId}/pdf`
    const res = await fetch(upstream, { redirect: 'follow' })

    if (!res.ok) {
      return NextResponse.json({ error: 'PDF not found' }, { status: res.status })
    }

    const blob = await res.blob()
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cfg.label}-${evaluationId}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 })
  }
}
