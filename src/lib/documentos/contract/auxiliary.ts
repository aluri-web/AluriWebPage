import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { ChecklistPayload } from '../types'
import { enriquecerDatos } from './enrich'
import { colombiaDateParts, fechaATextoLegal } from '../utils/formatting'

const TPL_DIR = path.join(process.cwd(), 'src/lib/documentos/templates')
const TPL_AUTORIZACION = path.join(TPL_DIR, 'Autorizacion_Datos_v1.docx')
const TPL_INFO_INVERSIONISTA = path.join(TPL_DIR, 'Informacion_Inversionista_v1.docx')
const TPL_CORRETAJE_HIP_SIN = path.join(TPL_DIR, 'Corretaje_Hipoteca_SinFianza_v1.docx')
const TPL_CORRETAJE_HIP_CON = path.join(TPL_DIR, 'Corretaje_Hipoteca_ConFianza_v1.docx')
const TPL_CORRETAJE_COMPRA = path.join(TPL_DIR, 'Corretaje_Compraventa_v1.docx')

export interface AuxResult {
  buffer: Buffer
  filename: string
}

function sanitizar(nombre: string): string {
  const upper = (nombre || 'SIN_NOMBRE').toUpperCase().replace(/\s+/g, '_')
  return upper.replace(/[^A-Z0-9_\-]/g, '').slice(0, 30) || 'SIN_NOMBRE'
}

function tsNow(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const c = colombiaDateParts(date)
  return `${c.year}${pad(c.month)}${pad(c.day)}_${pad(c.hour)}${pad(c.minute)}${pad(c.second)}`
}

function renderTemplate(templatePath: string, context: Record<string, unknown>): Buffer {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template no encontrado: ${path.basename(templatePath)}`)
  }
  const zip = new PizZip(fs.readFileSync(templatePath))
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
    parser: (tag: string) => ({
      get: (scope: Record<string, unknown>) => scope[tag.trim()],
    }),
  })
  doc.render(context)
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function joinMatriculas(form: ChecklistPayload): string {
  const inmuebles = form.inmuebles || []
  if (inmuebles.length <= 1) return inmuebles[0]?.matricula_inmobiliaria || ''
  return inmuebles
    .map((i) => {
      const v = i.matricula_inmobiliaria || ''
      if (!v) return ''
      return i.etiqueta ? `${i.etiqueta}: ${v}` : v
    })
    .filter(Boolean)
    .join('; ')
}

function direccionInmueble(form: ChecklistPayload): string {
  // Tomamos la dirección del primer inmueble como dirección "principal".
  return form.inmuebles?.[0]?.direccion || ''
}

// ─────────────────────────────────────────────────────────────
// 1. AUTORIZACIÓN DE MANEJO DE DATOS — uno por deudor
// ─────────────────────────────────────────────────────────────
export function generarAutorizacionDatos(
  form: ChecklistPayload,
  deudorIndex: number,
  today: Date = new Date(),
): AuxResult {
  const deudor = (form.deudores || [])[deudorIndex]
  if (!deudor) throw new Error(`No existe deudor con índice ${deudorIndex}`)

  const tipoDoc = deudor.tipo_documento || 'C.C.'
  const nombre = (deudor.nombre || '').toUpperCase()

  const buffer = renderTemplate(TPL_AUTORIZACION, {
    usuario_nombre: nombre,
    usuario_cc: `${tipoDoc} No. ${deudor.cc || ''}`,
  })
  const filename = `Autorizacion_Datos_${sanitizar(nombre)}_${tsNow(today)}.docx`
  return { buffer, filename }
}

// ─────────────────────────────────────────────────────────────
// 2. INFORMACIÓN PARA EL INVERSIONISTA — uno por acreedor
// ─────────────────────────────────────────────────────────────
export function generarInfoInversionista(
  form: ChecklistPayload,
  acreedorIndex: number,
  today: Date = new Date(),
): AuxResult {
  const enriched = enriquecerDatos(form, today)
  const acreedor = enriched.acreedores[acreedorIndex]
  if (!acreedor) throw new Error(`No existe acreedor con índice ${acreedorIndex}`)

  const deudor = enriched.deudores[0]
  const deudor2 = enriched.deudores[1]
  const fechaContrato = fechaATextoLegal(today)

  const buffer = renderTemplate(TPL_INFO_INVERSIONISTA, {
    fecha_firma_contrato: fechaContrato,
    matricula_inmobiliaria: joinMatriculas(form),
    direccion_inmueble: direccionInmueble(form),

    deudor_nombre: deudor?.nombre_completo || '',
    deudor_tipo_doc: deudor?.tipo_documento || 'C.C.',
    deudor_cc: deudor?.cc || '',
    deudor_direccion: deudor?.direccion || '',
    deudor_email: deudor?.email || '',
    deudor_telefono: deudor?.telefono || '',

    hay_deudor2: deudor2 ? 'true' : '',
    deudor2_nombre: deudor2?.nombre_completo || '',
    deudor2_tipo_doc: deudor2?.tipo_documento || '',
    deudor2_cc: deudor2?.cc || '',
    deudor2_direccion: deudor2?.direccion || '',
    deudor2_email: deudor2?.email || '',
    deudor2_telefono: deudor2?.telefono || '',

    acreedor_nombre: acreedor.nombre_completo,
    acreedor_tipo_doc: acreedor.tipo_documento || 'C.C.',
    acreedor_cc: acreedor.cc,
    acreedor_direccion: acreedor.direccion,
    acreedor_email: acreedor.email,
    acreedor_telefono: acreedor.telefono,
  })
  const filename = `Informacion_Inversionista_${sanitizar(acreedor.nombre_completo)}_${tsNow(today)}.docx`
  return { buffer, filename }
}

// ─────────────────────────────────────────────────────────────
// 3. CONTRATO DE CORRETAJE — uno por crédito (deudor principal)
// Selecciona la plantilla según tipo_contrato + con_fianza.
// ─────────────────────────────────────────────────────────────
export function generarContratoCorretaje(
  form: ChecklistPayload,
  today: Date = new Date(),
): AuxResult {
  const deudor = (form.deudores || [])[0]
  if (!deudor) throw new Error('No hay deudor principal')

  let templatePath: string
  if (form.tipo_contrato === 'Compraventa con Pacto de Retroventa') {
    templatePath = TPL_CORRETAJE_COMPRA
  } else if (form.prestamo?.con_fianza) {
    templatePath = TPL_CORRETAJE_HIP_CON
  } else {
    templatePath = TPL_CORRETAJE_HIP_SIN
  }

  const fechaFirma = fechaATextoLegal(today)
  const nombre = (deudor.nombre || '').toUpperCase()

  const buffer = renderTemplate(templatePath, {
    fecha_firma: fechaFirma,
    matricula_inmobiliaria: joinMatriculas(form),
    direccion_inmueble: direccionInmueble(form),

    contratante_nombre: nombre,
    contratante_tipo_doc: deudor.tipo_documento || 'C.C.',
    contratante_cc: deudor.cc || '',
    contratante_direccion: deudor.direccion || '',
    contratante_email: deudor.email || '',
    contratante_telefono: deudor.telefono || '',
  })
  const filename = `Corretaje_${sanitizar(nombre)}_${tsNow(today)}.docx`
  return { buffer, filename }
}
