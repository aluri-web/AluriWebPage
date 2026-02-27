'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Calendar, CheckCircle, FileText, Banknote, AlertCircle, Check } from 'lucide-react'
import { updateCreditStatus } from '@/app/actions/manage-credit'


// Define the credit type locally or import if available
type Credit = {
    id: string
    estado: string
    monto_solicitado: number
    valor_colocado: number
    fecha_firma_programada?: string | null
    fecha_desembolso?: string | null
    notaria?: string | null
    costos_notaria?: number | null
}

interface CreditWorkflowProps {
    credit: Credit
}

const STEPS = [
    { id: 'publicado', label: 'Colocando', icon: FileText },
    { id: 'en_firma', label: 'En Firma', icon: Calendar },
    { id: 'firmado', label: 'Firmado', icon: CheckCircle },
    { id: 'activo', label: 'Desembolsado', icon: Banknote },
]

export default function CreditWorkflow({ credit }: CreditWorkflowProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [notaria, setNotaria] = useState(credit.notaria || '')
    const [costosNotaria, setCostosNotaria] = useState<number>(credit.costos_notaria || 0)

    // Determine current step index
    const currentStepIndex = STEPS.findIndex(s => s.id === credit.estado)
    const isFinished = credit.estado === 'finalizado'
    const isCancelled = ['castigado', 'anulado'].includes(credit.estado)

    const handleStatusUpdate = async (newStatus: string, dateField?: 'fecha_firma_programada' | 'fecha_desembolso', extraData?: { notaria?: string; costos_notaria?: number }) => {
        // Clear previous messages
        setError(null)
        setSuccessMessage(null)

        // Client-side validation
        if (dateField && !selectedDate) {
            setError('Por favor selecciona una fecha')
            return
        }

        // Validate date is not in the past for scheduled dates
        if (dateField === 'fecha_firma_programada' && selectedDate) {
            const selectedDateTime = new Date(selectedDate).getTime()
            const now = new Date().getTime()
            if (selectedDateTime < now) {
                setError('La fecha de firma no puede ser en el pasado')
                return
            }
        }

        setLoading(true)
        try {
            const fechas = dateField ? { [dateField]: new Date(selectedDate).toISOString() } : undefined

            const result = await updateCreditStatus({
                creditId: credit.id,
                newStatus: newStatus as any,
                fechas,
                extraData
            })

            if (result.success) {
                setSuccessMessage(`✓ Estado actualizado a ${newStatus.replace('_', ' ')}`)
                setSelectedDate('')
                // Refresh after 1 second to show success message
                setTimeout(() => {
                    router.refresh()
                }, 1000)
            } else {
                setError(result.error || 'Error al actualizar estado')
            }
        } catch (error) {
            setError('Error inesperado al actualizar el estado')
        } finally {
            setLoading(false)
        }
    }

    if (isCancelled) {
        return (
            <div className="bg-red-900/10 border border-red-800 rounded-xl p-6 flex items-center gap-4 text-red-400">
                <AlertCircle size={24} />
                <div>
                    <h3 className="font-semibold text-lg">Crédito {credit.estado.toUpperCase()}</h3>
                    <p className="text-sm opacity-80">Este crédito no puede avanzar en el flujo.</p>
                </div>
            </div>
        )
    }

    if (isFinished) {
        return (
            <div className="bg-emerald-900/10 border border-emerald-800 rounded-xl p-6 flex items-center gap-4 text-emerald-400">
                <CheckCircle size={24} />
                <div>
                    <h3 className="font-semibold text-lg">Crédito FINALIZADO</h3>
                    <p className="text-sm opacity-80">Este crédito ha sido completamente pagado.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-8">
            <h3 className="text-xl font-semibold text-white mb-6">Ciclo de Vida del Crédito</h3>

            {/* Progress Bar */}
            <div className="relative flex justify-between">
                {STEPS.map((step, index) => {
                    const Icon = step.icon
                    const isActive = index <= currentStepIndex || isFinished
                    const isCurrent = index === currentStepIndex

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${isActive
                                        ? isCurrent
                                            ? 'bg-teal-500 text-black ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900'
                                            : 'bg-teal-500 text-black'
                                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                                    }`}
                            >
                                <Icon size={18} />
                            </div>
                            <span className={`text-xs mt-2 font-medium ${isActive ? 'text-teal-400' : 'text-slate-500'}`}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}

                {/* Connection Line */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-800 -z-0">
                    <div
                        className="h-full bg-teal-500 transition-all duration-500"
                        style={{ width: isFinished ? '100%' : `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                    />
                </div>
            </div>

            {/* Global Messages */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-400">
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3 flex items-center gap-2 text-emerald-400">
                    <Check size={16} />
                    <span className="text-sm">{successMessage}</span>
                </div>
            )}

            {/* Controls */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                <h4 className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-4">
                    Acciones Disponibles
                </h4>

                {credit.estado === 'publicado' && (
                    <div className="space-y-3">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm text-slate-400 mb-1.5">Fecha Programada de Firma</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handleStatusUpdate('en_firma', 'fecha_firma_programada')}
                                disabled={loading || !selectedDate}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Programar Firma
                            </button>
                        </div>
                    </div>
                )}

                {credit.estado === 'en_firma' && (
                    <div className="space-y-4">
                        <p className="text-slate-300 text-sm">
                            Firma programada para: <span className="text-teal-400 font-medium">
                                {credit.fecha_firma_programada ? format(new Date(credit.fecha_firma_programada), 'PPpp', { locale: es }) : 'N/A'}
                            </span>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Notaria</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Notaria 25 de Bogota"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                    value={notaria}
                                    onChange={(e) => setNotaria(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1.5">Costos de Notaria (COP)</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                    value={costosNotaria || ''}
                                    onChange={(e) => setCostosNotaria(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => handleStatusUpdate('firmado', undefined, { notaria, costos_notaria: costosNotaria })}
                                disabled={loading}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Confirmar Firma de Documentos
                            </button>
                        </div>
                    </div>
                )}

                {credit.estado === 'firmado' && (
                    <div className="space-y-3">
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm text-slate-400 mb-1.5">Fecha Real de Desembolso</label>
                                <input
                                    type="datetime-local"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => handleStatusUpdate('activo', 'fecha_desembolso')}
                                disabled={loading || !selectedDate}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Confirmar Desembolso (Activar Crédito)
                            </button>
                        </div>
                    </div>
                )}

                {credit.estado === 'activo' && (
                    <div className="flex items-center gap-4">
                        <div className="text-emerald-400 flex items-center gap-2">
                            <CheckCircle size={20} />
                            <span className="font-semibold">Crédito Desembolsado y Vigente</span>
                        </div>
                        {credit.fecha_desembolso && (
                            <p className="text-slate-400 text-sm">
                                Desembolsado: <span className="text-slate-300">
                                    {format(new Date(credit.fecha_desembolso), 'PPpp', { locale: es })}
                                </span>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
