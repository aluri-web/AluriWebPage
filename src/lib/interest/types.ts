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
  saldo_intereses: number
  saldo_mora: number
  tasa_nominal: number
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
  saldo_base: number
  tasa_nominal: number
  tasa_diaria: number
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
  tasaDiaria: number          // Tasa efectiva diaria
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
export const FACTOR_MORA = 1.5  // Tasa de mora = tasa nominal × 1.5
export const DIAS_MES = 30      // Días base para cálculo mensual
