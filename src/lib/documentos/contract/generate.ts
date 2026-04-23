import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { ChecklistPayload } from '../types'
import { enriquecerDatos, EnrichedData } from './enrich'
import { buildContext } from './context'
import { limpiarFirmasVaciasV4 } from './cleanSignatures'

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'src/lib/documentos/templates/Contrato_TPL_DOCXTPL_v5.docx'
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
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
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

  const rawBuffer: Buffer = doc.getZip().generate({ type: 'nodebuffer' })
  const cleanedBuffer = limpiarFirmasVaciasV4(rawBuffer)

  const primerDeudor = enriched.deudores[0]
  const nombreArchivo = `Contrato_${sanitizarNombreArchivo(primerDeudor?.nombre_completo || '')}_${tsNow(today)}.docx`

  return {
    buffer: cleanedBuffer,
    filename: nombreArchivo,
    enriched,
  }
}
