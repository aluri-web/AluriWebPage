'use server'

import { createClient } from '../../../../utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createLoan } from '@/app/actions/create-loan'

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

  // Risk Profile (New)
  monthly_income?: number
  profession?: string
  warranty_analysis?: string
  contract_type?: 'hipotecario' | 'retroventa'
  amortization_type?: 'francesa' | 'solo_interes'
  liquidation_type?: 'anticipada' | 'vencida'
  tipo_persona?: 'natural' | 'juridica'
  commercial_value?: number
  estado?: string // Optional initial estado
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

  // Validate minimum investment per investor ($50M)
  const MIN_INVESTMENT = 50_000_000
  for (const inv of data.investors) {
    if (inv.amount > 0 && inv.amount < MIN_INVESTMENT) {
      return { success: false, error: `Cada inversionista debe aportar minimo $${MIN_INVESTMENT.toLocaleString('es-CO')}.` }
    }
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

    // 4. Create loan using the new System (createLoan action)
    // We map the data to the expected LoanParams

    // NOTE: interest_rate_nm is used as "Tasa Mensual" in createLoan
    // createLoan expects: borrowerId, amount, interestRate, termMonths, startDate, creditCode

    // Date handling: The form doesn't strictly have a start date, we use today or signature date
    const startDate = new Date().toISOString().split('T')[0]

    const loanResult = await createLoan({
      borrowerId: primaryDebtorId,
      amount: data.amount_requested,
      interestRate: data.interest_rate_nm,
      termMonths: data.term_months,
      startDate: startDate,

      creditCode: data.code,
      estado: data.estado, // Pass estado from form
      monthlyIncome: data.monthly_income, // New field
      profession: data.profession,       // New field
      warrantyAnalysis: data.warranty_analysis, // New field
      contractType: data.contract_type,
      amortizationType: data.amortization_type,
      liquidationType: data.liquidation_type,
      tipoPersona: data.tipo_persona,
      commercialValue: data.commercial_value,
      interestRateEa: data.interest_rate_ea,
      debtorCommission: data.debtor_commission,
      aluriCommissionPct: data.aluri_commission_pct,
      coDebtorId: coDebtorId || undefined,
      propertyAddress: data.property?.address,
      propertyCity: data.property?.city,
      propertyType: data.property?.property_type,
      propertyPhotos: data.property?.photos
    })

    if (loanResult.error || !loanResult.loanId) {
      console.error('Error creating loan via createLoan:', loanResult.error)
      return { success: false, error: 'Error al crear credito: ' + loanResult.error }
    }

    const loanId = loanResult.loanId

    // 5. Create investments
    if (processedInvestors.length > 0) {
      const investmentsToInsert = processedInvestors.map(inv => {
        // Calculate percentage if not provided or valid
        const percentage = (inv.amount / data.amount_requested) * 100

        return {
          credito_id: loanId,
          inversionista_id: inv.investor_id,
          monto_invertido: inv.amount,
          porcentaje_participacion: percentage,
          estado: 'activo',
          fecha_inversion: new Date().toISOString()
        }
      })

      const { error: investError } = await supabaseAdmin
        .from('inversiones')
        .insert(investmentsToInsert)

      if (investError) {
        console.error('Error creating investments:', investError.message)
        // Non-critical error for the loan creation itself, but should be logged/handled
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
  risk_score: string | null
  risk_label: string | null
  investors: string[]
  created_at: string
  saldo_capital: number
  saldo_intereses: number
  saldo_mora: number
}

export async function getAllLoansWithDetails(): Promise<{ data: LoanTableRow[]; error: string | null }> {
  const supabase = await createClient()

  // Get creditos with owner and co-debtor info
  const { data: creditos, error: creditosError } = await supabase
    .from('creditos')
    .select(`
      id,
      codigo_credito,
      estado,
      monto_solicitado,
      valor_colocado,
      tasa_nominal,
      tasa_interes_ea,
      plazo,
      valor_comercial,
      ltv,
      comision_deudor,
      comision_aluri_pct,
      ciudad_inmueble,
      direccion_inmueble,
      co_deudor_id,
      saldo_capital,
      saldo_intereses,
      saldo_mora,
      created_at,
      cliente:profiles!cliente_id (
        full_name,
        document_id
      )
    `)
    .order('created_at', { ascending: false })

  if (creditosError) {
    console.error('Error fetching creditos:', creditosError.message)
    return { data: [], error: creditosError.message }
  }

  // Get all inversiones with investor names
  const { data: inversiones, error: invError } = await supabase
    .from('inversiones')
    .select(`
      credito_id,
      inversionista:profiles!inversionista_id (
        full_name
      )
    `)
    .eq('estado', 'activo')

  const investorsByCredito: Record<string, string[]> = {}
  if (!invError && inversiones) {
    inversiones.forEach(inv => {
      const creditoId = inv.credito_id
      // Handle Supabase join which may return array or single object
      const investorData = inv.inversionista as unknown as { full_name: string | null } | null
      const name = investorData?.full_name || 'Sin nombre'
      if (!investorsByCredito[creditoId]) {
        investorsByCredito[creditoId] = []
      }
      if (!investorsByCredito[creditoId].includes(name)) {
        investorsByCredito[creditoId].push(name)
      }
    })
  }

  // Calculate monto_funded from inversiones
  const montoFundedByCredito: Record<string, number> = {}
  if (!invError && inversiones) {
    inversiones.forEach(inv => {
      const creditoId = inv.credito_id
      // We need to get the amount, but we didn't select it - fix this
    })
  }

  // Get inversiones with amounts for funding calculation
  const { data: inversionesWithAmounts } = await supabase
    .from('inversiones')
    .select('credito_id, monto_invertido')
    .eq('estado', 'activo')

  if (inversionesWithAmounts) {
    inversionesWithAmounts.forEach(inv => {
      const creditoId = inv.credito_id
      if (!montoFundedByCredito[creditoId]) {
        montoFundedByCredito[creditoId] = 0
      }
      montoFundedByCredito[creditoId] += inv.monto_invertido || 0
    })
  }

  // Get co-debtor names
  const coDebtorIds = (creditos || [])
    .map(c => c.co_deudor_id)
    .filter((id): id is string => !!id)

  const coDebtorNames: Record<string, string> = {}
  if (coDebtorIds.length > 0) {
    const { data: coDebtors } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', coDebtorIds)

    if (coDebtors) {
      coDebtors.forEach(cd => {
        coDebtorNames[cd.id] = cd.full_name || 'Sin nombre'
      })
    }
  }

  // Risk calculation helper (same logic as investor marketplace)
  const calculateRisk = (ltv: number | null): { score: string | null; label: string | null } => {
    if (ltv === null) return { score: null, label: null }
    if (ltv <= 40) return { score: 'A1', label: 'Bajo Riesgo' }
    if (ltv <= 55) return { score: 'A2', label: 'Riesgo Moderado' }
    if (ltv <= 70) return { score: 'B1', label: 'Riesgo Medio' }
    return { score: 'B2', label: 'Riesgo Alto' }
  }

  // Map DB estado (Spanish) to UI status (English)
  const statusMap: Record<string, string> = {
    publicado: 'fundraising',
    activo: 'active',
    mora: 'defaulted',
    finalizado: 'completed',
    pagado: 'completed',
    no_colocado: 'cancelled',
  }

  // Transform data - map Spanish fields to expected English interface
  const tableData: LoanTableRow[] = (creditos || []).map(credito => {
    const amountFunded = montoFundedByCredito[credito.id] || 0
    const ltv = (credito as any).ltv ?? null
    const risk = calculateRisk(ltv)

    // Cast joined data properly (Supabase returns these as objects for single joins)
    const clienteData = credito.cliente as unknown as { full_name: string | null; document_id: string | null } | null

    return {
      id: credito.id,
      code: credito.codigo_credito,
      status: statusMap[credito.estado] || credito.estado,
      amount_requested: credito.monto_solicitado,
      amount_funded: amountFunded,
      interest_rate_nm: credito.tasa_nominal,
      interest_rate_ea: credito.tasa_interes_ea || null,
      debtor_commission: credito.comision_deudor || null,
      debtor_name: clienteData?.full_name || null,
      debtor_cedula: clienteData?.document_id || null,
      co_debtor_name: credito.co_deudor_id ? (coDebtorNames[credito.co_deudor_id] || null) : null,
      property_city: credito.ciudad_inmueble || null,
      property_value: credito.valor_comercial || null,
      ltv: ltv ? Math.round(ltv * 10) / 10 : null,
      risk_score: risk.score,
      risk_label: risk.label,
      investors: investorsByCredito[credito.id] || [],
      created_at: credito.created_at,
      saldo_capital: (credito as any).saldo_capital || 0,
      saldo_intereses: (credito as any).saldo_intereses || 0,
      saldo_mora: (credito as any).saldo_mora || 0,
    }
  })

  return { data: tableData, error: null }
}


// ========== GENERATE NEXT CODE ==========

export async function getNextLoanCode(): Promise<string> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('creditos')
    .select('codigo_credito')
    .order('codigo_credito', { ascending: false })
    .limit(1)
    .single()

  if (!data?.codigo_credito) {
    return 'CR-001'
  }

  const match = data.codigo_credito.match(/CR-(\d+)/)
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

  const MIN_INVESTMENT = 50_000_000
  const MAX_INVESTORS = 5

  // Validation
  if (!data.loan_id || !data.amount || data.amount <= 0) {
    return { success: false, error: 'Datos de inversion invalidos.' }
  }

  if (data.amount < MIN_INVESTMENT) {
    return { success: false, error: `El monto minimo de inversion es $${MIN_INVESTMENT.toLocaleString('es-CO')}.` }
  }

  if (!data.investor_id && !data.is_new_investor) {
    return { success: false, error: 'Debe seleccionar o crear un inversionista.' }
  }

  try {
    // 1. Get credito to validate capacity
    const { data: credito, error: creditoError } = await supabaseAdmin
      .from('creditos')
      .select('id, codigo_credito, monto_solicitado, tasa_interes_ea')
      .eq('id', data.loan_id)
      .single()

    if (creditoError || !credito) {
      return { success: false, error: 'Credito no encontrado.' }
    }

    // Calculate current funded amount and investor count
    const { data: existingInversiones } = await supabaseAdmin
      .from('inversiones')
      .select('monto_invertido')
      .eq('credito_id', data.loan_id)
      .in('estado', ['activo', 'pendiente'])

    const investorCount = (existingInversiones || []).length
    if (investorCount >= MAX_INVESTORS) {
      return { success: false, error: `Este credito ya alcanzo el maximo de ${MAX_INVESTORS} inversionistas.` }
    }

    const funded = (existingInversiones || []).reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0)
    const requested = credito.monto_solicitado || 0
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

    // 3. Create investment in inversiones table
    const { data: investment, error: investError } = await supabaseAdmin
      .from('inversiones')
      .insert({
        credito_id: data.loan_id,
        inversionista_id: investorId,
        monto_invertido: data.amount,
        interest_rate_investor: credito.tasa_interes_ea,
        estado: 'activo',
        fecha_inversion: data.investment_date,
        confirmed_at: data.investment_date
      })
      .select('id')
      .single()

    if (investError) {
      console.error('Error creating investment:', investError.message)
      return { success: false, error: 'Error al crear inversion: ' + investError.message }
    }

    revalidatePath('/dashboard/admin/colocaciones')

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { data: null, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('creditos')
    .select('id, codigo_credito, monto_solicitado, tasa_interes_ea')
    .eq('id', loanId)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message || 'Credito no encontrado.' }
  }

  // Calculate funded amount from inversiones
  const { data: inversiones } = await supabase
    .from('inversiones')
    .select('monto_invertido')
    .eq('credito_id', loanId)
    .in('estado', ['activo', 'pendiente'])

  const requested = data.monto_solicitado || 0
  const funded = (inversiones || []).reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0)

  return {
    data: {
      id: data.id,
      code: data.codigo_credito,
      amount_requested: requested,
      amount_funded: funded,
      remaining: requested - funded,
      interest_rate_ea: data.tasa_interes_ea
    },
    error: null
  }
}

