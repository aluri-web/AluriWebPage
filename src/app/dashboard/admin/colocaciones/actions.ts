'use server'

import { createClient } from '../../../../utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { createLoan } from '@/app/actions/create-loan'
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

  if (profile?.role !== 'admin') return { authorized: false, error: 'No autorizado' }
  return { authorized: true }
}

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
    password: `Tmp${crypto.randomUUID().slice(0, 12)}!`,
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
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

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

    await auditLog({
      action: 'loan.create',
      resource_type: 'credito',
      resource_id: loanResult.loanId,
      details: { code: data.code, amount: data.amount_requested, investors_count: data.investors.length }
    })

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
  fecha_desembolso: string | null
  saldo_capital: number
  saldo_intereses: number
  saldo_mora: number
  en_mora: boolean
  tipo_amortizacion: string | null
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
      en_mora,
      tipo_amortizacion,
      created_at,
      fecha_desembolso,
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

  // Get all inversiones with investor names and amounts in a single query
  const { data: inversiones, error: invError } = await supabase
    .from('inversiones')
    .select(`
      credito_id,
      monto_invertido,
      inversionista:profiles!inversionista_id (
        full_name
      )
    `)
    .eq('estado', 'activo')

  const investorsByCredito: Record<string, string[]> = {}
  const montoFundedByCredito: Record<string, number> = {}
  if (!invError && inversiones) {
    inversiones.forEach(inv => {
      const creditoId = inv.credito_id
      // Investor names
      const investorData = inv.inversionista as unknown as { full_name: string | null } | null
      const name = investorData?.full_name || 'Sin nombre'
      if (!investorsByCredito[creditoId]) {
        investorsByCredito[creditoId] = []
      }
      if (!investorsByCredito[creditoId].includes(name)) {
        investorsByCredito[creditoId].push(name)
      }
      // Funded amounts
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
      fecha_desembolso: (credito as any).fecha_desembolso || null,
      saldo_capital: (credito as any).saldo_capital || 0,
      saldo_intereses: (credito as any).saldo_intereses || 0,
      saldo_mora: (credito as any).saldo_mora || 0,
      en_mora: (credito as any).en_mora || false,
      tipo_amortizacion: (credito as any).tipo_amortizacion || null,
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

  if (!data || data.length === 0) {
    return 'CR001'
  }

  let maxNum = 0
  for (const row of data) {
    // Extract all digits after "CR" (ignoring dashes or other chars)
    const digits = row.codigo_credito?.replace(/[^0-9]/g, '')
    if (digits) {
      const num = parseInt(digits)
      if (num > maxNum) maxNum = num
    }
  }

  const nextNum = maxNum + 1
  return `CR${nextNum.toString().padStart(3, '0')}`
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
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  const MAX_INVESTORS = 5

  // Validation
  if (!data.loan_id || !data.amount || data.amount <= 0) {
    return { success: false, error: 'Datos de inversion invalidos.' }
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

    await auditLog({
      action: 'investment.create',
      resource_type: 'inversion',
      resource_id: data.loan_id,
      details: { investor_id: investorId, amount: data.amount, percentage: (data.amount / (credito.monto_solicitado || 1)) * 100 }
    })

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
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  try {
    const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

    // Buscar el crédito
    const { data: credito, error: creditoError } = await supabase
      .from('creditos')
      .select('id, codigo_credito, cliente_id, monto_solicitado, saldo_capital, saldo_intereses, saldo_mora, tipo_amortizacion, plazo, fecha_desembolso')
      .eq('id', data.loan_id)
      .single()

    if (creditoError || !credito) {
      return { success: false, error: 'Crédito no encontrado' }
    }

    const montoTotal = data.monto

    // CASCADA: mora → intereses → capital
    // Usar Math.max(0, ...) para proteger contra saldos negativos en BD
    const saldoMoraAnterior = Math.max(0, credito.saldo_mora || 0)
    const saldoInteresesAnterior = Math.max(0, credito.saldo_intereses || 0)
    const saldoCapitalAnterior = Math.max(0, credito.saldo_capital || 0)
    const esSoloInteres = (credito.tipo_amortizacion || 'francesa') === 'solo_interes'

    let restante = montoTotal

    // 1. Primero pagar mora
    const montoMora = Math.min(restante, saldoMoraAnterior)
    restante -= montoMora

    // 2. Luego pagar intereses
    // Solo interés anticipado: el pago de intereses NO se limita por saldo_intereses
    // (los intereses se cobran anticipados, no dependen de la causación diaria)
    const montoInteres = esSoloInteres ? restante : Math.min(restante, saldoInteresesAnterior)
    restante -= montoInteres

    // 3. El sobrante va a capital
    // Para créditos "solo_interes", NO aplicar a capital automáticamente
    // (el capital se paga completo al vencimiento del plazo)
    const montoCapital = esSoloInteres ? 0 : Math.min(restante, saldoCapitalAnterior)

    // Nuevos saldos
    const nuevoSaldoMora = saldoMoraAnterior - montoMora
    const nuevoSaldoIntereses = esSoloInteres ? 0 : (saldoInteresesAnterior - montoInteres)
    const nuevoSaldoCapital = saldoCapitalAnterior - montoCapital

    const aplicacion = {
      monto_mora: montoMora,
      monto_interes: montoInteres,
      monto_capital: montoCapital,
      saldo_mora_anterior: saldoMoraAnterior,
      saldo_intereses_anterior: saldoInteresesAnterior,
      saldo_capital_anterior: saldoCapitalAnterior,
      saldo_mora_nuevo: nuevoSaldoMora,
      saldo_intereses_nuevo: nuevoSaldoIntereses,
      saldo_capital_nuevo: nuevoSaldoCapital,
    }

    // Registrar transacciones individuales por tipo
    const referenciaPago = `PAG-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const filasTransaccion: {
      credito_id: string;
      tipo_transaccion: string;
      monto: number;
      fecha_aplicacion: string;
      fecha_transaccion: string;
      referencia_pago: string;
    }[] = []

    if (montoMora > 0) {
      filasTransaccion.push({
        credito_id: credito.id,
        tipo_transaccion: 'pago_mora',
        monto: montoMora,
        fecha_aplicacion: data.payment_date,
        fecha_transaccion: data.payment_date,
        referencia_pago: referenciaPago
      })
    }

    if (montoInteres > 0) {
      filasTransaccion.push({
        credito_id: credito.id,
        tipo_transaccion: 'pago_interes',
        monto: montoInteres,
        fecha_aplicacion: data.payment_date,
        fecha_transaccion: data.payment_date,
        referencia_pago: referenciaPago
      })
    }

    if (montoCapital > 0) {
      filasTransaccion.push({
        credito_id: credito.id,
        tipo_transaccion: 'pago_capital',
        monto: montoCapital,
        fecha_aplicacion: data.payment_date,
        fecha_transaccion: data.payment_date,
        referencia_pago: referenciaPago
      })
    }

    // Validar que al menos algo se distribuyó
    const totalAplicado = montoMora + montoInteres + montoCapital
    if (totalAplicado === 0) {
      const motivo = esSoloInteres
        ? `No hay saldo de intereses ni mora pendiente (intereses: ${saldoInteresesAnterior.toLocaleString()}, mora: ${saldoMoraAnterior.toLocaleString()}). Verifique que la causación diaria haya corrido.`
        : `No hay saldos pendientes para aplicar el pago.`
      return { success: false, error: motivo }
    }

    if (filasTransaccion.length > 0) {
      const { error: txError } = await supabase
        .from('transacciones')
        .insert(filasTransaccion)

      if (txError) {
        console.error('Error registering payment:', txError)
        return { success: false, error: 'Error al registrar transacciones: ' + txError.message }
      }
    }

    // Actualizar saldos en la tabla creditos
    const updateData: Record<string, unknown> = {
      saldo_capital: nuevoSaldoCapital,
      saldo_intereses: nuevoSaldoIntereses,
      saldo_mora: nuevoSaldoMora,
      fecha_ultimo_pago: data.payment_date,
    }

    // Si el capital quedó en 0, marcar como pagado
    if (nuevoSaldoCapital === 0) {
      updateData.estado = 'completed'
      updateData.en_mora = false
      updateData.saldo_mora = 0
    }

    const { error: updateError } = await supabase
      .from('creditos')
      .update(updateData)
      .eq('id', credito.id)

    if (updateError) {
      console.error('Error actualizando saldos:', updateError)
      return { success: false, error: 'Error al actualizar saldos: ' + updateError.message }
    }

    await auditLog({
      action: 'payment.register',
      resource_type: 'pago',
      resource_id: data.loan_id,
      details: { amount: data.monto, date: data.payment_date }
    })

    revalidatePath('/dashboard/admin/colocaciones')
    revalidatePath(`/dashboard/admin/colocaciones/${data.loan_id}`)

    return { success: true, aplicacion }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Error inesperado al registrar el pago.' }
  }
}

// ========== DELETE PAYMENT & RECALCULATE SALDOS ==========

export async function deletePaymentAndRecalculate(
  referenciaPago: string,
  creditoId: string
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { success: false, error: 'Configuracion del servidor incompleta.' }

  try {
    const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

    // Obtener las transacciones del pago a eliminar
    const { data: txns, error: txError } = await supabase
      .from('transacciones')
      .select('id, tipo_transaccion, monto')
      .eq('referencia_pago', referenciaPago)
      .eq('credito_id', creditoId)

    if (txError) return { success: false, error: 'Error buscando transacciones: ' + txError.message }
    if (!txns || txns.length === 0) return { success: false, error: 'No se encontraron transacciones con esa referencia.' }

    // Calcular montos a revertir
    let capitalRevertir = 0
    let interesRevertir = 0
    let moraRevertir = 0
    for (const txn of txns) {
      if (txn.tipo_transaccion === 'pago_capital') capitalRevertir += txn.monto
      if (txn.tipo_transaccion === 'pago_interes') interesRevertir += txn.monto
      if (txn.tipo_transaccion === 'pago_mora') moraRevertir += txn.monto
    }

    // Obtener saldos actuales del crédito
    const { data: credito, error: cError } = await supabase
      .from('creditos')
      .select('saldo_capital, saldo_intereses, saldo_mora')
      .eq('id', creditoId)
      .single()

    if (cError || !credito) return { success: false, error: 'Crédito no encontrado.' }

    // Eliminar transacciones
    const { error: delError } = await supabase
      .from('transacciones')
      .delete()
      .eq('referencia_pago', referenciaPago)
      .eq('credito_id', creditoId)

    if (delError) return { success: false, error: 'Error eliminando transacciones: ' + delError.message }

    // Revertir saldos (sumar lo que se había restado)
    const { error: updError } = await supabase
      .from('creditos')
      .update({
        saldo_capital: (credito.saldo_capital || 0) + capitalRevertir,
        saldo_intereses: (credito.saldo_intereses || 0) + interesRevertir,
        saldo_mora: (credito.saldo_mora || 0) + moraRevertir,
      })
      .eq('id', creditoId)

    if (updError) return { success: false, error: 'Error actualizando saldos: ' + updError.message }

    await auditLog({
      action: 'payment.delete',
      resource_type: 'pago',
      resource_id: creditoId,
      details: { referencia: referenciaPago, capital: capitalRevertir, interes: interesRevertir, mora: moraRevertir }
    })

    revalidatePath('/dashboard/admin/colocaciones')
    revalidatePath('/dashboard/admin/pagos')

    return { success: true }
  } catch (err) {
    console.error('Error deleting payment:', err)
    return { success: false, error: 'Error inesperado al eliminar el pago.' }
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
  fotos_inmueble: string[]
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
      ingresos_mensuales, profesion, clase, fotos_inmueble
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
      fotos_inmueble: credit.fotos_inmueble || [],
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
  fotos_inmueble?: string[]
}

export async function updateCredit(
  data: UpdateCreditData
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

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

  await auditLog({
    action: 'loan.update',
    resource_type: 'credito',
    resource_id: id,
    details: { fields_updated: Object.keys(updateObj) }
  })

  revalidatePath('/dashboard/admin/colocaciones')
  revalidatePath(`/dashboard/admin/colocaciones/${id}`)

  return { success: true }
}

// ========== DELETE CREDIT ==========

export async function deleteCredit(
  creditId: string,
  params?: { motivo?: string; detalle?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

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
    // Soft delete: change estado to 'no_colocado' + save motivo
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('creditos')
      .update({
        estado: 'no_colocado',
        motivo_no_colocado: params?.motivo ?? null,
        motivo_no_colocado_detalle: params?.detalle ?? null,
        fecha_no_colocado: now,
        updated_at: now,
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

    await auditLog({
      action: 'loan.delete',
      resource_type: 'credito',
      resource_id: creditId,
      details: { codigo: credit.codigo_credito }
    })

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
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Configuracion del servidor incompleta.' }
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey)

  if (!investmentId) {
    return { success: false, error: 'ID de inversion es requerido.' }
  }

  // Fetch investment details before deleting (for audit log)
  const { data: invData } = await supabaseAdmin
    .from('inversiones')
    .select('credito_id')
    .eq('id', investmentId)
    .single()

  const creditoId = invData?.credito_id

  const { error } = await supabaseAdmin
    .from('inversiones')
    .delete()
    .eq('id', investmentId)

  if (error) {
    console.error('Error removing investment:', error.message)
    return { success: false, error: 'Error al eliminar inversion: ' + error.message }
  }

  await auditLog({
    action: 'investment.remove',
    resource_type: 'inversion',
    resource_id: investmentId,
    details: { credito_id: creditoId }
  })

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

// ========== AUDIT & RECONCILE SALDOS ==========

export interface SaldoDiscrepancy {
  credito_id: string
  codigo: string
  propietario: string
  monto_financiado: number
  db_saldo_capital: number
  db_saldo_capital_esperado: number
  db_saldo_intereses: number
  db_saldo_mora: number
  calc_saldo_capital: number
  calc_saldo_capital_esperado: number
  calc_saldo_intereses: number
  calc_saldo_mora: number
  diff_capital: number
  diff_capital_esperado: number
  diff_intereses: number
  diff_mora: number
}

export async function auditSaldos(): Promise<{ discrepancies: SaldoDiscrepancy[]; total_checked: number; error: string | null }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { discrepancies: [], total_checked: 0, error: adminCheck.error || 'No autorizado' }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { discrepancies: [], total_checked: 0, error: 'Configuracion incompleta' }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const { data: creditos, error: creditosError } = await supabase
    .from('creditos')
    .select('id, codigo_credito, monto_solicitado, saldo_capital, saldo_capital_esperado, saldo_intereses, saldo_mora, cliente:profiles!cliente_id(full_name)')
    .in('estado', ['activo', 'mora', 'publicado', 'firmado'])

  if (creditosError || !creditos) return { discrepancies: [], total_checked: 0, error: creditosError?.message || 'Error al cargar créditos' }

  // Get all payment transactions
  const { data: txns, error: txnsError } = await supabase
    .from('transacciones')
    .select('credito_id, tipo_transaccion, monto')
    .in('tipo_transaccion', ['pago_capital', 'pago_interes', 'pago_mora'])

  if (txnsError) return { discrepancies: [], total_checked: 0, error: txnsError.message }

  // Get all causacion transactions
  const { data: causaciones } = await supabase
    .from('transacciones')
    .select('credito_id, tipo_transaccion, monto')
    .in('tipo_transaccion', ['causacion_interes', 'causacion_mora'])

  // Get last causacion_diaria per credit (source of truth for capital in two-capital model)
  const creditIds = creditos.map(c => c.id)
  const { data: allCausaciones } = await supabase
    .from('causaciones_diarias')
    .select('credito_id, capital_real, capital_esperado, interes_causado, fecha_causacion')
    .in('credito_id', creditIds)
    .order('fecha_causacion', { ascending: false })

  // Build map of last causacion per credit
  const lastCausacionByCredit: Record<string, { capital_real: number; capital_esperado: number; interes_causado: number }> = {}
  for (const c of (allCausaciones || [])) {
    if (!lastCausacionByCredit[c.credito_id]) {
      lastCausacionByCredit[c.credito_id] = c
    }
  }

  // Sum payments per credit
  const paymentsByCredit: Record<string, { capital: number; intereses: number; mora: number }> = {}
  for (const tx of (txns || [])) {
    if (!paymentsByCredit[tx.credito_id]) paymentsByCredit[tx.credito_id] = { capital: 0, intereses: 0, mora: 0 }
    if (tx.tipo_transaccion === 'pago_capital') paymentsByCredit[tx.credito_id].capital += tx.monto
    else if (tx.tipo_transaccion === 'pago_interes') paymentsByCredit[tx.credito_id].intereses += tx.monto
    else if (tx.tipo_transaccion === 'pago_mora') paymentsByCredit[tx.credito_id].mora += tx.monto
  }

  // Sum causaciones per credit
  const causacionesByCredit: Record<string, { intereses: number; mora: number }> = {}
  for (const tx of (causaciones || [])) {
    if (!causacionesByCredit[tx.credito_id]) causacionesByCredit[tx.credito_id] = { intereses: 0, mora: 0 }
    if (tx.tipo_transaccion === 'causacion_interes') causacionesByCredit[tx.credito_id].intereses += tx.monto
    else if (tx.tipo_transaccion === 'causacion_mora') causacionesByCredit[tx.credito_id].mora += tx.monto
  }

  const discrepancies: SaldoDiscrepancy[] = []

  for (const c of creditos) {
    const payments = paymentsByCredit[c.id] || { capital: 0, intereses: 0, mora: 0 }
    const causacion = causacionesByCredit[c.id] || { intereses: 0, mora: 0 }
    const lastCausacion = lastCausacionByCredit[c.id]
    const montoBase = c.monto_solicitado || 0

    let calcCapital: number
    let calcCapitalEsperado: number

    if (lastCausacion) {
      // Two-capital model: capital values come from last causacion_diaria
      // After processing, saldo_capital = capital_real + interes_causado
      calcCapital = lastCausacion.capital_real + lastCausacion.interes_causado
      calcCapitalEsperado = lastCausacion.capital_esperado + lastCausacion.interes_causado
    } else {
      // No causaciones yet: simple formula
      calcCapital = Math.max(0, montoBase - payments.capital)
      calcCapitalEsperado = Math.max(0, montoBase - payments.capital)
    }

    // Intereses and mora: always transactional (causaciones - pagos)
    const calcIntereses = Math.max(0, causacion.intereses - payments.intereses)
    const calcMora = Math.max(0, causacion.mora - payments.mora)

    const dbCapital = c.saldo_capital || 0
    const dbCapitalEsperado = (c as Record<string, unknown>).saldo_capital_esperado as number || 0
    const dbIntereses = c.saldo_intereses || 0
    const dbMora = c.saldo_mora || 0

    const diffCapital = Math.round(dbCapital - calcCapital)
    const diffCapitalEsperado = Math.round(dbCapitalEsperado - calcCapitalEsperado)
    const diffIntereses = Math.round(dbIntereses - calcIntereses)
    const diffMora = Math.round(dbMora - calcMora)

    if (diffCapital !== 0 || diffCapitalEsperado !== 0 || diffIntereses !== 0 || diffMora !== 0) {
      const clienteRaw = c.cliente as unknown
      const clienteData = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw as { full_name?: string } | null

      discrepancies.push({
        credito_id: c.id,
        codigo: c.codigo_credito,
        propietario: clienteData?.full_name || 'Sin nombre',
        monto_financiado: montoBase,
        db_saldo_capital: dbCapital,
        db_saldo_capital_esperado: dbCapitalEsperado,
        db_saldo_intereses: dbIntereses,
        db_saldo_mora: dbMora,
        calc_saldo_capital: calcCapital,
        calc_saldo_capital_esperado: calcCapitalEsperado,
        calc_saldo_intereses: calcIntereses,
        calc_saldo_mora: calcMora,
        diff_capital: diffCapital,
        diff_capital_esperado: diffCapitalEsperado,
        diff_intereses: diffIntereses,
        diff_mora: diffMora,
      })
    }
  }

  return { discrepancies, total_checked: creditos.length, error: null }
}

export async function fixSaldos(creditoIds?: string[]): Promise<{ fixed: number; details: string[]; error: string | null }> {
  const adminCheck = await verifyAdmin()
  if (!adminCheck.authorized) return { fixed: 0, details: [], error: adminCheck.error || 'No autorizado' }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return { fixed: 0, details: [], error: 'Configuracion incompleta' }

  const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

  const audit = await auditSaldos()
  if (audit.error) return { fixed: 0, details: [], error: audit.error }

  const toFix = creditoIds
    ? audit.discrepancies.filter(d => creditoIds.includes(d.credito_id))
    : audit.discrepancies

  let fixed = 0
  const details: string[] = []

  for (const d of toFix) {
    // 1. Fix saldos on the credit
    const { error } = await supabase
      .from('creditos')
      .update({
        saldo_capital: d.calc_saldo_capital,
        saldo_capital_esperado: d.calc_saldo_capital_esperado,
        saldo_intereses: d.calc_saldo_intereses,
        saldo_mora: d.calc_saldo_mora,
      })
      .eq('id', d.credito_id)

    if (error) {
      details.push(`${d.codigo}: Error - ${error.message}`)
      continue
    }

    // 2. If saldo_capital_esperado was wrong, causaciones were calculated on wrong base.
    //    Delete wrong causacion data and transactions so they get re-calculated.
    if (d.diff_capital_esperado !== 0) {
      // Delete causaciones_diarias
      await supabase
        .from('causaciones_diarias')
        .delete()
        .eq('credito_id', d.credito_id)

      // Delete causaciones_inversionistas
      await supabase
        .from('causaciones_inversionistas')
        .delete()
        .eq('credito_id', d.credito_id)

      // Delete causacion transactions (they have wrong amounts)
      await supabase
        .from('transacciones')
        .delete()
        .eq('credito_id', d.credito_id)
        .in('tipo_transaccion', ['causacion_interes', 'causacion_mora'])

      // Reset acumulados on inversiones
      await supabase
        .from('inversiones')
        .update({ interes_acumulado: 0, mora_acumulada: 0, ultima_causacion: null })
        .eq('credito_id', d.credito_id)
        .eq('estado', 'activo')

      // Reset causacion-related fields on credit (so cron re-processes)
      await supabase
        .from('creditos')
        .update({
          saldo_capital: d.calc_saldo_capital_esperado,
          saldo_capital_esperado: d.calc_saldo_capital_esperado,
          saldo_intereses: 0,
          saldo_mora: 0,
          ultima_causacion: null,
          interes_acumulado_total: 0,
        })
        .eq('id', d.credito_id)

      details.push(`${d.codigo}: Saldos + causaciones reseteadas (capital_esperado era ${d.db_saldo_capital_esperado.toLocaleString()} → ${d.calc_saldo_capital_esperado.toLocaleString()})`)
    } else {
      details.push(`${d.codigo}: Saldos corregidos`)
    }

    fixed++
  }

  await auditLog({
    action: 'admin.action',
    resource_type: 'credito',
    details: { action: 'fix_saldos', fixed, total_discrepancies: toFix.length, details },
  })

  revalidatePath('/dashboard/admin/colocaciones')
  revalidatePath('/dashboard/admin/pagos')

  return { fixed, details, error: null }
}
