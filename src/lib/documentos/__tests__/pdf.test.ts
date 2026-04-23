import fs from 'fs'
import os from 'os'
import path from 'path'
import * as mammoth from 'mammoth'
import { parseChecklistText } from '../parser/checklist'
import { generateFormPdf, pdfFilename } from '../pdf/generateFormPdf'
import { ChecklistPayload } from '../types'

async function main() {
  const docxPath = path.resolve(
    'C:/Users/pacec/GoogleAntigravity/agentecontratosandres/Agente_Contratos/Documentacion/Check_List_Martinez.docx'
  )
  const { value: texto } = await mammoth.extractRawText({ path: docxPath })
  const parsed = parseChecklistText(texto)

  const payload: ChecklistPayload = {
    tipo_contrato: parsed.tipo_contrato,
    deudores: parsed.deudores,
    codeudores: parsed.codeudores,
    acreedores: parsed.acreedores,
    inmueble: parsed.inmueble,
    prestamo: parsed.prestamo,
    fecha_creacion: new Date().toISOString(),
  }

  // 17:00 UTC = 12:00 Colombia, 21 abril en ambos
  const fecha = new Date(Date.UTC(2026, 3, 21, 17, 0, 0))
  const buffer = generateFormPdf(payload)
  const filename = pdfFilename(payload, fecha)

  const outDir = path.join(os.tmpdir(), 'aluri-contratos-test')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, filename)
  fs.writeFileSync(outPath, buffer)

  const checks: { label: string; ok: boolean }[] = [
    { label: 'filename esperado', ok: /^Formulario_ISABELLA_MARTINEZ_VICTORIA_20260421_120000\.pdf$/.test(filename) },
    { label: 'PDF header', ok: buffer.slice(0, 4).toString() === '%PDF' },
    { label: 'buffer > 2 KB', ok: buffer.length > 2_000 },
    { label: 'buffer < 500 KB (sin bloat)', ok: buffer.length < 500_000 },
  ]

  let passed = 0
  let failed = 0
  for (const c of checks) {
    if (c.ok) passed++
    else {
      failed++
      console.error(`  FAIL  ${c.label}`)
    }
  }

  console.log(`Archivo generado: ${outPath}`)
  console.log(`Tamaño: ${buffer.length} bytes`)
  console.log(`passed: ${passed}  failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
