export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      creditos: {
        Row: {
          id: string
          cliente_id: string
          codigo_credito: string
          monto_solicitado: number
          valor_colocado: number
          tasa_nominal: number
          plazo: number
          fecha_desembolso: string | null
          fecha_firma_programada: string | null
          fecha_primer_pago: string | null
          fecha_ultimo_pago: string | null
          producto: string | null
          estado: 'solicitado' | 'aprobado' | 'publicado' | 'en_firma' | 'firmado' | 'activo' | 'finalizado' | 'castigado' | 'mora' | 'no_colocado'
          saldo_capital: number
          saldo_intereses: number
          saldo_mora: number
          created_at: string
          updated_at: string
          tipo_contrato: 'hipotecario' | 'retroventa'
          tipo_amortizacion: 'francesa' | 'solo_interes'
        }
        Insert: {
          id?: string
          cliente_id: string
          codigo_credito: string
          monto_solicitado: number
          valor_colocado: number
          tasa_nominal: number
          plazo: number
          fecha_desembolso?: string | null
          fecha_firma_programada?: string | null
          fecha_primer_pago?: string | null
          fecha_ultimo_pago?: string | null
          producto?: string | null
          estado?: 'solicitado' | 'aprobado' | 'publicado' | 'en_firma' | 'firmado' | 'activo' | 'finalizado' | 'castigado' | 'mora' | 'no_colocado'
          saldo_capital?: number
          saldo_intereses?: number
          saldo_mora?: number
          created_at?: string
          updated_at?: string
          tipo_contrato?: 'hipotecario' | 'retroventa'
          tipo_amortizacion?: 'francesa' | 'solo_interes'
        }
        Update: {
          id?: string
          cliente_id?: string
          codigo_credito?: string
          monto_solicitado?: number
          valor_colocado?: number
          tasa_nominal?: number
          plazo?: number
          fecha_desembolso?: string | null
          fecha_firma_programada?: string | null
          fecha_primer_pago?: string | null
          fecha_ultimo_pago?: string | null
          producto?: string | null
          estado?: 'solicitado' | 'aprobado' | 'publicado' | 'en_firma' | 'firmado' | 'activo' | 'finalizado' | 'castigado' | 'mora' | 'no_colocado'
          saldo_capital?: number
          saldo_intereses?: number
          saldo_mora?: number
          created_at?: string
          updated_at?: string
          tipo_contrato?: 'hipotecario' | 'retroventa'
          tipo_amortizacion?: 'francesa' | 'solo_interes'
        }
      }
      inversiones: {
        Row: {
          id: string
          credito_id: string
          inversionista_id: string
          monto: number
          porcentaje: number
          fecha_inversion: string
          estado: 'activo' | 'cancelado' | 'finalizado'
        }
        Insert: {
          id?: string
          credito_id: string
          inversionista_id: string
          monto: number
          porcentaje: number
          fecha_inversion?: string
          estado?: 'activo' | 'cancelado' | 'finalizado'
        }
        Update: {
          id?: string
          credito_id?: string
          inversionista_id?: string
          monto?: number
          porcentaje?: number
          fecha_inversion?: string
          estado?: 'activo' | 'cancelado' | 'finalizado'
        }
      }
    }
  }
}
