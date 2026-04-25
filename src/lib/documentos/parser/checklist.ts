import {
  TIPO_DOCUMENTO_DEFAULT,
  TIPO_CUENTA_DEFAULT,
  type ChecklistPayload,
  type DeudorForm,
  type CodeudorForm,
  type AcreedorForm,
  type InmuebleForm,
  type PrestamoForm,
  type TipoContrato,
  type FormaPago,
} from '../types'

function buscarCampo(etiqueta: string, texto: string): string {
  const re = new RegExp(`${etiqueta}\\s*:\\s*(.+)`, 'i')
  const m = texto.match(re)
  return m ? m[1].trim() : ''
}

function buscar(patron: RegExp, texto: string): string {
  const m = texto.match(patron)
  return m && m[1] ? m[1].trim() : ''
}

/**
 * Cuando un campo del inmueble viene como "header en una línea + bullets en
 * las siguientes" (ej. "Número de matrícula inmobiliaria del inmueble" seguido
 * por "Apartamento 603: 50C-1754048" / "Parqueadero 59: 50C-1754493"),
 * concatena los bullets como "Apartamento 603: 50C-1754048; Parqueadero 59: 50C-1754493".
 * Devuelve string vacío si no encuentra el header o no hay bullets.
 */
function parsearBulletsInmueble(headerRe: RegExp, texto: string, stopRe: RegExp): string {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  let i = 0
  while (i < lineas.length && !headerRe.test(lineas[i])) i++
  if (i >= lineas.length) return ''
  // Si la línea del header ya tiene ":" con valor, no es formato bullet
  if (/:\s*\S/.test(lineas[i])) return ''
  i++

  const bullets: string[] = []
  while (i < lineas.length) {
    const linea = lineas[i]
    if (stopRe.test(linea)) break
    const m = linea.match(/^(.+?):\s*(.+)$/)
    if (m && m[2].trim()) {
      bullets.push(linea)
    } else if (bullets.length > 0) {
      break
    }
    i++
  }
  return bullets.join('; ')
}

function limpiarCampoChecklist(valor: string): string {
  if (!valor) return ''
  const v = valor.trim()
  if (/^(Participaci|Nombre|Cedula|Direcci|Correo|Tel.fono|Estado|CODEUDOR|Acreedor|Inmueble|Condiciones|Monto|SE LE|DEUDOR)/i.test(v)) {
    return ''
  }
  return v
}

function separarCcYExpedicion(ccRaw: string): { cc: string; exp: string } {
  if (!ccRaw) return { cc: '', exp: '' }
  const limpio = ccRaw.trim().replace(/^(C\.?C\.?\s*(No\.?)?\s*)/i, '').trim()
  const m1 = limpio.match(/([\d.]+)\s+de\s+(.+)/)
  if (m1) return { cc: m1[1].trim(), exp: m1[2].trim() }
  const m2 = limpio.match(/([\d.]+)\s*(.*)/)
  if (m2) return { cc: m2[1].trim(), exp: (m2[2] || '').trim() }
  return { cc: limpio, exp: '' }
}

function interpretarMonto(valor: string): number {
  if (!valor) return 0
  const texto = valor.trim().toUpperCase().replace(/\$/g, '').replace(/,/g, '').trim()

  const m = texto.match(/([\d.]+)\s*(MILLONES|MILLON|MIL)/)
  if (m) {
    const rawNum = m[1]
    const puntos = (rawNum.match(/\./g) || []).length
    // Si hay múltiples puntos los trato como separadores de miles (100.000);
    // si hay uno solo lo trato como decimal (1.5).
    const numeroStr = puntos > 1 ? rawNum.replace(/\./g, '') : rawNum
    const numero = parseFloat(numeroStr)
    if (!Number.isNaN(numero)) {
      const unidad = m[2]
      if (unidad === 'MILLONES' || unidad === 'MILLON') return Math.round(numero * 1_000_000)
      if (unidad === 'MIL') return Math.round(numero * 1_000)
    }
  }

  const limpio = texto.replace(/\./g, '').replace(/\s+/g, '').trim()
  const n = parseInt(limpio, 10)
  return Number.isNaN(n) ? 0 : n
}

