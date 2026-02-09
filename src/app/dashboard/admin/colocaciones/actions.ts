'use server'

import { createClient } from '../../../../utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// ========== SEARCH & LOOKUP FUNCTIONS ==========

export interface DebtorSearchResult {
  found: boolean
  id?: string
  full_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
}

export async function searchDebtorByCedula(cedula: string): Promise<DebtorSearchResult> {
  if (!cedula || cedula.length < 5) {
    return { found: false }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, address, city')
    .eq('document_id', cedula)
    .single()

  if (error || !data) {
    return { found: false }
  }

  return {
    found: true,
    id: data.id,
    full_name: data.full_name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    city: data.city || ''
  }
}

export interface InvestorOption {
  id: string
  full_name: string | null
  document_id: string | null
  email: string | null
}

export async function getInvestorsForSelect(): Promise<{ data: InvestorOption[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, document_id, email')
    .eq('role', 'inversionista')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching investors:', error.message)
    return { data: [], error: error.message }
  }

  return { data: data as InvestorOption[], error: null }
}

// Search investor by cedula (for inline creation)
export async function searchInvestorByCedula(cedula: string): Promise<DebtorSearchResult> {
  if (!cedula || cedula.length < 5) {
    return { found: false }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, address, city')
    .eq('document_id', cedula)
    .eq('role', 'inversionista')
    .single()

  if (error || !data) {
    return { found: false }
  }

  return {
    found: true,
    id: data.id,
    full_name: data.full_name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    city: data.city || ''
  }
}

// ========== USER CREATION HELPER (IDEMPOTENT) ==========

interface CreateUserData {
  cedula: string
  full_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  role: 'propietario' | 'inversionista'
}

async function createUserWithProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userData: CreateUserData
): Promise<{ success: boolean; userId?: string; error?: string; wasExisting?: boolean }> {
  const { cedula, full_name, email, phone, address, city, role } = userData

  let userId: string | undefined
  let wasExisting = false

  // Try to create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: `Temp${cedula}!`,
    email_confirm: true,
    user_metadata: {
      full_name,
      document_id: cedula,
      role
    }
  })

  if (authError) {
    // Check if user already exists
    if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
      console.log(`User with email ${email} already exists, recovering...`)

      // Recover existing user by email using listUsers
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
      })

      if (listError) {
        console.error('Error listing users:', listError.message)
        return { success: false, error: 'Error al buscar usuario existente.' }
      }

      // Search by email in profiles table instead (more reliable)
      const { data: existingUserProfile, error: profileSearchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profileSearchError || !existingUserProfile) {
        // Try searching in auth users directly
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
        const foundUser = authUsers?.users?.find(u => u.email === email)

        if (foundUser) {
          userId = foundUser.id
          wasExisting = true
          console.log(`Found existing auth user: ${userId}`)
        } else {
          return { success: false, error: 'Usuario existe en Auth pero no se puede recuperar.' }
        }
      } else {
        userId = existingUserProfile.id
        wasExisting = true
        console.log(`Found existing profile user: ${userId}`)
      }
    } else {
      return { success: false, error: 'Error al crear usuario: ' + authError.message }
    }
  } else {
    userId = authData.user.id
  }

  if (!userId) {
    return { success: false, error: 'No se pudo obtener el ID del usuario.' }
  }

  // Upsert profile - update if exists, create if not
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (!existingProfile) {
    // Create new profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: full_name,
        document_id: cedula,
        phone: phone || null,
        address: address || null,
        city: city || null,
        role: role,
        verification_status: 'verified'
      })

    if (profileError) {
      // Only delete user if we just created it
      if (!wasExisting) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      return { success: false, error: 'Error al crear perfil: ' + profileError.message }
    }
  } else {
    // Update existing profile with new data (upsert logic)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name,
        document_id: cedula,
        phone: phone || null,
        address: address || null,
        city: city || null,
        // Only update role if it's a "stronger" role or same
        // propietario can become inversionista too, but we keep original role if already set
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating profile:', updateError.message)
      // Don't fail - profile exists, we can continue
    }
  }

  return { success: true, userId, wasExisting }
}

