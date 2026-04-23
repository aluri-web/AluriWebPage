import * as mammoth from 'mammoth'
import * as path from 'path'
import { parseChecklistText, __testing__ } from '../parser/checklist'

let passed = 0
let failed = 0

function expect<T>(label: string, actual: T, expected: T) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++
  } else {
    failed++
    console.error(`  FAIL  ${label}`)
    console.error(`    expected: ${JSON.stringify(expected)}`)
    console.error(`    actual:   ${JSON.stringify(actual)}`)
  }
}

async function run() {
  // ── Unit: interpretarMonto / formatearMontoDisplay ──
  console.log('interpretarMonto / formatearMontoDisplay')
  expect('interpretarMonto("180.000.000")', __testing__.interpretarMonto('180.000.000'), 180_000_000)
  expect('interpretarMonto("180000000")', __testing__.interpretarMonto('180000000'), 180_000_000)
  expect('interpretarMonto("$90.000.000")', __testing__.interpretarMonto('$90.000.000'), 90_000_000)
  expect('interpretarMonto("93 MILLONES")', __testing__.interpretarMonto('93 MILLONES'), 93_000_000)
  expect('interpretarMonto("1.5 MILLONES")', __testing__.interpretarMonto('1.5 MILLONES'), 1_500_000)
  expect('interpretarMonto("500 MIL")', __testing__.interpretarMonto('500 MIL'), 500_000)
  expect('formatearMontoDisplay("45000000")', __testing__.formatearMontoDisplay('45000000'), '45.000.000')
  expect('formatearMontoDisplay("")', __testing__.formatearMontoDisplay(''), '')

  // ── Unit: separarCcYExpedicion ──
  console.log('separarCcYExpedicion')
  expect(
    'separarCcYExpedicion("52.202.940 de Bogota")',
    __testing__.separarCcYExpedicion('52.202.940 de Bogota'),
    { cc: '52.202.940', exp: 'Bogota' }
  )
  expect(
    'separarCcYExpedicion("C.C. No. 1.026.550.415 Bogota D.C.")',
    __testing__.separarCcYExpedicion('C.C. No. 1.026.550.415 Bogota D.C.'),
    { cc: '1.026.550.415', exp: 'Bogota D.C.' }
  )
  expect(
    'separarCcYExpedicion("16.788.706 de Cali")',
    __testing__.separarCcYExpedicion('16.788.706 de Cali'),
    { cc: '16.788.706', exp: 'Cali' }
  )
  expect(
    'separarCcYExpedicion("")',
    __testing__.separarCcYExpedicion(''),
    { cc: '', exp: '' }
  )

  // ── Integration: parse Check_List_Martinez.docx ──
  console.log('parseChecklistText vs Check_List_Martinez.docx')
  const docxPath = path.resolve(
    'C:/Users/pacec/GoogleAntigravity/agentecontratosandres/Agente_Contratos/Documentacion/Check_List_Martinez.docx'
  )
  const result = await mammoth.extractRawText({ path: docxPath })
  const parsed = parseChecklistText(result.value)

  expect('tipo_contrato', parsed.tipo_contrato, 'Hipoteca')
  expect('deudores.length', parsed.deudores.length, 1)
  expect('deudor[0].nombre', parsed.deudores[0].nombre, 'Isabella Martinez Victoria')
  expect('deudor[0].cc', parsed.deudores[0].cc, '1.005.870.855')
  expect('deudor[0].cc_expedicion', parsed.deudores[0].cc_expedicion, 'Cali')
  expect('deudor[0].direccion', parsed.deudores[0].direccion, 'Cra 85d calle 48 56 Apto 824')
  expect('deudor[0].email', parsed.deudores[0].email, 'Globaltradeisa@gmal.com')
  expect('deudor[0].telefono', parsed.deudores[0].telefono, '3004884654')
  expect('deudor[0].estado_civil', parsed.deudores[0].estado_civil, 'Soltera')
  expect('deudor[0].participacion_monto', parsed.deudores[0].participacion_monto, '45.000.000')

  expect('codeudores.length', parsed.codeudores.length, 1)
  expect('codeudor[0].nombre', parsed.codeudores[0].nombre, 'Ivan Eduardo Martinez Cortes')
  expect('codeudor[0].cc', parsed.codeudores[0].cc, '16.788.706')
  expect('codeudor[0].cc_expedicion', parsed.codeudores[0].cc_expedicion, 'Cali')

  expect('acreedores.length', parsed.acreedores.length, 1)
  expect('acreedor[0].nombre', parsed.acreedores[0].nombre, 'Luis Miguel Olarte Morales')
  expect('acreedor[0].cc', parsed.acreedores[0].cc, '79.791.521')
  expect('acreedor[0].cc_expedicion', parsed.acreedores[0].cc_expedicion, 'Bogotá')
  expect('acreedor[0].participacion_monto', parsed.acreedores[0].participacion_monto, '45.000.000')

  expect('inmueble.matricula_inmobiliaria', parsed.inmueble.matricula_inmobiliaria, '370-813723')
  expect('inmueble.cedula_catastral', parsed.inmueble.cedula_catastral, 'K006005470000 E ID PREDIO 0000843135 APARTAMENTO 0824')
  expect('inmueble.chip', parsed.inmueble.chip, 'N/a')

  expect('prestamo.monto', parsed.prestamo.monto, '45.000.000')
  expect('prestamo.plazo_meses', parsed.prestamo.plazo_meses, '60')
  expect('prestamo.tasa_mensual', parsed.prestamo.tasa_mensual, '1.94%')
  expect('prestamo.cuota_mensual', parsed.prestamo.cuota_mensual, '873.000')
  expect('prestamo.forma_pago', parsed.prestamo.forma_pago, 'Solo intereses')
  expect('prestamo.comision_aluri', parsed.prestamo.comision_aluri, '2.250.000')

  console.log()
  console.log(`passed: ${passed}  failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error('Runner error:', e)
  process.exit(1)
})
