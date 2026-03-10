import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const AGENT_URLS: Record<string, string | undefined> = {
  titulos: process.env.AGENT_TITULOS_URL,
  kyc: process.env.AGENT_KYC_URL,
  credito: process.env.AGENT_CREDITO_URL,
  ficha: process.env.AGENT_FICHA_URL,
}

const MOCK_DELAYS: Record<string, number> = {
  titulos: 4000,
  kyc: 3000,
  credito: 5000,
  ficha: 3000,
}

const MOCK_RESULTS: Record<string, object> = {
  titulos: {
    riesgo: 'bajo',
    propietario_verificado: true,
    gravamenes: false,
    anotaciones: 2,
    hipotecas_vigentes: 0,
    embargos: false,
    area_registrada: '120 m²',
    matricula_inmobiliaria: '50C-1234567',
    resumen: 'Titulo limpio sin gravamenes ni embargos. Propietario verificado correctamente. 2 anotaciones registradas (compraventa original y actualizacion catastral). Sin hipotecas vigentes.',
  },
  kyc: {
    identidad_verificada: true,
    nombre_coincide: true,
    documento_vigente: true,
    listas_restrictivas: false,
    peps: false,
    edad: 42,
    lugar_expedicion: 'Bogota D.C.',
    resumen: 'Identidad verificada exitosamente contra la Registraduria Nacional. Documento vigente. Sin coincidencias en listas restrictivas OFAC/ONU. No es PEP.',
  },
  credito: {
    capacidad_pago: 'alta',
    ingresos_mensuales: 8500000,
    gastos_fijos: 3200000,
    endeudamiento_porcentaje: 25,
    score_crediticio: 780,
    historial_creditos: 3,
    creditos_en_mora: 0,
    patrimonio_estimado: 450000000,
    resumen: 'Capacidad de pago alta. Ingresos mensuales de $8.5M COP con endeudamiento del 25%. Score crediticio de 780/999. Sin creditos en mora. Patrimonio estimado de $450M COP.',
  },
  ficha: {
    resumen_general: 'Analisis completado exitosamente. Todos los indicadores dentro de parametros aceptables.',
    recomendacion: 'APROBAR',
    nivel_riesgo_global: 'BAJO',
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { agente, documentos } = await request.json()

    if (!agente || !MOCK_RESULTS[agente]) {
      return NextResponse.json({ error: 'Agente invalido' }, { status: 400 })
    }

    const externalUrl = AGENT_URLS[agente]

    if (externalUrl) {
      try {
        const externalRes = await fetch(externalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentos }),
        })
        const externalData = await externalRes.json()
        return NextResponse.json({ success: true, agente, resultado: externalData })
      } catch (error) {
        console.error(`Error calling agent ${agente}:`, error)
        return NextResponse.json({ error: `Error al llamar agente ${agente}` }, { status: 502 })
      }
    }

    // Mock: simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAYS[agente]))

    return NextResponse.json({
      success: true,
      agente,
      simulado: true,
      resultado: MOCK_RESULTS[agente],
    })
  } catch (error) {
    console.error('Error in agentes-ia POST:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
