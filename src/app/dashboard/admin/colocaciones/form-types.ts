export interface PrefillData {
  debtor_cedula?: string
  debtor_id?: string
  debtor_name?: string
  debtor_email?: string
  is_new_debtor?: boolean
  amount_requested?: number
  property_address?: string
  property_city?: string
  commercial_value?: number
  property_photos?: string[]
}
