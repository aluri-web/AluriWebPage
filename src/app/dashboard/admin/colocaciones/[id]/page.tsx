import { createAdminClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import CreditDetailTabs from './CreditDetailTabs'

async function getCreditDetails(id: string) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing environment variables')
            return null
        }

        const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

        const { data: credit, error: creditError } = await supabase
            .from('creditos')
            .select(`
                *,
                transacciones (
                    id,
                    tipo_transaccion,
                    monto,
                    fecha_aplicacion,
                    referencia_pago
                ),
                inversiones (
                    monto_invertido,
                    estado,
                    inversionista:profiles!inversionista_id (
                        full_name
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (creditError) {
            console.error('Error fetching credit:', creditError)
            return null
        }

        if (!credit) {
            console.error('No credit found with id:', id)
            return null
        }

        // Fetch the cliente profile separately
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', credit.cliente_id)
            .single()

        if (profileError) {
            console.warn('Could not fetch profile:', profileError.message)
        }

        // Fetch the co-debtor profile if present
        let coDeudorProfile = null
        if (credit.co_deudor_id) {
            const { data: coData, error: coError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', credit.co_deudor_id)
                .single()

            if (coError) {
                console.warn('Could not fetch co-debtor profile:', coError.message)
            } else {
                coDeudorProfile = coData
            }
        }

        return {
            ...credit,
            profiles: profile || null,
            co_deudor_profile: coDeudorProfile
        }
    } catch (error) {
        console.error('Unexpected error in getCreditDetails:', error)
        return null
    }
}

export default async function CreditDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const credit = await getCreditDetails(id)

    if (!credit) {
        notFound()
    }

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <header>
                <Link
                    href="/dashboard/admin/colocaciones"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Volver a Colocaciones
                </Link>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3 flex-wrap">
                            Credito #{credit.codigo_credito}
                            <span className={`text-sm px-3 py-1 rounded-full border ${credit.estado === 'activo' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                credit.estado === 'publicado' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                                    credit.estado === 'en_firma' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                        credit.estado === 'firmado' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                            credit.estado === 'finalizado' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                                ['castigado', 'no_colocado'].includes(credit.estado) ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                    'bg-slate-800 border-slate-700 text-slate-400'
                                }`}>
                                {{ publicado: 'COLOCANDO', activo: 'DESEMBOLSADO', en_firma: 'EN FIRMA', firmado: 'FIRMADO', finalizado: 'FINALIZADO', castigado: 'CASTIGADO', mora: 'EN MORA', no_colocado: 'NO COLOCADO' }[credit.estado] || credit.estado.toUpperCase().replace('_', ' ')}
                            </span>
                            {(credit.estado === 'activo' || credit.estado === 'mora') && (
                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${credit.en_mora
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    }`}>
                                    {credit.en_mora ? 'EN MORA' : 'AL DIA'}
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {credit.profiles?.full_name || 'Cliente desconocido'} • {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(credit.valor_colocado)}
                        </p>
                    </div>

                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            <CreditDetailTabs credit={credit} />
        </div>
    )
}
