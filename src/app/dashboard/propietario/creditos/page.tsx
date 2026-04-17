import { createClient } from '../../../../utils/supabase/server'
import { FileText } from 'lucide-react'
import CreditosList from './CreditosList'

export default async function CreditosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch creditos where user is owner, with inversiones for funded amount
  const { data: creditos } = await supabase
    .from('creditos')
    .select(`
      id,
      codigo_credito,
      estado,
      monto_solicitado,
      valor_colocado,
      tasa_nominal,
      tasa_interes_ea,
      ciudad_inmueble,
      direccion_inmueble,
      tipo_inmueble,
      valor_comercial,
      created_at,
      fecha_desembolso,
      fecha_ultimo_pago,
      en_mora,
      dias_mora_actual,
      saldo_mora,
      inversiones(monto_invertido),
      transacciones(id, tipo_transaccion, monto, fecha_aplicacion, referencia_pago)
    `)
    .eq('cliente_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <FileText size={24} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Creditos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Informacion detallada de tus creditos
          </p>
        </div>
      </header>

      {/* Credits List with sorting */}
      <CreditosList creditos={creditos || []} />
    </div>
  )
}
