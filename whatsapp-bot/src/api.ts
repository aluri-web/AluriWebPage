import { config } from './config.js'

interface Credito {
  id: string
  codigo: string
  estado: string
  monto_solicitado: number
  monto_financiado: number
  nombre_propietario: string
}

interface ApiResponse<T> {
  success: boolean
  error?: string
  creditos?: T[]
  total?: number
}

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

// Obtener todos los créditos
export async function obtenerCreditos(estado?: string): Promise<Credito[]> {
  const endpoint = estado ? `/creditos?estado=${estado}` : '/creditos'
  const data = await apiRequest<ApiResponse<Credito>>(endpoint)
  return data.creditos || []
}

// Buscar crédito por código
export async function buscarCredito(codigo: string): Promise<Credito | null> {
  const creditos = await obtenerCreditos()
  const codigoNormalizado = codigo.toUpperCase().replace('-', '')

  return creditos.find(c => {
    const creditoCodigo = c.codigo.toUpperCase().replace('-', '')
    return creditoCodigo === codigoNormalizado || creditoCodigo.includes(codigoNormalizado)
  }) || null
}

// Obtener créditos en mora
export async function obtenerCreditosEnMora(): Promise<Credito[]> {
  return obtenerCreditos('mora')
}

// Obtener resumen general
export async function obtenerResumen(): Promise<{
  total: number
  activos: number
  enMora: number
  montoTotal: number
}> {
  const creditos = await obtenerCreditos()

  const activos = creditos.filter(c => c.estado === 'activo').length
  const enMora = creditos.filter(c => c.estado === 'mora').length
  const montoTotal = creditos.reduce((sum, c) => sum + (c.monto_solicitado || 0), 0)

  return {
    total: creditos.length,
    activos,
    enMora,
    montoTotal,
  }
}

// Formatear número como moneda
export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}
