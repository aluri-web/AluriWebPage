import { createAdminClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, User, MoreHorizontal, Settings } from 'lucide-react'
import CreditWorkflow from '../CreditWorkflow'

// Reuse or import this function if it exists, otherwise define locally for now
async function getCreditDetails(id: string) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing environment variables')
            return null
        }

        const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

        // First, try to fetch just the credit without JOIN
        const { data: credit, error: creditError } = await supabase
            .from('creditos')
            .select('*')
            .eq('id', id)
            .single()

        if (creditError) {
            console.error('Error fetching credit:', creditError)
            console.error('Error code:', creditError.code)
            console.error('Error message:', creditError.message)
            return null
        }

        if (!credit) {
            console.error('No credit found with id:', id)
            return null
        }

        // Then fetch the profile separately
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', credit.cliente_id)
            .single()

        if (profileError) {
            console.warn('Could not fetch profile:', profileError.message)
            // Continue anyway, just without profile data
        }

        // Combine the data
        return {
            ...credit,
            profiles: profile || null
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
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            Crédito #{credit.numero_credito}
                            <span className={`text-sm px-3 py-1 rounded-full border ${credit.estado === 'activo' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                credit.estado === 'publicado' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                                    credit.estado === 'en_firma' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                        credit.estado === 'firmado' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                            credit.estado === 'finalizado' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                                ['castigado', 'anulado'].includes(credit.estado) ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                                    'bg-slate-800 border-slate-700 text-slate-400'
                                }`}>
                                {credit.estado.toUpperCase().replace('_', ' ')}
                            </span>
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {credit.profiles?.full_name || 'Cliente desconocido'} • {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(credit.monto_aprobado)}
                        </p>
                    </div>

                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Workflow Component */}
                    <CreditWorkflow credit={credit} />

                    {/* Details Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
                            <CreditCard size={18} className="text-teal-400" />
                            <h3 className="font-semibold text-white">Detalles del Crédito</h3>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <span className="block text-sm text-slate-500 mb-1">Monto Aprobado</span>
                                <span className="text-lg font-medium text-white">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(credit.monto_aprobado)}
                                </span>
                            </div>
                            <div>
                                <span className="block text-sm text-slate-500 mb-1">Tasa de Interés</span>
                                <span className="text-lg font-medium text-white">{credit.tasa_interes}% N.M.</span>
                            </div>
                            <div>
                                <span className="block text-sm text-slate-500 mb-1">Plazo</span>
                                <span className="text-lg font-medium text-white">{credit.plazo_meses} Meses</span>
                            </div>
                            <div>
                                <span className="block text-sm text-slate-500 mb-1">Tipo de Contrato</span>
                                <span className="text-lg font-medium text-white capitalize">{credit.tipo_contrato?.replace('_', ' ') || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Client Info */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
                            <User size={18} className="text-purple-400" />
                            <h3 className="font-semibold text-white">Información del Cliente</h3>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-400">
                                    {credit.profiles?.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h4 className="font-medium text-white">{credit.profiles?.full_name}</h4>
                                    <p className="text-sm text-slate-500">{credit.profiles?.email}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">ID Cliente</span>
                                    <span className="text-slate-300 font-mono text-xs">{credit.cliente_id.substring(0, 8)}...</span>
                                </div>
                                {/* Add more client details here if available in profile */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
