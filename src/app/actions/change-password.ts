'use server'

import { createClient } from '@/utils/supabase/server'

export async function changePassword(currentPassword: string, newPassword: string) {
    const supabase = await createClient()

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
        return { success: false, error: 'No hay usuario autenticado' }
    }

    // 2. Verify current password by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
    })

    if (verifyError) {
        return { success: false, error: 'Contraseña actual incorrecta' }
    }

    // 3. Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    return { success: true }
}
