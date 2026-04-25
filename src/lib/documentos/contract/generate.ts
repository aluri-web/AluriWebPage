import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { ChecklistPayload } from '../types'
import { enriquecerDatos, EnrichedData } from './enrich'
import { buildContext } from './context'
import { limpiarFirmasVaciasV4 } from './cleanSignatures'
import { colombiaDateParts } from '../utils/formatting'
import { insertarPageBreaksAntesDe } from './pageBreaks'
import { aplicarPiePaginaDinamico } from './updateFooter'

const MARCADORES_PAGE_BREAK = [
  'CARTA DE INSTRUCCIONES ABIERTA DEL PAGARÉ',
  'Anexo No. 2',
  'Anexo No. 3',
]

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src/lib/documentos/templates/Contrato_TPL_DOCXTPL_v6.docx'
)

export interface GenerarContratoResult {
  buffer: Buffer
  filename: string
  enriched: EnrichedData
}

function sanitizarNombreArchivo(nombre: string): string {
  const upper = (nombre || 'SIN_NOMBRE').toUpperCase().replace(/\s+/g, '_')
  return upper.replace(/[^A-Z0-9_\-]/g, '').slice(0, 30) || 'SIN_NOMBRE'
}

function tsNow(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const c = colombiaDateParts(date)
  return (
    `${c.year}${pad(c.month)}${pad(c.day)}` +
    `_${pad(c.hour)}${pad(c.minute)}${pad(c.second)}`
  )
}

export function generarContrato(form: ChecklistPayload, today: Date = new Date()): GenerarContratoResult {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error('Template del contrato no encontrado')
  }

  const enriched = enriquecerDatos(form, today)
  const context = buildContext(enriched)

  const templateBuffer = fs.readFileSync(TEMPLATE_PATH)
  const zip = new PizZip(templateBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
    // docxtpl (Python) trims whitespace inside {{ var }}; docxtemplater does not by default.
    // La plantilla v4 usa "{{ var }}" (con espacios), asi que recortamos en el parser.
    parser: (tag: string) => ({
      get: (scope: Record<string, unknown>) => scope[tag.trim()],
    }),
  })

  doc.render(context)

  const rawBuffer: Buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  const cleanedBuffer = limpiarFirmasVaciasV4(rawBuffer)
  // Secciones que siempre deben iniciar en pagina nueva (carta de
  // instrucciones + anexos 2 y 3).
  const withBreaks = insertarPageBreaksAntesDe(cleanedBuffer, MARCADORES_PAGE_BREAK)
  // Pie de pagina "Pagina X de Y" con campos dinamicos (el template v5
  // tenia NUMPAGES hardcoded a "19"; aqui lo reemplazamos por un field
  // que Word recalcula al abrir el documento).
  const withFooter = aplicarPiePaginaDinamico(withBreaks)

  const primerDeudor = enriched.deudores[0]
  const nombreArchivo = `Contrato_${sanitizarNombreArchivo(primerDeudor?.nombre_completo || '')}_${tsNow(today)}.docx`

  return {
    buffer: withFooter,
    filename: nombreArchivo,
    enriched,
  }
}
