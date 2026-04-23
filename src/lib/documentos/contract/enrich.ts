import {
  ChecklistPayload,
  AcreedorForm,
  DeudorForm,
  CodeudorForm,
  InmuebleForm,
} from '../types'
import {
  fechaATextoLegal,
  formatoPesos,
  limpiarMonto,
  montoATextoLegal,
  montoATextoLegalMin,
  plazoATexto,
} from '../utils/formatting'

export interface DeudorEnriched {
  nombre_completo: string
  nombre_completo_mayuscula: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
  municipio: string
}

export interface CodeudorEnriched {
  nombre_completo: string
  nombre_completo_mayuscula: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
}

export interface AcreedorEnriched {
  nombre_completo: string
  nombre_completo_mayuscula: string
  cc: string
  cc_expedicion: string
  direccion: string
  email: string
  telefono: string
  estado_civil: string
  participacion_porcentaje: string
  participacion_monto: number
  participacion_texto: string
  cuenta_bancaria: string
  cuota_mensual_individual: number
  cuota_mensual_texto: string
  comision_aluri_individual: number
  monto_inicial: number
  monto_restante: number
}

export interface InmuebleEnriched {
  matricula_inmobiliaria: string
  oficina_registro: string
  cedula_catastral: string
  chip: string
  direccion_corta: string
  descripcion_completa: string
  linderos: string
}

export interface PrestamoEnriched {
  monto_total: number
  monto_total_texto: string
  monto_inicial_credito: number
  monto_inicial_texto: string
  monto_restante: number
  monto_restante_texto: string
  plazo_meses: number
  plazo_texto: string
  tasa_mensual: string
  cuota_mensual_total: number
  cuota_mensual_total_texto: string
  comision_aluri_total: number
  comision_aluri_por_acreedor: number
  servicios_aluri_texto: string
}

export interface EnrichedData {
  fecha_firma: string
  deudores: DeudorEnriched[]
  codeudores: CodeudorEnriched[]
  acreedores: AcreedorEnriched[]
  inmueble: InmuebleEnriched
  prestamo: PrestamoEnriched
}

function enriquecerDeudor(d: DeudorForm): DeudorEnriched {
  const nombre = (d.nombre || '').toUpperCase()
  return {
    nombre_completo: nombre,
    nombre_completo_mayuscula: nombre,
    cc: d.cc || '',
    cc_expedicion: d.cc_expedicion || '',
    direccion: d.direccion || '',
    email: d.email || '',
    telefono: d.telefono || '',
    estado_civil: d.estado_civil || '',
    municipio: d.cc_expedicion || '',
  }
}

function enriquecerCodeudor(c: CodeudorForm): CodeudorEnriched {
  const nombre = (c.nombre || '').toUpperCase()
  return {
    nombre_completo: nombre,
    nombre_completo_mayuscula: nombre,
    cc: c.cc || '',
    cc_expedicion: c.cc_expedicion || '',
    direccion: c.direccion || '',
    email: c.email || '',
    telefono: c.telefono || '',
    estado_civil: c.estado_civil || '',
  }
}

function enriquecerInmueble(i: InmuebleForm): InmuebleEnriched {
  return {
    matricula_inmobiliaria: i.matricula_inmobiliaria || '',
    oficina_registro: '',
    cedula_catastral: i.cedula_catastral || '',
    chip: i.chip || '',
    direccion_corta: i.direccion || '',
    descripcion_completa: i.descripcion || '',
    linderos: i.linderos || '',
  }
}

