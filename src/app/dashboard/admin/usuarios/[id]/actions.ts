'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const BUCKET = 'user-documents'
const SIGNED_URL_TTL_SECONDS = 60 * 10 // 10 min

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase env vars no configuradas')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function ensureAdmin(): Promise<{ ok: boolean; userId: string | null; error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, userId: null, error: 'No autenticado' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { ok: false, userId: user.id, error: 'No autorizado' }
  }
  return { ok: true, userId: user.id }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UserDetails {
  id: string
  full_name: string | null
  email: string | null
  role: string
  verification_status: string | null
  document_id: string | null
  phone: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function getUserDetails(userId: string): Promise<UserDetails | null> {
  const { ok } = await ensureAdmin()
  if (!ok) return null

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, role, verification_status, document_id, phone, metadata, created_at')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching user:', error?.message)
    return null
  }
  return data as UserDetails
}

export interface UserDocumentRow {
  id: string
  user_id: string
  tipo: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export async function listUserDocuments(userId: string): Promise<UserDocumentRow[]> {
  const { ok } = await ensureAdmin()
  if (!ok) return []

  const admin = getAdminClient()
  const { data, error } = await admin
    .from('documentos_usuario')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })

  if (error) {
    console.error('Error listing user documents:', error.message)
    return []
  }
  return (data || []) as UserDocumentRow[]
}

export async function uploadUserDocument(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { ok, userId: adminId, error: adminErr } = await ensureAdmin()
  if (!ok) return { ok: false, error: adminErr || 'No autorizado' }

  const userId = formData.get('user_id') as string
  const tipo = formData.get('tipo') as string
  const file = formData.get('file') as File | null

  if (!userId || !tipo || !file) {
    return { ok: false, error: 'Faltan campos (user_id, tipo, file)' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'Archivo vacio' }
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: 'Archivo supera 25 MB' }
  }

  const admin = getAdminClient()

  // Sanitizar nombre original — preservar extension
  const originalName = file.name || 'documento'
  const dotIdx = originalName.lastIndexOf('.')
  const ext = dotIdx >= 0 ? originalName.slice(dotIdx).toLowerCase() : ''
  const baseSanitized = (dotIdx >= 0 ? originalName.slice(0, dotIdx) : originalName)
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 60) || 'documento'

  const uniqueId = crypto.randomUUID()
  const storagePath = `${userId}/${tipo}/${uniqueId}_${baseSanitized}${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (upErr) {
    return { ok: false, error: `Subida fallida: ${upErr.message}` }
  }

  const { error: insErr } = await admin
    .from('documentos_usuario')
    .insert({
      user_id: userId,
      tipo,
      storage_path: storagePath,
      file_name: originalName,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: adminId,
    })

  if (insErr) {
    // Rollback storage
    await admin.storage.from(BUCKET).remove([storagePath])
    return { ok: false, error: `Registro fallido: ${insErr.message}` }
  }

  revalidatePath(`/dashboard/admin/usuarios/${userId}`)
  return { ok: true }
}

export async function getDocumentSignedUrl(documentId: string): Promise<{ url: string | null; error?: string }> {
  const { ok } = await ensureAdmin()
  if (!ok) return { url: null, error: 'No autorizado' }

  const admin = getAdminClient()
  const { data: doc, error: docErr } = await admin
    .from('documentos_usuario')
    .select('storage_path, file_name')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) return { url: null, error: 'Documento no encontrado' }

  const { data, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: doc.file_name,
    })

  if (signErr || !data) return { url: null, error: signErr?.message || 'No se pudo generar URL' }
  return { url: data.signedUrl }
}

export async function deleteUserDocument(documentId: string): Promise<{ ok: boolean; error?: string }> {
  const { ok } = await ensureAdmin()
  if (!ok) return { ok: false, error: 'No autorizado' }

  const admin = getAdminClient()
  const { data: doc, error: docErr } = await admin
    .from('documentos_usuario')
    .select('user_id, storage_path')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) return { ok: false, error: 'Documento no encontrado' }

  await admin.storage.from(BUCKET).remove([doc.storage_path])
  const { error: delErr } = await admin
    .from('documentos_usuario')
    .delete()
    .eq('id', documentId)

  if (delErr) return { ok: false, error: delErr.message }

  revalidatePath(`/dashboard/admin/usuarios/${doc.user_id}`)
  return { ok: true }
}
