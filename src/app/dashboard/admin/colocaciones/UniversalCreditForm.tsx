'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import {
  Search,
  User,
  CreditCard,
  Home,
  Users,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  Percent,
  DollarSign,
  UserPlus,
  Calculator
} from 'lucide-react'
import {
  searchDebtorByCedula,
  searchInvestorByCedula,
  getInvestorsForSelect,
  createFullLoanRecord,
  InvestorOption,
  DebtorSearchResult
} from './actions'
import PropertyPhotoUpload from './PropertyPhotoUpload'

interface InvestorRow {
  investor_id: string
  investor_name: string
  investor_cedula: string
  is_new: boolean
  new_name: string
  new_email: string
  new_phone: string
  new_city: string
  amount: number
  percentage: number
  searchStatus: 'idle' | 'searching' | 'found' | 'not_found'
}

interface FormData {
  // Primary Debtor
  debtor_cedula: string
  debtor_id: string
  debtor_name: string
  debtor_email: string
  debtor_phone: string
  debtor_address: string
  debtor_city: string
  is_new_debtor: boolean
  // New risk profile fields
  debtor_monthly_income: number
  debtor_profession: string

  // Contract & Amortization
  contract_type: 'hipotecario' | 'retroventa'
  amortization_type: 'francesa' | 'solo_interes'

  // Co-Debtor
  has_co_debtor: boolean
  co_debtor_cedula: string
  co_debtor_id: string
  co_debtor_name: string
  co_debtor_email: string
  co_debtor_phone: string
  co_debtor_address: string
  co_debtor_city: string
  is_new_co_debtor: boolean

  // Loan
  code: string
  estado: string // Credit workflow state
  amount_requested: number
  term_months: number

  // Financial - Rates
  interest_rate_nm: number
  interest_rate_ea: number // Calculated

  // Financial - Commissions
  debtor_commission: number
  aluri_commission_pct: number // Calculated

  // Property
  property_address: string
  property_city: string
  property_type: string
  commercial_value: number
  warranty_analysis: string
  property_photos: string[]

  // Investors
  investors: InvestorRow[]
}

interface UniversalCreditFormProps {
  investors: InvestorOption[]
  nextCode: string
}

