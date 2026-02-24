/**
 * Sistema de API Keys
 * Utilidades para crear, verificar y gestionar API keys
 */

import { createHash, randomBytes } from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Tipos
export interface ApiKey {
  id: string
  nombre: string
  key_prefix: string
  permisos: string[]
  activa: boolean
  ultimo_uso: string | null
  usos_totales: number
  created_at: string
  expires_at: string | null
}

export interface VerificacionResult {
  valida: boolean
  apiKey?: ApiKey
  error?: string
}

// Constantes
const API_KEY_PREFIX = 'aluri_'
const KEY_LENGTH = 32  // 32 bytes = 64 caracteres hex

/**
 * Genera una nueva API key
 * Retorna la key completa (solo se muestra una vez) y su hash
 */
export function generarApiKey(): { key: string; hash: string; prefix: string } {
  const randomPart = randomBytes(KEY_LENGTH).toString('hex')
  const key = `${API_KEY_PREFIX}${randomPart}`
  const hash = hashApiKey(key)
  const prefix = key.substring(0, 12)  // "aluri_" + 6 chars

  return { key, hash, prefix }
}

/**
 * Genera el hash SHA-256 de una API key
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Verifica una API key contra la base de datos
 */
export async function verificarApiKey(
  apiKey: string,
  permisoRequerido: 'read' | 'write' | 'admin' = 'read'
): Promise<VerificacionResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { valida: false, error: 'Configuración del servidor incompleta' }
  }

  // Validar formato de la key
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return { valida: false, error: 'Formato de API key inválido' }
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)
  const keyHash = hashApiKey(apiKey)

  // Buscar la key en la base de datos
  const { data: apiKeyData, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('activa', true)
    .single()

  if (error || !apiKeyData) {
    return { valida: false, error: 'API key inválida o inactiva' }
  }

  // Verificar expiración
  if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
    return { valida: false, error: 'API key expirada' }
  }

  // Verificar permisos
  const permisos = apiKeyData.permisos as string[]
  const tienePermiso = permisos.includes('admin') || permisos.includes(permisoRequerido)

  if (!tienePermiso) {
    return { valida: false, error: `Permiso '${permisoRequerido}' no autorizado` }
  }

  // Actualizar estadísticas de uso (async, no esperamos)
  supabase.rpc('registrar_uso_api_key', { p_key_hash: keyHash }).then()

  return {
    valida: true,
    apiKey: apiKeyData as ApiKey
  }
}

/**
 * Extrae la API key del header de la request
 * Soporta: X-API-Key header o Authorization: ApiKey xxx
 */
export function extraerApiKey(request: NextRequest): string | null {
  // Primero intentar X-API-Key header
  const xApiKey = request.headers.get('X-API-Key')
  if (xApiKey) return xApiKey

  // Luego intentar Authorization: ApiKey xxx
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('ApiKey ')) {
    return authHeader.replace('ApiKey ', '')
  }

  return null
}

/**
 * Helper para verificar autenticación (JWT admin O API Key)
 * Usar en los endpoints que necesitan autenticación
 */
export async function verificarAuth(
  request: NextRequest,
  permisoRequerido: 'read' | 'write' | 'admin' = 'read'
): Promise<{
  success: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
  metodo?: 'jwt' | 'apikey'
  error?: string
  status?: number
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return { success: false, error: 'Configuración del servidor incompleta', status: 500 }
  }

  // 1. Intentar API Key primero
  const apiKey = extraerApiKey(request)
  if (apiKey) {
    const resultado = await verificarApiKey(apiKey, permisoRequerido)
    if (resultado.valida) {
      const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)
      return { success: true, supabase, metodo: 'apikey' }
    }
    return { success: false, error: resultado.error, status: 401 }
  }

  // 2. Intentar JWT Bearer token
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')

    const supabaseAuth = createSupabaseClient(supabaseUrl, anonKey)
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return { success: false, error: 'Token JWT inválido o expirado', status: 401 }
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

    // Verificar rol admin si se requiere
    if (permisoRequerido === 'admin' || permisoRequerido === 'write') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        return { success: false, error: 'Se requiere rol de administrador', status: 403 }
      }
    }

    return { success: true, supabase, metodo: 'jwt' }
  }

  return { success: false, error: 'Se requiere autenticación (API Key o JWT)', status: 401 }
}
