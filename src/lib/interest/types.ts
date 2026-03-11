/**
 * Sistema de Causación Diaria de Intereses
 * Tipos e interfaces TypeScript
 */

// ============================================
// Tipos de base de datos
// ============================================

export interface Credito {
  id: string
  codigo_credito: string
  cliente_id: string
  saldo_capital: number
  saldo_capital_anterior?: number  // Capital del día anterior (para mora)
  saldo_intereses: number
  saldo_mora: number
  tasa_nominal: number             // Tasa EA del crédito
  tasa_mora?: number
  estado_credito: string
  fecha_desembolso: string
  fecha_ultimo_pago?: string
  ultima_causacion?: string
  dias_mora_actual: number
  interes_acumulado_total: number
}

export interface Inversion {
  id: string
  credito_id: string
  inversionista_id: string
  monto_invertido: number
  porcentaje_participacion: number
  estado: string
  interest_rate_investor?: number
  interes_acumulado: number
  mora_acumulada: number
  ultima_causacion?: string
}

export interface CausacionDiaria {
  id?: string
  credito_id: string
  fecha_causacion: string  // DATE en formato YYYY-MM-DD
  saldo_base: number           // Capital del día actual (para interés corriente)
  saldo_base_anterior?: number // Capital del día anterior (para mora)
  tasa_nominal: number         // Tasa EA del crédito
  tasa_diaria: number          // Tasa diaria corriente
  tasa_mora_diaria?: number    // Tasa diaria de mora (usura SFC)
  interes_causado: number
  mora_causada: number
  dias_mora: number
}

export interface CausacionInversionista {
  id?: string
  causacion_id: string
  inversion_id: string
  inversionista_id: string
  credito_id: string
  fecha_causacion: string
  porcentaje_participacion: number
  interes_atribuido: number
  mora_atribuida: number
}

// ============================================
// Tipos de cálculo
// ============================================

export interface CalculoInteresDiario {
  tasaDiaria: number          // Tasa efectiva diaria (corriente)
  tasaMoraDiaria: number      // Tasa diaria de mora (usura SFC)
  interesDiario: number       // Interés calculado del día
  moraDiaria: number          // Mora del día (si aplica)
  diasMora: number            // Días de mora
}

export interface DistribucionInversionista {
  inversionId: string
  inversionistaId: string
  porcentaje: number
  interes: number             // Proporción del interés
  mora: number                // Proporción de la mora
}

// ============================================
// Tipos de respuesta del cron job
// ============================================

export interface ResultadoCausacion {
  creditoId: string
  codigoCredito: string
  fecha: string
  interesCausado: number
  moraCausada: number
  inversionistasActualizados: number
  error?: string
}

export interface ResumenEjecucion {
  fecha: string
  creditosProcesados: number
  creditosExitosos: number
  creditosConError: number
  totalInteresCausado: number
  totalMoraCausada: number
  duracionMs: number
  resultados: ResultadoCausacion[]
}

// ============================================
// Constantes
// ============================================

export const ESTADOS_CREDITO_ACTIVO = ['activo'] as const
export const DIAS_ANIO = 365    // Días base para cálculo anual (EA → diaria)

// Tasas de usura oficiales SFC por mes (fallback si no hay conexión a BD)
export const TASAS_USURA_SFC: Record<string, number> = {
  '2026-01': 24.36,  // Enero 2026
  '2026-02': 25.23,  // Febrero 2026
  '2026-03': 25.52,  // Marzo 2026
}

// Tasa de usura por defecto (última conocida)
export const TASA_USURA_DEFAULT = 25.52