function formatearMontoDisplay(valor: string): string {
  if (!valor) return ''
  const n = interpretarMonto(valor)
  if (n > 0) return n.toLocaleString('de-DE')
  const limpio = valor.replace(/\$/g, '').replace(/\s+/g, '').trim()
  return limpio
}

interface PersonaParseada {
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
  tipo_cuenta: string
  numero_cuenta: string
}

function normalizarTipoCuenta(raw: string): string {
  const v = (raw || '').trim().replace(/\.+$/, '').trim()
  if (!v) return TIPO_CUENTA_DEFAULT
  if (/ahorro/i.test(v)) return 'Ahorros'
  if (/corriente/i.test(v)) return 'Corriente'
  return v
}

function normalizarTipoDocumento(raw: string): string {
  const v = (raw || '').trim().replace(/\.+$/, '').trim()
  if (!v) return TIPO_DOCUMENTO_DEFAULT
  const upper = v.toUpperCase()
  if (/^C\.?C\.?$/.test(upper) || /C(E|É)DULA\s+DE\s+CIUDADAN/i.test(v) || /^CIUDADAN/i.test(v)) return 'C.C.'
  if (/^C\.?E\.?$/.test(upper) || /C(E|É)DULA\s+DE\s+EXTRANJ/i.test(v) || /^EXTRANJER/i.test(v)) return 'C.E.'
  if (/^T\.?I\.?$/.test(upper) || /TARJETA\s+DE\s+IDENTIDAD/i.test(v)) return 'T.I.'
  if (/^NIT$/i.test(v)) return 'NIT'
  if (/PASAPORTE/i.test(v)) return 'Pasaporte'
  if (/^PPT$/i.test(v) || /PERMISO.*TEMPORAL/i.test(v)) return 'PPT'
  if (/^PEP$/i.test(v) || /PERMISO.*PERMANENCIA/i.test(v)) return 'PPT' // PEP legacy -> PPT
  return v
}

function extraerPersonaDeBloque(bloque: string): PersonaParseada | null {
  const nombre = buscarCampo('Nombre', bloque)
  if (!nombre || /^(CC|Cedula|Direcci|Correo|Tel|Estado|Participaci|Tipo|N.mero|Numero)/i.test(nombre)) {
    return null
  }

  // Formato nuevo: "Tipo de documento: C.C." + "Numero Documento: 1.234.567"
  // OJO: usar [^\S\n]* (solo whitespace horizontal) para no capturar la linea
  // siguiente cuando el campo esta vacio.
  const tipoDocRaw = limpiarCampoChecklist(
    buscar(/Tipo\s+de\s+documento\s*(?:Deudor|Acreedor)?\s*:[^\S\n]*([^\n]*)/i, bloque)
  )
  const numDocRaw = limpiarCampoChecklist(
    buscar(/(?:N.mero|Numero|No\.?)\s+Documento\s*(?:Deudor|Acreedor)?\s*:[^\S\n]*([^\n]*)/i, bloque)
  )

  // Formato viejo (fallback): "CC. del Deudor: 1.234.567 de Bogota"
  const ccRaw = numDocRaw || buscar(/CC\.?\s*(?:del\s*Deudor)?\s*:\s*([^\n]+)/i, bloque)
  const { cc, exp: ccExp } = separarCcYExpedicion(limpiarCampoChecklist(ccRaw))

  const direccion = limpiarCampoChecklist(buscar(/Direcci.n\s*(?:de\s*)?notificaci.n\s*(?:Deudor|Acreedor)?\s*:\s*([^\n]+)/i, bloque))
  const email = limpiarCampoChecklist(buscar(/Correo\s*(?:electr.nico)?\s*(?:Deudor|Acreedor)?\s*:\s*([^\n]+)/i, bloque))
  const telefono = limpiarCampoChecklist(buscar(/Tel.fono\s*(?:Deudor|Acreedor)?\s*:\s*([^\n]+)/i, bloque))
  const civil = limpiarCampoChecklist(buscar(/Estado\s*civil\s*(?:Deudor|Acreedor)?\s*:\s*([^\n]+)/i, bloque))
  const partMontoRaw = buscar(/Participaci.n\s*\$+\s*:\s*([^\n]+)/i, bloque)
  const partPct = buscar(/Participaci.n\s*%\s*:\s*([^\n]+)/i, bloque)
  const tipoCuentaRaw = limpiarCampoChecklist(
    buscar(/Tipo\s+de\s+cuenta\s*:[^\S\n]*([^\n]*)/i, bloque)
  )
  const numeroCuentaRaw = limpiarCampoChecklist(
    buscar(/N.mero\s+de\s+cuenta\s*:[^\S\n]*([^\n]*)/i, bloque)
  )

  return {
    nombre,
    tipo_documento: tipoDocRaw ? normalizarTipoDocumento(tipoDocRaw) : TIPO_DOCUMENTO_DEFAULT,
    cc,
    cc_expedicion: ccExp,
    direccion,
    email,
    telefono,
    estado_civil: civil,
    participacion_monto: formatearMontoDisplay(limpiarCampoChecklist(partMontoRaw).replace(/\$/g, '').trim()),
    participacion_porcentaje: limpiarCampoChecklist(partPct),
    tipo_cuenta: normalizarTipoCuenta(tipoCuentaRaw),
    numero_cuenta: numeroCuentaRaw,
  }
}

