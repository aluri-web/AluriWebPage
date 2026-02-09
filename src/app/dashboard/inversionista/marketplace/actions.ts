'use server'

import { createClient } from '../../../../utils/supabase/server'

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

export interface MarketplaceLoan {
  id: string
  code: string
  amount_requested: number
  amount_funded: number
  interest_rate_ea: number | null
  term_months: number | null
  property_info: PropertyInfo | null
  workflow_dates: WorkflowDates | null
}

export async function getActiveLoans(): Promise<{ data: MarketplaceLoan[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loans')
    .select(`
      id,
      code,
      amount_requested,
      amount_funded,
      interest_rate_ea,
      term_months,
      property_info,
      workflow_dates
    `)
    .eq('status', 'fundraising')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active loans:', error.message)
    return { data: [], error: error.message }
  }

  return { data: data as MarketplaceLoan[], error: null }
}
