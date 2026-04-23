import {
  TIPO_DOCUMENTO_DEFAULT,
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
}

function extraerPersonaDeBloque(bloque: string): PersonaParseada | null {
  const nombre = buscarCampo('Nombre', bloque)
  if (!nombre || /^(CC|Cedula|Direcci|Correo|Tel|Estado|Participaci)/i.test(nombre)) {
    return null
  }

  const ccRaw = buscar(/CC\.?\s*(?:del\s*Deudor)?\s*:\s*([^\n]+)/i, bloque)
  const { cc, exp: ccExp } = separarCcYExpedicion(limpiarCampoChecklist(ccRaw))
  const direccion = limpiarCampoChecklist(buscar(/Direcci.n\s*(?:de\s*)?notificaci.n\s*(?:Deudor)?\s*:\s*([^\n]+)/i, bloque))
  const email = limpiarCampoChecklist(buscar(/Correo\s*(?:electr.nico)?\s*(?:Deudor)?\s*:\s*([^\n]+)/i, bloque))
  const telefono = limpiarCampoChecklist(buscar(/Tel.fono\s*(?:Deudor)?\s*:\s*([^\n]+)/i, bloque))
  const civil = limpiarCampoChecklist(buscar(/Estado\s*civil\s*(?:Deudor)?\s*:\s*([^\n]+)/i, bloque))
  const partMontoRaw = buscar(/Participaci.n\s*\$+\s*:\s*([^\n]+)/i, bloque)
  const partPct = buscar(/Participaci.n\s*%\s*:\s*([^\n]+)/i, bloque)

  return {
    nombre,
    tipo_documento: TIPO_DOCUMENTO_DEFAULT,
    cc,
    cc_expedicion: ccExp,
    direccion,
    email,
    telefono,
    estado_civil: civil,
    participacion_monto: formatearMontoDisplay(limpiarCampoChecklist(partMontoRaw).replace(/\$/g, '').trim()),
    participacion_porcentaje: limpiarCampoChecklist(partPct),
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

  const deudores: DeudorForm[] = []
  const codeudores: CodeudorForm[] = []

  for (let i = 0; i < encabezados.length; i++) {
    const ini = encabezados[i].start
    const fin = i + 1 < encabezados.length ? encabezados[i + 1].start : zonaPersonas.length
    const bloque = zonaPersonas.slice(ini, fin)
    const persona = extraerPersonaDeBloque(bloque)
    if (!persona) continue
    const esCodeudor = /^CODEUDOR/i.test(encabezados[i].text.trim())
    if (esCodeudor) {
      const { participacion_monto, participacion_porcentaje, ...rest } = persona
      void participacion_monto
      void participacion_porcentaje
      codeudores.push(rest)
    } else {
      deudores.push(persona)
    }
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
    if (/^(Cedula|Direccion|Correo|Telefono|Estado|Participacion)/i.test(nombre)) continue

    const ccRaw = buscar(/[Cc].dula\s*:\s*(.+)/, bloque)
    const { cc, exp: ccExp } = separarCcYExpedicion(ccRaw)
    const direccion = buscar(/[Dd]irecci.n\s*notificaci?o?n\s*:\s*(.+)/, bloque)
    const email = buscar(/[Cc]orreo\s*:\s*(.+)/, bloque)
    const telefono = buscar(/[Tt]el.fono\s*:\s*(.+)/, bloque)
    const civil = buscar(/[Ee]stado [Cc]ivil\s*:\s*(.+)/, bloque).trim()
    const partMonto = buscar(/[Pp]articipaci.n\s*\$+\s*:\s*(.+)/, bloque).replace(/\$/g, '').replace(/\s/g, '').trim()
    const partPct = buscar(/[Pp]articipaci.n\s*%\s*:\s*(.+)/, bloque)

    acreedores.push({
      nombre,
      tipo_documento: TIPO_DOCUMENTO_DEFAULT,
      cc,
      cc_expedicion: ccExp,
      direccion,
      email,
      telefono,
      estado_civil: civil,
      participacion_monto: formatearMontoDisplay(partMonto),
      participacion_porcentaje: partPct,
      cuenta_bancaria: '',
    })
  }

  // ── Inmueble ──
  const mInm = texto.match(/Inmueble\s*:?\s*\n?([\s\S]*?)(?=Condiciones|$)/i)
  const bloqueInmueble = mInm ? mInm[0] : ''

  const matricula = buscar(/matr.cula inmobiliaria.*?:\s*(.+)/i, bloqueInmueble).replace(/[.\s]+$/, '')
  const cedulaCatastral = buscar(/[Cc].dula catastral.*?:\s*(.+)/, bloqueInmueble).replace(/[.\s]+$/, '')
  const chip = buscar(/CHIP\s*:\s*(.+)/i, bloqueInmueble)
  const inmuebleDir = buscar(/Direcci.n del [Ii]nmueble\s*:\s*(.+)/i, bloqueInmueble)
  const inmuebleDesc = buscar(/Descripci.n del [Ii]nmueble\s*:\s*(.+)/i, bloqueInmueble)
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
