import { EnrichedData } from './enrich'
import { formatoPesos, numeroATexto, montoATextoLegal, montoATextoLegalMin } from '../utils/formatting'

function capitalizar(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function tipoCuentaToLabel(tc: string): string {
  if (!tc) return 'Cuenta de ahorros'
  if (/corriente/i.test(tc)) return 'Cuenta corriente'
  return 'Cuenta de ahorros'
}

function safeNum(n: number): string {
  return formatoPesos(n).replace(/^\$/, '')
}

export function buildContext(data: EnrichedData): Record<string, string> {
  const deudores = data.deudores
  const deudor = deudores[0] || emptyDeudor()
  const deudor2 = deudores[1]
  const acr1 = data.acreedores[0] || emptyAcreedor()
  const acr2 = data.acreedores[1]
  const inm = data.inmueble
  const prest = data.prestamo
  const fecha = data.fecha_firma

  const mt = prest.monto_total
  const mi = prest.monto_inicial_credito

  const partes = data.acreedores.map((a) => {
    const pct = (a.participacion_porcentaje || '').replace('%', '').trim()
    return `${a.nombre_completo} con una participación de ${formatoPesos(
      a.participacion_monto
    )} equivalente al ${pct}% del crédito`
  })
  const textoPart = partes.length > 0 ? partes.join(', y ') : ''

  const nombresDeudoresLista = deudores.map((d) => d.nombre_completo).filter((n) => n)
  const nombresDeudoresStr = nombresDeudoresLista.join(' Y ')

  return {
    // ── v4 nuevas ──
    nombres_deudores: nombresDeudoresStr,

    deudor_nombre: deudor.nombre_completo || '',
    deudor_tipo_doc: deudor.tipo_documento || 'C.C.',
    deudor_cc: deudor.cc || '',
    deudor_direccion: deudor.direccion || '',
    deudor_email: deudor.email || '',
    deudor_telefono: deudor.telefono || '',

    deudor2_nombre: deudor2?.nombre_completo || '',
    deudor2_tipo_doc: deudor2 ? (deudor2.tipo_documento || 'C.C.') : '',
    deudor2_cc: deudor2?.cc || '',
    deudor2_direccion: deudor2?.direccion || '',
    deudor2_email: deudor2?.email || '',
    deudor2_telefono: deudor2?.telefono || '',

    acreedor_nombre: acr1.nombre_completo || '',
    acreedor_tipo_doc: acr1.tipo_documento || 'C.C.',
    acreedor_cc: acr1.cc || '',
    acreedor_direccion: acr1.direccion || '',
    acreedor_email: acr1.email || '',
    acreedor_telefono: acr1.telefono || '',

    matricula_inmobiliaria: inm.matricula_inmobiliaria || '',
    oficina_registro: inm.oficina_registro || 'Zona Sur',
    ciudad_oficina_registro: inm.ciudad_oficina_registro || 'Bogotá D.C.',
    direccion_inmueble: inm.direccion_corta || '',
    ciudad_inmueble: inm.ciudad || 'Bogotá D.C.',

    monto_credito_letras: numeroATexto(mt).toUpperCase(),
    monto_credito_numeros: safeNum(mt),
    tasa_interes: `${prest.tasa_mensual} mensual anticipado`,
    plazo_letras: capitalizar(numeroATexto(prest.plazo_meses || 0)),
    plazo_numeros: String(prest.plazo_meses || ''),
    cuota_mensual_letras: capitalizar(numeroATexto(prest.cuota_mensual_total)),
    cuota_mensual_numeros: safeNum(prest.cuota_mensual_total),
    servicio_aluri_letras: numeroATexto(prest.comision_aluri_total).toUpperCase(),
    servicio_aluri_numeros: safeNum(prest.comision_aluri_total),
    primera_cuota_letras: capitalizar(numeroATexto(prest.cuota_mensual_total)),
    primera_cuota_numeros: safeNum(prest.cuota_mensual_total),

    fecha_firma_contrato: fecha,
    fecha_firma_pagare: fecha,
    fecha_firma_carta: fecha,
    domicilio_contractual: 'Bogotá D.C.',

    tipo_cuenta_deudor: tipoCuentaToLabel(deudor.tipo_cuenta),
    cuenta_deudor: deudor.numero_cuenta || '',
    tipo_cuenta_deudor2: deudor2 ? tipoCuentaToLabel(deudor2.tipo_cuenta) : '',
    cuenta_deudor2: deudor2?.numero_cuenta || '',
    tipo_cuenta_acreedor: tipoCuentaToLabel(acr1.tipo_cuenta),
    cuenta_acreedor: acr1.numero_cuenta || '',

    // ── legacy (compat) ──
    fecha_firma: fecha,
    fecha_firma_lower: fecha.toLowerCase(),
    deudor_municipio: deudor.municipio || '',
    deudor_estado_civil: deudor.estado_civil || '',
    acr1_nombre: acr1.nombre_completo || '',
    acr1_cc: acr1.cc || '',
    acr1_estado_civil: acr1.estado_civil || '',
    acr1_direccion: acr1.direccion || '',
    acr1_email: acr1.email || '',
    acr1_telefono: acr1.telefono || '',
    acr1_cuenta: acr1.numero_cuenta || '',
    acr1_pct: `${acr1.participacion_porcentaje || ''}%`.replace(/%%/g, '%'),
    acr1_aporte: formatoPesos(acr1.participacion_monto || 0),
    acr2_nombre: acr2?.nombre_completo || '',
    acr2_cc: acr2?.cc || '',
    acr2_estado_civil: acr2?.estado_civil || '',
    acr2_direccion: acr2?.direccion || '',
    acr2_email: acr2?.email || '',
    acr2_telefono: acr2?.telefono || '',
    acr2_cuenta: acr2?.numero_cuenta || '',
    acr2_pct: acr2 ? `${acr2.participacion_porcentaje || ''}%`.replace(/%%/g, '%') : '',
    acr2_aporte: acr2 ? formatoPesos(acr2.participacion_monto || 0) : '',
    monto_total_texto: prest.monto_total_texto,
    monto_total_mcte: `${numeroATexto(mt).toUpperCase()} DE PESOS M/CTE (COP${formatoPesos(mt)})`,
    monto_total_pesos: formatoPesos(mt),
    monto_inicial_texto: montoATextoLegal(mi),
    monto_inicial_pesos: formatoPesos(mi),
    monto_restante_texto: montoATextoLegal(prest.monto_restante),
    cuota_mensual_texto: prest.cuota_mensual_total_texto,
    cuota_mensual_pesos: formatoPesos(prest.cuota_mensual_total),
    cuota_anticipada_texto: montoATextoLegalMin(prest.cuota_mensual_total),
    comision_aluri_pesos: formatoPesos(prest.comision_aluri_total),
    comision_aluri_mcte: `${numeroATexto(prest.comision_aluri_total).toUpperCase()} DE PESOS M/CTE (COP${formatoPesos(
      prest.comision_aluri_total
    )})`,
    tasa_texto: `${prest.tasa_mensual} mensual anticipado`,
    plazo_texto: prest.plazo_texto,
    plazo_meses: String(prest.plazo_meses || ''),
    chip: inm.chip || '',
    texto_participacion_acreedores: textoPart,
  }
}

function emptyDeudor() {
  return {
    nombre_completo: '',
    nombre_completo_mayuscula: '',
    tipo_documento: 'C.C.',
    cc: '',
    cc_expedicion: '',
    direccion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    municipio: '',
    tipo_cuenta: 'Ahorros',
    numero_cuenta: '',
  }
}

function emptyAcreedor() {
  return {
    nombre_completo: '',
    nombre_completo_mayuscula: '',
    tipo_documento: 'C.C.',
    cc: '',
    cc_expedicion: '',
    direccion: '',
    email: '',
    telefono: '',
    estado_civil: '',
    participacion_porcentaje: '',
    participacion_monto: 0,
    participacion_texto: '',
    tipo_cuenta: 'Ahorros',
    numero_cuenta: '',
    cuota_mensual_individual: 0,
    cuota_mensual_texto: '',
    comision_aluri_individual: 0,
    monto_inicial: 0,
    monto_restante: 0,
  }
}