// ========== PAYMENT REGISTRATION ==========

export interface RegisterPaymentData {
  loan_id: string
  payment_date: string
  monto: number
}

export async function registerLoanPayment(
  data: RegisterPaymentData
): Promise<{ success: boolean; error?: string; aplicacion?: Record<string, unknown> }> {
  // Validation
  if (!data.loan_id) {
    return { success: false, error: 'ID del credito es requerido.' }
  }

  if (!data.payment_date) {
    return { success: false, error: 'Fecha de pago es requerida.' }
  }

  if (data.monto <= 0) {
    return { success: false, error: 'El monto debe ser mayor a cero.' }
  }

  try {
    // Get admin auth token to call the API
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      return { success: false, error: 'No se pudo obtener sesion de admin.' }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const response = await fetch(`${baseUrl}/api/pagos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        credito_id: data.loan_id,
        fecha_pago: data.payment_date,
        monto: data.monto,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return { success: false, error: result.error || 'Error al registrar el pago.' }
    }

    revalidatePath('/dashboard/admin/colocaciones')

    return { success: true, aplicacion: result.aplicacion }

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { data: [], error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data: txns, error } = await supabase
    .from('transacciones')
    .select('id, tipo_transaccion, monto, fecha_aplicacion, referencia_pago, created_at')
    .eq('credito_id', loanId)
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])
    .order('fecha_aplicacion', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error.message)
    return { data: [], error: error.message }
  }

  // Aggregate transactions by referencia_pago into payment records
  const grouped = new Map<string, LoanPayment>()
  for (const txn of txns || []) {
    const ref = txn.referencia_pago || txn.id
    if (!grouped.has(ref)) {
      grouped.set(ref, {
        id: ref,
        payment_date: txn.fecha_aplicacion,
        amount_capital: 0,
        amount_interest: 0,
        amount_late_fee: 0,
        amount_total: 0,
        created_at: txn.created_at,
      })
    }
    const payment = grouped.get(ref)!
    if (txn.tipo_transaccion === 'pago_capital') payment.amount_capital += txn.monto
    else if (txn.tipo_transaccion === 'pago_interes') payment.amount_interest += txn.monto
    else if (txn.tipo_transaccion === 'pago_mora') payment.amount_late_fee += txn.monto
    payment.amount_total += txn.monto
  }

  return { data: Array.from(grouped.values()), error: null }
}

// ========== GET CREDIT FOR EDITING ==========

export interface CreditForEdit {
  id: string
  codigo_credito: string
  estado: string
  cliente_id: string
  debtor_name: string | null
  debtor_cedula: string | null
  co_deudor_id: string | null
  co_debtor_name: string | null
  co_debtor_cedula: string | null
  monto_solicitado: number
  tasa_nominal: number
  tasa_interes_ea: number | null
  plazo: number
  comision_deudor: number
  comision_aluri_pct: number
  tipo_contrato: string | null
  tipo_amortizacion: string | null
  tipo_liquidacion: string | null
  tipo_persona: string | null
  direccion_inmueble: string | null
  ciudad_inmueble: string | null
  tipo_inmueble: string | null
  valor_comercial: number | null
  ltv: number | null
  ingresos_mensuales: number | null
  profesion: string | null
  clase: string | null
}

export async function getCreditForEdit(creditId: string): Promise<{ data: CreditForEdit | null; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { data: null, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data: credit, error } = await supabase
    .from('creditos')
    .select(`
      id, codigo_credito, estado, cliente_id, co_deudor_id,
      monto_solicitado, tasa_nominal, tasa_interes_ea, plazo,
      comision_deudor, comision_aluri_pct,
      tipo_contrato, tipo_amortizacion, tipo_liquidacion, tipo_persona,
      direccion_inmueble, ciudad_inmueble, tipo_inmueble, valor_comercial, ltv,
      ingresos_mensuales, profesion, clase
    `)
    .eq('id', creditId)
    .single()

  if (error || !credit) {
    return { data: null, error: error?.message || 'Credito no encontrado.' }
  }

  // Fetch debtor profile
  const { data: debtor } = await supabase
    .from('profiles')
    .select('full_name, document_id')
    .eq('id', credit.cliente_id)
    .single()

  // Fetch co-debtor profile if exists
  let coDebtor: { full_name: string | null; document_id: string | null } | null = null
  if (credit.co_deudor_id) {
    const { data: cd } = await supabase
      .from('profiles')
      .select('full_name, document_id')
      .eq('id', credit.co_deudor_id)
      .single()
    coDebtor = cd
  }

  return {
    data: {
      ...credit,
      debtor_name: debtor?.full_name || null,
      debtor_cedula: debtor?.document_id || null,
      co_debtor_name: coDebtor?.full_name || null,
      co_debtor_cedula: coDebtor?.document_id || null,
    },
    error: null
  }
}

// ========== UPDATE CREDIT ==========

export interface UpdateCreditData {
  id: string
  codigo_credito?: string
  monto_solicitado?: number
  tasa_nominal?: number
  plazo?: number
  comision_deudor?: number
  comision_aluri_pct?: number
  tipo_contrato?: string
  tipo_amortizacion?: string
  tipo_liquidacion?: string
  tipo_persona?: string
  direccion_inmueble?: string
  ciudad_inmueble?: string
  tipo_inmueble?: string
  valor_comercial?: number
  ingresos_mensuales?: number
  profesion?: string
  clase?: string
  cliente_id?: string
  co_deudor_id?: string | null
}

export async function updateCredit(
  data: UpdateCreditData
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  if (!data.id) {
    return { success: false, error: 'ID del credito es requerido.' }
  }

  // Build update object excluding id
  const { id, ...fields } = data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateObj: Record<string, any> = {}

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updateObj[key] = value
    }
  }

  if (Object.keys(updateObj).length === 0) {
    return { success: false, error: 'No hay datos para actualizar.' }
  }

  // Recalculate derived fields
  if (updateObj.tasa_nominal !== undefined) {
    const nm = updateObj.tasa_nominal / 100
    updateObj.tasa_interes_ea = Math.round(((Math.pow(1 + nm, 12) - 1) * 100) * 100) / 100
  }

  // Recalculate LTV if amount or commercial value changed
  const monto = updateObj.monto_solicitado
  const valorComercial = updateObj.valor_comercial
  if (monto !== undefined || valorComercial !== undefined) {
    // Fetch current values for the ones not being updated
    const { data: current } = await supabaseAdmin
      .from('creditos')
      .select('monto_solicitado, valor_comercial')
      .eq('id', id)
      .single()

    const finalMonto = monto ?? current?.monto_solicitado ?? 0
    const finalValor = valorComercial ?? current?.valor_comercial ?? 0

    if (finalValor > 0) {
      updateObj.ltv = Math.round((finalMonto / finalValor) * 10000) / 100
    }

    // Also update valor_colocado and saldo_capital if monto changes
    if (monto !== undefined) {
      updateObj.valor_colocado = monto
      updateObj.saldo_capital = monto
    }
  }

  const { error } = await supabaseAdmin
    .from('creditos')
    .update(updateObj)
    .eq('id', id)

  if (error) {
    console.error('Error updating credit:', error.message)
    return { success: false, error: 'Error al actualizar credito: ' + error.message }
  }

  revalidatePath('/dashboard/admin/colocaciones')
  revalidatePath(`/dashboard/admin/colocaciones/${id}`)

  return { success: true }
}

// ========== DELETE CREDIT ==========

export async function deleteCredit(
  creditId: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  if (!creditId) {
    return { success: false, error: 'ID del credito es requerido.' }
  }

  // Verify credit exists and fetch owner info for notifications
  const { data: credit, error: fetchError } = await supabaseAdmin
    .from('creditos')
    .select('id, codigo_credito, cliente_id, monto_solicitado, estado')
    .eq('id', creditId)
    .single()

  if (fetchError || !credit) {
    return { success: false, error: 'Credito no encontrado.' }
  }

  if (credit.estado === 'no_colocado') {
    return { success: false, error: 'Este credito ya fue marcado como No Colocado.' }
  }

  // Fetch investors for notifications
  const { data: investors } = await supabaseAdmin
    .from('inversiones')
    .select('inversionista_id, monto_invertido')
    .eq('credito_id', creditId)
    .in('estado', ['activo', 'pendiente'])

  const formatCOP = (v: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(v)

  try {
    // Soft delete: change estado to 'no_colocado'
    const { error: updateError } = await supabaseAdmin
      .from('creditos')
      .update({
        estado: 'no_colocado',
        updated_at: new Date().toISOString()
      })
      .eq('id', creditId)

    if (updateError) {
      console.error('Error soft-deleting credit:', updateError.message)
      return { success: false, error: 'Error al marcar credito como no colocado: ' + updateError.message }
    }

    // Cancel active/pending investments
    if (investors && investors.length > 0) {
      await supabaseAdmin
        .from('inversiones')
        .update({
          estado: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('credito_id', creditId)
        .in('estado', ['activo', 'pendiente'])
    }

    // Send notifications
    const notifications: { user_id: string; tipo: string; titulo: string; mensaje: string; metadata: Record<string, unknown> }[] = []

    // Notify owner
    if (credit.cliente_id) {
      notifications.push({
        user_id: credit.cliente_id,
        tipo: 'credito_no_colocado',
        titulo: 'Crédito No Colocado',
        mensaje: `El crédito ${credit.codigo_credito} por ${formatCOP(credit.monto_solicitado || 0)} ha sido marcado como no colocado.`,
        metadata: { credit_code: credit.codigo_credito, amount: credit.monto_solicitado }
      })
    }

    // Notify each investor
    if (investors && investors.length > 0) {
      for (const inv of investors) {
        notifications.push({
          user_id: inv.inversionista_id,
          tipo: 'credito_no_colocado',
          titulo: 'Crédito No Colocado',
          mensaje: `El crédito ${credit.codigo_credito} en el que invertiste ${formatCOP(inv.monto_invertido)} ha sido marcado como no colocado. Tu inversión será devuelta.`,
          metadata: { credit_code: credit.codigo_credito, amount: inv.monto_invertido }
        })
      }
    }

    if (notifications.length > 0) {
      await supabaseAdmin.from('notificaciones').insert(notifications)
    }

    revalidatePath('/dashboard/admin/colocaciones')
    revalidatePath('/dashboard/inversionista/notificaciones')
    revalidatePath('/dashboard/propietario/notificaciones')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error soft-deleting credit:', error)
    return { success: false, error: 'Error inesperado.' }
  }
}

// ========== GET CREDIT INVESTMENTS ==========

export interface CreditInvestment {
  id: string
  inversionista_id: string
  investor_name: string | null
  investor_cedula: string | null
  monto_invertido: number
  interest_rate_investor: number | null
  estado: string
  fecha_inversion: string | null
}

export async function getCreditInvestments(creditId: string): Promise<{ data: CreditInvestment[]; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { data: [], error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data: inversiones, error } = await supabase
    .from('inversiones')
    .select(`
      id, inversionista_id, monto_invertido, interest_rate_investor, estado, fecha_inversion,
      inversionista:profiles!inversionista_id (full_name, document_id)
    `)
    .eq('credito_id', creditId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching investments:', error.message)
    return { data: [], error: error.message }
  }

  return {
    data: (inversiones || []).map(inv => {
      const profile = inv.inversionista as unknown as { full_name: string | null; document_id: string | null } | null
      return {
        id: inv.id,
        inversionista_id: inv.inversionista_id,
        investor_name: profile?.full_name || null,
        investor_cedula: profile?.document_id || null,
        monto_invertido: inv.monto_invertido,
        interest_rate_investor: inv.interest_rate_investor,
        estado: inv.estado,
        fecha_inversion: inv.fecha_inversion,
      }
    }),
    error: null
  }
}

// ========== REMOVE INVESTMENT ==========

export async function removeInvestment(investmentId: string): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  if (!investmentId) {
    return { success: false, error: 'ID de inversion es requerido.' }
  }

  const { error } = await supabaseAdmin
    .from('inversiones')
    .delete()
    .eq('id', investmentId)

  if (error) {
    console.error('Error removing investment:', error.message)
    return { success: false, error: 'Error al eliminar inversion: ' + error.message }
  }

  revalidatePath('/dashboard/admin/colocaciones')

  return { success: true }
}

// ========== GET CREDIT DELETE INFO ==========

export async function getCreditDeleteInfo(creditId: string): Promise<{
  data: { code: string; debtor_name: string | null; plan_pagos: number; transacciones: number; inversiones: number } | null
  error: string | null
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { data: null, error: 'Configuracion del servidor incompleta.' }
  }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data: credit } = await supabase
    .from('creditos')
    .select('codigo_credito, cliente_id')
    .eq('id', creditId)
    .single()

  if (!credit) return { data: null, error: 'Credito no encontrado.' }

  const { data: debtor } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', credit.cliente_id)
    .single()

  const { count: ppCount } = await supabase
    .from('plan_pagos')
    .select('id', { count: 'exact', head: true })
    .eq('credito_id', creditId)

  const { count: txCount } = await supabase
    .from('transacciones')
    .select('id', { count: 'exact', head: true })
    .eq('credito_id', creditId)

  const { count: invCount } = await supabase
    .from('inversiones')
    .select('id', { count: 'exact', head: true })
    .eq('credito_id', creditId)

  return {
    data: {
      code: credit.codigo_credito,
      debtor_name: debtor?.full_name || null,
      plan_pagos: ppCount || 0,
      transacciones: txCount || 0,
      inversiones: invCount || 0,
    },
    error: null
  }
}
