'use server'

import { createClient } from '../../../../utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { auditLog } from '@/lib/audit-log'

// ========== ADMIN AUTH HELPER ==========

async function verifyAdmin(): Promise<{ authorized: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authorized: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: 'No autorizado' }
  }
  return { authorized: true }
}

// ========== GET PAYMENT DETAILS ==========

export interface PaymentDetail {
  referencia: string
  credito_id: string
  credito_codigo: string
  propietario: string
  fecha: string
  capital: number
  intereses: number
  mora: number
  total: number
  transacciones: {
    id: string
    tipo_transaccion: string
    monto: number
  }[]
}

export async function getPaymentDetail(referencia: string): Promise<{ data: PaymentDetail | null; error: string | null }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { data: null, error: adminCheck.error || 'No autorizado' }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { data: null, error: 'Configuracion incompleta' }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data: txns, error } = await supabase
    .from('transacciones')
    .select(`
      id,
      credito_id,
      tipo_transaccion,
      monto,
      fecha_aplicacion,
      credito:creditos!credito_id (
        codigo_credito,
        cliente:profiles!cliente_id (
          full_name
        )
      )
    `)
    .eq('referencia_pago', referencia)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

  if (error || !txns || txns.length === 0) {
    return { data: null, error: error?.message || 'Pago no encontrado' }
  }

  const first = txns[0]
  const creditoRaw = first.credito as unknown
  const creditoData = Array.isArray(creditoRaw) ? creditoRaw[0] : creditoRaw as { codigo_credito?: string; cliente?: unknown } | null
  const clienteRaw = creditoData?.cliente
  const clienteData = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw as { full_name?: string } | null

  let capital = 0, intereses = 0, mora = 0
  const transacciones: PaymentDetail['transacciones'] = []

  for (const tx of txns) {
    transacciones.push({ id: tx.id, tipo_transaccion: tx.tipo_transaccion, monto: tx.monto })
    if (tx.tipo_transaccion === 'pago_capital') capital += tx.monto
    else if (tx.tipo_transaccion === 'pago_interes') intereses += tx.monto
    else if (tx.tipo_transaccion === 'pago_mora') mora += tx.monto
  }

  return {
    data: {
      referencia,
      credito_id: first.credito_id,
      credito_codigo: creditoData?.codigo_credito || 'N/A',
      propietario: clienteData?.full_name || 'Sin nombre',
      fecha: first.fecha_aplicacion,
      capital,
      intereses,
      mora,
      total: capital + intereses + mora,
      transacciones,
    },
    error: null,
  }
}

// ========== UPDATE PAYMENT ==========

interface UpdatePaymentData {
  referencia: string
  fecha: string
  capital: number
  intereses: number
  mora: number
}