// ========== FULL LOAN CREATION (TRANSACTIONAL) ==========

export interface NewPersonData {
  cedula: string
  full_name: string
  email: string
  phone?: string
  address?: string
  city?: string
}

export interface PropertyData {
  address: string
  city: string
  property_type: string
  commercial_value: number
  photos?: string[]
}

export interface InvestorParticipation {
  investor_id?: string // Existing investor
  is_new: boolean
  new_investor?: NewPersonData // New investor data
  amount: number
  percentage: number
}

export interface FullLoanData {
  // Primary Debtor
  debtor_id?: string
  new_debtor?: NewPersonData

  // Co-Debtor (optional)
  has_co_debtor: boolean
  co_debtor_id?: string
  new_co_debtor?: NewPersonData

  // Loan
  code: string
  amount_requested: number
  interest_rate_nm: number // Tasa Nominal Mensual
  interest_rate_ea: number // Calculated: (1 + NM)^12 - 1
  term_months: number

  // Commissions
  debtor_commission: number // Monto en $
  aluri_commission_pct: number // Calculated: (comision / monto) * 100

  // Property
  property: PropertyData

  // Investors (max 5)
  investors: InvestorParticipation[]
}

export async function createFullLoanRecord(
  data: FullLoanData
): Promise<{ success: boolean; error?: string; loanId?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  // Validation
  if (!data.code || !data.amount_requested) {
    return { success: false, error: 'Codigo y monto son obligatorios.' }
  }

  if (!data.debtor_id && !data.new_debtor) {
    return { success: false, error: 'Debe seleccionar o crear un deudor.' }
  }

  if (data.investors.length > 5) {
    return { success: false, error: 'Maximo 5 inversionistas por credito.' }
  }

  // Calculate total investment
  const totalInvestment = data.investors.reduce((sum, inv) => sum + inv.amount, 0)
  if (totalInvestment > data.amount_requested) {
    return { success: false, error: 'El total de inversiones excede el monto del credito.' }
  }

  let primaryDebtorId = data.debtor_id
  let coDebtorId: string | null = null

  try {
    // 1. Create primary debtor if new
    if (!primaryDebtorId && data.new_debtor) {
      const result = await createUserWithProfile(supabaseAdmin, {
        ...data.new_debtor,
        role: 'propietario'
      })
      if (!result.success) {
        return { success: false, error: 'Error creando deudor: ' + result.error }
      }
      primaryDebtorId = result.userId
    }

    // 2. Create co-debtor if applicable
    if (data.has_co_debtor) {
      if (data.co_debtor_id) {
        coDebtorId = data.co_debtor_id
      } else if (data.new_co_debtor) {
        const result = await createUserWithProfile(supabaseAdmin, {
          ...data.new_co_debtor,
          role: 'propietario'
        })
        if (!result.success) {
          return { success: false, error: 'Error creando co-deudor: ' + result.error }
        }
        coDebtorId = result.userId || null
      }
    }

    // 3. Process investors - create new ones if needed
    const processedInvestors: { investor_id: string; amount: number; percentage: number }[] = []

    for (const inv of data.investors) {
      if (inv.amount <= 0) continue

      let investorId = inv.investor_id

      if (inv.is_new && inv.new_investor) {
        const result = await createUserWithProfile(supabaseAdmin, {
          ...inv.new_investor,
          role: 'inversionista'
        })
        if (!result.success) {
          return { success: false, error: 'Error creando inversionista: ' + result.error }
        }
        investorId = result.userId
      }

      if (investorId) {
        processedInvestors.push({
          investor_id: investorId,
          amount: inv.amount,
          percentage: inv.percentage
        })
      }
    }

    // 4. Create loan
    const propertyInfo = {
      address: data.property.address,
      city: data.property.city,
      property_type: data.property.property_type,
      commercial_value: data.property.commercial_value,
      photos: data.property.photos || []
    }

    const totalFunded = processedInvestors.reduce((sum, inv) => sum + inv.amount, 0)

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .insert({
        owner_id: primaryDebtorId,
        co_debtor_id: coDebtorId,
        code: data.code,
        amount_requested: data.amount_requested,
        amount_funded: totalFunded,
        interest_rate_nm: data.interest_rate_nm,
        interest_rate_ea: data.interest_rate_ea,
        term_months: data.term_months,
        debtor_commission: data.debtor_commission,
        aluri_commission_pct: data.aluri_commission_pct,
        payment_type: 'interest_only',
        property_info: propertyInfo,
        status: totalFunded >= data.amount_requested ? 'active' : 'fundraising',
        workflow_dates: {
          signature_date: new Date().toISOString().split('T')[0],
          disbursement_date: new Date().toISOString().split('T')[0],
          estimated_date: null
        }
      })
      .select('id')
      .single()

    if (loanError) {
      console.error('Error creating loan:', loanError.message)
      return { success: false, error: 'Error al crear credito: ' + loanError.message }
    }

    const loanId = loan.id

    // 5. Create investments
    if (processedInvestors.length > 0) {
      const investmentsToInsert = processedInvestors.map(inv => ({
        loan_id: loanId,
        investor_id: inv.investor_id,
        amount_invested: inv.amount,
        interest_rate_investor: data.interest_rate_ea,
        status: 'active',
        confirmed_at: new Date().toISOString()
      }))

      const { error: investError } = await supabaseAdmin
        .from('investments')
        .insert(investmentsToInsert)

      if (investError) {
        console.error('Error creating investments:', investError.message)
      }
    }

    revalidatePath('/dashboard/admin/colocaciones')
    revalidatePath('/dashboard/admin/creditos')

    return { success: true, loanId }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Error inesperado al crear el registro.' }
  }
}

