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

export const TIPOS_CUENTA = ['Ahorros', 'Corriente'] as const

export const TIPO_CUENTA_DEFAULT = 'Ahorros'

export interface DeudorForm {
  nombre: string
  tipo_documento: string
  cc: string
  cc_expedicion: string
  direccion: string
  ciudad_notificacion: string
  email: string
  telefono: string
  estado_civil: string
  participacion_monto: string
  participacion_porcentaje: string
  tipo_cuenta: string
  numero_cuenta: string
}

export interface CodeudorForm {
  nombre: string
  tipo_documento: string
  cc: string
  cc_expedicion: string
  direccion: string
  ciudad_notificacion: string
  email: string
  telefono: string
  estado_civil: string
  tipo_cuenta: string
  numero_cuenta: string
}

export interface AcreedorForm {
  nombre: string
  tipo_documento: string
  cc: string
  cc_expedicion: string
  direccion: string
  ciudad_notificacion: string
  email: string
  telefono: string
  estado_civil: string
  participacion_monto: string
  participacion_porcentaje: string
  tipo_cuenta: string
  numero_cuenta: string
}

export interface InmuebleForm {
  etiqueta: string
  matricula_inmobiliaria: string
  cedula_catastral: string
  chip: string
  direccion: string
  ciudad: string
  oficina_registro: string
  ciudad_oficina_registro: string
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
  con_fianza: boolean
}

export interface ChecklistPayload {
  tipo_contrato: TipoContrato
  deudores: DeudorForm[]
  codeudores: CodeudorForm[]
  acreedores: AcreedorForm[]
  inmuebles: InmuebleForm[]
  prestamo: PrestamoForm
  fecha_creacion: string
}

export const MAX_DEUDORES = 4
export const MAX_CODEUDORES = 4
export const MAX_ACREEDORES = 4
export const MAX_INMUEBLES = 6

export function emptyDeudor(): DeudorForm {
  return {
    nombre: '',
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc: '',
    cc_expedicion: '',
    direccion: '',
    ciudad_notificacion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    participacion_monto: '',
    participacion_porcentaje: '',
    tipo_cuenta: TIPO_CUENTA_DEFAULT,
    numero_cuenta: '',
  }
}

export function emptyCodeudor(): CodeudorForm {
  return {
    nombre: '',
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc: '',
    cc_expedicion: '',
    direccion: '',
    ciudad_notificacion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    tipo_cuenta: TIPO_CUENTA_DEFAULT,
    numero_cuenta: '',
  }
}

export function emptyAcreedor(): AcreedorForm {
  return {
    nombre: '',
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc: '',
    cc_expedicion: '',
    direccion: '',
    ciudad_notificacion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    participacion_monto: '',
    participacion_porcentaje: '',
    tipo_cuenta: TIPO_CUENTA_DEFAULT,
    numero_cuenta: '',
  }
}

export function emptyInmueble(): InmuebleForm {
  return {
    etiqueta: '',
    matricula_inmobiliaria: '',
    cedula_catastral: '',
    chip: '',
    direccion: '',
    ciudad: '',
    oficina_registro: '',
    ciudad_oficina_registro: '',
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
    con_fianza: false,
  }
}