export interface ParsedChecklist {
  tipo_contrato: TipoContrato
  deudores: DeudorForm[]
  codeudores: CodeudorForm[]
  acreedores: AcreedorForm[]
  inmueble: InmuebleForm
  prestamo: PrestamoForm
}

export function parseChecklistText(textoCompleto: string): ParsedChecklist {
  const lineas = textoCompleto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const texto = lineas.join('\n')

  const tipoStr = buscarCampo('TIPO DE CONTRATO', texto) || 'Hipoteca'
  const tipo: TipoContrato =
    tipoStr === 'Hipoteca' || tipoStr === 'Compraventa con Pacto de Retroventa'
      ? tipoStr
      : /compraventa/i.test(tipoStr)
      ? 'Compraventa con Pacto de Retroventa'
      : 'Hipoteca'

  // ── Personas (deudores + codeudores) antes de "Acreedor 1" ──
  const mCorte = texto.match(/Acreedor\s+1/i)
  const idxCorte = mCorte && typeof mCorte.index === 'number' ? mCorte.index : texto.length
  const zonaPersonas = texto.slice(0, idxCorte)

  const patronEncabezado = /^(DEUDOR\s*:|CODEUDOR\s*\d*\s*:|SE LE COMPRA|https?:\/\/)/gim
  const encabezados: { start: number; text: string }[] = []
  let m: RegExpExecArray | null
  while ((m = patronEncabezado.exec(zonaPersonas)) !== null) {
    encabezados.push({ start: m.index, text: m[0] })
  }

  // NOTA: en los contratos de Aluri, los encabezados "CODEUDOR N" del
  // checklist se mapean a deudores adicionales (deudor 2, deudor 3, ...)
  // — todos firman como deudores. La sección "Codeudores" del formulario
  // queda disponible para capturar manualmente casos excepcionales.
  const deudores: DeudorForm[] = []
  const codeudores: CodeudorForm[] = []

  for (let i = 0; i < encabezados.length; i++) {
    const ini = encabezados[i].start
    const fin = i + 1 < encabezados.length ? encabezados[i + 1].start : zonaPersonas.length
    const bloque = zonaPersonas.slice(ini, fin)
    const persona = extraerPersonaDeBloque(bloque)
    if (!persona) continue
    deudores.push(persona)
  }

  if (deudores.length === 0) {
    deudores.push({
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
      tipo_cuenta: TIPO_CUENTA_DEFAULT,
      numero_cuenta: '',
    })
  }

  // ── Acreedores (1..4) ──
  const acreedores: AcreedorForm[] = []
  for (let i = 1; i <= 4; i++) {
    const pat = new RegExp(`Acreedor\\s+${i}\\s*:?\\s*\\n?([\\s\\S]*?)(?=Acreedor\\s+${i + 1}|Inmueble|Condiciones|$)`, 'i')
    const mAcr = texto.match(pat)
    if (!mAcr) continue
    const bloque = mAcr[0]

    const nombre = buscarCampo('Nombre', bloque)
    if (!nombre) continue
    if (/^(Cedula|Direccion|Correo|Telefono|Estado|Participacion|Tipo|N.mero|Numero)/i.test(nombre)) continue

    // Formato nuevo primero (Tipo de documento / Numero Documento);
    // fallback a "Cedula:" del formato viejo. [^\S\n]* no cruza newlines.
    const tipoDocRaw = buscar(/Tipo\s+de\s+documento\s*(?:Acreedor)?\s*:[^\S\n]*([^\n]*)/i, bloque)
    const numDocRaw = buscar(/(?:N.mero|Numero|No\.?)\s+Documento\s*(?:Acreedor)?\s*:[^\S\n]*([^\n]*)/i, bloque)
    const ccRaw =
      numDocRaw ||
      buscar(/[Cc].dula\s*:\s*(.+)/, bloque) ||
      buscar(/CC\.?\s*(?:del\s*Acreedor)?\s*:\s*([^\n]+)/i, bloque)
    const { cc, exp: ccExp } = separarCcYExpedicion(ccRaw)

    const direccion = buscar(/[Dd]irecci.n\s*notificaci?o?n\s*:\s*(.+)/, bloque)
    const email = buscar(/[Cc]orreo\s*:\s*(.+)/, bloque)
    const telefono = buscar(/[Tt]el.fono\s*:\s*(.+)/, bloque)
    const civil = buscar(/[Ee]stado [Cc]ivil\s*:\s*(.+)/, bloque).trim()
    const partMonto = buscar(/[Pp]articipaci.n\s*\$+\s*:\s*(.+)/, bloque).replace(/\$/g, '').replace(/\s/g, '').trim()
    const partPct = buscar(/[Pp]articipaci.n\s*%\s*:\s*(.+)/, bloque)
    const tipoCuentaRaw = buscar(/Tipo\s+de\s+cuenta\s*:[^\S\n]*([^\n]*)/i, bloque)
    const numeroCuentaRaw = buscar(/N.mero\s+de\s+cuenta\s*:[^\S\n]*([^\n]*)/i, bloque)

    acreedores.push({
      nombre,
      tipo_documento: tipoDocRaw ? normalizarTipoDocumento(tipoDocRaw) : TIPO_DOCUMENTO_DEFAULT,
      cc,
      cc_expedicion: ccExp,
      direccion,
      email,
      telefono,
      estado_civil: civil,
      participacion_monto: formatearMontoDisplay(partMonto),
      participacion_porcentaje: partPct,
      tipo_cuenta: normalizarTipoCuenta(tipoCuentaRaw),
      numero_cuenta: numeroCuentaRaw,
    })
  }

  // ── Inmueble ──
  const mInm = texto.match(/Inmueble\s*:?\s*\n?([\s\S]*?)(?=Condiciones|$)/i)
  const bloqueInmueble = mInm ? mInm[0] : ''

  // Stop pattern para los parsers tipo bullet del inmueble. Cualquiera de estos
  // headers en una línea posterior detiene la captura.
  const stopInmueble = /^(C.dula catastral|C.digo CHIP|CHIP\s*:|Direcci.n del [Ii]nmueble|Descripci.n del [Ii]nmueble|Linderos|Ciudad|Oficina|Condiciones|Monto|N.mero de matr.cula)/i

  let matricula = buscar(/matr.cula inmobiliaria.*?:\s*(.+)/i, bloqueInmueble).replace(/[.\s]+$/, '')
  if (!matricula) {
    matricula = parsearBulletsInmueble(/matr.cula inmobiliaria/i, bloqueInmueble, stopInmueble)
  }
  let cedulaCatastral = buscar(/[Cc].dula catastral.*?:\s*(.+)/, bloqueInmueble).replace(/[.\s]+$/, '')
  if (!cedulaCatastral) {
    cedulaCatastral = parsearBulletsInmueble(/[Cc].dula catastral/i, bloqueInmueble, stopInmueble)
  }
  const chip = buscar(/CHIP\s*:\s*(.+)/i, bloqueInmueble)
  const inmuebleDir = buscar(/Direcci.n del [Ii]nmueble\s*:\s*(.+)/i, bloqueInmueble)
  const ciudadOficinaRegistro = buscar(/Ciudad\s+Oficina\s+de\s+Registro\s*:\s*(.+)/i, bloqueInmueble).replace(/[.\s]+$/, '')
  const ciudadInmueble = buscar(/Ciudad\s+del\s+[Ii]nmueble\s*:\s*(.+)/i, bloqueInmueble).replace(/[.\s]+$/, '')
  let inmuebleDesc = buscar(/Descripci.n del [Ii]nmueble\s*:\s*(.+)/i, bloqueInmueble)
  if (!inmuebleDesc) {
    inmuebleDesc = parsearBulletsInmueble(/Descripci.n del [Ii]nmueble/i, bloqueInmueble, stopInmueble)
  }
  let inmuebleLinderos = buscar(/Linderos\s*:\s*(.+)/i, bloqueInmueble)

  const linderosLineas: string[] = []
  let capturando = false
  for (const linea of lineas) {
    if (/Linderos\s*:/i.test(linea)) {
      capturando = true
      const rest = linea.replace(/Linderos\s*:\s*/i, '').trim()
      if (rest) linderosLineas.push(rest)
      continue
    }
    if (capturando) {
      if (/(C.digo CHIP|Condiciones|Monto)/i.test(linea)) break
      if (/^POR EL/i.test(linea) || (linderosLineas.length > 0 && !/^\w+\s*:/.test(linea))) {
        linderosLineas.push(linea)
      } else {
        break
      }
    }
  }
  if (linderosLineas.length > 0) inmuebleLinderos = linderosLineas.join(' ')

  // ── Condiciones del prestamo ──
  const mPrest = texto.match(/Condiciones del pr.stamo\s*:?\s*\n?([\s\S]*?)(?=Observaci.n|$)/i)
  const bloquePrest = mPrest ? mPrest[0] : ''

  const monto = buscar(/Monto del pr.stamo\s*:\s*\$?\s*(.+)/i, bloquePrest).replace(/\$/g, '').replace(/\s/g, '').trim()
  const plazo = buscar(/Plazo\s*\(?meses?\)?\s*:\s*(\d+)/i, bloquePrest)
  const tasa = buscar(/Tasa\s*\(?\s*mes\s*anticipado\s*\)?\s*:\s*(.+)/i, bloquePrest)
  const cuota = buscar(/Valor de la cuota mensual\s*:\s*\$?\s*(.+)/i, bloquePrest).replace(/\$/g, '').replace(/\s/g, '').trim()
  const formaPagoRaw = buscar(/Forma de pago.*?:\s*(.+)/i, bloquePrest)
  const comision = buscar(/Comisi.n Aluri\s*:\s*\$?\s*(.+)/i, bloquePrest).replace(/\$/g, '').replace(/\s/g, '').trim()

  let formaPago: FormaPago = 'Solo intereses'
  if (formaPagoRaw) {
    const fpLower = formaPagoRaw.toLowerCase()
    if (fpLower.includes('capital') && fpLower.includes('inter')) formaPago = 'Interes y capital'
    else if (fpLower.includes('solo') && fpLower.includes('inter')) formaPago = 'Solo intereses'
  }

  const observaciones = buscar(/Observaci.n\s*:\s*(.+)/i, texto)

  return {
    tipo_contrato: tipo,
    deudores,
    codeudores,
    acreedores,
    inmueble: {
      matricula_inmobiliaria: matricula,
      cedula_catastral: cedulaCatastral,
      chip,
      direccion: inmuebleDir,
      ciudad: ciudadInmueble,
      oficina_registro: '',
      ciudad_oficina_registro: ciudadOficinaRegistro,
      descripcion: inmuebleDesc,
      linderos: inmuebleLinderos,
    },
    prestamo: {
      monto: formatearMontoDisplay(monto),
      plazo_meses: plazo,
      tasa_mensual: tasa,
      cuota_mensual: formatearMontoDisplay(cuota),
      forma_pago: formaPago,
      comision_aluri: formatearMontoDisplay(comision),
      observaciones,
    },
  }
}

export function toChecklistPayload(parsed: ParsedChecklist): Omit<ChecklistPayload, 'fecha_creacion'> {
  return {
    tipo_contrato: parsed.tipo_contrato,
    deudores: parsed.deudores,
    codeudores: parsed.codeudores,
    acreedores: parsed.acreedores,
    inmueble: parsed.inmueble,
    prestamo: parsed.prestamo,
  }
}

export const __testing__ = {
  interpretarMonto,
  formatearMontoDisplay,
  separarCcYExpedicion,
  limpiarCampoChecklist,
}
