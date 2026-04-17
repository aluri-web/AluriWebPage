import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length]
  }
  return password
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function verifyAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, userId: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return { ok: profile?.role === 'admin', userId: user.id }
}

/**
 * POST /api/admin/generate-temp-password
 * Body: { userId } o { email }
 *
 * Genera una contraseña temporal para cualquier usuario y marca la cuenta
 * con app_metadata.must_change_password = true para forzar el cambio en
 * el primer login.
 */
export async function POST(request: NextRequest) {
  try {
    const { ok: isAdmin, userId: adminId } = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { userId, email } = body as { userId?: string; email?: string }

    if (!userId && !email) {
      return NextResponse.json({ error: 'userId o email requerido' }, { status: 400 })
    }

    const adminSupabase = getAdminSupabase()

    // Resolve target user
    let targetUser: { id: string; email?: string; app_metadata?: Record<string, unknown> } | null = null
    if (userId) {
      const { data, error } = await adminSupabase.auth.admin.getUserById(userId)
      if (error || !data?.user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }
      targetUser = data.user
    } else if (email) {
      const listResult = await adminSupabase.auth.admin.listUsers()
      const users = (listResult.data?.users ?? []) as typeof targetUser[]
      targetUser = users.find(u => u?.email?.toLowerCase() === email.toLowerCase()) || null
      if (!targetUser) {
        return NextResponse.json({ error: `Usuario ${email} no encontrado` }, { status: 404 })
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Prevent admins from targeting themselves (avoid lockout)
    if (targetUser.id === adminId) {
      return NextResponse.json({ error: 'No puedes generar una contraseña temporal para ti mismo' }, { status: 400 })
    }

    // Generate password and set on user. Preserve existing app_metadata.
    const newPassword = generatePassword()
    const existingAppMeta = (targetUser.app_metadata || {}) as Record<string, unknown>

    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
      app_metadata: {
        ...existingAppMeta,
        must_change_password: true,
      },
    })

    if (updateErr) {
      return NextResponse.json({ error: 'Error actualizando contraseña: ' + updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      password: newPassword,
      email: targetUser.email,
      user_id: targetUser.id,
      generated_at: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
