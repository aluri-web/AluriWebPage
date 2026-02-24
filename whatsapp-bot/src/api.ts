import { config } from './config.js'

// =====================
// TIPOS
// =====================

interface Credito {
  id: string
  codigo: string
  estado: string
  monto_solicitado: number
  monto_financiado: number
  nombre_propietario: string
}

interface Inversionista {
  id: string
  full_name: string
  email: string
  document_id: string
  phone: string
  inversiones_count: number
  inversiones_activas: number
  total_invertido: number
}

interface Propietario {
  id: string
  full_name: string
  email: string
  document_id: string
  phone: string
  creditos_count: number
  creditos_activos: number
  total_deuda: number
}

interface Pago {
  id: string
  fecha_pago: string
  monto_capital: number
  monto_interes: number
  monto_mora: number
  monto_total: number
}

interface ApiResponse<T> {
  success: boolean
  error?: string
  creditos?: T[]
  inversionistas?: T[]
  propietarios?: T[]
  pagos?: T[]
  total?: number
}

// =====================
// CLIENTE API
// =====================

async function apiRequest<T>(endpoint: string): Promise<T> {
  const url = `${config.apiBaseUrl}${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error (${response.status}): ${error}`)
  }

  return response.json()
}

// =====================
// CREDITOS
// =====================

export async function obtenerCreditos(estado?: string): Promise<Credito[]> {
  const endpoint = estado ? `/creditos?estado=${estado}` : '/creditos'
  const data = await apiRequest<ApiResponse<Credito>>(endpoint)
  return data.creditos || []
}

export async function buscarCredito(codigo: string): Promise<Credito | null> {
  const creditos = await obtenerCreditos()
  const codigoNormalizado = codigo.toUpperCase().replace('-', '')

  return creditos.find(c => {
    const creditoCodigo = c.codigo.toUpperCase().replace('-', '')
    return creditoCodigo === codigoNormalizado || creditoCodigo.includes(codigoNormalizado)
  }) || null
}

export async function obtenerCreditosEnMora(): Promise<Credito[]> {
  return obtenerCreditos('mora')
}

export async function obtenerResumen(): Promise<{
  total: number
  activos: number
  enMora: number
  publicados: number
  montoTotal: number
  montoActivo: number
}> {
  const creditos = await obtenerCreditos()

  const activos = creditos.filter(c => c.estado === 'activo')
  const enMora = creditos.filter(c => c.estado === 'mora')
  const publicados = creditos.filter(c => c.estado === 'publicado')
  const montoTotal = creditos.reduce((sum, c) => sum + (c.monto_solicitado || 0), 0)
  const montoActivo = activos.reduce((sum, c) => sum + (c.monto_solicitado || 0), 0)

  return {
    total: creditos.length,
    activos: activos.length,
    enMora: enMora.length,
    publicados: publicados.length,
    montoTotal,
    montoActivo,
  }
}

// =====================
// INVERSIONISTAS
// =====================

export async function obtenerInversionistas(buscar?: string): Promise<Inversionista[]> {
  const endpoint = buscar ? `/inversionistas?search=${encodeURIComponent(buscar)}` : '/inversionistas'
  const data = await apiRequest<ApiResponse<Inversionista>>(endpoint)
  return data.inversionistas || []
}

export async function obtenerResumenInversionistas(): Promise<{
  total: number
  conInversionesActivas: number
  totalInvertido: number
}> {
  const inversionistas = await obtenerInversionistas()

  const conInversionesActivas = inversionistas.filter(i => i.inversiones_activas > 0).length
  const totalInvertido = inversionistas.reduce((sum, i) => sum + (i.total_invertido || 0), 0)

  return {
    total: inversionistas.length,
    conInversionesActivas,
    totalInvertido,
  }
}

// =====================
// PROPIETARIOS
// =====================

export async function obtenerPropietarios(buscar?: string): Promise<Propietario[]> {
  const endpoint = buscar ? `/propietarios?search=${encodeURIComponent(buscar)}` : '/propietarios'
  const data = await apiRequest<ApiResponse<Propietario>>(endpoint)
  return data.propietarios || []
}

export async function obtenerResumenPropietarios(): Promise<{
  total: number
  conCreditosActivos: number
  totalDeuda: number
}> {
  const propietarios = await obtenerPropietarios()

  const conCreditosActivos = propietarios.filter(p => p.creditos_activos > 0).length
  const totalDeuda = propietarios.reduce((sum, p) => sum + (p.total_deuda || 0), 0)

  return {
    total: propietarios.length,
    conCreditosActivos,
    totalDeuda,
  }
}

// =====================
// PAGOS
// =====================

export async function obtenerPagosCredito(creditoId: string): Promise<Pago[]> {
  const endpoint = `/pagos?credito_id=${encodeURIComponent(creditoId)}`
  const data = await apiRequest<ApiResponse<Pago>>(endpoint)
  return data.pagos || []
}

// =====================
// UTILIDADES
// =====================

export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
