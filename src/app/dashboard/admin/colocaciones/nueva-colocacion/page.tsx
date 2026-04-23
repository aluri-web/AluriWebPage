import { getInvestorsForSelect, getNextLoanCode } from '../actions'
import UniversalCreditForm from '../UniversalCreditForm'
import type { PrefillData } from '../form-types'
import { FileSpreadsheet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  searchParams: Promise<{ solicitud?: string }>
}

export default async function NuevaColocacionPage({ searchParams }: PageProps) {
  const { solicitud: solicitudId } = await searchParams

  const [investorsResult, nextCode] = await Promise.all([
    getInvestorsForSelect(),
    getNextLoanCode()
  ])

  let prefill: PrefillData | undefined
  if (solicitudId) {
    const supabase = await createClient()
    const { data: sol } = await supabase
      .from('solicitudes_credito')
      .select(`
        id,
        direccion_inmueble,
        ciudad,
        valor_inmueble,
        monto_requerido,
        fotos,
        solicitante:profiles!solicitante_id (
          id,
          full_name,
          email,
          document_id
        )
      `)
      .eq('id', solicitudId)
      .single()

    if (sol) {
      const solicitante = sol.solicitante as unknown as {
        id: string
        full_name: string | null
        email: string | null
        document_id: string | null
      } | null
      const fotos = (sol.fotos || []) as { tipo: string; url: string }[]
      prefill = {
        debtor_cedula: solicitante?.document_id ?? '',
        debtor_id: solicitante?.id ?? '',
        debtor_name: solicitante?.full_name ?? '',
        debtor_email: solicitante?.email ?? '',
        is_new_debtor: false,
        amount_requested: Number(sol.monto_requerido) || 0,
        property_address: sol.direccion_inmueble ?? '',
        property_city: sol.ciudad ?? '',
        commercial_value: Number(sol.valor_inmueble) || 0,
        property_photos: fotos.map(f => f.url),
      }
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header>
        <Link
          href="/dashboard/admin/colocaciones"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span>Volver a Colocaciones</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl">
            <FileSpreadsheet size={24} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nueva Colocacion</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {prefill
                ? 'Datos pre-cargados desde la solicitud aprobada — completa tasas, plazo e inversionistas.'
                : 'Crea creditos completos con deudor e inversionistas en un solo formulario'}
            </p>
          </div>
        </div>
      </header>

      {/* Form Section */}
      <UniversalCreditForm
        investors={investorsResult.data}
        nextCode={nextCode}
        prefill={prefill}
      />
    </div>
  )
}
