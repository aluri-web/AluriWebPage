'use server'

import { createAdminClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type CreditStatus = 'solicitado' | 'aprobado' | 'publicado' | 'en_firma' | 'firmado' | 'activo' | 'finalizado' | 'castigado' | 'mora' | 'anulado'

// Define valid state transitions
const VALID_TRANSITIONS: Record<CreditStatus, CreditStatus[]> = {
    'solicitado': ['aprobado', 'anulado'],
    'aprobado': ['publicado', 'anulado'],
    'publicado': ['en_firma', 'anulado'],
    'en_firma': ['firmado', 'anulado'],
    'firmado': ['activo', 'anulado'],
    'activo': ['finalizado', 'castigado', 'mora'],
    'mora': ['activo', 'castigado'],
    // Terminal states - no transitions allowed
    'finalizado': [],
    'castigado': [],
    'anulado': []
}

interface UpdateStatusParams {
    creditId: string
    newStatus: CreditStatus
    fechas?: {
        fecha_firma_programada?: string
        fecha_desembolso?: string
    }
}

export async function updateCreditStatus({ creditId, newStatus, fechas }: UpdateStatusParams) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, error: 'Configuration error: Missing Supabase keys' }
    }

    const supabase = createAdminClient(supabaseUrl, serviceRoleKey)

    try {
        // 1. Fetch current credit state
        const { data: currentCredit, error: fetchError } = await supabase
            .from('creditos')
            .select('estado')
            .eq('id', creditId)
            .single()

        if (fetchError || !currentCredit) {
            console.error('Error fetching credit:', fetchError)
            return { success: false, error: 'Credit not found' }
        }

        const currentStatus = currentCredit.estado as CreditStatus

        // 2. Validate state transition
        const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
        if (!allowedTransitions.includes(newStatus)) {
            console.warn(`Invalid transition: ${currentStatus} → ${newStatus}`)
            return {
                success: false,
                error: `Invalid transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
            }
        }

        // 3. Validate required fields for specific transitions
        if (newStatus === 'en_firma' && !fechas?.fecha_firma_programada) {
            return { success: false, error: 'fecha_firma_programada is required when transitioning to en_firma' }
        }

        if (newStatus === 'activo' && !fechas?.fecha_desembolso) {
            return { success: false, error: 'fecha_desembolso is required when transitioning to activo' }
        }

        // 4. Prepare update data
        const updateData: any = {
            estado: newStatus,
            updated_at: new Date().toISOString()
        }

        if (fechas) {
            if (fechas.fecha_firma_programada) {
                updateData.fecha_firma_programada = fechas.fecha_firma_programada
            }
            if (fechas.fecha_desembolso) {
                updateData.fecha_desembolso = fechas.fecha_desembolso
            }
        }

        // 5. Execute update
        const { error: updateError } = await supabase
            .from('creditos')
            .update(updateData)
            .eq('id', creditId)

        if (updateError) {
            console.error('Error updating credit status:', updateError)
            return { success: false, error: updateError.message }
        }

        // 6. Revalidate paths
        revalidatePath('/dashboard/admin/colocaciones')
        revalidatePath(`/dashboard/admin/colocaciones/${creditId}`)

        return { success: true }
    } catch (error) {
        console.error('Unexpected error updating credit status:', error)
        return { success: false, error: 'Unexpected error occurred' }
    }
}
