'use server'

import { createClient } from '../../../../utils/supabase/server'

export interface ExtractoPago {
  fecha: string
  capital: number
  interes: number
  mora: number
  total: number
  saldo: number
}

export interface ExtractoData {
  propietario: { nombre: string; email: string; documento: string }
  credito: { codigo_credito: string; monto_solicitado: number; valor_colocado: number; saldo_capital: number }
  inversionistas: { nombre: string; monto_invertido: number }[]
  periodo: { anio: number | null; mes: number | null; label: string }
  pagos: ExtractoPago[]
  totales: { capital: number; interes: number; mora: number; total: number }
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export async function getExtractoPropietario(
  creditoId: string,
  anio: number | null,
  mes: number | null = null
): Promise<{ data: ExtractoData | null; error: string | null }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: 'No autenticado' }
  }

  // Fetch propietario profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, document_id')
    .eq('id', user.id)
    .single()

  // Fetch credit verifying ownership
  const { data: credito, error: creditoError } = await supabase
    .from('creditos')
    .select('id, codigo_credito, monto_solicitado, valor_colocado, saldo_capital')
    .eq('id', creditoId)
    .eq('cliente_id', user.id)
    .single()

  if (creditoError || !credito) {
    return { data: null, error: 'Crédito no encontrado' }
  }

  // Fetch inversionistas que fondearon el credito
  const { data: inversionesData } = await supabase
    .from('inversiones')
    .select('monto_invertido, estado, profiles!inversionista_id(full_name)')
    .eq('credito_id', credito.id)
    .eq('estado', 'activo')

  type InvRow = { monto_invertido: number | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }
  const inversionistas = ((inversionesData as InvRow[] | null) || []).map(inv => {
    const p = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles
    return {
      nombre: p?.full_name || 'Inversionista',
      monto_invertido: inv.monto_invertido || 0,
    }
  })

  // Fetch ALL transactions (needed to compute running saldo correctly)
  const { data: transacciones } = await supabase
    .from('transacciones')
    .select('id, tipo_transaccion, monto, fecha_transaccion, referencia_pago')
    .eq('credito_id', credito.id)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
    .order('fecha_transaccion', { ascending: true })

  // Group by referencia_pago
  const grupos: Record<string, { fecha: string; capital: number; interes: number; mora: number }> = {}

  for (const tx of (transacciones || [])) {
    const ref = tx.referencia_pago || tx.id
    if (!grupos[ref]) {
      grupos[ref] = { fecha: tx.fecha_transaccion, capital: 0, interes: 0, mora: 0 }
    }
    if (tx.tipo_transaccion === 'pago_capital') grupos[ref].capital += tx.monto || 0
    else if (tx.tipo_transaccion === 'pago_interes') grupos[ref].interes += tx.monto || 0
    else if (tx.tipo_transaccion === 'pago_mora') grupos[ref].mora += tx.monto || 0
  }

  const valorInicial = credito.valor_colocado || credito.monto_solicitado
  let saldoAcumulado = valorInicial

  // Sort all payments chronologically and compute running saldo
  const todosPagos = Object.values(grupos)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(g => {
      saldoAcumulado -= g.capital
      return {
        fecha: g.fecha,
        capital: g.capital,
        interes: g.interes,
        mora: g.mora,
        total: g.capital + g.interes + g.mora,
        saldo: saldoAcumulado,
      }
    })

  // Filter: global (all), yearly, or monthly
  const pagos: ExtractoPago[] = anio === null
    ? todosPagos
    : todosPagos.filter(p => {
        const d = new Date(p.fecha)
        if (d.getFullYear() !== anio) return false
        if (mes !== null && d.getMonth() + 1 !== mes) return false
        return true
      })

  const totales = pagos.reduce(
    (acc, p) => ({
      capital: acc.capital + p.capital,
      interes: acc.interes + p.interes,
      mora: acc.mora + p.mora,
      total: acc.total + p.total,
    }),
    { capital: 0, interes: 0, mora: 0, total: 0 }
  )

  return {
    data: {
      propietario: {
        nombre: profile?.full_name || 'Propietario',
        email: profile?.email || '',
        documento: profile?.document_id || '',
      },
      credito: {
        codigo_credito: credito.codigo_credito,
        monto_solicitado: credito.monto_solicitado,
        valor_colocado: credito.valor_colocado || 0,
        saldo_capital: credito.saldo_capital || 0,
      },
      inversionistas,
      periodo: {
        anio,
        mes,
        label: anio === null
          ? 'Histórico completo'
          : mes !== null
            ? `${MESES[mes - 1]} ${anio}`
            : `Año ${anio}`,
      },
      pagos,
      totales,
    },
    error: null,
  }
}
