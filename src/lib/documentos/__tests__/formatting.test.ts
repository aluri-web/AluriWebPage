import {
  numeroATexto,
  montoATextoLegal,
  montoATextoLegalMin,
  formatoPesos,
  formatoPesosSinSigno,
  limpiarMonto,
  fechaATextoLegal,
  plazoATexto,
} from '../utils/formatting'

type Case<I, O> = { input: I; expected: O }

let failed = 0
let passed = 0

function check<I>(label: string, actual: string | number, expected: string | number, input?: I) {
  if (actual === expected) {
    passed++
  } else {
    failed++
    console.error(`  FAIL  ${label}`)
    if (input !== undefined) console.error(`    input:    ${JSON.stringify(input)}`)
    console.error(`    expected: ${JSON.stringify(expected)}`)
    console.error(`    actual:   ${JSON.stringify(actual)}`)
  }
}

console.log('numeroATexto')
const numeroCases: Case<number, string>[] = [
  { input: 8, expected: 'ocho' },
  { input: 16, expected: 'dieciséis' },
  { input: 19, expected: 'diecinueve' },
  { input: 21, expected: 'veintiuno' },
  { input: 26, expected: 'veintiséis' },
  { input: 60, expected: 'sesenta' },
  { input: 100, expected: 'cien' },
  { input: 1000, expected: 'mil' },
  { input: 2026, expected: 'dos mil veintiséis' },
  { input: 1620000, expected: 'un millón seiscientos veinte mil' },
  { input: 90000000, expected: 'noventa millones' },
  { input: 180000000, expected: 'ciento ochenta millones' },
]
for (const { input, expected } of numeroCases) {
  check(`numeroATexto(${input})`, numeroATexto(input), expected, input)
}

console.log('montoATextoLegal')
check(
  'montoATextoLegal(90_000_000)',
  montoATextoLegal(90_000_000),
  'NOVENTA MILLONES DE PESOS MONEDA CORRIENTE (COP$90.000.000)'
)
check(
  'montoATextoLegal(180_000_000)',
  montoATextoLegal(180_000_000),
  'CIENTO OCHENTA MILLONES DE PESOS MONEDA CORRIENTE (COP$180.000.000)'
)

console.log('montoATextoLegalMin')
check(
  'montoATextoLegalMin(1_620_000)',
  montoATextoLegalMin(1_620_000),
  'Un millón seiscientos veinte mil pesos moneda corriente (COP$1.620.000)'
)

console.log('formatoPesos / formatoPesosSinSigno')
check('formatoPesos(90_000_000)', formatoPesos(90_000_000), '$90.000.000')
check('formatoPesos(1_620_000)', formatoPesos(1_620_000), '$1.620.000')
check('formatoPesosSinSigno(90_000_000)', formatoPesosSinSigno(90_000_000), '90.000.000')

console.log('limpiarMonto')
const limpiarCases: Case<string, number>[] = [
  { input: '180.000.000', expected: 180_000_000 },
  { input: '$180.000.000', expected: 180_000_000 },
  { input: '180,000,000', expected: 180_000_000 },
  { input: '180000000', expected: 180_000_000 },
  { input: ' $ 1.620.000 ', expected: 1_620_000 },
  { input: '', expected: 0 },
  { input: 'abc', expected: 0 },
]
for (const { input, expected } of limpiarCases) {
  check(`limpiarMonto(${JSON.stringify(input)})`, limpiarMonto(input), expected, input)
}

console.log('fechaATextoLegal')
check(
  'fechaATextoLegal(2026-04-08)',
  fechaATextoLegal(new Date(2026, 3, 8)),
  'Ocho (8) de abril de dos mil veintiséis (2026)'
)
check(
  'fechaATextoLegal(2026-04-16)',
  fechaATextoLegal(new Date(2026, 3, 16)),
  'Dieciséis (16) de abril de dos mil veintiséis (2026)'
)
check(
  'fechaATextoLegal(2026-02-03)',
  fechaATextoLegal(new Date(2026, 1, 3)),
  'Tres (3) de febrero de dos mil veintiséis (2026)'
)

console.log('plazoATexto')
check('plazoATexto(60)', plazoATexto(60), 'Sesenta (60) meses')
check('plazoATexto(120)', plazoATexto(120), 'Ciento veinte (120) meses')
check('plazoATexto(24)', plazoATexto(24), 'Veinticuatro (24) meses')

console.log()
console.log(`passed: ${passed}  failed: ${failed}`)
if (failed > 0) process.exit(1)
