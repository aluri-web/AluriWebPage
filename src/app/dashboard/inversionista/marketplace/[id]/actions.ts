'use server'

import { createClient } from '../../../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreditoOpportunity {
  id: string
  codigo_credito: string
  monto_solicitado: number
  tasa_interes_ea: number | null
  tasa_nominal: number | null
  plazo: number | null
  tipo_amortizacion: string | null
  ciudad_inmueble: string | null
  direccion_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  ltv: number | null
  fecha_firma_programada: string | null
  fecha_desembolso: string | null
  fotos_inmueble: string[] | null
  inversiones: { monto_invertido: number; estado: string }[]
  owner: {
    full_name: string | null
  } | null
}

export async function getLoanDetail(loanId: string): Promise<{ data: CreditoOpportunity | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('creditos')
    .select(`
      id,
      codigo_credito,
      monto_solicitado,
      tasa_interes_ea,
      tasa_nominal,
      plazo,
      tipo_amortizacion,
      ciudad_inmueble,
      direccion_inmueble,
      tipo_inmueble,
      valor_comercial,
      ltv,
      fecha_firma_programada,
      fecha_desembolso,
      fotos_inmueble,
      inversiones (
        monto_invertido,
        estado
      ),
      owner:profiles!cliente_id (
        full_name
      )
    `)
    .eq('id', loanId)
    .eq('estado', 'publicado')
    .single()

  if (error) {
    console.error('Error fetching credito detail:', error.message)
    return { data: null, error: error.message }
  }

  return { data: data as unknown as CreditoOpportunity, error: null }
}

const MIN_INVESTMENT = 40_000_000
const MAX_INVESTORS = 5

export async function investInLoan(
  loanId: string,
  amount: number
): Promise<{ success: boolean; message: string; error?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: '', error: 'Debes iniciar sesión para invertir.' }
  }

  // Validate amount
  if (!amount || amount <= 0) {
    return { success: false, message: '', error: 'El monto debe ser mayor a 0.' }
  }

  if (amount < MIN_INVESTMENT) {
    return { success: false, message: '', error: `El monto mínimo de inversión es $${MIN_INVESTMENT.toLocaleString('es-CO')}.` }
  }

  // Verify the credito exists and is in publicado status
  const { data: credito, error: creditoError } = await supabase
    .from('creditos')
    .select('id, estado, monto_solicitado, inversiones(monto_invertido, estado)')
    .eq('id', loanId)
    .single()

  if (creditoError || !credito) {
    return { success: false, message: '', error: 'Oportunidad no encontrada.' }
  }

  if (credito.estado !== 'publicado') {
    return { success: false, message: '', error: 'Esta oportunidad ya no está disponible para inversión.' }
  }

  // Check investor count and remaining amount
  const activeInvestments = ((credito as any).inversiones || [])
    .filter((i: any) => i.estado === 'activo' || i.estado === 'pendiente')
  const investorCount = activeInvestments.length
  const amountRequested = credito.monto_solicitado || 0
  const amountFunded = activeInvestments
    .reduce((s: number, i: any) => s + (i.monto_invertido || 0), 0)
  const remainingAmount = amountRequested - amountFunded

  if (investorCount >= MAX_INVESTORS) {
    return { success: false, message: '', error: 'Este crédito ya alcanzó el máximo de 5 inversionistas.' }
  }

  if (amount > remainingAmount) {
    return {
      success: false,
      message: '',
      error: `El monto máximo disponible para invertir es ${remainingAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}.`
    }
  }

  // Insert inversion with pendiente status
  const { error: insertError } = await supabase
    .from('inversiones')
    .insert({
      credito_id: loanId,
      inversionista_id: user.id,
      monto_invertido: amount,
      estado: 'pendiente'
    })

  if (insertError) {
    console.error('Error creating inversion:', insertError.message)
    return { success: false, message: '', error: 'Error al crear la inversión: ' + insertError.message }
  }

  revalidatePath('/dashboard/inversionista/marketplace')
  revalidatePath(`/dashboard/inversionista/marketplace/${loanId}`)
  revalidatePath('/dashboard/inversionista/mis-inversiones')

  return { success: true, message: 'Inversión reservada exitosamente. Procede al pago.' }
}
