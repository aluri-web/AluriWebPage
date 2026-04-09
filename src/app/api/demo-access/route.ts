import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAIL = 'demo@aluri.co'

function generatePassword(length = 8): string {
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
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin'
}

/**
 * POST /api/demo-access
 * Genera una nueva contraseña para la cuenta demo.
 * Solo admins pueden usar este endpoint.
 */
export async function POST() {
  try {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const adminSupabase = getAdminSupabase()

    // Find demo user
    const listResult = await adminSupabase.auth.admin.listUsers()
    if (listResult.error) {
      return NextResponse.json({ error: 'Error listando usuarios' }, { status: 500 })
    }
    const users = listResult.data.users as { id: string; email?: string }[]
    const demoUser = users.find(u => u.email === DEMO_EMAIL)
    if (!demoUser) {
      return NextResponse.json({ error: `Usuario ${DEMO_EMAIL} no encontrado` }, { status: 404 })
    }

    // Generate and set new password
    const newPassword = generatePassword()
    const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(demoUser.id, {
      password: newPassword,
    })
    if (updateErr) {
      return NextResponse.json({ error: 'Error actualizando contraseña' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      password: newPassword,
      email: DEMO_EMAIL,
      generated_at: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/demo-access
 * Auto-rota la contraseña demo (llamado internamente despues de login).
 * Requiere header X-Internal-Key para proteger el endpoint.
 */
export async function PATCH(request: NextRequest) {
  try {
    const internalKey = request.headers.get('x-internal-key')
    if (internalKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const adminSupabase = getAdminSupabase()

    const listResult = await adminSupabase.auth.admin.listUsers()
    const patchUsers = (listResult.data?.users ?? []) as { id: string; email?: string }[]
    const demoUser = patchUsers.find(u => u.email === DEMO_EMAIL)
    if (!demoUser) {
      return NextResponse.json({ error: 'Demo user not found' }, { status: 404 })
    }

    // Rotate to random password nobody knows
    const randomPassword = generatePassword(32)
    await adminSupabase.auth.admin.updateUserById(demoUser.id, {
      password: randomPassword,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