export default function UniversalCreditForm({ investors, nextCode }: UniversalCreditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchingDebtor, setSearchingDebtor] = useState(false)
  const [searchingCoDebtor, setSearchingCoDebtor] = useState(false)
  const [debtorFound, setDebtorFound] = useState<boolean | null>(null)
  const [coDebtorFound, setCoDebtorFound] = useState<boolean | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [investorDropdownOpen, setInvestorDropdownOpen] = useState<number | null>(null)
  const [investorSearch, setInvestorSearch] = useState('')

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      code: nextCode,
      estado: 'publicado', // Default workflow state
      debtor_cedula: '',
      debtor_id: '',
      debtor_name: '',
      debtor_email: '',
      debtor_phone: '',
      debtor_address: '',
      debtor_city: '',
      is_new_debtor: false,
      has_co_debtor: false,
      co_debtor_cedula: '',
      co_debtor_id: '',
      co_debtor_name: '',
      co_debtor_email: '',
      co_debtor_phone: '',
      co_debtor_address: '',
      co_debtor_city: '',
      is_new_co_debtor: false,
      amount_requested: 0,
      interest_rate_nm: 1.5,
      interest_rate_ea: 19.56,
      term_months: 12,
      debtor_commission: 0,
      aluri_commission_pct: 0,
      property_address: '',
      property_city: '',
      property_type: 'casa',
      commercial_value: 0,
      property_photos: [],
      investors: [],
      // New fields defaults
      debtor_monthly_income: 0,
      debtor_profession: '',
      warranty_analysis: '',
      contract_type: 'hipotecario',
      amortization_type: 'francesa'
    }
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'investors'
  })

  // Watchers
  const watchAmountRequested = watch('amount_requested')
  const watchCommercialValue = watch('commercial_value')
  const watchInvestors = watch('investors')
  const watchCedula = watch('debtor_cedula')
  const watchCoDebtorCedula = watch('co_debtor_cedula')
  const watchHasCoDebtor = watch('has_co_debtor')
  const watchRateNM = watch('interest_rate_nm')
  const watchDebtorCommission = watch('debtor_commission')
  const watchPropertyPhotos = watch('property_photos')

  const watchCode = watch('code')
  const watchContractType = watch('contract_type')
  const watchAmortizationType = watch('amortization_type')
  const watchTermMonths = watch('term_months')

  // Calculate EA from NM: EA = (1 + NM/100)^12 - 1
  useEffect(() => {
    const nm = watchRateNM / 100
    const ea = (Math.pow(1 + nm, 12) - 1) * 100
    setValue('interest_rate_ea', Math.round(ea * 100) / 100)
  }, [watchRateNM, setValue])

  // Calculate Aluri Commission %
  useEffect(() => {
    if (watchAmountRequested > 0) {
      const pct = (watchDebtorCommission / watchAmountRequested) * 100
      setValue('aluri_commission_pct', Math.round(pct * 100) / 100)
    } else {
      setValue('aluri_commission_pct', 0)
    }
  }, [watchDebtorCommission, watchAmountRequested, setValue])

  // Calculate LTV
  const ltv = watchCommercialValue > 0 ? (watchAmountRequested / watchCommercialValue) * 100 : 0

  // Calculate Estimated Payment
  const calculateEstimatedPayment = () => {
    const r = (watchRateNM || 0) / 100
    const n = watchTermMonths || 0
    const amount = watchAmountRequested || 0
    if (amount <= 0 || n <= 0) return 0

    if (watchAmortizationType === 'solo_interes') {
      return amount * r
    } else {
      // Default to French
      if (r === 0) return amount / n
      return (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    }
  }
  const estimatedPayment = calculateEstimatedPayment()

  // Calculate total invested
  const totalInvested = watchInvestors?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
  const remainingToFund = watchAmountRequested - totalInvested
  const fundingPercentage = watchAmountRequested > 0 ? (totalInvested / watchAmountRequested) * 100 : 0

  // Debtor search
  const searchDebtor = useCallback(async (cedula: string) => {
    if (cedula.length < 5) {
      setDebtorFound(null)
      return
    }

    setSearchingDebtor(true)
    const result = await searchDebtorByCedula(cedula)
    setSearchingDebtor(false)

    if (result.found) {
      setDebtorFound(true)
      setValue('debtor_id', result.id || '')
      setValue('debtor_name', result.full_name || '')
      setValue('debtor_email', result.email || '')
      setValue('debtor_phone', result.phone || '')
      setValue('debtor_address', result.address || '')
      setValue('debtor_city', result.city || '')
      setValue('is_new_debtor', false)
    } else {
      setDebtorFound(false)
      setValue('debtor_id', '')
      setValue('debtor_name', '')
      setValue('debtor_email', '')
      setValue('debtor_phone', '')
      setValue('debtor_address', '')
      setValue('debtor_city', '')
      setValue('is_new_debtor', true)
    }
  }, [setValue])

  // Co-Debtor search
  const searchCoDebtor = useCallback(async (cedula: string) => {
    if (cedula.length < 5) {
      setCoDebtorFound(null)
      return
    }

    setSearchingCoDebtor(true)
    const result = await searchDebtorByCedula(cedula)
    setSearchingCoDebtor(false)

    if (result.found) {
      setCoDebtorFound(true)
      setValue('co_debtor_id', result.id || '')
      setValue('co_debtor_name', result.full_name || '')
      setValue('co_debtor_email', result.email || '')
      setValue('co_debtor_phone', result.phone || '')
      setValue('co_debtor_address', result.address || '')
      setValue('co_debtor_city', result.city || '')
      setValue('is_new_co_debtor', false)
    } else {
      setCoDebtorFound(false)
      setValue('co_debtor_id', '')
      setValue('co_debtor_name', '')
      setValue('co_debtor_email', '')
      setValue('co_debtor_phone', '')
      setValue('co_debtor_address', '')
      setValue('co_debtor_city', '')
      setValue('is_new_co_debtor', true)
    }
  }, [setValue])

  // Debounced debtor search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchCedula && watchCedula.length >= 5) {
        searchDebtor(watchCedula)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [watchCedula, searchDebtor])

  // Debounced co-debtor search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchHasCoDebtor && watchCoDebtorCedula && watchCoDebtorCedula.length >= 5) {
        searchCoDebtor(watchCoDebtorCedula)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [watchCoDebtorCedula, watchHasCoDebtor, searchCoDebtor])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleAddInvestor = () => {
    if (fields.length >= 5) {
      showToast('error', 'Maximo 5 inversionistas por credito')
      return
    }
    append({
      investor_id: '',
      investor_name: '',
      investor_cedula: '',
      is_new: false,
      new_name: '',
      new_email: '',
      new_phone: '',
      new_city: '',
      amount: 0,
      percentage: 0,
      searchStatus: 'idle'
    })
  }

  const updateInvestorPercentage = (index: number, amount: number) => {
    if (watchAmountRequested > 0) {
      const percentage = (amount / watchAmountRequested) * 100
      setValue(`investors.${index}.percentage`, Math.round(percentage * 100) / 100)
    }
  }

  const updateInvestorAmount = (index: number, percentage: number) => {
    if (watchAmountRequested > 0) {
      const amount = (percentage / 100) * watchAmountRequested
      setValue(`investors.${index}.amount`, Math.round(amount))
    }
  }

  // Select existing investor from dropdown
  const selectInvestor = (index: number, investor: InvestorOption) => {
    setValue(`investors.${index}.investor_id`, investor.id)
    setValue(`investors.${index}.investor_name`, investor.full_name || '')
    setValue(`investors.${index}.investor_cedula`, investor.document_id || '')
    setValue(`investors.${index}.is_new`, false)
    setValue(`investors.${index}.searchStatus`, 'found')
    setInvestorDropdownOpen(null)
    setInvestorSearch('')
  }

  // Search investor by cedula for inline creation
  const handleInvestorCedulaSearch = async (index: number, cedula: string) => {
    setValue(`investors.${index}.investor_cedula`, cedula)

    if (cedula.length < 5) {
      setValue(`investors.${index}.searchStatus`, 'idle')
      return
    }

    setValue(`investors.${index}.searchStatus`, 'searching')

    // First check in existing investors list
    const existing = investors.find(inv => inv.document_id === cedula)
    if (existing) {
      setValue(`investors.${index}.investor_id`, existing.id)
      setValue(`investors.${index}.investor_name`, existing.full_name || '')
      setValue(`investors.${index}.is_new`, false)
      setValue(`investors.${index}.searchStatus`, 'found')
      return
    }

    // Search in database
    const result = await searchInvestorByCedula(cedula)
    if (result.found) {
      setValue(`investors.${index}.investor_id`, result.id || '')
      setValue(`investors.${index}.investor_name`, result.full_name || '')
      setValue(`investors.${index}.is_new`, false)
      setValue(`investors.${index}.searchStatus`, 'found')
    } else {
      setValue(`investors.${index}.investor_id`, '')
      setValue(`investors.${index}.investor_name`, '')
      setValue(`investors.${index}.is_new`, true)
      setValue(`investors.${index}.searchStatus`, 'not_found')
    }
  }

  const filteredInvestors = investors.filter(inv => {
    const search = investorSearch.toLowerCase()
    return (
      (inv.full_name?.toLowerCase().includes(search) ?? false) ||
      (inv.document_id?.toLowerCase().includes(search) ?? false)
    )
  })

  const onSubmit = async (formData: FormData) => {
    setIsSubmitting(true)

    const result = await createFullLoanRecord({
      debtor_id: formData.is_new_debtor ? undefined : formData.debtor_id,
      new_debtor: formData.is_new_debtor ? {
        cedula: formData.debtor_cedula,
        full_name: formData.debtor_name,
        email: formData.debtor_email,
        phone: formData.debtor_phone,
        address: formData.debtor_address,
        city: formData.debtor_city
      } : undefined,
      has_co_debtor: formData.has_co_debtor,
      co_debtor_id: formData.has_co_debtor && !formData.is_new_co_debtor ? formData.co_debtor_id : undefined,
      new_co_debtor: formData.has_co_debtor && formData.is_new_co_debtor ? {
        cedula: formData.co_debtor_cedula,
        full_name: formData.co_debtor_name,
        email: formData.co_debtor_email,
        phone: formData.co_debtor_phone,
        address: formData.co_debtor_address,
        city: formData.co_debtor_city
      } : undefined,
      code: formData.code,
      amount_requested: formData.amount_requested,
      interest_rate_nm: formData.interest_rate_nm,
      interest_rate_ea: formData.interest_rate_ea,
      term_months: formData.term_months,
      debtor_commission: formData.debtor_commission,
      aluri_commission_pct: formData.aluri_commission_pct,
      property: {
        address: formData.property_address,
        city: formData.property_city,
        property_type: formData.property_type,
        commercial_value: formData.commercial_value,
        photos: formData.property_photos
      },
      investors: formData.investors.map(inv => ({
        investor_id: inv.is_new ? undefined : inv.investor_id,
        is_new: inv.is_new,
        new_investor: inv.is_new ? {
          cedula: inv.investor_cedula,
          full_name: inv.new_name,
          email: inv.new_email,
          phone: inv.new_phone,
          city: inv.new_city
        } : undefined,
        amount: inv.amount,

        percentage: inv.percentage
      })),
      // Pass estado and new fields
      estado: formData.estado, // User-selected initial estado
      monthly_income: formData.debtor_monthly_income,
      profession: formData.debtor_profession,
      warranty_analysis: formData.warranty_analysis,
      contract_type: formData.contract_type,
      amortization_type: formData.amortization_type
    })

    setIsSubmitting(false)

    if (result.success) {
      showToast('success', 'Credito creado exitosamente')
      reset({
        code: 'CR-' + (parseInt(formData.code.split('-')[1]) + 1).toString().padStart(3, '0'),
        estado: 'publicado', // Reset to default estado
        debtor_cedula: '',
        debtor_id: '',
        debtor_name: '',
        debtor_email: '',
        debtor_phone: '',
        debtor_address: '',
        debtor_city: '',
        is_new_debtor: false,
        has_co_debtor: false,
        co_debtor_cedula: '',
        co_debtor_id: '',
        co_debtor_name: '',
        co_debtor_email: '',
        co_debtor_phone: '',
        co_debtor_address: '',
        co_debtor_city: '',
        is_new_co_debtor: false,
        amount_requested: 0,
        interest_rate_nm: 1.5,
        interest_rate_ea: 19.56,
        term_months: 12,
        debtor_commission: 0,
        aluri_commission_pct: 0,
        property_address: '',
        property_city: '',
        property_type: 'casa',
        commercial_value: 0,
        property_photos: [],
        investors: [],
        debtor_monthly_income: 0,
        debtor_profession: '',
        warranty_analysis: '',
        contract_type: 'hipotecario',
        amortization_type: 'francesa'
      })
      setDebtorFound(null)
      setCoDebtorFound(null)
      router.refresh()
    } else {
      showToast('error', result.error || 'Error al crear el credito')
    }
  }

  const getLtvColor = () => {
    if (ltv <= 50) return 'text-emerald-400'
    if (ltv <= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${toast.type === 'success'
          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
          {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Primary Debtor */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <User size={18} className="text-teal-400" />
                <h3 className="font-semibold text-white">Deudor Principal</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Cedula <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input {...register('debtor_cedula', { required: true })} type="text" placeholder="Buscar por cedula..."
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
                    {searchingDebtor && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                    {!searchingDebtor && debtorFound === true && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />}
                  </div>
                  {debtorFound === true && <p className="text-xs text-emerald-400 mt-1">Deudor encontrado</p>}
                  {debtorFound === false && <p className="text-xs text-amber-400 mt-1">Deudor nuevo - complete los datos</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1.5">Nombre Completo</label>
                    <input {...register('debtor_name')} type="text" disabled={debtorFound === true}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                    <input {...register('debtor_email')} type="email" disabled={debtorFound === true}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Telefono</label>
                    <input {...register('debtor_phone')} type="tel" disabled={debtorFound === true}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Direccion</label>
                    <input {...register('debtor_address')} type="text" disabled={debtorFound === true}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Ciudad</label>
                    <input {...register('debtor_city')} type="text" disabled={debtorFound === true}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Ingresos Mensuales ($)</label>
                    <input {...register('debtor_monthly_income', { valueAsNumber: true })} type="number" min="0" step="100000"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Profesion / Ocupacion</label>
                    <input {...register('debtor_profession')} type="text"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Co-Debtor Toggle */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-teal-400" />
                  <h3 className="font-semibold text-white">Co-Deudor</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" {...register('has_co_debtor')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                </label>
              </div>

              {watchHasCoDebtor && (
                <div className="p-5 pt-0 space-y-4 border-t border-slate-800">
                  <div className="pt-4">
                    <label className="block text-sm text-slate-400 mb-1.5">Cedula Co-Deudor</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input {...register('co_debtor_cedula')} type="text" placeholder="Buscar..."
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500" />
                      {searchingCoDebtor && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                      {!searchingCoDebtor && coDebtorFound === true && <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />}
                    </div>
                    {coDebtorFound === false && <p className="text-xs text-amber-400 mt-1">Co-deudor nuevo</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm text-slate-400 mb-1.5">Nombre</label>
                      <input {...register('co_debtor_name')} type="text" disabled={coDebtorFound === true}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                      <input {...register('co_debtor_email')} type="email" disabled={coDebtorFound === true}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Telefono</label>
                      <input {...register('co_debtor_phone')} type="tel" disabled={coDebtorFound === true}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Direccion</label>
                      <input {...register('co_debtor_address')} type="text" disabled={coDebtorFound === true}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">Ciudad</label>
                      <input {...register('co_debtor_city')} type="text" disabled={coDebtorFound === true}
                        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:border-teal-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Credit Data */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <CreditCard size={18} className="text-teal-400" />
                <h3 className="font-semibold text-white">Datos del Credito</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Codigo</label>
                    <input {...register('code', { required: true })} type="text"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Estado Inicial</label>
                    <select {...register('estado', { required: true })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500">
                      <option value="solicitado">Solicitado</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="publicado">Publicado</option>
                      <option value="en_firma">En Firma</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Monto Solicitado</label>
                    <input {...register('amount_requested', { required: true, valueAsNumber: true })} type="number" min="0" step="100000"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Plazo (meses)</label>
                    <input {...register('term_months', { required: true, valueAsNumber: true })} type="number" min="1"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contract & Amortization Type */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <CreditCard size={18} className="text-teal-400" />
                <h3 className="font-semibold text-white">Configuracion del Contrato</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Tipo de Contrato</label>
                    <select {...register('contract_type')}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500">
                      <option value="hipotecario">Credito Hipotecario</option>
                      <option value="retroventa">Pacto de Retroventa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Amortizacion</label>
                    <select {...register('amortization_type')}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500">
                      <option value="francesa">Francesa (Cuota Fija)</option>
                      <option value="solo_interes">Solo Intereses (Balloon)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Data */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <Calculator size={18} className="text-teal-400" />
                <h3 className="font-semibold text-white">Datos Financieros</h3>
              </div>
              <div className="p-5 space-y-4">
                {/* Rates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      {watchContractType === 'retroventa' ? 'Canon de Arrendamiento (%)' : 'Tasa N.M. (%)'}
                    </label>
                    <input {...register('interest_rate_nm', { required: true, valueAsNumber: true })} type="number" min="0" step="0.01"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Tasa E.A. (%) <span className="text-xs text-slate-500">calculada</span></label>
                    <input {...register('interest_rate_ea')} type="number" readOnly
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-teal-400 font-medium cursor-not-allowed" />
                  </div>
                </div>

                {/* Commissions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Comision Deudor ($)</label>
                    <input {...register('debtor_commission', { valueAsNumber: true })} type="number" min="0" step="10000"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Comision Aluri (%) <span className="text-xs text-slate-500">calculado</span></label>
                    <input {...register('aluri_commission_pct')} type="number" readOnly
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-teal-400 font-medium cursor-not-allowed" />
                  </div>
                </div>

                {/* Estimated Payment Display */}
                <div className="pt-4 border-t border-slate-800 mt-4">
                  <label className="block text-sm text-center text-slate-400 mb-1.5">
                    {watchContractType === 'retroventa' ? 'Canon Mensual Estimado' : 'Cuota Mensual Estimada'}
                  </label>
                  <div className="text-3xl font-bold text-center text-teal-400">
                    {formatCurrency(estimatedPayment)}
                  </div>
                  <p className="text-xs text-center text-slate-500 mt-1">
                    {(() => {
                      if (watchContractType === 'retroventa') {
                        return watchAmortizationType === 'solo_interes'
                          ? '(Solo Canon)'
                          : '(Capital + Canon)'
                      } else {
                        // Hipotecario
                        return watchAmortizationType === 'solo_interes'
                          ? '(Solo Interes)'
                          : '(Capital + Interes)'
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Property */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <Home size={18} className="text-teal-400" />
                <h3 className="font-semibold text-white">Datos del Inmueble</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-slate-400 mb-1.5">Direccion</label>
                    <input {...register('property_address')} type="text"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Ciudad</label>
                    <input {...register('property_city')} type="text"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Tipo de Predio</label>
                    <select {...register('property_type')}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500">
                      <option value="casa">Casa</option>
                      <option value="apartamento">Apartamento</option>
                      <option value="lote">Lote</option>
                      <option value="predio_rural">Predio Rural</option>
                      <option value="oficina">Oficina</option>
                      <option value="bodega">Bodega</option>
                      <option value="local_comercial">Local Comercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Avaluo Comercial</label>
                    <input {...register('commercial_value', { valueAsNumber: true })} type="number" min="0" step="1000000"
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">LTV Calculado</label>
                    <div className={`px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg font-semibold ${getLtvColor()}`}>
                      {ltv.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-slate-400 mb-1.5">Estudio de Titulos / Analisis de Garantia</label>
                  <textarea {...register('warranty_analysis')} rows={3} placeholder="Detalles sobre el estado legal del inmueble..."
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 resize-none" />
                </div>

                {/* Property Photos */}
                <div className="pt-4 border-t border-slate-700">
                  <label className="block text-sm text-slate-400 mb-3">Fotos del Inmueble</label>
                  <PropertyPhotoUpload
                    photos={watchPropertyPhotos || []}
                    onChange={(photos) => setValue('property_photos', photos)}
                    loanCode={watchCode || 'temp'}
                    maxPhotos={10}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Investors */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-teal-400" />
                  <h3 className="font-semibold text-white">Inversionistas</h3>
                  <span className="text-xs text-slate-500">({fields.length}/5)</span>
                </div>
                <button type="button" onClick={handleAddInvestor} disabled={fields.length >= 5}
                  className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={16} />
                  Agregar
                </button>
              </div>

              <div className="p-5">
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin inversionistas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const inv = watchInvestors[index]
                      const isNewInvestor = inv?.is_new && inv?.searchStatus === 'not_found'

                      return (
                        <div key={field.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-3">
                          {/* Search by Cedula or Select Existing */}
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">Cedula del Inversionista</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={inv?.investor_cedula || ''}
                                  onChange={(e) => handleInvestorCedulaSearch(index, e.target.value)}
                                  placeholder="Buscar o ingresar cedula..."
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                />
                                {inv?.searchStatus === 'searching' && (
                                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                                )}
                                {inv?.searchStatus === 'found' && (
                                  <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                                )}
                              </div>
                            </div>
                            <div className="relative">
                              <label className="block text-xs text-slate-500 mb-1">&nbsp;</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setInvestorDropdownOpen(investorDropdownOpen === index ? null : index)
                                  setInvestorSearch('')
                                }}
                                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                              >
                                <ChevronDown size={16} />
                              </button>

                              {investorDropdownOpen === index && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 max-h-48 overflow-hidden">
                                  <div className="p-2 border-b border-slate-700">
                                    <input
                                      type="text"
                                      value={investorSearch}
                                      onChange={e => setInvestorSearch(e.target.value)}
                                      placeholder="Buscar..."
                                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="overflow-y-auto max-h-32">
                                    {filteredInvestors.map(investor => (
                                      <button
                                        key={investor.id}
                                        type="button"
                                        onClick={() => selectInvestor(index, investor)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-700/50 flex justify-between"
                                      >
                                        <span className="text-white truncate">{investor.full_name}</span>
                                        <span className="text-slate-500 text-xs">{investor.document_id}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Found investor name */}
                          {inv?.searchStatus === 'found' && inv?.investor_name && (
                            <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <p className="text-sm text-emerald-400">{inv.investor_name}</p>
                            </div>
                          )}

                          {/* New investor form */}
                          {isNewInvestor && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3">
                              <p className="text-xs text-amber-400 font-medium">Nuevo inversionista - Complete los datos:</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="col-span-2">
                                  <input
                                    {...register(`investors.${index}.new_name`)}
                                    type="text"
                                    placeholder="Nombre completo *"
                                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                  />
                                </div>
                                <div>
                                  <input
                                    {...register(`investors.${index}.new_email`)}
                                    type="email"
                                    placeholder="Email *"
                                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                  />
                                </div>
                                <div>
                                  <input
                                    {...register(`investors.${index}.new_phone`)}
                                    type="tel"
                                    placeholder="Telefono"
                                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Amount and Percentage */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Monto</label>
                              <input
                                {...register(`investors.${index}.amount`, { valueAsNumber: true })}
                                type="number"
                                min="0"
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0
                                  setValue(`investors.${index}.amount`, val)
                                  updateInvestorPercentage(index, val)
                                }}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Porcentaje</label>
                              <div className="relative">
                                <input
                                  {...register(`investors.${index}.percentage`, { valueAsNumber: true })}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0
                                    setValue(`investors.${index}.percentage`, val)
                                    updateInvestorAmount(index, val)
                                  }}
                                  className="w-full px-3 py-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                              </div>
                            </div>
                          </div>

                          <button type="button" onClick={() => remove(index)}
                            className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Totals */}
                <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-400">Total Recaudado</span>
                    <span className="text-lg font-bold text-teal-400">{formatCurrency(totalInvested)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-400">Monto del Credito</span>
                    <span className="text-lg font-medium text-white">{formatCurrency(watchAmountRequested)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-400">Faltante</span>
                    <span className={`text-lg font-medium ${remainingToFund > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {formatCurrency(Math.max(0, remainingToFund))}
                    </span>
                  </div>

                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${fundingPercentage >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                      style={{ width: `${Math.min(100, fundingPercentage)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">{fundingPercentage.toFixed(1)}% fondeado</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isSubmitting}
              className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={20} />
                  {watchContractType === 'retroventa' ? 'Crear Pacto de Retroventa' : 'Crear Credito Completo'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </>
  )
}
