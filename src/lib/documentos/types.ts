export type TipoContrato = 'Hipoteca' | 'Compraventa con Pacto de Retroventa' | ''

export type FormaPago = 'Solo intereses' | 'Interes y capital' | ''

export const ESTADOS_CIVILES = [
  'Soltero/a',
  'Soltero/a con union marital de hecho',
  'Soltero/a sin union marital de hecho',
  'Casado/a con sociedad conyugal vigente',
  'Casado/a con capitulaciones',
  'Union libre',
  'Divorciado/a',
  'Viudo/a',
] as const

export const TIPOS_DOCUMENTO = [
  'C.C.',
  'C.E.',
  'Pasaporte',
  'NIT',
  'T.I.',
  'PPT',
] as const

export const TIPO_DOCUMENTO_DEFAULT = 'C.C.'

export interface DeudorForm {
  nombre: string
  tipo_documento: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
  participacion_monto: string
  participacion_porcentaje: string
}

export interface CodeudorForm {
  nombre: string
  tipo_documento: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
}

export interface AcreedorForm {
  nombre: string
  tipo_documento: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
  participacion_monto: string
  participacion_porcentaje: string
  cuenta_bancaria: string
}

export interface InmuebleForm {
  matricula_inmobiliaria: string
  cedula_catastral: string
  chip: string
  direccion: string
  descripcion: string
  linderos: string
}

export interface PrestamoForm {
  monto: string
  plazo_meses: string
  tasa_mensual: string
  cuota_mensual: string
  forma_pago: FormaPago
  comision_aluri: string
  observaciones: string
}

export interface ChecklistPayload {
  tipo_contrato: TipoContrato
  deudores: DeudorForm[]
  codeudores: CodeudorForm[]
  acreedores: AcreedorForm[]
  inmueble: InmuebleForm
  prestamo: PrestamoForm
  fecha_creacion: string
}

export const MAX_DEUDORES = 4
export const MAX_CODEUDORES = 4
export const MAX_ACREEDORES = 4

export function emptyDeudor(): DeudorForm {
  return {
    nombre: '',
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc: '',
    cc_expedicion: '',
    direccion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    participacion_monto: '',
    participacion_porcentaje: '',
  }
}

export function emptyCodeudor(): CodeudorForm {
  return {
    nombre: '',
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc: '',
    cc_expedicion: '',
    direccion: '',
    email: '',
    telefono: '',
    estado_civil: '',
  }
}

export function emptyAcreedor(): AcreedorForm {
  return {
    nombre: '',
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc: '',
    cc_expedicion: '',
    direccion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    participacion_monto: '',
    participacion_porcentaje: '',
    cuenta_bancaria: '',
  }
}

export function emptyInmueble(): InmuebleForm {
  return {
    matricula_inmobiliaria: '',
    cedula_catastral: '',
    chip: '',
    direccion: '',
    descripcion: '',
    linderos: '',
  }
}

export function emptyPrestamo(): PrestamoForm {
  return {
    monto: '',
    plazo_meses: '',
    tasa_mensual: '',
    cuota_mensual: '',
    forma_pago: '',
    comision_aluri: '',
    observaciones: '',
  }
}
