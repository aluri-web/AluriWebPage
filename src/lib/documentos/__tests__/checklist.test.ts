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
  expect('deudores.length (1 deudor + 1 CODEUDOR -> 2 deudores)', parsed.deudores.length, 2)
  expect('deudor[0].nombre', parsed.deudores[0].nombre, 'Isabella Martinez Victoria')
  expect('deudor[0].cc', parsed.deudores[0].cc, '1.005.870.855')
  expect('deudor[0].cc_expedicion', parsed.deudores[0].cc_expedicion, 'Cali')
  expect('deudor[0].direccion', parsed.deudores[0].direccion, 'Cra 85d calle 48 56 Apto 824')
  expect('deudor[0].email', parsed.deudores[0].email, 'Globaltradeisa@gmal.com')
  expect('deudor[0].telefono', parsed.deudores[0].telefono, '3004884654')
  expect('deudor[0].estado_civil', parsed.deudores[0].estado_civil, 'Soltera')
  expect('deudor[0].participacion_monto', parsed.deudores[0].participacion_monto, '45.000.000')

  // Antes codeudor, ahora deudor 2
  expect('deudor[1].nombre', parsed.deudores[1].nombre, 'Ivan Eduardo Martinez Cortes')
  expect('deudor[1].cc', parsed.deudores[1].cc, '16.788.706')
  expect('deudor[1].cc_expedicion', parsed.deudores[1].cc_expedicion, 'Cali')
  expect('codeudores.length (parser no genera codeudores)', parsed.codeudores.length, 0)

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

  // ── Integration: New_Check_List_Martinez_Plantilla.docx (formato v5 real) ──
  console.log('parseChecklistText vs New_Check_List_Martinez_Plantilla.docx')
  const docxNuevoPath = path.resolve(
    'C:/Users/pacec/GoogleAntigravity/agentecontratosandres/Agente_Contratos/Documentacion/New_Check_List_Martinez_Plantilla.docx'
  )
  const rNuevo = await mammoth.extractRawText({ path: docxNuevoPath })
  const pNuevo = parseChecklistText(rNuevo.value)

  expect('nuevo tipo_contrato', pNuevo.tipo_contrato, 'Hipoteca')

  // Deudor 1
  expect('nuevo deudor[0] nombre', pNuevo.deudores[0].nombre, 'Isabella Martínez Victoria')
  expect('nuevo deudor tipo_documento', pNuevo.deudores[0].tipo_documento, 'C.C.')
  expect('nuevo deudor cc', pNuevo.deudores[0].cc, '1234567890')
  expect('nuevo deudor cc_expedicion', pNuevo.deudores[0].cc_expedicion, 'Cali')
  expect('nuevo deudor email', pNuevo.deudores[0].email, 'Globaltradeisa@gmal.com')
  expect('nuevo deudor participacion', pNuevo.deudores[0].participacion_monto, '45.000.000')

  // "CODEUDOR 1" del checklist se mapea a deudor[1]; codeudores queda vacio.
  expect('nuevo deudores total (1 DEUDOR + 1 CODEUDOR relleno)', pNuevo.deudores.length, 2)
  expect('nuevo deudor[1] nombre', pNuevo.deudores[1].nombre, 'Iván Eduardo Martínez Cortes')
  expect('nuevo deudor[1] Extranjeria -> C.E.', pNuevo.deudores[1].tipo_documento, 'C.E.')
  expect('nuevo deudor[1] cc', pNuevo.deudores[1].cc, '16.788.706')
  expect('nuevo deudor[1] cc_expedicion', pNuevo.deudores[1].cc_expedicion, 'Cali')
  expect('nuevo codeudores.length (parser no genera codeudores)', pNuevo.codeudores.length, 0)

  // Acreedor 1: "Tipo de documento:" vacío debe defaultearse a C.C.
  // (bug antes capturaba la linea siguiente "Numero Documento: ...")
  expect('nuevo acreedores.length (1 lleno, 3 vacios descartados)', pNuevo.acreedores.length, 1)
  expect('nuevo acreedor nombre', pNuevo.acreedores[0].nombre, 'Luis Miguel Olarte Morales')
  expect('nuevo acreedor tipo_documento vacio -> C.C.', pNuevo.acreedores[0].tipo_documento, 'C.C.')
  expect('nuevo acreedor cc', pNuevo.acreedores[0].cc, '79.791.521')
  expect('nuevo acreedor cc_expedicion', pNuevo.acreedores[0].cc_expedicion, 'Bogotá')

  // Inmueble con ciudades (formato nuevo)
  expect('nuevo inmueble matricula', pNuevo.inmueble.matricula_inmobiliaria, '370-813723')
  expect('nuevo inmueble ciudad', pNuevo.inmueble.ciudad, 'Bogotá')
  expect('nuevo inmueble ciudad_oficina_registro', pNuevo.inmueble.ciudad_oficina_registro, 'Bogotá')
  expect('nuevo inmueble chip', pNuevo.inmueble.chip, 'N/a')

  // Prestamo
  expect('nuevo prestamo monto', pNuevo.prestamo.monto, '45.000.000')
  expect('nuevo prestamo plazo', pNuevo.prestamo.plazo_meses, '60')
  expect('nuevo prestamo tasa', pNuevo.prestamo.tasa_mensual, '1.94%')
  expect('nuevo prestamo cuota', pNuevo.prestamo.cuota_mensual, '873.000')
  expect('nuevo prestamo forma_pago', pNuevo.prestamo.forma_pago, 'Solo intereses')
  expect('nuevo prestamo comision', pNuevo.prestamo.comision_aluri, '2.250.000')

  // ── Integration: formato nuevo (Tipo de documento / Numero Documento / Ciudades) ──
  console.log('parseChecklistText formato v5 (sintetico)')
  const nuevo = [
    'TIPO DE CONTRATO: Compraventa con Pacto de Retroventa',
    '',
    'DEUDOR:',
    'Nombre: Juan Perez Gomez',
    'Tipo de documento: C.E.',
    'Numero Documento: 12345678',
    'Direccion de notificacion Deudor: Cra 1 # 2-3',
    'Correo electronico Deudor: jp@test.co',
    'Telefono Deudor: 3001234567',
    'Estado civil Deudor: Soltero',
    'Participacion $: $100.000.000',
    'Participacion %: 100%',
    '',
    'CODEUDOR 1:',
    'Nombre: Maria Rodriguez',
    'Tipo de documento: PPT',
    'Numero Documento: 99887766',
    'Direccion de notificacion Deudor: Cll 4 # 5-6',
    'Correo electronico Deudor: mr@test.co',
    'Telefono Deudor: 3109876543',
    'Estado civil Deudor: Casada',
    '',
    'Acreedor 1:',
    'Nombre: Acme Inversiones SAS',
    'Tipo de documento: NIT',
    'Numero Documento: 900123456',
    'Direccion notificacion: Cra 7 # 8-9',
    'Correo: acme@test.co',
    'Telefono: 6012223344',
    'Estado civil: N/A',
    'Participacion $: $100.000.000',
    'Participacion %: 100%',
    '',
    'Inmueble:',
    'Numero de matricula inmobiliaria: 001-12345',
    'Cedula catastral: CAT123',
    'CHIP: CHIP123',
    'Direccion del Inmueble: Cra 50 # 60-70',
    'Ciudad del Inmueble: Medellin',
    'Ciudad Oficina de Registro: Medellin Centro',
    'Descripcion del Inmueble: Apartamento 301',
    'Linderos: Por el norte con apartamento 302',
    '',
    'Condiciones del prestamo:',
    'Monto del prestamo: $100.000.000',
    'Plazo (meses): 60',
    'Tasa (mes anticipado): 1.80%',
    'Valor de la cuota mensual: $2.000.000',
    'Forma de pago: Solo intereses',
    'Comision Aluri: $5.000.000',
  ].join('\n')
  const parsedNuevo = parseChecklistText(nuevo)

  expect('v5 tipo_contrato', parsedNuevo.tipo_contrato, 'Compraventa con Pacto de Retroventa')
  // DEUDOR + CODEUDOR -> ambos deudores
  expect('v5 deudores.length (DEUDOR + CODEUDOR -> 2)', parsedNuevo.deudores.length, 2)
  expect('v5 deudor[0] tipo_documento', parsedNuevo.deudores[0].tipo_documento, 'C.E.')
  expect('v5 deudor[0] cc', parsedNuevo.deudores[0].cc, '12345678')
  expect('v5 deudor[0] cc_expedicion vacio', parsedNuevo.deudores[0].cc_expedicion, '')
  expect('v5 deudor[1] tipo_documento (antes codeudor)', parsedNuevo.deudores[1].tipo_documento, 'PPT')
  expect('v5 deudor[1] cc', parsedNuevo.deudores[1].cc, '99887766')
  expect('v5 codeudores.length parser = 0', parsedNuevo.codeudores.length, 0)
  expect('v5 acreedor tipo_documento', parsedNuevo.acreedores[0].tipo_documento, 'NIT')
  expect('v5 acreedor cc', parsedNuevo.acreedores[0].cc, '900123456')
  expect('v5 ciudad inmueble', parsedNuevo.inmueble.ciudad, 'Medellin')
  expect('v5 ciudad oficina registro', parsedNuevo.inmueble.ciudad_oficina_registro, 'Medellin Centro')

  console.log()
  console.log(`passed: ${passed}  failed: ${failed}`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error('Runner error:', e)
  process.exit(1)
})
