/**
 * Utilidades compartidas para mapeo entre esquema DB y UI
 */

// Mapeo de estado español → etiqueta display
export function getEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
        'solicitado': 'Solicitado',
        'aprobado': 'Aprobado',
        'publicado': 'En Fondeo',
        'en_firma': 'En Firma',
        'firmado': 'Firmado',
        'activo': 'Activo',
        'finalizado': 'Completado',
        'castigado': 'Castigado',
        'mora': 'En Mora',
        'anulado': 'Anulado',
    }
    return labels[estado] || estado
}

// Mapeo de estado → clases CSS para badges
export function getEstadoStyle(estado: string): string {
    const styles: Record<string, string> = {
        'solicitado': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        'aprobado': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'publicado': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'en_firma': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'firmado': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        'activo': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        'finalizado': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
        'castigado': 'bg-red-500/20 text-red-400 border-red-500/30',
        'mora': 'bg-red-500/20 text-red-400 border-red-500/30',
        'anulado': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return styles[estado] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
}

// Mapeo de estado inversión → etiqueta
export function getInversionEstadoLabel(estado: string): string {
    const labels: Record<string, string> = {
        'pendiente': 'Pendiente',
        'activo': 'Confirmada',
        'cancelado': 'Cancelada',
        'liquidado': 'Liquidada',
        'rechazado': 'Rechazada',
    }
    return labels[estado] || estado
}

// Tipo para transacción raw de Supabase
interface RawTransaccion {
    tipo_transaccion: string
    monto: number
    referencia_pago: string | null
    fecha_aplicacion: string
    created_at?: string
}

// Tipo para pago agregado
export interface AggregatedPayment {
    referencia_pago: string
    payment_date: string
    amount_capital: number
    amount_interest: number
    amount_late_fee: number
    amount_total: number
}

// Agrupa transacciones por referencia_pago para reconstruir pagos
export function aggregatePaymentTransactions(transacciones: RawTransaccion[]): AggregatedPayment[] {
    const paymentTypes = ['pago_capital', 'pago_interes', 'pago_mora']
    const paymentTxns = transacciones.filter(t => paymentTypes.includes(t.tipo_transaccion))

    const grouped = new Map<string, AggregatedPayment>()

    for (const txn of paymentTxns) {
        const ref = txn.referencia_pago || txn.created_at || 'unknown'
        if (!grouped.has(ref)) {
            grouped.set(ref, {
                referencia_pago: ref,
                payment_date: txn.fecha_aplicacion,
                amount_capital: 0,
                amount_interest: 0,
                amount_late_fee: 0,
                amount_total: 0,
            })
        }
        const payment = grouped.get(ref)!
        if (txn.tipo_transaccion === 'pago_capital') payment.amount_capital += txn.monto
        else if (txn.tipo_transaccion === 'pago_interes') payment.amount_interest += txn.monto
        else if (txn.tipo_transaccion === 'pago_mora') payment.amount_late_fee += txn.monto
        payment.amount_total += txn.monto
    }

    return Array.from(grouped.values()).sort((a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )
}

// Calcula monto fondeado a partir de inversiones
export function calcAmountFunded(inversiones: { monto_invertido: number }[]): number {
    return inversiones.reduce((sum, inv) => sum + (inv.monto_invertido || 0), 0)
}

// Calcula totales de pagos desde transacciones
export function calcPaymentTotals(transacciones: RawTransaccion[]): {
    totalCapital: number
    totalInterest: number
    totalLateFee: number
    totalPaid: number
} {
    let totalCapital = 0
    let totalInterest = 0
    let totalLateFee = 0

    for (const t of transacciones) {
        if (t.tipo_transaccion === 'pago_capital') totalCapital += t.monto
        else if (t.tipo_transaccion === 'pago_interes') totalInterest += t.monto
        else if (t.tipo_transaccion === 'pago_mora') totalLateFee += t.monto
    }

    return { totalCapital, totalInterest, totalLateFee, totalPaid: totalCapital + totalInterest + totalLateFee }
}