// ========== GET ALL LOANS FOR TABLE ==========

export interface LoanTableRow {
  id: string
  code: string
  status: string
  amount_requested: number | null
  amount_funded: number | null
  interest_rate_nm: number | null
  interest_rate_ea: number | null
  debtor_commission: number | null
  debtor_name: string | null
  debtor_cedula: string | null
  co_debtor_name: string | null
  property_city: string | null
  property_value: number | null
  ltv: number | null
  investors: string[]
  created_at: string
}

export async function getAllLoansWithDetails(): Promise<{ data: LoanTableRow[]; error: string | null }> {
  const supabase = await createClient()

  // Get loans with owner and co-debtor info
  const { data: loans, error: loansError } = await supabase
    .from('loans')
    .select(`
      id,
      code,
      status,
      amount_requested,
      amount_funded,
      interest_rate_nm,
      interest_rate_ea,
      debtor_commission,
      property_info,
      created_at,
      owner:profiles!owner_id (
        full_name,
        document_id
      ),
      co_debtor:profiles!co_debtor_id (
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (loansError) {
    console.error('Error fetching loans:', loansError.message)
    return { data: [], error: loansError.message }
  }

  // Get all investments with investor names
  const { data: investments, error: invError } = await supabase
    .from('investments')
    .select(`
      loan_id,
      investor:profiles!investor_id (
        full_name
      )
    `)
    .eq('status', 'active')

  const investorsByLoan: Record<string, string[]> = {}
  if (!invError && investments) {
    investments.forEach(inv => {
      const loanId = inv.loan_id
      // Handle Supabase join which may return array or single object
      const investorData = inv.investor as unknown as { full_name: string | null } | null
      const name = investorData?.full_name || 'Sin nombre'
      if (!investorsByLoan[loanId]) {
        investorsByLoan[loanId] = []
      }
      if (!investorsByLoan[loanId].includes(name)) {
        investorsByLoan[loanId].push(name)
      }
    })
  }

  // Transform data
  const tableData: LoanTableRow[] = (loans || []).map(loan => {
    const propertyInfo = loan.property_info as { city?: string; commercial_value?: number } | null
    const propertyValue = propertyInfo?.commercial_value || 0
    const amountRequested = loan.amount_requested || 0
    const ltv = propertyValue > 0 ? (amountRequested / propertyValue) * 100 : null

    // Cast joined data properly (Supabase returns these as objects for single joins)
    const ownerData = loan.owner as unknown as { full_name: string | null; document_id: string | null } | null
    const coDebtorData = loan.co_debtor as unknown as { full_name: string | null } | null

    return {
      id: loan.id,
      code: loan.code,
      status: loan.status,
      amount_requested: loan.amount_requested,
      amount_funded: loan.amount_funded,
      interest_rate_nm: loan.interest_rate_nm,
      interest_rate_ea: loan.interest_rate_ea,
      debtor_commission: loan.debtor_commission,
      debtor_name: ownerData?.full_name || null,
      debtor_cedula: ownerData?.document_id || null,
      co_debtor_name: coDebtorData?.full_name || null,
      property_city: propertyInfo?.city || null,
      property_value: propertyValue || null,
      ltv,
      investors: investorsByLoan[loan.id] || [],
      created_at: loan.created_at
    }
  })

  return { data: tableData, error: null }
}

// ========== GENERATE NEXT CODE ==========

export async function getNextLoanCode(): Promise<string> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('loans')
    .select('code')
    .order('code', { ascending: false })
    .limit(1)
    .single()

  if (!data?.code) {
    return 'CR-001'
  }

  const match = data.code.match(/CR-(\d+)/)
  if (match) {
    const nextNum = parseInt(match[1]) + 1
    return `CR-${nextNum.toString().padStart(3, '0')}`
  }

  return 'CR-001'
}

// ========== ADD INVESTMENT TO EXISTING LOAN ==========

export interface AddInvestmentData {
  loan_id: string
  // Existing investor
  investor_id?: string
  // Or new investor
  is_new_investor: boolean
  new_investor?: {
    cedula: string
    full_name: string
    email: string
    phone?: string
  }
  amount: number
  investment_date: string
}

export async function addInvestmentToLoan(
  data: AddInvestmentData
): Promise<{ success: boolean; error?: string; investmentId?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  // Validation
  if (!data.loan_id || !data.amount || data.amount <= 0) {
    return { success: false, error: 'Datos de inversion invalidos.' }
  }

  if (!data.investor_id && !data.is_new_investor) {
    return { success: false, error: 'Debe seleccionar o crear un inversionista.' }
  }

  try {
    // 1. Get loan to validate capacity
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('id, code, amount_requested, amount_funded, interest_rate_ea')
      .eq('id', data.loan_id)
      .single()

    if (loanError || !loan) {
      return { success: false, error: 'Credito no encontrado.' }
    }

    const requested = loan.amount_requested || 0
    const funded = loan.amount_funded || 0
    const remaining = requested - funded

    if (data.amount > remaining) {
      return {
        success: false,
        error: `El monto excede el cupo disponible. Cupo restante: $${remaining.toLocaleString('es-CO')}`
      }
    }

    // 2. Get or create investor
    let investorId = data.investor_id

    if (data.is_new_investor && data.new_investor) {
      const result = await createUserWithProfile(supabaseAdmin, {
        cedula: data.new_investor.cedula,
        full_name: data.new_investor.full_name,
        email: data.new_investor.email,
        phone: data.new_investor.phone,
        role: 'inversionista'
      })

      if (!result.success) {
        return { success: false, error: 'Error creando inversionista: ' + result.error }
      }

      investorId = result.userId
    }

    if (!investorId) {
      return { success: false, error: 'No se pudo obtener el ID del inversionista.' }
    }

    // 3. Create investment
    const { data: investment, error: investError } = await supabaseAdmin
      .from('investments')
      .insert({
        loan_id: data.loan_id,
        investor_id: investorId,
        amount_invested: data.amount,
        interest_rate_investor: loan.interest_rate_ea,
        status: 'active',
        created_at: data.investment_date,
        confirmed_at: data.investment_date
      })
      .select('id')
      .single()

    if (investError) {
      console.error('Error creating investment:', investError.message)
      return { success: false, error: 'Error al crear inversion: ' + investError.message }
    }

    // 4. Update loan amount_funded
    const newFunded = funded + data.amount
    const newStatus = newFunded >= requested ? 'active' : 'fundraising'

    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update({
        amount_funded: newFunded,
        status: newStatus
      })
      .eq('id', data.loan_id)

    if (updateError) {
      console.error('Error updating loan:', updateError.message)
      // Don't fail - investment was created
    }

    revalidatePath('/dashboard/admin/colocaciones')
    revalidatePath('/dashboard/admin/creditos')

    return { success: true, investmentId: investment.id }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Error inesperado al agregar inversion.' }
  }
}

// ========== GET LOAN BY ID (for modal) ==========

export interface LoanForModal {
  id: string
  code: string
  amount_requested: number
  amount_funded: number
  remaining: number
  interest_rate_ea: number | null
}

export async function getLoanById(loanId: string): Promise<{ data: LoanForModal | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loans')
    .select('id, code, amount_requested, amount_funded, interest_rate_ea')
    .eq('id', loanId)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message || 'Credito no encontrado.' }
  }

  const requested = data.amount_requested || 0
  const funded = data.amount_funded || 0

  return {
    data: {
      id: data.id,
      code: data.code,
      amount_requested: requested,
      amount_funded: funded,
      remaining: requested - funded,
      interest_rate_ea: data.interest_rate_ea
    },
    error: null
  }
}

// ========== PAYMENT REGISTRATION ==========

export interface RegisterPaymentData {
  loan_id: string
  payment_date: string
  amount_capital: number
  amount_interest: number
  amount_late_fee: number
}

export async function registerLoanPayment(
  data: RegisterPaymentData
): Promise<{ success: boolean; error?: string; paymentId?: string }> {
  const supabase = await createClient()

  // Validation
  if (!data.loan_id) {
    return { success: false, error: 'ID del credito es requerido.' }
  }

  if (!data.payment_date) {
    return { success: false, error: 'Fecha de pago es requerida.' }
  }

  const totalAmount = data.amount_capital + data.amount_interest + data.amount_late_fee

  if (totalAmount <= 0) {
    return { success: false, error: 'El monto total debe ser mayor a cero.' }
  }

  try {
    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: data.loan_id,
        payment_date: data.payment_date,
        amount_capital: data.amount_capital,
        amount_interest: data.amount_interest,
        amount_late_fee: data.amount_late_fee,
        amount_total: totalAmount
      })
      .select('id')
      .single()

    if (paymentError) {
      console.error('Error registering payment:', paymentError.message)
      return { success: false, error: 'Error al registrar pago: ' + paymentError.message }
    }

    revalidatePath('/dashboard/admin/colocaciones')
    revalidatePath('/dashboard/admin/pagos')

    return { success: true, paymentId: payment.id }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Error inesperado al registrar el pago.' }
  }
}

// ========== GET PAYMENTS FOR A LOAN ==========

export interface LoanPayment {
  id: string
  payment_date: string
  amount_capital: number
  amount_interest: number
  amount_late_fee: number
  amount_total: number
  created_at: string
}

export async function getPaymentsForLoan(loanId: string): Promise<{ data: LoanPayment[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loan_payments')
    .select('id, payment_date, amount_capital, amount_interest, amount_late_fee, amount_total, created_at')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error.message)
    return { data: [], error: error.message }
  }

  return { data: data as LoanPayment[], error: null }
}
