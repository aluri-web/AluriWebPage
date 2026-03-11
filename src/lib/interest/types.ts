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
  // Dos capitales paralelos (lógica Excel)
  saldo_capital: number              // Capital REAL (acumulado)
  saldo_capital_esperado: number     // Capital ESPERADO (si pagos a tiempo)
  saldo_capital_anterior?: number    // Capital del día anterior (para mora)
  saldo_intereses: number
  saldo_mora: number
  tasa_nominal: number               // Tasa EA del crédito
  tasa_mora?: number
  estado_credito: string
  fecha_desembolso: string
  fecha_ultimo_pago?: string
  fecha_proximo_pago?: string        // Próxima fecha de pago esperada
  monto_pago_esperado?: number       // Monto del pago mensual esperado
  ultima_causacion?: string
  dias_mora_actual: number
  en_mora: boolean                   // Si está en mora actualmente
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
  fecha_causacion: string        // DATE en formato YYYY-MM-DD
  // Dos capitales paralelos (lógica Excel)
  capital_esperado: number       // Capital ESPERADO (base para Int. Corriente)
  capital_real: number           // Capital REAL (acumulado)
  saldo_base?: number            // Deprecated: usar capital_esperado
  saldo_base_anterior?: number   // Capital del día anterior
  tasa_nominal: number           // Tasa EA del crédito
  tasa_diaria: number            // Tasa diaria corriente (4 decimales como Excel)
  tasa_mora_diaria: number       // Tasa diaria de mora (usura SFC)
  interes_causado: number        // Int. Corriente (sobre capital_esperado)
  mora_causada: number           // Int. Moratorio cuando en_mora = true
  interes_moratorio_potencial: number  // Int. Moratorio SIEMPRE (potencial)
  dias_mora: number
  en_mora: boolean               // Si el crédito está en mora este día
  monto_para_colocarse: number   // Capital Real - Capital Esperado
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
  tasaDiaria: number              // Tasa efectiva diaria (corriente) - 4 decimales
  tasaMoraDiaria: number          // Tasa diaria de mora (usura SFC) - 4 decimales
  interesDiario: number           // Int. Corriente (sobre capital ESPERADO)
  moraDiaria: number              // Int. Moratorio cuando en_mora = true
  interesMoratorioPotencial: number  // Int. Moratorio SIEMPRE (potencial)
  diasMora: number                // Días de mora
  capitalEsperado: number         // Capital esperado usado
  capitalReal: number             // Capital real usado
  enMora: boolean                 // Si está en mora
  montoParaColocarse: number      // Diferencia para ponerse al día
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
// Redondeadas a 4 decimales como en Excel
export const TASAS_USURA_SFC: Record<string, number> = {
  '2025-12': 25.02,  // Diciembre 2025
  '2026-01': 24.36,  // Enero 2026
  '2026-02': 25.23,  // Febrero 2026
  '2026-03': 25.52,  // Marzo 2026
}

// Tasa de usura por defecto (última conocida)
export const TASA_USURA_DEFAULT = 25.52