export async function updatePayment(
  data: UpdatePaymentData
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { success: false, error: 'Configuracion incompleta' }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  // Get existing transactions for this payment
  const { data: txns, error: fetchError } = await supabase
    .from('transacciones')
    .select('id, credito_id, tipo_transaccion, monto')
    .eq('referencia_pago', data.referencia)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

  if (fetchError || !txns || txns.length === 0) {
    return { success: false, error: 'Pago no encontrado' }
  }

  const creditoId = txns[0].credito_id

  // Calculate old totals
  let oldCapital = 0, oldIntereses = 0, oldMora = 0
  for (const tx of txns) {
    if (tx.tipo_transaccion === 'pago_capital') oldCapital += tx.monto
    else if (tx.tipo_transaccion === 'pago_interes') oldIntereses += tx.monto
    else if (tx.tipo_transaccion === 'pago_mora') oldMora += tx.monto
  }

  // Calculate deltas for saldo adjustment
  const deltaCapital = data.capital - oldCapital
  const deltaIntereses = data.intereses - oldIntereses
  const deltaMora = data.mora - oldMora

  // Delete old transactions
  const { error: deleteError } = await supabase
    .from('transacciones')
    .delete()
    .eq('referencia_pago', data.referencia)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

  if (deleteError) {
    return { success: false, error: 'Error al actualizar transacciones: ' + deleteError.message }
  }

  // Insert new transactions
  const newTxns: {
    credito_id: string
    tipo_transaccion: string
    monto: number
    fecha_aplicacion: string
    fecha_transaccion: string
    referencia_pago: string
  }[] = []

  if (data.mora > 0) {
    newTxns.push({
      credito_id: creditoId,
      tipo_transaccion: 'pago_mora',
      monto: data.mora,
      fecha_aplicacion: data.fecha,
      fecha_transaccion: data.fecha,
      referencia_pago: data.referencia,
    })
  }
  if (data.intereses > 0) {
    newTxns.push({
      credito_id: creditoId,
      tipo_transaccion: 'pago_interes',
      monto: data.intereses,
      fecha_aplicacion: data.fecha,
      fecha_transaccion: data.fecha,
      referencia_pago: data.referencia,
    })
  }
  if (data.capital > 0) {
    newTxns.push({
      credito_id: creditoId,
      tipo_transaccion: 'pago_capital',
      monto: data.capital,
      fecha_aplicacion: data.fecha,
      fecha_transaccion: data.fecha,
      referencia_pago: data.referencia,
    })
  }

  if (newTxns.length > 0) {
    const { error: insertError } = await supabase
      .from('transacciones')
      .insert(newTxns)

    if (insertError) {
      return { success: false, error: 'Error al insertar transacciones: ' + insertError.message }
    }
  }

  // Update saldos on the credit (adjust by deltas)
  const { data: credito } = await supabase
    .from('creditos')
    .select('saldo_capital, saldo_intereses, saldo_mora')
    .eq('id', creditoId)
    .single()

  if (credito) {
    await supabase
      .from('creditos')
      .update({
        saldo_capital: (credito.saldo_capital || 0) - deltaCapital,
        saldo_intereses: (credito.saldo_intereses || 0) - deltaIntereses,
        saldo_mora: (credito.saldo_mora || 0) - deltaMora,
      })
      .eq('id', creditoId)
  }

  await auditLog({
    action: 'payment.update',
    resource_type: 'pago',
    resource_id: data.referencia,
    details: {
      credito_id: creditoId,
      old: { capital: oldCapital, intereses: oldIntereses, mora: oldMora },
      new: { capital: data.capital, intereses: data.intereses, mora: data.mora },
      fecha: data.fecha,
    },
  })

  revalidatePath('/dashboard/admin/pagos')
  revalidatePath('/dashboard/admin/colocaciones')

  return { success: true }
}

// ========== DELETE PAYMENT ==========

export async function deletePayment(
  referencia: string
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { success: false, error: 'Configuracion incompleta' }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  // Get transactions to reverse saldos
  const { data: txns, error: fetchError } = await supabase
    .from('transacciones')
    .select('id, credito_id, tipo_transaccion, monto')
    .eq('referencia_pago', referencia)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

  if (fetchError || !txns || txns.length === 0) {
    return { success: false, error: 'Pago no encontrado' }
  }

  const creditoId = txns[0].credito_id
  let capital = 0, intereses = 0, mora = 0
  for (const tx of txns) {
    if (tx.tipo_transaccion === 'pago_capital') capital += tx.monto
    else if (tx.tipo_transaccion === 'pago_interes') intereses += tx.monto
    else if (tx.tipo_transaccion === 'pago_mora') mora += tx.monto
  }

  // Delete transactions
  const { error: deleteError } = await supabase
    .from('transacciones')
    .delete()
    .eq('referencia_pago', referencia)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

  if (deleteError) {
    return { success: false, error: 'Error al eliminar transacciones: ' + deleteError.message }
  }

  // Reverse saldos on the credit
  const { data: credito } = await supabase
    .from('creditos')
    .select('saldo_capital, saldo_intereses, saldo_mora')
    .eq('id', creditoId)
    .single()

  if (credito) {
    await supabase
      .from('creditos')
      .update({
        saldo_capital: (credito.saldo_capital || 0) + capital,
        saldo_intereses: (credito.saldo_intereses || 0) + intereses,
        saldo_mora: (credito.saldo_mora || 0) + mora,
      })
      .eq('id', creditoId)
  }

  await auditLog({
    action: 'payment.delete',
    resource_type: 'pago',
    resource_id: referencia,
    details: {
      credito_id: creditoId,
      reversed: { capital, intereses, mora, total: capital + intereses + mora },
    },
  })

  revalidatePath('/dashboard/admin/pagos')
  revalidatePath('/dashboard/admin/colocaciones')

  return { success: true }
}