export function enriquecerDatos(form: ChecklistPayload, today: Date = new Date()): EnrichedData {
  const deudoresRaw = (form.deudores || []).filter((d) => (d.nombre || '').trim().length > 0)
  const acreedoresRaw = (form.acreedores || []).filter((a) => (a.nombre || '').trim().length > 0)
  const codeudoresRaw = (form.codeudores || []).filter((c) => (c.nombre || '').trim().length > 0)

  const montoDeudores = deudoresRaw.reduce(
    (acc, d) => acc + limpiarMonto(d.participacion_monto),
    0
  )
  const montoPrestamo = limpiarMonto(form.prestamo?.monto || '')
  const montoTotal = montoDeudores > 0 ? montoDeudores : montoPrestamo

  const plazo = parseInt(form.prestamo?.plazo_meses || '60', 10) || 60
  const tasa = form.prestamo?.tasa_mensual || '1.80%'
  const cuotaTotal = limpiarMonto(form.prestamo?.cuota_mensual || '')
  const comisionTotal = limpiarMonto(form.prestamo?.comision_aluri || '')
  const numAcreedores = acreedoresRaw.length > 0 ? acreedoresRaw.length : 1

  const acreedores: AcreedorEnriched[] = acreedoresRaw.map((acr) =>
    enriquecerAcreedor(acr, montoTotal, cuotaTotal, comisionTotal, numAcreedores)
  )

  const montoInicialTotal = Math.trunc((montoTotal * 35) / 100)
  const montoRestanteTotal = montoTotal - montoInicialTotal

  const deudores = deudoresRaw.map(enriquecerDeudor)
  const codeudores = codeudoresRaw.map(enriquecerCodeudor)
  const inmueble = enriquecerInmueble(form.inmueble || ({} as InmuebleForm))

  const comisionPorAcreedor =
    numAcreedores > 0 ? Math.trunc(comisionTotal / numAcreedores) : comisionTotal

  const prestamo: PrestamoEnriched = {
    monto_total: montoTotal,
    monto_total_texto: montoATextoLegal(montoTotal),
    monto_inicial_credito: montoInicialTotal,
    monto_inicial_texto: montoATextoLegal(montoInicialTotal),
    monto_restante: montoRestanteTotal,
    monto_restante_texto: montoATextoLegal(montoRestanteTotal),
    plazo_meses: plazo,
    plazo_texto: plazoATexto(plazo),
    tasa_mensual: tasa,
    cuota_mensual_total: cuotaTotal,
    cuota_mensual_total_texto: montoATextoLegalMin(cuotaTotal),
    comision_aluri_total: comisionTotal,
    comision_aluri_por_acreedor: comisionPorAcreedor,
    servicios_aluri_texto: formatoPesos(comisionPorAcreedor),
  }

  return {
    fecha_firma: fechaATextoLegal(today),
    deudores,
    codeudores,
    acreedores,
    inmueble,
    prestamo,
  }
}

function enriquecerAcreedor(
  acr: AcreedorForm,
  montoTotal: number,
  cuotaTotal: number,
  comisionTotal: number,
  numAcreedores: number
): AcreedorEnriched {
  const montoPart = limpiarMonto(acr.participacion_monto)
  let cuotaInd: number
  let comisionInd: number
  if (montoTotal > 0 && montoPart > 0) {
    const proporcion = montoPart / montoTotal
    cuotaInd = Math.round(cuotaTotal * proporcion)
    comisionInd = Math.round(comisionTotal * proporcion)
  } else {
    cuotaInd =
      numAcreedores > 0 ? Math.trunc(cuotaTotal / numAcreedores) : cuotaTotal
    comisionInd =
      numAcreedores > 0 ? Math.trunc(comisionTotal / numAcreedores) : comisionTotal
  }
  const montoInicialInd = Math.trunc((montoPart * 35) / 100)
  const montoRestanteInd = montoPart - montoInicialInd

  const nombre = (acr.nombre || '').toUpperCase()

  return {
    nombre_completo: nombre,
    nombre_completo_mayuscula: nombre,
    cc: acr.cc || '',
    cc_expedicion: acr.cc_expedicion || '',
    direccion: acr.direccion || '',
    email: acr.email || '',
    telefono: acr.telefono || '',
    estado_civil: acr.estado_civil || '',
    participacion_porcentaje: acr.participacion_porcentaje || '',
    participacion_monto: montoPart,
    participacion_texto: montoATextoLegal(montoPart),
    cuenta_bancaria: acr.cuenta_bancaria || '',
    cuota_mensual_individual: cuotaInd,
    cuota_mensual_texto: montoATextoLegalMin(cuotaInd),
    comision_aluri_individual: comisionInd,
    monto_inicial: montoInicialInd,
    monto_restante: montoRestanteInd,
  }
}
