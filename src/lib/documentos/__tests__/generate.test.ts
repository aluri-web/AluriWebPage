import fs from 'fs'
import * as mammoth from 'mammoth'
import path from 'path'
import { parseChecklistText } from '../parser/checklist'
import { generarContrato } from '../contract/generate'
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

  // UTC mediodia garantiza que sigue siendo 21 abril en cualquier timezone razonable
  const fechaFija = new Date(Date.UTC(2026, 3, 21, 12))
  const { buffer, filename, enriched } = generarContrato(payload, fechaFija)

  const outDir = path.join(require('os').tmpdir(), 'aluri-contratos-test')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, filename)
  fs.writeFileSync(outPath, buffer)

  const rendered = await mammoth.extractRawText({ path: outPath })
  const text = rendered.value

  const checks: { label: string; present: boolean }[] = [
    { label: 'nombre deudor', present: text.includes('ISABELLA MARTINEZ VICTORIA') },
    { label: 'cc deudor', present: text.includes('1.005.870.855') },
    { label: 'nombre acreedor', present: text.includes('LUIS MIGUEL OLARTE MORALES') },
    { label: 'monto letras', present: text.includes('CUARENTA Y CINCO MILLONES') },
    { label: 'monto numeros', present: text.includes('45.000.000') },
    { label: 'plazo', present: text.includes('Sesenta') && text.includes('60') },
    { label: 'tasa', present: text.includes('1.94%') },
    { label: 'fecha firma', present: text.includes('Veintiuno (21) de abril de dos mil veintiséis (2026)') },
    { label: 'sin placeholder', present: !/\{\{|\}\}/.test(text) },
    { label: 'buffer no vacio', present: buffer.length > 10_000 },
    { label: 'enriched montos', present: enriched.prestamo.monto_total === 45_000_000 },
  ]

  let passed = 0
  let failed = 0
  for (const c of checks) {
    if (c.present) {
      passed++
    } else {
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
