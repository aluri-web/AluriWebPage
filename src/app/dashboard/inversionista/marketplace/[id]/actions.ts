'use server'

import { createClient } from '../../../../../utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PropertyInfo {
  address?: string
  city?: string
  commercial_value?: number
  registration_number?: string
  property_type?: string
  image_url?: string
  photos?: string[]
}

export interface WorkflowDates {
  signature_date?: string | null
  disbursement_date?: string | null
  estimated_date?: string | null
}

export interface LoanOpportunity {
  id: string
  code: string
  amount_requested: number
  amount_funded: number
  interest_rate_ea: number | null
  interest_rate_nm: number | null
  term_months: number | null
  payment_type: string | null
  property_info: PropertyInfo | null
  workflow_dates: WorkflowDates | null
  owner: {
    full_name: string | null
  } | null
}

export async function getLoanDetail(loanId: string): Promise<{ data: LoanOpportunity | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loans')
    .select(`
      id,
      code,
      amount_requested,
      amount_funded,
      interest_rate_ea,
      interest_rate_nm,
      term_months,
      payment_type,
      property_info,
      workflow_dates,
      owner:profiles!owner_id (
        full_name
      )
    `)
    .eq('id', loanId)
    .eq('status', 'fundraising')
    .single()

  if (error) {
    console.error('Error fetching loan detail:', error.message)
    return { data: null, error: error.message }
  }

  return { data: data as unknown as LoanOpportunity, error: null }
}

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

  // Verify the loan exists and is in fundraising status
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('id, status, amount_requested, amount_funded')
    .eq('id', loanId)
    .single()

  if (loanError || !loan) {
    return { success: false, message: '', error: 'Oportunidad no encontrada.' }
  }

  if (loan.status !== 'fundraising') {
    return { success: false, message: '', error: 'Esta oportunidad ya no está disponible para inversión.' }
  }

  // Check if investment amount exceeds remaining amount
  const amountRequested = loan.amount_requested || 0
  const amountFunded = loan.amount_funded || 0
  const remainingAmount = amountRequested - amountFunded

  if (amount > remainingAmount) {
    return {
      success: false,
      message: '',
      error: `El monto máximo disponible para invertir es ${remainingAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}.`
    }
  }

  // Insert investment with pending_payment status
  const { error: insertError } = await supabase
    .from('investments')
    .insert({
      loan_id: loanId,
      investor_id: user.id,
      amount_invested: amount,
      status: 'pending_payment'
    })

  if (insertError) {
    console.error('Error creating investment:', insertError.message)
    return { success: false, message: '', error: 'Error al crear la inversión: ' + insertError.message }
  }

  revalidatePath('/dashboard/inversionista/marketplace')
  revalidatePath(`/dashboard/inversionista/marketplace/${loanId}`)
  revalidatePath('/dashboard/inversionista/mis-inversiones')

  return { success: true, message: 'Inversión reservada exitosamente. Procede al pago.' }
}
